const { generateFromMessages, ExportReturnType } = require('discord-html-transcripts');

const GSRP_LOGO = "https://i.imgur.com/70GfmYd.gif";

function buildMockCollection(entries) {
  return {
    size: entries.length,
    map: (fn) => entries.map((v, i) => fn(v, i)),
    forEach: (fn) => entries.forEach((v, i) => fn(v, i)),
    [Symbol.iterator]: function* () { for (const e of entries) yield e; },
  };
}

function buildDiscordMessage(msg) {
  const a = msg.author || {};
  const defaultAvatar = `https://cdn.discordapp.com/embed/avatars/${(parseInt(a.id) % 5 || 0)}.png`;
  const avatarFn = () => a.avatarUrl || defaultAvatar;

  const attachments = buildMockCollection(
    (msg.attachments || []).map(att => ({
      id: att.url,
      url: att.url,
      name: att.name || 'file',
      width: att.width || undefined,
      height: att.height || undefined,
      size: att.size || 0,
      contentType: att.contentType || undefined,
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

  // Sanitize components to prevent crash evaluating row.components.map
  const rawComponents = msg.components || [];
  const components = [];
  for (const comp of rawComponents) {
    if (!comp || typeof comp !== 'object') continue;
    if (comp.type === 1) {
      components.push({
        type: 1,
        components: Array.isArray(comp.components) ? comp.components : []
      });
    } else {
      components.push({
        type: 1,
        components: [comp]
      });
    }
  }

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
    embeds: msg.embeds || [],
    attachments,
    components,
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
  let input = '';
  process.stdin.on('data', chunk => {
    input += chunk;
  });

  process.stdin.on('end', async () => {
    try {
      const { messages, channelName, guildName, mentionUsers, mentionRoles, mentionChannels } = JSON.parse(input);

      const discordMessages = messages.map(buildDiscordMessage);

      const channel = {
        id: '0',
        isDMBased: () => false,
        isVoiceBased: () => false,
        isThread: () => false,
        name: channelName || 'ticket',
        type: 0,
        guild: {
          name: guildName || 'GSRP',
          iconURL: () => GSRP_LOGO,
        },
        parent: null,
      };

      const callbacks = {
        resolveUser: async (id) => {
          const u = mentionUsers[id];
          if (!u) return null;
          return { id, username: u.name, displayName: u.name, avatar: u.avatarUrl || undefined };
        },
        resolveRole: async (id) => {
          const r = mentionRoles[id];
          if (!r) return null;
          return { id, name: r.name, color: r.color, hexColor: r.color };
        },
        resolveChannel: async (id) => {
          const c = mentionChannels[id];
          if (!c) return null;
          return { id, name: c.name };
        },
      };

      const fullHtml = await generateFromMessages(discordMessages, channel, {
        returnType: ExportReturnType.String,
        hydrate: true,
        poweredBy: false,
        callbacks,
      });

      process.stdout.write(fullHtml);
      process.exit(0);
    } catch (err) {
      process.stderr.write(err.stack || err.message || String(err));
      process.exit(1);
    }
  });
}

main();
