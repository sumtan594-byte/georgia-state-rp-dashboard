import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: 'identify guilds.members.read' } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (profile) {
        token.id = profile.id;
        token.avatar = profile.avatar;
      }
      if (account?.access_token) {
        token.accessToken = account.access_token;
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
    async signIn({ account, profile }) {
      if (!account?.access_token) return false;

      try {
        const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { Authorization: `Bearer ${account.access_token}` },
        });
        const guilds = await guildsRes.json();
        const inGuild = Array.isArray(guilds) && guilds.some(g => g.id === process.env.ALLOWED_GUILD_ID);
        if (!inGuild) return false;

        const memberRes = await fetch(
          `https://discord.com/api/users/@me/guilds/${process.env.ALLOWED_GUILD_ID}/member`,
          { headers: { Authorization: `Bearer ${account.access_token}` } }
        );
        if (memberRes.ok) {
          const member = await memberRes.json();
          account.roles = member.roles || [];
        }
        return true;
      } catch {
        return false;
      }
    },
    async jwt({ token, account }) {
      if (account?.roles) {
        token.roles = account.roles;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
};

export default NextAuth(authOptions);
