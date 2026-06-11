// lib/transcript-worker.js
// Re-renders serialized transcript_messages JSON using discord2html.
// Runs as a child process (spawned by transcript-renderer.js) to isolate
// discord2html's bundled React from Next.js's React instance.

const discord2html = require('discord2html');
const { ExportReturnType } = discord2html;

const GSRP_LOGO = 'https://i.imgur.com/70GfmYd.gif';

// ---------------------------------------------------------------------------
// Infer a MIME content type from a filename extension so discord2html can
// correctly identify images vs generic files.
// ---------------------------------------------------------------------------
function inferContentType(name) {
  if (!name) return 'application/octet-stream';
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav',
    pdf: 'application/pdf',
  };
  return map[ext] || 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// Build a mention lookup map from all messages upfront so the resolve
// callbacks can answer without hitting the Discord API.
// ---------------------------------------------------------------------------
function buildMentionMaps(messages) {
  const users = {}, roles = {}, channels = {};
  for (const msg of messages) {
    const m = msg.mentions || {};
    for (const [id, u] of Object.entries(m.users || {}))    users[id]    = u;
    for (const [id, r] of Object.entries(m.roles || {}))    roles[id]    = r;
    for (const [id, c] of Object.entries(m.channels || {})) channels[id] = c;
  }
  return { users, roles, channels };
}

// ---------------------------------------------------------------------------
// Build a mock discord.js Message from serialized message_data.
// ---------------------------------------------------------------------------
function buildMockMessage(data) {
  const avatarUrl = data.author.avatarUrl
    || `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(data.author.id || '0') % 6n)}.png`;

  // Attachments: must be an array-like with .size, .map(), and .toJSON() on each entry.
  const attachments = (data.attachments || []).map((a, i) => ({
    id:          `att-${i}`,
    url:         a.url,
    name:        a.name  || 'attachment',
    height:      a.height || null,
    width:       a.width  || null,
    size:        a.size   || 0,
    contentType: inferContentType(a.name),
    description: null,
    toJSON() { return this; },
  }));
  // discord2html checks attachments.size (not .length)
  attachments.size = attachments.length;

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

  const components = Array.isArray(data.components) ? data.components : [];

  const hoistRole = data.author.roleName
    ? { name: data.author.roleName, iconURL: () => data.author.roleIconUrl || null }
    : null;
  const roleColor = data.author.roleColor && data.author.roleColor !== '#000000'
    ? data.author.roleColor : '#b9bbbe';

  const member = {
    nickname:        data.author.username,
    displayName:     data.author.username,
    displayHexColor: roleColor,
    displayAvatarURL: () => avatarUrl,
    roles: {
      hoist:   hoistRole,
      icon:    null,
      cache:   [],
      highest: { hexColor: roleColor },
    },
  };

  const author = {
    id:          data.author.id,
    username:    data.author.username,
    globalName:  data.author.username,
    displayName: data.author.username,
    tag:         `${data.author.username}#0000`,
    bot:         data.author.bot || false,
    displayAvatarURL: () => avatarUrl,
    avatarURL:        () => avatarUrl,
    flags: { has: () => false },
  };

  // mentions: discord2html uses callbacks for rendering, but we still expose
  // the raw maps here so the callbacks (built per-render) can resolve them.
  const mentionUsers    = buildSimpleMap(data.mentions?.users    || {});
  const mentionRoles    = buildSimpleMap(data.mentions?.roles    || {});
  const mentionChannels = buildSimpleMap(data.mentions?.channels || {});

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

function buildSimpleMap(dict) {
  const map = { ...dict };
  map.get = (id) => map[id];
  return map;
}

// ---------------------------------------------------------------------------
// Build mock Channel — discord2html calls isDMBased/isThread/isTextBased/
// isVoiceBased, and uses channel.client for default mention resolvers
// (we override those via callbacks so client stubs are just safety nets).
// ---------------------------------------------------------------------------
function buildMockChannel(channelName, guildName) {
  return {
    id:           '0',
    name:         channelName,
    type:         0,
    isDMBased:    () => false,
    isThread:     () => false,
    isTextBased:  () => true,
    isVoiceBased: () => false,
    client: {
      channels: { fetch: async () => null },
      users:    { fetch: async () => null },
    },
    guild: {
      id:       '0',
      name:     guildName,
      iconURL:  () => GSRP_LOGO,
      members:  { cache: { get: () => null } },
      roles:    { cache: { get: () => null }, fetch: async () => null },
      channels: { cache: { get: () => null } },
    },
    messages: { fetch: async () => [] },
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function main() {
  let input = '';
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', async () => {
    try {
      const { messages, channelName, guildName } = JSON.parse(input);

      // Build global mention maps from all messages for the resolve callbacks.
      const { users, roles, channels } = buildMentionMaps(messages);

      const mockMessages = messages.map(buildMockMessage);
      const mockChannel  = buildMockChannel(channelName, guildName || 'GSRP');

      const html = await discord2html.generateFromMessages(mockMessages, mockChannel, {
        returnType: ExportReturnType.String,
        poweredBy:  false,
        saveImages: false,
        favicon:    GSRP_LOGO,
        hydrate:    true,
        callbacks: {
          // Resolve from pre-serialized mention data — no Discord API calls needed.
          resolveUser: async (id) => {
            const u = users[id];
            return u ? { id, username: u.name, displayName: u.name, globalName: u.name } : null;
          },
          resolveRole: async (id) => {
            const r = roles[id];
            return r ? { id, name: r.name, hexColor: r.color || '#7289da' } : null;
          },
          resolveChannel: async (id) => {
            const c = channels[id];
            return c ? { id, name: c.name, isDMBased: () => false, type: 0 } : null;
          },
        },
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
