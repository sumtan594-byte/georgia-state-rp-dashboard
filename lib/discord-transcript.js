/*
 * Discord-style static transcript renderer.
 *
 * The document structure and interactions follow the user-selected
 * DiscordChatExporterPy presentation, adapted for the JSON-safe message model
 * used by the GSRP Node.js bot and dashboard.
 */

const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png';
const DISCORD_LOGO = 'https://cdn.jsdelivr.net/gh/mahtoid/DiscordUtils@master/discord-logo.svg';
const HASHTAG_ICON = 'https://cdn.jsdelivr.net/gh/mahtoid/DiscordUtils@master/discord-hashtag.svg';

function escapeHtml(value) {
    if (value == null) return '';
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
}

function safeUrl(value, fallback = '') {
    if (!value) return fallback;
    try {
        const url = new URL(String(value));
        return ['http:', 'https:'].includes(url.protocol) ? url.href : fallback;
    } catch {
        return fallback;
    }
}

function safeColor(value, fallback = '#b5bac1') {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return `#${Math.max(0, Math.min(0xffffff, value)).toString(16).padStart(6, '0')}`;
    }
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
}

function formatDate(value, includeTime = true) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    const options = includeTime
        ? { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' }
        : { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' };
    return new Intl.DateTimeFormat('en-US', options).format(date).replace(',', '');
}

function formatLongTimestamp(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return 'Unknown timestamp';
    return `${new Intl.DateTimeFormat('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'UTC'
    }).format(date)} UTC`;
}

function discordTimestamp(milliseconds, style) {
    const date = new Date(Number(milliseconds));
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    if (style === 'R') return formatDate(date, true);
    if (style === 'd') return new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeZone: 'UTC' }).format(date);
    if (style === 'D') return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
    if (style === 't') return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(date);
    if (style === 'T') return new Intl.DateTimeFormat('en-US', { timeStyle: 'medium', hour12: true, timeZone: 'UTC' }).format(date);
    return formatDate(date, true);
}

function renderInlineMarkdown(raw, message = {}) {
    const tokens = [];
    const token = (html) => {
        const index = tokens.push(html) - 1;
        return `\u0000${index}\u0000`;
    };

    let text = String(raw || '');
    text = text.replace(/`([^`\n]+)`/g, (_, code) => token(`<code class="pre pre--inline">${escapeHtml(code)}</code>`));
    text = text.replace(/&lt;|&gt;|&amp;/g, (entity) => ({ '&lt;': '<', '&gt;': '>', '&amp;': '&' }[entity]));
    text = escapeHtml(text);

    text = text.replace(/&lt;@!?([0-9]+)&gt;/g, (_, id) => {
        const user = message.mentions?.users?.[id];
        return token(`<span class="mention" title="User ID: ${escapeAttribute(id)}">@${escapeHtml(user?.displayName || user?.name || `User-${id}`)}</span>`);
    });
    text = text.replace(/&lt;@&amp;([0-9]+)&gt;/g, (_, id) => {
        const role = message.mentions?.roles?.[id];
        const color = safeColor(role?.color, '#dee0fc');
        return token(`<span class="mention mention--role" style="--mention-color:${color}" title="Role ID: ${escapeAttribute(id)}">@${escapeHtml(role?.name || `Role-${id}`)}</span>`);
    });
    text = text.replace(/&lt;#([0-9]+)&gt;/g, (_, id) => {
        const channel = message.mentions?.channels?.[id];
        return token(`<span class="mention" title="Channel ID: ${escapeAttribute(id)}">#${escapeHtml(channel?.name || `channel-${id}`)}</span>`);
    });
    text = text.replace(/&lt;t:([0-9]+)(?::([A-Za-z]))?&gt;/g, (_, timestamp, style) => {
        return token(`<span class="unix-timestamp" title="${escapeAttribute(formatLongTimestamp(Number(timestamp) * 1000))}">${escapeHtml(discordTimestamp(Number(timestamp) * 1000, style))}</span>`);
    });
    text = text.replace(/&lt;(a?):([A-Za-z0-9_]+):([0-9]+)&gt;/g, (_, animated, name, id) => {
        const extension = animated ? 'gif' : 'webp';
        return token(`<img class="emoji" src="https://cdn.discordapp.com/emojis/${id}.${extension}?size=48" alt=":${escapeAttribute(name)}:" title=":${escapeAttribute(name)}:">`);
    });
    text = text.replace(/\|\|([\s\S]+?)\|\|/g, (_, hidden) => token(`<span class="spoiler spoiler--hidden" tabindex="0"><span class="spoiler-text">${renderInlineMarkdown(hidden, message)}</span></span>`));
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => token(`<a href="${escapeAttribute(safeUrl(url))}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`));
    text = text.replace(/(https?:\/\/[^\s<]+)/g, (url) => token(`<a href="${escapeAttribute(safeUrl(url))}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>`));
    text = text.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([\s\S]+?)__/g, '<u>$1</u>');
    text = text.replace(/~~([\s\S]+?)~~/g, '<s>$1</s>');
    text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

    return text.replace(/\u0000([0-9]+)\u0000/g, (_, index) => tokens[Number(index)] || '');
}

