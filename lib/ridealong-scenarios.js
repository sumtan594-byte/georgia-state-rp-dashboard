export const SCENARIO_BANK = [
  {
    id: 'ra_rdm_01',
    evidenceValid: true,
    difficulty: 'easy',
    category: 'punishments',
    modCall: {
      callerName: 'Civilian_Sarah',
      reason: 'This player keeps killing people for no reason!',
      location: 'City Center — Main Street',
    },
    sceneDescription:
      'You teleport to City Center and find player "xX_Slayer_Xx" standing over two dead bodies near the intersection. The kill feed confirms they killed "Civilian_Sarah" and "John_Doe_99" within 30 seconds of each other. No chat messages were sent between the kills. A quick check shows this player has no prior moderation record.',
    videoEvidence: {
      summary:
        'The bodycam footage shows "xX_Slayer_Xx" approaching "Civilian_Sarah" at a crosswalk. Without any text chat, voice RP, or /me commands, they pull out a pistol and shoot. They then immediately turn and shoot "John_Doe_99" who was standing nearby. There is zero roleplay interaction before either kill.',
    },
    options: [
      {
        id: 'a',
        text: 'Issue a formal Warning and log it via Melonly',
        correct: true,
        command: ';rdm',
      },
      {
        id: 'b',
        text: 'Kick the player from the server',
        correct: false,
        wrongReason:
          'Kick is the 2nd offence punishment for RDM. This is a 1st offence — Warning is the correct escalation step.',
      },
      {
        id: 'c',
        text: 'Ban the player for 24 hours',
        correct: false,
        wrongReason:
          'Ban is the 3rd offence punishment for RDM. Escalating too fast bypasses the warning system.',
      },
      {
        id: 'd',
        text: 'Verbal warning — no formal log needed',
        correct: false,
        wrongReason:
          'RDM requires a formal written warning logged via Melonly. Verbal warnings are for minor issues where no evidence exists.',
      },
    ],
    explanation:
      'RDM (Random Death Match) starts as a Warning for the first offence, then escalates to Kick, then Ban. The correct command is ;rdm. All formal warnings must be logged via Melonly.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_vdm_01',
    evidenceValid: true,
    difficulty: 'easy',
    category: 'punishments',
    modCall: {
      callerName: 'Driver_Mike',
      reason: 'Some guy just ran over my friend on purpose!',
      location: 'Highway 12 — Northbound',
    },
    sceneDescription:
      'You arrive on Highway 12 and see player "Speed_Demon_22" doing donuts in a yellow sports car near a body on the ground. The kill feed shows "Speed_Demon_22" ran over "Driver_Mike" twice in the same spot. The driver has no prior moderation history on record.',
    videoEvidence: {
      summary:
        'The traffic cam footage shows "Speed_Demon_22" driving a yellow sports car at high speed. They deliberately swerve off the road onto the sidewalk to hit "Driver_Mike", then circle back and run them over a second time. No brake lights, no attempt to avoid the pedestrian — this is intentional vehicular assault.',
    },
    options: [
      {
        id: 'a',
        text: 'Issue a formal Warning and log it',
        correct: true,
        command: ';vdm',
      },
      {
        id: 'b',
        text: 'Kick the player',
        correct: false,
        wrongReason:
          'VDM starts at Warning for first offence. A Kick is the 2nd step in escalation.',
      },
      {
        id: 'c',
        text: 'Ban the player',
        correct: false,
        wrongReason: 'Ban is only for the 3rd offence of VDM.',
      },
    ],
    explanation:
      'VDM (Vehicle Death Match) follows the same escalation as RDM: Warning → Kick → Ban. First offence = Warning. Command: ;vdm.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_frp_01',
    evidenceValid: true,
    difficulty: 'easy',
    category: 'punishments',
    modCall: {
      callerName: 'Deputy_James',
      reason: 'Suspect is ignoring commands and driving up mountains!',
      location: 'Mount Chiliad — West Face',
    },
    sceneDescription:
      'You find player "Mountain_Goat_7" driving a sedan nearly vertically up the side of Mount Chiliad. The vehicle is somehow maintaining traction on a 70-degree rock face. No trail or road is anywhere nearby. This player has a prior warning for FRP on record.',
    videoEvidence: {
      summary:
        'The drone footage shows "Mountain_Goat_7" driving a civilian sedan straight up a near-vertical rock face on Mount Chiliad. The car clips through rock outcrops and maintains speed uphill where no vehicle could realistically drive. They reach the summit and drive off the other side, landing without any crash physics.',
    },
    options: [
      {
        id: 'a',
        text: 'Issue a Kick — 2nd offence for FRP',
        correct: true,
        command: ';frp',
      },
      {
        id: 'b',
        text: 'Issue a Warning — treat it as a 1st offence',
        correct: false,
        wrongReason:
          'This player already has a prior warning for FRP. The 2nd offence escalates to Kick.',
      },
      {
        id: 'c',
        text: 'Ban the player',
        correct: false,
        wrongReason:
          'Ban is the 3rd offence for FRP, not the 2nd.',
      },
      {
        id: 'd',
        text: 'Give a verbal warning',
        correct: false,
        wrongReason:
          'FRP requires formal action. Driving up a vertical cliff is a clear violation that needs a logged punishment.',
      },
    ],
    explanation:
      'FRP (Fail Roleplay) escalation: Warning → Kick → Ban. With a prior warning on record, this is a 2nd offence = Kick. Command: ;frp.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_nlr_01',
    evidenceValid: true,
    difficulty: 'medium',
    category: 'punishments',
    modCall: {
      callerName: 'Medic_Tom',
      reason: 'The guy I just revived ran right back to where he died!',
      location: 'Davis PD — Front Parking Lot',
    },
    sceneDescription:
      'Player "Respawn_King_94" was killed in a shootout in the Davis PD parking lot 3 minutes ago. They have just been revived by EMS and are now sprinting back toward the same parking lot where the shootout is still active. Their prior record shows a Warning for NLR already logged.',
    videoEvidence: {
      summary:
        'The CCTV footage shows "Respawn_King_94" being revived by EMS at the hospital. They immediately get up and sprint directly toward the Davis PD parking lot — the exact location of their death. The shootout is still ongoing. They enter the parking lot and pull out a weapon to re-engage the same players who killed them.',
    },
    options: [
      {
        id: 'a',
        text: 'Kick the player — 2nd offence NLR',
        correct: true,
        command: ';nlr',
      },
      {
        id: 'b',
        text: 'Warn the player',
        correct: false,
        wrongReason:
          'This is a 2nd offence — they already have a Warning for NLR. The escalation moves to Kick.',
      },
      {
        id: 'c',
        text: 'Ban the player',
        correct: false,
        wrongReason:
          'Ban is the 3rd offence for NLR. This is only the 2nd offence.',
      },
      {
        id: 'd',
        text: 'Let it go — they were revived by EMS',
        correct: false,
        wrongReason:
          'NLR applies even after EMS revival. Returning to the exact scene of death to re-engage is a violation.',
      },
    ],
    explanation:
      'NLR (New Life Rule) prevents returning to your death location to rejoin a scenario. Escalation: Warning → Kick → Ban. 2nd offence = Kick. Command: ;nlr.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_gta_01',
    evidenceValid: true,
    difficulty: 'easy',
    category: 'punishments',
    modCall: {
      callerName: 'Traffic_Cop_01',
      reason: 'Some guy just stole a parked car and drove through a store!',
      location: 'Downtown — 24/7 Supermarket',
    },
    sceneDescription:
      'Player "Car_Thief_88" is sitting inside a police cruiser that has crashed through the front window of the 24/7 supermarket. The cruiser was parked and locked at the scene of an active traffic stop. The player has no prior offences recorded.',
    videoEvidence: {
      summary:
        'The store security camera shows "Car_Thief_88" approaching a marked police cruiser that was parked with its lights off during a traffic stop. They enter the vehicle (hotwiring animation plays), reverse, then accelerate through the front window of the 24/7 supermarket. They then attempt to drive out through the back wall.',
    },
    options: [
      {
        id: 'a',
        text: 'Issue a Warning',
        correct: true,
        command: ';gta',
      },
      {
        id: 'b',
        text: 'Kick the player',
        correct: false,
        wrongReason:
          'GTA Driving starts at Warning for 1st offence, not Kick.',
      },
      {
        id: 'c',
        text: 'Ban the player',
        correct: false,
        wrongReason:
          'Ban is only for 3rd offence of GTA Driving.',
      },
    ],
    explanation:
      'GTA Driving covers vehicle theft and reckless operation. Escalation: Warning → Kick → Ban. First offence = Warning. Command: ;gta.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_cuff_01',
    evidenceValid: true,
    difficulty: 'medium',
    category: 'punishments',
    modCall: {
      callerName: 'Officer_Riley',
      reason: 'Suspect is rushing me while I\'m trying to arrest someone else!',
      location: 'Vespucci Beach — Boardwalk',
    },
    sceneDescription:
      'An officer is attempting to arrest "Arrest_Target_42" when player "Cuff_Rusher_99" runs directly into the arrest zone, spamming the handcuff key to interrupt the arrest animation. They are not involved in the scenario. This player has no prior offences.',
    videoEvidence: {
      summary:
        'The officer\'s bodycam shows them cuffing "Arrest_Target_42" when "Cuff_Rusher_99" sprints in from off-screen. They run directly into the arrest interaction zone and spam the interact key, causing the arrest animation to cancel repeatedly. They ignore three verbal warnings from the officer to step back.',
    },
    options: [
      {
        id: 'a',
        text: 'Kick the player — 1st offence Cuff Rushing',
        correct: true,
        command: ';cuff',
      },
      {
        id: 'b',
        text: 'Warn the player',
        correct: false,
        wrongReason:
          'Cuff Rushing is a Kick on first offence — it does not have a Warning step.',
      },
      {
        id: 'c',
        text: 'Ban the player',
        correct: false,
        wrongReason:
          'Ban is the 2nd offence for Cuff Rushing, not the 1st.',
      },
      {
        id: 'd',
        text: 'Verbal warning only',
        correct: false,
        wrongReason:
          'Cuff Rushing requires formal action. They ignored multiple verbal warnings already.',
      },
    ],
    explanation:
      'Cuff Rushing is a Kick on first offence, then Ban on second. There is no Warning step. Command: ;cuff or ;cuff_rushing.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_trolling_01',
    evidenceValid: true,
    difficulty: 'easy',
    category: 'punishments',
    modCall: {
      callerName: 'Player_Steve',
      reason: 'Some guy keeps following me and blasting the airhorn!',
      location: 'Beach Boardwalk',
    },
    sceneDescription:
      'Player "Troll_Master_X" is following random players around the beach boardwalk while repeatedly blasting an airhorn sound effect and spamming the laugh emote. They have ignored three verbal requests to stop from other players. No prior record.',
    videoEvidence: {
      summary:
        'The bodycam footage shows "Troll_Master_X" circling the boardwalk for 5 minutes straight. They approach each player, blast the airhorn directly next to them, spam the laugh emote, then move to the next person. Multiple players in chat are telling them to stop. They respond with "lol" and continue.',
    },
    options: [
      {
        id: 'a',
        text: 'Kick the player',
        correct: true,
        command: ';trolling',
      },
      {
        id: 'b',
        text: 'Issue a Warning',
        correct: false,
        wrongReason:
          'Trolling starts at Kick on first offence — there is no Warning step.',
      },
      {
        id: 'c',
        text: 'Ban the player',
        correct: false,
        wrongReason:
          'Ban is the 2nd offence for Trolling, not the 1st.',
      },
      {
        id: 'd',
        text: 'Tell them to stop and leave it',
        correct: false,
        wrongReason:
          'They already ignored multiple requests to stop. Formal action is needed.',
      },
    ],
    explanation:
      'Trolling is a Kick on first offence, then Ban on second. There is no Warning step. Command: ;trolling or ;troll.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_staff_disrespect_01',
    evidenceValid: true,
    difficulty: 'medium',
    category: 'punishments',
    modCall: {
      callerName: 'Moderator_Kim',
      reason: 'I need backup — player is cussing me out in /ooc',
      location: 'Server-wide (OOC Chat)',
    },
    sceneDescription:
      'Player "Angry_Gamer_42" is using OOC chat to verbally abuse moderator "Moderator_Kim" who pulled them over for speeding. The chat logs show repeated profanity, personal insults, and refusal to cooperate with the traffic stop. This player has a prior Warning for Staff Disrespect on record.',
    videoEvidence: {
      summary:
        'The chat log replay shows the following exchange: Moderator_Kim pulls over "Angry_Gamer_42" for speeding. The player immediately types in OOC: "bro shut up", "this is so stupid", "you\'re just mad bc ur power trip". When asked to cooperate, they escalate to personal insults and profanity. This continues for 2 minutes straight.',
    },
    options: [
      {
        id: 'a',
        text: 'Kick the player — 2nd offence Staff Disrespect',
        correct: true,
        command: ';sd',
      },
      {
        id: 'b',
        text: 'Issue another Warning',
        correct: false,
        wrongReason:
          'This is a 2nd offence — they already have a Warning for Staff Disrespect. The escalation moves to Kick.',
      },
      {
        id: 'c',
        text: 'Ban the player',
        correct: false,
        wrongReason:
          'Ban is the 3rd offence for Staff Disrespect. This is only the 2nd.',
      },
      {
        id: 'd',
        text: 'Ignore it — just finish the traffic stop',
        correct: false,
        wrongReason:
          'Staff disrespect must always be addressed. Allowing abuse undermines staff authority.',
      },
    ],
    explanation:
      'Staff Disrespect escalation: Warning → Kick → Ban. With a prior Warning, this is a 2nd offence = Kick. Command: ;sd or ;staff_disrespect.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_nitrp_01',
    evidenceValid: true,
    difficulty: 'medium',
    category: 'punishments',
    modCall: {
      callerName: 'Trucker_Bob',
      reason: 'Guy at the gas station is just standing there doing nothing — been 10 minutes!',
      location: 'Gas Station — Route 66',
    },
    sceneDescription:
      'Player "AFK_Andy_77" is standing at the gas station pumps. They have been logged in for 45 minutes and have not moved, typed a single message in chat, or interacted with any player or vehicle. They respond to attempts at RP with silence.',
    videoEvidence: {
      summary:
        'The server replay shows "AFK_Andy_77" spawning in at the gas station 45 minutes ago. They have not moved from the exact spawn spot. Multiple players approach and try to initiate RP — "You need something?", "Hey man you blocking the pump". No response in any chat channel. Not even a movement or emote.',
    },
    options: [
      {
        id: 'a',
        text: 'Kick the player',
        correct: true,
        command: ';nitrp',
      },
      {
        id: 'b',
        text: 'Issue a Warning',
        correct: false,
        wrongReason:
          'NITRP (No Intent to Roleplay) is a Kick on first offence, not a Warning.',
      },
      {
        id: 'c',
        text: 'Ban the player',
        correct: false,
        wrongReason:
          'Ban is only for the 2nd offence of NITRP.',
      },
      {
        id: 'd',
        text: 'Do nothing — they are not breaking any rule',
        correct: false,
        wrongReason:
          'Joining a roleplay server and refusing to participate in any RP is a violation. The server requires active roleplay.',
      },
    ],
    explanation:
      'NITRP (No Intent to Roleplay) is Kick on first offence, then Ban. Players must actively participate in the roleplay environment. Command: ;nitrp, ;nointent, or ;no-intent.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_abusing_mod_01',
    evidenceValid: true,
    difficulty: 'hard',
    category: 'punishments',
    modCall: {
      callerName: 'Player_Jane',
      reason: 'I keep getting false !mod calls placed on me',
      location: 'Report via staff chat',
    },
    sceneDescription:
      'Investigation reveals that player "False_Flag_007" has placed 12 !mod calls in the past hour, all targeting the same player "Player_Jane" with fabricated reasons like "rdm" and "vdm" that were investigated and found to be false each time. A server replay confirms no rule was broken. This player has no prior record.',
    videoEvidence: {
      summary:
        'The server logs show "False_Flag_007" typing !mod twelve times in 60 minutes, each time reporting "Player_Jane" for various offences. Staff responded to each call and found no evidence of wrongdoing. In between calls, "False_Flag_007" is seen roleplaying normally — they are clearly trying to harass the other player through the moderation system.',
    },
    options: [
      {
        id: 'a',
        text: 'Issue a Verbal Warning — 1st offence',
        correct: true,
        command: ';abusing_mod',
      },
      {
        id: 'b',
        text: 'Warn the player formally',
        correct: false,
        wrongReason:
          'Abusing !mod system starts with a Verbal Warning on first offence, then Warning, then Kick/Ban.',
      },
      {
        id: 'c',
        text: 'Kick the player',
        correct: false,
        wrongReason:
          'Kick is the 3rd step (combined with Ban) for !mod abuse, not the 1st.',
      },
      {
        id: 'd',
        text: 'Ban the player',
        correct: false,
        wrongReason:
          'Ban is only for the final stage of escalation after Verbal Warning → Warning → Kick.',
      },
    ],
    explanation:
      'Abusing the !mod system is a unique escalation: Verbal Warning → Warning → Kick > Ban. First offence = Verbal Warning. Command: ;abusing_mod or ;abuse_mod.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_safezone_01',
    evidenceValid: true,
    difficulty: 'medium',
    category: 'punishments',
    modCall: {
      callerName: 'Security_Cam',
      reason: 'Shots fired at the Police Station spawn!',
      location: 'Police Station — Front Entrance',
    },
    sceneDescription:
      'Player "Rogue_Cop_Killer" is engaging in a shootout directly in front of the Police Station spawn area. This is a designated safe zone where violent criminal activity is strictly prohibited. Two other players who just spawned are caught in the crossfire. No prior record.',
    videoEvidence: {
      summary:
        'The police station exterior camera shows "Rogue_Cop_Killer" waiting outside the spawn doors. As soon as a player spawns and exits, they open fire with a rifle. The victim never had a chance to react. A second player who spawns moments later is also shot. The shooter then runs into the station lobby to reload.',
    },
    options: [
      {
        id: 'a',
        text: 'Kick the player — 1st offence Safezone RDM/VDM',
        correct: true,
        command: ';safezone',
      },
      {
        id: 'b',
        text: 'Warn the player',
        correct: false,
        wrongReason:
          'Safezone violations start at Kick on first offence, not Warning.',
      },
      {
        id: 'c',
        text: 'Ban the player',
        correct: false,
        wrongReason:
          'Ban is the 2nd offence for Safezone RDM/VDM.',
      },
    ],
    explanation:
      'Safezone RDM/VDM is a Kick on first offence, Ban on second. Safe zones are strictly protected areas. Command: ;safezone.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_mass_vdm_01',
    evidenceValid: true,
    difficulty: 'hard',
    category: 'punishments',
    modCall: {
      callerName: '911_Dispatcher',
      reason: 'Multiple casualties reported on the highway — one driver hitting everyone!',
      location: 'Highway 12 — Southbound Near Exit 5',
    },
    sceneDescription:
      'Player "Road_Rage_666" has been driving up and down Highway 12 for 10 minutes, deliberately swerving to hit every player they pass. The kill feed shows 7 unique victims. They are currently doing a U-turn to make another pass. No prior record.',
    videoEvidence: {
      summary:
        'The traffic camera network shows "Road_Rage_666" in a black pickup truck driving south on Highway 12. They deliberately swerve into oncoming traffic to hit the first victim, then continue driving. They reach the end of the highway, do a U-turn, and drive back north hitting more players. This pattern repeats — 7 confirmed hits. They show no intention of stopping.',
    },
    options: [
      {
        id: 'a',
        text: 'Ban the player — Mass VDM',
        correct: true,
        command: ';mass_vdm',
      },
      {
        id: 'b',
        text: 'Kick the player',
        correct: false,
        wrongReason:
          'Mass VDM/RDM is an immediate Ban on first offence — no Warning or Kick step.',
      },
      {
        id: 'c',
        text: 'Warn the player',
        correct: false,
        wrongReason:
          'Mass VDM/RDM bypasses the normal escalation. It is an immediate Ban.',
      },
    ],
    explanation:
      'Mass VDM/RDM (obvious trolling with multiple victims) is an immediate Ban on first offence. No escalation steps. Command: ;mass_vdm.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_rtap_01',
    evidenceValid: true,
    difficulty: 'hard',
    category: 'punishments',
    modCall: {
      callerName: 'Arresting_Officer',
      reason: 'Suspect reset their character mid-arrest!',
      location: 'Mission Row — Back Alley',
    },
    sceneDescription:
      'Officer was in the process of handcuffing player "Escape_Artist_55" after a felony stop. The suspect was at 60% cuff animation progress when a notification shows they left the game and rejoined 10 seconds later, spawning across the map with no cuffs and clean inventory.',
    videoEvidence: {
      summary:
        'The officer\'s bodycam shows the arrest in progress. "Escape_Artist_55" is against the wall, hands behind back. The cuff animation is at 60% when the character model suddenly disappears. A server log confirms disconnect. 10 seconds later, the same player rejoins and spawns at the hospital — no cuffs, no items taken. They immediately start running.',
    },
    options: [
      {
        id: 'a',
        text: 'Ban the player — RTAP',
        correct: true,
        command: ';rtap',
      },
      {
        id: 'b',
        text: 'Warn the player',
        correct: false,
        wrongReason:
          'Reset to Avoid Punishment is an immediate Ban on first offence.',
      },
      {
        id: 'c',
        text: 'Kick the player',
        correct: false,
        wrongReason:
          'RTAP is an immediate Ban — no Warning or Kick step.',
      },
      {
        id: 'd',
        text: 'Just re-arrest them',
        correct: false,
        wrongReason:
          'While they should be re-arrested, the reset itself must be punished. RTAP is an immediate Ban.',
      },
    ],
    explanation:
      'RTAP (Reset to Avoid Punishment) is an immediate Ban on first offence. Players cannot reset to escape consequences. Command: ;rtap.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_ltap_01',
    evidenceValid: true,
    difficulty: 'hard',
    category: 'punishments',
    modCall: {
      callerName: 'Pursuit_Unit_7',
      reason: 'Suspect just disconnected in the middle of a chase!',
      location: 'Los Santos — Vinewood Hills',
    },
    sceneDescription:
      'Player "Disconnect_Pro_23" was in a high-speed police pursuit through Vinewood Hills. After 3 minutes of chase, just as spike strips were deployed ahead, the player\'s connection dropped. They have not rejoined. The chase involved 4 units and reached speeds of 120 mph.',
    videoEvidence: {
      summary:
        'The police helicopter footage shows the pursuit through Vinewood Hills. The suspect vehicle is driving recklessly through residential streets. As the ground units coordinate a spike strip deployment ahead, the suspect vehicle suddenly stops responding — no crash, no driver exit, just an immediate freeze and despawn. Server logs confirm a manual disconnect, not a crash.',
    },
    options: [
      {
        id: 'a',
        text: 'Ban the player — LTAP',
        correct: true,
        command: ';ltap',
      },
      {
        id: 'b',
        text: 'Warn the player',
        correct: false,
        wrongReason:
          'LTAP (Leave to Avoid Punishment) is an immediate Ban on first offence.',
      },
      {
        id: 'c',
        text: 'Kick the player next time they join',
        correct: false,
        wrongReason:
          'LTAP is a Ban-level offence. A kick is insufficient for evading a full pursuit.',
      },
    ],
    explanation:
      'LTAP (Leaving to Avoid Punishment) is an immediate Ban on first offence. Disconnecting to escape a scenario is strictly prohibited. Command: ;ltap or ;leave_avoid.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_nsfw_01',
    evidenceValid: true,
    difficulty: 'hard',
    category: 'punishments',
    modCall: {
      callerName: 'Parent_Player',
      reason: 'Someone is putting inappropriate things in their bio',
      location: 'Player Profile',
    },
    sceneDescription:
      'Player "Inappropriate_69" has set their in-game profile description to explicit content visible to all players on the server. Multiple players have reported it. The content is sexually explicit and violates Discord Terms of Service as well as server rules.',
    videoEvidence: {
      summary:
        'Screenshots from multiple players show "Inappropriate_69"\'s profile description containing explicit sexual content. The text is clearly visible to any player who opens the profile. A server log confirms the description was last updated 30 minutes ago. The player has been online for 2 hours since setting it.',
    },
    options: [
      {
        id: 'a',
        text: 'Ban the player — NSFW (not appealable)',
        correct: true,
        command: ';nsfw',
      },
      {
        id: 'b',
        text: 'Warn the player and ask them to change it',
        correct: false,
        wrongReason:
          'NSFW content is an immediate Ban that is not appealable. No warnings are issued.',
      },
      {
        id: 'c',
        text: 'Kick the player',
        correct: false,
        wrongReason:
          'NSFW violations bypass escalation entirely — it is an immediate Ban.',
      },
    ],
    explanation:
      'NSFW (Not Safe for Work) is an immediate Ban on first offence and is explicitly listed as "Not appealable". Command: ;nsfw.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_staff_impersonation_01',
    evidenceValid: true,
    difficulty: 'hard',
    category: 'punishments',
    modCall: {
      callerName: 'Real_Staff_John',
      reason: 'Someone is pretending to be staff and threatening to ban players!',
      location: 'City Wide',
    },
    sceneDescription:
      'Player "Fake_Admin_007" is going around telling players they are a moderator and threatening to ban them unless they "pay a fine" in in-game currency. They are using a name similar to a real staff member and have changed their uniform to resemble the staff outfit.',
    videoEvidence: {
      summary:
        'Multiple player reports and chat logs show "Fake_Admin_007" approaching players and saying "I\'m a mod, you need to pay me $5,000 or I\'ll ban you". They are wearing a modified outfit that resembles the staff uniform. When confronted by a real staff member, they claim "I\'m undercover" and try to run away.',
    },
    options: [
      {
        id: 'a',
        text: 'Ban the player — Staff Impersonation',
        correct: true,
        command: ';staff_impersonation',
      },
      {
        id: 'b',
        text: 'Warn the player',
        correct: false,
        wrongReason:
          'Staff Impersonation is an immediate Ban on first offence.',
      },
      {
        id: 'c',
        text: 'Kick the player',
        correct: false,
        wrongReason:
          'Impersonating staff is a serious violation that warrants an immediate Ban.',
      },
    ],
    explanation:
      'Staff Impersonation is an immediate Ban on first offence. Pretending to be staff and using that to threaten or scam players is a zero-tolerance violation. Command: ;staff_impersonation.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_hacking_01',
    evidenceValid: true,
    difficulty: 'hard',
    category: 'punishments',
    modCall: {
      callerName: 'Player_Mike',
      reason: 'A player is flying around the map and shooting through walls!',
      location: 'City Hall',
    },
    sceneDescription:
      'Player "Cheater_Boi_99" is hovering 50 feet above City Hall, shooting players on the ground below through walls and obstacles. Multiple players in the kill feed are dying to them with no line of sight. They have 15 kills in under 3 minutes.',
    videoEvidence: {
      summary:
        'The spectator footage shows "Cheater_Boi_99" floating 50 feet above City Hall with no visible support. They are moving freely in all three axes — up, down, left, right — with no jetpack animation. Their weapon is firing through the solid roof of City Hall and hitting players inside. Kill shots are tracking through walls with perfect accuracy.',
    },
    options: [
      {
        id: 'a',
        text: 'Ban the player — Cheating (not appealable)',
        correct: true,
        command: ';hacking',
      },
      {
        id: 'b',
        text: 'Warn the player',
        correct: false,
        wrongReason:
          'Cheating/Exploiting is an immediate not-appealable Ban.',
      },
      {
        id: 'c',
        text: 'Kick the player',
        correct: false,
        wrongReason:
          'Exploiting is a Ban-level offence. A kick is insufficient for third-party software use.',
      },
    ],
    explanation:
      'Cheating/Exploiting is an immediate Ban on first offence marked as "Not appealable". No warnings or kicks. Command: ;hacking or ;cheating.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_tool_abuse_01',
    evidenceValid: true,
    difficulty: 'medium',
    category: 'punishments',
    modCall: {
      callerName: 'IA_Observer',
      reason: 'Staff member is spawning vehicles and abusing admin tools',
      location: 'Staff Parking',
    },
    sceneDescription:
      'Staff member "Rogue_Mod_42" (off-duty) is using admin tools to spawn high-end vehicles for themselves and their friends. They are not on duty and have no supervisory approval for tool use. They have spawned 4 vehicles in the past 15 minutes.',
    videoEvidence: {
      summary:
        'The admin log replay shows "Rogue_Mod_42" using vehicle spawn commands while off-duty. They spawn a Cheetah, then a T20, then an Osiris — each time giving the vehicle to a different friend. They then spawn a fourth vehicle for themselves and begin driving around. No supervisory approval is logged for any of these actions.',
    },
    options: [
      {
        id: 'a',
        text: 'Kick the staff member — Tool Abuse',
        correct: true,
        command: ';ta',
      },
      {
        id: 'b',
        text: 'Warn the staff member',
        correct: false,
        wrongReason:
          'Tool Abuse is a Kick on first offence, not a Warning.',
      },
      {
        id: 'c',
        text: 'Ban the staff member',
        correct: false,
        wrongReason:
          'Ban is only for the 3rd offence of Tool Abuse.',
      },
    ],
    explanation:
      'Tool Abuse escalation: Kick → Ban → Ban. Staff using admin tools off-duty or without authorization is a Kick on first offence. Command: ;ta or ;tool.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_unrealistic_avatar_01',
    evidenceValid: true,
    difficulty: 'easy',
    category: 'punishments',
    modCall: {
      callerName: 'RP_Enforcer',
      reason: 'A player is using a giant banana costume — breaks immersion!',
      location: 'City Walk',
    },
    sceneDescription:
      'Player "Meme_King_00" is running around Los Santos wearing a giant banana costume. The character model is oversized, brightly yellow, and clips through doorways. Multiple players have complained that it breaks the realism of the server.',
    videoEvidence: {
      summary:
        'The street camera footage shows "Meme_King_00" in a full banana costume that is twice the width and height of a normal player model. They are walking through doors and the banana clips through the doorframe. Other players are doing double-takes and stopping to stare. In chat, players are saying "bro is a banana lmao" and "this ruins the vibe".',
    },
    options: [
      {
        id: 'a',
        text: 'Kick the player',
        correct: true,
        command: ';unrealistic',
      },
      {
        id: 'b',
        text: 'Warn the player',
        correct: false,
        wrongReason:
          'Unrealistic Avatar is a Kick on first offence, not a Warning.',
      },
      {
        id: 'c',
        text: 'Ban the player',
        correct: false,
        wrongReason:
          'Ban is only for the 2nd offence of Unrealistic Avatar.',
      },
      {
        id: 'd',
        text: 'Let it slide — it is just a costume',
        correct: false,
        wrongReason:
          'Realism is a core server rule. Unrealistic avatars that break immersion must be addressed.',
      },
    ],
    explanation:
      'Unrealistic Avatar escalation: Kick → Ban. First offence = Kick. Command: ;unrealistic or ;avatar.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_metagaming_01',
    evidenceValid: true,
    difficulty: 'medium',
    category: 'punishments',
    modCall: {
      callerName: 'Detective_Rodriguez',
      reason: 'Suspect keeps knowing where we are before we arrive',
      location: 'Hideout — Paleto Bay',
    },
    sceneDescription:
      'During a covert narcotics operation, player "Omniscient_99" has consistently known exactly where undercover officers are positioned, despite having no in-game line of sight or communication that could reveal their locations. They have avoided three separate ambush points by taking alternate routes at the last second.',
    videoEvidence: {
      summary:
        'The operation replay shows officers setting up ambush positions in concealed locations — behind walls, in buildings, around corners. "Omniscient_99" approaches each location, stops exactly at the ambush point, then immediately turns around and takes a different route. They do this three times. On the third attempt, they type in chat "nice try lmao" before officers have made any contact.',
    },
    options: [
      {
        id: 'a',
        text: 'Issue a Warning for Metagaming',
        correct: true,
        command: ';metagaming',
      },
      {
        id: 'b',
        text: 'Kick the player',
        correct: false,
        wrongReason:
          'While metagaming is serious, it starts with a Warning on first offence if no evidence of external tools is found.',
      },
      {
        id: 'c',
        text: 'Ban the player',
        correct: false,
        wrongReason:
          'Ban is only for repeated metagaming offences after warnings.',
      },
    ],
    explanation:
      'Metagaming - using OOC knowledge IG is a Warning on first offense if there is no evidence of external tools. Escalation: Warning → Kick → Ban.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_powergaming_01',
    evidenceValid: true,
    difficulty: 'hard',
    category: 'punishments',
    modCall: {
      callerName: 'Robbed_Player',
      reason: 'They took my stuff without giving me a chance to react!',
      location: 'Alley — Downtown',
    },
    sceneDescription:
      'Player "Bully_Boss_42" approached "Robbed_Player" in an alley and instantly took their items using a robbery animation, without any prior roleplay or /me commands. The victim had no opportunity to react or respond before the animation completed.',
    videoEvidence: {
      summary:
        'The CCTV footage shows "Bully_Boss_42" walking up behind "Robbed_Player" in an alley. Without a single line of chat or /me command, they initiate the robbery animation directly. The victim character model freezes as the animation plays. The entire interaction from approach to complete robbery takes 2 seconds — no RP was exchanged.',
    },
    options: [
      {
        id: 'a',
        text: 'Kick the player — Powergaming',
        correct: true,
        command: ';powergaming',
      },
      {
        id: 'b',
        text: 'Warn the player',
        correct: false,
        wrongReason:
          'Powergaming — forcing outcomes without giving reaction time — is a Kick on first offence.',
      },
      {
        id: 'c',
        text: 'Just return the items and let them go',
        correct: false,
        wrongReason:
          'Returning items is good, but the behaviour itself must be punished to prevent recurrence.',
      },
    ],
    explanation:
      'Powergaming — forcing outcomes without giving the other player a fair chance to react — is a Kick on first offense, then Ban.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_cop_baiting_01',
    evidenceValid: true,
    difficulty: 'medium',
    category: 'punishments',
    modCall: {
      callerName: 'Patrol_Unit_3',
      reason: 'Same guy keeps doing donuts in front of the station',
      location: 'Police Station — Front Parking Lot',
    },
    sceneDescription:
      'Player "Bait_Master_11" has been doing donuts and burnouts in the police station parking lot for 5 minutes straight. Each time officers exit the station, they speed away, circle the block, and return to do more donuts. This is the third time today this specific player has done this.',
    videoEvidence: {
      summary:
        'The police station exterior camera timelapse shows "Bait_Master_11" entering the parking lot and immediately starting donuts around the flagpole. An officer walks out — the player speeds off. 90 seconds later, they return and resume donuts. This cycle repeats 4 times. In between, they are seen driving calmly through the city with no other traffic violations.',
    },
    options: [
      {
        id: 'a',
        text: 'Kick the player — Cop Baiting',
        correct: true,
        command: ';cop_baiting',
      },
      {
        id: 'b',
        text: 'Warn the player',
        correct: false,
        wrongReason:
          'Cop Baiting is a Kick on first offence due to the intentional harassment of law enforcement.',
      },
      {
        id: 'c',
        text: 'Ban the player',
        correct: false,
        wrongReason:
          'Ban is for 2nd+ offences of Cop Baiting after a kick.',
      },
    ],
    explanation:
      'Cop Baiting — intentionally provoking law enforcement into pursuits without valid RP reason — is a Kick on first offense, then Ban.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_bypassing_01',
    evidenceValid: true,
    difficulty: 'medium',
    category: 'punishments',
    modCall: {
      callerName: 'Chat_Scanner',
      reason: 'Player is typing filtered words with special characters',
      location: 'Global Chat',
    },
    sceneDescription:
      'Player "Filter_Dodger_99" is using special characters and Unicode substitutes to bypass the chat filter and type profanity in global chat. They have sent 6 messages that clearly spell out banned words using alternative characters (e.g., @ for a, 3 for e).',
    videoEvidence: {
      summary:
        'The chat log replay shows "Filter_Dodger_99" typing messages like "what a $#!+ty server" and "you\'re all @$$holes". The filter catches the second message but the first goes through. When warned, they type "lol filter bad" and continue with increasingly creative substitutions.',
    },
    options: [
      {
        id: 'a',
        text: 'Ban the player — Bypassing',
        correct: true,
        command: ';bypassing',
      },
      {
        id: 'b',
        text: 'Warn the player',
        correct: false,
        wrongReason:
          'Bypassing the chat filter is an immediate Ban on first offence.',
      },
      {
        id: 'c',
        text: 'Kick the player',
        correct: false,
        wrongReason:
          'Filter bypassing is a Ban-level offence, not a Kick.',
      },
    ],
    explanation:
      'Bypassing the chat filter using special characters or Unicode substitutes is an immediate Ban on first offence. Command: ;bypassing.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_fear_rp_01',
    evidenceValid: true,
    difficulty: 'medium',
    category: 'punishments',
    modCall: {
      callerName: 'Hostage_Taker_Scene',
      reason: 'I had him at gunpoint and he just walked away!',
      location: 'Bank — Interior',
    },
    sceneDescription:
      'During a bank robbery scenario, officer had player "NoFear_007" at gunpoint with a clear verbal command to freeze. The player ignored the command, turned around, and walked directly toward the officer, forcing the officer to either shoot or let them pass.',
    videoEvidence: {
      summary:
        'The bank security camera shows the officer entering with weapon drawn, shouting "FREEZE! GET ON THE GROUND!" "NoFear_007" is 10 feet away, unarmed, clearly visible. They make eye contact with the officer, then slowly turn and walk toward the drawn weapon. They do not raise hands, do not comply, just walk forward.',
    },
    options: [
      {
        id: 'a',
        text: 'Kick the player — Fear RP violation',
        correct: true,
        command: ';fear_rp',
      },
      {
        id: 'b',
        text: 'Warn the player',
        correct: false,
        wrongReason:
          'Ignoring commands at gunpoint is a serious Fear RP violation starting at Kick.',
      },
      {
        id: 'c',
        text: 'Ban the player',
        correct: false,
        wrongReason:
          'Ban is for 2nd+ offences of Fear RP violations.',
      },
    ],
    explanation:
      'Fear RP / Value for Life requires realistic self-preservation. Walking toward a drawn weapon violates this. Kick on first offence, Ban on second.',
    handbookRef: { chapter: 9, section: '9.1' },
  },
  {
    id: 'ra_invalid_rdm_01',
    evidenceValid: false,
    difficulty: 'medium',
    category: 'judgment',
    modCall: {
      callerName: '911_Caller',
      reason: 'I just got RDM\'d by "Player_X" outside the bank — they shot me for no reason!',
      location: 'Bank of Los Santos — Front Entrance',
    },
    sceneDescription:
      'You arrive at the Bank of Los Santos. "Player_X" is standing near the entrance with a pistol holstered. "911_Caller" is on the ground with low health. The kill feed shows "Player_X" killed "911_Caller". Chat logs show the caller was mouthing off aggressively before the shooting started.',
    videoEvidence: {
      summary:
        'The bank security camera shows "911_Caller" approach "Player_X" at the entrance and start trash-talking in /say: "what\'re you looking at", "you wanna go?". "Player_X" ignores them and tries to walk inside. "911_Caller" pulls out a knife and swings at "Player_X". "Player_X" draws their pistol and fires in self-defence as the knife swing connects. The kill is a clear response to an initiated physical attack.',
    },
    options: [
      {
        id: 'a',
        text: 'No action — evidence shows self-defence',
        correct: true,
        command: 'N/A',
      },
      {
        id: 'b',
        text: 'Issue a Warning for RDM',
        correct: false,
        wrongReason:
          'The evidence clearly shows the caller initiated violence by pulling a knife and swinging first. The reported player acted in self-defence, not RDM.',
      },
      {
        id: 'c',
        text: 'Kick the player for RDM',
        correct: false,
        wrongReason:
          'No RDM occurred. The caller is the aggressor — punishing the victim of a knife attack would be incorrect.',
      },
      {
        id: 'd',
        text: 'Warn both players and move on',
        correct: false,
        wrongReason:
          'Only one player committed a violation (the caller, for initiating violence). The reported player is not at fault.',
      },
    ],
    explanation:
      'Not every !mod call is valid. The video evidence shows the caller initiated the attack — the reported player fired in self-defence. When evidence contradicts the caller, the correct action is no punishment for the reported player. A verbal warning to the caller about false reports may be warranted, but no formal action.',
    handbookRef: { chapter: 9, section: '9.3' },
  },
  {
    id: 'ra_invalid_vdm_01',
    evidenceValid: false,
    difficulty: 'medium',
    category: 'judgment',
    modCall: {
      callerName: 'Pedestrian_Witness',
      reason: 'A red car just ran over my friend on purpose! VDM!',
      location: 'Vespucci Boulevard — Crosswalk',
    },
    sceneDescription:
      'You arrive at the crosswalk on Vespucci Boulevard. A red sports car is stopped at the side of the road with front-end damage. A pedestrian is on the ground nearby. The driver, "Careful_Driver_99", is standing by their vehicle looking at the scene.',
    videoEvidence: {
      summary:
        'The traffic camera shows "Careful_Driver_99" driving at normal speed (35 mph) down Vespucci Boulevard with a green light. A pedestrian suddenly runs out from between two parked cars directly into the path of the vehicle — not at the crosswalk, but mid-block. The driver slams on brakes (brake lights visible) but cannot stop in time. Impact occurs at the front-left fender. The driver immediately pulls over and gets out to check on the pedestrian.',
    },
    options: [
      {
        id: 'a',
        text: 'No action — pedestrian jaywalked into traffic',
        correct: true,
        command: 'N/A',
      },
      {
        id: 'b',
        text: 'Warn the driver for VDM',
        correct: false,
        wrongReason:
          'The driver had a green light, was at normal speed, and braked on reaction. The pedestrian ran into traffic mid-block outside the crosswalk. This is not VDM.',
      },
      {
        id: 'c',
        text: 'Kick the driver for VDM',
        correct: false,
        wrongReason:
          'A kick requires intentional vehicular assault. The evidence shows an accident caused by pedestrian negligence, not intentional harm.',
      },
      {
        id: 'd',
        text: 'Warn the pedestrian for jaywalking',
        correct: false,
        wrongReason:
          'While jaywalking is discouraged, this is a medical RP situation, not a punishment scenario. No formal action is needed — EMS should handle the injured pedestrian.',
      },
    ],
    explanation:
      'The caller claimed VDM, but the evidence shows a pedestrian running into traffic without looking. Drivers cannot be punished for accidents they could not reasonably avoid. Always review the full evidence — the caller\'s description may be incomplete or misleading.',
    handbookRef: { chapter: 9, section: '9.3' },
  },
  {
    id: 'ra_invalid_metagaming_01',
    evidenceValid: false,
    difficulty: 'hard',
    category: 'judgment',
    modCall: {
      callerName: 'Tactical_Unit_Lead',
      reason: 'Suspect "Aware_Crook_44" keeps avoiding our ambushes — they have to be metagaming with Discord or something.',
      location: 'Paleto Bay — Forest Area',
    },
    sceneDescription:
      'A tactical unit has been conducting a covert operation near Paleto Bay. Suspect "Aware_Crook_44" has avoided two planned ambush points. The unit leader is convinced the suspect is using external communication (Discord) to know officer locations.',
    videoEvidence: {
      summary:
        'The police helicopter thermal footage shows the full picture. On the first ambush attempt, the suspect was driving and had a clear line of sight to the officer hiding behind a bush (the officer\'s arm and weapon are visible through the foliage). On the second attempt, the suspect heard police radio chatter from an officer who accidentally broadcast on an unsecured channel 50 metres away — the suspect\'s character visibly turns toward the sound before changing direction. No evidence of Discord or external comms.',
    },
    options: [
      {
        id: 'a',
        text: 'No action — information was available in-character',
        correct: true,
        command: 'N/A',
      },
      {
        id: 'b',
        text: 'Warn the player for Metagaming',
        correct: false,
        wrongReason:
          'The evidence shows the suspect had IC reasons for avoiding the ambushes — visual line of sight and audible radio chatter. No OOC information was used.',
      },
      {
        id: 'c',
        text: 'Kick the player for Metagaming',
        correct: false,
        wrongReason:
          'A kick requires clear evidence of OOC information use. The ambushes were compromised by IC factors, not external tools.',
      },
      {
        id: 'd',
        text: 'Instruct officers to use encrypted channels only',
        correct: false,
        wrongReason:
          'Good advice for future ops, but not the correct action here. The suspect did not violate any rule.',
      },
    ],
    explanation:
      'Just because a player avoids an ambush does not mean they are metagaming. Officers must ensure positions are concealed and radio channels are secure before assuming OOC information usage. The evidence showed IC-acquired knowledge.',
    handbookRef: { chapter: 9, section: '9.3' },
  },
  {
    id: 'ra_invalid_frp_01',
    evidenceValid: false,
    difficulty: 'medium',
    category: 'judgment',
    modCall: {
      callerName: 'Park_Ranger',
      reason: 'This guy is driving a sedan straight up the side of Mount Chiliad — clear FRP!',
      location: 'Mount Chiliad — Eastern Trail',
    },
    sceneDescription:
      'You find player "Trail_Driver_77" in a sedan on the eastern slope of Mount Chiliad. The vehicle is climbing an incline that looks steep from a distance. The caller is adamant this is Fail RP. The player has no prior record.',
    videoEvidence: {
      summary:
        'The trail camera footage shows "Trail_Driver_77" driving on a designated scenic dirt road that winds up the eastern face of Mount Chiliad. The road is clearly marked on the map as a legitimate drivable trail. While steep in sections, the road is maintained with visible tyre tracks from other vehicles. The sedan is driving at a reasonable speed, following the road, and not leaving the designated path at any point.',
    },
    options: [
      {
        id: 'a',
        text: 'No action — the road is a legitimate trail',
        correct: true,
        command: 'N/A',
      },
      {
        id: 'b',
        text: 'Warn the player for FRP',
        correct: false,
        wrongReason:
          'The player is on a designated scenic road. Driving a sedan on a marked trail is not Fail RP — the vehicle can navigate this road.',
      },
      {
        id: 'c',
        text: 'Kick the player for FRP',
        correct: false,
        wrongReason:
          'A kick requires a clear FRP violation. This is legitimate driving on a mapped road. The caller misidentified the location.',
      },
      {
        id: 'd',
        text: 'Advise the player to use a more suitable vehicle',
        correct: false,
        wrongReason:
          'While a 4x4 would be more appropriate, there is no rule against driving a sedan on a marked trail. No action or warning is needed.',
      },
    ],
    explanation:
      'Callers may exaggerate or misidentify locations. The player was on a designated scenic dirt road, not driving up a cliff face. Always verify the actual terrain and road markings before judging FRP.',
    handbookRef: { chapter: 9, section: '9.3' },
  },
  {
    id: 'ra_invalid_nlr_01',
    evidenceValid: false,
    difficulty: 'medium',
    category: 'judgment',
    modCall: {
      callerName: 'Combat_Medic_01',
      reason: 'The guy I just revived ran straight back to the fight — NLR violation!',
      location: 'Mission Row — Outside Hospital',
    },
    sceneDescription:
      'Player "Revived_Fighter_55" was just revived by EMS outside the hospital. They are now heading toward Mission Row Police Station, where a shootout occurred 10 minutes ago. The medic claims this is an NLR violation.',
    videoEvidence: {
      summary:
        'The hospital security camera shows "Revived_Fighter_55" being revived by the medic. After revival, they stand up, check their equipment, and then jog away from the hospital. They head in the general direction of Mission Row, but their path diverges — they turn toward the gun store, not the police station where the shootout occurred. The kill feed confirms the shootout at Mission Row ended 10 minutes ago with no active shots fired. The player was dead for 5 minutes before revival.',
    },
    options: [
      {
        id: 'a',
        text: 'No action — no NLR violation',
        correct: true,
        command: 'N/A',
      },
      {
        id: 'b',
        text: 'Warn the player for NLR',
        correct: false,
        wrongReason:
          'The player was dead for 5 minutes, revived, and headed toward a different location (gun store), not the active scenario. The shootout had also ended. No NLR violation.',
      },
      {
        id: 'c',
        text: 'Kick for NLR — 2nd offence',
        correct: false,
        wrongReason:
          'Not only is this not an NLR violation, there is no prior record. A kick would be completely unwarranted.',
      },
      {
        id: 'd',
        text: 'Verbal warning to avoid the area',
        correct: false,
        wrongReason:
          'No warning is needed. Sufficient time passed, the scenario ended, and the player went to a different location than their death scene.',
      },
    ],
    explanation:
      'NLR requires returning to the exact death location during an active scenario. If sufficient time has passed, the scenario has ended, or the player goes to a different area, it is not a violation. Medics may be over-eager to report NLR.',
    handbookRef: { chapter: 9, section: '9.3' },
  },
  {
    id: 'ra_invalid_gta_01',
    evidenceValid: false,
    difficulty: 'easy',
    category: 'judgment',
    modCall: {
      callerName: 'Vehicle_Owner_42',
      reason: 'Someone just stole my car from the parking lot!',
      location: 'Del Perro Pier — Public Parking',
    },
    sceneDescription:
      'Player "Borrower_25" is driving a sports car away from the Del Perro Pier parking lot. The owner, "Vehicle_Owner_42", is standing in the lot shouting that their car was stolen. The car was parked in a public lot.',
    videoEvidence: {
      summary:
        'The pier security camera shows "Vehicle_Owner_42" standing next to their sports car having a conversation with "Borrower_25". The owner gestures toward the car, nods, and walks away while "Borrower_25" gets into the driver\'s seat. The owner is seen on camera saying "yeah take it" (confirmed via lip-reading sync with audio logs) before walking toward the pier entrance. The car starts and drives away normally.',
    },
    options: [
      {
        id: 'a',
        text: 'No action — consent was given',
        correct: true,
        command: 'N/A',
      },
      {
        id: 'b',
        text: 'Warn the driver for GTA',
        correct: false,
        wrongReason:
          'The owner explicitly gave permission to take the car. There is no theft when consent is granted.',
      },
      {
        id: 'c',
        text: 'Kick the driver for GTA',
        correct: false,
        wrongReason:
          'A kick requires clear GTA Driving — taking a vehicle without permission. The evidence shows the owner agreed.',
      },
      {
        id: 'd',
        text: 'Tell the owner to report it via !mod if stolen',
        correct: false,
        wrongReason:
          'The car was not stolen — it was lent with permission. The caller filed a false !mod report.',
      },
    ],
    explanation:
      'The caller reported a stolen vehicle, but the evidence shows they gave explicit permission. Always check video evidence before taking action — callers may file false reports out of confusion or frustration.',
    handbookRef: { chapter: 9, section: '9.3' },
  },
]

