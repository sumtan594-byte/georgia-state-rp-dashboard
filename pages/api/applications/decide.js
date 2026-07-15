import { getPool, rowToApplication } from '../../../lib/appdb';
import clientPromise from '../../../lib/mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/admin-helper";
import { sendComponentsV2, sendDM, addMemberRole, removeMemberRole } from "../../../lib/discord-v2";
import { logAuditEvent } from '../../../lib/audit-log';
import { startTraineeTracking } from '../../../lib/trainee-tracking';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session || !await canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id, status, reason } = req.body;
  const cleanId = String(id || '').trim();
  const cleanReason = String(reason || '').trim();
  if (!cleanId || cleanId.length > 100) return res.status(400).json({ message: 'A valid application ID is required' });
  if (!['accepted', 'denied'].includes(status)) return res.status(400).json({ message: 'Invalid application decision' });
  if (!cleanReason || cleanReason.length > 500) return res.status(400).json({ message: 'A decision reason between 1 and 500 characters is required' });
  console.log('[Application Decide] Staff', session.user.name, status, 'application', id);

  try {
    const pool = getPool();
    if (!pool) return res.status(500).json({ message: 'Database connection failed' });

    const [rows] = await pool.execute('SELECT * FROM applications WHERE id = ?', [cleanId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Application not found' });
    const application = rowToApplication(rows[0]);

    if (application.status !== 'pending') {
      return res.status(409).json({
        message: `This application has already been ${application.status}.`,
        application: { status: application.status, reason: application.reason, reviewedBy: application.reviewedBy, reviewedByName: application.reviewedByName },
      });
    }

    // Fetch type config for role automation (still in MongoDB)
    let client = null;
    let appType = null;
    try {
      client = await clientPromise;
      appType = await client.db("gsrp_staff").collection("application_types").findOne({ slug: application.type || 'staff' });
    } catch (configError) {
      console.error('[Application Decide] Type configuration lookup failed:', configError.message);
    }

    // Update DB
    const [updateResult] = await pool.execute(
      "UPDATE applications SET status = ?, reason = ?, reviewed_by = ?, reviewed_by_name = ?, reviewed_at = NOW() WHERE id = ? AND status = 'pending'",
      [status, cleanReason, session.user.id, session.user.name, cleanId]
    );
    if (!updateResult.affectedRows) return res.status(409).json({ message: 'Another reviewer has already processed this application.' });

    const isAccepted = status === 'accepted';
    const color = isAccepted ? 0x22C55E : 0xEF4444;
    const outcomeText = isAccepted ? 'accepted' : 'denied';
    const informingText = isAccepted ? 'are pleased' : 'regret';
    const guildId = process.env.ALLOWED_GUILD_ID || "1251347648351506485";
    const warnings = [];

    try {
      console.log(`[Role Sync] Processing decision for ${application.userId} in guild ${guildId}. Status: ${status}`);

    // Role Automation Logic
    if (appType) {
      console.log(`[Role Sync] Found application type config for: ${appType.slug}`);
      const helper = async (action, roles) => {
        if (!roles) return;
        const roleList = Array.isArray(roles) ? roles : [roles];
        for (const rId of roleList) {
          if (!rId) continue;
          console.log(`[Role Sync] Action: ${action}, Role: ${rId} for User: ${application.userId}`);
          if (action === 'add') await addMemberRole(guildId, application.userId, rId);
          if (action === 'remove') await removeMemberRole(guildId, application.userId, rId);
        }
      };

      if (isAccepted) {
        await helper('add', appType.roleAddAccepted);
        await helper('remove', appType.roleRemoveAccepted);

        if (appType.slug === 'staff') {
          console.log(`[Role Sync] Applying legacy staff roles...`);
          await addMemberRole(guildId, application.userId, "1372480733234593812");
          console.log(`[Role Sync] Adding trainee role on staff accept`);
          await addMemberRole(guildId, application.userId, "1372476380096237609");
          // Start the 7-day window for completing the training modules.
          // Use the default db so the quiz/cron flows (which use client.db())
          // read the same trainee_tracking collection.
          try {
            await startTraineeTracking(client.db(), application.userId, application.username || application.userName);
          } catch (e) {
            console.error('[Trainee Tracking] Failed to start tracking', e);
          }
        }
      } else {
        await helper('add', appType.roleAddDenied);
        await helper('remove', appType.roleRemoveDenied);

        if (/\bai\b|\ba\.i\.\b/i.test(cleanReason)) {
          console.log(`[Role Sync] AI detected in denial reason, blacklisting ${application.userId}`);
          await addMemberRole(guildId, application.userId, "1374326193536372756");
        }
      }
    } else {
      console.warn(`[Role Sync] No application type configuration found for slug: ${application.type}`);
    }

    // 1. Send Outcome notification
    const outcomeChannel = "1372508850602905621";
    const appName = application.typeName || 'Staff Application';

    const outcomeEmbed = {
      allowed_mentions: { parse: [] },
      components: [
        {
          type: 17,
          accent_color: color,
          components: [
            {
              type: 10,
              content: `# ${appName} Outcome\nDear <@${application.userId}>,\n\nWe ${informingText} to inform you that your **${appName}** has been **${outcomeText}** by <@${session.user.id}>.\n\n**Reason:**\n${cleanReason}`
            }
          ]
        }
      ]
    };
    await sendComponentsV2(outcomeChannel, outcomeEmbed);

    // 2. DM the user
    const dmContent = `# ${appName} Outcome\nDear <@${application.userId}>,\n\nWe ${informingText} to inform you that your **${appName}** has been **${outcomeText}** by <@${session.user.id}>.\n\n**Reason:**\n${cleanReason}${isAccepted ? `\n\nPlease read <#1391349500941041807> before asking any questions. If you ask very obvious questions your rank will be taken away.` : ''}`;
    const dmEmbed = {
      components: [
        {
          type: 17,
          accent_color: color,
          components: [
            {
              type: 10,
              content: dmContent
            }
          ]
        }
      ]
    };
    try {
      await sendDM(application.userId, dmEmbed);
    } catch (e) {
      console.error('Failed to DM user', e);
    }

    // 3. Log to channel
    const logChannel = "1389202990555988071";
    await sendComponentsV2(logChannel, {
      allowed_mentions: { parse: [] },
      components: [
        {
          type: 17,
          accent_color: color,
          components: [
            {
              type: 10,
              content: `<@${session.user.id}> has **${outcomeText}** <@${application.userId}>'s **${appName}**.\n\n**Reason:** ${cleanReason}`
            }
          ]
        }
      ]
    });

    await logAuditEvent({
      action: isAccepted ? 'application_accept' : 'application_deny',
      actorId: session.user.id,
      actorName: session.user.name,
      targetType: 'application',
      targetId: cleanId,
      details: {
        applicantUserId: application.userId,
        applicationType: application.type,
        reason: cleanReason,
      },
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress,
    });

    } catch (sideEffectError) {
      warnings.push('The decision was saved, but one or more Discord follow-up actions failed.');
      console.error('[Application Decision Follow-up Error]', sideEffectError);
    }

    return res.status(200).json({
      success: true,
      warnings,
      application: {
        status,
        reason: cleanReason,
        reviewedBy: session.user.id,
        reviewedByName: session.user.name,
      },
    });
  } catch (error) {
    console.error('[Application Decision Error]', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
