import clientPromise from './mongodb';

const AUDIT_COLLECTION = 'audit_logs';

export async function logAuditEvent({
  action,
  actorId,
  actorName,
  targetType,
  targetId,
  details = {},
  ip,
}) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(AUDIT_COLLECTION);

    await collection.insertOne({
      action,
      actorId,
      actorName,
      targetType,
      targetId,
      details,
      ip,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit event:', err.message);
  }
}

export async function getAuditLogs({ limit = 50, skip = 0, action, actorId, targetType } = {}) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(AUDIT_COLLECTION);

    const filter = {};
    if (action) filter.action = action;
    if (actorId) filter.actorId = actorId;
    if (targetType) filter.targetType = targetType;

    const logs = await collection
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments(filter);

    return { logs, total };
  } catch (err) {
    console.error('[AuditLog] Failed to fetch audit logs:', err.message);
    return { logs: [], total: 0 };
  }
}