// ── Mock Data ──────────────────────────────────────────────────────────────────

export const MOCK_USERS = [
  'Killer_X99', 'Speedy_Racer42', 'ShadowCop_LC', 'NoobMaster2007',
  'xXFastBoyXx', 'GTA_Enjoyer', 'RP_King_01', 'ChaoticNeutral',
  'DriftKing_LC', 'SilentTrooper', 'BountyHunter99', 'RoadRage_Pro',
  'CivilianJoe', 'TacticalOwl', 'NightHawk_LC', 'PixelBandit',
  'TurboVandal', 'CopBlockr', 'SpeedDemon_X', 'GhostRider_LC',
  'RogueElement', 'BlazeFury', 'StealthOps', 'UrbanRaider',
]

export const RP_TYPES = [
  { key: 'hostage', label: 'Hostage', plural: 'hostage' },
  { key: 'roadwork', label: 'Roadwork', plural: 'roadwork' },
  { key: 'border', label: 'Border', plural: 'border' },
  { key: 'traffic_stop', label: 'Traffic Stop', plural: 'traffic stop' },
  { key: 'warrant', label: 'Warrant', plural: 'warrant' },
  { key: 'welfare', label: 'Welfare Check', plural: 'welfare check' },
]

const LOCATIONS = [
  'Prison, Cell Block A', 'Hospital, Emergency Wing', 'House, P/S 702',
  'Freedom Avenue (Near Civilian Spawn)', 'Highway I-95, Mile 12',
  'Downtown Bank', 'Mountain Lodge', 'Docks, Warehouse 3',
  'City Hall Steps', 'Airport Runway', 'Gas Station, Pump 4',
  'Parking Lot, Mall', 'Subway Station', 'Bridge, North Side',
]

