import { getServerSession } from 'next-auth';
import { authOptions } from "../../../lib/auth-options";
import clientPromise from '../../../lib/mongodb';

const REMINDERS_ROLE_ID = '1394297547597680670';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  
  if (!session.user.roles.includes(REMINDERS_ROLE_ID)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection('reminders');

  if (req.method === 'GET') {
    const reminders = await collection.find({}).sort({ order: 1 }).toArray();
    return res.status(200).json(reminders);
  }

  if (req.method === 'POST') {
    const { type, message, delayMinutes } = req.body;
    if (!type || !message || delayMinutes === undefined) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const lastReminder = await collection.findOne({}, { sort: { order: -1 } });
    const order = lastReminder ? lastReminder.order + 1 : 0;

    const reminder = {
      type, // 'm' or 'h'
      message,
      delayMinutes: parseInt(delayMinutes),
      order,
      createdAt: new Date(),
    };

    await collection.insertOne(reminder);
    
    // Trigger worker restart
    if (globalThis.__gsrpReminderState) {
      globalThis.__gsrpReminderState.needsRestart = true;
    }

    return res.status(201).json(reminder);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { ObjectId } = require('mongodb');
    await collection.deleteOne({ _id: new ObjectId(id) });

    // Trigger worker restart
    if (globalThis.__gsrpReminderState) {
      globalThis.__gsrpReminderState.needsRestart = true;
    }

    return res.status(200).json({ success: true });
  }

  if (req.method === 'PUT') {
    const { id, type, message, delayMinutes } = req.body;
    if (!id || !type || !message || delayMinutes === undefined) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const { ObjectId } = require('mongodb');
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          type,
          message,
          delayMinutes: parseInt(delayMinutes),
          updatedAt: new Date(),
        }
      }
    );

    // Trigger worker restart
    if (globalThis.__gsrpReminderState) {
      globalThis.__gsrpReminderState.needsRestart = true;
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
