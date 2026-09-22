import { requirePermission, can } from "@/lib/rbac";
import { scopeFromUser } from "@/lib/scope";
import { listUsers, loadManagerData } from "@/services/users.service";
import { UsuariosManager } from "@/components/usuarios/usuarios-manager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const user = await requirePermission("usuarios.view");
  if (!user.churchId) return null;

  const actor = {
    userId: user.id,
    roles: user.roles,
    scope: scopeFromUser(user),
  };

  const [users, managerData] = await Promise.all([
    listUsers(actor),
    loadManagerData(actor),
  ]);

  const canManage = await can(user, "usuarios.manage");

  return (
    <div className="space-y-6">
      <UsuariosManager
        users={users}
        managerData={managerData}
        canManage={canManage}
        currentUserId={user.id}
      />
    </div>
  );
}