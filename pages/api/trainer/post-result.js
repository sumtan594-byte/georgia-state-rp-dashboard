import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth-options'
import { rateLimit } from '../../../lib/rate-limiter'
import { canAccessTrainerHandbook } from '../../../lib/auth'
import { sendComponentsV2, sendDM } from '../../../lib/discord-v2'

const PASS_GREEN = 0x10b981
const FAIL_RED = 0xef4444

// Training results channel. Overridable via env, defaults to #training-results.
const DEFAULT_RESULTS_CHANNEL_ID = '1391402587806498906'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  if (!canAccessTrainerHandbook(session)) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  const rl = rateLimit(req, res, 'trainer-post-result')
  if (rl.limited) {
    return res.status(429).json({ error: 'Rate limited', retryAfter: rl.retryAfter })
  }

  const {
    traineeDiscordId,
    traineeRoblox,
    score,
    total,
    passed,
    notes,
  } = req.body || {}

  // Validate at the boundary.
  if (!/^\d{17,20}$/.test(String(traineeDiscordId || ''))) {
    return res.status(400).json({ error: 'A valid trainee Discord member is required' })
  }
  const numScore = Number(score)
  const numTotal = Number(total)
  if (!Number.isFinite(numScore) || !Number.isFinite(numTotal) || numTotal <= 0 || numScore < 0 || numScore > numTotal) {
    return res.status(400).json({ error: 'Invalid score' })
  }

  const isPass = passed === true
  const pct = Math.round((numScore / numTotal) * 100)
  const trainerId = session.user.id
  const robloxLine = traineeRoblox ? `\n**Roblox:** \`${String(traineeRoblox).slice(0, 50)}\`` : ''
  const notesText = (notes && String(notes).trim()) ? String(notes).trim().slice(0, 1500) : 'No additional notes.'
  const accent = isPass ? PASS_GREEN : FAIL_RED
  const resultWord = isPass ? 'PASSED' : 'FAILED'

  const resultContainer = {
    type: 17,
    accent_color: accent,
    components: [
      { type: 10, content: `## Training Result — ${resultWord}` },
      { type: 14 },
      { type: 10, content: `**Trainee:** <@${traineeDiscordId}>${robloxLine}\n**Trainer:** <@${trainerId}>` },
      { type: 14 },
      { type: 10, content: `**Score:** ${numScore}/${numTotal} (${pct}%)\n**Result:** ${resultWord}` },
      { type: 14 },
      { type: 10, content: `**Notes:**\n${notesText}` },
    ],
  }

  const outcome = { dmSent: false, channelPosted: false }

  // DM the trainee their outcome.
  try {
    await sendDM(traineeDiscordId, {
      components: [{
        type: 17,
        accent_color: accent,
        components: [
          { type: 10, content: `## Your Training Result` },
          { type: 14 },
          { type: 10, content: isPass
            ? 'Congratulations — you **passed** your 1:1 training! A staff member will finalise your roles shortly.'
            : 'Unfortunately, you did **not pass** this training. Review the notes below and request another session when you are ready.' },
          { type: 14 },
          { type: 10, content: `**Score:** ${numScore}/${numTotal} (${pct}%)` },
          { type: 14 },
          { type: 10, content: `**Trainer notes:**\n${notesText}` },
        ],
      }],
    })
    outcome.dmSent = true
  } catch (err) {
    console.error('[Trainer Post Result] DM failed:', err.message)
  }

  // Optionally post to a results channel if configured.
  const resultsChannel = process.env.TRAINING_RESULTS_CHANNEL_ID || DEFAULT_RESULTS_CHANNEL_ID
  if (resultsChannel) {
    try {
      await sendComponentsV2(resultsChannel, { components: [resultContainer] })
      outcome.channelPosted = true
    } catch (err) {
      console.error('[Trainer Post Result] Channel post failed:', err.message)
    }
  }

  if (!outcome.dmSent && !outcome.channelPosted) {
    return res.status(502).json({ error: 'Could not deliver the result (DM closed and no results channel configured).' })
  }

  return res.status(200).json({ ok: true, ...outcome, pct, passed: isPass })
}