function renderMarkdown(raw, message = {}) {
    if (!raw) return '';
    const blocks = [];
    let text = String(raw).replace(/```([^\n`]*)\n?([\s\S]*?)```/g, (_, language, code) => {
        const index = blocks.push(`<pre class="pre pre--multiline"><code data-language="${escapeAttribute(language.trim() || 'text')}">${escapeHtml(code.replace(/^\n|\n$/g, ''))}</code></pre>`) - 1;
        return `\u0001${index}\u0001`;
    });

    const rendered = text.split('\n').map((line) => {
        const blockMatch = line.match(/^\u0001([0-9]+)\u0001$/);
        if (blockMatch) return blocks[Number(blockMatch[1])] || '';
        const heading = line.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
            const level = heading[1].length + 1;
            return `<h${level} style="margin:2px 0;color:#f2f3f5;line-height:1.25">${renderInlineMarkdown(heading[2], message)}</h${level}>`;
        }
        if (/^-#\s+/.test(line)) return `<small style="color:#949ba4">${renderInlineMarkdown(line.replace(/^-#\s+/, ''), message)}</small>`;
        if (/^[-*]\s+/.test(line)) return `<div style="display:grid;grid-template-columns:20px 1fr;padding-left:8px"><span>•</span><span>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ''), message)}</span></div>`;
        if (/^[0-9]+\.\s+/.test(line)) {
            const ordered = line.match(/^([0-9]+)\.\s+(.+)$/);
            return `<div style="display:grid;grid-template-columns:24px 1fr;padding-left:8px"><span>${ordered[1]}.</span><span>${renderInlineMarkdown(ordered[2], message)}</span></div>`;
        }
        if (/^\s*&gt;/.test(escapeHtml(line))) return `<div class="quote">${renderInlineMarkdown(line.replace(/^\s*>\s?/, ''), message)}</div>`;
        return renderInlineMarkdown(line, message);
    }).join('<br>');

    return rendered.replace(/\u0001([0-9]+)\u0001/g, (_, index) => blocks[Number(index)] || '');
}

