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

  // Detect and process Component V2 Layout
  const rawComponents = msg.components || [];
  let isV2 = false;
  let descriptionText = '';
  let colorHex = '#7289da';
  const buttons = [];
  const galleryUrls = [];

  function traverse(comp) {
    if (!comp || typeof comp !== 'object') return;
    if (comp.type === 17 || comp.type === 15 || comp.type === 10 || comp.type === 14 || comp.type === 12) {
      isV2 = true;
    }
    if (comp.type === 17 && comp.accent_color != null) {
      colorHex = '#' + comp.accent_color.toString(16).padStart(6, '0');
    }
    if (comp.type === 10 && comp.content) {
      descriptionText += comp.content + '\n';
    }
    if (comp.type === 12 && comp.items) {
      for (const item of comp.items) {
        if (item.media?.url) galleryUrls.push(item.media.url);
      }
    }
    if (comp.type === 2) {
      buttons.push(comp);
    }
    if (comp.components && Array.isArray(comp.components)) {
      for (const sub of comp.components) {
        traverse(sub);
      }
    }
    if (comp.accessory) {
      traverse(comp.accessory);
    }
  }

  for (const comp of rawComponents) {
    traverse(comp);
  }

  // Construct standard embeds list
  let embeds = msg.embeds || [];
  if (isV2 && descriptionText.trim()) {
    const mockEmbed = {
      title: null,
      description: descriptionText.trim(),
      color: parseInt(colorHex.replace('#', ''), 16),
      fields: [],
      author: null,
      thumbnail: null,
      image: null,
      footer: null,
      timestamp: null
    };
    embeds = [mockEmbed];
  }

  // Handle attachments
  const rawAttachments = [...(msg.attachments || [])];
  if (isV2 && galleryUrls.length > 0) {
    for (const url of galleryUrls) {
      rawAttachments.push({
        url: url,
        name: 'image.png'
      });
    }
  }

  const attachments = buildMockCollection(
    rawAttachments.map(att => ({
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

  // Reconstruct components
  const components = [];
  if (isV2) {
    for (let i = 0; i < buttons.length; i += 5) {
      components.push({
        type: 1,
        components: buttons.slice(i, i + 5)
      });
    }
  } else {
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
