import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth-options'
import clientPromise from '../../../../lib/mongodb'
import { rateLimit } from '../../../../lib/rate-limiter'
import { RIDEALONG_CONFIG, RIDEALONG_ROLES, RIDEALONG_NICKNAME_PREFIX } from '../../../../lib/ridealong-config'
import { getGuildMember, addMemberRole, removeMemberRole, modifyGuildMember } from '../../../../lib/discord-v2'
async function sendRidealongWebhook({ webhookUrl, userId, username, score, total, pct, pass, results, discordRolesApplied, currentNick, timestamp }) {
  const passFail = pass ? 'PASSED' : 'FAILED'
  const accentColor = pass ? 0x22c55e : 0xef4444

  // Build scenario result lines
  const scenarioLines = Array.isArray(results) && results.length > 0
    ? results.map((r, i) => {
        const label = r.scenarioTitle || r.title || `Scenario ${i + 1}`
        const outcome = r.correct ? 'Pass' : 'Fail'
        return `${i + 1}. ${label} — ${outcome}`
      }).join('\n')
    : 'No scenario data available'

  const payload = {
    embeds: [
      {
        title: `Ridealong Simulation — ${passFail}`,
        color: accentColor,
        fields: [
          {
            name: 'User',
            value: `<@${userId}> (\`${username}\`)`,
            inline: true,
          },
          {
            name: 'Score',
            value: `${score} / ${total} (${pct}%)`,
            inline: true,
          },
          {
            name: 'Result',
            value: passFail,
            inline: true,
          },
          {
            name: 'Timestamp',
            value: `<t:${Math.floor(new Date(timestamp).getTime() / 1000)}:F>`,
            inline: false,
          },
          {
            name: 'Scenario Results',
            value: scenarioLines.substring(0, 1024),
            inline: false,
          },
          ...(pass ? [{
            name: 'Discord Actions',
            value: [
              `**Roles Updated:** ${discordRolesApplied ? 'Yes' : 'No'}`,
              `**Nickname Set:** ${discordRolesApplied ? `JM | ${currentNick}` : 'No'}`,
            ].join('\n'),
            inline: false,
          }] : []),
        ],
      },
    ],
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error('[Ridealong Submit] Webhook returned', res.status, '—', errBody.substring(0, 300))
    return false
  }

  console.log('[Ridealong Submit] Webhook sent successfully — pass:', pass)
  return true
}

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

  console.log('[Ridealong Submit] Received submission — user:', userId, 'username:', username || session.user.name, 'score:', score, '/', total, 'pass:', pass)

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

  const submittedAt = timestamp || new Date().toISOString()
  const resolvedUsername = username || session.user.name

  const newAttempt = {
    attemptId: `${userId}_${Date.now()}`,
    userId,
    username: resolvedUsername,
    globalName,
    avatar,
    score,
    total,
    pct,
    pass,
    timestamp: submittedAt,
    scenarios: results || [],
  }

  let cooldownUntil = null
  let hasPassed = false
  let hasPassedAt = null
  let discordRolesApplied = false
  let currentNick = resolvedUsername

  if (!pass) {
    const cooldownMs = RIDEALONG_CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000
    cooldownUntil = new Date(Date.now() + cooldownMs).toISOString()
    console.log('[Ridealong Submit] Attempt failed — cooldown until:', cooldownUntil)
  } else {
    hasPassed = true
    hasPassedAt = submittedAt
    console.log('[Ridealong Submit] Attempt passed!')
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
    try {
      if (DISCORD_GUILD_ID) {
        for (const roleId of RIDEALONG_ROLES) {
          await addMemberRole(DISCORD_GUILD_ID, userId, roleId)
        }
        const member = await getGuildMember(DISCORD_GUILD_ID, userId)
        currentNick = member?.nick || member?.user?.global_name || member?.user?.username || resolvedUsername
        await modifyGuildMember(DISCORD_GUILD_ID, userId, {
          nick: `${RIDEALONG_NICKNAME_PREFIX}${currentNick}`,
        })
        await removeMemberRole(DISCORD_GUILD_ID, userId, '1372476380096237609')
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
  }

  // Send webhook for every attempt (pass AND fail)
  try {
    if (WEBHOOK_URL) {
      await sendRidealongWebhook({
        webhookUrl: WEBHOOK_URL,
        userId,
        username: resolvedUsername,
        score,
        total,
        pct,
        pass,
        results,
        discordRolesApplied,
        currentNick,
        timestamp: submittedAt,
      })
    } else {
      console.warn('[Ridealong Submit] No TRAINING_WEBHOOK_URL configured — skipping webhook')
    }
  } catch (err) {
    console.error('[Ridealong Submit] Webhook error:', err.message)
  }

  console.log('[Ridealong Submit] Complete — user:', userId, 'pass:', pass, 'discordRolesApplied:', discordRolesApplied)

  res.status(200).json({
    ok: true,
    pass,
    cooldownUntil: pass ? null : cooldownUntil,
    discordRolesApplied,
  })
}
