import { requirePermission, can } from "@/lib/rbac";
import { listCards, getMemberOptionList } from "@/services/cards.service";
import { CarteirinhasManager } from "@/components/carteirinhas/carteirinhas-manager";

export const dynamic = "force-dynamic";

export default async function CarteirinhasPage() {
  const user = await requirePermission("carteirinhas.view");
  if (!user.churchId) return null;

  const [cards, members] = await Promise.all([
    listCards(user.churchId),
    getMemberOptionList(user.churchId),
  ]);

  return (
    <CarteirinhasManager
      cards={cards as never}
      members={members as never}
      canEmit={await can(user, "carteirinhas.emit")}
      canCancel={await can(user, "carteirinhas.delete")}
    />
  );
}