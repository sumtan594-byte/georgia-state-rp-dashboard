import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const { isFullAdmin } = await import('../../../lib/admin-helper');
  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);
  if (!isAdmin) return res.status(403).json({ error: 'Admin only' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, action } = req.body;
  if (!userId || !action) return res.status(400).json({ error: 'userId and action required' });

  try {
    const client = await clientPromise;
    const dbStaff = client.db('gsrp_staff');
    const dbDefault = client.db();

    switch (action) {
      case 'reset_handbook': {
        await dbStaff.collection('training_progress').updateOne(
          { userId },
          { $set: { completedSections: [], handbookCompleted: false, lastUpdated: new Date() } },
          { upsert: true }
        );
        return res.status(200).json({ ok: true, message: 'Handbook progress reset' });
      }

      case 'complete_handbook': {
        const REQUIRED_SECTIONS = [
          'overview', 'guidelines', 'shifts', 'vehicles', 'punishments',
          'warnings', 'kicks', 'bans', 'staff-disc', 'escalation', 'custom-commands'
        ];
        await dbStaff.collection('training_progress').updateOne(
          { userId },
          { $set: { completedSections: REQUIRED_SECTIONS, handbookCompleted: true, lastUpdated: new Date() } },
          { upsert: true }
        );
        return res.status(200).json({ ok: true, message: 'Handbook marked as completed' });
      }

      case 'revoke_quiz_pass': {
        await dbDefault.collection('quiz_attempts').updateOne(
          { userId },
          { $set: { hasPassed: false, hasPassedAt: null } }
        );
        return res.status(200).json({ ok: true, message: 'Quiz pass revoked' });
      }

      case 'grant_quiz_pass': {
        await dbDefault.collection('quiz_attempts').updateOne(
          { userId },
          { $set: { hasPassed: true, hasPassedAt: new Date().toISOString(), cooldownUntil: null } }
        );
        return res.status(200).json({ ok: true, message: 'Quiz pass granted' });
      }

      case 'clear_cooldown': {
        await dbDefault.collection('quiz_attempts').updateOne(
          { userId },
          { $set: { cooldownUntil: null } }
        );
        return res.status(200).json({ ok: true, message: 'Cooldown cleared' });
      }

      case 'reset_quiz': {
        await dbDefault.collection('quiz_attempts').updateOne(
          { userId },
          { $set: { hasPassed: false, hasPassedAt: null, cooldownUntil: null, attempts: [] } }
        );
        return res.status(200).json({ ok: true, message: 'Quiz data fully reset' });
      }

      case 'clear_ridealong_cooldown': {
        await dbDefault.collection('ridealong_attempts').updateOne(
          { userId },
          { $set: { cooldownUntil: null } }
        );
        return res.status(200).json({ ok: true, message: 'Ridealong cooldown cleared' });
      }

      case 'revoke_ridealong_pass': {
        await dbDefault.collection('ridealong_attempts').updateOne(
          { userId },
          { $set: { hasPassed: false, hasPassedAt: null, cooldownUntil: null, discordRolesApplied: false } }
        );
        return res.status(200).json({ ok: true, message: 'Ridealong pass revoked' });
      }

      case 'reset_all': {
        await dbStaff.collection('training_progress').updateOne(
          { userId },
          { $set: { completedSections: [], handbookCompleted: false, lastUpdated: new Date() } },
          { upsert: true }
        );
        await dbDefault.collection('quiz_attempts').updateOne(
          { userId },
          { $set: { hasPassed: false, hasPassedAt: null, cooldownUntil: null, attempts: [] } }
        );
        await dbDefault.collection('ridealong_attempts').updateOne(
          { userId },
          { $set: { hasPassed: false, hasPassedAt: null, cooldownUntil: null, discordRolesApplied: false } }
        );
        return res.status(200).json({ ok: true, message: 'All validations reset' });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[User Validations Edit] Error:', err.message);
    return res.status(500).json({ error: 'Failed to update user validations' });
  }
}
