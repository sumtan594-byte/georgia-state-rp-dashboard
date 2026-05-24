// Quiz question bank — 50+ questions across all handbook sections.
// Questions are grouped into pools; each quiz attempt draws a random subset.
// On retry, at least 40% of questions are swapped for fresh ones.

export const QUESTION_BANK = {
  // ── Pool A: In-Game Punishments (15 questions) ──
  punishments: [
    {
      id: 'p1',
      type: 'mc',
      text: 'A player is randomly killing others in the server. What is the correct first punishment?',
      options: ['Kick', 'Ban', 'Warning', 'Verbal warning only'],
      correct: 2,
      explanation: 'RDM (Random Death Match) starts as a Warning for the first offence per the Punishment Guide.',
      section: 'punishments',
    },
    {
      id: 'p2',
      type: 'mc',
      text: 'A player leaves immediately after breaking rules to avoid being punished. What does this warrant?',
      options: ['Warning', 'Kick', 'Strike', 'Ban'],
      correct: 3,
      explanation: 'LTAP (Leave To Avoid Punishment) is a bannable offence — first offence results in a Ban.',
      section: 'punishments',
    },
    {
      id: 'p3',
      type: 'mc',
      text: 'Which of the following is a Kick-level offence on the first offence?',
      options: ['Random Deathmatch', 'Cuff Rushing', 'GTA Driving', 'Meta Gaming'],
      correct: 1,
      explanation: 'Cuff Rushing is a Kick on first offence. RDM, GTA Driving, and Meta Gaming are Warnings.',
      section: 'punishments',
    },
    {
      id: 'p4',
      type: 'mc',
      text: 'A player is using third-party software to exploit the game. What is the correct punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal warning only'],
      correct: 2,
      explanation: 'Exploiting or using third-party software is a bannable offence (not appealable).',
      section: 'punishments',
    },
    {
      id: 'p5',
      type: 'mc',
      text: 'What is the second offence punishment for Random Death Match?',
      options: ['Warning', 'Kick', 'Ban', 'Strike'],
      correct: 1,
      explanation: 'RDM escalation: 1st = Warning, 2nd = Kick, 3rd = Ban.',
      section: 'punishments',
    },
    {
      id: 'p6',
      type: 'mc',
      text: 'A player is mass RDMing or VDMing — obvious trolling. What is the punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal warning'],
      correct: 2,
      explanation: 'Mass VDM/RDM (obvious trolling) is a Ban on first offence.',
      section: 'punishments',
    },
    {
      id: 'p7',
      type: 'tf',
      text: 'NSFW or inappropriate content is appealable after a ban.',
      correct: false,
      explanation: 'NSFW bans are explicitly listed as "Not appealable" in the Punishment Guide.',
      section: 'punishments',
    },
    {
      id: 'p8',
      type: 'mc',
      text: 'A player is disrespecting a staff member in-game. What is the first punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal warning'],
      correct: 0,
      explanation: 'Staff Disrespect starts as a Warning on first offence, then Kick, then Ban.',
      section: 'punishments',
    },
    {
      id: 'p9',
      type: 'mc',
      text: 'What is the first offence punishment for abusing the !mod system?',
      options: ['Warning', 'Kick', 'Verbal Warning', 'Ban'],
      correct: 2,
      explanation: 'Abusing the !mod system: 1st = Verbal Warning, 2nd = Warning, 3rd = Kick > Ban.',
      section: 'punishments',
    },
    {
      id: 'p10',
      type: 'mc',
      text: 'A player is interfering with an active staff moderation scene. What is the punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal warning'],
      correct: 1,
      explanation: 'Staff Scene Interference is a Kick-level offence.',
      section: 'punishments',
    },
    {
      id: 'p11',
      type: 'tf',
      text: 'A player using an offensive or troll username should be banned.',
      correct: true,
      explanation: 'Inappropriate or offensive usernames are listed as a Ban-level offence.',
      section: 'punishments',
    },
    {
      id: 'p12',
      type: 'mc',
      text: 'A player is RDMing inside a safezone. What is the first punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal warning'],
      correct: 1,
      explanation: 'Safezone RDM/VDM is a Kick on first offence, then Ban on second.',
      section: 'punishments',
    },
    {
      id: 'p13',
      type: 'mc',
      text: 'What is the punishment for a player who resets their character to avoid punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Strike'],
      correct: 2,
      explanation: 'Reset to Avoid Punishment (RTAP/ST-TAP) is a Ban on first offence.',
      section: 'punishments',
    },
    {
      id: 'p14',
      type: 'mc',
      text: 'A player is failing to roleplay properly. What is the first punishment?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal warning'],
      correct: 0,
      explanation: 'FRP (Failing to Roleplay) starts as a Warning, then Kick, then Ban.',
      section: 'punishments',
    },
    {
      id: 'p15',
      type: 'mc',
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
      id: 'r1',
      type: 'mc',
      text: 'What is the minimum player count required before you may begin moderating?',
      options: ['10 players', '15 players', '20 players', '25 players'],
      correct: 2,
      explanation: 'Moderation should only occur when there are at least 20 players in the server.',
      section: 'rules',
    },
    {
      id: 'r2',
      type: 'mc',
      text: 'When using a command on a player, what is the minimum number of characters you must use?',
      options: ['2 or more', '3 or more', '4 or more', '5 or more'],
      correct: 2,
      explanation: 'Always ensure you are using 4+ characters (letters or numbers) when using a command on another player.',
      section: 'rules',
    },
    {
      id: 'r3',
      type: 'mc',
      text: 'Which firearm may a staff member below SHR carry?',
      options: ['Automated rifle', 'Shotgun', 'Handgun', 'Any weapon they choose'],
      correct: 2,
      explanation: 'Anyone below SHR MUST use a handgun. Only SHR may use automated rifles.',
      section: 'rules',
    },
    {
      id: 'r4',
      type: 'mc',
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
      id: 'r5',
      type: 'mc',
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
      id: 'r6',
      type: 'mc',
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
      id: 'r7',
      type: 'tf',
      text: 'Staff members on a regular (non-50/50) shift are required to use official staff liveries and uniforms.',
      correct: true,
      explanation: 'For regular shifts, staff members are required to use proper staff liveries and uniforms.',
      section: 'rules',
    },
    {
      id: 'r8',
      type: 'tf',
      text: 'On-duty staff members are permitted to use undercover plates on their vehicles.',
      correct: false,
      explanation: 'Any on-duty staff are prohibited from using undercover plates, as it does not show up when we check on players list or MDT.',
      section: 'rules',
    },
    {
      id: 'r9',
      type: 'tf',
      text: 'A Supervisor is allowed to issue custom :h (hint) commands.',
      correct: true,
      explanation: 'The supervisor team can ONLY do custom :h commands — an exception to the general rule.',
      section: 'rules',
    },
    {
      id: 'r10',
      type: 'mc',
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
      id: 'r11',
      type: 'mc',
      text: 'Who has the final say on all matters not explicitly stated in the handbook?',
      options: ['Moderators', 'Supervisors', 'High Ranks', 'Directors only'],
      correct: 2,
      explanation: 'Always use common sense. High Ranks have final say on all matters.',
      section: 'rules',
    },
    {
      id: 'r12',
      type: 'mc',
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
      id: 'r13',
      type: 'tf',
      text: 'Staff members may use commands to gain an advantage over other players while off-duty.',
      correct: false,
      explanation: 'GSRP staff may not use commands to gain an advantage over other players off-duty. Staff are NOT ALLOWED to use any commands while off duty.',
      section: 'rules',
    },
    {
      id: 'r14',
      type: 'mc',
      text: 'How long does a staff member have to appeal an infraction before it becomes permanent?',
      options: ['3 days', '7 days', '14 days', '30 days'],
      correct: 1,
      explanation: 'ANY infractions put in must be appealed before 7 days or it will become PERMANENT.',
      section: 'rules',
    },
    {
      id: 'r15',
      type: 'mc',
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
      id: 'r16',
      type: 'tf',
      text: 'Witnesses can be used as evidence when moderating a player.',
      correct: false,
      explanation: 'Witnesses are not taken as they could be biased towards the player being moderated.',
      section: 'rules',
    },
    {
      id: 'r17',
      type: 'mc',
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
      id: 'r18',
      type: 'mc',
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
      id: 'd1',
      type: 'mc',
      text: 'What is the first step in the staff infraction escalation system?',
      options: ['Strike', 'Warning', 'Suspension', 'Termination'],
      correct: 1,
      explanation: 'The escalation chain: 3 warnings → Strike → 3 strikes → Suspension & Demotion → 3 suspensions → Termination → 3 terminations → Full Blacklist.',
      section: 'discipline',
    },
    {
      id: 'd2',
      type: 'mc',
      text: 'How many warnings result in a staff strike?',
      options: ['1 warning', '2 warnings', '3 warnings', '5 warnings'],
      correct: 2,
      explanation: '3 warnings result in a Strike.',
      section: 'discipline',
    },
    {
      id: 'd3',
      type: 'mc',
      text: 'What results in a staff suspension?',
      options: [
        '1 warning',
        '2 strikes',
        '3 strikes',
        '1 strike',
      ],
      correct: 2,
      explanation: '3 strikes result in Suspension & Demotion.',
      section: 'discipline',
    },
    {
      id: 'd4',
      type: 'tf',
      text: 'A staff suspension is appealable within 7 days.',
      correct: false,
      explanation: 'Suspensions, terminations, and blacklists are not appealable. Only warnings and strikes can be appealed.',
      section: 'discipline',
    },
    {
      id: 'd5',
      type: 'mc',
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
      id: 'd6',
      type: 'mc',
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
      id: 'd7',
      type: 'mc',
      text: 'How many suspensions result in termination?',
      options: ['1 suspension', '2 suspensions', '3 suspensions', '5 suspensions'],
      correct: 2,
      explanation: '3 suspensions result in Termination.',
      section: 'discipline',
    },
    {
      id: 'd8',
      type: 'tf',
      text: 'Leaking the staff handbook document results in termination.',
      correct: true,
      explanation: 'Leaking this document is listed under Staff Terminations.',
      section: 'discipline',
    },
    {
      id: 'd9',
      type: 'mc',
      text: 'What action is taken for a staff member who fails the weekly 3-hour activity quota?',
      options: ['Warning', 'Strike', 'Suspension', 'Termination'],
      correct: 1,
      explanation: 'Failing the weekly 3-hour activity quota results in a Staff Strike.',
      section: 'discipline',
    },
    {
      id: 'd10',
      type: 'tf',
      text: 'A staff warning can be appealed within 7 days of issue.',
      correct: true,
      explanation: 'Warnings and strikes can be appealed within 7 days. Suspensions, terminations, and blacklists are not appealable.',
      section: 'discipline',
    },
  ],

  // ── Pool D: Custom Commands (12 questions) ──
  commands: [
    {
      id: 'c1',
      type: 'mc',
      text: 'What is the trigger command for Random Death Match?',
      options: [';rdm', ';random', ';deathmatch'],
      correct: 0,
      explanation: 'The trigger for Random Death Match is ;rdm',
      section: 'commands',
    },
    {
      id: 'c2',
      type: 'mc',
      text: 'Which command is used for Staff Disrespect?',
      options: [';staff', ';sd', ';disrespect', ';sd or ;staff_disrespect'],
      correct: 3,
      explanation: 'Staff Disrespect can be triggered with ;sd or ;staff_disrespect',
      section: 'commands',
    },
    {
      id: 'c3',
      type: 'mc',
      text: 'What is the punishment for the first offence of Tool Abuse?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal Warning'],
      correct: 1,
      explanation: 'Tool Abuse (;ta or ;tool) is a Kick on first offence, then Ban.',
      section: 'commands',
    },
    {
      id: 'c4',
      type: 'mc',
      text: 'Which command would you use for a player who is leaving to avoid punishment?',
      options: [';ltap or ;leave_avoid', ';leave', ';avoid', ';escape'],
      correct: 0,
      explanation: 'Leaving to Avoid Punishment uses ;leave_avoid or ;ltap',
      section: 'commands',
    },
    {
      id: 'c5',
      type: 'tf',
      text: 'The command ;hacking or ;cheating results in a ban on first offence.',
      correct: true,
      explanation: 'Cheating/Exploiting (;hacking or ;cheating) is a Ban on first offence.',
      section: 'commands',
    },
    {
      id: 'c6',
      type: 'mc',
      text: 'What is the trigger for No Intent to Roleplay?',
      options: [';nitrp', ';nointent', ';no-intent', ';nitrp, ;nointent, or ;no-intent'],
      correct: 3,
      explanation: 'No Intent to Roleplay can be triggered with ;nitrp, ;nointent, or ;no-intent',
      section: 'commands',
    },
    {
      id: 'c7',
      type: 'mc',
      text: 'Which command is used for Mass VDM/RDM?',
      options: [';mass', ';mass_vdm', ';massrdm', ';massive'],
      correct: 1,
      explanation: 'Mass VDM/RDM uses ;mass_vdm and results in a Ban.',
      section: 'commands',
    },
    {
      id: 'c8',
      type: 'mc',
      text: 'What is the punishment for the first offence of Cuff Rushing?',
      options: ['Warning', 'Kick', 'Ban', 'Verbal Warning'],
      correct: 1,
      explanation: 'Cuff Rushing (;cuff or ;cuff_rushing) is a Kick on first offence, then Ban.',
      section: 'commands',
    },
    {
      id: 'c9',
      type: 'tf',
      text: 'The command ;nsfw results in a ban that is not appealable.',
      correct: true,
      explanation: 'NSFW (;nsfw) is a Ban and is explicitly listed as not appealable.',
      section: 'commands',
    },
    {
      id: 'c10',
      type: 'mc',
      text: 'Which command would you use for a player with an unrealistic avatar?',
      options: [';avatar or ;unrealistic', ';badavatar', ';fake', ';wrongavatar'],
      correct: 0,
      explanation: 'Unrealistic Avatar uses ;unrealistic or ;avatar — Kick on first offence, then Ban.',
      section: 'commands',
    },
    {
      id: 'c11',
      type: 'mc',
      text: 'What is the trigger for Staff Evasion?',
      options: [';evasion', ';staff_evasion or ;evasion', ';evade', ';run'],
      correct: 1,
      explanation: 'Staff Evasion uses ;staff_evasion or ;evasion — Kick on first offence, then Ban.',
      section: 'commands',
    },
    {
      id: 'c12',
      type: 'mc',
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
      id: 'v1',
      type: 'mc',
      text: 'Which of the following vehicles is completely banned for all staff?',
      options: ['Falcon Heritage 2021', 'Pea Car 2025', 'Fuel Tanker', 'Forklift'],
      correct: 1,
      explanation: 'Pea Car 2025 is banned for everyone. Falcon Heritage is Booster only, Fuel Tanker is staff-allowed, Forklift is Directorship+.',
      section: 'vehicles',
    },
    {
      id: 'v2',
      type: 'mc',
      text: 'Who is allowed to use the Forklift?',
      options: ['All staff', 'Directorship and above', 'Booster only', 'Foundership only'],
      correct: 1,
      explanation: 'Forklift is available to Directorship+ only.',
      section: 'vehicles',
    },
    {
      id: 'v3',
      type: 'tf',
      text: 'Staff are allowed to do checkpoints while on patrol.',
      correct: false,
      explanation: 'Staff are not allowed to do checkpoints.',
      section: 'vehicles',
    },
    {
      id: 'v4',
      type: 'mc',
      text: 'Which vehicle is restricted to Booster only?',
      options: ['Pea Car 2025', 'Kovac Heladera 2023', 'Strugatti Ettore 2020', 'Lawn Mower'],
      correct: 2,
      explanation: 'Strugatti Ettore 2020 is Booster only. Pea Car, Kovac Heladera, and Lawn Mower are fully banned.',
      section: 'vehicles',
    },
    {
      id: 'v5',
      type: 'mc',
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
      id: 'v6',
      type: 'mc',
      text: 'Which gun is banned for all staff members?',
      options: ['Handgun', 'Remington MSR', 'Shotgun', 'SMG'],
      correct: 1,
      explanation: 'Remington MSR, Remington 700, and Benelli M4 are all banned. M249 is Booster/VIP only.',
      section: 'vehicles',
    },
    {
      id: 'v7',
      type: 'tf',
      text: 'The M249 is available to Booster/VIP members only.',
      correct: true,
      explanation: 'M249 is listed as Booster/VIP Only.',
      section: 'vehicles',
    },
    {
      id: 'v8',
      type: 'mc',
      text: 'Who may use the Prisoner Transport Bus?',
      options: ['All staff', 'Directorship+ permission required', 'Booster only', 'Foundership only'],
      correct: 1,
      explanation: 'Prisoner Transport Bus requires Directorship+ permission.',
      section: 'vehicles',
    },
  ],
};

