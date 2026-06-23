import { removeMemberRole, sendDM } from './discord-v2'

// The trainee role granted on staff-application acceptance.
export const TRAINEE_ROLE_ID = '1372476380096237609'

// Trainees have this many days to finish the quiz + ridealong modules.
export const TRAINEE_DEADLINE_DAYS = 7

// A trainee who fails the quiz this many times loses their role.
export const MAX_QUIZ_FAILS = 2

const COLLECTION = 'trainee_tracking'

export function traineeTrackingCollection(db) {
  return db.collection(COLLECTION)
}

/**
 * Record (or reset) a trainee's 7-day completion window.
 * Called when the trainee role is granted.
 */
export async function startTraineeTracking(db, userId, username) {
  const now = new Date()
  const deadline = new Date(now.getTime() + TRAINEE_DEADLINE_DAYS * 24 * 60 * 60 * 1000)

  await traineeTrackingCollection(db).updateOne(
    { userId },
    {
      $set: {
        userId,
        username: username || null,
        startedAt: now.toISOString(),
        deadline: deadline.toISOString(),
        status: 'active',
        removedAt: null,
        removeReason: null,
      },
    },
    { upsert: true }
  )
}

/**
 * Mark a trainee as having completed the modules so the expiry cron
 * and fail-cap logic leave them alone.
 */
export async function markTraineeCompleted(db, userId) {
  await traineeTrackingCollection(db).updateOne(
    { userId },
    { $set: { status: 'completed', completedAt: new Date().toISOString() } }
  )
}

/**
 * Find every active trainee whose 7-day window has elapsed and remove their
 * trainee role. Shared by the in-process scheduler and the manual cron route.
 */
export async function processExpiredTrainees(db) {
  const now = new Date().toISOString()
  const expired = await traineeTrackingCollection(db)
    .find({ status: 'active', deadline: { $lte: now } })
    .toArray()

  const results = []
  for (const trainee of expired) {
    try {
      const removed = await removeTraineeRole(db, trainee.userId, { reason: 'expired', dm: false })
      results.push({ userId: trainee.userId, removed })
    } catch (err) {
      console.error('[Trainee Expiry] Failed to process', trainee.userId, err.message)
      results.push({ userId: trainee.userId, removed: false, error: err.message })
    }
  }

  return results
}

const FAILED_TWICE_MESSAGE =
  'You have now shown sufficient dedication to reading our handbook, you must reapply'

/**
 * Remove the trainee role from a user and record why. Optionally DM them.
 * Returns true if the role removal succeeded.
 */
export async function removeTraineeRole(db, userId, { reason, dm }) {
  const guildId = process.env.ALLOWED_GUILD_ID
  const removed = await removeMemberRole(guildId, userId, TRAINEE_ROLE_ID)

  await traineeTrackingCollection(db).updateOne(
    { userId },
    {
      $set: {
        status: reason === 'expired' ? 'expired' : 'failed',
        removedAt: new Date().toISOString(),
        removeReason: reason,
      },
    },
    { upsert: true }
  )

  if (dm) {
    try {
      await sendDM(userId, {
        components: [
          {
            type: 17,
            accent_color: 0xef4444,
            components: [{ type: 10, content: FAILED_TWICE_MESSAGE }],
          },
        ],
      })
    } catch (err) {
      console.error('[Trainee Tracking] Failed to DM user', userId, err.message)
    }
  }

  return removed
}
