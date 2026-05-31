export const SCENARIO_BANK = [
  {
    "id": "ra_rdm_01",
    "evidenceValid": true,
    "difficulty": "easy",
    "category": "punishments",
    "modCall": {
      "callerName": "Civilian_Sarah",
      "reason": "This player keeps killing people for no reason!",
      "location": "City Center — Main Street"
    },
    "sceneDescription": "You teleport to City Center and find player \"xX_Slayer_Xx\" standing over two dead bodies near the intersection. The kill feed confirms they killed \"Civilian_Sarah\" and \"John_Doe_99\" within 30 seconds of each other. No chat messages were sent between the kills. A quick check shows this player has no prior moderation record.",
    "videoEvidence": {
      "summary": "A clip submitted by \"Civilian_Sarah\" shows \"xX_Slayer_Xx\" approaching her at a crosswalk. No chat, no RP — they just pull out a pistol and shoot. Then they turn and shoot \"John_Doe_99\" standing nearby. Zero roleplay before either kill."
    },
    "explanation": "RDM (Random Death Match) starts as a Warning for the first offence, then escalates to Kick, then Ban. The correct command is ;rdm. All formal warnings must be logged via Melonly.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "xX_Slayer_Xx",
    "correctPunishment": "Warn",
    "correctReason": "RDM - First Offence",
    "offenseKeywords": ["rdm", "random deathmatch", "random dm", "random death match"]
  },
  {
    "id": "ra_vdm_01",
    "evidenceValid": true,
    "difficulty": "easy",
    "category": "punishments",
    "modCall": {
      "callerName": "Driver_Mike",
      "reason": "Some guy just ran over my friend on purpose!",
      "location": "Highway 12 — Northbound"
    },
    "sceneDescription": "You arrive on Highway 12 and see player \"Speed_Demon_22\" doing donuts in a yellow sports car near a body on the ground. The kill feed shows \"Speed_Demon_22\" ran over \"Driver_Mike\" twice in the same spot. The driver has no prior moderation history on record.",
    "videoEvidence": {
      "summary": "A clip from \"Driver_Mike\" shows \"Speed_Demon_22\" in a yellow sports car swerving off the road onto the sidewalk to hit them, then circling back and running them over a second time. No brake lights, no attempt to avoid — intentional."
    },
    "explanation": "VDM (Vehicle Death Match) follows the same escalation as RDM: Warning → Kick → Ban. First offence = Warning. Command: ;vdm.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Speed_Demon_22",
    "correctPunishment": "Warn",
    "correctReason": "VDM - First Offence",
    "offenseKeywords": ["vdm", "vehicle deathmatch", "vehicle dm", "vehicle death match"]
  },
  {
    "id": "ra_frp_01",
    "evidenceValid": true,
    "difficulty": "easy",
    "category": "punishments",
    "modCall": {
      "callerName": "Deputy_James",
      "reason": "Suspect is ignoring commands and driving up mountains!",
      "location": "West Mountain Trail"
    },
    "sceneDescription": "You find player \"Mountain_Goat_7\" driving a sedan nearly vertically up the side of a mountain. The vehicle is somehow maintaining traction on a 70-degree rock face. No trail or road is anywhere nearby. This player has a prior warning for FRP on record.",
    "videoEvidence": {
      "summary": "A clip from \"Deputy_James\" shows \"Mountain_Goat_7\" driving a sedan straight up a near-vertical rock face on the mountain. The car clips through rocks and keeps going uphill where no vehicle should be able to drive. They reach the top and drive off the other side — no crash, no flip."
    },
    "explanation": "FRP (Fail Roleplay) escalation: Warning → Kick → Ban. With a prior warning on record, this is a 2nd offence = Kick. Command: ;frp.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Mountain_Goat_7",
    "correctPunishment": "Kick",
    "correctReason": "FRP - 2nd Offence",
    "offenseKeywords": ["frp", "fail rp", "failing rp", "fail roleplay"]
  },
  {
    "id": "ra_nlr_01",
    "evidenceValid": true,
    "difficulty": "medium",
    "category": "punishments",
    "modCall": {
      "callerName": "Medic_Tom",
      "reason": "The guy I just revived ran right back to where he died!",
      "location": "Davis PD — Front Parking Lot"
    },
    "sceneDescription": "Player \"Respawn_King_94\" was killed in a shootout in the Davis PD parking lot 3 minutes ago. They have just been revived by EMS and are now sprinting back toward the same parking lot where the shootout is still active. Their prior record shows a Warning for NLR already logged.",
    "videoEvidence": {
      "summary": "A clip from \"Medic_Tom\" shows \"Respawn_King_94\" getting revived at the hospital, then immediately sprinting straight back to the Davis PD parking lot — the exact spot they died. The shootout is still going. They pull out a weapon and re-engage the same people who killed them."
    },
    "explanation": "NLR (New Life Rule) prevents returning to your death location to rejoin a scenario. Escalation: Warning → Kick → Ban. 2nd offence = Kick. Command: ;nlr.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Respawn_King_94",
    "correctPunishment": "Kick",
    "correctReason": "NLR - 2nd Offence",
    "offenseKeywords": ["nlr", "new life rule"]
  },
  {
    "id": "ra_gta_01",
    "evidenceValid": true,
    "difficulty": "easy",
    "category": "punishments",
    "modCall": {
      "callerName": "Traffic_Cop_01",
      "reason": "Some guy just stole a parked car and drove through a store!",
      "location": "Downtown — 24/7 Supermarket"
    },
    "sceneDescription": "Player \"Car_Thief_88\" is sitting inside a police cruiser that has crashed through the front window of the 24/7 supermarket. The cruiser was parked and locked at the scene of an active traffic stop. The player has no prior offences recorded.",
    "videoEvidence": {
      "summary": "A clip shows \"Car_Thief_88\" approaching a parked police cruiser (lights off, active traffic stop nearby). They get in (hotwire animation plays), reverse, then floor it through the front window of the store. They try to drive out through the back wall."
    },
    "explanation": "GTA Driving covers vehicle theft and reckless operation. Escalation: Warning → Kick → Ban. First offence = Warning. Command: ;gta.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Car_Thief_88",
    "correctPunishment": "Warn",
    "correctReason": "GTA Driving - First Offence",
    "offenseKeywords": ["gta", "gta driving", "grand theft auto"]
  },
  {
    "id": "ra_cuff_01",
    "evidenceValid": true,
    "difficulty": "medium",
    "category": "punishments",
    "modCall": {
      "callerName": "Officer_Riley",
      "reason": "Suspect is rushing me while I'm trying to arrest someone else!",
      "location": "Beach Boardwalk"
    },
    "sceneDescription": "An officer is attempting to arrest \"Arrest_Target_42\" when player \"Cuff_Rusher_99\" runs directly into the arrest zone, spamming the handcuff key to interrupt the arrest animation. They are not involved in the scenario. This player has no prior offences.",
    "videoEvidence": {
      "summary": "A clip from \"Officer_Riley\" shows them cuffing \"Arrest_Target_42\" when \"Cuff_Rusher_99\" sprints in from off-screen. They run straight into the arrest interaction and spam the interact key, cancelling the cuff animation repeatedly. The officer tells them to back off three times — they ignore it."
    },
    "explanation": "Cuff Rushing is a Kick on first offence, then Ban on second. There is no Warning step. Command: ;cuff or ;cuff_rushing.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Arrest_Target_42",
    "correctPunishment": "Kick",
    "correctReason": "Cuff Rushing - First Offence",
    "offenseKeywords": ["cuff rushing", "cuff rush", "cuff_rushing"]
  },
  {
    "id": "ra_trolling_01",
    "evidenceValid": true,
    "difficulty": "easy",
    "category": "punishments",
    "modCall": {
      "callerName": "Player_Steve",
      "reason": "Some guy keeps following me and blasting the airhorn!",
      "location": "Beach Boardwalk"
    },
    "sceneDescription": "Player \"Troll_Master_X\" is following random players around the beach boardwalk while repeatedly blasting an airhorn sound effect and spamming the laugh emote. They have ignored three verbal requests to stop from other players. No prior record.",
    "videoEvidence": {
      "summary": "A clip shows \"Troll_Master_X\" circling the boardwalk for 5 minutes straight. They blast an airhorn next to each player, spam the laugh emote, then move to the next person. Multiple people in chat are telling them to stop. They just say \"lol\" and keep going."
    },
    "explanation": "Trolling is a Kick on first offence, then Ban on second. There is no Warning step. Command: ;trolling or ;troll.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Troll_Master_X",
    "correctPunishment": "Kick",
    "correctReason": "Trolling - First Offence",
    "offenseKeywords": ["trolling", "troll", "disruptive behavior"]
  },
  {
    "id": "ra_staff_disrespect_01",
    "evidenceValid": true,
    "difficulty": "medium",
    "category": "punishments",
    "modCall": {
      "callerName": "Moderator_Kim",
      "reason": "I need backup — player is cussing me out in /ooc",
      "location": "Server-wide (OOC Chat)"
    },
    "sceneDescription": "Player \"Angry_Gamer_42\" is using OOC chat to verbally abuse moderator \"Moderator_Kim\" who pulled them over for speeding. In chat you can see repeated profanity, personal insults, and refusal to cooperate with the traffic stop. This player has a prior Warning for Staff Disrespect on record.",
    "videoEvidence": {
      "summary": "A clip from \"Moderator_Kim\" shows the exchange: They pull over \"Angry_Gamer_42\" for speeding. The player immediately types in OOC: \"bro shut up\", \"this is so stupid\", \"you're just mad bc ur power trip\". When asked to cooperate, they escalate to personal insults and profanity. Goes on for 2 minutes straight."
    },
    "explanation": "Staff Disrespect escalation: Warning → Kick → Ban. With a prior Warning, this is a 2nd offence = Kick. Command: ;sd or ;staff_disrespect.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Angry_Gamer_42",
    "correctPunishment": "Kick",
    "correctReason": "Staff Disrespect - 2nd Offence",
    "offenseKeywords": ["staff disrespect", "sd", "staff dis"]
  },
  {
    "id": "ra_nitrp_01",
    "evidenceValid": true,
    "difficulty": "medium",
    "category": "punishments",
    "modCall": {
      "callerName": "Trucker_Bob",
      "reason": "Guy at the gas station is just standing there doing nothing — been 10 minutes!",
      "location": "Gas Station — Route 66"
    },
    "sceneDescription": "Player \"AFK_Andy_77\" is standing at the gas station pumps. They have been logged in for 45 minutes and have not moved, typed a single message in chat, or interacted with any player or vehicle. They respond to attempts at RP with silence.",
    "videoEvidence": {
      "summary": "\"AFK_Andy_77\" spawned in at the gas station 45 minutes ago and has not moved from the exact spot. Multiple players walk up and try to start RP — \"You need something?\", \"Hey man you blocking the pump\". No response in any chat channel. Not even a movement or emote."
    },
    "explanation": "NITRP (No Intent to Roleplay) is Kick on first offence, then Ban. Players must actively participate in the roleplay environment. Command: ;nitrp, ;nointent, or ;no-intent.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "AFK_Andy_77",
    "correctPunishment": "Kick",
    "correctReason": "NITRP - First Offence",
    "offenseKeywords": ["nitrp", "no intent to roleplay", "no intent"]
  },
  {
    "id": "ra_abusing_mod_01",
    "evidenceValid": true,
    "difficulty": "hard",
    "category": "punishments",
    "modCall": {
      "callerName": "Player_Jane",
      "reason": "I keep getting false !mod calls placed on me",
      "location": "Report via staff chat"
    },
    "sceneDescription": "Investigation reveals that player \"False_Flag_007\" has placed 12 !mod calls in the past hour, all targeting the same player \"Player_Jane\" with fabricated reasons like \"rdm\" and \"vdm\" that were investigated and found to be false each time. Staff confirmed no rule was broken. This player has no prior record.",
    "videoEvidence": {
      "summary": "The !mod call history shows \"False_Flag_007\" called !mod twelve times in 60 minutes, each time reporting \"Player_Jane\" for various offences. Staff responded to every call — no evidence found each time. Between calls, \"False_Flag_007\" is roleplaying normally. They are clearly abusing the system to harass another player."
    },
    "explanation": "Abusing the !mod system is a unique escalation: Verbal Warning → Warning → Kick > Ban. First offence = Verbal Warning. Command: ;abusing_mod or ;abuse_mod.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "False_Flag_007",
    "correctPunishment": "Warn",
    "correctReason": "Abusing !mod - First Offence",
    "offenseKeywords": ["abusing mod", "abusing !mod", "abuse mod", "false mod"]
  },
  {
    "id": "ra_safezone_01",
    "evidenceValid": true,
    "difficulty": "medium",
    "category": "punishments",
    "modCall": {
      "callerName": "Security_Cam",
      "reason": "Shots fired at the Police Station spawn!",
      "location": "Police Station — Front Entrance"
    },
    "sceneDescription": "Player \"Rogue_Cop_Killer\" is engaging in a shootout directly in front of the Police Station spawn area. This is a designated safe zone where violent criminal activity is strictly prohibited. Two other players who just spawned are caught in the crossfire. No prior record.",
    "videoEvidence": {
      "summary": "A clip shows \"Rogue_Cop_Killer\" waiting outside the police station spawn doors. As soon as someone spawns and walks out, they open fire. The first victim never had a chance. A second player who spawns moments later gets shot too. The shooter then runs into the lobby to reload."
    },
    "explanation": "Safezone RDM/VDM is a Kick on first offence, Ban on second. Safe zones are strictly protected areas. Command: ;safezone.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Rogue_Cop_Killer",
    "correctPunishment": "Kick",
    "correctReason": "Safezone RDM/VDM - First Offence",
    "offenseKeywords": ["safezone rdm", "safezone vdm", "safezone"]
  },
  {
    "id": "ra_mass_vdm_01",
    "evidenceValid": true,
    "difficulty": "hard",
    "category": "punishments",
    "modCall": {
      "callerName": "911_Dispatcher",
      "reason": "Multiple casualties reported on the highway — one driver hitting everyone!",
      "location": "Highway 12 — Southbound Near Exit 5"
    },
    "sceneDescription": "Player \"Road_Rage_666\" has been driving up and down Highway 12 for 10 minutes, deliberately swerving to hit every player they pass. The kill feed shows 7 unique victims. They are currently doing a U-turn to make another pass. No prior record.",
    "videoEvidence": {
      "summary": "A clip shows \"Road_Rage_666\" in a black pickup driving south on Highway 12, swerving into oncoming traffic to hit people. They reach the end, do a U-turn, and drive back north hitting more. 7 confirmed hits in the clip. They just keep going."
    },
    "explanation": "Mass VDM/RDM (obvious trolling with multiple victims) is an immediate Ban on first offence. No escalation steps. Command: ;mass_vdm.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Road_Rage_666",
    "correctPunishment": "Ban",
    "correctReason": "Mass VDM - Obvious Trolling",
    "offenseKeywords": ["mass vdm", "mass rdm", "obvious trolling"]
  },
  {
    "id": "ra_rtap_01",
    "evidenceValid": true,
    "difficulty": "hard",
    "category": "punishments",
    "modCall": {
      "callerName": "Arresting_Officer",
      "reason": "Suspect reset their character mid-arrest!",
      "location": "Mission Row — Back Alley"
    },
    "sceneDescription": "Officer was in the process of handcuffing player \"Escape_Artist_55\" after a felony stop. The suspect was at 60% cuff animation progress when a notification shows they left the game and rejoined 10 seconds later, spawning across the map with no cuffs and clean inventory.",
    "videoEvidence": {
      "summary": "A clip from the arresting officer shows the cuff animation at 60%. \"Escape_Artist_55\" is against the wall, hands behind back — then the model suddenly vanishes. Disconnect notice pops up. 10 seconds later they're back, spawning at the hospital with no cuffs, no items taken. They immediately start running."
    },
    "explanation": "RTAP (Reset to Avoid Punishment) is an immediate Ban on first offence. Players cannot reset to escape consequences. Command: ;rtap.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Escape_Artist_55",
    "correctPunishment": "Ban",
    "correctReason": "RTAP - First Offence (Bannable)",
    "offenseKeywords": ["rtap", "reset to avoid punishment", "reset avoid"]
  },
  {
    "id": "ra_ltap_01",
    "evidenceValid": true,
    "difficulty": "hard",
    "category": "punishments",
    "modCall": {
      "callerName": "Pursuit_Unit_7",
      "reason": "Suspect just disconnected in the middle of a chase!",
      "location": "Downtown"
    },
    "sceneDescription": "Player \"Disconnect_Pro_23\" was in a high-speed police pursuit. After 3 minutes of chase, just as spike strips were deployed ahead, the player's connection dropped. They have not rejoined. The chase involved 4 units and reached speeds of 120 mph.",
    "videoEvidence": {
      "summary": "A clip from the pursuing unit shows the chase through town. The suspect is driving recklessly through residential streets. Just as ground units coordinate a spike strip ahead, the suspect vehicle suddenly freezes and despawns — no crash, no driver exit. Disconnect notice confirms manual leave, not a crash."
    },
    "explanation": "LTAP (Leaving to Avoid Punishment) is an immediate Ban on first offence. Disconnecting to escape a scenario is strictly prohibited. Command: ;ltap or ;leave_avoid.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Disconnect_Pro_23",
    "correctPunishment": "Ban",
    "correctReason": "LTAP - First Offence (Bannable)",
    "offenseKeywords": ["ltap", "leaving to avoid punishment", "leave avoid", "disconnect avoid"]
  },
  {
    "id": "ra_nsfw_01",
    "evidenceValid": true,
    "difficulty": "hard",
    "category": "punishments",
    "modCall": {
      "callerName": "Parent_Player",
      "reason": "Someone is putting inappropriate things in their bio",
      "location": "Player Profile"
    },
    "sceneDescription": "Player \"Inappropriate_69\" has set their in-game profile description to explicit content visible to all players on the server. Multiple players have reported it. The content is sexually explicit and violates Discord Terms of Service as well as server rules.",
    "videoEvidence": {
      "summary": "Screenshots from multiple players show \"Inappropriate_69\"'s profile description containing explicit sexual content. The text is clearly visible to any player who opens the profile. The player has been online for over 2 hours since setting it."
    },
    "explanation": "NSFW (Not Safe for Work) is an immediate Ban on first offence and is explicitly listed as \"Not appealable\". Command: ;nsfw.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Inappropriate_69",
    "correctPunishment": "Ban",
    "correctReason": "NSFW - First Offence (Bannable)",
    "offenseKeywords": ["nsfw", "not safe for work", "inappropriate content", "explicit"]
  },
  {
    "id": "ra_staff_impersonation_01",
    "evidenceValid": true,
    "difficulty": "hard",
    "category": "punishments",
    "modCall": {
      "callerName": "Real_Staff_John",
      "reason": "Someone is pretending to be staff and threatening to ban players!",
      "location": "City Wide"
    },
    "sceneDescription": "Player \"Fake_Admin_007\" is going around telling players they are a moderator and threatening to ban them unless they \"pay a fine\" in in-game currency. They are using a name similar to a real staff member and have changed their uniform to resemble the staff outfit.",
    "videoEvidence": {
      "summary": "Multiple player reports show \"Fake_Admin_007\" approaching players and saying \"I'm a mod, you need to pay me $5,000 or I'll ban you\". They're wearing a modified outfit that looks like the staff uniform. When confronted by a real staff member, they claim \"I'm undercover\" and try to run away."
    },
    "explanation": "Staff Impersonation is an immediate Ban on first offence. Pretending to be staff and using that to threaten or scam players is a zero-tolerance violation. Command: ;staff_impersonation.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Fake_Admin_007",
    "correctPunishment": "Ban",
    "correctReason": "Staff Impersonation - First Offence (Bannable)",
    "offenseKeywords": ["staff impersonation", "impersonating staff", "impersonation"]
  },
  {
    "id": "ra_hacking_01",
    "evidenceValid": true,
    "difficulty": "hard",
    "category": "punishments",
    "modCall": {
      "callerName": "Player_Mike",
      "reason": "A player is flying around the map and shooting through walls!",
      "location": "City Hall"
    },
    "sceneDescription": "Player \"Cheater_Boi_99\" is hovering 50 feet above City Hall, shooting players on the ground below through walls and obstacles. Multiple players in the kill feed are dying to them with no line of sight. They have 15 kills in under 3 minutes.",
    "videoEvidence": {
      "summary": "A clip from a player on the ground shows \"Cheater_Boi_99\" floating 50 feet above City Hall. They're moving in every direction — up, down, left, right — with no jetpack animation. Their weapon is firing through the solid roof and hitting people inside. Every shot tracks through walls with perfect accuracy."
    },
    "explanation": "Cheating/Exploiting is an immediate Ban on first offence marked as \"Not appealable\". No warnings or kicks. Command: ;hacking or ;cheating.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Cheater_Boi_99",
    "correctPunishment": "Ban",
    "correctReason": "Cheating - First Offence (Bannable)",
    "offenseKeywords": ["cheating", "hacking", "exploiting", "exploit", "cheat"]
  },
  {
    "id": "ra_tool_abuse_01",
    "evidenceValid": true,
    "difficulty": "medium",
    "category": "punishments",
    "modCall": {
      "callerName": "IA_Observer",
      "reason": "Staff member is spawning vehicles and abusing admin tools",
      "location": "Staff Parking"
    },
    "sceneDescription": "Staff member \"Rogue_Mod_42\" (off-duty) is using admin tools to spawn high-end vehicles for themselves and their friends. They are not on duty and have no supervisory approval for tool use. They have spawned 4 vehicles in the past 15 minutes.",
    "videoEvidence": {
      "summary": "The video clip shows \"Rogue_Mod_42\" using vehicle spawn commands while off-duty. They spawn a Cheetah, then a T20, then an Osiris — each time giving the vehicle to a different friend. They then spawn a fourth vehicle for themselves and begin driving around. No supervisory approval is logged for any of these actions."
    },
    "explanation": "Tool Abuse escalation: Kick → Ban → Ban. Staff using admin tools off-duty or without authorization is a Kick on first offence. Command: ;ta or ;tool.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Rogue_Mod_42",
    "correctPunishment": "Kick",
    "correctReason": "Tool Abuse - First Offence",
    "offenseKeywords": ["tool abuse", "abusing tools", "abusing mod tools", "admin tool abuse", "ta"]
  },
  {
    "id": "ra_unrealistic_avatar_01",
    "evidenceValid": true,
    "difficulty": "easy",
    "category": "punishments",
    "modCall": {
      "callerName": "RP_Enforcer",
      "reason": "A player is using a giant banana costume — breaks immersion!",
      "location": "City Walk"
    },
    "sceneDescription": "Player \"Meme_King_00\" is running around Liberty County in a giant banana costume. The model is oversized, bright yellow, clips through doorways. Multiple players have complained that it kills the server's realism.",
    "videoEvidence": {
      "summary": "A clip shows \"Meme_King_00\" in a giant banana costume — twice the width and height of a normal player model. They walk through doors and the banana clips through the doorframe. Other players stop and stare. In chat, people are saying \"bro is a banana lmao\" and \"this ruins the vibe\"."
    },
    "explanation": "Unrealistic Avatar escalation: Kick → Ban. First offence = Kick. Command: ;unrealistic or ;avatar.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Meme_King_00",
    "correctPunishment": "Kick",
    "correctReason": "Unrealistic Avatar - First Offence",
    "offenseKeywords": ["unrealistic avatar", "unrealistic", "avatar", "immersion"]
  },
  {
    "id": "ra_metagaming_01",
    "evidenceValid": true,
    "difficulty": "medium",
    "category": "punishments",
    "modCall": {
      "callerName": "Detective_Rodriguez",
      "reason": "Suspect keeps knowing where we are before we arrive",
      "location": "Hideout — Paleto Bay"
    },
    "sceneDescription": "During a covert narcotics operation, player \"Omniscient_99\" has consistently known exactly where undercover officers are positioned, despite having no in-game line of sight or communication that could reveal their locations. They have avoided three separate ambush points by taking alternate routes at the last second.",
    "videoEvidence": {
      "summary": "The operation replay shows officers setting up ambush positions in concealed locations — behind walls, in buildings, around corners. \"Omniscient_99\" approaches each location, stops exactly at the ambush point, then immediately turns around and takes a different route. They do this three times. On the third attempt, they type in chat \"nice try lmao\" before officers have made any contact."
    },
    "explanation": "Metagaming - using OOC knowledge IG is a Warning on first offense if there is no evidence of external tools. Escalation: Warning → Kick → Ban.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Omniscient_99",
    "correctPunishment": "Warn",
    "correctReason": "Metagaming - First Offence",
    "offenseKeywords": ["metagaming", "meta gaming", "meta", "ooc information"]
  },
  {
    "id": "ra_powergaming_01",
    "evidenceValid": true,
    "difficulty": "hard",
    "category": "punishments",
    "modCall": {
      "callerName": "Robbed_Player",
      "reason": "They took my stuff without giving me a chance to react!",
      "location": "Alley — Downtown"
    },
    "sceneDescription": "Player \"Bully_Boss_42\" approached \"Robbed_Player\" in an alley and instantly took their items using a robbery animation, without any prior roleplay or /me commands. The victim had no opportunity to react or respond before the animation completed.",
    "videoEvidence": {
      "summary": "A clip from \"Robbed_Player\" shows \"Bully_Boss_42\" walking up behind them in an alley. No chat, no /me, nothing — they just start the robbery animation. The whole thing from approach to finish takes 2 seconds. No RP happened."
    },
    "explanation": "Powergaming — forcing outcomes without giving the other player a fair chance to react — is a Kick on first offense, then Ban.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Bully_Boss_42",
    "correctPunishment": "Kick",
    "correctReason": "Powergaming - First Offence",
    "offenseKeywords": ["powergaming", "power gaming", "powergame", "forcing outcomes"]
  },
  {
    "id": "ra_cop_baiting_01",
    "evidenceValid": true,
    "difficulty": "medium",
    "category": "punishments",
    "modCall": {
      "callerName": "Patrol_Unit_3",
      "reason": "Same guy keeps doing donuts in front of the station",
      "location": "Police Station — Front Parking Lot"
    },
    "sceneDescription": "Player \"Bait_Master_11\" has been doing donuts and burnouts in the police station parking lot for 5 minutes straight. Each time officers exit the station, they speed away, circle the block, and return to do more donuts. This is the third time today this specific player has done this.",
    "videoEvidence": {
      "summary": "The police station player submitted video clip shows \"Bait_Master_11\" entering the parking lot and immediately starting donuts around the flagpole. An officer walks out — the player speeds off. 90 seconds later, they return and resume donuts. This cycle repeats 4 times. In between, they are seen driving calmly through the city with no other traffic violations."
    },
    "explanation": "Cop Baiting — intentionally provoking law enforcement into pursuits without valid RP reason — is a Kick on first offense, then Ban.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Bait_Master_11",
    "correctPunishment": "Kick",
    "correctReason": "Cop Baiting - First Offence",
    "offenseKeywords": ["cop baiting", "cop bait", "baiting police", "provoking police"]
  },
  {
    "id": "ra_bypassing_01",
    "evidenceValid": true,
    "difficulty": "medium",
    "category": "punishments",
    "modCall": {
      "callerName": "Chat_Scanner",
      "reason": "Player is typing filtered words with special characters",
      "location": "Global Chat"
    },
    "sceneDescription": "Player \"Filter_Dodger_99\" is using special characters and Unicode substitutes to bypass the chat filter and type profanity in global chat. They have sent 6 messages that clearly spell out banned words using alternative characters (e.g., @ for a, 3 for e).",
    "videoEvidence": {
      "summary": "In chat you can see \"Filter_Dodger_99\" typing messages like \"what a $#!+ty server\" and \"you're all @$$holes\". The filter catches the second message but the first goes through. When warned, they type \"lol filter bad\" and continue with increasingly creative substitutions."
    },
    "explanation": "Bypassing the chat filter using special characters or Unicode substitutes is an immediate Ban on first offence. Command: ;bypassing.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "Filter_Dodger_99",
    "correctPunishment": "Ban",
    "correctReason": "Bypassing - First Offence (Bannable)",
    "offenseKeywords": ["bypassing", "bypass", "filter bypass", "chat bypass"]
  },
  {
    "id": "ra_fear_rp_01",
    "evidenceValid": true,
    "difficulty": "medium",
    "category": "punishments",
    "modCall": {
      "callerName": "Hostage_Taker_Scene",
      "reason": "I had him at gunpoint and he just walked away!",
      "location": "Bank — Interior"
    },
    "sceneDescription": "During a bank robbery scenario, officer had player \"NoFear_007\" at gunpoint with a clear verbal command to freeze. The player ignored the command, turned around, and walked directly toward the officer, forcing the officer to either shoot or let them pass.",
    "videoEvidence": {
      "summary": "A clip from the responding officer shows them entering with weapon drawn, yelling \"FREEZE! GET ON THE GROUND!\" \"NoFear_007\" is 10 feet away, unarmed, clearly visible. They make eye contact, then slowly turn and walk toward the drawn weapon. No hands up, no compliance — just walking forward."
    },
    "explanation": "Fear RP / Value for Life requires realistic self-preservation. Walking toward a drawn weapon violates this. Kick on first offence, Ban on second.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.1"
    },
    "type": "p-log",
    "offender": "NoFear_007",
    "correctPunishment": "Kick",
    "correctReason": "Fear RP / Value for Life - First Offence",
    "offenseKeywords": ["fear rp", "fearrp", "value for life", "vfl", "self preservation"]
  },
  {
    "id": "ra_invalid_rdm_01",
    "evidenceValid": false,
    "difficulty": "medium",
    "category": "judgment",
    "modCall": {
      "callerName": "911_Caller",
      "reason": "I just got RDM'd by \"Player_X\" outside the bank — they shot me for no reason!",
      "location": "Bank of River City — Front Entrance"
    },
    "sceneDescription": "You arrive at the Bank of River City. \"Player_X\" is standing near the entrance with a pistol holstered. \"911_Caller\" is on the ground with low health. The kill feed shows \"Player_X\" killed \"911_Caller\". You can see in chat the caller was mouthing off aggressively before the shooting started.",
    "videoEvidence": {
      "summary": "A clip from \"Player_X\" shows \"911_Caller\" approaching at the entrance and trash-talking in chat: \"what're you looking at\", \"you wanna go?\". \"Player_X\" ignores them and tries to walk inside. \"911_Caller\" pulls out a knife and swings. \"Player_X\" draws their pistol and fires as the knife swing connects. Self-defence — the kill was a response to an initiated physical attack."
    },
    "options": [
      {
        "id": "a",
        "text": "No action — evidence shows self-defence",
        "correct": true,
        "command": "N/A"
      },
      {
        "id": "b",
        "text": "Issue a Warning for RDM",
        "correct": false,
        "wrongReason": "The evidence clearly shows the caller initiated violence by pulling a knife and swinging first. The reported player acted in self-defence, not RDM."
      },
      {
        "id": "c",
        "text": "Kick the player for RDM",
        "correct": false,
        "wrongReason": "No RDM occurred. The caller is the aggressor — punishing the victim of a knife attack would be incorrect."
      },
      {
        "id": "d",
        "text": "Warn both players and move on",
        "correct": false,
        "wrongReason": "Only one player committed a violation (the caller, for initiating violence). The reported player is not at fault."
      }
    ],
    "explanation": "Not every !mod call is valid. The video evidence shows the caller initiated the attack — the reported player fired in self-defence. When evidence contradicts the caller, the correct action is no punishment for the reported player. A verbal warning to the caller about false reports may be warranted, but no formal action.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.3"
    }
  },
  {
    "id": "ra_invalid_vdm_01",
    "evidenceValid": false,
    "difficulty": "medium",
    "category": "judgment",
    "modCall": {
      "callerName": "Pedestrian_Witness",
      "reason": "A red car just ran over my friend on purpose! VDM!",
      "location": "Main Street — Crosswalk"
    },
    "sceneDescription": "You arrive at the crosswalk on Main Street. A red sports car is stopped at the side of the road with front-end damage. A pedestrian is on the ground nearby. The driver, \"Careful_Driver_99\", is standing by their vehicle looking at the scene.",
    "videoEvidence": {
      "summary": "A clip from the scene shows \"Careful_Driver_99\" driving at normal speed with a green light. A pedestrian runs out from between two parked cars — mid-block, not at the crosswalk — right into the vehicle. The driver slams brakes (visible brake lights) but can't stop in time. They immediately pull over and get out to check on the pedestrian."
    },
    "options": [
      {
        "id": "a",
        "text": "No action — pedestrian jaywalked into traffic",
        "correct": true,
        "command": "N/A"
      },
      {
        "id": "b",
        "text": "Warn the driver for VDM",
        "correct": false,
        "wrongReason": "The driver had a green light, was at normal speed, and braked on reaction. The pedestrian ran into traffic mid-block outside the crosswalk. This is not VDM."
      },
      {
        "id": "c",
        "text": "Kick the driver for VDM",
        "correct": false,
        "wrongReason": "A kick requires intentional vehicular assault. The evidence shows an accident caused by pedestrian negligence, not intentional harm."
      },
      {
        "id": "d",
        "text": "Warn the pedestrian for jaywalking",
        "correct": false,
        "wrongReason": "While jaywalking is discouraged, this is a medical RP situation, not a punishment scenario. No formal action is needed — EMS should handle the injured pedestrian."
      }
    ],
    "explanation": "The caller claimed VDM, but the evidence shows a pedestrian running into traffic without looking. Drivers cannot be punished for accidents they could not reasonably avoid. Always review the full evidence — the caller's description may be incomplete or misleading.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.3"
    }
  },
  {
    "id": "ra_invalid_metagaming_01",
    "evidenceValid": false,
    "difficulty": "hard",
    "category": "judgment",
    "modCall": {
      "callerName": "Tactical_Unit_Lead",
      "reason": "Suspect \"Aware_Crook_44\" keeps avoiding our ambushes — they have to be metagaming with Discord or something.",
      "location": "Paleto Bay — Forest Area"
    },
    "sceneDescription": "A tactical unit has been conducting a covert operation near Paleto Bay. Suspect \"Aware_Crook_44\" has avoided two planned ambush points. The unit leader is convinced the suspect is using external communication (Discord) to know officer locations.",
    "videoEvidence": {
      "summary": "A clip from the unit leader shows the first ambush — the suspect had a clear line of sight to an officer hiding behind a bush (officer's arm and weapon visible through the foliage). On the second attempt, radio chatter from an officer on an unsecured channel 50 metres away was audible — the suspect visibly turns toward the sound before changing direction. No evidence of Discord or external comms."
    },
    "options": [
      {
        "id": "a",
        "text": "No action — information was available in-character",
        "correct": true,
        "command": "N/A"
      },
      {
        "id": "b",
        "text": "Warn the player for Metagaming",
        "correct": false,
        "wrongReason": "The evidence shows the suspect had IC reasons for avoiding the ambushes — visual line of sight and audible radio chatter. No OOC information was used."
      },
      {
        "id": "c",
        "text": "Kick the player for Metagaming",
        "correct": false,
        "wrongReason": "A kick requires clear evidence of OOC information use. The ambushes were compromised by IC factors, not external tools."
      },
      {
        "id": "d",
        "text": "Instruct officers to use encrypted channels only",
        "correct": false,
        "wrongReason": "Good advice for future ops, but not the correct action here. The suspect did not violate any rule."
      }
    ],
    "explanation": "Just because a player avoids an ambush does not mean they are metagaming. Officers must ensure positions are concealed and radio channels are secure before assuming OOC information usage. The evidence showed IC-acquired knowledge.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.3"
    }
  },
  {
    "id": "ra_invalid_frp_01",
    "evidenceValid": false,
    "difficulty": "medium",
    "category": "judgment",
    "modCall": {
      "callerName": "Park_Ranger",
      "reason": "This guy is driving a sedan straight up the side of the mountain trail — clear FRP!",
      "location": "Mountain Trail — East Side"
    },
    "sceneDescription": "You find player \"Trail_Driver_77\" in a sedan on the eastern slope of the mountain. The vehicle is climbing an incline that looks steep from a distance. The caller is adamant this is Fail RP. The player has no prior record.",
    "videoEvidence": {
      "summary": "A clip shows \"Trail_Driver_77\" driving on a marked dirt road up the eastern face of the mountain. The road is on the map as a legitimate drivable trail. It's steep in spots, but the road has tyre tracks from other vehicles. The sedan is driving at a reasonable speed, following the road, not leaving the path."
    },
    "options": [
      {
        "id": "a",
        "text": "No action — the road is a legitimate trail",
        "correct": true,
        "command": "N/A"
      },
      {
        "id": "b",
        "text": "Warn the player for FRP",
        "correct": false,
        "wrongReason": "The player is on a designated scenic road. Driving a sedan on a marked trail is not Fail RP — the vehicle can navigate this road."
      },
      {
        "id": "c",
        "text": "Kick the player for FRP",
        "correct": false,
        "wrongReason": "A kick requires a clear FRP violation. This is legitimate driving on a mapped road. The caller misidentified the location."
      },
      {
        "id": "d",
        "text": "Advise the player to use a more suitable vehicle",
        "correct": false,
        "wrongReason": "While a 4x4 would be more appropriate, there is no rule against driving a sedan on a marked trail. No action or warning is needed."
      }
    ],
    "explanation": "Callers may exaggerate or misidentify locations. The player was on a designated scenic dirt road, not driving up a cliff face. Always verify the actual terrain and road markings before judging FRP.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.3"
    }
  },
  {
    "id": "ra_invalid_nlr_01",
    "evidenceValid": false,
    "difficulty": "medium",
    "category": "judgment",
    "modCall": {
      "callerName": "Combat_Medic_01",
      "reason": "The guy I just revived ran straight back to the fight — NLR violation!",
      "location": "Mission Row — Outside Hospital"
    },
    "sceneDescription": "Player \"Revived_Fighter_55\" was just revived by EMS outside the hospital. They are now heading toward Mission Row Police Station, where a shootout occurred 10 minutes ago. The medic claims this is an NLR violation.",
    "videoEvidence": {
      "summary": "A clip from the medic shows them reviving \"Revived_Fighter_55\". They stand up, check their gear, then jog away from the hospital. They head toward Mission Row at first but then turn toward the gun store instead. Kill feed confirms the Mission Row shootout ended 10 minutes ago — no active shots. The player was dead for 5 minutes before revival."
    },
    "options": [
      {
        "id": "a",
        "text": "No action — no NLR violation",
        "correct": true,
        "command": "N/A"
      },
      {
        "id": "b",
        "text": "Warn the player for NLR",
        "correct": false,
        "wrongReason": "The player was dead for 5 minutes, revived, and headed toward a different location (gun store), not the active scenario. The shootout had also ended. No NLR violation."
      },
      {
        "id": "c",
        "text": "Kick for NLR — 2nd offence",
        "correct": false,
        "wrongReason": "Not only is this not an NLR violation, there is no prior record. A kick would be completely unwarranted."
      },
      {
        "id": "d",
        "text": "Verbal warning to avoid the area",
        "correct": false,
        "wrongReason": "No warning is needed. Sufficient time passed, the scenario ended, and the player went to a different location than their death scene."
      }
    ],
    "explanation": "NLR requires returning to the exact death location during an active scenario. If sufficient time has passed, the scenario has ended, or the player goes to a different area, it is not a violation. Medics may be over-eager to report NLR.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.3"
    }
  },
  {
    "id": "ra_invalid_gta_01",
    "evidenceValid": false,
    "difficulty": "easy",
    "category": "judgment",
    "modCall": {
      "callerName": "Vehicle_Owner_42",
      "reason": "Someone just stole my car from the parking lot!",
      "location": "Public Parking Lot"
    },
    "sceneDescription": "Player \"Borrower_25\" is driving a sports car away from the pier parking lot. The owner, \"Vehicle_Owner_42\", is standing in the lot shouting that their car was stolen. The car was parked in a public lot.",
    "videoEvidence": {
      "summary": "A clip from the pier shows \"Vehicle_Owner_42\" standing next to their sports car talking to \"Borrower_25\". The owner gestures toward the car, nods, and walks away while \"Borrower_25\" gets in. The owner clearly says \"yeah take it\" before walking off. The car starts and drives away normally."
    },
    "options": [
      {
        "id": "a",
        "text": "No action — consent was given",
        "correct": true,
        "command": "N/A"
      },
      {
        "id": "b",
        "text": "Warn the driver for GTA",
        "correct": false,
        "wrongReason": "The owner explicitly gave permission to take the car. There is no theft when consent is granted."
      },
      {
        "id": "c",
        "text": "Kick the driver for GTA",
        "correct": false,
        "wrongReason": "A kick requires clear GTA Driving — taking a vehicle without permission. The evidence shows the owner agreed."
      },
      {
        "id": "d",
        "text": "Tell the owner to report it via !mod if stolen",
        "correct": false,
        "wrongReason": "The car was not stolen — it was lent with permission. The caller filed a false !mod report."
      }
    ],
    "explanation": "The caller reported a stolen vehicle, but the evidence shows they gave explicit permission. Always check video evidence before taking action — callers may file false reports out of confusion or frustration.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.3"
    }
  },
  {
    "id": "ra_invalid_rdm_02",
    "evidenceValid": false,
    "difficulty": "medium",
    "category": "judgment",
    "modCall": {
      "callerName": "Store_Clerk_99",
      "reason": "I was just standing behind the counter and got shot by a robber! RDM!",
      "location": "Gas Station"
    },
    "sceneDescription": "You arrive at the Gas Station. \"Store_Clerk_99\" is dead behind the counter. The shooter, \"Robber_X\", is still inside looting the register. The caller is very angry in the report.",
    "videoEvidence": {
      "summary": "A player submitted video clip from the caller shows \"Robber_X\" walking in with a gun drawn, pointing it at the clerk, and saying \"Give me the cash or I shoot\" in chat. The clerk pulls out a baseball bat and swings at the robber. The robber immediately shoots the clerk. This is a valid roleplay scenario, not RDM."
    },
    "options": [
      {
        "id": "a",
        "text": "No action — self-defence during active robbery",
        "correct": true,
        "command": "N/A"
      },
      {
        "id": "b",
        "text": "Warn the shooter for RDM",
        "correct": false,
        "wrongReason": "The clerk initiated the fight by swinging a weapon during an active hold-up. The shooter defended themselves."
      },
      {
        "id": "c",
        "text": "Kick the shooter for RDM",
        "correct": false,
        "wrongReason": "This is not RDM. It is a legitimate roleplay outcome."
      }
    ],
    "explanation": "If a player initiates a fight or refuses to comply during an active hold-up and gets killed, it is not RDM. It is a valid RP scenario.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.3"
    }
  },
  {
    "id": "ra_invalid_vdm_02",
    "evidenceValid": false,
    "difficulty": "medium",
    "category": "judgment",
    "modCall": {
      "callerName": "Angry_Pedestrian",
      "reason": "This guy ran me over on the sidewalk! VDM!",
      "location": "Downtown Sidewalk"
    },
    "sceneDescription": "You find \"Angry_Pedestrian\" dead on the sidewalk. \"Bad_Driver_11\" is crashed into a nearby streetlight.",
    "videoEvidence": {
      "summary": "A player submitted video clip shows \"Bad_Driver_11\" speeding down the road, losing control of their vehicle while taking a sharp turn, sliding onto the sidewalk, and accidentally hitting the pedestrian before crashing into the pole. They say \"oh shoot sorry man lag\" in chat immediately after."
    },
    "options": [
      {
        "id": "a",
        "text": "No action — accidental collision",
        "correct": true,
        "command": "N/A"
      },
      {
        "id": "b",
        "text": "Warn for VDM",
        "correct": false,
        "wrongReason": "VDM requires intent. This was clearly an accidental loss of vehicle control due to speed or lag."
      },
      {
        "id": "c",
        "text": "Kick for VDM",
        "correct": false,
        "wrongReason": "Kicking is for intentional vehicular assault. This was an accident."
      }
    ],
    "explanation": "VDM stands for Vehicle Death Match, which means intentionally using a vehicle to kill players. Accidental collisions, even due to reckless driving, are not VDM.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.3"
    }
  },
  {
    "id": "ra_invalid_cop_baiting_01",
    "evidenceValid": false,
    "difficulty": "medium",
    "category": "judgment",
    "modCall": {
      "callerName": "Sheriff_Deputy_01",
      "reason": "This guy is driving past me repeatedly to get me to chase him! Cop Baiting!",
      "location": "Highway 12"
    },
    "sceneDescription": "You arrive to observe the situation. \"Fast_Car_Go_Vroom\" is driving a fast sports car up and down Highway 12 at high speeds.",
    "videoEvidence": {
      "summary": "A player submitted video clip shows the deputy running a speed trap. \"Fast_Car_Go_Vroom\" speeds past them going 120mph. The deputy does not pursue. Two minutes later, the same car speeds past in the opposite direction. They are not honking, stopping, or taunting the officer—just speeding back and forth on the highway."
    },
    "options": [
      {
        "id": "a",
        "text": "No action — speeding is an in-game crime, not cop baiting",
        "correct": true,
        "command": "N/A"
      },
      {
        "id": "b",
        "text": "Warn for Cop Baiting",
        "correct": false,
        "wrongReason": "Simply speeding on a highway, even repeatedly, is an in-game traffic violation, not a server rule break."
      },
      {
        "id": "c",
        "text": "Kick for Cop Baiting",
        "correct": false,
        "wrongReason": "Cop baiting involves intentional provocation (donuts at the station, honking at cops). Speeding is a regular crime for police to handle."
      }
    ],
    "explanation": "Committing regular traffic violations (like speeding) is a matter for police roleplay, not staff moderation. Cop baiting requires clear, intentional OOC provocation of law enforcement.",
    "handbookRef": {
      "chapter": 9,
      "section": "9.3"
    }
  }
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
  'Bank of River City', 'Liberty County Jail', 'Hospital',
  'Housing Suburb', 'City Park', 'Construction Site',
  'Chop Shop', 'Gas Station', 'Liberty Guns & Ammo',
  'Shopping Outlet', 'Three Guys Burgers and Fries',
  'Car Dealership', 'Tool Store', 'Liberty Cafe',
  'River City Power Plant', 'Dollar Store', 'County Market',
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
      people: Math.floor(Math.random() * 4 + 2),
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
      people: Math.floor(Math.random() * 4 + 2),
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
    return `# Roleplay Logged\n**Player:** ${l.player}\n**Type:** ${l.type}\n**Location:** ${l.location}\n**Duration:** ${l.duration}\n**People:** ${l.people}\n${status}`
  })

  const header = logs.some(l => l.active)
    ? `# ${rpType.label} Roleplay Status\n\nThere ${logs.filter(l => l.active).length === 1 ? 'is' : 'are'} currently **${logs.filter(l => l.active).length} active ${rpType.plural} roleplay(s):`
    : `# No Active ${rpType.label} Roleplays\n\nThere are no ongoing ${rpType.plural} roleplays at this time.`

  return `${header}\n\n${lines.join('\n\n')}`
}

