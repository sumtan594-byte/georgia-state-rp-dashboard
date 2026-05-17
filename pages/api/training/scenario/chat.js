import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import clientPromise from '../../../../lib/mongodb';

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

const COMMON_QUESTIONS = [
  {
    keywords: ['can i get mod', 'how to get mod', 'become mod', 'apply mod', 'mod perms'],
    response: "Oh I don't handle applications, but you can apply in our Discord! The code is GSRP7 to get in.",
  },
  {
    keywords: ['how do i join staff', 'join staff team', 'become staff', 'staff application', 'how to apply'],
    response: "You can apply for staff in our Discord server! Use the code GSRP7 to join the comms and look for the application channel.",
  },
  {
    keywords: ['rp perms', 'roleplay perms', 'rp permissions', 'can i get rp'],
    response: "Yes! Just tell me how long you need and what kind of RP, and I'll log it for you.",
  },
  {
    keywords: ['discord', 'discord link', 'discord server', 'discord invite'],
    response: "The Discord code is GSRP7! You can use that to join our server.",
  },
  {
    keywords: ['comms code', 'server code', 'join code', 'code'],
    response: "The comms code is GSRP7!",
  },
];

function checkCommonQuestion(message) {
  const lower = message.toLowerCase();
  for (const q of COMMON_QUESTIONS) {
    if (q.keywords.some(k => lower.includes(k))) {
      return q.response;
    }
  }
  return null;
}

function evaluateResponse(message, scenario) {
  const lower = message.toLowerCase();
  let score = 0;
  let maxScore = 3;
  let feedback = '';

  const asksForProof = lower.includes('proof') || lower.includes('clip') || lower.includes('video') || lower.includes('recording') || lower.includes('evidence');
  const asksForUsername = lower.includes('username') || lower.includes('name') || lower.includes('who') || lower.includes('suspect');
  const asksForComms = lower.includes('comms') || lower.includes('discord');
  const mentionsReportsChannel = lower.includes('report') || lower.includes('channel');
  const mentionsKillLogs = lower.includes('kill log') || lower.includes('killlog');
  const immediateBan = lower.includes('ban') && !lower.includes('proof') && !lower.includes('check');
  const immediateKick = lower.includes('kick') && !lower.includes('proof') && !lower.includes('check');
  const professional = lower.includes('sir') || lower.includes('please') || lower.includes('thank') || lower.includes('help');
  const asksToSubmit = lower.includes('submit') || lower.includes('send') || lower.includes('dm') || lower.includes('send it');

  if (asksForProof) score += 1;
  if (asksForUsername) score += 0.5;
  if (asksForComms) score += 0.5;
  if (mentionsReportsChannel) score += 0.5;
  if (asksToSubmit) score += 0.5;
  if (professional) score += 0.25;

  if (mentionsKillLogs && lower.includes('valid')) score -= 1;
  if (immediateBan) score -= 1.5;
  if (immediateKick) score -= 1;

  score = Math.max(0, Math.min(maxScore, score));

  if (score >= 2.5) {
    feedback = 'Excellent response! You asked for proper proof and handled it professionally.';
  } else if (score >= 1.5) {
    feedback = 'Good response, but could be improved. Remember to always ask for video proof.';
  } else if (score >= 0.5) {
    feedback = 'Partial credit. You need to ask for video proof before taking any action.';
  } else {
    feedback = 'Incorrect approach. Never take action without video proof. Kill logs are not valid evidence.';
  }

  return { score: Math.round(score * 10) / 10, maxScore, feedback };
}

