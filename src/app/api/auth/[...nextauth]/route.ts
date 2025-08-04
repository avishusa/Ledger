import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    id?: string;
  }
}

/**
 * Helper to refresh the Google access token using the refresh token.
 * Follows the refresh-token-rotation pattern from NextAuth/Auth.js docs. :contentReference[oaicite:2]{index=2}
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = "https://oauth2.googleapis.com/token";
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: (token.refreshToken as string) || "",
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const refreshed = await response.json();

    if (!response.ok) {
      throw refreshed;
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000, // extend expiry. :contentReference[oaicite:3]{index=3}
      refreshToken: refreshed.refresh_token ?? token.refreshToken, // rotate if new one provided
    };
  } catch (error) {
    console.error("Error refreshing access token", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Credentials login
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (
          user &&
          user.password &&
          (await bcrypt.compare(credentials.password, user.password))
        ) {
          return { id: user.id, email: user.email, name: user.name };
        }
        return null;
      },
    }),
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify",
          ].join(" "),
          access_type: "offline", // to get refresh token
          prompt: "consent", // force re-consent when scopes change
          include_granted_scopes: "true", // incremental auth / merging scopes
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in: persist tokens and user info.
      if (account && user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;

        if (account.provider === "google") {
          token.accessToken = account.access_token;
          // account.expires_at is usually the absolute expiry in seconds; convert to ms
          token.accessTokenExpires = account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 60 * 60 * 1000; // fallback 1h
          token.refreshToken = account.refresh_token;
        }
        return token;
      }

      // Return early if access token has not expired yet
      if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to refresh
      if (token.refreshToken) {
        return await refreshAccessToken(token);
      }

      // Nothing to do, return as-is (will likely force re-auth)
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      if (token.accessToken) session.accessToken = token.accessToken;
      if (token.refreshToken) session.refreshToken = token.refreshToken;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };