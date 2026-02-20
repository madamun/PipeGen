"use client";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
export const useSession = authClient.useSession;
export const signIn = authClient.signIn;
export const signOut = authClient.signOut;
