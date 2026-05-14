import { getServerSession } from 'next-auth';
import { authOptions } from "../../../../lib/auth-options";
import { startReminderWorker } from "../../../../lib/reminder-worker";

const REMINDERS_ROLE_ID = '1394297547597680670';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  if (!session.user.roles.includes(REMINDERS_ROLE_ID)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  await startReminderWorker();

  const ERLC_KEY = process.env.ERLC_API_KEY;
  const logs = [];

  logs.push(`[DEBUG] Starting debug check at ${new Date().toISOString()}`);
  logs.push(`[DEBUG] ERLC_KEY present: ${!!ERLC_KEY}`);

  try {
    // 1. Test ERLC API directly
    logs.push(`[DEBUG] Fetching ERLC v2 server info...`);
    const erlcRes = await fetch('https://api.erlc.gg/v2/server', {
      headers: { 'server-key': ERLC_KEY }
    });
    logs.push(`[DEBUG] ERLC Status: ${erlcRes.status}`);
    const erlcData = await erlcRes.json().catch(() => ({ error: 'Parse failed' }));
    logs.push(`[DEBUG] ERLC Data: ${JSON.stringify(erlcData)}`);
    
    // 2. Check Global State
    logs.push(`[DEBUG] Global State: ${JSON.stringify(globalThis.__gsrpReminderState || 'NOT FOUND')}`);
    
    // 3. Check MongoDB
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const count = await client.db().collection('reminders').countDocuments();
    logs.push(`[DEBUG] MongoDB Reminders Count: ${count}`);
    await client.close();

    return res.status(200).json({ logs });
  } catch (err) {
    logs.push(`[DEBUG] FATAL ERROR: ${err.message}`);
    return res.status(500).json({ logs, error: err.message });
  }
}
