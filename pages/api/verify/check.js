import { getServerSession } from 'next-auth/next';
import { authOptions } from "../../../lib/auth-options";
import { getLinkedRobloxUsername } from "../../../lib/linked-roblox-user";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const discordId = session.user.id;
  const githubToken = process.env.GITHUB_ACCESS_TOKEN;
  
  const githubFetch = async (path) => {
    const url = `https://api.github.com/repos/sumtan594-byte/gsrp-management/contents/${path}`;
    const headers = {
      'Accept': 'application/vnd.github.v3.raw',
      'User-Agent': 'GSRP-Dashboard-App'
    };
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch ${path} from GitHub: ${res.statusText} (${res.status})`);
    }
    return res.json();
  };

  try {
    const [robloxUsername, rolesRes] = await Promise.all([
      getLinkedRobloxUsername(discordId),
      githubFetch('roles.json')
    ]);

    if (!robloxUsername) {
      return res.status(200).json({ linked: false });
    }

    // 1. Fetch Roblox ID from username
    const robloxIdResponse = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [robloxUsername], excludeBannedUsers: false })
    });
    const robloxIdData = await robloxIdResponse.json();
    
    if (!robloxIdData.data || robloxIdData.data.length === 0) {
      return res.status(200).json({ linked: true, robloxUsername, error: 'Could not find Roblox ID' });
    }

    const robloxId = robloxIdData.data[0].id;
    const actualRobloxUsername = robloxIdData.data[0].name;

    // 2. Fetch Roblox profile and assets
    const profilePromise = fetch(`https://users.roblox.com/v1/users/${robloxId}`).then(r => r.json());
    const avatarPromise = fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${robloxId}&size=420x420&format=Png&isCircular=false`).then(r => r.json());
    const headshotPromise = fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=false`).then(r => r.json());
    const currentlyWearingPromise = fetch(`https://avatar.roblox.com/v1/users/${robloxId}/currently-wearing`).then(r => r.json());

    // 3. Fetch ERLC Players (v2 API doesn't expose bans directly)
    const erlcKey = process.env.ERLC_API_KEY;
    const erlcPlayersPromise = erlcKey ? fetch('https://api.erlc.gg/v2/server?Players=true', {
      headers: { 'server-key': erlcKey }
    }).then(r => r.json()).catch(err => {
      console.error('ERLC Players API Error:', err);
      return { Players: [] };
    }) : Promise.resolve({ Players: [] });

    // 4. Fetch Melonly Logs (temporarily disabled — API returning 403/timeouts)
    const melonlyLogsPromise = Promise.resolve(null);
      : Promise.resolve(null);

    const [profile, avatar, headshot, currentlyWearing, erlcPlayers, melonlyLogs] = await Promise.all([
      profilePromise,
      avatarPromise,
      headshotPromise,
      currentlyWearingPromise,
      erlcPlayersPromise,
      melonlyLogsPromise
    ]);

    // Fetch asset names for currently wearing
    let assetNames = [];
    if (currentlyWearing?.assetIds?.length > 0) {
      try {
        const assetRes = await fetch('https://catalog.roblox.com/v1/catalog/items/details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: currentlyWearing.assetIds.slice(0, 15).map(id => ({ itemType: 'Asset', id }))
          })
        });
        const assetData = await assetRes.json();
        assetNames = assetData.data ? assetData.data.map(item => item.name) : [];
      } catch (err) {
        console.error('Asset Name Fetch Error:', err);
      }
    }

    // Role mapping
    const roleMapping = rolesRes.roles || {};
    const reversedRoleMapping = Object.fromEntries(Object.entries(roleMapping).map(([name, id]) => [id, name]));
    const userRoleNames = (session.user.roles || []).map(id => reversedRoleMapping[id] || id).filter(name => !name.includes('\u3164'));

    // Check if player is in ERLC (v2 API - check if they're in the player list as staff indicator)
    const erlcStaff = erlcPlayers?.Players?.filter(p => p.Permission === 'Server Administrator' || p.Permission === 'Server Moderator') || [];
    const isErlcPlayer = erlcPlayers?.Players?.some(p => p.Player?.includes(`:${robloxId}:`) || p.Player?.startsWith(`${actualRobloxUsername}:`)) || false;
    const playerTeam = erlcPlayers?.Players?.find(p => p.Player?.includes(`:${robloxId}:`) || p.Player?.startsWith(`${actualRobloxUsername}:`))?.Team || null;
    
let banInfo = null;
    // Note: v2 API doesn't expose bans directly - simplified to just show player status
    // For full ban information, would need to check the Melonly logs
    
    return res.status(200).json({
      linked: true,
      roblox: {
        id: robloxId,
        username: actualRobloxUsername,
        displayName: profile.displayName,
        description: profile.description,
        avatarUrl: avatar?.data?.[0]?.imageUrl,
        headshotUrl: headshot?.data?.[0]?.imageUrl,
        currentlyWearing: assetNames
      },
      discord: {
        id: discordId,
        username: session.user.name,
        avatarUrl: session.user.image,
        roles: userRoleNames
      },
      erlc: {
        inServer: isErlcPlayer,
        team: playerTeam,
        isStaff: erlcStaff.length > 0,
        staffRole: erlcStaff.length > 0 ? erlcStaff[0].Permission : null
      },
      erlc: {
        inServer: isErlcPlayer,
        team: playerTeam,
        isStaff: erlcStaff.length > 0,
        staffRole: erlcStaff.length > 0 ? erlcStaff[0].Permission : null
      },
      melonly: {
        logs: (melonlyLogs?.data || []).slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Verification Check Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
