const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'db0.fps.ms',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 's70223_Bots',
  port: parseInt(process.env.DB_PORT || '3306'),
};

let pool = null;
function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({ ...DB_CONFIG, waitForConnections: true, connectionLimit: 2, queueLimit: 0 });
  return pool;
}

function statusEmoji(status) {
  if (status === 'accepted') return '✅';
  if (status === 'denied') return '❌';
  return '⏳';
}

function formatDate(d) {
  if (!d) return 'N/A';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

async function fetchApplicationById(id) {
  const p = getPool();
  const [rows] = await p.execute('SELECT * FROM applications WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    ...r,
    answers: r.answers ? JSON.parse(r.answers) : {},
    keystroke_data: r.keystroke_data ? JSON.parse(r.keystroke_data) : {},
    paste_data: r.paste_data ? JSON.parse(r.paste_data) : {},
    monitoring_data: r.monitoring_data ? JSON.parse(r.monitoring_data) : {},
    session_tab_outs: r.session_tab_outs ? JSON.parse(r.session_tab_outs) : [],
    session_mouse_leaves: r.session_mouse_leaves ? JSON.parse(r.session_mouse_leaves) : [],
  };
}

async function updateApplicationStatus(id, status, reason, reviewerId, reviewerName) {
  const p = getPool();
  await p.execute(
    'UPDATE applications SET status = ?, reason = ?, reviewed_by = ?, reviewed_by_name = ?, reviewed_at = NOW() WHERE id = ?',
    [status, reason || null, reviewerId, reviewerName, id]
  );
}

async function deleteApplication(id) {
  const p = getPool();
  await p.execute('DELETE FROM applications WHERE id = ?', [id]);
}

function buildListEmbed(applications, targetUserId) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`Applications for <@${targetUserId}>`)
    .setDescription(`Found **${applications.length}** application(s)`);

  const fields = applications.slice(0, 5).map((a, i) => {
    const statusIcon = statusEmoji(a.status);
    return {
      name: `${statusIcon} ${a.type_name || a.type} — ${a.status.charAt(0).toUpperCase() + a.status.slice(1)}`,
      value: [
        `> **Submitted:** ${formatDate(a.submitted_at)}`,
        `> **Reviewed:** ${a.reviewed_at ? formatDate(a.reviewed_at) : 'Not yet'}`,
        `> **Reviewer:** ${a.reviewed_by_name || 'N/A'}`,
      ].join('\n'),
    };
  });

  if (applications.length > 5) {
    fields.push({
      name: `And ${applications.length - 5} more...`,
      value: 'Use the buttons below to view details.',
    });
  }

  embed.addFields(fields);
  return embed;
}

function buildListComponents(applications) {
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let countInRow = 0;

  for (const app of applications.slice(0, 5)) {
    const btn = new ButtonBuilder()
      .setCustomId(`app_detail_${app.id}`)
      .setLabel(`${app.type_name || app.type}`)
      .setStyle(ButtonStyle.Secondary);

    if (countInRow === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
      countInRow = 0;
    }
    currentRow.addComponents(btn);
    countInRow++;
  }

  if (countInRow > 0) rows.push(currentRow);
  return rows;
}

