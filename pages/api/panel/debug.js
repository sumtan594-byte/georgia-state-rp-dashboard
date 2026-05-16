import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { ROLES, hasRole, isAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  if (!hasRole(session, ROLES.PANEL) && !isAdmin(session)) {
    return res.status(403).json({ error: 'Panel access required' });
  }

  const ERLC_KEY = process.env.ERLC_API_KEY;
  if (!ERLC_KEY) {
    return res.status(500).json({ error: 'Missing ERLC_API_KEY' });
  }

  const results = {};

  try {
    const playersRes = await fetch('https://api.erlc.gg/v2/server?Players=true&Staff=true&JoinLogs=true&KillLogs=true&CommandLogs=true&ModCalls=true&Vehicles=true', {
      headers: { 'server-key': ERLC_KEY },
    });
    results.players_status = playersRes.status;
    if (playersRes.ok) {
      const data = await playersRes.json();
      results.players_count = data.Players?.length || 0;
      results.server_name = data.Name || 'unknown';
      results.has_commandlogs = !!data.CommandLogs;
      results.keys_returned = Object.keys(data);
    } else {
      results.players_error = await playersRes.text();
    }
  } catch (e) {
    results.players_error = e.message;
  }

  try {
    const mapRes = await fetch('https://api.erlc.gg/maps/fall_postals.png');
    results.map_image_status = mapRes.status;
    if (!mapRes.ok) {
      results.map_image_error = await mapRes.text();
    }
  } catch (e) {
    results.map_image_error = e.message;
  }

  res.status(200).json(results);
}
