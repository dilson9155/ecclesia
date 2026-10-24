"use server";

import { headers } from "next/headers";
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/services/password-reset.service";

async function getRequestIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip")?.trim() || null;
}

export async function requestPasswordResetAction(email: string) {
  const ip = await getRequestIp();
  return requestPasswordReset(email, ip);
}

export async function resetPasswordAction(
  token: string,
  password: string,
  confirmPassword: string
) {
  return resetPasswordWithToken(token, password, confirmPassword);
}