// ── RP‑log Scenario Generator ─────────────────────────────────────────────────

export function generateRpLogScenario(seedIndex) {
  const requester = pick(MOCK_USERS)
  const rpType = pick(RP_TYPES)
  const location = pick(LOCATIONS)
  const hasOngoing = Math.random() > 0.35
  const logs = generateMockLogs(rpType, hasOngoing)
  const logDialog = buildLogDialog(logs, rpType)

  const peopleCount = Math.floor(Math.random() * 3) + 2
  const duration = (Math.floor(Math.random() * 3) + 2) * 10 + 'm'

  return {
    id: `rl_gen_${seedIndex}_${Date.now()}`,
    type: 'rp-log',
    evidenceValid: true,
    difficulty: 'medium',
    category: 'roleplay_logging',
    requester,
    rpType,
    hasOngoing,
    logs,
    logDialog,
    peopleCount, duration, location,
    modCall: {
      callerName: requester,
      reason: `Hey staff, I want to do a ${rpType.label.toLowerCase()} RP near ${location} with some friends. Can you log it?`,
      location,
    },
    sceneDescription: `${requester} is requesting to start a ${rpType.label.toLowerCase()} RP near ${location}. They say they have ${peopleCount} people ready for a ${duration} session. Follow the logging procedure: check for ongoing RPs, get the location and person count, then either approve or deny.`,
    videoEvidence: {
      summary: `A clip from ${requester} shows them and their group at ${location}, ready to start the ${rpType.label.toLowerCase()} RP. They mention having ${peopleCount} people total for about ${duration}.`,
    },
    options: [
      {
        id: 'a',
        text: 'Log the RP without checking logs (quick approval)',
        correct: false,
        wrongReason: `You must check for ongoing ${rpType.plural} roleplays before approving a new one. Overlapping RPs cause scene interference.`,
        command: 'N/A',
      },
      {
        id: 'b',
        text: hasOngoing
          ? `Deny — there is already an active ${rpType.label} RP running`
          : `Log the RP at ${location} with ${peopleCount} people — no conflicts`,
        correct: true,
        command: hasOngoing ? 'N/A' : ';log_rp',
      },
    ],
  }
}

