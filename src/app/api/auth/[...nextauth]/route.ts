import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Credentials login
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (user && user.password && await bcrypt.compare(credentials.password, user.password)) {
          return { id: user.id, email: user.email, name: user.name };
        }
        return null;
      }
    }),
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify",
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        }
      },
      profile(profile, tokens) {
        // Remove refresh_token_expires_in
        if ('refresh_token_expires_in' in tokens) {
          delete tokens.refresh_token_expires_in;
        }
        return {
          id: profile.sub, // REQUIRED!
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      }
    })

  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin"
  },
  callbacks: {
    // Attach custom fields to JWT token
    async jwt({ token, user, account }) {
      // **FIX: Remove unwanted Google field**
      if (account && account.refresh_token_expires_in) {
        delete account.refresh_token_expires_in;
      }
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      // For Google OAuth: attach access/refresh tokens
      if (account?.provider === "google") {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    // Attach relevant token fields to the session
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      // Optionally: add access token to session (for Gmail API client, etc.)
      if (token.accessToken) session.accessToken = token.accessToken;
      if (token.refreshToken) session.refreshToken = token.refreshToken;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
