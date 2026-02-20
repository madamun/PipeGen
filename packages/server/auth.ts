import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ["read:user", "user:email", "repo", "read:org", "workflow"],
    },
    gitlab: {
      clientId: process.env.GITLAB_CLIENT_ID!,
      clientSecret: process.env.GITLAB_CLIENT_SECRET!,
      scope: ["read_user", "read_api", "openid", "profile", "email", "api"],
    },
  },

  cookie: {
    secure: false,
    sameSite: "Lax",
  },

  emailAndPassword: {
    enabled: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
    cookieCache: {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      enabled: true,
    },
  },

  plugins: [],
});
