import clientPromise from '../../../lib/mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth-options";
import { sendComponentsV2 } from "../../../lib/discord-v2";
import { rateLimit } from '../../../lib/rate-limiter';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const rl = rateLimit(req, res, 'submit');
  if (rl.limited) {
    return res.status(429).json({ message: 'Rate limited', retryAfter: rl.retryAfter });
  }

  const recaptchaToken = req.body.recaptchaToken;
  if (!recaptchaToken) {
    return res.status(400).json({ message: 'reCAPTCHA verification required' });
  }

  try {
    const recaptchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY || '6Lc7mO8sAAAAAIMCi7ZRwhbtA9VYLWt8cIADqDHK',
        response: recaptchaToken,
      }),
    });
    const recaptchaData = await recaptchaRes.json();
    if (!recaptchaData.success) {
      return res.status(400).json({ message: 'reCAPTCHA verification failed. Please try again.' });
    }

    delete req.body.recaptchaToken;

    const client = await clientPromise;
    const db = client.db("gsrp_staff");
    const application = req.body;

    const result = await db.collection("applications").insertOne({
      ...application,
      status: 'pending',
      submittedAt: new Date(),
      recaptchaVerified: true,
      recaptchaScore: recaptchaData.score || null,
      recaptchaHostname: recaptchaData.hostname || null,
    });

    const notificationChannel = "1389202990555988071";
    const typeName = application.typeName || "Staff Application";

    await sendComponentsV2(notificationChannel, {
      components: [
        {
          type: 17,
          accent_color: 0xF97316,
          components: [
            {
              type: 10,
              content: `# New ${typeName}\nSent by <@${session.user.id}>\n\nAn application for **${typeName}** has been submitted.`
            },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 5,
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
