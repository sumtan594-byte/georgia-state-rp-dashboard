// lib/transcript-worker.js
// Re-renders serialized transcript_messages JSON using discord2html.
// Runs as a child process (spawned by transcript-renderer.js) to isolate
// discord2html's bundled React from Next.js's React instance.

const discord2html = require('discord2html');
const { ExportReturnType } = discord2html;

const GSRP_LOGO = 'https://i.imgur.com/70GfmYd.gif';

// ---------------------------------------------------------------------------
// Build a minimal Collection-like object that discord2html will accept.
// discord2html calls .forEach() and .values() on this, and also reads
// message.author, message.content, message.embeds, etc. from each entry.
// ---------------------------------------------------------------------------

class MockCollection {
  constructor(entries) {
    this._map = new Map(entries.map(e => [e.id, e]));
  }
  forEach(fn) { this._map.forEach(fn); }
  values() { return this._map.values(); }
  get size() { return this._map.size; }
  get(key) { return this._map.get(key); }
  last() { const arr = [...this._map.values()]; return arr[arr.length - 1]; }
}

// Build a mock discord.js Message from our serialized message_data object.
function buildMockMessage(data) {
  const mentionUsers = new MockCollection(
    Object.entries(data.mentions?.users || {}).map(([id, u]) => ({ id, username: u.name, globalName: u.name, tag: `${u.name}#0000`, displayAvatarURL: () => '' }))
  );
  const mentionRoles = new MockCollection(
    Object.entries(data.mentions?.roles || {}).map(([id, r]) => ({ id, name: r.name, hexColor: r.color || '#7289da' }))
  );
  const mentionChannels = new MockCollection(
    Object.entries(data.mentions?.channels || {}).map(([id, c]) => ({ id, name: c.name }))
  );

  const attachments = new MockCollection(
    (data.attachments || []).map((a, i) => ({
      id: `att-${i}`,
      url: a.url,
      name: a.name || 'attachment',
      height: a.height || null,
      width: a.width || null,
      size: 0,
      contentType: null,
    }))
  );

  const stickers = new MockCollection([]);

  const embeds = (data.embeds || []).map(e => ({
    title: e.title || null,
    description: e.description || null,
    color: e.color || null,
    url: e.url || null,
    author: e.author ? { name: e.author.name, iconURL: e.author.iconUrl || null } : null,
    fields: e.fields || [],
    thumbnail: e.thumbnail ? { url: e.thumbnail.url } : null,
    image: e.image ? { url: e.image.url } : null,
    footer: e.footer ? { text: e.footer.text, iconURL: e.footer.iconUrl || null } : null,
    timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : null,
    toJSON: function() { return this; },
  }));

  // Reconstruct raw component JSON for components V2 / action rows
  const components = (data.components || []).map(c => ({
    toJSON: () => c,
    ...c,
  }));

  return {
    id: data.id,
    content: data.content || '',
    type: data.type || 0,
    createdAt: new Date(data.timestamp),
    createdTimestamp: data.timestamp,
    editedAt: data.editedTimestamp ? new Date(data.editedTimestamp) : null,
    author: {
      id: data.author.id,
      username: data.author.username,
      globalName: data.author.username,
      tag: `${data.author.username}#0000`,
      bot: data.author.bot || false,
      displayAvatarURL: () => data.author.avatarUrl || `https://cdn.discordapp.com/embed/avatars/0.png`,
      flags: { has: () => false },
    },
    member: {
      displayName: data.author.username,
      roles: {
        highest: { hexColor: data.author.roleColor || '#b9bbbe', name: data.author.roleName || null },
        hoist: data.author.roleName ? { name: data.author.roleName, iconURL: () => data.author.roleIconUrl || null } : null,
        cache: new MockCollection([]),
      },
    },
    embeds,
    attachments,
    stickers,
    components,
    mentions: {
      users: mentionUsers,
      roles: mentionRoles,
      channels: mentionChannels,
    },
    reference: data.replyTo ? { messageId: data.replyTo.id } : null,
    reactions: new MockCollection([]),
    thread: null,
    flags: { has: () => false },
    toJSON: function() { return this; },
  };
}

// Build a minimal mock Channel/Guild that discord2html uses for headers.
function buildMockChannel(channelName, guildName) {
  return {
    id: '0',
    name: channelName,
    type: 0,
    guild: {
      id: '0',
      name: guildName,
      iconURL: () => GSRP_LOGO,
      members: { cache: new MockCollection([]) },
      roles: { cache: new MockCollection([]) },
      channels: { cache: new MockCollection([]) },
    },
    messages: {
      fetch: async () => new MockCollection([]),
    },
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

      const mockMessages = messages.map(buildMockMessage);
      const mockChannel = buildMockChannel(channelName, guildName || 'GSRP');
      const mockCollection = new MockCollection(mockMessages);

      const buffer = await discord2html.generateFromMessages(mockCollection, mockChannel, {
        returnType: ExportReturnType.Buffer,
        poweredBy: false,
        saveImages: false,
        favicon: GSRP_LOGO,
      });

      process.stdout.write(buffer.toString('utf8'));
      process.exit(0);
    } catch (err) {
      process.stderr.write(err.stack || err.message || String(err));
      process.exit(1);
    }
  });
}

main();
