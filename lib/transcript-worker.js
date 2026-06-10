// lib/transcript-worker.js
// Generates transcript HTML directly using @derockdev/discord-components-core
// web components. Handles both legacy components and Components V2 layouts.
// Runs as a child process to avoid React conflicts with Next.js.

const GSRP_LOGO = "https://i.imgur.com/70GfmYd.gif";
const COMPONENT_LIBRARY_URL = "https://cdn.jsdelivr.net/npm/@derockdev/discord-components-core@^3.6.1/dist/derockdev-discord-components-core/derockdev-discord-components-core.esm.js";

// --- Helpers ---

function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
}

function formatContent(content, mentionUsers, mentionRoles, mentionChannels) {
  if (!content) return '';
  let f = escapeHtml(content);

  // Code blocks (must be before inline code)
  f = f.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    return `<discord-code-block language="${(lang || 'text').toLowerCase()}">${(code || '').trim()}</discord-code-block>`;
  });
  f = f.replace(/`([^`]+)`/g, '<discord-code>$1</discord-code>');

  // User mentions
  f = f.replace(/&lt;@!?(\d+)&gt;/g, (match, id) => {
    const name = mentionUsers[id]?.name || `User ${id}`;
    return `<discord-mention type="user" highlight="true">${escapeHtml(name)}</discord-mention>`;
  });

  // Role mentions
  f = f.replace(/&lt;@(?:&amp;|&)?(\d+)&gt;/g, (match, id) => {
    const role = mentionRoles[id];
    const name = role ? role.name : 'Role';
    const color = role ? role.color : '#7289da';
    return `<discord-mention type="role" color="${color}" highlight="true">${escapeHtml(name)}</discord-mention>`;
  });

  // Channel mentions
  f = f.replace(/&lt;#(\d+)&gt;/g, (match, id) => {
    const name = mentionChannels[id]?.name || 'channel';
    return `<discord-mention type="channel">${escapeHtml(name)}</discord-mention>`;
  });

  // Timestamps
  f = f.replace(/&lt;t:(\d+)(?::([a-zA-Z]))?&gt;/g, (match, ts, style) => {
    return `<discord-time timestamp="${parseInt(ts) * 1000}" format="${style || 'f'}"></discord-time>`;
  });

  // Custom emoji
  f = f.replace(/&lt;a?:(\w+):(\d+)&gt;/g, '<discord-custom-emoji name="$1" url="https://cdn.discordapp.com/emojis/$2.webp?size=44"></discord-custom-emoji>');

  // Markdown formatting
  f = f.replace(/\*\*(.*?)\*\*/g, '<discord-bold>$1</discord-bold>');
  f = f.replace(/(\s|^)\*(.*?)\*(\s|$)/g, '$1<discord-italic>$2</discord-italic>$3');
  f = f.replace(/__(.*?)__/g, '<discord-underline>$1</discord-underline>');
  f = f.replace(/~~(.*?)~~/g, '<discord-strikethrough>$1</discord-strikethrough>');

  // Headers (## heading)
  f = f.replace(/^(#{1,3})\s+(.+)$/gm, (match, hashes, text) => {
    return `<discord-header level="${hashes.length}">${text}</discord-header>`;
  });

  // Block quotes (> text)
  f = f.replace(/^&gt;\s(.+)$/gm, '<discord-quote>$1</discord-quote>');

  // Sub text (-# text)
  f = f.replace(/^-#\s(.+)$/gm, '<span style="font-size:12px;color:#72767d">$1</span>');

  f = f.replace(/\n/g, '<br>');
  return f;
}

// --- Component Renderers ---

function processComponents(comps, mentionUsers, mentionRoles, mentionChannels) {
  let html = '';
  if (!comps || !Array.isArray(comps)) return html;

  for (const comp of comps) {
    if (!comp || typeof comp !== 'object') continue;

    switch (comp.type) {
      case 1: // Action Row
        if (comp.components) {
          html += '<discord-action-row>';
          html += processComponents(comp.components, mentionUsers, mentionRoles, mentionChannels);
          html += '</discord-action-row>';
        }
        break;

      case 2: { // Button
        const type = comp.style === 4 ? 'destructive' : comp.style === 3 ? 'success' : comp.style === 1 ? 'primary' : 'secondary';
        html += `<discord-button type="${type}" ${comp.disabled ? 'disabled' : ''} ${comp.url ? `url="${escapeHtml(comp.url)}"` : ''}>${escapeHtml(comp.label || 'Button')}</discord-button>`;
        break;
      }

      case 10: // Text Display (V2)
        if (comp.content) {
          html += `<div style="margin: 4px 0;">${formatContent(comp.content, mentionUsers, mentionRoles, mentionChannels)}</div>`;
        }
        break;

      case 12: // Media Gallery (V2)
        if (comp.items) {
          for (const item of comp.items) {
            if (item.media?.url) {
              html += `<discord-attachment slot="attachments" url="${escapeHtml(item.media.url)}"${item.media.width ? ` width="${item.media.width}"` : ''}${item.media.height ? ` height="${item.media.height}"` : ''}></discord-attachment>`;
            }
          }
        }
        break;

      case 14: // Separator (V2)
        html += `<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 10px 0;">`;
        break;

      case 15: // Section (V2)
        if (comp.components) html += processComponents(comp.components, mentionUsers, mentionRoles, mentionChannels);
        if (comp.accessory) html += processComponents([comp.accessory], mentionUsers, mentionRoles, mentionChannels);
        break;

      case 17: { // Container (V2)
        const color = (comp.accent_color != null) ? '#' + comp.accent_color.toString(16).padStart(6, '0') : '#7289da';
        html += `<div style="border-left: 4px solid ${color}; padding: 8px 12px; margin: 8px 0; background: rgba(255,255,255,0.03); border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">`;
        if (comp.components) {
          html += processComponents(comp.components, mentionUsers, mentionRoles, mentionChannels);
        }
        html += '</div>';
        break;
      }

      default:
        break;
    }
  }
  return html;
}

