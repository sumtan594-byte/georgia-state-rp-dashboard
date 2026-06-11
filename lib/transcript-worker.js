// lib/transcript-worker.js
// Re-renders serialized transcript_messages JSON using discord2html.
// Runs as a child process (spawned by transcript-renderer.js) to isolate
// discord2html's bundled React from Next.js's React instance.

const discord2html = require('discord2html');
const { ExportReturnType } = discord2html;

const GSRP_LOGO = 'https://i.imgur.com/70GfmYd.gif';

// ---------------------------------------------------------------------------
// discord2html expects messages as a plain array OR a discord.js Collection.
// It does: messages instanceof Collection ? Array.from(messages.values()) : messages
// So passing a plain array is the safe path — no mock Collection needed.
//
// buildProfile(member, author) accesses:
//   author.displayName, author.displayAvatarURL({size}), author.bot, author.flags
//   member?.nickname, member?.displayAvatarURL({size}), member?.displayHexColor
//   member?.roles.hoist?.name, member?.roles.icon?.iconURL()
//
// attachments: discord2html calls attachments.map() — needs a real array
// components:  discord2html calls .map()/.find()/.some() — needs a real array
// reactions:   discord2html accesses reactions.cache — needs { cache: [] }
// ---------------------------------------------------------------------------

function buildMockMessage(data) {
  const avatarUrl = data.author.avatarUrl
    || `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(data.author.id || '0') % 6n)}.png`;

  const mentionUsers  = buildMentionMap(data.mentions?.users  || {}, (id, u) => ({ id, username: u.name, globalName: u.name, displayName: u.name, tag: `${u.name}#0000`, displayAvatarURL: () => '', bot: false, flags: { has: () => false } }));
  const mentionRoles    = buildMentionMap(data.mentions?.roles    || {}, (id, r) => ({ id, name: r.name, hexColor: r.color || '#7289da' }));
  const mentionChannels = buildMentionMap(data.mentions?.channels || {}, (id, c) => ({ id, name: c.name }));

  const attachments = (data.attachments || []).map((a, i) => ({
    id: `att-${i}`,
    url: a.url,
    name: a.name || 'attachment',
    height: a.height || null,
    width:  a.width  || null,
    size: 0,
    contentType: null,
    description: null,
  }));

  const embeds = (data.embeds || []).map(e => ({
    title:       e.title       || null,
    description: e.description || null,
    color:       e.color       || null,
    url:         e.url         || null,
    author: e.author ? { name: e.author.name, iconURL: e.author.iconUrl || null } : null,
    fields:    e.fields    || [],
    thumbnail: e.thumbnail ? { url: e.thumbnail.url } : null,
    image:     e.image     ? { url: e.image.url }     : null,
    footer: e.footer ? { text: e.footer.text || null, iconURL: e.footer.iconUrl || null } : null,
    timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : null,
    toJSON() { return this; },
  }));

  // Components are stored as plain serialized JSON from toJSON() — pass them through as-is.
  // discord2html expects an array with .map/.find/.some etc.
  const components = Array.isArray(data.components) ? data.components : [];

  const hoistRole = data.author.roleName
    ? { name: data.author.roleName, iconURL: () => data.author.roleIconUrl || null }
    : null;

  const roleColor = data.author.roleColor && data.author.roleColor !== '#000000'
    ? data.author.roleColor
    : '#b9bbbe';

  const member = {
    nickname: data.author.username,
    displayName: data.author.username,
    displayHexColor: roleColor,
    displayAvatarURL: () => avatarUrl,
    roles: {
      hoist: hoistRole,
      icon:  null,
      cache: [],
      highest: { hexColor: roleColor },
    },
  };

  const author = {
    id:       data.author.id,
    username: data.author.username,
    globalName: data.author.username,
    displayName: data.author.username,
    tag: `${data.author.username}#0000`,
    bot: data.author.bot || false,
    displayAvatarURL: () => avatarUrl,
    avatarURL: () => avatarUrl,
    flags: { has: () => false },
  };

  return {
    id:               data.id,
    content:          data.content || '',
    type:             data.type    || 0,
    createdAt:        new Date(data.timestamp),
    createdTimestamp: data.timestamp,
    editedAt:         data.editedTimestamp ? new Date(data.editedTimestamp) : null,
    webhookId:        null,
    system:           false,
    interaction:      null,
    hasThread:        false,
    thread:           null,
    author,
    member,
    embeds,
    attachments,
    stickers: [],
    components,
    mentions: {
      users:    mentionUsers,
      roles:    mentionRoles,
      channels: mentionChannels,
    },
    reactions: { cache: [] },
    reference: data.replyTo ? { messageId: data.replyTo.id } : null,
    flags: { has: () => false },
    toJSON() { return this; },
  };
}

// Build a plain object keyed by id — discord2html resolves mentions by id lookup.
function buildMentionMap(dict, builder) {
  const map = {};
  for (const [id, val] of Object.entries(dict)) {
    map[id] = builder(id, val);
  }
  // Attach a .get() for any code that treats it like a Map
  map.get = (id) => map[id];
  return map;
}

// Minimal mock Channel/Guild for the transcript header.
function buildMockChannel(channelName, guildName) {
  return {
    id:   '0',
    name: channelName,
    type: 0,
    guild: {
      id:     '0',
      name:   guildName,
      iconURL: () => GSRP_LOGO,
      members:  { cache: { get: () => null } },
      roles:    { cache: { get: () => null } },
      channels: { cache: { get: () => null } },
    },
    messages: { fetch: async () => [] },
  };
}

// ---------------------------------------------------------------------------
// Entry point — reads JSON from stdin, writes HTML to stdout.
// ---------------------------------------------------------------------------

async function main() {
  let input = '';
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', async () => {
    try {
      const { messages, channelName, guildName } = JSON.parse(input);

      // Pass a plain array — discord2html handles both arrays and Collections.
      const mockMessages  = messages.map(buildMockMessage);
      const mockChannel   = buildMockChannel(channelName, guildName || 'GSRP');

      const html = await discord2html.generateFromMessages(mockMessages, mockChannel, {
        returnType: ExportReturnType.String,
        poweredBy:  false,
        saveImages: false,
        favicon:    GSRP_LOGO,
        hydrate:    true,
      });

      process.stdout.write(html);
      process.exit(0);
    } catch (err) {
      process.stderr.write(err.stack || err.message || String(err));
      process.exit(1);
    }
  });
}

main();
