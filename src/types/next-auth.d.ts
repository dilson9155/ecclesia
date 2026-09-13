import "server-only";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: string[];
      permissions: string[];
      churchId?: string | null;
      congregationId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    roles?: string[];
    permissions?: string[];
    churchId?: string | null;
    congregationId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles: string[];
    permissions: string[];
    churchId?: string | null;
    congregationId?: string | null;
  }
}

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  roles: string[];
  permissions: string[];
  churchId?: string | null;
  congregationId?: string | null;
};