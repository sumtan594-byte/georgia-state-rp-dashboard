// Quiz question bank — 50+ questions across all handbook sections + RP logging & punishment logging.
// Questions are grouped into pools; each quiz attempt draws a random subset.
// On retry, at least 40% of questions are swapped for fresh ones.

// ── Mock Data ──────────────────────────────────────────────────────────────────

export const MOCK_USERS = [
  'Killer_X99', 'Speedy_Racer42', 'ShadowCop_LC', 'NoobMaster2007',
  'xXFastBoyXx', 'GTA_Enjoyer', 'RP_King_01', 'ChaoticNeutral',
  'DriftKing_LC', 'SilentTrooper', 'BountyHunter99', 'RoadRage_Pro',
  'CivilianJoe', 'TacticalOwl', 'NightHawk_LC', 'PixelBandit',
  'TurboVandal', 'CopBlockr', 'SpeedDemon_X', 'GhostRider_LC',
  'RogueElement', 'BlazeFury', 'StealthOps', 'UrbanRaider',
];

export const RP_TYPES = [
  { key: 'hostage', label: 'Hostage', plural: 'hostage' },
  { key: 'roadwork', label: 'Roadwork', plural: 'roadwork' },
  { key: 'border', label: 'Border', plural: 'border' },
  { key: 'traffic_stop', label: 'Traffic Stop', plural: 'traffic stop' },
  { key: 'warrant', label: 'Warrant', plural: 'warrant' },
  { key: 'welfare', label: 'Welfare Check', plural: 'welfare check' },
];

const LOCATIONS = [
  'Prison, Cell Block A', 'Hospital, Emergency Wing', 'House, P/S 702',
  'Freedom Avenue (Near Civilian Spawn)', 'Highway I-95, Mile 12',
  'Downtown Bank', 'Mountain Lodge', 'Docks, Warehouse 3',
  'City Hall Steps', 'Airport Runway', 'Gas Station, Pump 4',
  'Parking Lot, Mall', 'Subway Station', 'Bridge, North Side',
];

const MODERATORS = ['fried.rice57', 'JusticeWolf', 'AlphaMod_', 'ZenithLC'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) { return shuffleArray([...arr]).slice(0, n); }

