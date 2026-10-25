import { listNotices } from "@/services/notices.service";
import { NoticesManager } from "@/components/platform/notices-manager";

export const dynamic = "force-dynamic";

export default async function SuperAdminNoticesPage() {
  const notices = await listNotices();
  return <NoticesManager notices={notices} />;
}
