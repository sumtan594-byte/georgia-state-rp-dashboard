import clientPromise from '../../../lib/mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { sendComponentsV2 } from "../../../lib/discord-v2";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const client = await clientPromise;
    const db = client.db("gsrp_staff");
    const application = req.body;

    // Save to MongoDB
    const result = await db.collection("applications").insertOne({
      ...application,
      status: 'pending',
      submittedAt: new Date(),
    });

    // Notify Discord
    const notificationChannel = "1389202990555988071";
    const typeName = application.typeName || "Staff Application";
    const typeSlug = application.type || "staff";

    await sendComponentsV2(notificationChannel, {
      components: [
        {
          type: 17, // CONTAINER
          accent_color: 0xF97316, // Orange
          components: [
            {
              type: 10, // TEXT_DISPLAY
              content: `# New ${typeName}\nSent by <@${session.user.id}>\n\nAn application for **${typeName}** has been submitted.`
            },
            {
              type: 1, // ACTION_ROW
              components: [
                {
                  type: 2, // BUTTON
                  style: 5, // LINK
                  label: "View Application",
                  url: `https://join-gsrp.com/applications/${result.insertedId}`
                }
              ]
            }
          ]
        }
      ]
    });

    return res.status(200).json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('[Application Submit Error]', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
