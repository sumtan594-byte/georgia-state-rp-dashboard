// lib/transcript-worker.js
// Runs as a standalone child process — isolated from Next.js React instance.
// Reads JSON from stdin, writes full HTML to stdout.

const { generateFromMessages, ExportReturnType } = require('discord-html-transcripts');

const GSRP_LOGO = 'https://i.imgur.com/70GfmYd.gif';

function buildMockCollection(entries) {
  return {
    size: entries.length,
    map: (fn) => entries.map((v, i) => fn(v, i)),
    forEach: (fn) => entries.forEach((v, i) => fn(v, i)),
    [Symbol.iterator]: function* () { for (const e of entries) yield e; },
  };
}

function sanitizeValue(val) {
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || val === null || val === undefined) return val;
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = sanitizeValue(v);
    }
    return out;
  }
  return String(val);
}

function sanitizeStringFields(obj, ...paths) {
  if (!obj || typeof obj !== 'object') return;
  for (const path of paths) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') break;
      current = current[parts[i]];
    }
    const last = parts[parts.length - 1];
    if (current && last in current && typeof current[last] !== 'string') {
      if (typeof current[last] === 'object' && current[last] !== null) {
        if (current[last].$$typeof) {
          current[last] = '[Embed]';
        } else {
          try { current[last] = JSON.stringify(current[last]); } catch { current[last] = String(current[last]); }
        }
      } else {
        current[last] = String(current[last]);
      }
    }
  }
}

function sanitizeEmbeds(embeds) {
  if (!Array.isArray(embeds)) return [];
  for (const e of embeds) {
    if (!e || typeof e !== 'object') continue;
    sanitizeStringFields(e, 'title', 'description', 'url', 'color', 'footer.text', 'footer.iconURL', 'author.name', 'author.url', 'author.iconURL', 'image.url', 'thumbnail.url', 'video.url', 'provider.name', 'provider.url');
    if (Array.isArray(e.fields)) {
      for (const f of e.fields) {
        sanitizeStringFields(f, 'name', 'value', 'inline');
      }
    }
  }
  return embeds.map(e => sanitizeValue(e));
}

function sanitizeComponents(components) {
  if (!Array.isArray(components)) return [];
  return components.map(c => {
    if (!c || typeof c !== 'object') return { type: 1, components: [] };
    if (Array.isArray(c.components)) {
      c.components = c.components.map(comp => sanitizeValue(comp));
    } else {
      c.components = [];
    }
    return sanitizeValue(c);
  });
}

function buildDiscordMessage(msg) {
  const a = msg.author || {};
  const defaultAvatar = `https://cdn.discordapp.com/embed/avatars/${(parseInt(a.id) % 5 || 0)}.png`;
  const avatarFn = () => a.avatarUrl || defaultAvatar;

  const attachments = buildMockCollection(
    (msg.attachments || []).map(att => ({
      id: att.url, url: att.url, name: att.name || 'file',
      width: att.width || undefined, height: att.height || undefined,
      size: att.size || 0, contentType: att.contentType || undefined,
    }))
  );

  const reactions = buildMockCollection(
    (msg.reactions || []).map(r => ({
      emoji: {
        name: (r.emoji && r.emoji.name) || '?',
        id: (r.emoji && r.emoji.id) || undefined,
        animated: (r.emoji && r.emoji.animated) || false,
      },
      count: r.count || 0,
    }))
  );

  return {
    id: msg.id || '0',
    system: false,
    createdAt: new Date(msg.timestamp),
    editedAt: msg.editedTimestamp ? new Date(msg.editedTimestamp) : null,
    content: msg.content || '',
    author: {
      id: a.id || '0',
      displayName: a.username || 'Unknown User',
      displayAvatarURL: avatarFn,
      avatarURL: avatarFn,
      bot: a.bot || false,
      flags: { has: () => false },
    },
    member: {
      nickname: a.username || null,
      displayHexColor: a.roleColor || '#b9bbbe',
      displayAvatarURL: avatarFn,
      roles: { icon: null, hoist: null },
    },
    embeds: sanitizeEmbeds(msg.embeds),
    attachments,
    components: sanitizeComponents(msg.components),
    reactions: { cache: reactions },
    reference: msg.replyTo ? { messageId: msg.replyTo.id, guildId: null } : null,
    guild: null,
    interaction: null,
    hasThread: false,
    thread: null,
    webhookId: null,
    mentions: {
      everyone: false,
      users: new Map(),
      roles: new Map(),
      channels: new Map(),
    },
  };
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;

  const { messages, channelName, guildName, mentionUsers = {}, mentionRoles = {}, mentionChannels = {} } = JSON.parse(raw);

  const discordMessages = messages.map(buildDiscordMessage);

  const channel = {
    id: '0',
    isDMBased: () => false,
    isVoiceBased: () => false,
    isThread: () => false,
    name: channelName || 'ticket',
    type: 0,
    guild: { name: guildName || 'GSRP', iconURL: () => GSRP_LOGO },
    parent: null,
  };

  const fullHtml = await generateFromMessages(discordMessages, channel, {
    returnType: ExportReturnType.String,
    hydrate: true,
    poweredBy: false,
    callbacks: {
      resolveUser: async (id) => {
        const u = mentionUsers[id];
        return u ? { id, username: u.name, displayName: u.name, avatar: u.avatarUrl || undefined } : null;
      },
      resolveRole: async (id) => {
        const r = mentionRoles[id];
        return r ? { id, name: r.name, color: r.color, hexColor: r.color } : null;
      },
      resolveChannel: async (id) => {
        const c = mentionChannels[id];
        return c ? { id, name: c.name } : null;
      },
    },
  });

  process.stdout.write(fullHtml);
}

main().catch(e => {
  process.stderr.write(e.message);
  process.exit(1);
});