function renderEmbeds(embeds, mentionUsers, mentionRoles, mentionChannels) {
  if (!embeds || embeds.length === 0) return '';
  return embeds.map(embed => {
    let html = `<discord-embed slot="embeds"`;
    if (embed.color != null) html += ` color="${'#' + embed.color.toString(16).padStart(6, '0')}"`;
    if (embed.title) html += ` embed-title="${escapeHtml(embed.title)}"`;
    if (embed.url) html += ` url="${escapeHtml(embed.url)}"`;
    if (embed.author) {
      html += ` author-name="${escapeHtml(embed.author.name || '')}"`;
      if (embed.author.iconUrl || embed.author.iconURL) html += ` author-icon="${escapeHtml(embed.author.iconUrl || embed.author.iconURL || '')}"`;
    }
    if (embed.thumbnail?.url) html += ` thumbnail="${escapeHtml(embed.thumbnail.url)}"`;
    if (embed.image?.url) html += ` image="${escapeHtml(embed.image.url)}"`;
    if (embed.footer?.iconUrl || embed.footer?.iconURL) html += ` footer-image="${escapeHtml(embed.footer.iconUrl || embed.footer.iconURL || '')}"`;
    if (embed.timestamp) html += ` timestamp="${embed.timestamp}"`;
    html += '>';
    if (embed.description) {
      html += `<discord-embed-description slot="description">${formatContent(embed.description, mentionUsers, mentionRoles, mentionChannels)}</discord-embed-description>`;
    }
    if (embed.fields && embed.fields.length > 0) {
      html += '<discord-embed-fields slot="fields">';
      embed.fields.forEach((field, i) => {
        const idx = (i % 3) + 1;
        html += `<discord-embed-field field-title="${escapeHtml(field.name)}" ${field.inline ? `inline inline-index="${idx}"` : ''}>${formatContent(field.value, mentionUsers, mentionRoles, mentionChannels)}</discord-embed-field>`;
      });
      html += '</discord-embed-fields>';
    }
    if (embed.footer?.text) html += `<span slot="footer">${escapeHtml(embed.footer.text)}</span>`;
    html += '</discord-embed>';
    return html;
  }).join('');
}

