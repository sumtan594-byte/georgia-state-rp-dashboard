const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const mysql = require('mysql2/promise');

const C2 = 1 << 15;
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

function formatDate(d) {
  if (!d) return 'N/A';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function accentColor(status) {
  if (status === 'accepted') return 0x22C55E;
  if (status === 'denied') return 0xEF4444;
  return 0xF97316;
}

function container(color, ...children) {
  return { type: 17, accent_color: color, components: children };
}

function textDisplay(content) {
  return { type: 10, content };
}

function actionRow(...buttons) {
  return new ActionRowBuilder().addComponents(...buttons).toJSON();
}

function viewButton(app) {
  return new ButtonBuilder()
    .setCustomId(`app_detail_${app.id}`)
    .setLabel('View Application')
    .setStyle(ButtonStyle.Secondary);
}

async function fetchApplicationById(id) {
  const p = getPool();
  const [rows] = await p.query('SELECT * FROM applications WHERE id = ?', [id]);
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
  await p.query(
    'UPDATE applications SET status = ?, reason = ?, reviewed_by = ?, reviewed_by_name = ?, reviewed_at = NOW() WHERE id = ?',
    [status, reason || null, reviewerId, reviewerName, id]
  );
}

async function deleteApplication(id) {
  const p = getPool();
  await p.query('DELETE FROM applications WHERE id = ?', [id]);
}

function buildListReply(applications, targetUserId) {
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const shown = applications.slice(0, 5);
  let text = `## <@${targetUserId}>'s Applications\n`;

  for (const a of shown) {
    const name = a.type_name || a.type;
    text += `\n### ${name}`;
    text += `\n-# Submitted: ${formatDate(a.submitted_at)}`;
    text += `\n-# Status: ${cap(a.status)}`;
    if (a.reason) text += `\n-# Reason: ${a.reason}`;
  }

  if (applications.length > 5) text += `\n\n*+${applications.length - 5} more*`;

  const btns = shown.map(a => viewButton(a));

  return {
    components: [container(0x5865F2, textDisplay(text), actionRow(...btns))],
    flags: C2,
  };
}

function buildDetailReply(app) {
  const color = accentColor(app.status);
  const name = app.type_name || app.type;
  let text = `## <@${app.user_id}>'s ${name}\n`;

  if (app.answers && typeof app.answers === 'object') {
    for (const [q, a] of Object.entries(app.answers)) {
      const display = typeof a === 'string' ? truncate(a, 1000) : JSON.stringify(a);
      text += `\n**${q}**\n> ${display || '*empty*'}`;
    }
  }

  const children = [textDisplay(text)];

  if (app.status === 'pending') {
    children.push(actionRow(
      new ButtonBuilder().setCustomId(`app_accept_${app.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`app_deny_${app.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger),
    ));
  }

  children.push(actionRow(
    new ButtonBuilder().setCustomId(`app_back_${app.user_id}`).setLabel('Back').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`app_delete_${app.id}`).setLabel('Delete').setStyle(ButtonStyle.Danger),
  ));

  return { components: [container(color, ...children)], flags: C2 };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('applications')
    .setDescription('Manage user applications')
    .addSubcommand(sub => sub
      .setName('fetch')
      .setDescription("Fetch a user's applications")
      .addUserOption(opt => opt.setName('user').setDescription('The user').setRequired(true))
      .addBooleanOption(opt => opt.setName('hidden').setDescription('Show only to you').setRequired(false))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'fetch') {
      const targetUser = interaction.options.getUser('user', true);
      const hidden = interaction.options.getBoolean('hidden') ?? true;

      await interaction.deferReply({ ephemeral: hidden });

      try {
        const p = getPool();
        const [rows] = await p.query(
          'SELECT id, type, type_name, user_id, username, status, submitted_at, reviewed_at, reviewed_by_name, reason FROM applications WHERE user_id = ? ORDER BY submitted_at DESC',
          [targetUser.id]
        );

        if (rows.length === 0) {
          return interaction.editReply({ content: `No applications found for <@${targetUser.id}>.`, flags: C2 });
        }

        return interaction.editReply(buildListReply(rows, targetUser.id));
      } catch (err) {
        console.error('[Applications Fetch]', err);
        return interaction.editReply({ content: 'An error occurred while fetching applications.', flags: C2 });
      }
    }
  },

  async handleButton(interaction) {
    const customId = interaction.customId;

    try {
      if (customId.startsWith('app_back_')) {
        await interaction.deferUpdate();
        const userId = customId.replace('app_back_', '');
        const p = getPool();
        const [rows] = await p.query(
          'SELECT id, type, type_name, user_id, username, status, submitted_at, reviewed_at, reviewed_by_name, reason FROM applications WHERE user_id = ? ORDER BY submitted_at DESC',
          [userId]
        );
        if (rows.length === 0) {
          return interaction.editReply({ content: `No applications found for <@${userId}>.`, components: [], flags: C2 });
        }
        return interaction.editReply(buildListReply(rows, userId));
      }

      if (customId.startsWith('app_detail_')) {
        await interaction.deferUpdate();
        const appId = customId.replace('app_detail_', '');
        const app = await fetchApplicationById(appId);
        if (!app) return interaction.editReply({ content: 'Application not found.', components: [], flags: C2 });
        return interaction.editReply(buildDetailReply(app));
      }

      if (customId.startsWith('app_accept_')) {
        const appId = customId.replace('app_accept_', '');
        const app = await fetchApplicationById(appId);
        if (!app) return interaction.reply({ content: 'Application not found.', flags: C2, ephemeral: true });
        if (app.status !== 'pending') return interaction.reply({ content: 'Already reviewed.', flags: C2, ephemeral: true });

        return interaction.showModal(new ModalBuilder()
          .setCustomId(`app_accept_modal_${appId}`)
          .setTitle('Accept Application')
          .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('reason').setLabel('Reason').setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)
          ))
        );
      }

      if (customId.startsWith('app_deny_')) {
        const appId = customId.replace('app_deny_', '');
        const app = await fetchApplicationById(appId);
        if (!app) return interaction.reply({ content: 'Application not found.', flags: C2, ephemeral: true });
        if (app.status !== 'pending') return interaction.reply({ content: 'Already reviewed.', flags: C2, ephemeral: true });

        return interaction.showModal(new ModalBuilder()
          .setCustomId(`app_deny_modal_${appId}`)
          .setTitle('Deny Application')
          .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('reason').setLabel('Reason').setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)
          ))
        );
      }

      if (customId.startsWith('app_delete_')) {
        await interaction.deferUpdate();
        const appId = customId.replace('app_delete_', '');
        await deleteApplication(appId);
        return interaction.editReply({ content: 'Application deleted.', components: [], flags: C2 });
      }

    } catch (err) {
      console.error('[Applications Button]', err);
      return interaction.deferred
        ? interaction.editReply({ content: 'An error occurred.', flags: C2 })
        : interaction.reply({ content: 'An error occurred.', flags: C2, ephemeral: true });
    }
  },

  async handleModal(interaction) {
    const customId = interaction.customId;

    try {
      const isAccept = customId.startsWith('app_accept_modal_');
      const isDeny = customId.startsWith('app_deny_modal_');

      if (isAccept || isDeny) {
        const appId = customId.replace(isAccept ? 'app_accept_modal_' : 'app_deny_modal_', '');
        const reason = interaction.fields.getTextInputValue('reason');
        const status = isAccept ? 'accepted' : 'denied';

        const app = await fetchApplicationById(appId);
        if (!app) return interaction.reply({ content: 'Application not found.', flags: C2, ephemeral: true });
        if (app.status !== 'pending') return interaction.reply({ content: 'Already reviewed.', flags: C2, ephemeral: true });

        await updateApplicationStatus(appId, status, reason, interaction.user.id, interaction.user.username);

        const updated = await fetchApplicationById(appId);
        return interaction.update({ flags: C2, embeds: [], content: null, ...buildDetailReply(updated) });
      }

    } catch (err) {
      console.error('[Applications Modal]', err);
      return interaction.reply({ content: 'An error occurred.', flags: C2, ephemeral: true });
    }
  },
};