function generateMockLogs(rpType, includeOngoing) {
  const now = Date.now();
  const MIN = 60_000;
  const HOUR = 3_600_000;
  const logs = [];

  if (includeOngoing) {
    logs.push({
      player: pick(MOCK_USERS),
      type: rpType.label,
      location: pick(LOCATIONS),
      duration: Math.floor(Math.random() * 40 + 15) + 'm',
      quickKill: Math.random() > 0.5 ? 'Yes' : 'No',
      moderator: pick(MODERATORS),
      started: '[5 minutes ago]',
      ends: '[in ' + Math.floor(Math.random() * 25 + 10) + ' minutes]',
      active: true,
    });
  }

  const inactiveCount = Math.floor(Math.random() * 2) + 2;
  for (let i = 0; i < inactiveCount; i++) {
    const startTime = new Date(now - Math.floor(Math.random() * 72 * HOUR));
    const endTime = new Date(startTime.getTime() + Math.floor(Math.random() * 3600_000 + 600_000));
    logs.push({
      player: pick(MOCK_USERS),
      type: Math.random() > 0.4 ? rpType.label : pick(RP_TYPES).label,
      location: pick(LOCATIONS),
      duration: Math.floor(Math.random() * 55 + 10) + 'm',
      quickKill: Math.random() > 0.5 ? 'Yes' : 'No',
      moderator: pick(MODERATORS),
      started: `<t:${Math.floor(startTime.getTime() / 1000)}:F>`,
      ended: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`,
      active: false,
    });
  }

  return shuffleArray(logs);
}

function buildLogDialog(logs, rpType) {
  if (logs.length === 0) {
    return `# No Ongoing ${rpType.label} Roleplays\n\nThere are currently no active ${rpType.plural} roleplays logged in the system.`;
  }

  const lines = logs.map(l => {
    const status = l.active
      ? `**Started:** ${l.started} **Ends:** ${l.ends} *(Active)*`
      : `**Started:** ${l.started} **Ended:** ${l.ended}`;
    return `# Roleplay Logged\n**Player:** ${l.player}\n**Type:** ${l.type}\n**Location:** ${l.location}\n**Duration:** ${l.duration}\n**Quick Kill:** ${l.quickKill}\n**Moderator:** ${l.moderator}\n${status}`;
  });

  const header = logs.some(l => l.active)
    ? `# ${rpType.label} Roleplay Status\n\nThere ${logs.filter(l => l.active).length === 1 ? 'is' : 'are'} currently **${logs.filter(l => l.active).length} active ${rpType.plural} roleplay(s):`
    : `# No Active ${rpType.label} Roleplays\n\nThere are no ongoing ${rpType.plural} roleplays at this time.`;

  return `${header}\n\n${lines.join('\n\n')}`;
}

// Pre-generate RP-log question templates.
// At quiz generation time we fill in random RP type, mock user, and scenario variants.
const RP_LOG_TEMPLATES = [
  {
    id: 'rl_hostage',
    section: 'rp-log',
    type: 'rp-log',
    text: 'A player has requested to do a {rpType} roleplay. Walk through the proper process.',
    scenario: null, // randomized
  },
];

const P_LOG_TEMPLATES = [
  {
    id: 'pl_rdm',
    section: 'punishments',
    type: 'p-log',
    text: '{offender} is RDMing in the server. Process the punishment and log it in melonly.',
    offense: 'RDM',
    correctPunishment: 'Warn',
    correctReason: 'RDM - First Offence',
  },
  {
    id: 'pl_vdm',
    section: 'punishments',
    type: 'p-log',
    text: '{offender} is VDMing (vehicular deathmatch) near civilian spawn. Process the punishment and log it in melonly.',
    offense: 'VDM',
    correctPunishment: 'Warn',
    correctReason: 'VDM - First Offence',
  },
  {
    id: 'pl_frp',
    section: 'punishments',
    type: 'p-log',
    text: '{offender} is clearly failing to roleplay in an active scene. Process the punishment and log it in melonly.',
    offense: 'FRP',
    correctPunishment: 'Warn',
    correctReason: 'FRP - First Offence',
  },
  {
    id: 'pl_cuff_rush',
    section: 'punishments',
    type: 'p-log',
    text: '{offender} is cuff rushing during an active arrest. Process the punishment and log it in melonly.',
    offense: 'Cuff Rushing',
    correctPunishment: 'Kick',
    correctReason: 'Cuff Rushing - First Offence',
  },
  {
    id: 'pl_ltap',
    section: 'punishments',
    type: 'p-log',
    text: '{offender} left the server immediately after being warned for RDM to avoid punishment. Process and log in melonly.',
    offense: 'LTAP',
    correctPunishment: 'Ban',
    correctReason: 'LTAP - First Offence (Bannable)',
  },
  {
    id: 'pl_mass_vdm',
    section: 'punishments',
    type: 'p-log',
    text: '{offender} is mass VDMing — running over multiple players intentionally. Process and log in melonly.',
    offense: 'Mass VDM',
    correctPunishment: 'Ban',
    correctReason: 'Mass VDM - Obvious Trolling',
  },
  {
    id: 'pl_exploiting',
    section: 'punishments',
    type: 'p-log',
    text: '{offender} was caught using third-party software to fly and speedhack. Process and log in melonly.',
    offense: 'Exploiting',
    correctPunishment: 'Ban',
    correctReason: 'Exploiting / Third-party Software',
  },
];

// ── Question Bank ──────────────────────────────────────────────────────────────

export const QUESTION_BANK = {
  // ── Pool A: In-Game Punishments (15 questions) ──
  punishments: [
    {
      id: 'p1', type: 'mc',
      text: 'A player is randomly killing others in the server. What is the correct first punishment?',
      options: ['Kick', 'Ban', 'Warning', 'Verbal warning only'],
      correct: 2,
      explanation: 'RDM (Random Death Match) starts as a Warning for the first offence per the Punishment Guide.',
      section: 'punishments',
    },
    {
      id: 'p2', type: 'mc',
      text: 'A player leaves immediately after breaking rules to avoid being punished. What does this warrant?',
      options: ['Warning', 'Kick', 'Strike', 'Ban'],
      correct: 3,
      explanation: 'LTAP (Leave To Avoid Punishment) is a bannable offence — first offence results in a Ban.',
      section: 'punishments',
    },
    {
      id: 'p3', type: 'mc',
      text: 'Which of the following is a Kick-level offence on the first offence?',
      options: ['Random Deathmatch', 'Cuff Rushing', 'GTA Driving', 'Meta Gaming'],
      correct: 1,
      explanation: 'Cuff Rushing is a Kick on first offence. RDM, GTA Driving, and Meta Gaming are Warnings.',
      section: 'punishments',
    },
    {
      id: 'p4', type: 'mc',
      text: 'A player is using third-party software to exploit the game. What is the correct punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal warning only'],
      correct: 2,
      explanation: 'Exploiting or using third-party software is a bannable offence (not appealable).',
      section: 'punishments',
    },
    {
      id: 'p5', type: 'mc',
      text: 'What is the second offence punishment for Random Death Match?',
      options: ['Warning', 'Kick', 'Ban', 'Strike'],
      correct: 1,
      explanation: 'RDM escalation: 1st = Warning, 2nd = Kick, 3rd = Ban.',
      section: 'punishments',
    },
    {
      id: 'p6', type: 'mc',
      text: 'A player is mass RDMing or VDMing — obvious trolling. What is the punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal warning'],
      correct: 2,
      explanation: 'Mass VDM/RDM (obvious trolling) is a Ban on first offence.',
      section: 'punishments',
    },
    {
      id: 'p7', type: 'tf',
      text: 'NSFW or inappropriate content is appealable after a ban.',
      correct: false,
      explanation: 'NSFW bans are explicitly listed as "Not appealable" in the Punishment Guide.',
      section: 'punishments',
    },
    {
      id: 'p8', type: 'mc',
      text: 'A player is disrespecting a staff member in-game. What is the first punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal warning'],
      correct: 0,
      explanation: 'Staff Disrespect starts as a Warning on first offence, then Kick, then Ban.',
      section: 'punishments',
    },
    {
      id: 'p9', type: 'mc',
      text: 'What is the first offence punishment for abusing the !mod system?',
      options: ['Warning', 'Kick', 'Verbal Warning', 'Ban'],
      correct: 2,
      explanation: 'Abusing the !mod system: 1st = Verbal Warning, 2nd = Warning, 3rd = Kick > Ban.',
      section: 'punishments',
    },
    {
      id: 'p10', type: 'mc',
      text: 'A player is interfering with an active staff moderation scene. What is the punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal warning'],
      correct: 1,
      explanation: 'Staff Scene Interference is a Kick-level offence.',
      section: 'punishments',
    },
    {
      id: 'p11', type: 'tf',
      text: 'A player using an offensive or troll username should be banned.',
      correct: true,
      explanation: 'Inappropriate or offensive usernames are listed as a Ban-level offence.',
      section: 'punishments',
    },
    {
      id: 'p12', type: 'mc',
      text: 'A player is RDMing inside a safezone. What is the first punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal warning'],
      correct: 1,
      explanation: 'Safezone RDM/VDM is a Kick on first offence, then Ban on second.',
      section: 'punishments',
    },
    {
      id: 'p13', type: 'mc',
      text: 'What is the punishment for a player who resets their character to avoid punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Strike'],
      correct: 2,
      explanation: 'Reset to Avoid Punishment (RTAP/ST-TAP) is a Ban on first offence.',
      section: 'punishments',
    },
    {
      id: 'p14', type: 'mc',
      text: 'A player is failing to roleplay properly. What is the first punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal warning'],
      correct: 0,
      explanation: 'FRP (Failing to Roleplay) starts as a Warning, then Kick, then Ban.',
      section: 'punishments',
    },
    {
      id: 'p15', type: 'mc',
      text: 'A player is impersonating a staff member. What is the punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Strike'],
      correct: 2,
      explanation: 'Staff Impersonation is a Ban on first offence.',
      section: 'punishments',
    },
  ],

  // ── Pool B: Staff Rules (18 questions) ──
  rules: [
    {
      id: 'r1', type: 'mc',
      text: 'What is the minimum player count required before you may begin moderating?',
      options: ['10 players', '15 players', '20 players', '25 players'],
      correct: 2,
      explanation: 'Moderation should only occur when there are at least 20 players in the server.',
      section: 'rules',
    },
    {
      id: 'r2', type: 'mc',
      text: 'When using a command on a player, what is the minimum number of characters you must use?',
      options: ['2 or more', '3 or more', '4 or more', '5 or more'],
      correct: 2,
      explanation: 'Always ensure you are using 4+ characters (letters or numbers) when using a command on another player.',
      section: 'rules',
    },
    {
      id: 'r3', type: 'mc',
      text: 'Which firearm may a staff member below SHR carry?',
      options: ['Automated rifle', 'Shotgun', 'Handgun', 'Any weapon they choose'],
      correct: 2,
      explanation: 'Anyone below SHR MUST use a handgun. Only SHR may use automated rifles.',
      section: 'rules',
    },
    {
      id: 'r4', type: 'mc',
      text: 'A staff member wants to teleport to the Director. What must they do first?',
      options: [
        'Teleport directly — rank difference is fine',
        'Request permission via private message (:pm) first',
        'Ask in public chat',
        'Wait until the Director contacts them',
      ],
      correct: 1,
      explanation: 'Do not teleport to high-ranking members without first requesting permission through private messages (:pm).',
      section: 'rules',
    },
    {
      id: 'r5', type: 'mc',
      text: 'What is a 50/50 shift?',
      options: [
        'A shift where you work exactly half the time',
        'An undercover shift where admins moderate while roleplaying, without being required to use staff liveries',
        'A shift split between two staff members',
        'A shift only available to Senior Moderators and above',
      ],
      correct: 1,
      explanation: '50/50 Shift is for administrators to be on shift and moderating WHILE ALSO roleplaying — not forced to use staff liveries and uniforms.',
      section: 'rules',
    },
    {
      id: 'r6', type: 'mc',
      text: 'You are dealing with a player report but there is no evidence available. What should you do?',
      options: [
        'Ban the player to be safe',
        'Ignore the report entirely',
        'De-escalate and issue a verbal warning',
        'Kick the player and log it',
      ],
      correct: 2,
      explanation: 'If no evidence is available, de-escalate the situation and issue a verbal warning instead of taking action based on assumption.',
      section: 'rules',
    },
    {
      id: 'r7', type: 'tf',
      text: 'Staff members on a regular (non-50/50) shift are required to use official staff liveries and uniforms.',
      correct: true,
      explanation: 'For regular shifts, staff members are required to use proper staff liveries and uniforms.',
      section: 'rules',
    },
    {
      id: 'r8', type: 'tf',
      text: 'On-duty staff members are permitted to use undercover plates on their vehicles.',
      correct: false,
      explanation: 'Any on-duty staff are prohibited from using undercover plates, as it does not show up when we check on players list or MDT.',
      section: 'rules',
    },
    {
      id: 'r9', type: 'tf',
      text: 'A Supervisor is allowed to issue custom :h (hint) commands.',
      correct: true,
      explanation: 'The supervisor team can ONLY do custom :h commands — an exception to the general rule.',
      section: 'rules',
    },
    {
      id: 'r10', type: 'mc',
      text: 'What should you do before taking a mod call while driving on the highway?',
      options: [
        'Keep driving and take the call',
        'Stop safely on the side of the road first',
        'Pull a U-turn immediately',
        'Park in the middle of the road',
      ],
      correct: 1,
      explanation: 'You must park your car on the side of the road when responding to a mod call or any circumstances.',
      section: 'rules',
    },
    {
      id: 'r11', type: 'mc',
      text: 'Who has the final say on all matters not explicitly stated in the handbook?',
      options: ['Moderators', 'Supervisors', 'High Ranks', 'Directors only'],
      correct: 2,
      explanation: 'Always use common sense. High Ranks have final say on all matters.',
      section: 'rules',
    },
    {
      id: 'r12', type: 'mc',
      text: 'What is the required SPaG standard for staff on duty?',
      options: [
        'Casual messaging is fine',
        'Proper spelling, punctuation, and grammar in all public channels',
        'Only grammar matters, spelling is optional',
        'SPaG is not enforced for staff',
      ],
      correct: 1,
      explanation: 'Staff must use proper spelling, punctuation, and grammar in all public channels and in-game communication.',
      section: 'rules',
    },
    {
      id: 'r13', type: 'tf',
      text: 'Staff members may use commands to gain an advantage over other players while off-duty.',
      correct: false,
      explanation: 'GSRP staff may not use commands to gain an advantage over other players off-duty. Staff are NOT ALLOWED to use any commands while off duty.',
      section: 'rules',
    },
    {
      id: 'r14', type: 'mc',
      text: 'How long does a staff member have to appeal an infraction before it becomes permanent?',
      options: ['3 days', '7 days', '14 days', '30 days'],
      correct: 1,
      explanation: 'ANY infractions put in must be appealed before 7 days or it will become PERMANENT.',
      section: 'rules',
    },
    {
      id: 'r15', type: 'mc',
      text: 'What happens if a staff request is made while you are on a 50/50 shift?',
      options: [
        'Ignore it — you are undercover',
        'Get onto uniform shift immediately and stay until the session calms down',
        'Finish your RP scene first, then respond',
        'Call another staff member to handle it',
      ],
      correct: 1,
      explanation: 'If a Staff Request is made and you are on 50/50, you must get onto uniform shift immediately. If in RP, say "End RP" with proper reasoning.',
      section: 'rules',
    },
    {
      id: 'r16', type: 'tf',
      text: 'Witnesses can be used as evidence when moderating a player.',
      correct: false,
      explanation: 'Witnesses are not taken as they could be biased towards the player being moderated.',
      section: 'rules',
    },
    {
      id: 'r17', type: 'mc',
      text: 'When kicking someone, what should you do regarding the kick timer?',
      options: [
        'No need to inform them',
        'Teleport them to you or PM them about the 30-minute kick timer',
        'Announce it in public chat',
        'Wait for them to notice',
      ],
      correct: 1,
      explanation: 'When kicking someone you should teleport them to you or PM them to inform them of the kick timer of 30 minutes.',
      section: 'rules',
    },
    {
      id: 'r18', type: 'mc',
      text: 'What is the maximum duration an LOA (Leave of Absence) may last?',
      options: ['1 week', '2 weeks', '3 weeks', '1 month'],
      correct: 1,
      explanation: 'LOAs may not last longer than 2 weeks. If you need longer, you are encouraged to temporarily resign.',
      section: 'rules',
    },
  ],

  // ── Pool C: Staff Disciplinary System (10 questions) ──
  discipline: [
    {
      id: 'd1', type: 'mc',
      text: 'What is the first step in the staff infraction escalation system?',
      options: ['Strike', 'Warning', 'Suspension', 'Termination'],
      correct: 1,
      explanation: 'The escalation chain: 3 warnings → Strike → 3 strikes → Suspension & Demotion → 3 suspensions → Termination → 3 terminations → Full Blacklist.',
      section: 'discipline',
    },
    {
      id: 'd2', type: 'mc',
      text: 'How many warnings result in a staff strike?',
      options: ['1 warning', '2 warnings', '3 warnings', '5 warnings'],
      correct: 2,
      explanation: '3 warnings result in a Strike.',
      section: 'discipline',
    },
    {
      id: 'd3', type: 'mc',
      text: 'What results in a staff suspension?',
      options: ['1 warning', '2 strikes', '3 strikes', '1 strike'],
      correct: 2,
      explanation: '3 strikes result in Suspension & Demotion.',
      section: 'discipline',
    },
    {
      id: 'd4', type: 'tf',
      text: 'A staff suspension is appealable within 7 days.',
      correct: false,
      explanation: 'Suspensions, terminations, and blacklists are not appealable. Only warnings and strikes can be appealed.',
      section: 'discipline',
    },
    {
      id: 'd5', type: 'mc',
      text: 'Which of these is grounds for a Staff Warning?',
      options: [
        'Sharing the staff handbook with outsiders',
        'Issuing an incorrect punishment to a player',
        'Abusing every moderation command on the server',
        'Raiding the server with alternate accounts',
      ],
      correct: 1,
      explanation: 'Staff Warnings are for: disrespect to members/staff, incorrect punishments, failing to respond to mod calls, breaking RP, improper driving, 3-2-1 letter commands as JM.',
      section: 'discipline',
    },
    {
      id: 'd6', type: 'mc',
      text: 'Which of these is grounds for a Staff Strike?',
      options: [
        'Being slightly late to a shift',
        'Failing the weekly 3-hour activity quota',
        'Leaking internal staff documentation',
        'Using AI to write a staff application',
      ],
      correct: 1,
      explanation: 'Staff Strikes are for: disrespect toward High Ranks, unauthorised :h/:m commands, abusing moderation tools, failing weekly activity quota, farming shift hours.',
      section: 'discipline',
    },
    {
      id: 'd7', type: 'mc',
      text: 'How many suspensions result in termination?',
      options: ['1 suspension', '2 suspensions', '3 suspensions', '5 suspensions'],
      correct: 2,
      explanation: '3 suspensions result in Termination.',
      section: 'discipline',
    },
    {
      id: 'd8', type: 'tf',
      text: 'Leaking the staff handbook document results in termination.',
      correct: true,
      explanation: 'Leaking this document is listed under Staff Terminations.',
      section: 'discipline',
    },
    {
      id: 'd9', type: 'mc',
      text: 'What action is taken for a staff member who fails the weekly 3-hour activity quota?',
      options: ['Warning', 'Strike', 'Suspension', 'Termination'],
      correct: 1,
      explanation: 'Failing the weekly 3-hour activity quota results in a Staff Strike.',
      section: 'discipline',
    },
    {
      id: 'd10', type: 'tf',
      text: 'A staff warning can be appealed within 7 days of issue.',
      correct: true,
      explanation: 'Warnings and strikes can be appealed within 7 days. Suspensions, terminations, and blacklists are not appealable.',
      section: 'discipline',
    },
  ],

  // ── Pool D: Custom Commands (12 questions) ──
  commands: [
    {
      id: 'c1', type: 'mc',
      text: 'What is the trigger command for Random Death Match?',
      options: [';rdm', ';random', ';deathmatch'],
      correct: 0,
      explanation: 'The trigger for Random Death Match is ;rdm',
      section: 'commands',
    },
    {
      id: 'c2', type: 'mc',
      text: 'Which command is used for Staff Disrespect?',
      options: [';staff', ';sd', ';disrespect', ';sd or ;staff_disrespect'],
      correct: 3,
      explanation: 'Staff Disrespect can be triggered with ;sd or ;staff_disrespect',
      section: 'commands',
    },
    {
      id: 'c3', type: 'mc',
      text: 'What is the punishment for the first offence of Tool Abuse?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal Warning'],
      correct: 1,
      explanation: 'Tool Abuse (;ta or ;tool) is a Kick on first offence, then Ban.',
      section: 'commands',
    },
    {
      id: 'c4', type: 'mc',
      text: 'Which command would you use for a player who is leaving to avoid punishment?',
      options: [';ltap or ;leave_avoid', ';leave', ';avoid', ';escape'],
      correct: 0,
      explanation: 'Leaving to Avoid Punishment uses ;leave_avoid or ;ltap',
      section: 'commands',
    },
    {
      id: 'c5', type: 'tf',
      text: 'The command ;hacking or ;cheating results in a ban on first offence.',
      correct: true,
      explanation: 'Cheating/Exploiting (;hacking or ;cheating) is a Ban on first offence.',
      section: 'commands',
    },
    {
      id: 'c6', type: 'mc',
      text: 'What is the trigger for No Intent to Roleplay?',
      options: [';nitrp', ';nointent', ';no-intent', ';nitrp, ;nointent, or ;no-intent'],
      correct: 3,
      explanation: 'No Intent to Roleplay can be triggered with ;nitrp, ;nointent, or ;no-intent',
      section: 'commands',
    },
    {
      id: 'c7', type: 'mc',
      text: 'Which command is used for Mass VDM/RDM?',
      options: [';mass', ';mass_vdm', ';massrdm', ';massive'],
      correct: 1,
      explanation: 'Mass VDM/RDM uses ;mass_vdm and results in a Ban.',
      section: 'commands',
    },
    {
      id: 'c8', type: 'mc',
      text: 'What is the punishment for the first offence of Cuff Rushing?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal Warning'],
      correct: 1,
      explanation: 'Cuff Rushing (;cuff or ;cuff_rushing) is a Kick on first offence, then Ban.',
      section: 'commands',
    },
    {
      id: 'c9', type: 'tf',
      text: 'The command ;nsfw results in a ban that is not appealable.',
      correct: true,
      explanation: 'NSFW (;nsfw) is a Ban and is explicitly listed as not appealable.',
      section: 'commands',
    },
    {
      id: 'c10', type: 'mc',
      text: 'Which command would you use for a player with an unrealistic avatar?',
      options: [';avatar or ;unrealistic', ';badavatar', ';fake', ';wrongavatar'],
      correct: 0,
      explanation: 'Unrealistic Avatar uses ;unrealistic or ;avatar — Kick on first offence, then Ban.',
      section: 'commands',
    },
    {
      id: 'c11', type: 'mc',
      text: 'What is the trigger for Staff Evasion?',
      options: [';evasion', ';staff_evasion or ;evasion', ';evade', ';run'],
      correct: 1,
      explanation: 'Staff Evasion uses ;staff_evasion or ;evasion — Kick on first offence, then Ban.',
      section: 'commands',
    },
    {
      id: 'c12', type: 'mc',
      text: 'Which command is used for bypassing the filter?',
      options: [';filter', ';bypass', ';bypassing', ';skip'],
      correct: 2,
      explanation: 'Bypassing uses ;bypassing and results in a Ban.',
      section: 'commands',
    },
  ],

  // ── Pool E: Vehicles & Patrol (8 questions) ──
  vehicles: [
    {
      id: 'v1', type: 'mc',
      text: 'Which of the following vehicles is completely banned for all staff?',
      options: ['Falcon Heritage 2021', 'Pea Car 2025', 'Fuel Tanker', 'Forklift'],
      correct: 1,
      explanation: 'Pea Car 2025 is banned for everyone. Falcon Heritage is Booster only, Fuel Tanker is staff-allowed, Forklift is Directorship+.',
      section: 'vehicles',
    },
    {
      id: 'v2', type: 'mc',
      text: 'Who is allowed to use the Forklift?',
      options: ['All staff', 'Directorship and above', 'Booster only', 'Foundership only'],
      correct: 1,
      explanation: 'Forklift is available to Directorship+ only.',
      section: 'vehicles',
    },
    {
      id: 'v3', type: 'tf',
      text: 'Staff are allowed to do checkpoints while on patrol.',
      correct: false,
      explanation: 'Staff are not allowed to do checkpoints.',
      section: 'vehicles',
    },
    {
      id: 'v4', type: 'mc',
      text: 'Which vehicle is restricted to Booster only?',
      options: ['Pea Car 2025', 'Kovac Heladera 2023', 'Strugatti Ettore 2020', 'Lawn Mower'],
      correct: 2,
      explanation: 'Strugatti Ettore 2020 is Booster only. Pea Car, Kovac Heladera, and Lawn Mower are fully banned.',
      section: 'vehicles',
    },
    {
      id: 'v5', type: 'mc',
      text: 'What is required before a staff member can stop a vehicle on patrol?',
      options: [
        'Nothing — they can stop anyone anytime',
        'Probable cause',
        'Supervisor permission',
        'At least 50 players online',
      ],
      correct: 1,
      explanation: 'Any GSRP staff member patrolling while on duty is authorized to stop any subject/vehicle for any reason as long as they have probable cause.',
      section: 'vehicles',
    },
    {
      id: 'v6', type: 'mc',
      text: 'Which gun is banned for all staff members?',
      options: ['Handgun', 'Remington MSR', 'Shotgun', 'SMG'],
      correct: 1,
      explanation: 'Remington MSR, Remington 700, and Benelli M4 are all banned. M249 is Booster/VIP only.',
      section: 'vehicles',
    },
    {
      id: 'v7', type: 'tf',
      text: 'The M249 is available to Booster/VIP members only.',
      correct: true,
      explanation: 'M249 is listed as Booster/VIP Only.',
      section: 'vehicles',
    },
    {
      id: 'v8', type: 'mc',
      text: 'Who may use the Prisoner Transport Bus?',
      options: ['All staff', 'Directorship+ permission required', 'Booster only', 'Foundership only'],
      correct: 1,
      explanation: 'Prisoner Transport Bus requires Directorship+ permission.',
      section: 'vehicles',
    },
  ],

  // ── Pool F: Roleplay Logging (3 questions) ──────────────────────────────────
  rpLog: [],

  // ── Pool G: Punishment Logging (4 questions) ────────────────────────────────
  punishmentLog: [],
};

