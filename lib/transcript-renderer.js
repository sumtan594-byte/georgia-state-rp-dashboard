const GSRP_LOGO = "https://i.imgur.com/70GfmYd.gif";
const COMPONENT_LIBRARY_URL = "https://cdn.jsdelivr.net/npm/@derockdev/discord-components-core@^3.6.1/dist/derockdev-discord-components-core/derockdev-discord-components-core.esm.js";

function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return str.toString().replace(/[&<>"']/g, m => map[m]);
}

function buildProfiles(messages) {
  const profiles = {};
  for (const msg of messages) {
    const author = msg.author;
    if (author && author.id && !profiles[author.id]) {
      profiles[author.id] = {
        author: author.username || 'Unknown User',
        avatar: author.avatarUrl || '',
        roleColor: author.roleColor || '#b9bbbe',
        bot: author.bot || false,
        verified: false,
      };
    }
  }
  return profiles;
}

function formatMessageContent(content, mentions, profiles) {
  if (!content) return '';
  let formatted = escapeHtml(content);

  // Code blocks
  formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const cleanLang = (lang || 'text').toLowerCase();
    const cleanCode = (code || '').trim();
    return `<discord-code-block language="${cleanLang}">${cleanCode}</discord-code-block>`;
  });

  formatted = formatted.replace(/`([^`]+)`/g, '<discord-code>$1</discord-code>');

  // User Mentions: raw discord format <@123> or <@!123> becomes &lt;@123&gt; after escape
  formatted = formatted.replace(/&lt;@!?(\d+)&gt;/g, (match, id) => {
    let name = profiles[id]?.author || mentions?.users?.[id]?.name || `User ${id}`;
    return `<discord-mention type="user" highlight="true">${escapeHtml(name)}</discord-mention>`;
  });

  // Role Mentions: raw <@&123> becomes &lt;@&amp;123&gt; after escape
  formatted = formatted.replace(/&lt;@(?:&amp;|&)?(\d+)&gt;/g, (match, id) => {
    const role = mentions?.roles?.[id];
    const name = role ? role.name : 'Role';
    const color = role ? role.color : '#7289da';
    return `<discord-mention type="role" color="${color}" highlight="true">${escapeHtml(name)}</discord-mention>`;
  });

  // Channel Mentions: raw <#123> becomes &lt;#123&gt; after escape
  formatted = formatted.replace(/&lt;#(\d+)&gt;/g, (match, id) => {
    const name = mentions?.channels?.[id]?.name || 'channel';
    return `<discord-mention type="channel">${escapeHtml(name)}</discord-mention>`;
  });

  // Timestamps: raw <t:1234567890:f> becomes &lt;t:1234567890:f&gt; after escape
  formatted = formatted.replace(/&lt;t:(\d+)(?::([a-zA-Z]))?&gt;/g, (match, timestamp, style) => {
    const msTimestamp = parseInt(timestamp) * 1000;
    return `<discord-time timestamp="${msTimestamp}" format="${style || 'f'}"></discord-time>`;
  });

  // Custom emoji: raw <:name:id> or <a:name:id> becomes &lt;a?:name:id&gt; after escape
  formatted = formatted.replace(/&lt;a?:(\w+):(\d+)&gt;/g, '<discord-custom-emoji name="$1" url="https://cdn.discordapp.com/emojis/$2.webp?size=44"></discord-custom-emoji>');

  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<discord-bold>$1</discord-bold>');
  formatted = formatted.replace(/(\s|^)\*(.*?)\*(\s|$)/g, '$1<discord-italic>$2</discord-italic>$3');
  formatted = formatted.replace(/__(.*?)__/g, '<discord-underline>$1</discord-underline>');
  formatted = formatted.replace(/~~(.*?)~~/g, '<discord-strikethrough>$1</discord-strikethrough>');
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

function renderEmbeds(embeds, mentions, profiles) {
  if (!embeds || embeds.length === 0) return '';
  return embeds.map(embed => {
    let html = `<discord-embed slot="embeds"`;
    if (embed.color) html += ` color="${'#' + embed.color.toString(16).padStart(6, '0')}"`;
    if (embed.title) html += ` embed-title="${escapeHtml(embed.title)}"`;
    if (embed.author) html += ` author-name="${escapeHtml(embed.author.name)}" author-icon="${escapeHtml(embed.author.iconUrl || '')}"`;
    if (embed.thumbnail?.url) html += ` thumbnail="${escapeHtml(embed.thumbnail.url)}"`;
    if (embed.image?.url) html += ` image="${escapeHtml(embed.image.url)}"`;
    if (embed.footer?.iconUrl) html += ` footer-image="${escapeHtml(embed.footer.iconUrl)}"`;
    if (embed.timestamp) html += ` timestamp="${embed.timestamp}"`;
    html += '>';
    if (embed.description) {
      html += `<discord-embed-description slot="description">${formatMessageContent(embed.description, mentions, profiles)}</discord-embed-description>`;
    }
    if (embed.fields && embed.fields.length > 0) {
      html += `<discord-embed-fields slot="fields">`;
      embed.fields.forEach((field, index) => {
        const fieldIndex = (index % 3) + 1;
        html += `<discord-embed-field field-title="${escapeHtml(field.name)}" ${field.inline ? `inline inline-index="${fieldIndex}"` : ''}>${formatMessageContent(field.value, mentions, profiles)}</discord-embed-field>`;
      });
      html += `</discord-embed-fields>`;
    }
    if (embed.footer?.text) html += `<span slot="footer">${escapeHtml(embed.footer.text)}</span>`;
    html += '</discord-embed>';
    return html;
  }).join('');
}

function renderAttachments(attachments) {
  if (!attachments || attachments.length === 0) return '';
  return attachments.map(att => {
    return `<discord-attachment slot="attachments" url="${escapeHtml(att.url)}"${att.height ? ` height="${att.height}"` : ''}${att.width ? ` width="${att.width}"` : ''}${att.name ? ` alt="${escapeHtml(att.name)}"` : ''}></discord-attachment>`;
  }).join('');
}

function renderComponents(components, mentions, profiles) {
  if (!components || components.length === 0) return '';

  const processComponents = (comps) => {
    let html = '';
    for (const comp of comps) {
      if (comp.type === 1 && comp.components) {
        html += '<discord-action-row>';
        html += processComponents(comp.components);
        html += '</discord-action-row>';
      } else if (comp.type === 2) {
        const type = comp.style === 4 ? 'destructive' : comp.style === 3 ? 'success' : 'secondary';
        html += `<discord-button type="${type}"${comp.disabled ? ' disabled' : ''}${comp.url ? ` url="${escapeHtml(comp.url)}"` : ''}>${escapeHtml(comp.label || 'Button')}</discord-button>`;
      } else if (comp.type === 17 && comp.components) {
        const color = comp.accent_color ? '#' + comp.accent_color.toString(16).padStart(6, '0') : '#7289da';
        html += `<div style="border-left: 4px solid ${color}; padding-left: 10px; margin: 8px 0; background: rgba(255,255,255,0.03); border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">`;
        html += processComponents(comp.components);
        html += '</div>';
      } else if (comp.type === 10) {
        html += `<div style="margin: 4px 0;">${formatMessageContent(comp.content, mentions, profiles)}</div>`;
      } else if (comp.type === 15) {
        if (comp.components) html += processComponents(comp.components);
        if (comp.accessory) html += processComponents([comp.accessory]);
      } else if (comp.type === 14) {
        html += '<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 10px 0;">';
      } else if (comp.type === 12 && comp.items) {
        for (const item of comp.items) {
          if (item.media?.url) {
            html += `<discord-attachment slot="attachments" url="${item.media.url}"></discord-attachment>`;
          }
        }
      }
    }
    return html;
  };

  let html = '<discord-attachments slot="components">';
  html += processComponents(components);
  html += '</discord-attachments>';
  return html;
}

function renderMessages(messages, profiles) {
  return messages.map(msg => {
    const timestamp = new Date(msg.timestamp).toISOString();
    const content = formatMessageContent(msg.content, msg.mentions, profiles);
    const attachmentsHTML = renderAttachments(msg.attachments);
    const embedsHTML = renderEmbeds(msg.embeds, msg.mentions, profiles);
    const componentsHTML = renderComponents(msg.components, msg.mentions, profiles);

    return `<discord-message id="m-${msg.id}" timestamp="${timestamp}" profile="${msg.author.id}">${content}${attachmentsHTML}${embedsHTML}${componentsHTML}</discord-message>`;
  }).join('\n');
}

function generateTranscriptHTML({ messages, channelName, closedAt, reason, openerTag, openReason, extraFields, staffRequestReason, guildName }) {
  const profiles = buildProfiles(messages);
  const messagesHTML = renderMessages(messages, profiles);

  let extraHeaderHTML = (extraFields || []).map(f => `
    <div class="meta-item">
      <div class="meta-label">${escapeHtml(f.name)}</div>
      <div class="meta-value">${escapeHtml(f.value)}</div>
    </div>
  `).join('');

  if (openReason && openReason !== 'No initial query provided') {
    extraHeaderHTML = `
    <div class="meta-item full-width">
      <div class="meta-label">Initial Query</div>
      <div class="meta-value">${escapeHtml(openReason)}</div>
    </div>` + extraHeaderHTML;
  }

  if (staffRequestReason) {
    extraHeaderHTML += `
    <div class="meta-item full-width">
      <div class="meta-label">Staff Resolution Summary</div>
      <div class="meta-value">${escapeHtml(staffRequestReason)}</div>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ticket - ${escapeHtml(channelName)}</title>
  <link rel="icon" type="image/png" href="${GSRP_LOGO}"/>
  <style>
    body { margin:0; min-height:100vh; background-color: #09090b; font-family: sans-serif; color: #a1a1aa; }
    .transcript-meta-info { background: #121214; padding: 40px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .meta-item { border-left: 2px solid #3b82f6; padding: 12px 16px; background: #09090b; border-radius: 8px; }
    .meta-label { font-size: 10px; color: #52525b; text-transform: uppercase; font-weight: 800; margin-bottom: 4px; letter-spacing: 0.1em; }
    .meta-value { font-weight: 600; font-size: 14px; color: #f4f4f5; }
    .full-width { grid-column: 1 / -1; }
  </style>
  <script id="discord-profiles-data" type="application/json">${JSON.stringify(profiles)}</script>
  <script type="module" src="${COMPONENT_LIBRARY_URL}"></script>
</head>
<body>
  <div class="transcript-meta-info">
    <div class="meta-grid">
      <div class="meta-item"><div class="meta-label">Ticket Identifier</div><div class="meta-value">${escapeHtml(channelName)}</div></div>
      <div class="meta-item"><div class="meta-label">Ticket Opener</div><div class="meta-value">${escapeHtml(openerTag)}</div></div>
      <div class="meta-item"><div class="meta-label">Closed Timestamp</div><div class="meta-value">${closedAt ? new Date(closedAt).toLocaleString() : ''}</div></div>
      <div class="meta-item"><div class="meta-label">Close Reason</div><div class="meta-value">${escapeHtml(reason || 'No reason provided')}</div></div>
      ${extraHeaderHTML}
    </div>
  </div>
  <discord-messages style="min-height:100vh">
    <discord-header guild="${escapeHtml(guildName || 'GSRP')}" channel="${escapeHtml(channelName)}" icon="${GSRP_LOGO}">SUPPORT TICKET</discord-header>
    ${messagesHTML}
  </discord-messages>
  <script>
    const dataScript = document.getElementById('discord-profiles-data');
    if (dataScript) {
      window.$discordMessage = { profiles: JSON.parse(dataScript.textContent) };
    }
  </script>
</body>
</html>`;
}

module.exports = { generateTranscriptHTML };
