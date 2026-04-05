import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: 'identify guilds guilds.members.read guilds.channels.read' } },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      console.log('[next-auth] signIn called, account:', !!account, 'profile:', !!profile);
      if (!account?.access_token) {
        console.error('[next-auth] No access token');
        return false;
      }

      try {
        const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { Authorization: `Bearer ${account.access_token}` },
        });
        const guilds = await guildsRes.json();
        console.log('[next-auth] Guilds response status:', guildsRes.status, 'count:', Array.isArray(guilds) ? guilds.length : 'not array');
        const inGuild = Array.isArray(guilds) && guilds.some(g => g.id === process.env.ALLOWED_GUILD_ID);
        console.log('[next-auth] In guild?', inGuild, 'looking for:', process.env.ALLOWED_GUILD_ID);
        if (!inGuild) {
          console.error('[next-auth] User not in allowed guild', process.env.ALLOWED_GUILD_ID);
          return false;
        }

        const memberRes = await fetch(
          `https://discord.com/api/users/@me/guilds/${process.env.ALLOWED_GUILD_ID}/member`,
          { headers: { Authorization: `Bearer ${account.access_token}` } }
        );
        console.log('[next-auth] Member check:', memberRes.status);
        if (memberRes.ok) {
          const member = await memberRes.json();
          account.roles = member.roles || [];
          console.log('[next-auth] Roles:', account.roles);
        }
        return true;
      } catch (err) {
        console.error('[next-auth] SignIn error:', err.message, err.stack);
        return false;
      }
    },
    async jwt({ token, account, profile }) {
      if (profile) {
        token.id = profile.id;
        token.avatar = profile.avatar;
      }
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      if (account?.roles) {
        token.roles = account.roles;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.avatar = token.avatar;
        session.user.roles = token.roles || [];
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
};

export default NextAuth(authOptions);
