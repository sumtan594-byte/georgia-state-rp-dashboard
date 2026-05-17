import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const PUNISHMENT_GUIDELINES = {
  'RDM': { 1: 'Warning', 2: 'Kick', 3: 'Ban', explanation: 'Random Deathmatch starts with a Warning for first offense.' },
  'VDM': { 1: 'Warning', 2: 'Kick', 3: 'Ban', explanation: 'Vehicle Deathmatch starts with a Warning for first offense.' },
  'FRP': { 1: 'Warning', 2: 'Kick', 3: 'Ban', explanation: 'Fail Roleplay starts with a Warning for first offense.' },
  'NLR': { 1: 'Warning', 2: 'Kick', 3: 'Ban', explanation: 'New Life Rule starts with a Warning for first offense.' },
  'NITRP': { 1: 'Kick', 2: 'Ban', 3: '—', explanation: 'No Intent to Roleplay starts with a Kick for first offense.' },
  'LTAP': { 1: 'Ban', 2: '—', 3: '—', explanation: 'Leave To Avoid Punishment is a Ban on first offense. No clip needed, server logs are enough proof.' },
  'TROLLING': { 1: 'Kick', 2: 'Ban', 3: '—', explanation: 'Trolling starts with a Kick for first offense.' },
  'VOL': { 1: 'Warning', 2: 'Kick', 3: 'Ban', explanation: 'Value of Life starts with a Warning for first offense.' },
};