const MODERATORS = ['fried.rice57', 'JusticeWolf', 'AlphaMod_', 'ZenithLC']

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateMockLogs(rpType, includeOngoing) {
  const now = Date.now()
  const HOUR = 3_600_000
  const logs = []

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
    })
  }

  const inactiveCount = Math.floor(Math.random() * 2) + 2
  for (let i = 0; i < inactiveCount; i++) {
    const startTime = new Date(now - Math.floor(Math.random() * 72 * HOUR))
    const endTime = new Date(startTime.getTime() + Math.floor(Math.random() * 3600_000 + 600_000))
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
    })
  }

  return shuffleArray(logs)
}

function buildLogDialog(logs, rpType) {
  if (logs.length === 0) {
    return `# No Ongoing ${rpType.label} Roleplays\n\nThere are currently no active ${rpType.plural} roleplays logged in the system.`
  }

  const lines = logs.map(l => {
    const status = l.active
      ? `**Started:** ${l.started} **Ends:** ${l.ends} *(Active)*`
      : `**Started:** ${l.started} **Ended:** ${l.ended}`
    return `# Roleplay Logged\n**Player:** ${l.player}\n**Type:** ${l.type}\n**Location:** ${l.location}\n**Duration:** ${l.duration}\n**Quick Kill:** ${l.quickKill}\n**Moderator:** ${l.moderator}\n${status}`
  })

  const header = logs.some(l => l.active)
    ? `# ${rpType.label} Roleplay Status\n\nThere ${logs.filter(l => l.active).length === 1 ? 'is' : 'are'} currently **${logs.filter(l => l.active).length} active ${rpType.plural} roleplay(s):`
    : `# No Active ${rpType.label} Roleplays\n\nThere are no ongoing ${rpType.plural} roleplays at this time.`

  return `${header}\n\n${lines.join('\n\n')}`
}

