import DiscordProvider from "next-auth/providers/discord";
import { fetchMemberRoles, fetchGuildRoles, fetchBanStatus } from './access-check';
import { fetchWithTimeout } from './http';

async function fetchLiveMemberRoles(userId) {
  if (!userId || !process.env.ALLOWED_GUILD_ID || !process.env.DISCORD_BOT_TOKEN) return null;
  try {
    return await fetchMemberRoles(userId);
  } catch {
    return null;
  }
}

function pickDisplayRole(memberRoleIds, allGuildRoles) {
  const userRoles = allGuildRoles.filter(r => memberRoleIds.includes(r.id));
  userRoles.sort((a, b) => b.position - a.position);

  for (const role of userRoles) {
    if (role.name.includes('────')) continue;
    if (role.id === '1391175328545636444') return 'Donator +';
    if (role.id === '1372482493701165118') return 'Donator';
    if (role.id === '1438063270631182376') return 'Former foundation member';
    if (role.id === '1372481017436438579') return 'Retired staff member';
    return role.name;
  }
  return null;
}

async function computeDisplayRole(memberRoleIds) {
  if (!memberRoleIds?.length) return null;
  try {
    const allGuildRoles = await fetchGuildRoles();
    if (!allGuildRoles?.length) return null;
    return pickDisplayRole(memberRoleIds, allGuildRoles);
  } catch {
    return null;
  }
}

export const authOptions = {
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
  session: {
    strategy: 'jwt',
    // Keep active users signed in for the standard 30-day rolling window.
    // The previous 24-hour cap made a healthy session appear to end suddenly.
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: 'identify guilds' } },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      try {
        const guildsRes = await fetchWithTimeout('https://discord.com/api/users/@me/guilds', {
          headers: { Authorization: `Bearer ${account.access_token}` },
        });
        if (!guildsRes.ok) return false;
        const guilds = await guildsRes.json();
        const inGuild = Array.isArray(guilds) && guilds.some(g => g.id === process.env.ALLOWED_GUILD_ID);
        if (!inGuild) {
          // Users banned from the guild are allowed to sign in (flagged) so
          // they can reach /ban-appeals. Anyone else outside the guild is
          // still rejected.
          const banStatus = await fetchBanStatus(profile.id);
          if (banStatus?.banned) {
            account.banned = true;
            account.roles = [];
            account.displayRole = 'Banned';
            return true;
          }
          return false;
        }

        const memberRes = await fetchWithTimeout(
          `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/members/${profile.id}`,
          { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
        );
        if (memberRes.ok) {
          const member = await memberRes.json();
          account.roles = member.roles || [];
          account.displayRole = (await computeDisplayRole(account.roles)) || 'User';
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
      if (account?.scope) token.scope = account.scope;
      if (account?.roles) {
        token.roles = account.roles;
        token.displayRole = account.displayRole;
      }
      if (account) {
        token.banned = account.banned === true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const liveRoles = await fetchLiveMemberRoles(token.id);
        const roles = liveRoles || token.roles || [];
        session.user.id = token.id;
        session.user.avatar = token.avatar;
        session.user.roles = roles;
        // Keep the authentication-critical session endpoint independent of a
        // second Discord request. UserRefreshProvider supplies the live display
        // role after login; a transient guild-role failure must not look like a
        // missing NextAuth session to the browser.
        session.user.displayRole = token.displayRole || 'User';
        // A live member fetch succeeding means the user is back in the guild
        // (unbanned + rejoined), so the sign-in-time ban flag is stale.
        session.user.banned = token.banned === true && !liveRoles;
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