const P_LOG_TEMPLATES = [
{
id: 'gen_pl_staff_disrespect',
offense: 'Staff Disrespect',
correctPunishment: 'Warn',
correctReason: 'Staff Disrespect - First Offence',
text: '{offender} is verbally abusing a staff member in OOC chat during a traffic stop. Process the punishment and log it in melonly.',
},
{
id: 'gen_pl_nitrp',
offense: 'NITRP',
correctPunishment: 'Kick',
correctReason: 'NITRP - First Offence',
text: '{offender} has been AFK for 45 minutes at a gas station pump, ignoring other players and blocking access. Process the punishment and log it in melonly.',
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
      summary: `The kill feed confirms ${offender} committed ${template.offense}. A player-submitted clip shows the violation. The evidence is clear and requires a formal punishment through melonly.`,
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

export function matchesOffense(userInput, scenario) {
  if (!userInput || !scenario) return false
  const normalized = userInput.toLowerCase().trim()
  if (normalized.length < 2) return false
  if (scenario.offenseKeywords) {
    return scenario.offenseKeywords.some(keyword =>
      normalized.includes(keyword) || keyword.includes(normalized)
    )
  }
  const reason = (scenario.correctReason || '').toLowerCase().trim()
  return normalized.includes(reason) || reason.includes(normalized)
}
