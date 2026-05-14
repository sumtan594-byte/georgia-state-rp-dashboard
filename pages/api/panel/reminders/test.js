import { getServerSession } from 'next-auth';
import { authOptions } from "../../../../lib/auth-options";
import { MongoClient, ObjectId } from 'mongodb';

const REMINDERS_ROLE_ID = '1394297547597680670';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  if (!session.user.roles.includes(REMINDERS_ROLE_ID)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing ID' });

  const ERLC_KEY = process.env.ERLC_API_KEY;
  const MONGODB_URI = process.env.MONGODB_URI;

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db();
    const reminder = await db.collection('reminders').findOne({ _id: new ObjectId(id) });
    await client.close();

    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

    const command = `:${reminder.type} ${reminder.message}`;
    
    const response = await fetch('https://api.erlc.gg/v1/server/command', {
      method: 'POST',
      headers: {
        'server-key': ERLC_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command }),
    });

    if (response.status === 200) {
      return res.status(200).json({ success: true, message: 'Command sent successfully' });
    } else {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