// ── RP‑log Scenario Generator ─────────────────────────────────────────────────

export function generateRpLogScenario(seedIndex) {
  const offender = pick(MOCK_USERS)
  const requester = pick(MOCK_USERS.filter(u => u !== offender))
  const rpType = pick(RP_TYPES)
  const location = pick(LOCATIONS)
  const hasOngoing = Math.random() > 0.35
  const logs = generateMockLogs(rpType, hasOngoing)
  const logDialog = buildLogDialog(logs, rpType)

  return {
    id: `rl_gen_${seedIndex}_${Date.now()}`,
    type: 'rp-log',
    evidenceValid: true,
    difficulty: 'medium',
    category: 'roleplay_logging',
    offender,
    requester,
    rpType,
    hasOngoing,
    logs,
    logDialog,
    modCall: {
      callerName: requester,
      reason: `Hey staff, I want to do a ${rpType.label.toLowerCase()} RP near ${location}. Can you give permission?`,
      location,
    },
    sceneDescription: `A player (${requester}) is requesting permission to start a ${rpType.label.toLowerCase()} roleplay scenario. They claim the RP is planned and they have participants ready. Your job is to follow the proper roleplay logging procedure: ask for details, check the logs for ongoing RPs, and either approve or deny based on whether there's already an active ${rpType.label.toLowerCase()} scenario.`,
    videoEvidence: {
      summary: `The server chat log shows ${requester} typing "!mod" and requesting a ${rpType.label.toLowerCase()} RP. They mention having 3-4 friends ready to participate. A quick check of the mod channel shows no prior ${rpType.plural.toLowerCase()} RP activity reported in the last 2 hours for this area.`,
    },
    options: [
      {
        id: 'a',
        text: 'Log the RP without checking logs (quick approval)',
        correct: false,
        wrongReason: `You must check for ongoing ${rpType.plural} roleplays before approving a new one. Failing to check logs can result in overlapping RPs and scene interference.`,
        command: 'N/A',
      },
      {
        id: 'b',
        text: hasOngoing
          ? `Inform ${requester} there is already an active ${rpType.label} RP — ask them to wait`
          : `Log the RP — no conflicting ${rpType.label} RPs found`,
        correct: true,
        command: hasOngoing ? 'N/A' : ';log_rp',
      },
      {
        id: 'c',
        text: 'Ask for more detail then decide',
        correct: false,
        wrongReason: `Asking for more details is good practice, but you still need to check the logs before making a final decision. The correct procedure is: ask for details → check logs → approve/deny.`,
        command: 'N/A',
      },
    ],
    explanation: hasOngoing
      ? `An active ${rpType.label.toLowerCase()} RP was already logged in the system. Logging a new one would cause scene interference. The correct response was to inform ${requester} to wait until the current ${rpType.label.toLowerCase()} RP concludes.`
      : `No conflicting ${rpType.plural.toLowerCase()} roleplays were found. The RP was properly logged. The correct command for logging roleplays is ;log_rp followed by the RP details.`,
    handbookRef: { chapter: 11, section: '11.2' },
  }
}

