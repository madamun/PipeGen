import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.AUTH_URL ||
  (process.env.BETTER_AUTH_URL ? `https://${process.env.BETTER_AUTH_URL}` : "http://localhost:3000");

const trustedOrigins = Array.from(
  new Set(
    [
      baseURL,
      process.env.BETTER_AUTH_URL,
      process.env.AUTH_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.BETTER_AUTH_URL ? `https://${process.env.BETTER_AUTH_URL}` : undefined,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ].filter(Boolean) as string[],
  ),
);

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL,
  trustedOrigins,

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,

    },
    gitlab: {
      clientId: process.env.GITLAB_CLIENT_ID!,
      clientSecret: process.env.GITLAB_CLIENT_SECRET!,
      scope: ["read_user", "read_api", "openid", "profile", "email", "api"],
    },
  },

  cookie: {
    secure: baseURL.startsWith("https://"),
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
