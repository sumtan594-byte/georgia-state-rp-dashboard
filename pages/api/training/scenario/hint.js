import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';

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

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { scenario, chatHistory = [] } = req.body;
  if (!scenario) return res.status(400).json({ error: 'scenario required' });

  const type = scenario.type;
  const guidelines = PUNISHMENT_GUIDELINES[type];
  if (!guidelines) return res.status(400).json({ error: 'Unknown scenario type' });

  const fullChat = chatHistory.map(m => m.content || '').join(' ').toLowerCase();

  const askedProof = fullChat.includes('proof') || fullChat.includes('clip') || fullChat.includes('video');
  const askedUsername = fullChat.includes('username') || fullChat.includes('suspect') || fullChat.includes('name');
  const askedComms = fullChat.includes('comms') || fullChat.includes('discord');
  const usedCommand = fullChat.includes(':ban') || fullChat.includes(':kick') || fullChat.includes(':warn') || fullChat.includes(':jail');
  const mentionedLogs = fullChat.includes('kill log') || fullChat.includes('killlog');

  let hint = '';

  if (!askedProof) {
    hint = `Step 1: Ask the player for video proof or a clip of what happened. Kill logs do not count as proof. You need actual video evidence before you can punish anyone.`;
  } else if (mentionedLogs && !askedProof) {
    hint = `Kill logs are not valid proof. You need to ask the player for a video clip or recording of the incident before taking any action.`;
  } else if (askedProof && !askedUsername) {
    hint = `Good you asked for proof. Now ask the player for the suspect username so you know who to punish.`;
  } else if (askedProof && askedUsername && !askedComms) {
    hint = `Ask if the player is in the GSRP Discord comms. The code is GSRP7. If they have proof tell them to send it in the reports channel or DM it to you.`;
  } else if (askedProof && askedUsername && askedComms && !usedCommand) {
    hint = `You have proof and the username. Time to take action using a command. For a first offense ${type} the correct punishment is ${guidelines[1]}. Type :warn to warn them :kick to kick them or :ban to ban them.`;
  } else if (usedCommand) {
    hint = `You already used a command. If the situation is resolved you can move on. If not you can ask more questions or use :view to see what the player is doing right now.`;
  } else {
    hint = `Remember the steps: ask for video proof then get the suspect username then ask about Discord comms then use the right command. For ${type} the first offense is ${guidelines[1]}.`;
  }

  return res.status(200).json({ ok: true, hint });
}
