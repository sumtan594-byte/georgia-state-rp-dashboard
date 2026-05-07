import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { canReviewApplications } from "../../../lib/auth";
import { sendComponentsV2, sendDM } from "../../../lib/discord-v2";

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

    // Update DB
    await db.collection("applications").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, reason, reviewedBy: session.user.id, reviewedAt: new Date() } }
    );

    const isAccepted = status === 'accepted';
    const color = isAccepted ? 0x22C55E : 0xEF4444; // Green vs Red
    const outcomeText = isAccepted ? 'accepted' : 'denied';
    const informingText = isAccepted ? 'are pleased' : 'regret';

    // 1. Send Outcome notification in 1372508850602905621
    const outcomeChannel = "1372508850602905621";
    const outcomeEmbed = {
      components: [
        {
          type: 17, // CONTAINER
          accent_color: color,
          components: [
            {
              type: 10, // TEXT_DISPLAY
              content: `# Staff Application Outcome\nDear <@${application.userId}>,\n\nWe ${informingText} to inform you that your staff application has been **${outcomeText}** by <@${session.user.id}>.\n\n` +
                        `### Reason\n${reason}`
            },
            {
              type: 14, // SEPARATOR
              divider: true,
              spacing: 1
            },
            {
              type: 10, // TEXT_DISPLAY
              content: `-# Status: ${outcomeText.toUpperCase()}`
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
              content: `<@${session.user.id}> has **${outcomeText}** <@${application.userId}>'s application.\n\n**Reason:**\n> ${reason}`
            }
          ]
        }
      ]
    });

    // 4. Send to Webhook (as described)
    try {
      await fetch("https://discord.com/api/webhooks/1501869763343814698/6lH3Ut_hRcyef9xDtta-uN8mzqdbImwAM7ICalxptq37jALFlXPu1pi_o-X-vozRR_ns", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: null,
          embeds: [{
            title: `Application ${outcomeText.toUpperCase()}`,
            description: `Applicant: <@${application.userId}>\nReviewer: <@${session.user.id}>\nReason: ${reason}`,
            color: color,
            timestamp: new Date().toISOString()
          }],
          username: "Application Management"
        })
      });
    } catch (e) {
      console.error('Webhook failed', e);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Application Decision Error]', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
