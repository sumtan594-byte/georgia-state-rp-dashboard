import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth-options'
import clientPromise from '../../../../lib/mongodb'
import { rateLimit } from '../../../../lib/rate-limiter'
import { RIDEALONG_NICKNAME_PREFIX, RIDEALONG_ROLES } from '../../../../lib/ridealong-config'
import { addMemberRole, getGuildMember, modifyGuildMember, removeMemberRole } from '../../../../lib/discord-v2'

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
    for (const roleId of RIDEALONG_ROLES) {
      const added = await addMemberRole(guildId, userId, roleId)
      if (!added) throw new Error(`Failed to add role ${roleId}`)
    }

    const member = await getGuildMember(guildId, userId)
    if (!member) throw new Error('Failed to fetch updated guild member')

    currentNick = member?.nick || member?.user?.global_name || member?.user?.username || currentNick

    const modifiedMember = await modifyGuildMember(guildId, userId, {
      nick: `${RIDEALONG_NICKNAME_PREFIX}${currentNick}`,
    })
    if (!modifiedMember) throw new Error('Failed to update nickname')

    const removedTraineeRole = await removeMemberRole(guildId, userId, TRAINEE_ROLE_ID)
    if (!removedTraineeRole) throw new Error('Failed to remove trainee role')

    await attemptsCollection.updateOne(
      { userId },
      {
        $set: {
          discordRolesApplied: true,
          discordRolesAppliedAt: new Date().toISOString(),
        },
      }
    )
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
