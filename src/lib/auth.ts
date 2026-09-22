import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (!user || !user.active) return null;

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) return null;

        void prisma.user
          .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
          .catch(() => {});

        const roles = user.roles.map((ur) => ur.role.name);
        const permissions = user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.key)
        );

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles,
          permissions,
          churchId: user.churchId,
          sedeId: user.sedeId,
          congregationId: user.congregationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = user.roles ?? [];
        token.permissions = user.permissions ?? [];
        token.churchId = user.churchId ?? null;
        token.sedeId = user.sedeId ?? null;
        token.congregationId = user.congregationId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.roles = token.roles ?? [];
        session.user.permissions = token.permissions ?? [];
        session.user.churchId = token.churchId ?? null;
        session.user.sedeId = token.sedeId ?? null;
        session.user.congregationId = token.congregationId ?? null;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user?.id) {
        void auditLog({
          userId: user.id,
          churchId: user.churchId ?? null,
          action: "LOGIN",
          module: "auth",
          entity: "User",
          entityId: user.id,
          description: `Login realizado por ${user.name ?? user.email ?? "usuário"}`,
        }).catch(() => {});
      }
    },
    async signOut(params) {
      const userId =
        "token" in params ? params.token?.sub : params.session?.userId;
      if (userId) {
        void auditLog({
          userId,
          action: "LOGOUT",
          module: "auth",
          entity: "User",
          entityId: userId,
          description: "Logout realizado",
        }).catch(() => {});
      }
    },
  },
});