// ── Generate dynamic RP-log questions ─────────────────────────────────────────

function generateRPQuestions() {
  const questions = [];
  const usedIds = new Set();

  RP_LOG_TEMPLATES.forEach((tmpl) => {
    if (usedIds.has(tmpl.id)) return;
    usedIds.add(tmpl.id);

    const rpType = pick(RP_TYPES);
    const scenario = Math.random() > 0.5 ? 'no-ongoing' : 'ongoing';
    const mockUser = pick(MOCK_USERS);
    const logs = generateMockLogs(rpType, scenario === 'ongoing');
    const logDialog = buildLogDialog(logs, rpType);

    let options;
    if (scenario === 'no-ongoing') {
      const correctIndex = Math.random() > 0.5 ? 0 : 1;
      const opt1 = correctIndex === 0
        ? `Log the ${rpType.label.toLowerCase()} roleplay for ${mockUser} — there are no ongoing ${rpType.plural} roleplays.`
        : `Inform ${mockUser} that there is already a ${rpType.label.toLowerCase()} RP ongoing and they must wait.`;
      const opt2 = correctIndex === 1
        ? `Log the ${rpType.label.toLowerCase()} roleplay for ${mockUser} — there are no ongoing ${rpType.plural} roleplays.`
        : `Inform ${mockUser} that there is already a ${rpType.label.toLowerCase()} RP ongoing and they must wait.`;
      options = shuffleArray([opt1, opt2]);
    } else {
      const correctIndex = Math.random() > 0.5 ? 0 : 1;
      const opt1 = correctIndex === 0
        ? `Log the ${rpType.label.toLowerCase()} roleplay for ${mockUser} — there are no conflicting roleplays.`
        : `Inform ${mockUser} that there is already a ${rpType.label.toLowerCase()} RP ongoing and they must wait.`;
      const opt2 = correctIndex === 1
        ? `Log the ${rpType.label.toLowerCase()} roleplay for ${mockUser} — there are no conflicting roleplays.`
        : `Inform ${mockUser} that there is already a ${rpType.label.toLowerCase()} RP ongoing and they must wait.`;
      options = shuffleArray([opt1, opt2]);
    }

    const correctAnswer = scenario === 'no-ongoing'
      ? `Log the ${rpType.label.toLowerCase()} roleplay for ${mockUser}`
      : `Inform ${mockUser} that there is already a ${rpType.label.toLowerCase()} RP ongoing`;

    questions.push({
      id: tmpl.id,
      type: 'rp-log',
      text: tmpl.text.replace('{rpType}', rpType.label.toLowerCase()),
      section: 'rp-log',
      rpType: rpType,
      scenario,
      mockUser,
      requestText: `${mockUser} asks: "Can I do ${rpType.label.toLowerCase()} rp?"`,
      userDetails: {
        duration: Math.floor(Math.random() * 40 + 15) + ' minutes',
        location: pick(LOCATIONS),
        otherPlayers: Math.random() > 0.5 ? pick(MOCK_USERS) : 'None',
      },
      logDialog,
      options,
      correctAnswer,
      explanation: scenario === 'no-ongoing'
        ? `Before logging any ${rpType.label.toLowerCase()} RP, you must always check the roleplay log channel to confirm there are no ongoing roleplays of the same type. Since there are none, you should proceed to log it.`
        : `Before logging any ${rpType.label.toLowerCase()} RP, you must check if there are any ongoing roleplays. There IS an active ${rpType.label.toLowerCase()} RP, so you must inform the player to wait. NEVER log without checking first — this causes scene conflicts.`,
    });
  });

  return questions;
}