function renderAttachments(attachments = []) {
    if (!attachments.length) return '';
    return `<div class="chatlog__attachments">${attachments.map((attachment) => {
        const url = safeUrl(attachment.url);
        if (!url) return '';
        const name = attachment.name || 'attachment';
        const extension = name.split('.').pop().toLowerCase();
        if (attachment.sticker || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
            return `<a class="chatlog__attachment-link" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer"><img class="chatlog__attachment-media${attachment.sticker ? ' chatlog__sticker' : ''}" src="${escapeAttribute(url)}" alt="${escapeAttribute(name)}" loading="lazy"></a>`;
        }
        if (['mp4', 'mov', 'webm'].includes(extension)) return `<video class="chatlog__attachment-media" src="${escapeAttribute(url)}" controls preload="metadata"></video>`;
        if (['mp3', 'ogg', 'wav', 'm4a'].includes(extension)) return `<audio class="chatlog__audio" src="${escapeAttribute(url)}" controls preload="metadata"></audio>`;
        return `<a class="chatlog__file" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer"><span class="chatlog__file-icon">↧</span><span><strong>${escapeHtml(name)}</strong><small>Download attachment</small></span></a>`;
    }).join('')}</div>`;
}

function renderEmbed(embed = {}, message = {}) {
    const color = safeColor(embed.color, '#1e1f22');
    const author = embed.author?.name ? `<div class="chatlog__embed-author">${embed.author.iconUrl ? `<img src="${escapeAttribute(safeUrl(embed.author.iconUrl))}" alt="">` : ''}${escapeHtml(embed.author.name)}</div>` : '';
    const title = embed.title ? `<div class="chatlog__embed-title">${embed.url ? `<a href="${escapeAttribute(safeUrl(embed.url))}" target="_blank" rel="noreferrer">${escapeHtml(embed.title)}</a>` : escapeHtml(embed.title)}</div>` : '';
    const description = embed.description ? `<div class="chatlog__embed-description chatlog__markdown">${renderMarkdown(embed.description, message)}</div>` : '';
    const fields = (embed.fields || []).map((field) => `<div class="chatlog__embed-field${field.inline ? ' chatlog__embed-field--inline' : ''}"><div class="chatlog__embed-field-name">${renderMarkdown(field.name, message)}</div><div class="chatlog__embed-field-value chatlog__markdown">${renderMarkdown(field.value, message)}</div></div>`).join('');
    const thumbnail = embed.thumbnail?.url ? `<img class="chatlog__embed-thumbnail" src="${escapeAttribute(safeUrl(embed.thumbnail.url))}" alt="" loading="lazy">` : '';
    const image = embed.image?.url ? `<a href="${escapeAttribute(safeUrl(embed.image.url))}" target="_blank" rel="noreferrer"><img class="chatlog__embed-image" src="${escapeAttribute(safeUrl(embed.image.url))}" alt="" loading="lazy"></a>` : '';
    const footer = embed.footer?.text || embed.timestamp ? `<div class="chatlog__embed-footer">${embed.footer?.iconUrl ? `<img src="${escapeAttribute(safeUrl(embed.footer.iconUrl))}" alt="">` : ''}<span>${escapeHtml(embed.footer?.text || '')}${embed.footer?.text && embed.timestamp ? ' • ' : ''}${embed.timestamp ? escapeHtml(formatDate(embed.timestamp, true)) : ''}</span></div>` : '';
    return `<div class="chatlog__embed" style="--embed-color:${color}"><div class="chatlog__embed-content">${author}${title}${description}${fields ? `<div class="chatlog__embed-fields">${fields}</div>` : ''}${image}${footer}</div>${thumbnail}</div>`;
}

function renderComponents(components = [], message = {}) {
    const render = (component) => {
        const type = component?.type;
        if (type === 1) return `<div class="chatlog__component-row">${(component.components || []).map(render).join('')}</div>`;
        if (type === 2) {
            const url = safeUrl(component.url);
            const label = escapeHtml(component.label || 'Button');
            const className = `chatlog__component-button button-style-${component.style || 2}${component.disabled ? ' disabled' : ''}`;
            return url ? `<a class="${className}" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">${label}</a>` : `<span class="${className}">${label}</span>`;
        }
        if (type === 10) return `<div class="chatlog__component-text chatlog__markdown">${renderMarkdown(component.content || '', message)}</div>`;
        if (type === 12) return `<div class="chatlog__media-gallery">${(component.items || []).map((item) => {
            const url = safeUrl(item.media?.url || item.url);
            return url ? `<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer"><img src="${escapeAttribute(url)}" alt="${escapeAttribute(item.description || '')}" loading="lazy"></a>` : '';
        }).join('')}</div>`;
        if (type === 14) return `<hr class="chatlog__component-separator${component.divider === false ? ' no-divider' : ''}">`;
        if (type === 15) return `<div class="chatlog__component-section"><div>${(component.components || []).map(render).join('')}</div>${component.accessory ? `<div>${render(component.accessory)}</div>` : ''}</div>`;
        if (type === 17) return `<div class="chatlog__component-container" style="--component-accent:${safeColor(component.accent_color || component.accentColor, '#4e5058')}">${(component.components || []).map(render).join('')}</div>`;
        if (type === 18) return `<span class="chatlog__component-label">${escapeHtml(component.label || '')}</span>`;
        return '';
    };
    const html = components.map(render).join('');
    return html ? `<div class="chatlog__components">${html}</div>` : '';
}

function normalizeMessage(message, index) {
    const author = message?.author || {};
    const username = author.username || author.name || author.displayName || 'Unknown User';
    return {
        ...message,
        id: String(message?.id || `unknown-${index}`),
        timestamp: Number(message?.timestamp || message?.createdTimestamp || Date.now()),
        author: {
            ...author,
            id: String(author.id || 'unknown'),
            username,
            displayName: author.displayName || username,
            tag: author.tag || username,
            avatarUrl: safeUrl(author.avatarUrl, DEFAULT_AVATAR),
            roleColor: safeColor(author.roleColor, '#f2f3f5')
        },
        attachments: Array.isArray(message?.attachments) ? message.attachments : [],
        embeds: Array.isArray(message?.embeds) ? message.embeds : [],
        components: Array.isArray(message?.components) ? message.components : [],
        editHistory: Array.isArray(message?.editHistory) ? message.editHistory : []
    };
}

function renderReply(message, messagesById) {
    if (!message.replyTo?.id) return '';
    const target = messagesById.get(String(message.replyTo.id));
    if (!target) return `<div class="chatlog__reference"><span class="chatlog__reference-symbol"></span><span>Original message was unavailable</span></div>`;
    const preview = String(target.content || '').replace(/\s+/g, ' ').slice(0, 120) || 'Click to view attachment';
    return `<button class="chatlog__reference" type="button" data-scroll-message="${escapeAttribute(target.id)}"><span class="chatlog__reference-symbol"></span><img src="${escapeAttribute(target.author.avatarUrl)}" alt=""><strong>${escapeHtml(target.author.displayName)}</strong><span>${escapeHtml(preview)}</span></button>`;
}

function renderAudit(message) {
    if (!message.deleted && !message.editHistory.length) return '';
    const edits = message.editHistory.map((edit, index) => `<div class="audit__change"><span>Edit ${index + 1}</span><div><del>${escapeHtml(edit.beforeContent || '*No text content*')}</del><ins>${escapeHtml(edit.afterContent || '*No text content*')}</ins></div><time>${escapeHtml(formatDate(edit.editedAt, true))}</time></div>`).join('');
    return `<details class="audit${message.deleted ? ' audit--deleted' : ''}"><summary>${message.deleted ? 'Deleted message' : 'Edited message'} history</summary>${edits}${message.deleted ? `<div class="audit__deleted"><span>Deleted ${escapeHtml(formatDate(message.deletedAt, true))}</span></div>` : ''}</details>`;
}

function renderMessage(message, previous, messagesById) {
    const followup = previous && previous.author.id === message.author.id && message.timestamp - previous.timestamp < 7 * 60 * 1000;
    const authorTitle = message.author.tag && message.author.tag !== message.author.displayName ? message.author.tag : message.author.username;
    const status = `${message.editedTimestamp || message.editHistory.length ? '<span class="chatlog__edited" title="This message was edited">(edited)</span>' : ''}${message.deleted ? '<span class="chatlog__deleted-badge">DELETED</span>' : ''}`;
    const content = message.content ? `<div class="chatlog__content chatlog__markdown${message.deleted ? ' chatlog__content--deleted' : ''}">${renderMarkdown(message.content, message)}</div>` : '';
    const body = `${content}${message.embeds.map((embed) => renderEmbed(embed, message)).join('')}${renderAttachments(message.attachments)}${renderComponents(message.components, message)}${renderAudit(message)}`;
    return `<div id="chatlog__message-container-${escapeAttribute(message.id)}" class="chatlog__message-container${message.deleted ? ' chatlog__message-container--deleted' : ''}" data-message-id="${escapeAttribute(message.id)}">
      ${renderReply(message, messagesById)}
      <div class="chatlog__message${followup ? ' chatlog__message--followup' : ''}">
        <div class="chatlog__message-aside">${followup ? `<span class="chatlog__short-timestamp" title="${escapeAttribute(formatLongTimestamp(message.timestamp))}">${escapeHtml(new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(new Date(message.timestamp)))}</span>` : `<button class="chatlog__user-button" type="button" data-user-id="${escapeAttribute(message.author.id)}"><img class="chatlog__avatar" src="${escapeAttribute(message.author.avatarUrl)}" alt="${escapeAttribute(message.author.displayName)}"></button>`}</div>
        <div class="chatlog__message-primary">${followup ? '' : `<div class="chatlog__header"><button class="chatlog__author-name" type="button" data-user-id="${escapeAttribute(message.author.id)}" title="${escapeAttribute(authorTitle)}" style="color:${message.author.roleColor}">${escapeHtml(message.author.displayName)}${message.author.roleIconUrl ? `<img class="chatlog__role-icon" src="${escapeAttribute(safeUrl(message.author.roleIconUrl))}" alt="">` : ''}</button>${message.author.bot ? '<span class="chatlog__bot-tag">APP</span>' : ''}<span class="chatlog__timestamp" title="${escapeAttribute(formatLongTimestamp(message.timestamp))}">${escapeHtml(formatDate(message.timestamp, true))}</span>${status}</div>`}${body}</div>
      </div>
    </div>`;
}

function renderProfile(author, count, metadata) {
    const accountDate = author.createdTimestamp ? formatDate(author.createdTimestamp, false) : 'Unknown';
    const joinedDate = author.joinedTimestamp ? formatDate(author.joinedTimestamp, false) : 'Unknown';
    return `<div id="meta-popout-${escapeAttribute(author.id)}" class="meta-popout" role="dialog" aria-label="User information">
      <div class="meta__header"><img src="${escapeAttribute(author.avatarUrl)}" alt="${escapeAttribute(author.displayName)}"></div>
      <div class="meta__description">${author.displayName !== author.username ? `<div class="meta__display-name">${escapeHtml(author.displayName)}</div>` : ''}<div class="meta__details"><span class="meta__user">${escapeHtml(author.username)}</span>${author.discriminator && author.discriminator !== '0' ? `<span class="meta__discriminator">#${escapeHtml(author.discriminator)}</span>` : ''}${author.bot ? '<span class="chatlog__bot-tag">APP</span>' : ''}</div>${author.roleName ? `<div class="meta__role" style="--role-color:${author.roleColor}">${escapeHtml(author.roleName)}</div>` : ''}<div class="meta__divider"></div>
        <div class="meta__field"><div class="meta__title">Member Since</div><div class="meta__value"><img src="${DISCORD_LOGO}" alt="Discord">${escapeHtml(accountDate)}<span>•</span>${metadata.guildIconUrl ? `<img class="meta__guild-icon" src="${escapeAttribute(metadata.guildIconUrl)}" alt="">` : ''}${escapeHtml(joinedDate)}</div></div>
        <div class="meta__field"><div class="meta__title">Member ID</div><div class="meta__value meta__copy" data-copy-value="${escapeAttribute(author.id)}">${escapeHtml(author.id)}</div></div>
        <div class="meta__field"><div class="meta__title">Message Count</div><div class="meta__value">${count}</div></div>
      </div>
    </div>`;
}

function styles() {
    return `<style>
