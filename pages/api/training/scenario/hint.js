import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const PUNISHMENT_GUIDELINES = {
  'RDM': { 1: 'Warning', 2: 'Kick', 3: 'Ban', explanation: 'Random Deathmatch starts with a Warning for first offense.' },
  'VDM': { 1: 'Warning', 2: 'Kick', 3: 'Ban', explanation: 'Vehicle Deathmatch starts with a Warning for first offense.' },
  'FRP': { 1: 'Warning', 2: 'Kick', 3: 'Ban', explanation: 'Fail Roleplay starts with a Warning for first offense.' },
  'NLR': { 1: 'Warning', 2: 'Kick', 3: 'Ban', explanation: 'New Life Rule starts with a Warning for first offense.' },
  'NITRP': { 1: 'Kick', 2: 'Ban', 3: '—', explanation: 'No Intent to Roleplay starts with a Kick for first offense.' },
  'LTAP': { 1: 'Ban', 2: '—', 3: '—', explanation: 'Leave To Avoid Punishment is a Ban on first offense.' },
  'TROLLING': { 1: 'Kick', 2: 'Ban', 3: '—', explanation: 'Trolling starts with a Kick for first offense.' },
  'VOL': { 1: 'Warning', 2: 'Kick', 3: 'Ban', explanation: 'Value of Life starts with a Warning for first offense.' },
};

async function callOpenRouter(systemPrompt, userMessage) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://join-gsrp.com',
      'X-Title': 'GSRP Scenario Training',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-super-120b-a12b:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 150,
      temperature: 0.7,
      reasoning: { enabled: false },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('OpenRouter returned no response text');
  }

  return text.trim();
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { scenario, chatHistory = [], hintIndex = 0 } = req.body;

  if (!scenario) {
    return res.status(400).json({ error: 'scenario required' });
  }

  const type = scenario.type;
  const guidelines = PUNISHMENT_GUIDELINES[type];

  if (!guidelines) {
    return res.status(400).json({ error: 'Unknown scenario type' });
  }

  const hasAskedForProof = chatHistory.some(h =>
    h.role === 'user' && (
      h.content.toLowerCase().includes('proof') ||
      h.content.toLowerCase().includes('clip') ||
      h.content.toLowerCase().includes('video')
    )
  );

  const hasAskedForUsername = chatHistory.some(h =>
    h.role === 'user' && (
      h.content.toLowerCase().includes('username') ||
      h.content.toLowerCase().includes('suspect')
    )
  );

  const hasTakenAction = chatHistory.some(h =>
    h.role === 'user' && (
      h.content.toLowerCase().includes('ban') ||
      h.content.toLowerCase().includes('kick') ||
      h.content.toLowerCase().includes('warn')
    ) && !h.content.toLowerCase().includes('proof')
  );

  let hintContext = '';
  if (!hasAskedForProof) {
    hintContext = 'The staff member has not yet asked for video proof. This is the most important first step.';
  } else if (!hasAskedForUsername) {
    hintContext = 'They asked for proof but have not asked for the suspect username yet.';
  } else if (!hasTakenAction) {
    hintContext = `They have proof and username. The correct first offense punishment for ${type} is ${guidelines[1]} per GSRP guidelines. ${guidelines.explanation}`;
  } else {
    hintContext = `Remember: for ${type}, the first offense punishment is ${guidelines[1]}. ${guidelines.explanation}`;
  }

  const systemPrompt = `You are a helpful training hint system for GSRP (Georgia State Roleplay) staff training. You give short hints to help new young trainees (13 to 17 years old) handle moderation situations.

Current scenario: ${scenario.label} (${type})
${hintContext}

Rules to remember:
- Always ask for video proof before doing anything
- Kill logs do NOT count as proof
- EXCEPT for LTAP where server logs are enough proof
- Punishment for first offense ${type}: ${guidelines[1]}
- Be nice and follow the chain of command
- Discord comms code is GSRP7

Give a short hint (1 to 2 sentences) that helps the trainee figure out what to do next. Do not give away the full answer. Sound like a senior staff member giving advice to a new young trainee. No big words. No em dashes. Keep it simple and direct.`;

  const userMessage = `What hint should I give the trainee right now? They are handling a ${type} report. ${hintContext} Give a specific hint that helps them figure out the next step.`;

  try {
    const hint = await callOpenRouter(systemPrompt, userMessage);
    return res.status(200).json({ ok: true, hint });
  } catch (err) {
    console.error('[Hint API Error]', err.message);

    const fallbackHints = [
      `Remember to ask for video proof before taking any action on this ${type} report.`,
      `For first offense ${type}, the GSRP guideline says ${guidelines[1]}.`,
      `Kill logs are not valid proof. You need a video clip to take moderation action.`,
      `Ask the reporter for their Discord comms status and the suspect username.`,
      `Stay professional and follow the punishment guidelines for ${type}.`,
    ];

    return res.status(200).json({
      ok: true,
      hint: fallbackHints[Math.min(hintIndex, fallbackHints.length - 1)],
      aiGenerated: false,
    });
  }
}
