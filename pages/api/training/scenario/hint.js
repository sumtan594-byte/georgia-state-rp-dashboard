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

  const fullChat = chatHistory.map(m => m.content || '').join(' | ').toLowerCase();
  const aiMessages = chatHistory.filter(m => m.role === 'model' || m.role === 'ai' || m.role === 'assistant').map(m => m.content || '').join(' ').toLowerCase();
  const userMessages = chatHistory.filter(m => m.role === 'user').map(m => m.content || '').join(' ').toLowerCase();

  const aiHasProof = aiMessages.includes('i have a clip') || aiMessages.includes('i recorded') || aiMessages.includes('i got it on video') || aiMessages.includes('yeah i have');
  const aiNoProof = aiMessages.includes('no clip') || aiMessages.includes("didn't record") || aiMessages.includes('no video') || aiMessages.includes('check the kill logs') || aiMessages.includes('check kill logs');
  const aiHasUsername = aiMessages.includes('username is') || aiMessages.includes('username:');
  const aiJoinedComms = aiMessages.includes('i\'ll join') || aiMessages.includes('joining') || aiMessages.includes('thanks i will');
  const aiSentProof = aiMessages.includes('i\'ll send it') || aiMessages.includes('sending it') || aiMessages.includes('sent it');

  const userAskedProof = userMessages.includes('proof') || userMessages.includes('clip') || userMessages.includes('video') || userMessages.includes('recording');
  const userAskedUsername = userMessages.includes('username') || userMessages.includes('suspect') || userMessages.includes('who is');
  const userAskedComms = userMessages.includes('comms') || userMessages.includes('discord');
  const userMentionedLogs = userMessages.includes('kill log') || userMessages.includes('killlog');
  const userUsedCommand = userMessages.includes(':ban') || userMessages.includes(':kick') || userMessages.includes(':warn') || userMessages.includes(':jail');

  let hint = '';

  if (!userAskedProof) {
    hint = `Step 1: Ask the player for video proof or a clip of what happened. Kill logs do not count as proof. You need actual video evidence before you can punish anyone.`;
  } else if (userMentionedLogs && !aiHasProof) {
    hint = `Kill logs are not valid proof. The player does not have a video clip. You cannot take action without video evidence. Try asking something else or move on.`;
  } else if (userAskedProof && aiNoProof && !aiHasProof) {
    hint = `The player does not have video proof. Without a clip you cannot punish them. You can ask more questions or move on to the next scenario by typing "Ask something else" or using a command if appropriate. For ${type} without proof you should not punish.`;
  } else if (userAskedProof && aiHasProof) {
    hint = `The player has video proof. Now ask for the suspect username so you know who to punish.`;
  } else if (aiHasProof && !userAskedUsername) {
    hint = `The player said they have proof. Ask them for the suspect username.`;
  } else if (userAskedUsername && aiHasUsername && !userAskedComms) {
    hint = `You have the username. Ask if the player is in the GSRP Discord comms. The code is GSRP7. Tell them to send the proof in the reports channel.`;
  } else if (userAskedComms && aiJoinedComms) {
    hint = `The player is joining comms. When they send proof you can take action. For first offense ${type} the punishment is ${guidelines[1]}. Use :warn :kick or :ban when ready.`;
  } else if (userUsedCommand) {
    hint = `You already used a command. If the situation is resolved move on. Otherwise ask more questions.`;
  } else {
    hint = `Remember the steps: ask for video proof then get the suspect username then ask about Discord comms then use the right command. For ${type} the first offense is ${guidelines[1]}.`;
  }

  return res.status(200).json({ ok: true, hint });
}
