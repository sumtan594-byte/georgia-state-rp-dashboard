import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const PUNISHMENT_GUIDELINES = {
  'RDM': { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  'VDM': { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  'FRP': { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  'NLR': { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  'NITRP': { 1: 'Kick', 2: 'Ban', 3: '—' },
  'LTAP': { 1: 'Ban', 2: '—', 3: '—' },
  'TROLLING': { 1: 'Kick', 2: 'Ban', 3: '—' },
  'VOL': { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
};

const VIEW_RESPONSES = {
  'RDM': [
    "The player is walking around the gas station with a pistol holstered. Nothing suspicious right now.",
    "You see the player standing near the prison gates talking to someone. They seem to be doing normal RP.",
    "The player is driving around the city in a sedan. They just pulled up to a red light and are waiting.",
  ],
  'VDM': [
    "The player is driving a pickup truck around the prison parking lot. They just did a U-turn and are heading toward players on foot.",
    "You see the player in a Chevlon Corbeta speeding down the highway. They just swerved near the edge of the road.",
    "The player is parked at the dealership sitting in their car with the engine running. Nothing happening yet.",
  ],
  'FRP': [
    "The player is driving a sports car up the side of a mountain at a crazy angle that would not be possible in real life.",
    "You see the player flying around on a motorcycle doing loops in the sky above the city.",
    "The player is at the beach doing normal RP. They are sitting on a chair talking to someone.",
  ],
  'NITRP': [
    "The player is driving in circles around the courthouse making loud engine noises. They keep driving through a RP scene.",
    "You see the player running around the city spamming emotes. They are not talking to anyone or doing any RP.",
    "The player is at the gas station pumping gas like normal. They seem to be doing proper RP right now.",
  ],
  'LTAP': [
    "The player has already left the server. Their character disappeared about 2 minutes ago during the mod call.",
    "The player disconnected. You can see their last location was near the bank. Server logs should show they left during an active report.",
    "The player is no longer online. Their name is greyed out in the player list.",
  ],
  'NLR': [
    "The player just respawned at the hospital and is running straight back toward the bank where they died. They have a gun equipped.",
    "You see the player at the exact spot where they died earlier. They are pointing their gun at the same person who killed them.",
    "The player is at the park doing normal RP. They are sitting on a bench talking to someone.",
  ],
  'VOL': [
    "The player has a shotgun pointed at them. Instead of putting their hands up they are pulling out their own AK.",
    "You see the player being robbed. They have their hands up and are acting scared. They are following value of life rules.",
    "The player was threatened with a gun but they just laughed and ran away. No fear at all.",
  ],
  'TROLLING': [
    "The player has parked 5 cars across the highway blocking all traffic. They are sitting on top of one laughing.",
    "You see the player driving recklessly through the city. They just ran a red light and nearly hit another player.",
    "The player is at the dealership doing normal RP. They are looking at cars and talking to a salesperson.",
  ],
};

function getViewResponse(scenarioType) {
  const responses = VIEW_RESPONSES[scenarioType] || VIEW_RESPONSES['RDM'];
  return responses[Math.floor(Math.random() * responses.length)];
}

const SYSTEM_PROMPT = `You are a player on a private ER:LC roleplay server called GSRP. You are reporting a rule violation to a staff member. Stay completely in character as a regular player.

RULES TO KNOW:
- RDM: Killing or shooting players without any roleplay reason
- VDM: Using a vehicle to repeatedly hit players
- FRP: Doing unrealistic things like driving up a vertical mountain
- NITRP: Joining to troll and disrupt instead of roleplaying
- LTAP: Leaving the server to avoid getting punished
- NLR: Coming back to your death spot for revenge after dying
- VOL: Not acting realistically when threatened with a gun

STAFF RULES:
- Staff must ask for video proof before punishing anyone
- Kill logs are NOT valid proof
- For LTAP server logs are enough proof no clip needed
- The Discord comms code is GSRP7

PUNISHMENTS:
- RDM: Warning then Kick then Ban
- VDM: Warning then Kick then Ban
- FRP: Warning then Kick then Ban
- NLR: Warning then Kick then Ban
- NITRP: Kick then Ban
- LTAP: Ban on first offense
- Trolling: Kick then Ban
- VOL: Warning then Kick then Ban

HOW TO ACT:
- You are a frustrated player reporting someone
- Use casual gamer language
- Keep responses short like real game chat
- Use lowercase sometimes
- Never break character or mention being an AI
- If asked for a clip say yes or no
- If asked for username give a Roblox style name
- If staff bans or kicks without proof get upset
- If staff is polite be nice back
- If staff types :view describe what you are doing in game
- If staff types :ban react as the person affected
- If staff types :kick react accordingly
- If staff types :warn say thanks
- If staff types :jail comment on it

CURRENT SCENARIO: {scenarioType} - {scenarioLabel}

Respond naturally to what the staff member says.`;

async function callOpenRouter(systemPrompt, chatHistory, userMessage) {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: userMessage },
  ];

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
      messages,
      max_tokens: 200,
      temperature: 0.85,
      reasoning: { enabled: false },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

function buildHistory(messages) {
  return messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));
}

function evaluateResponse(message, scenarioType) {
  const lower = message.toLowerCase();
  let score = 0;
  let maxScore = 3;

  const isCommand = message.startsWith(':') && !lower.startsWith(':view') && !lower.startsWith(':load');
  const isViewCommand = lower.startsWith(':view');
  const asksForProof = lower.includes('proof') || lower.includes('clip') || lower.includes('video') || lower.includes('recording');
  const asksForUsername = lower.includes('username') || lower.includes('name') || lower.includes('who') || lower.includes('suspect');
  const asksForComms = lower.includes('comms') || lower.includes('discord');
  const mentionsReports = lower.includes('report') || lower.includes('channel');
  const asksToSubmit = lower.includes('submit') || lower.includes('send') || lower.includes('dm');
  const professional = lower.includes('sir') || lower.includes('please') || lower.includes('thank');
  const deEscalates = lower.includes('calm') || lower.includes('stop arguing') || lower.includes('chill');
  const immediateAction = (lower.includes(':ban') || lower.includes(':kick')) && !lower.includes('proof') && !lower.includes('log');

  if (isViewCommand) {
    return { isView: true, score: 0, maxScore: 0 };
  }

  if (isCommand) {
    const guidelines = PUNISHMENT_GUIDELINES[scenarioType];
    if (guidelines) {
      const correct = guidelines[1].toLowerCase();
      if (lower.includes(':ban') && correct === 'ban') score = 3;
      else if (lower.includes(':kick') && correct === 'kick') score = 3;
      else if (lower.includes(':warn') && correct === 'warning') score = 3;
      else if (lower.includes(':jail')) score = 2;
      else score = 1;
    }
    return { score, maxScore, isCommand: true };
  }

  if (asksForProof) score += 1;
  if (asksForUsername) score += 0.5;
  if (asksForComms) score += 0.5;
  if (mentionsReports) score += 0.5;
  if (asksToSubmit) score += 0.5;
  if (professional) score += 0.25;
  if (deEscalates) score += 0.5;

  if (scenarioType !== 'LTAP' && immediateAction) score -= 1.5;
  if (scenarioType === 'LTAP' && (lower.includes('log') || lower.includes('check server'))) score = Math.max(score, 2);

  score = Math.max(0, Math.min(maxScore, Math.round(score * 10) / 10));
  return { score, maxScore, isCommand: false };
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, scenario, chatHistory = [] } = req.body;
  if (!message || !scenario) return res.status(400).json({ error: 'message and scenario required' });

  const lower = message.toLowerCase();

  if (lower.startsWith(':view')) {
    const viewDesc = getViewResponse(scenario.type);
    return res.status(200).json({
      response: `[System: View] ${viewDesc}`,
      isView: true,
    });
  }

  const evaluation = evaluateResponse(message, scenario.type);

  const systemPrompt = SYSTEM_PROMPT
    .replace('{scenarioType}', scenario.type)
    .replace('{scenarioLabel}', scenario.label);

  try {
    const aiResponse = await callOpenRouter(
      systemPrompt,
      buildHistory(chatHistory),
      message
    );

    if (lower === 'ask something else' || lower === 'ask something') {
      return res.status(200).json({ response: aiResponse });
    }

    if (evaluation.isView) {
      return res.status(200).json({ response: aiResponse });
    }

    if (evaluation.isCommand) {
      return res.status(200).json({
        response: aiResponse,
        score: evaluation.score,
        maxScore: evaluation.maxScore,
        feedback: evaluation.score >= 2 ? 'Good use of command for this situation.' : 'Make sure the command matches the punishment guidelines.',
        ended: true,
      });
    }

    if (evaluation.score >= 2 && (lower.includes('proof') || lower.includes('clip') || lower.includes('video') || lower.includes('comms') || lower.includes('discord') || lower.includes('submit') || lower.includes('send'))) {
      return res.status(200).json({
        response: aiResponse,
        showDecisionHint: true,
        decisionHint: `Good job asking for proof. When you are ready to take action use commands like :warn :kick :ban or :jail. For ${scenario.type} the first offense punishment is ${PUNISHMENT_GUIDELINES[scenario.type][1]}.`,
      });
    }

    if (evaluation.score === 0 && (lower.includes(':ban') || lower.includes(':kick')) && !lower.includes('proof') && scenario.type !== 'LTAP') {
      return res.status(200).json({
        response: aiResponse,
        score: 0,
        maxScore: 3,
        feedback: 'You used a command without asking for proof first. Always get video evidence before punishing someone.',
        ended: true,
      });
    }

    return res.status(200).json({ response: aiResponse });
  } catch (err) {
    console.error('[Chat API Error]', err.message);
    const fallbacks = [
      "Yeah I have a clip let me send it.",
      "No clip sorry but check kill logs?",
      "His username is xXDragonSlayer99Xx please help.",
      "I'm not in comms how do I join?",
      "Okay I will send it there thanks.",
      "They're near the dealership hurry.",
      "You're banning without checking? Thats not fair.",
    ];
    return res.status(200).json({ response: fallbacks[Math.floor(Math.random() * fallbacks.length)] });
  }
}