function buildDetailEmbed(app) {
  const statusIcon = statusEmoji(app.status);
  const embed = new EmbedBuilder()
    .setColor(app.status === 'accepted' ? 0x22C55E : app.status === 'denied' ? 0xEF4444 : 0xF97316)
    .setTitle(`${app.type_name || app.type} — ${app.status.charAt(0).toUpperCase() + app.status.slice(1)}`)
    .setDescription(`Submitted by <@${app.user_id}> | **${app.user_id}**`)
    .addFields(
      { name: 'Status', value: `${statusIcon} ${app.status.charAt(0).toUpperCase() + app.status.slice(1)}`, inline: true },
      { name: 'Submitted', value: formatDate(app.submitted_at), inline: true },
    );

  if (app.reviewed_at) {
    embed.addFields(
      { name: 'Reviewed', value: formatDate(app.reviewed_at), inline: true },
      { name: 'Reviewer', value: app.reviewed_by_name ? `<@${app.reviewed_by}>` : 'N/A', inline: true },
    );
  }

  if (app.reason) {
    embed.addFields({ name: 'Reason', value: app.reason });
  }

  // Application answers
  if (app.answers && typeof app.answers === 'object') {
    const answerEntries = Object.entries(app.answers);
    const MAX_ANSWER_FIELDS = 8;
    const sliced = answerEntries.slice(0, MAX_ANSWER_FIELDS);
    for (const [fieldId, value] of sliced) {
      const label = fieldId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const display = typeof value === 'string' ? truncate(value, 500) : JSON.stringify(value);
      embed.addFields({ name: label, value: display || '*empty*' });
    }
    if (answerEntries.length > MAX_ANSWER_FIELDS) {
      embed.addFields({ name: `+${answerEntries.length - MAX_ANSWER_FIELDS} more fields`, value: 'Hidden for brevity' });
    }
  }

  // Monitoring summary
  const mon = app.monitoring_data;
  if (mon && typeof mon === 'object') {
    let monSummary = '';
    const totalTabOuts = Object.values(mon).reduce((s, f) => s + (f.tabOuts?.length || 0), 0);
    const totalRightClicks = Object.values(mon).reduce((s, f) => s + (f.rightClicks?.length || 0), 0);
    const totalWpmSpikes = Object.values(mon).reduce((s, f) => s + (f.wpmSpikes?.length || 0), 0);
    monSummary += `Tab-outs: ${totalTabOuts} | Right-clicks: ${totalRightClicks} | WPM spikes: ${totalWpmSpikes}`;
    embed.addFields({ name: 'Monitoring', value: monSummary || 'None' });
  }

  // Integrity info
  if (app.os_detected || app.timezone || app.ip) {
    embed.addFields({ name: 'Device & Location', value: [
      app.os_detected ? `OS: ${app.os_detected}` : null,
      app.timezone ? `TZ: ${app.timezone}` : null,
      app.ip ? `IP: ${app.ip}` : null,
    ].filter(Boolean).join(' | '), inline: false });
  }

  embed.setFooter({ text: `ID: ${app.id}` });
  return embed;
}