// Quiz configuration
export const QUIZ_CONFIG = {
  // Total questions per quiz attempt
  TOTAL_QUESTIONS: 20,

  // Distribution from each pool (minimum guaranteed)
  POOL_DISTRIBUTION: {
    punishments: 5,
    rules: 6,
    discipline: 3,
    commands: 4,
    vehicles: 2,
  },

  // Passing score (out of TOTAL_QUESTIONS)
  PASS_SCORE: 17,

  // Cooldown on failure (hours)
  COOLDOWN_HOURS: 6,

  // Percentage of questions to rotate on retry
  RETRY_ROTATION_PERCENT: 0.4,

  // Session expiry (hours)
  SESSION_EXPIRY_HOURS: 2,
};

// Shuffle array (Fisher-Yates)
export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate a quiz set — draws from each pool according to distribution
export function generateQuizSet(excludeIds = new Set()) {
  const { POOL_DISTRIBUTION, TOTAL_QUESTIONS } = QUIZ_CONFIG;
  const questions = [];
  const usedIds = new Set(excludeIds);

  // Draw minimum from each pool
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

  // Fill remaining slots from any pool
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

  // Keep a random subset of previous questions
  const keptIds = shuffleArray([...prevIds]).slice(0, keepCount);
  const keptSet = new Set(keptIds);

  // Generate new questions for the swapped slots
  const newQuestions = generateQuizSet(keptSet);

  // Add back the kept questions
  const keptQuestions = Object.values(QUESTION_BANK)
    .flat()
    .filter(q => keptSet.has(q.id));

  return shuffleArray([...newQuestions, ...keptQuestions]);
}

// Get all question IDs from a quiz set
export function getQuestionIds(questions) {
  return questions.map(q => q.id);
}
