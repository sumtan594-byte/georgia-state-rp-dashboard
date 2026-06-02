import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { canReviewApplications } from "../../../lib/auth";
import { sendComponentsV2, sendDM, addMemberRole, removeMemberRole } from "../../../lib/discord-v2";
import { logAuditEvent } from '../../../lib/audit-log';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id, status, reason } = req.body;
  console.log('[Application Decide] Staff', session.user.name, status, 'application', id);

  try {
    const client = await clientPromise;
    const db = client.db("gsrp_staff");
    
    const application = await db.collection("applications").findOne({ _id: new ObjectId(id) });
    if (!application) return res.status(404).json({ message: 'Application not found' });

    // Fetch type config for role automation
    const appType = await db.collection("application_types").findOne({ slug: application.type || 'staff' });

    // Update DB
    await db.collection("applications").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, reason, reviewedBy: session.user.id, reviewedByName: session.user.name, reviewedAt: new Date() } }
    );

    const isAccepted = status === 'accepted';
    const color = isAccepted ? 0x22C55E : 0xEF4444; // Green vs Red
    const outcomeText = isAccepted ? 'accepted' : 'denied';
    const informingText = isAccepted ? 'are pleased' : 'regret';
    const guildId = process.env.ALLOWED_GUILD_ID || "1251347648351506485";

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
        
        // Legacy fallback for main staff app
        if (appType.slug === 'staff') {
          console.log(`[Role Sync] Applying legacy staff roles...`);
          await addMemberRole(guildId, application.userId, "1372480733234593812");
          console.log(`[Role Sync] Adding trainee role on staff accept`);
          await addMemberRole(guildId, application.userId, "1372476380096237609");
        }
      } else {
        await helper('add', appType.roleAddDenied);
        await helper('remove', appType.roleRemoveDenied);

        if (reason && /ai/i.test(reason)) {
          console.log(`[Role Sync] AI detected in denial reason — blacklisting ${application.userId}`);
          await addMemberRole(guildId, application.userId, "1374326193536372756");
        }
      }
    } else {
      console.warn(`[Role Sync] No application type configuration found for slug: ${application.type}`);
    }

    // 1. Send Outcome notification in 1372508850602905621
    const outcomeChannel = "1372508850602905621";
    const appName = application.typeName || 'Staff Application';
    
    const outcomeEmbed = {
      components: [
        {
          type: 17, // CONTAINER
          accent_color: color,
          components: [
            {
              type: 10, // TEXT_DISPLAY
              content: `# ${appName} Outcome\nDear <@${application.userId}>,\n\nWe ${informingText} to inform you that your **${appName}** has been **${outcomeText}** by <@${session.user.id}>.\n\n**Reason:**\n${reason}`
            }
          ]
        }
      ]
    };
    await sendComponentsV2(outcomeChannel, outcomeEmbed);

    // 2. DM the user
    try {
      await sendDM(application.userId, outcomeEmbed);
    } catch (e) {
      console.error('Failed to DM user', e);
    }

    // 3. Log in 1389202990555988071
    const logChannel = "1389202990555988071";
    await sendComponentsV2(logChannel, {
      components: [
        {
          type: 17,
          accent_color: color,
          components: [
            {
              type: 10,
              content: `<@${session.user.id}> has **${outcomeText}** <@${application.userId}>'s **${appName}**.\n\n**Reason:** ${reason}`
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
      targetId: id,
      details: {
        applicantUserId: application.userId,
        applicationType: application.type,
        reason,
      },
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Application Decision Error]', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