function buildDetailComponents(app, interactionUserId) {
  const rows = [];

  // Top row — accept/deny only if pending
  if (app.status === 'pending') {
    const acceptBtn = new ButtonBuilder()
      .setCustomId(`app_accept_${app.id}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success);

    const denyBtn = new ButtonBuilder()
      .setCustomId(`app_deny_${app.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger);

    rows.push(new ActionRowBuilder().addComponents(acceptBtn, denyBtn));
  } else {
    const statusLabel = app.status === 'accepted' ? 'Accepted' : 'Denied';
    const reviewerMention = app.reviewed_by ? `<@${app.reviewed_by}>` : 'Unknown';
    const statusBtn = new ButtonBuilder()
      .setCustomId('app_status_info')
      .setLabel(`${statusLabel} by ${app.reviewed_by_name || 'Unknown'}`)
      .setStyle(app.status === 'accepted' ? ButtonStyle.Success : ButtonStyle.Danger)
      .setDisabled(true);

    rows.push(new ActionRowBuilder().addComponents(statusBtn));
  }

  // Bottom row — delete
  const deleteBtn = new ButtonBuilder()
    .setCustomId(`app_delete_${app.id}`)
    .setLabel('Delete Application')
    .setStyle(ButtonStyle.Danger);

  const backBtn = new ButtonBuilder()
    .setCustomId(`app_back_${app.user_id}`)
    .setLabel('Back to List')
    .setStyle(ButtonStyle.Secondary);

  rows.push(new ActionRowBuilder().addComponents(backBtn, deleteBtn));

  return rows;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('application')
    .setDescription('Manage applications')
    .addSubcommand(sub => sub
      .setName('fetch')
      .setDescription('Fetch all applications for a user')
      .addStringOption(opt => opt
        .setName('userid')
        .setDescription('The Discord user ID')
        .setRequired(true)
      )
      .addBooleanOption(opt => opt
        .setName('hidden')
        .setDescription('Show only to you (ephemeral)')
        .setRequired(false)
      )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'fetch') {
      const targetUserId = interaction.options.getString('userid', true);
      const hidden = interaction.options.getBoolean('hidden') ?? true;

      await interaction.deferReply({ ephemeral: hidden });

      try {
        const pool = getPool();
        const [rows] = await pool.execute(
          'SELECT id, type, type_name, user_id, username, status, submitted_at, reviewed_at, reviewed_by_name FROM applications WHERE user_id = ? ORDER BY submitted_at DESC',
          [targetUserId]
        );

        if (rows.length === 0) {
          return interaction.editReply({
            content: `No applications found for <@${targetUserId}> (\`${targetUserId}\`).`,
          });
        }

        const embed = buildListEmbed(rows, targetUserId);
        const components = buildListComponents(rows);

        return interaction.editReply({ embeds: [embed], components });
      } catch (err) {
        console.error('[Application Fetch]', err);
        return interaction.editReply({ content: 'An error occurred while fetching applications.' });
      }
    }
  },

  async handleButton(interaction) {
    const customId = interaction.customId;
    await interaction.deferUpdate();

    try {
      // Back to list
      if (customId.startsWith('app_back_')) {
        const userId = customId.replace('app_back_', '');
        const pool = getPool();
        const [rows] = await pool.execute(
          'SELECT id, type, type_name, user_id, username, status, submitted_at, reviewed_at, reviewed_by_name FROM applications WHERE user_id = ? ORDER BY submitted_at DESC',
          [userId]
        );

        if (rows.length === 0) {
          return interaction.editReply({
            content: `No applications found for <@${userId}> (\`${userId}\`).`,
            embeds: [],
            components: [],
          });
        }

        return interaction.editReply({
          embeds: [buildListEmbed(rows, userId)],
          components: buildListComponents(rows),
        });
      }

      // View detail
      if (customId.startsWith('app_detail_')) {
        const appId = customId.replace('app_detail_', '');
        const app = await fetchApplicationById(appId);
        if (!app) return interaction.editReply({ content: 'Application not found.', embeds: [], components: [] });

        const embed = buildDetailEmbed(app);
        const components = buildDetailComponents(app, interaction.user.id);

        return interaction.editReply({ embeds: [embed], components });
      }

      // Accept
      if (customId.startsWith('app_accept_')) {
        const appId = customId.replace('app_accept_', '');
        const app = await fetchApplicationById(appId);
        if (!app) return interaction.editReply({ content: 'Application not found.', embeds: [], components: [] });
        if (app.status !== 'pending') return interaction.editReply({ content: 'This application has already been reviewed.', embeds: [], components: [] });

        const reason = 'Accepted via bot';
        await updateApplicationStatus(appId, 'accepted', reason, interaction.user.id, interaction.user.username);

        const updated = await fetchApplicationById(appId);
        return interaction.editReply({
          embeds: [buildDetailEmbed(updated)],
          components: buildDetailComponents(updated, interaction.user.id),
        });
      }

      // Deny
      if (customId.startsWith('app_deny_')) {
        const appId = customId.replace('app_deny_', '');
        const app = await fetchApplicationById(appId);
        if (!app) return interaction.editReply({ content: 'Application not found.', embeds: [], components: [] });
        if (app.status !== 'pending') return interaction.editReply({ content: 'This application has already been reviewed.', embeds: [], components: [] });

        const reason = 'Denied via bot';
        await updateApplicationStatus(appId, 'denied', reason, interaction.user.id, interaction.user.username);

        const updated = await fetchApplicationById(appId);
        return interaction.editReply({
          embeds: [buildDetailEmbed(updated)],
          components: buildDetailComponents(updated, interaction.user.id),
        });
      }

      // Delete
      if (customId.startsWith('app_delete_')) {
        const appId = customId.replace('app_delete_', '');
        await deleteApplication(appId);
        return interaction.editReply({ content: 'Application deleted.', embeds: [], components: [] });
      }

    } catch (err) {
      console.error('[Application Button]', err);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  },
};
