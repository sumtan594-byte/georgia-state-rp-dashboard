import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'custom-commands.json');

const DEFAULT_COMMANDS = {
  rdm: {
    name: 'Random Death Match',
    aliases: ['rdm', 'random death match'],
    punishments: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
    description: 'Randomly killing a player without valid roleplay reason'
  },
  vdm: {
    name: 'Vehicle Death Match',
    aliases: ['vdm', 'vehicle death match'],
    punishments: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
    description: 'Using a vehicle to randomly kill players'
  },
  frp: {
    name: 'Failing to Roleplay',
    aliases: ['frp', 'failing to roleplay'],
    punishments: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
    description: 'Not roleplaying a scenario realistically'
  },
  nlr: {
    name: 'New Life Rule',
    aliases: ['nlr', 'new life rule'],
    punishments: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
    description: 'Not forgetting previous life after being killed'
  },
  gta: {
    name: 'GTA Driving',
    aliases: ['gta', 'reckless driving'],
    punishments: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
    description: 'Dangerous or illegal driving'
  },
  cuff_rushing: {
    name: 'Cuff Rushing',
    aliases: ['cuff_rushing', 'cuff rush', 'cuff'],
    punishments: { 1: 'Kick', 2: 'Ban', 3: 'Ban' },
    description: 'Abusing or rushing the cuff system'
  },
  trolling: {
    name: 'Trolling',
    aliases: ['trolling', 'troll'],
    punishments: { 1: 'Kick', 2: 'Ban', 3: 'Ban' },
    description: 'Intentionally disrupting gameplay'
  },
  staff_disrespect: {
    name: 'Staff Disrespect',
    aliases: ['staff_disrespect', 'sd'],
    punishments: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
    description: 'Disrespecting or arguing with staff'
  },
  nitrp: {
    name: 'No Intention to Roleplay',
    aliases: ['nitrp', 'no intent rp'],
    punishments: { 1: 'Kick', 2: 'Ban', 3: 'Ban' },
    description: 'Having no intention to roleplay'
  },
  abusing_mod: {
    name: 'Abusing !mod System',
    aliases: ['abusing_mod', 'abusing !mod'],
    punishments: { 1: 'Verbal Warning', 2: 'Warning', 3: 'Kick' },
    description: 'Abusing the moderator call system'
  },
  staff_evasion: {
    name: 'Staff Evasion',
    aliases: ['staff_evasion', 'staff evasion'],
    punishments: { 1: 'Kick', 2: 'Ban', 3: 'Ban' },
    description: 'Evading or avoiding staff members'
  },
  staff_vdm: {
    name: 'Staff VDM/RDM',
    aliases: ['staff_vdm', 'staff vdm'],
    punishments: { 1: 'Kick', 2: 'Ban', 3: 'Ban' },
    description: 'Killing or damaging staff members'
  },
  mass_vdm: {
    name: 'Mass VDM/RDM',
    aliases: ['mass_vdm', 'mass vdm'],
    punishments: { 1: 'Ban', 2: 'Ban', 3: 'Ban' },
    description: 'Killing multiple players/vehicles randomly'
  },
  safezone: {
    name: 'Safezone RDM/VDM',
    aliases: ['safezone', 'safezone rdm'],
    punishments: { 1: 'Kick', 2: 'Ban', 3: 'Ban' },
    description: 'Killing in designated safe zones'
  },
  reset_avoid: {
    name: 'Reset to Avoid Punishment',
    aliases: ['reset_avoid', 'rtap'],
    punishments: { 1: 'Ban', 2: 'Ban', 3: 'Ban' },
    description: 'Resetting character to avoid punishment'
  },
  leave_avoid: {
    name: 'Leaving to Avoid Punishment',
    aliases: ['leave_avoid', 'ltap'],
    punishments: { 1: 'Ban', 2: 'Ban', 3: 'Ban' },
    description: 'Leaving server to avoid punishment'
  },
  nsfw: {
    name: 'Not Safe for Work',
    aliases: ['nsfw'],
    punishments: { 1: 'Ban', 2: 'Ban', 3: 'Ban' },
    description: 'Inappropriate content'
  },
  tos: {
    name: 'Terms of Service',
    aliases: ['tos'],
    punishments: { 1: 'Ban', 2: 'Ban', 3: 'Ban' },
    description: 'Breaking Roblox Terms of Service'
  },
  staff_impersonation: {
    name: 'Staff Impersonation',
    aliases: ['staff_impersonation'],
    punishments: { 1: 'Ban', 2: 'Ban', 3: 'Ban' },
    description: 'Pretending to be staff'
  },
  banned_rp: {
    name: 'Banned Roleplay',
    aliases: ['banned_rp', 'banned roleplay'],
    punishments: { 1: 'Ban', 2: 'Ban', 3: 'Ban' },
    description: 'Engaging in banned roleplay scenarios'
  },
  rtap: {
    name: 'Respawn to Avoid Punishment',
    aliases: ['rtap', 'respawn'],
    punishments: { 1: 'Ban', 2: 'Ban', 3: 'Ban' },
    description: 'Respawning to avoid punishment'
  },
  hacking: {
    name: 'Cheating/Exploiting',
    aliases: ['hacking', 'cheating', 'exploiting'],
    punishments: { 1: 'Ban', 2: 'Ban', 3: 'Ban' },
    description: 'Using hacks or exploits'
  },
  mass_staff_evasion: {
    name: 'Mass Staff Evasion',
    aliases: ['mass_staff_evasion'],
    punishments: { 1: 'Ban', 2: 'Ban', 3: 'Ban' },
    description: 'Evading multiple staff members'
  },
  troll_username: {
    name: 'Troll Username',
    aliases: ['troll_username'],
    punishments: { 1: 'Ban', 2: 'Ban', 3: 'Ban' },
    description: 'Inappropriate username'
  },
  bypassing: {
    name: 'Bypassing',
    aliases: ['bypassing'],
    punishments: { 1: 'Ban', 2: 'Ban', 3: 'Ban' },
    description: 'Bypassing filters or restrictions'
  }
};

function loadCommands() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_COMMANDS, null, 2));
      return DEFAULT_COMMANDS;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return DEFAULT_COMMANDS;
  }
}

function saveCommands(commands) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(commands, null, 2));
}

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    const commands = loadCommands();
    return res.status(200).json(commands);
  }

  if (method === 'POST') {
    try {
      const body = req.body;
      const { action, key, data } = body;

      const commands = loadCommands();

      if (action === 'add') {
        if (!key || commands[key]) {
          return res.status(400).json({ error: 'Invalid key or key already exists' });
        }
        commands[key] = data;
        saveCommands(commands);
        return res.status(200).json({ success: true, commands });
      }

      if (action === 'edit') {
        if (!key || !commands[key]) {
          return res.status(400).json({ error: 'Command not found' });
        }
        commands[key] = { ...commands[key], ...data };
        saveCommands(commands);
        return res.status(200).json({ success: true, commands });
      }

      if (action === 'remove') {
        if (!key || !commands[key]) {
          return res.status(400).json({ error: 'Command not found' });
        }
        delete commands[key];
        saveCommands(commands);
        return res.status(200).json({ success: true, commands });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export async function getServerSideProps() {
  return { props: {} };
}