import DiscordProvider from "next-auth/providers/discord";

async function fetchLiveMemberRoles(userId) {
  if (!userId || !process.env.ALLOWED_GUILD_ID || !process.env.DISCORD_BOT_TOKEN) return null;
  try {
    const res = await fetch(
      `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/members/${userId}`,
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } },
    );
    if (!res.ok) return null;
    const member = await res.json();
    return member.roles || [];
  } catch {
    return null;
  }
}

export const authOptions = {
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
    updateAge: 0,
  },
  jwt: {
    maxAge: 24 * 60 * 60,
  },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: 'identify guilds guilds.members.read guilds.channels.read' } },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      try {
        const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { Authorization: `Bearer ${account.access_token}` },
        });
        if (!guildsRes.ok) return false;
        const guilds = await guildsRes.json();
        const inGuild = Array.isArray(guilds) && guilds.some(g => g.id === process.env.ALLOWED_GUILD_ID);
        if (!inGuild) return false;

        const memberRes = await fetch(
          `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/members/${profile.id}`,
          { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
        );
        if (memberRes.ok) {
          const member = await memberRes.json();
          account.roles = member.roles || [];
          
          let displayRole = 'User';
          const rolesRes = await fetch(
            `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/roles`,
            { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
          );
          
          if (rolesRes.ok) {
            const allRoles = await rolesRes.json();
            const userRoles = allRoles.filter(r => account.roles.includes(r.id));
            userRoles.sort((a, b) => b.position - a.position);
            
            for (const role of userRoles) {
              if (role.name.includes('────')) continue;
              if (role.id === '1391175328545636444') { displayRole = 'Donator +'; break; }
              if (role.id === '1372482493701165118') { displayRole = 'Donator'; break; }
              if (role.id === '1438063270631182376') { displayRole = 'Former foundation member'; break; }
              if (role.id === '1372481017436438579') { displayRole = 'Retired staff member'; break; }
              displayRole = role.name;
              break;
            }
          }
          account.displayRole = displayRole;
        }
        return true;
      } catch (err) {
        console.error('[next-auth] SignIn error:', err.message);
        return false;
      }
    },
    async jwt({ token, account, profile }) {
      if (profile) {
        token.id = profile.id;
        token.avatar = profile.avatar;
      }
      if (account?.access_token) token.accessToken = account.access_token;
      if (account?.roles) {
        token.roles = account.roles;
        token.displayRole = account.displayRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const liveRoles = await fetchLiveMemberRoles(token.id);
        session.user.id = token.id;
        session.user.avatar = token.avatar;
        session.user.roles = liveRoles || token.roles || [];
        session.user.displayRole = token.displayRole || 'User';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    error: '/login',
  },
};
