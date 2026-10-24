import "server-only";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { auditLog } from "@/services/audit.service";

const TOKEN_TTL_MINUTES = 30;
const RATE_WINDOW_MINUTES = 15;
const MAX_REQUESTS_PER_USER = 3;
const MAX_REQUESTS_PER_IP = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GENERIC_RESET_MESSAGE =
  "Se este e-mail estiver cadastrado, enviaremos um link para redefinir a senha. Verifique sua caixa de entrada e o spam.";

export type PasswordResetRequestResult =
  | { ok: true; message: string; devUrl: string | null }
  | { ok: false; error: string };

export type PasswordResetResult =
  | { ok: true }
  | { ok: false; error: string };

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildResetUrl(token: string): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/redefinir-senha?token=${encodeURIComponent(token)}`;
}

function genericSuccess(devUrl: string | null = null): PasswordResetRequestResult {
  return {
    ok: true,
    message: GENERIC_RESET_MESSAGE,
    devUrl,
  };
}

/**
 * Solicita a recuperação de senha.
 * A resposta é sempre genérica para não revelar se o e-mail existe.
 */
export async function requestPasswordReset(
  emailRaw: string,
  requestedIp: string | null
): Promise<PasswordResetRequestResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Informe um e-mail válido." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
    },
  });

  if (!user || !user.active) {
    return genericSuccess();
  }

  const windowStart = new Date(
    Date.now() - RATE_WINDOW_MINUTES * 60 * 1000
  );
  const [recentByUser, recentByIp] = await Promise.all([
    prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gte: windowStart } },
    }),
    requestedIp
      ? prisma.passwordResetToken.count({
          where: { requestedIp, createdAt: { gte: windowStart } },
        })
      : Promise.resolve(0),
  ]);

  if (
    recentByUser >= MAX_REQUESTS_PER_USER ||
    recentByIp >= MAX_REQUESTS_PER_IP
  ) {
    // Mantém a resposta genérica para não expor o limite atingido.
    return genericSuccess();
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MINUTES * 60 * 1000);
  const cleanupBefore = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    // Invalida links anteriores ainda não usados.
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        requestedIp,
      },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: cleanupBefore } },
    }),
  ]);

  const resetUrl = buildResetUrl(token);
  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });

  const showDevLink = process.env.PASSWORD_RESET_DEV_LINK === "true";
  return genericSuccess(showDevLink ? resetUrl : null);
}

/**
 * Redefine a senha usando um token de uso único.
 */
export async function resetPasswordWithToken(
  tokenRaw: string,
  password: string,
  confirmPassword: string
): Promise<PasswordResetResult> {
  const token = tokenRaw.trim();
  if (token.length < 32) {
    return {
      ok: false,
      error: "Link inválido ou expirado. Solicite uma nova recuperação.",
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      error: "A senha deve ter no mínimo 8 caracteres.",
    };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return {
      ok: false,
      error: "A senha deve conter letras e números.",
    };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "As senhas informadas não coincidem." };
  }

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      user: {
        select: {
          active: true,
          churchId: true,
        },
      },
    },
  });

  if (
    !record ||
    record.usedAt ||
    record.expiresAt <= new Date() ||
    !record.user.active
  ) {
    return {
      ok: false,
      error: "Link inválido ou expirado. Solicite uma nova recuperação.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      // O update condicional garante uso único mesmo com requisições concorrentes.
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      if (claimed.count === 0) {
        throw new Error("TOKEN_ALREADY_USED");
      }

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: record.userId,
          id: { not: record.id },
          usedAt: null,
        },
        data: { usedAt: now },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TOKEN_ALREADY_USED") {
      return {
        ok: false,
        error: "Link inválido ou expirado. Solicite uma nova recuperação.",
      };
    }
    throw error;
  }

  try {
    await auditLog({
      userId: record.userId,
      churchId: record.user.churchId,
      action: "UPDATE",
      module: "auth",
      entity: "User",
      entityId: record.userId,
      description: "Senha redefinida via link de recuperação",
    });
  } catch (error) {
    console.error("[recuperar-senha] Falha ao registrar auditoria:", error);
  }

  return { ok: true };
}
