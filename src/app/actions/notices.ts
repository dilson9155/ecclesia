"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/rbac";
import {
  createNotice,
  deleteNotice,
  setNoticeActive,
  updateNotice,
  type NoticeInput,
} from "@/services/notices.service";

function revalidateNotices() {
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/notificacoes");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

export async function createNoticeAction(input: NoticeInput) {
  const user = await requirePlatformAdmin();
  try {
    const created = await createNotice(input, user.id);
    revalidateNotices();
    return { ok: true as const, id: created.id };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function updateNoticeAction(id: string, input: NoticeInput) {
  const user = await requirePlatformAdmin();
  try {
    await updateNotice(id, input, user.id);
    revalidateNotices();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function setNoticeActiveAction(id: string, active: boolean) {
  const user = await requirePlatformAdmin();
  try {
    await setNoticeActive(id, active, user.id);
    revalidateNotices();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function deleteNoticeAction(id: string) {
  const user = await requirePlatformAdmin();
  try {
    await deleteNotice(id, user.id);
    revalidateNotices();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}
