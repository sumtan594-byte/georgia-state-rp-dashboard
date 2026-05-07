import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { canReviewApplications } from "../../../lib/auth";
import { sendComponentsV2, sendDM, addMemberRole, removeMemberRole } from "../../../lib/discord-v2";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session || !canReviewApplications(session)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id, status, reason } = req.body;

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
      { $set: { status, reason, reviewedBy: session.user.id, reviewedAt: new Date() } }
    );

    const isAccepted = status === 'accepted';
    const color = isAccepted ? 0x22C55E : 0xEF4444; // Green vs Red
    const outcomeText = isAccepted ? 'accepted' : 'denied';
    const informingText = isAccepted ? 'are pleased' : 'regret';
    const guildId = "1251347648351506485"; // GSRP Guild ID

    // Role Automation Logic
    if (appType) {
      if (isAccepted) {
        // Add roles on approval
        if (appType.roleAddAccepted) await addMemberRole(guildId, application.userId, appType.roleAddAccepted);
        // Remove roles on approval
        if (appType.roleRemoveAccepted) await removeMemberRole(guildId, application.userId, appType.roleRemoveAccepted);
        
        // Legacy fallback for main staff app
        if (appType.slug === 'staff') {
          const legacyRoles = ["1372480733234593812", "1372476380096237609"];
          for (const roleId of legacyRoles) await addMemberRole(guildId, application.userId, roleId);
        }
      } else {
        // Add roles on denial
        if (appType.roleAddDenied) await addMemberRole(guildId, application.userId, appType.roleAddDenied);
        // Remove roles on denial
        if (appType.roleRemoveDenied) await removeMemberRole(guildId, application.userId, appType.roleRemoveDenied);
      }
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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Application Decision Error]', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