function generatePLogQuestions() {
  const questions = [];
  const usedIds = new Set();

  P_LOG_TEMPLATES.forEach((tmpl) => {
    if (usedIds.has(tmpl.id)) return;
    usedIds.add(tmpl.id);

    const offender = pick(MOCK_USERS);
    const punishmentOptions = shuffleArray(['Warn', 'Kick', 'Ban']);
    const correctPunishmentIndex = punishmentOptions.indexOf(tmpl.correctPunishment);
    const mockAutocomplete = pickN(MOCK_USERS, 8);
    if (!mockAutocomplete.includes(offender)) mockAutocomplete[0] = offender;
    mockAutocomplete.sort((a, b) => {
      if (a === offender) return -1;
      if (b === offender) return 1;
      return a.localeCompare(b);
    });

    questions.push({
      id: tmpl.id,
      type: 'p-log',
      text: tmpl.text.replace('{offender}', offender),
      section: 'punishment-log',
      offense: tmpl.offense,
      offender,
      correctPunishment: tmpl.correctPunishment,
      correctReason: tmpl.correctReason,
      explanation: `All punishments must be logged in melonly with the correct punishment type and a clear reason. ${tmpl.correctPunishment === 'Warn' ? 'A Warning is the correct first step for this offence per the Punishment Guide.' : tmpl.correctPunishment === 'Kick' ? 'A Kick is required for this offence on first offence.' : 'This offence warrants an immediate Ban on first offence.'}`,
      punishmentOptions,
      correctPunishmentIndex,
      mockAutocomplete,
      mockReasons: shuffleArray([
        tmpl.correctReason,
        `${tmpl.offense} - Second Offence`,
        `${tmpl.offense} - Not serious`,
        `${tmpl.offense} - Player seemed confused`,
        'No reason provided',
      ]),
      correctReasonIndex: 0,
    });
  });

  return questions;
}

