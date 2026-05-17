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
      "yo mod this guy is just shooting people at the gas station for no reason i was just pumping gas and he pulled out an m4",
    ],
  },
  {
    type: 'VDM',
    label: 'Vehicle Deathmatch',
    openers: [
      "Hey! This guy keeps running me over with his truck! Like 5 times already! He's just driving around the parking lot intentionally hitting people!",
      "Can someone help? There's a player in a Chevlon Corbeta just VDMing everyone on the highway. They're not stopping at all!",
      "Officer this person is using their vehicle as a weapon! They keep ramming into players at the dealership. Please do something!",
      "this dude in a pickup truck keeps running people over at the prison parking lot pls do something",
    ],
  },
  {
    type: 'FRP',
    label: 'Fail Roleplay',
    openers: [
      "Hey mod, this guy is driving his supercar straight up a vertical mountain. That's not even possible in real life! Total FRP.",
      "Can someone check this player? They're flying around on a motorcycle doing tricks in the sky. That's not realistic RP at all.",
      "Officer! Someone is roleplaying as a superhero with laser eyes and flying. This is a realistic RP server, this is FRP!",
      "this guy is literally flying around with a jetpack in the city. how is that even allowed on a rp server",
    ],
  },
  {
    type: 'NITRP',
    label: 'No Intent to Roleplay',
    openers: [
      "Hey there's this player who keeps chasing cops and trolling. They're not doing any RP at all, just running around making noise and disrupting everyone.",
      "MOD! This guy joined and is just spamming in chat, following people around, and ruining RP scenes. No intent to RP at all.",
      "Officer can you help? Someone is just driving around blasting music and running through RP scenes. They're clearly here to troll.",
      "this player keeps following me and my friends around making engine noises and ruining our rp. they wont leave us alone",
    ],
  },
  {
    type: 'LTAP',
    label: 'Leave To Avoid Punishment',
    openers: [
      "Hey! This guy just left the server right before you were gonna arrest him! He combat logged to avoid the punishment!",
      "Officer the suspect just disconnected! They left to avoid being banned. Can you still action them?",
      "MOD CALL - the player I was reporting just left the server. They clearly LTAP'd to avoid getting punished.",
      "the guy i was about to report just quit the game. he knew he was gonna get in trouble and left",
    ],
  },
  {
    type: 'NLR',
    label: 'New Life Rule',
    openers: [
      "Hey this guy died and then immediately came back to the same spot for revenge! That's breaking the New Life Rule!",
      "Officer! Someone just respawned and ran straight back to where they died to continue fighting. NLR violation!",
      "Can you check this? Player died, respawned, and is now back at the exact same location trying to kill the same person. NLR!",
      "this guy got killed at the bank respawned and came right back with a gun. thats breaking nlr right?",
    ],
  },
  {
    type: 'VOL',
    label: 'Value of Life',
    openers: [
      "Hey this guy has a gun pointed at him and he's just running away laughing! No value of life at all!",
      "Officer! Someone pulled a gun on this player and they just pulled out their own gun and started shooting. No VOL!",
      "MOD! This person is being robbed and instead of putting their hands up they're fighting back with no fear. VOL violation!",
      "this guy had a shotgun to his face and just pulled out an ak and started shooting. zero value of life",
    ],
  },
  {
    type: 'TROLLING',
    label: 'Trolling',
    openers: [
      "Hey there's a player who's just trolling in the server. They're spamming emotes, blocking roads, and ruining everyone's RP.",
      "MOD CALL! Someone is intentionally disrupting RP scenes by making loud noises and driving recklessly. Pure trolling.",
      "Officer this guy is just here to cause chaos. He's spawning cars in the middle of the road and blocking traffic. Please help!",
      "this guy parked 10 cars across the highway and is just sitting there laughing. nobody can get through",
    ],
  },
  {
    type: 'RDM',
    label: 'Multi Player RDM Report',
    openers: [
      "Hey mod there are like 3 people here who all got shot by the same guy. We were all at the park doing RP and this random dude just started spraying with an uzi. We all have clips!",
      "MOD CALL multiple victims here. This player RDM'd me and my friend at the same time. We were doing a proper scene and he just walked up and started shooting both of us.",
    ],
  },
  {
    type: 'TROLLING',
    label: 'Arguing Players',
    openers: [
      "Officer this guy is trolling and when I called him out he started calling me names. He's saying I'm the one trolling but he's the one who blocked the road with his car!",
      "Hey mod this player is arguing with me in chat saying I'm lying but I have the clip. He's calling me a doofus and saying I'm the troll. Can you check?",
    ],
  },
  {
    type: 'NITRP',
    label: 'De-escalation Needed',
    openers: [
      "MOD this guy is trolling our RP and now we're both yelling in chat. He says I started it but he's the one who drove his car through our scene. Can you help us calm this down?",
      "Officer me and this other player are in a huge argument. He's calling me an idiot and I'm calling him a noob. We both think the other one is trolling. Can you look into it?",
    ],
  },
  {
    type: 'VDM',
    label: 'Suspect Denies Everything',
    openers: [
      "Hey officer this guy keeps VDMing people and now he's in chat saying I'm lying. I have the clip though. He's literally just driving into people on purpose.",
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
