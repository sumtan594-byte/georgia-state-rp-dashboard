import clientPromise from './mongodb';

const COLLECTION = 'command_history';

export async function logCommand({ command, userId, username, success, response }) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(COLLECTION);

    await collection.insertOne({
      command,
      userId,
      username,
      success,
      response: response ? String(response).substring(0, 500) : null,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('[CommandHistory] Failed to log:', err.message);
  }
}

export async function getCommandHistory({ limit = 50, skip = 0 } = {}) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(COLLECTION);

    const logs = await collection
      .find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments({});

    return { logs, total };
  } catch (err) {
    console.error('[CommandHistory] Failed to fetch:', err.message);
    return { logs: [], total: 0 };
  }
}