// ── P‑log Scenario Generator ───────────────────────────────────────────────────

export const P_LOG_TEMPLATES = [
  {
    id: 'gen_pl_rdm', offense: 'RDM', correctPunishment: 'Warn', correctReason: 'RDM - First Offence',
    text: '{offender} is randomly killing players near the city center. Process the punishment and log it in melonly.',
  },
  {
    id: 'gen_pl_vdm', offense: 'VDM', correctPunishment: 'Warn', correctReason: 'VDM - First Offence',
    text: '{offender} is running over pedestrians with a vehicle near civilian spawn. Process the punishment and log it in melonly.',
  },
  {
    id: 'gen_pl_frp', offense: 'FRP', correctPunishment: 'Warn', correctReason: 'FRP - First Offence',
    text: '{offender} is clearly failing to roleplay — driving up vertical walls and ignoring RP scenarios. Process the punishment and log it in melonly.',
  },
  {
    id: 'gen_pl_cuff_rush', offense: 'Cuff Rushing', correctPunishment: 'Kick', correctReason: 'Cuff Rushing - First Offence',
    text: '{offender} is rushing into arrest animations and interrupting cuffing. Process the punishment and log it in melonly.',
  },
  {
    id: 'gen_pl_ltap', offense: 'LTAP', correctPunishment: 'Ban', correctReason: 'LTAP - First Offence (Bannable)',
    text: '{offender} disconnected immediately after being warned to avoid further punishment. Process and log in melonly.',
  },
  {
    id: 'gen_pl_mass_vdm', offense: 'Mass VDM', correctPunishment: 'Ban', correctReason: 'Mass VDM - Obvious Trolling',
    text: '{offender} is intentionally running over multiple players in a row on the highway. Process and log in melonly.',
  },
  {
    id: 'gen_pl_exploit', offense: 'Exploiting', correctPunishment: 'Ban', correctReason: 'Exploiting / Third-party Software',
    text: '{offender} was reported flying through walls and speedhacking. Process the punishment and log it in melonly.',
  },
  {
    id: 'gen_pl_metagaming', offense: 'Metagaming', correctPunishment: 'Warn', correctReason: 'Metagaming - First Offence',
    text: '{offender} keeps showing up to ambush points with no in-character way of knowing officer positions. Process the punishment and log it in melonly.',
  },
  {
    id: 'gen_pl_nlr', offense: 'NLR', correctPunishment: 'Warn', correctReason: 'NLR - First Offence',
    text: '{offender} was revived by EMS and immediately ran back to the exact location of their death. Process the punishment and log it in melonly.',
  },
  {
    id: 'gen_pl_staff_disrespect', offense: 'Staff Disrespect', correctPunishment: 'Warn', correctReason: 'Staff Disrespect - First Offence',
    text: '{offender} is verbally abusing a staff member in OOC chat during a traffic stop. Process the punishment and log it in melonly.',
  },
]