const SYSTEM_PROMPT = `You are a player on a private ER:LC (Emergency Response Liberty County) roleplay server called GSRP (Georgia State Roleplay). You are reporting a rule violation to a staff member. You must stay completely in character as a regular frustrated player seeking help.

RULES YOU MUST KNOW ABOUT:
- RDM (Random Deathmatch): Killing or shooting players without any prior roleplay context or valid reason
- VDM (Vehicle Deathmatch): Using a vehicle as a weapon to repeatedly ram or run over players
- FRP (Fail Roleplay): Performing actions unrealistic to real life like driving a supercar up a vertical mountain
- NITRP (No Intent to Roleplay): Joining a dedicated roleplay server purely to troll chase or disrupt players
- LTAP (Leave To Avoid Punishment): Combat logging or leaving the server right before a cop arrests you or a mod bans you
- NLR (New Life Rule): Upon dying you must forget your past life and cannot return to your death location for revenge
- VOL (Value of Life): Acting realistically when threatened like putting your hands up if someone has a gun to you
- (N)GM (No Gun Motion): Typing out your physical actions in chat before pulling out a weapon like /me unholsters Glock
- STS (Shoulder to Shoulder): A command for players to line up side by side for briefings
- PTS (Permission to Speak): Used during formal lineups you cannot talk in chat until granted PTS
- MDT (Mobile Data Terminal): The in game computer system used by Police and Sheriff and Fire teams to log warrants

GSRP STAFF RULES YOU SHOULD KNOW:
- Staff must always ask for video proof before taking any moderation action
- Kill logs are NOT valid proof only video clips count
- EXCEPT for LTAP where server logs are enough proof and no clip is needed
- Staff should be professional and polite
- Moderation should only occur when there are at least 20 players in the server
- Staff use 4 letter commands while on duty
- The Discord comms code is GSRP7
- If a staff member types a command like :jail :kick :ban :warn or :load the player should react accordingly
- If the staff types :ban you should say something like "finally" or "good" if you were the victim or "thats not fair" if you were the one being reported
- If the staff types :kick you should react with confusion or acceptance
- If the staff types :warn you should say thanks or whatever
- If the staff types :jail you should comment on it
- If the staff types :load you should wait for them to finish loading

PUNISHMENT GUIDELINES:
- RDM: 1st offense Warning 2nd offense Kick 3rd offense Ban
- VDM: 1st offense Warning 2nd offense Kick 3rd offense Ban
- FRP: 1st offense Warning 2nd offense Kick 3rd offense Ban
- NLR: 1st offense Warning 2nd offense Kick 3rd offense Ban
- NITRP: 1st offense Kick 2nd offense Ban
- LTAP: 1st offense Ban (no clip needed server logs are proof enough)
- Trolling: 1st offense Kick 2nd offense Ban
- VOL: 1st offense Warning 2nd offense Kick 3rd offense Ban

HOW TO RESPOND:
- Stay in character as a regular player who is frustrated about a rule violation
- Use casual gamer language but do not be overly rude unless the staff member does something very wrong
- If the staff asks for video proof and you have it say yes and that you will send it
- If the staff asks for video proof and you do not have it say no but suggest they check kill logs which is NOT valid proof
- For LTAP reports if asked for proof say you dont have a clip but the server logs should show it since they left during a mod call
- If the staff asks for your Discord comms status say you are not in comms and ask for the code
- If the staff gives you the code GSRP7 say thanks and that you will join
- If the staff asks for the suspect username give a random Roblox style username
- If the staff immediately bans or kicks without asking for proof get upset and call them out for bad moderation
- If the staff asks what happened describe the incident in detail
- If the staff asks where it is happening give a location in the game
- If the staff asks common questions like how to get mod or how to join staff tell them to apply in the Discord with code GSRP7
- If the staff asks about RP perms say yes and ask how long and what RP
- NEVER break character NEVER mention you are an AI NEVER mention this is a training scenario
- Do not use em dashes in your responses
- Sound like a real person typing in a game chat
- Keep responses short and natural like real game chat messages
- Do not be overly formal or robotic
- Use lowercase sometimes like a real gamer would
- You are the one reporting an offense so act like someone who wants justice done

PLAYER BEHAVIOR VARIETY:
- Sometimes players are polite and say thanks officer
- Sometimes players are rude and call the staff names like doofus idiot or noob
- Sometimes players get impatient and say hurry up or this is taking forever
- Sometimes players argue with each other in the chat like the suspect saying the reporter is lying
- Sometimes multiple people report the same person at once
- Sometimes the suspect joins the chat and denies everything
- Sometimes the reporter and suspect start arguing and the staff needs to calm them down
- Sometimes players use mild bad words like stupid dumb or idiot
- Sometimes players are very chill and just want a warning given
- Sometimes players are very angry and demand a ban right away
- React naturally to whatever the staff member does

COMMAND RESPONSES:
- If the staff types :ban followed by a username react as the person affected. If you were the victim say something like good or finally. If you were the suspect say thats unfair or whatever
- If the staff types :kick react with confusion or acceptance
- If the staff types :warn say thanks or acknowledge it
- If the staff types :jail comment on it
- If the staff types :load wait for them
- If the staff types any other command react naturally

MULTI PLAYER SCENARIOS:
- Sometimes there will be two or more people in the chat reporting the same person
- Sometimes the suspect will also be in chat defending themselves
- The reporter might say things like hes lying or check his logs
- The suspect might say things like i didnt do anything or hes the one trolling
- As the reporter you should stand your ground and tell the staff to check the evidence
- If the staff asks both sides listen and respond accordingly

DE ESCALATION SCENARIOS:
- Sometimes the reporter and suspect will start arguing
- The staff might need to tell them to calm down
- If the staff tells you to calm down you should comply but still want the issue resolved
- Say things like fine but please still look into it or okay sorry but can you still help

CURRENT SCENARIO TYPE: {scenarioType}
CURRENT SCENARIO LABEL: {scenarioLabel}

Respond naturally based on what the staff member says to you.`;

async function callOpenRouter(systemPrompt, chatHistory, userMessage) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

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
      max_tokens: 300,
      temperature: 0.9,
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

function buildChatHistory(scenario, messages) {
  const history = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      history.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'model') {
      history.push({ role: 'assistant', content: msg.content });
    }
  }

  return history;
}

