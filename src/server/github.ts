import { prisma } from "@/server/db";
import type { Account } from "@prisma/client";

export async function getGithubAccount(userId: string): Promise<Account | null> {
  return prisma.account.findFirst({
    where: { userId, providerId: "github" },
  });
}

export async function getGithubToken(userId: string) {
  const acc = await getGithubAccount(userId);
  return acc?.accessToken ?? null;
}
