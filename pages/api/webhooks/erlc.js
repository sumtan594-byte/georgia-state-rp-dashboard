import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const PRC_PUBLIC_KEY_BASE64 = 'MCowBQYDK2VwAyEAjSICb9pp0kHizGQtdG8ySWsDChfGqi+gyFCttigBNOA=';
const TARGET_WEBHOOK_URL = 'https://discord.com/api/webhooks/1491210873023238284/qtrc7WAitcu5IXTSe57L3mwsv16N35QJ2HsyX8gZeDnbEhIo7stp_7J5FAFuuoZ7ge-A';
const DATA_DIR = path.join(process.cwd(), 'data');
const OFFENCES_FILE = path.join(DATA_DIR, 'offences.json');

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----\n${PRC_PUBLIC_KEY_BASE64}\n-----END PUBLIC KEY-----`;

const PUNISHMENT_Tiers = {
  rdm: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  vdm: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  frp: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  nlr: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  gta: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  cuff_rushing: { 1: 'Kick', 2: 'Ban', 3: '-' },
  trolling: { 1: 'Kick', 2: 'Ban', 3: '-' },
  staff_disrespect: { 1: 'Warning', 2: 'Kick', 3: 'Ban' },
  no_intent_rp: { 1: 'Kick', 2: 'Ban', 3: '-' },
  abusing_mod: { 1: 'Verbal Warning', 2: 'Warning', 3: 'Kick' },
  staff_evasion: { 1: 'Kick', 2: 'Ban', 3: '-' },
  staff_vdm: { 1: 'Kick', 2: 'Ban', 3: '-' },
  mass_vdm: { 1: 'Ban', 2: '-', 3: '-' },
  safezone: { 1: 'Kick', 2: 'Ban', 3: '-' },
  reset_avoid: { 1: 'Ban', 2: '-', 3: '-' },
  leave_avoid: { 1: 'Ban', 2: '-', 3: '-' },
  nsfw: { 1: 'Ban', 2: '-', 3: '-' },
  tos: { 1: 'Ban', 2: '-', 3: '-' },
  staff_impersonation: { 1: 'Ban', 2: '-', 3: '-' },
  banned_rp: { 1: 'Ban', 2: '-', 3: '-' },
  rtap: { 1: 'Ban', 2: '-', 3: '-' },
  hacking: { 1: 'Ban', 2: '-', 3: '-' },
  mass_staff_evasion: { 1: 'Ban', 2: '-', 3: '-' },
  troll_username: { 1: 'Ban', 2: '-', 3: '-' },
  bypassing: { 1: 'Ban', 2: '-', 3: '-' },
};

const COMMAND_ALIASES = {
  rdm: ['rdm', 'random death match'],
  vdm: ['vdm', 'vehicle death match'],
  frp: ['frp', 'failing to roleplay'],
  nlr: ['nlr', 'new life rule'],
  gta: ['gta', 'gta driving'],
  cuff_rushing: ['cuff rush', 'cuff_rushing'],
  trolling: ['trolling'],
  staff_disrespect: ['staff disrespect', 'sd'],
  no_intent_rp: ['no intent', 'no intent rp'],
  abusing_mod: ['abusing !mod', 'abusing mod', 'abusing_mod'],
  staff_evasion: ['staff evasion', 'staff_evasion'],
  staff_vdm: ['staff vdm', 'staff v/dm'],
  mass_vdm: ['mass vdm', 'massvdm'],
  safezone: ['safezone rdm', 'safezone vdm', 'safezone'],
  reset_avoid: ['reset to avoid', 'reset avoid'],
  leave_avoid: ['leave to avoid', 'leave avoid'],
  nsfw: ['nsfw'],
  tos: ['tos', 'terms of service'],
  staff_impersonation: ['staff impersonation', 'si'],
  banned_rp: ['banned rp'],
  rtap: ['rtap', 'st-tap'],
  hacking: ['hacking', 'cheating', 'exploiting'],
  mass_staff_evasion: ['mass staff evasion', 'mass staff ev'],
  troll_username: ['troll username', 'troll name'],
  bypassing: ['bypassing'],
};

const ALLOWED_ROLES = ['Server Moderator', 'Server Administrator', 'Server Owner'];

function loadOffences() {
  try {
    if (!fs.existsSync(OFFENCES_FILE)) {
      return {};
    }
    const data = fs.readFileSync(OFFENCES_FILE, 'utf8');
    return JSON.parse(data).offences || {};
  } catch {
    return {};
  }
}

function saveOffences(offences) {
  fs.writeFileSync(OFFENCES_FILE, JSON.stringify({ offences }, null, 2));
}

function clearOffences() {
  fs.writeFileSync(OFFENCES_FILE, JSON.stringify({ offences: {} }));
}

function getOffenceTier(offenceType, count) {
  const tiers = PUNISHMENT_Tiers[offenceType];
  if (!tiers) return 'Warning';
  return tiers[count] || tiers[3] || 'Warning';
}

function getPunishmentMessage(punishmentLevel, offenceName) {
  const messages = {
    'Verbal Warning': `You are receiving a Verbal Warning for committing an act of ${offenceName}. This is a formal notice. Do not repeat this behavior.`,
    'Warning': `You are being Warning for committing an act of ${offenceName}. This is a formal warning. Further violations will result in stricter actions.`,
    'Kick': `You are being Kicked for committing an act of ${offenceName}. You may rejoin after the cooldown.`,
    'Ban': `You are being Banned for committing an act of ${offenceName}. This ban is final.`,
  };
  return messages[punishmentLevel] || messages['Warning'];
}

async function getRobloxUsername(userId) {
  try {
    const response = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: { 'User-Agent': 'GSRP-Webhook' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.name || null;
  } catch (err) {
    console.error('[ERLC Webhook] Error getting Roblox username:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signatureHex = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];

  if (!signatureHex || !timestamp) {
    console.error('[ERLC Webhook] Missing signature headers');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    const timestampBuffer = Buffer.from(timestamp, 'utf-8');
    const message = Buffer.concat([timestampBuffer, rawBody]);
    const signature = Buffer.from(signatureHex, 'hex');

    const isVerified = crypto.verify(
      null,
      message,
      { key: PUBLIC_KEY_PEM, format: 'pem', type: 'spki' },
      signature
    );

    if (!isVerified) {
      console.warn('[ERLC Webhook] Invalid signature detected');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const data = JSON.parse(rawBody.toString());
    console.log('[ERLC Webhook] Parsed data:', JSON.stringify(data));

    if (!data.events || !Array.isArray(data.events)) {
      return res.status(200).json({ success: true });
    }

    for (const evt of data.events) {
      if (evt.event !== 'CustomCommand') continue;

      const command = evt.data?.command?.toLowerCase() || '';
      const argument = evt.data?.argument || '';
      const playerId = evt.data?.origin || evt.origin || '';

      console.log('[ERLC Webhook] Command:', command, 'Argument:', argument);

      const parts = argument.split(' ');
      const target = parts[0] || '';
      const reason = parts.slice(1).join(' ') || command;

      if (!target) continue;

      if (command === 'kick') {
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const payload = {
          content: `KICK_DATA:${commandUser}:${target}:${reason}`,
          allowed_mentions: { parse: [] }
        };

        await fetch(TARGET_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        console.log(`[ERLC Webhook] Forwarded kick command from ${commandUser} for ${target}`);
        continue;
      }

      if (command === 'ban') {
        const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
        const payload = {
          content: `BAN_DATA:${commandUser}:${target}:${reason}`,
          allowed_mentions: { parse: [] }
        };

        await fetch(TARGET_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        console.log(`[ERLC Webhook] Forwarded ban command from ${commandUser} for ${target}`);
        continue;
      }

      const allAliases = Object.values(COMMAND_ALIASES).flat();
        const isOffenceCommand = command.startsWith(';') || allAliases.includes(command.toLowerCase()) || allAliases.includes(command.substring(1).toLowerCase());
        if (isOffenceCommand) {
          const rawOffence = command.startsWith(';') ? command.substring(1).toLowerCase() : command.toLowerCase();
          let offenceType = null;

          for (const [type, aliases] of Object.entries(COMMAND_ALIASES)) {
            if (aliases.includes(rawOffence)) {
              offenceType = type;
              break;
            }
          }

          if (!offenceType) {
            console.log(`[ERLC Webhook] Unknown offence command: ${rawOffence}`);
            continue;
          }

          const commandUser = playerId ? await getRobloxUsername(playerId) : 'Unknown';
          const targetUsername = target;

          let offences = loadOffences();
          if (!offences[targetUsername]) {
            offences[targetUsername] = {};
          }
          if (!offences[targetUsername][offenceType]) {
            offences[targetUsername][offenceType] = 0;
          }
          offences[targetUsername][offenceType] += 1;
          const offenceCount = offences[targetUsername][offenceType];
          saveOffences(offences);

          const punishment = getOffenceTier(offenceType, offenceCount);
          const offenceName = rawOffence.replace(/ /g, '_');
          const discordPayload = {
            content: `${offenceName.toUpperCase()}_DATA:${commandUser}:${targetUsername}:`,
            allowed_mentions: { parse: [] }
          };

          await fetch(TARGET_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordPayload)
          });

          const pmMessage = getPunishmentMessage(punishment, rawOffence);
          const pmPayload = {
            content: `:pm ${targetUsername} ${pmMessage}`,
            allowed_mentions: { parse: [] }
          };

          await fetch(TARGET_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pmPayload)
          });

          const staffPayload = {
            content: `Action completed: ${punishment} issued to ${targetUsername} for ${rawOffence} (Offence #${offenceCount})`,
            allowed_mentions: { parse: [] }
          };

          await fetch(TARGET_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(staffPayload)
          });

          console.log(`[ERLC Webhook] ${punishment} issued to ${targetUsername} for ${rawOffence} (Total: ${offenceCount})`);
        }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[ERLC Webhook] Processing Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function onRequestClose() {
  console.log('[ERLC Webhook] Session shutdown - clearing offences');
  clearOffences();
}