function evaluateStaffResponse(staffMessage, scenarioType) {
  const lower = staffMessage.toLowerCase();
  let score = 0;
  let maxScore = 3;

  const isCommand = staffMessage.startsWith(':');
  const asksForProof = lower.includes('proof') || lower.includes('clip') || lower.includes('video') || lower.includes('recording') || lower.includes('evidence');
  const asksForUsername = lower.includes('username') || lower.includes('name') || lower.includes('who') || lower.includes('suspect');
  const asksForComms = lower.includes('comms') || lower.includes('discord');
  const mentionsReportsChannel = lower.includes('report') || lower.includes('channel');
  const asksToSubmit = lower.includes('submit') || lower.includes('send') || lower.includes('dm');
  const mentionsKillLogs = lower.includes('kill log') || lower.includes('killlog');
  const immediateBan = (lower.includes('ban') || lower.includes('banning')) && !lower.includes('proof') && !lower.includes('check') && !lower.includes('investigate') && !lower.includes('log');
  const immediateKick = (lower.includes('kick') || lower.includes('kicking')) && !lower.includes('proof') && !lower.includes('check') && !lower.includes('investigate');
  const professional = lower.includes('sir') || lower.includes('please') || lower.includes('thank') || lower.includes('help you') || lower.includes('assist');
  const asksWhatHappened = lower.includes('what happened') || lower.includes('tell me') || lower.includes('explain') || lower.includes('details');
  const deEscalates = lower.includes('calm') || lower.includes('stop arguing') || lower.includes('chill') || lower.includes('relax');

  if (isCommand) {
    const guidelines = PUNISHMENT_GUIDELINES[scenarioType];
    if (guidelines) {
      const correctAction = guidelines[1].toLowerCase();
      if (staffMessage.toLowerCase().includes(':ban') && correctAction === 'ban') {
        score = 3;
      } else if (staffMessage.toLowerCase().includes(':kick') && correctAction === 'kick') {
        score = 3;
      } else if (staffMessage.toLowerCase().includes(':warn') && correctAction === 'warning') {
        score = 3;
      } else if (staffMessage.toLowerCase().includes(':jail')) {
        score = 2;
      } else {
        score = 1;
      }
    }
    return { score, maxScore, shouldShowDecision: false, isCommand: true };
  }

  if (asksForProof) score += 1;
  if (asksForUsername) score += 0.5;
  if (asksForComms) score += 0.5;
  if (mentionsReportsChannel) score += 0.5;
  if (asksToSubmit) score += 0.5;
  if (professional) score += 0.25;
  if (asksWhatHappened) score += 0.25;
  if (deEscalates) score += 0.5;

  if (mentionsKillLogs && lower.includes('valid')) score -= 1;
  if (scenarioType !== 'LTAP' && immediateBan) score -= 1.5;
  if (scenarioType !== 'LTAP' && immediateKick) score -= 1;

  if (scenarioType === 'LTAP' && (lower.includes('log') || lower.includes('check server'))) {
    score = Math.max(score, 2);
  }

  score = Math.max(0, Math.min(maxScore, Math.round(score * 10) / 10));

  let shouldShowDecision = false;
  if (asksForProof) shouldShowDecision = true;
  if (asksForComms) shouldShowDecision = true;
  if (asksToSubmit) shouldShowDecision = true;

  return { score, maxScore, shouldShowDecision };
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, scenario, chatHistory = [], decisionAction } = req.body;

  if (!message || !scenario) {
    return res.status(400).json({ error: 'message and scenario required' });
  }

  if (decisionAction) {
    const guidelines = PUNISHMENT_GUIDELINES[scenario.type];
    const type = scenario.type;
    const correctFirstOffense = guidelines?.[1]?.toLowerCase() || 'warning';

    let score = 0;
    let maxScore = 3;
    let feedback = '';
    let response = '';

    switch (decisionAction) {
      case 'warn':
        if (correctFirstOffense === 'warning') {
          score = 3;
          feedback = `Correct! Per GSRP guidelines a first offense ${type} results in a Warning.`;
        } else {
          score = 1;
          feedback = `Incorrect. Per guidelines first offense ${type} should be ${guidelines[1]} not a Warning.`;
        }
        break;
      case 'kick':
        if (correctFirstOffense === 'kick') {
          score = 3;
          feedback = `Correct! Per GSRP guidelines a first offense ${type} results in a Kick.`;
        } else if (correctFirstOffense === 'warning') {
          score = 1;
          feedback = `Too harsh. Per guidelines first offense ${type} should be a Warning not a Kick.`;
        } else {
          score = 2;
          feedback = `Close but per guidelines ${type} first offense is ${guidelines[1]}.`;
        }
        break;
      case 'ban':
        if (correctFirstOffense === 'ban') {
          score = 3;
          feedback = `Correct! Per GSRP guidelines a first offense ${type} results in a Ban.`;
        } else {
          score = 0;
          feedback = `Too harsh! Per guidelines first offense ${type} should be ${guidelines[1]} not a Ban. Never ban on first offense unless guidelines say so.`;
        }
        break;
      case 'ban_jail':
        score = 2;
        feedback = 'Ban jail is an option but consider if it matches the punishment guidelines for this offense.';
        break;
      case 'ignore':
        score = 0;
        feedback = `Incorrect. You should never ignore a valid report. Take appropriate action based on the punishment guidelines.`;
        break;
      default:
        score = 1;
        feedback = 'Response noted. Consider following the punishment guidelines more closely.';
    }

    try {
      const aiResponse = await callOpenRouter(
        `You are a player on GSRP ER:LC roleplay server. A staff member just took this action against the person you reported: ${decisionAction}. Respond as a regular player would. Keep it short and natural. Do not use em dashes. Sound like a real person typing in game chat.`,
        buildChatHistory(scenario, chatHistory),
        `[Staff chose to ${decisionAction}]`
      );
      response = aiResponse;
    } catch {
      const fallbacks = {
        warn: 'Okay officer thanks for the warning.',
        kick: 'Alright I understand. Thanks for handling this.',
        ban: 'Okay they deserved it.',
        ban_jail: 'Ban jail works I guess.',
        ignore: 'Wait you are just ignoring this? That is terrible moderation!',
      };
      response = fallbacks[decisionAction] || 'Okay noted.';
    }

    return res.status(200).json({
      response,
      score,
      maxScore,
      feedback,
      ended: true,
    });
  }

  const evaluation = evaluateStaffResponse(message, scenario.type);

  const systemPrompt = SYSTEM_PROMPT
    .replace('{scenarioType}', scenario.type)
    .replace('{scenarioLabel}', scenario.label);

  try {
    const aiResponse = await callOpenRouter(
      systemPrompt,
      buildChatHistory(scenario, chatHistory),
      message
    );

    if (evaluation.isCommand) {
      return res.status(200).json({
        response: aiResponse,
        score: evaluation.score,
        maxScore: evaluation.maxScore,
        feedback: evaluation.score >= 2 ? 'Good command usage for this offense.' : 'Consider if this command matches the punishment guidelines.',
        ended: true,
      });
    }

    if (evaluation.shouldShowDecision) {
      return res.status(200).json({
        response: aiResponse,
        decision: {
          title: `What action would you like to take for this ${scenario.label} report?`,
          options: [
            { label: 'Warn', value: 'warn', variant: 'warning' },
            { label: 'Kick', value: 'kick', variant: 'warning' },
            { label: 'Ban', value: 'ban', variant: 'danger' },
            { label: 'Ban Jail', value: 'ban_jail', variant: 'danger' },
            { label: 'Ignore', value: 'ignore', variant: 'default' },
          ],
        },
      });
    }

    if (evaluation.score === 0 && (message.toLowerCase().includes('ban') || message.toLowerCase().includes('kick')) && !message.toLowerCase().includes('proof') && !message.toLowerCase().includes('log')) {
      return res.status(200).json({
        response: aiResponse,
        score: 0,
        maxScore: 3,
        feedback: 'You took action without proper proof or investigation. Always ask for video evidence first unless it is an LTAP case where server logs are enough.',
        ended: true,
      });
    }

    return res.status(200).json({
      response: aiResponse,
    });
  } catch (err) {
    console.error('[OpenRouter API Error]', err.message);

    const fallbackResponses = [
      "Yeah I have a clip! Let me send it to you.",
      "Uhh no I did not record it. But check the kill logs?",
      "The guy username is xXDragonSlayer99Xx. Please do something!",
      "I'm not in comms yet! How do I join? Do I need a code?",
      "Okay I'll send it there! Thanks for the help officer!",
      "They're currently near the dealership. Please hurry!",
      "Wait what? You're taking action without even checking? That seems unfair.",
    ];

    return res.status(200).json({
      response: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
      error: 'AI service unavailable, using fallback',
    });
  }
}
