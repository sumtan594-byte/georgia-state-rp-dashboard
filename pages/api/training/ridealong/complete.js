import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth-options'
import clientPromise from '../../../../lib/mongodb'
import { rateLimit } from '../../../../lib/rate-limiter'
import { RIDEALONG_NICKNAME_PREFIX, RIDEALONG_ROLES } from '../../../../lib/ridealong-config'
import { addMemberRole, getGuildMember, modifyGuildMember, removeMemberRole } from '../../../../lib/discord-v2'
import { markTraineeCompleted } from '../../../../lib/trainee-tracking'

const TRAINEE_ROLE_ID = '1372476380096237609'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const rl = rateLimit(req, res, 'ridealong-complete')
  if (rl.limited) {
    return res.status(429).json({ error: 'Rate limited', retryAfter: rl.retryAfter })
  }

  const guildId = process.env.ALLOWED_GUILD_ID
  if (!guildId) return res.status(500).json({ error: 'Discord guild is not configured' })

  const userId = session.user.id

  let db
  try {
    const client = await clientPromise
    db = client.db()
  } catch (err) {
    console.error('[Ridealong Complete] MongoDB connection error:', err.message)
    return res.status(500).json({ error: 'Database connection failed' })
  }

  const attemptsCollection = db.collection('ridealong_attempts')
  const existingData = await attemptsCollection.findOne({ userId })

  if (!existingData?.hasPassed) {
    return res.status(403).json({ error: 'Ridealong has not been passed' })
  }

  if (existingData.discordRolesApplied) {
    return res.status(200).json({ ok: true, discordRolesApplied: true, alreadyApplied: true })
  }

  let currentNick = session.user.name || 'Moderator'

  try {
    // 1. Apply every staff role. Re-adding a role the member already has is a
    //    no-op on Discord's side, so this is safe to retry. Attempt all of them
    //    (don't bail on the first failure) and only treat the whole step as failed
    //    if a role is still missing after the attempt — that way a transient
    //    rate-limit on one call doesn't abort the roles that did go through.
    const failedRoles = []
    for (const roleId of RIDEALONG_ROLES) {
      const added = await addMemberRole(guildId, userId, roleId)
      if (!added) failedRoles.push(roleId)
    }
    if (failedRoles.length > 0) {
      // Leave discordRolesApplied false and keep the trainee role intact so the
      // user can safely retry; the roles already granted will simply be re-applied.
      throw new Error(`Failed to add staff role(s): ${failedRoles.join(', ')}`)
    }

    // 2. Remove the trainee role now that all staff roles are confirmed in place.
    const removedTraineeRole = await removeMemberRole(guildId, userId, TRAINEE_ROLE_ID)
    if (!removedTraineeRole) throw new Error('Failed to remove trainee role')

    // 3. Persist completion BEFORE the cosmetic nickname step. The staff roles are
    //    granted and the trainee role is gone — this user is done, and the 7-day
    //    expiry cron must not strip them later even if the nickname update fails.
    await attemptsCollection.updateOne(
      { userId },
      {
        $set: {
          discordRolesApplied: true,
          discordRolesAppliedAt: new Date().toISOString(),
        },
      }
    )
    await markTraineeCompleted(db, userId)

    // 4. Best-effort nickname. A failure here is purely cosmetic and must never
    //    undo the role grant above, so we swallow it instead of returning 502.
    try {
      const member = await getGuildMember(guildId, userId)
      currentNick = member?.nick || member?.user?.global_name || member?.user?.username || currentNick
      if (member && !String(currentNick).startsWith(RIDEALONG_NICKNAME_PREFIX)) {
        await modifyGuildMember(guildId, userId, {
          nick: `${RIDEALONG_NICKNAME_PREFIX}${currentNick}`,
        })
      }
    } catch (nickErr) {
      console.warn('[Ridealong Complete] Nickname update failed (roles still applied):', nickErr.message)
    }
  } catch (err) {
    console.error('[Ridealong Complete] Discord API error:', err.message)
    return res.status(502).json({ error: 'Discord role update failed' })
  }

  return res.status(200).json({
    ok: true,
    discordRolesApplied: true,
    currentNick,
  })
}