// Populate dynamic pools
QUESTION_BANK.rpLog = generateRPQuestions();
QUESTION_BANK.punishmentLog = generatePLogQuestions();

// ── Quiz Configuration ─────────────────────────────────────────────────────────

export const QUIZ_CONFIG = {
  TOTAL_QUESTIONS: 10,

  POOL_DISTRIBUTION: {
    punishments: 2,
    rules: 2,
    discipline: 2,
    commands: 1,
    vehicles: 1,
    rpLog: 1,
    punishmentLog: 1,
  },

  PASS_SCORE: 7,

  COOLDOWN_HOURS: 6,

  RETRY_ROTATION_PERCENT: 0.4,

  SESSION_EXPIRY_HOURS: 2,
};

// ── Utilities ──────────────────────────────────────────────────────────────────

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Regenerate dynamic pools (call before each quiz generation)
export function refreshDynamicPools() {
  QUESTION_BANK.rpLog = generateRPQuestions();
  QUESTION_BANK.punishmentLog = generatePLogQuestions();
}

// Generate a quiz set — draws from each pool according to distribution
export function generateQuizSet(excludeIds = new Set()) {
  refreshDynamicPools();
  const { POOL_DISTRIBUTION, TOTAL_QUESTIONS } = QUIZ_CONFIG;
  const questions = [];
  const usedIds = new Set(excludeIds);

  for (const [pool, count] of Object.entries(POOL_DISTRIBUTION)) {
    const poolQuestions = QUESTION_BANK[pool] || [];
    const available = poolQuestions.filter(q => !usedIds.has(q.id));
    const shuffled = shuffleArray(available);
    const selected = shuffled.slice(0, count);
    selected.forEach(q => {
      questions.push(q);
      usedIds.add(q.id);
    });
  }

  const remaining = TOTAL_QUESTIONS - questions.length;
  if (remaining > 0) {
    const allAvailable = Object.values(QUESTION_BANK)
      .flat()
      .filter(q => !usedIds.has(q.id));
    const extra = shuffleArray(allAvailable).slice(0, remaining);
    extra.forEach(q => {
      questions.push(q);
      usedIds.add(q.id);
    });
  }

  return shuffleArray(questions);
}

// Generate a retry quiz set — keeps some questions, swaps others
export function generateRetryQuizSet(previousQuestionIds) {
  const { RETRY_ROTATION_PERCENT } = QUIZ_CONFIG;
  const prevIds = new Set(previousQuestionIds);
  const keepCount = Math.floor(previousQuestionIds.length * (1 - RETRY_ROTATION_PERCENT));
  const swapCount = previousQuestionIds.length - keepCount;

  const keptIds = shuffleArray([...prevIds]).slice(0, keepCount);
  const keptSet = new Set(keptIds);

  const newQuestions = generateQuizSet(keptSet);

  const keptQuestions = Object.values(QUESTION_BANK)
    .flat()
    .filter(q => keptSet.has(q.id));

  return shuffleArray([...newQuestions, ...keptQuestions]);
}

export function getQuestionIds(questions) {
  return questions.map(q => q.id);
}