function generateAIResponse(message, scenario, chatHistory) {
  const lower = message.toLowerCase();

  const commonResponse = checkCommonQuestion(message);
  if (commonResponse) {
    return { response: commonResponse, ended: false };
  }

  if (message.startsWith('[DECISION:')) {
    const action = message.split(':')[1]?.replace(']', '');
    return handleDecision(action, scenario);
  }

  const asksForProof = lower.includes('proof') || lower.includes('clip') || lower.includes('video') || lower.includes('recording') || lower.includes('evidence');
  const asksForUsername = lower.includes('username') || lower.includes('name') || lower.includes('who is') || lower.includes('suspect');
  const asksForComms = lower.includes('comms') || lower.includes('discord');
  const mentionsKillLogs = lower.includes('kill log') || lower.includes('killlog');
  const asksToSubmit = lower.includes('submit') || lower.includes('send') || lower.includes('dm me') || lower.includes('send it');
  const mentionsReportsChannel = lower.includes('report') || lower.includes('channel');
  const immediateBan = lower.includes('ban') && !lower.includes('proof') && !lower.includes('check');
  const immediateKick = lower.includes('kick') && !lower.includes('proof') && !lower.includes('check');
  const asksWhatHappened = lower.includes('what happened') || lower.includes('tell me') || lower.includes('explain') || lower.includes('details');
  const asksForLocation = lower.includes('where') || lower.includes('location') || lower.includes('spot');
  const saysOkay = lower.includes('okay') || lower.includes('ok') || lower.includes('sure') || lower.includes('alright');
  const asksToWait = lower.includes('wait') || lower.includes('hold') || lower.includes('one sec') || lower.includes('moment');
  const asksToTeleport = lower.includes('teleport') || lower.includes('tp') || lower.includes('come here') || lower.includes('come to');
  const asksForTimestamp = lower.includes('time') || lower.includes('when') || lower.includes('timestamp');

  const hasAskedForProof = chatHistory.some(h => h.role === 'user' && (h.content.toLowerCase().includes('proof') || h.content.toLowerCase().includes('clip') || h.content.toLowerCase().includes('video')));
  const hasAskedForUsername = chatHistory.some(h => h.role === 'user' && (h.content.toLowerCase().includes('username') || h.content.toLowerCase().includes('suspect')));

  if (mentionsKillLogs) {
    const responses = [
      "Uhh, I don't have a clip but you can check the kill logs in the server?",
      "No clip sorry.. but the kill logs show it clearly! Just check those.",
      "I dont have video but kill logs should be enough right?",
    ];
    return { response: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (asksForProof && !hasAskedForProof) {
    const hasClip = Math.random() > 0.3;
    if (hasClip) {
      const responses = [
        "Yeah I have a clip! Let me send it to you. Give me a sec.",
        "Yes! I recorded it. I'll send it in the reports channel.",
        "I got it on video! I'll DM it to you right now.",
      ];
      return { response: responses[Math.floor(Math.random() * responses.length)], showDecision: true };
    } else {
      const responses = [
        "Uhh, noo.. I didn't record it. But check the kill logs?",
        "Sorry I don't have a clip.. I was caught off guard. Can you still do something?",
        "No video sorry.. but it definitely happened! Can't you just check?",
      ];
      return { response: responses[Math.floor(Math.random() * responses.length)] };
    }
  }

  if (asksForUsername) {
    const usernames = ['xXDragonSlayer99Xx', 'ProGamer_2024', 'NoobMaster69', 'CoolKid_RBLX', 'SpeedRacer_EU', 'ShadowKnight_X', 'LunaStar_2024', 'BlazeFury'];
    const username = usernames[Math.floor(Math.random() * usernames.length)];
    return { response: `The guy's username is ${username}. Please do something about them!` };
  }

  if (asksForComms) {
    return { response: "I'm not in comms yet! How do I join? Do I need a code?" };
  }

  if (lower.includes('gsrp7') || lower.includes('the code is')) {
    return { response: "Oh okay thanks! I'll join the comms now. Should I send the proof there?", showDecision: true };
  }

  if (asksToSubmit || mentionsReportsChannel) {
    return { response: "Okay I'll send it there! Thanks for the help officer!", showDecision: true };
  }

  if (asksWhatHappened) {
    const descriptions = [
      "I was just walking to my car minding my own business and this guy just pulls out a gun and shoots me! No warning, no RP, nothing!",
      "They were just driving around the city running over anyone in their path. I counted at least 3 people they hit!",
      "I was doing a proper traffic stop and the suspect just got out and started shooting at me for no reason!",
      "This guy is just flying around on a motorcycle doing insane stunts in the sky. That's not even realistic!",
    ];
    return { response: descriptions[Math.floor(Math.random() * descriptions.length)] };
  }

  if (asksForLocation) {
    const locations = ['near the dealership', 'at the prison', 'downtown by the courthouse', 'near the gas station on the highway', 'at the beach area', 'by the apartment complex'];
    return { response: `They're currently ${locations[Math.floor(Math.random() * locations.length)]}. Please hurry!` };
  }

  if (asksToTeleport) {
    return { response: "Yeah they're still here! Please come quickly before they leave!", showDecision: true };
  }

  if (asksForTimestamp) {
    return { response: "It happened like 2 minutes ago! They're still in the area." };
  }

  if (saysOkay || asksToWait) {
    return { response: "Okay I'll wait. Please hurry though, they might leave soon!" };
  }

  if (immediateBan || immediateKick) {
    const upsetResponses = [
      "Wait what? You're banning them without even checking? That seems unfair...",
      "Whoa hold on, don't you need proof first? That doesn't seem right.",
      "You can't just ban someone without evidence! What if I'm lying?",
    ];
    const angryResponses = [
      "Whatever man, you're a terrible mod. I'm telling the higher ups about this.",
      "This is why people hate mods. You just abuse your power without checking anything.",
      "Wow okay. You're doing a terrible job. I'm reporting YOU now.",
    ];
    const response = Math.random() > 0.5
      ? upsetResponses[Math.floor(Math.random() * upsetResponses.length)]
      : angryResponses[Math.floor(Math.random() * angryResponses.length)];
    return { response, ended: true, badAction: true };
  }

  const genericResponses = [
    "Okay thanks for the info. What should I do next?",
    "I see. Can you help me out with this?",
    "Alright, what do you need from me?",
    "Got it. What's the next step?",
    "Okay officer, please help me with this situation.",
  ];

  return { response: genericResponses[Math.floor(Math.random() * genericResponses.length)] };
}

function handleDecision(action, scenario) {
  const type = scenario.type;
  const guidelines = PUNISHMENT_GUIDELINES[type];

  let response = '';
  let score = 0;
  let maxScore = 3;
  let feedback = '';

  switch (action) {
    case 'warn':
      if (guidelines[1] === 'Warning') {
        score = 3;
        feedback = `Correct! Per GSRP guidelines, a first offense ${type} results in a Warning.`;
        response = `Okay officer, thank you for the warning. I'll make sure to tell the suspect.`;
      } else {
        score = 1;
        feedback = `Incorrect. Per guidelines, first offense ${type} should be ${guidelines[1]}, not a Warning.`;
        response = `A warning? That seems too light for what they did...`;
      }
      break;
    case 'kick':
      if (guidelines[1] === 'Kick') {
        score = 3;
        feedback = `Correct! Per GSRP guidelines, a first offense ${type} results in a Kick.`;
        response = `Okay, I understand. Thanks for handling this officer.`;
      } else if (guidelines[1] === 'Warning') {
        score = 1.5;
        feedback = `Too harsh. Per guidelines, first offense ${type} should be a Warning, not a Kick.`;
        response = `A kick? That seems a bit much for a first offense...`;
      } else {
        score = 2;
        feedback = `Close, but per guidelines ${type} first offense is ${guidelines[1]}.`;
        response = `Okay, I guess that's fair.`;
      }
      break;
    case 'ban':
      if (guidelines[1] === 'Ban') {
        score = 3;
        feedback = `Correct! Per GSRP guidelines, a first offense ${type} results in a Ban.`;
        response = `Okay officer. They deserved it.`;
      } else {
        score = 0;
        feedback = `Too harsh! Per guidelines, first offense ${type} should be ${guidelines[1]}, not a Ban. Never ban on first offense unless guidelines say so.`;
        response = `Wait, a BAN?! Without even checking? That's not fair at all!`;
      }
      break;
    case 'ban_jail':
      score = 2;
      feedback = 'Ban jail is an option but consider if it is appropriate for this offense.';
      response = `Ban jail? Okay I guess that works.`;
      break;
    case 'ignore':
      score = 0;
      feedback = `Incorrect. You should never ignore a valid report. Take appropriate action.`;
      response = `Wait, you're just going to ignore this? That's terrible moderation!`;
      break;
    default:
      score = 1;
      feedback = 'Response noted. Consider following the punishment guidelines more closely.';
      response = `Okay, noted.`;
  }

  return {
    response,
    score,
    maxScore,
    feedback,
    ended: true,
  };
}

function getDecisionPopup(scenario) {
  const type = scenario.type;
  const guidelines = PUNISHMENT_GUIDELINES[type];

  return {
    title: `What action would you like to take for this ${type} report?`,
    options: [
      { label: 'Warn', value: 'warn', variant: 'warning' },
      { label: 'Kick', value: 'kick', variant: 'warning' },
      { label: 'Ban', value: 'ban', variant: 'danger' },
      { label: 'Ban Jail', value: 'ban_jail', variant: 'danger' },
      { label: 'Ignore', value: 'ignore', variant: 'default' },
    ],
    hint: `Guideline for 1st offense ${type}: ${guidelines[1]}`,
  };
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
    const result = handleDecision(decisionAction, scenario);
    return res.status(200).json({
      response: result.response,
      score: result.score,
      maxScore: result.maxScore,
      feedback: result.feedback,
      ended: result.ended,
    });
  }

  const result = generateAIResponse(message, scenario, chatHistory);

  if (result.showDecision) {
    return res.status(200).json({
      response: result.response,
      decision: getDecisionPopup(scenario),
    });
  }

  if (result.ended && result.badAction) {
    const evaluation = evaluateResponse(message, scenario);
    return res.status(200).json({
      response: result.response,
      score: evaluation.score,
      maxScore: evaluation.maxScore,
      feedback: evaluation.feedback,
      ended: true,
    });
  }

  return res.status(200).json({
    response: result.response,
  });
}