export function generatePLogScenario(seedIndex) {
  const offender = pick(MOCK_USERS)
  const template = pick(P_LOG_TEMPLATES)
  const location = pick(LOCATIONS)

  return {
    id: `pl_gen_${seedIndex}_${Date.now()}`,
    type: 'p-log',
    evidenceValid: true,
    difficulty: 'medium',
    category: 'punishment_logging',
    offender,
    offense: template.offense,
    correctPunishment: template.correctPunishment,
    correctReason: template.correctReason,
    modCall: {
      callerName: pick(MOCK_USERS.filter(u => u !== offender)),
      reason: template.text.replace('{offender}', offender),
      location,
    },
    sceneDescription: `You have been dispatched to handle a report involving "${offender}". ${template.text.replace('{offender}', offender)} You need to open the melonly punishment logging form, identify the correct player, select the appropriate punishment level, and provide the correct reason.`,
    videoEvidence: {
      summary: `The server replay confirms ${offender} committing the reported violation. Chat logs, kill feed, and spectator footage all corroborate the report. The evidence is clear and requires formal action through the melonly system.`,
    },
    options: [
      { id: 'a', text: 'Open melonly form and log punishment', correct: true, command: `;${template.offense.toLowerCase().replace(/\s+/g, '_')}` },
      { id: 'b', text: 'Issue a verbal warning only', correct: false, wrongReason: 'This offence requires a formal written warning logged via melonly, not a verbal warning.', command: 'N/A' },
      { id: 'c', text: 'Kick the player without logging', correct: false, wrongReason: 'All punishments must be logged in melonly for record-keeping. Kicking without logging bypasses the audit trail.', command: 'N/A' },
    ],
    explanation: `The correct punishment for first-offence ${template.offense} is a ${template.correctPunishment}. The reason should be "${template.correctReason}". All punishments must be logged via melonly for proper record-keeping and audit trails.`,
    handbookRef: { chapter: 9, section: '9.1' },
  }
}

// ── Pool Distribution ──────────────────────────────────────────────────────────

export const RIDEALONG_POOL = {
  RP_LOG: 3,
  P_LOG: 3,
  STANDARD: 4,
}
