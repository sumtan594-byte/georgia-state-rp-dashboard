import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth-options'
import clientPromise from '../../../../lib/mongodb'
import { rateLimit } from '../../../../lib/rate-limiter'
import { RIDEALONG_CONFIG, RIDEALONG_ROLES, RIDEALONG_NICKNAME_PREFIX } from '../../../../lib/ridealong-config'
import { getGuildMember, addMemberRole, removeMemberRole, modifyGuildMember } from '../../../../lib/discord-v2'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const rl = rateLimit(req, res, 'submit')
  if (rl.limited) {
    return res.status(429).json({ error: 'Rate limited', retryAfter: rl.retryAfter })
  }

  const DISCORD_GUILD_ID = process.env.ALLOWED_GUILD_ID
  const WEBHOOK_URL = process.env.TRAINING_WEBHOOK_URL

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const { username, globalName, avatar, score, total, pct, pass, results, timestamp } = body
  const userId = session.user.id

  if (score === undefined) return res.status(400).json({ error: 'Missing fields' })

  let db
  try {
    const client = await clientPromise
    db = client.db()
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message)
    return res.status(500).json({ error: 'Database connection failed' })
  }

  const attemptsCollection = db.collection('ridealong_attempts')

  const existingData = await attemptsCollection.findOne({ userId })

  if (existingData && existingData.hasPassed) {
    return res.status(400).json({ error: 'Already passed' })
  }

  if (existingData && !pass) {
    const cooldown = existingData.cooldownUntil ? new Date(existingData.cooldownUntil) : null
    const now = new Date()
    if (cooldown && cooldown > now) {
      return res.status(429).json({
        error: 'Cooldown active',
        cooldownUntil: existingData.cooldownUntil,
      })
    }
  }

  const newAttempt = {
    attemptId: `${userId}_${Date.now()}`,
    userId,
    username: username || session.user.name,
    globalName,
    avatar,
    score, total, pct, pass,
    timestamp: timestamp || new Date().toISOString(),
    scenarios: results || [],
  }

  let cooldownUntil = null
  let hasPassed = false
  let hasPassedAt = null
  let discordRolesApplied = false

  if (!pass) {
    const cooldownMs = RIDEALONG_CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000
    cooldownUntil = new Date(Date.now() + cooldownMs).toISOString()
  } else {
    hasPassed = true
    hasPassedAt = timestamp || new Date().toISOString()
  }

  const updateDoc = {
    $push: { attempts: newAttempt },
  }

  if (pass) {
    updateDoc.$set = { hasPassed, hasPassedAt, cooldownUntil: null, discordRolesApplied: false }
  } else {
    updateDoc.$set = { cooldownUntil }
    updateDoc.$setOnInsert = { hasPassed: false, hasPassedAt: null, discordRolesApplied: false }
  }

  await attemptsCollection.updateOne(
    { userId },
    updateDoc,
    { upsert: true }
  )

  if (pass) {
    let currentNick = 'User'
    try {
      if (DISCORD_GUILD_ID) {
        for (const roleId of RIDEALONG_ROLES) {
          await addMemberRole(DISCORD_GUILD_ID, userId, roleId)
        }

        const member = await getGuildMember(DISCORD_GUILD_ID, userId)
        currentNick = member?.nick || member?.user?.global_name || member?.user?.username || 'User'

        await modifyGuildMember(DISCORD_GUILD_ID, userId, {
          nick: `${RIDEALONG_NICKNAME_PREFIX}${currentNick}`,
        })

        await removeMemberRole(DISCORD_GUILD_ID, userId, "1372476380096237609")

        discordRolesApplied = true

        await attemptsCollection.updateOne(
          { userId },
          { $set: { discordRolesApplied: true } }
        )
      } else {
        console.warn('[Ridealong] No ALLOWED_GUILD_ID configured — skipping Discord role/nickname update')
      }
    } catch (err) {
      console.error('[Ridealong] Discord API error:', err.message)
    }

    try {
      if (WEBHOOK_URL) {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: 'Ridealong Simulation Passed',
              color: 0x22c55e,
              fields: [
                { name: 'User', value: `<@${userId}> (\`${username || session.user.name}\`)`, inline: true },
                { name: 'Score', value: `${score} / ${total} (${pct}%)`, inline: true },
                { name: 'Roles Updated', value: discordRolesApplied ? 'Yes ✅' : 'No ❌', inline: true },
                { name: 'Nickname Set', value: discordRolesApplied ? `JM | ${currentNick}` : 'No', inline: true },
              ],
              timestamp: new Date().toISOString(),
              footer: { text: 'GSRP Ridealong Simulation' },
            }],
          }),
        })
      }
    } catch (err) {
      console.error('[Ridealong] Webhook error:', err.message)
    }
  }

  res.status(200).json({
    ok: true,
    pass,
    cooldownUntil: pass ? null : cooldownUntil,
    discordRolesApplied,
  })
}