@font-face{font-family:"gg sans";font-weight:400;src:url(https://cdn.jsdelivr.net/gh/mahtoid/DiscordUtils@master/ggsans-400.woff2)}@font-face{font-family:"gg sans";font-weight:500;src:url(https://cdn.jsdelivr.net/gh/mahtoid/DiscordUtils@master/ggsans-500.woff2)}@font-face{font-family:"gg sans";font-weight:600;src:url(https://cdn.jsdelivr.net/gh/mahtoid/DiscordUtils@master/ggsans-600.woff2)}
:root{color-scheme:dark;--bg:#313338;--panel:#2b2d31;--surface:#232428;--text:#dbdee1;--muted:#949ba4;--link:#00a8fc;--hover:rgba(255,255,255,.06);--border:rgba(255,255,255,.08);--brand:#5865f2}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:"gg sans",Arial,sans-serif;font-size:16px}button{font:inherit}a{color:var(--link);text-decoration:none}a:hover{text-decoration:underline}.panel{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:10px;height:48px;padding:0 18px;background:rgba(43,45,49,.96);border-bottom:1px solid var(--border);box-shadow:0 1px 4px rgba(0,0,0,.35);font-weight:600}.panel__icon{width:20px;height:20px;opacity:.72}.panel__spacer{flex:1}.panel__button{border:0;border-radius:4px;background:#4e5058;color:#fff;padding:7px 12px;cursor:pointer;font-weight:600}.panel__button:hover{background:#5d6068}.main{min-height:calc(100vh - 48px)}.info{padding:48px 72px 28px;border-bottom:1px solid var(--border)}.info__icon{display:grid;place-items:center;width:68px;height:68px;border-radius:50%;background:#41434a;font-size:34px;font-weight:600;margin-bottom:14px}.info__title{display:block;color:#f2f3f5;font-size:32px;font-weight:700}.info__subject{display:block;margin-top:8px;color:#b5bac1}.chatlog{padding:18px 0 42px}.chatlog__message-container{position:relative;padding-top:2px}.chatlog__message-container:hover{background:var(--hover)}.chatlog__message-container--highlighted{background:rgba(88,101,242,.2)!important}.chatlog__message-container--deleted{background:rgba(237,66,69,.035)}.chatlog__message{display:grid;grid-template-columns:72px minmax(0,1fr);padding:2px 20px 2px 0;min-height:44px}.chatlog__message--followup{min-height:24px}.chatlog__message-aside{display:flex;justify-content:center;position:relative}.chatlog__user-button,.chatlog__author-name{border:0;background:transparent;padding:0;cursor:pointer}.chatlog__avatar{width:40px;height:40px;border-radius:50%;object-fit:cover}.chatlog__avatar:hover{filter:brightness(1.12)}.chatlog__short-timestamp{display:none;color:#949ba4;font-size:10px;line-height:22px}.chatlog__message-container:hover .chatlog__short-timestamp{display:block}.chatlog__header{display:flex;align-items:baseline;gap:6px;min-width:0;line-height:20px}.chatlog__author-name{display:inline-flex;align-items:center;gap:4px;font-weight:600;text-align:left}.chatlog__author-name:hover{text-decoration:underline}.chatlog__role-icon{width:16px;height:16px}.chatlog__bot-tag{display:inline-flex;align-items:center;border-radius:3px;background:var(--brand);color:#fff;padding:1px 4px;font-size:10px;font-weight:600;line-height:14px}.chatlog__timestamp,.chatlog__edited{color:var(--muted);font-size:12px}.chatlog__deleted-badge{border-radius:3px;background:rgba(237,66,69,.2);color:#ffb8b9;padding:1px 4px;font-size:10px;font-weight:600}.chatlog__content{line-height:1.375;white-space:normal;overflow-wrap:anywhere}.chatlog__content--deleted{color:#c7c9cc}.chatlog__markdown strong{color:#f2f3f5}.chatlog__markdown br+br{line-height:2}.mention{border-radius:3px;padding:0 2px;color:#c9cdfb;background:rgba(88,101,242,.3);font-weight:500}.mention:hover{background:var(--brand);color:#fff}.mention--role{color:var(--mention-color);background:color-mix(in srgb,var(--mention-color) 24%,transparent)}.emoji{width:1.35em;height:1.35em;vertical-align:-.28em}.unix-timestamp{border-radius:3px;background:#3f4147;padding:0 2px}.spoiler{border-radius:4px;background:#1e1f22;cursor:pointer}.spoiler--hidden .spoiler-text{color:transparent;user-select:none}.spoiler--hidden:hover .spoiler-text,.spoiler--revealed .spoiler-text{color:var(--text)}.quote{display:flex;color:#c4c9ce}.quote:before{content:"";width:4px;border-radius:2px;background:#4e5058;margin-right:8px}.pre{font-family:Consolas,monospace;background:#2b2d31;border:1px solid #1e1f22}.pre--inline{border-radius:4px;padding:1px 4px;font-size:85%}.pre--multiline{padding:8px;margin:6px 0;white-space:pre-wrap;border-radius:4px;overflow:auto}.chatlog__reference{display:flex;align-items:center;gap:5px;margin-left:72px;height:22px;border:0;background:transparent;color:#b5bac1;font-size:12px;cursor:pointer;max-width:calc(100% - 92px);padding:0}.chatlog__reference:hover span:last-child{color:#fff}.chatlog__reference-symbol{width:30px;height:10px;border-left:2px solid #4e5058;border-top:2px solid #4e5058;border-radius:8px 0 0}.chatlog__reference img{width:16px;height:16px;border-radius:50%}.chatlog__reference span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chatlog__attachments{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.chatlog__attachment-media{display:block;max-width:min(520px,100%);max-height:420px;border-radius:8px;background:#1e1f22}.chatlog__sticker{width:160px;height:160px;object-fit:contain}.chatlog__audio{max-width:100%;margin-top:5px}.chatlog__file{display:flex;align-items:center;gap:10px;min-width:260px;max-width:420px;padding:12px;border:1px solid var(--border);border-radius:8px;background:#2b2d31}.chatlog__file-icon{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#1e1f22;font-size:20px}.chatlog__file small{display:block;color:var(--muted)}.chatlog__embed{display:grid;grid-template-columns:minmax(0,520px) auto;width:max-content;max-width:100%;margin-top:6px;border-left:4px solid var(--embed-color);border-radius:4px;background:#2b2d31;padding:12px}.chatlog__embed-content{min-width:0}.chatlog__embed-author{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600}.chatlog__embed-author img{width:24px;height:24px;border-radius:50%}.chatlog__embed-title{margin-top:6px;color:#f2f3f5;font-weight:600}.chatlog__embed-description{margin-top:6px;font-size:14px}.chatlog__embed-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.chatlog__embed-field{grid-column:1/-1;font-size:14px}.chatlog__embed-field--inline{grid-column:span 1}.chatlog__embed-field-name{font-weight:600;color:#f2f3f5}.chatlog__embed-thumbnail{width:80px;height:80px;object-fit:cover;border-radius:4px;margin-left:16px}.chatlog__embed-image{display:block;max-width:100%;max-height:350px;margin-top:12px;border-radius:4px}.chatlog__embed-footer{display:flex;align-items:center;gap:5px;margin-top:10px;color:#b5bac1;font-size:12px}.chatlog__embed-footer img{width:20px;height:20px;border-radius:50%}.chatlog__components{max-width:560px;margin-top:8px}.chatlog__component-row{display:flex;flex-wrap:wrap;gap:8px}.chatlog__component-button{display:inline-flex;align-items:center;justify-content:center;min-height:32px;border-radius:3px;background:#4e5058;color:#fff;padding:4px 14px;font-size:14px;font-weight:500;text-decoration:none}.chatlog__component-button:hover{text-decoration:none;background:#5d6068}.button-style-1{background:#5865f2}.button-style-3{background:#248046}.button-style-4{background:#da373c}.chatlog__component-button.disabled{opacity:.5}.chatlog__component-container{position:relative;margin:6px 0;border:1px solid var(--border);border-left:4px solid var(--component-accent);border-radius:8px;background:#2b2d31;padding:12px}.chatlog__component-text{margin:4px 0}.chatlog__component-separator{border:0;border-top:1px solid var(--border);margin:10px 0}.chatlog__component-separator.no-divider{border:0}.chatlog__component-section{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px}.chatlog__media-gallery{display:grid;grid-template-columns:repeat(2,1fr);gap:4px}.chatlog__media-gallery img{width:100%;height:180px;object-fit:cover;border-radius:5px}.audit{max-width:700px;margin:6px 0;border-left:3px solid #f0b232;background:rgba(240,178,50,.09);border-radius:4px;padding:7px 10px;font-size:12px}.audit--deleted{border-color:#ed4245;background:rgba(237,66,69,.09)}.audit summary{cursor:pointer;font-weight:600}.audit__change{margin-top:8px}.audit__change>span,.audit__deleted span{color:#f0b232;font-weight:600;text-transform:uppercase}.audit__change del,.audit__change ins{display:block;text-decoration:none;white-space:pre-wrap}.audit__change del{color:#ffb8b9}.audit__change ins{color:#a7f3bf}.audit__change time{color:var(--muted)}.footer{padding:20px 72px 36px;color:var(--muted);font-size:12px;border-top:1px solid var(--border)}#context-menu{position:fixed;z-index:100;display:none;min-width:170px;padding:6px;border-radius:5px;background:#111214;box-shadow:0 8px 24px rgba(0,0,0,.45)}#context-menu button{width:100%;border:0;border-radius:3px;background:transparent;color:#dbdee1;padding:8px 10px;text-align:left;cursor:pointer}#context-menu button:hover{background:#5865f2;color:#fff}.meta-popout,.summary-popout{position:fixed;z-index:90;display:none;width:min(310px,calc(100vw - 20px));border-radius:8px;background:#111214;box-shadow:0 10px 36px rgba(0,0,0,.55);overflow:hidden}.meta__header{display:flex;justify-content:center;padding:16px;background:#232428}.meta__header>img{width:80px;height:80px;border-radius:50%;object-fit:cover}.meta__description{margin:8px;padding:12px;border-radius:6px;background:#1e1f22}.meta__display-name{color:#fff;font-size:13px}.meta__details{display:flex;align-items:center;gap:2px;color:#f2f3f5;font-weight:600}.meta__discriminator{color:#b5bac1;font-weight:400}.meta__role{display:inline-flex;margin-top:8px;border:1px solid var(--role-color);border-radius:10px;color:var(--role-color);padding:2px 7px;font-size:11px}.meta__divider{height:1px;background:var(--border);margin:10px 0}.meta__field{margin-top:10px}.meta__title{color:#b5bac1;font-size:11px;font-weight:600;text-transform:uppercase}.meta__value{display:flex;align-items:center;gap:5px;margin-top:2px;color:#dbdee1;font-size:13px}.meta__value img{width:16px;height:16px}.meta__value .meta__guild-icon{border-radius:50%}.meta__copy{cursor:pointer}.meta__copy:hover{color:#fff}.summary-popout{padding:8px}.summary-popout .meta__description{margin:0}.toast{position:fixed;right:16px;bottom:16px;z-index:110;transform:translateY(20px);opacity:0;border-radius:4px;background:#248046;color:#fff;padding:10px 14px;font-size:13px;transition:.2s}.toast.show{transform:translateY(0);opacity:1}
@media(max-width:640px){html,body{font-size:15px}.panel{padding:0 12px}.info{padding:28px 16px 20px}.info__title{font-size:24px}.chatlog__message{grid-template-columns:56px minmax(0,1fr);padding-right:10px}.chatlog__reference{margin-left:56px}.chatlog__avatar{width:36px;height:36px}.chatlog__embed-fields{grid-template-columns:1fr}.chatlog__embed-field--inline{grid-column:1}.footer{padding:18px 16px}.panel__label{display:none}}
@media print{.panel{position:static}.panel__button,#context-menu,.meta-popout,.summary-popout,.toast{display:none!important}.chatlog__message-container{break-inside:avoid}}
</style>`;
}

function scripts() {
    return `<script>
(function(){
  var contextMenu=document.getElementById('context-menu'),activePopout=null,activeMessageId='';
  function closePopouts(){document.querySelectorAll('.meta-popout,.summary-popout').forEach(function(el){el.style.display='none'});activePopout=null}
  function position(el,x,y){el.style.display='block';var r=el.getBoundingClientRect();el.style.left=Math.max(8,Math.min(x,innerWidth-r.width-8))+'px';el.style.top=Math.max(8,Math.min(y,innerHeight-r.height-8))+'px'}
  function toast(text){var el=document.getElementById('copy-toast');el.textContent=text;el.classList.add('show');setTimeout(function(){el.classList.remove('show')},1400)}
  function copy(value,label){var area=document.createElement('textarea');area.value=value;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.focus();area.select();var copied=false;try{copied=document.execCommand('copy')}catch(error){}area.remove();if(!copied&&navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(value).catch(function(){})}toast(label||'Copied')}
  document.addEventListener('contextmenu',function(event){var message=event.target.closest('.chatlog__message-container');if(!message)return;event.preventDefault();closePopouts();activeMessageId=message.dataset.messageId;position(contextMenu,event.clientX,event.clientY)});
  document.getElementById('copy-message-id').addEventListener('click',function(){copy(activeMessageId,'Message ID copied');contextMenu.style.display='none'});
  document.addEventListener('click',function(event){
    var user=event.target.closest('[data-user-id]');var summary=event.target.closest('#summary-button');var copyValue=event.target.closest('[data-copy-value]');var spoiler=event.target.closest('.spoiler--hidden');var scroll=event.target.closest('[data-scroll-message]');
    contextMenu.style.display='none';
    if(copyValue){copy(copyValue.dataset.copyValue,'ID copied');return}
    if(spoiler){spoiler.classList.remove('spoiler--hidden');spoiler.classList.add('spoiler--revealed');return}
    if(scroll){var target=document.getElementById('chatlog__message-container-'+scroll.dataset.scrollMessage);if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('chatlog__message-container--highlighted');setTimeout(function(){target.classList.remove('chatlog__message-container--highlighted')},1500)}return}
    if(user){event.stopPropagation();var pop=document.getElementById('meta-popout-'+user.dataset.userId);if(!pop)return;closePopouts();activePopout=pop;position(pop,event.clientX+8,event.clientY+8);return}
    if(summary){event.stopPropagation();var sum=document.getElementById('summary-popout');closePopouts();activePopout=sum;var rect=summary.getBoundingClientRect();position(sum,rect.right-310,rect.bottom+8);return}
    if(activePopout&&!event.target.closest('.meta-popout,.summary-popout'))closePopouts();
  });
  document.addEventListener('keydown',function(event){if(event.key==='Escape'){contextMenu.style.display='none';closePopouts()}});
})();
</script>`;
}

function generateDiscordTranscript(options = {}) {
    const messages = (options.messages || []).map(normalizeMessage).sort((a, b) => a.timestamp - b.timestamp);
    const metadata = {
        guildName: options.guildName || 'GSRP',
        guildId: String(options.guildId || 'Unknown'),
        guildIconUrl: safeUrl(options.guildIconUrl || options.guildIcon, ''),
        channelName: options.channelName || 'unknown-channel',
        channelId: String(options.channelId || 'Unknown'),
        channelCreatedTimestamp: options.channelCreatedTimestamp || null,
        generatedAt: options.generatedAt || Date.now()
    };
    const messagesById = new Map(messages.map((message) => [message.id, message]));
    const authors = new Map();
    for (const message of messages) {
        const record = authors.get(message.author.id) || { author: message.author, count: 0 };
        record.count += 1;
        authors.set(message.author.id, record);
    }
    const participants = authors.size;
    const messageHtml = messages.map((message, index) => renderMessage(message, messages[index - 1], messagesById)).join('');
    const profiles = [...authors.values()].map(({ author, count }) => renderProfile(author, count, metadata)).join('');
    const title = `${metadata.guildName} - ${metadata.channelName}`;
    const description = `Channel: ${metadata.channelName} (${metadata.channelId})\nServer: ${metadata.guildName} (${metadata.guildId})\nMessage Count: ${messages.length} Messages`;
    return `<!DOCTYPE html><html lang="en" data-gsrp-transcript-version="2"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeAttribute(description)}"><meta name="theme-color" content="#5865f2">${styles()}</head><body>
<header class="panel"><img class="panel__icon" src="${HASHTAG_ICON}" alt=""><span>${escapeHtml(metadata.channelName)}</span><span class="panel__spacer"></span><button class="panel__button" id="summary-button" type="button">Summary</button></header>
<main class="main"><section class="info"><div class="info__icon">#</div><span class="info__title">Welcome to #${escapeHtml(metadata.channelName)}!</span><span class="info__subject">This is the archived record of the #${escapeHtml(metadata.channelName)} channel.</span></section><section class="chatlog">${messageHtml}</section></main>
<footer class="footer">This transcript was generated on ${escapeHtml(formatLongTimestamp(metadata.generatedAt))}</footer>
<div id="context-menu"><button id="copy-message-id" type="button">Copy Message ID</button></div>
<div id="summary-popout" class="summary-popout" role="dialog" aria-label="Transcript summary"><div class="meta__description"><div class="meta__details"><span class="meta__user">${escapeHtml(metadata.guildName)}</span></div><div class="meta__divider"></div><div class="meta__field"><div class="meta__title">Guild ID</div><div class="meta__value meta__copy" data-copy-value="${escapeAttribute(metadata.guildId)}">${escapeHtml(metadata.guildId)}</div></div><div class="meta__field"><div class="meta__title">Channel ID</div><div class="meta__value meta__copy" data-copy-value="${escapeAttribute(metadata.channelId)}">${escapeHtml(metadata.channelId)}</div></div><div class="meta__field"><div class="meta__title">Channel Creation Date</div><div class="meta__value">${escapeHtml(metadata.channelCreatedTimestamp ? formatDate(metadata.channelCreatedTimestamp, true) : 'Unknown')}</div></div><div class="meta__field"><div class="meta__title">Total Message Count</div><div class="meta__value">${messages.length}</div></div><div class="meta__field"><div class="meta__title">Total Message Participants</div><div class="meta__value">${participants}</div></div></div></div>
${profiles}<div id="copy-toast" class="toast" role="status" aria-live="polite">Copied</div>${scripts()}</body></html>`;
}

module.exports = {
    escapeHtml,
    generateDiscordTranscript,
    renderMarkdown
};