function renderAttachments(attachments) {
  if (!attachments || attachments.length === 0) return '';
  return attachments.map(att => {
    return `<discord-attachment slot="attachments" url="${escapeHtml(att.url)}"${att.width ? ` width="${att.width}"` : ''}${att.height ? ` height="${att.height}"` : ''}${att.name ? ` alt="${escapeHtml(att.name)}"` : ''}></discord-attachment>`;
  }).join('');
}

// --- Main HTML Generator ---

function generateHTML(messages, channelName, guildName, mentionUsers, mentionRoles, mentionChannels) {
  // Build profiles
  const profiles = {};
  for (const msg of messages) {
    const a = msg.author || {};
    if (!profiles[a.id]) {
      profiles[a.id] = {
        author: a.username || 'Unknown User',
        avatar: a.avatarUrl || `https://cdn.discordapp.com/embed/avatars/${(parseInt(a.id) % 5 || 0)}.png`,
        roleColor: a.roleColor || '#b9bbbe',
        bot: a.bot || false,
        verified: false,
        roleName: a.roleName || null,
        roleIcon: a.roleIconUrl || null,
      };
    }
  }

  // Build message tags
  const messageTags = [];
  for (const msg of messages) {
    const ts = new Date(msg.timestamp).toISOString();
    const mu = { ...mentionUsers, ...(msg.mentions?.users || {}) };
    const mr = { ...mentionRoles, ...(msg.mentions?.roles || {}) };
    const mc = { ...mentionChannels, ...(msg.mentions?.channels || {}) };

    const content = formatContent(msg.content, mu, mr, mc);
    const attachmentsHTML = renderAttachments(msg.attachments);
    const embedsHTML = renderEmbeds(msg.embeds, mu, mr, mc);

    let componentsHTML = '';
    if (msg.components && msg.components.length > 0) {
      componentsHTML = '<discord-attachments slot="components">';
      componentsHTML += processComponents(msg.components, mu, mr, mc);
      componentsHTML += '</discord-attachments>';
    }

    messageTags.push(`<discord-message id="m-${msg.id}" timestamp="${ts}" profile="${(msg.author?.id) || '0'}">${content}${attachmentsHTML}${embedsHTML}${componentsHTML}</discord-message>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><title>Ticket - ${escapeHtml(channelName)}</title>
    <link rel="icon" type="image/png" href="${GSRP_LOGO}"/>
    <style>
        body { margin:0; min-height:100vh; background-color: #09090b; font-family: sans-serif; color: #a1a1aa; }
    </style>
    <script type="module" src="${COMPONENT_LIBRARY_URL}"></script>
    <script>
        window.$discordMessage = { profiles: ${JSON.stringify(profiles)} };
    </script>
</head>
<body>
    <discord-messages style="min-height:100vh">
        <discord-header guild="${escapeHtml(guildName)}" channel="${escapeHtml(channelName)}" icon="${GSRP_LOGO}">SUPPORT TICKET</discord-header>
        ${messageTags.join('\n')}
    </discord-messages>
</body>
</html>`;
}

// --- Entry Point ---

async function main() {
  let input = '';
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const { messages, channelName, guildName, mentionUsers, mentionRoles, mentionChannels } = JSON.parse(input);
      const fullHtml = generateHTML(messages, channelName, guildName, mentionUsers || {}, mentionRoles || {}, mentionChannels || {});
      process.stdout.write(fullHtml);
      process.exit(0);
    } catch (err) {
      process.stderr.write(err.stack || err.message || String(err));
      process.exit(1);
    }
  });
}

main();
