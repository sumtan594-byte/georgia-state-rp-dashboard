import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import clientPromise from '../../../../lib/mongodb';

const SCENARIO_TYPES = [
  {
    type: 'RDM',
    label: 'Random Deathmatch',
    openers: [
      "Hey officer! This guy just shot me outta nowhere! I was literally just walking to my car and BAM he pulls out an AK and starts firing!",
      "MOD CALL! Someone is RDMing in the city! They're just running around shooting everyone with no RP reason at all!",
      "Officer I need help, this player killed me without any roleplay. I was doing a proper traffic stop RP and he just spawned behind me and shot me.",
    ],
    hints: [
      "Remember: Always ask for video proof before taking any moderation action. Kill logs are NOT valid proof.",
      "Ask the player if they are in the GSRP Discord comms and if they can submit a clip.",
    ],
  },
  {
    type: 'VDM',
    label: 'Vehicle Deathmatch',
    openers: [
      "Hey! This guy keeps running me over with his truck! Like 5 times already! He's just driving around the parking lot intentionally hitting people!",
      "Can someone help? There's a player in a Chevlon Corbeta just VDMing everyone on the highway. They're not stopping at all!",
      "Officer this person is using their vehicle as a weapon! They keep ramming into players at the dealership. Please do something!",
    ],
    hints: [
      "VDM requires video proof. Ask the reporter for a clip showing the intentional ramming.",
      "You could also teleport to the scene to observe the behavior yourself.",
    ],
  },
  {
    type: 'FRP',
    label: 'Fail Roleplay',
    openers: [
      "Hey mod, this guy is driving his supercar straight up a vertical mountain. That's not even possible in real life! Total FRP.",
      "Can someone check this player? They're flying around on a motorcycle doing tricks in the sky. That's not realistic RP at all.",
      "Officer! Someone is roleplaying as a superhero with laser eyes and flying. This is a realistic RP server, this is FRP!",
    ],
    hints: [
      "FRP is about unrealistic actions. Ask for proof and explain what makes it unrealistic.",
      "Remember to be professional and explain the rule clearly to the reporter.",
    ],
  },
  {
    type: 'NITRP',
    label: 'No Intent to Roleplay',
    openers: [
      "Hey there's this player who keeps chasing cops and trolling. They're not doing any RP at all, just running around making noise and disrupting everyone.",
      "MOD! This guy joined and is just spamming in chat, following people around, and ruining RP scenes. No intent to RP at all.",
      "Officer can you help? Someone is just driving around blasting music and running through RP scenes. They're clearly here to troll.",
    ],
    hints: [
      "NITRP is about players who are clearly not there to roleplay. Ask for the suspect's username.",
      "For first offense NITRP, a kick is appropriate per the punishment guidelines.",
    ],
  },
  {
    type: 'LTAP',
    label: 'Leave To Avoid Punishment',
    openers: [
      "Hey! This guy just left the server right before you were gonna arrest him! He combat logged to avoid the punishment!",
      "Officer the suspect just disconnected! They left to avoid being banned. Can you still action them?",
      "MOD CALL - the player I was reporting just left the server. They clearly LTAP'd to avoid getting punished.",
    ],
    hints: [
      "LTAP is a bannable offense on first offense. Check server logs to confirm they left during an active moderation.",
      "Ask for the suspect's username so you can look them up.",
    ],
  },
  {
    type: 'NLR',
    label: 'New Life Rule',
    openers: [
      "Hey this guy died and then immediately came back to the same spot for revenge! That's breaking the New Life Rule!",
      "Officer! Someone just respawned and ran straight back to where they died to continue fighting. NLR violation!",
      "Can you check this? Player died, respawned, and is now back at the exact same location trying to kill the same person. NLR!",
    ],
    hints: [
      "NLR means the player must forget their past life. Ask for proof of them returning to the death location.",
      "First offense NLR should result in a warning per the punishment guidelines.",
    ],
  },
  {
    type: 'VOL',
    label: 'Value of Life',
    openers: [
      "Hey this guy has a gun pointed at him and he's just running away laughing! No value of life at all!",
      "Officer! Someone pulled a gun on this player and they just pulled out their own gun and started shooting. No VOL!",
      "MOD! This person is being robbed and instead of putting their hands up they're fighting back with no fear. VOL violation!",
    ],
    hints: [
      "VOL means acting realistically when threatened. Ask for a clip showing the incident.",
      "First offense VOL should result in a warning.",
    ],
  },
  {
    type: 'TROLLING',
    label: 'Trolling',
    openers: [
      "Hey there's a player who's just trolling in the server. They're spamming emotes, blocking roads, and ruining everyone's RP.",
      "MOD CALL! Someone is intentionally disrupting RP scenes by making loud noises and driving recklessly. Pure trolling.",
      "Officer this guy is just here to cause chaos. He's spawning cars in the middle of the road and blocking traffic. Please help!",
    ],
    hints: [
      "Trolling on first offense should result in a kick. Ask for proof first.",
      "Get the suspect's username and ask the reporter to submit evidence.",
    ],
  },
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = session.user.id;

  const client = await clientPromise;
  const db = client.db('gsrp_staff');

  const existing = await db.collection('scenario_training').findOne({ userId });
  if (existing?.completed) {
    return res.status(400).json({ error: 'Already completed scenario training' });
  }

  const shuffled = shuffleArray(SCENARIO_TYPES);
  const selected = shuffled.slice(0, 5);
  const scenarios = selected.map(s => ({
    ...s,
    opener: getRandomItem(s.openers),
  }));

  const sessionId = `scenario_${userId}_${Date.now()}`;

  await db.collection('scenario_sessions').insertOne({
    sessionId,
    userId,
    scenarios,
    createdAt: new Date(),
    status: 'active',
  });

  return res.status(200).json({
    ok: true,
    sessionId,
    totalScenarios: 5,
    scenario: scenarios[0],
  });
}
