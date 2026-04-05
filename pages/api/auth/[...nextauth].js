import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

export const authOptions = {
  debug: true,
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
        // Check guild membership from user's guild list
        const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { Authorization: `Bearer ${account.access_token}` },
        });
        if (!guildsRes.ok) {
          console.error('[next-auth] Guilds fetch failed:', guildsRes.status);
          return false;
        }
        const guilds = await guildsRes.json();
        const inGuild = Array.isArray(guilds) && guilds.some(g => g.id === process.env.ALLOWED_GUILD_ID);
        if (!inGuild) {
          console.error('[next-auth] User not in allowed guild');
          return false;
        }

        // Fetch member roles using bot token (no privileged scopes needed)
        const memberRes = await fetch(
          `https://discord.com/api/guilds/${process.env.ALLOWED_GUILD_ID}/members/${profile.id}`,
          { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
        );
        if (memberRes.ok) {
          const member = await memberRes.json();
          account.roles = member.roles || [];
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
