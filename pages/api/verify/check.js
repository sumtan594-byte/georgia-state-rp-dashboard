import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const discordId = session.user.id;
  const usernamesUrl = 'https://raw.githubusercontent.com/sumtan594-byte/gsrp-management/main/usernames.json';
  const rolesUrl = 'https://raw.githubusercontent.com/sumtan594-byte/gsrp-management/main/roles.json';

  try {
    const [usernamesRes, rolesRes] = await Promise.all([
      fetch(usernamesUrl).then(r => r.json()),
      fetch(rolesUrl).then(r => r.json())
    ]);

    const userData = usernamesRes[discordId];
    if (!userData || !userData.verified) {
      return res.status(200).json({ linked: false });
    }

    const robloxUsername = userData.robloxUsername;

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

    // 3. Fetch ERLC Ban Status
    const erlcKey = process.env.ERLC_API_KEY;
    const erlcBanPromise = erlcKey ? fetch('https://api.policeroleplay.community/v1/server/bans', {
      headers: { 'server-key': erlcKey }
    }).then(r => r.json()).catch(err => {
      console.error('ERLC Ban API Error:', err);
      return {};
    }) : Promise.resolve({});

    // 4. Fetch Melonly Logs
    const melonlyKey = process.env.MELONLY_API_KEY;
    const melonlyLogsPromise = melonlyKey ? fetch(`https://api.melonly.xyz/api/v1/server/logs/user/${actualRobloxUsername}?limit=100`, {
      headers: { 'Authorization': `Bearer ${melonlyKey}` }
    }).then(r => r.json()).catch(err => {
      console.error('Melonly API Error:', err);
      return null;
    }) : Promise.resolve(null);

    const [profile, avatar, headshot, currentlyWearing, erlcBans, melonlyLogs] = await Promise.all([
      profilePromise,
      avatarPromise,
      headshotPromise,
      currentlyWearingPromise,
      erlcBanPromise,
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
    const userRoleNames = (session.user.roles || []).map(id => reversedRoleMapping[id] || id).filter(name => !name.includes('\u3164')); // Filter out invisible characters

    // Check if banned in ERLC
    const isErlcBanned = erlcBans && (erlcBans[robloxId] !== undefined || Object.values(erlcBans).some(b => b === actualRobloxUsername || b === String(robloxId)));
    
    let banInfo = null;
    if (isErlcBanned) {
      // Find ban log in Melonly
      const banLog = melonlyLogs && melonlyLogs.data ? melonlyLogs.data.find(log => (log.type === 2 || log.typeId === 'ban' || log.text?.toLowerCase().includes('ban')) && !log.expired) : null;
      banInfo = {
        isBanned: true,
        logger: banLog?.createdBy || 'Staff Member',
        reason: banLog?.text || banLog?.description || 'No reason provided'
      };
    }

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
        name: session.user.name,
        roles: userRoleNames
      },
      erlc: {
        ban: banInfo
      },
      melonly: {
        logs: (melonlyLogs?.data || []).slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Verification Check Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
}
