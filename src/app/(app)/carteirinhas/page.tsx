import { requirePermission, can } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import { listCards, getMemberOptionList } from "@/services/cards.service";
import { CarteirinhasManager } from "@/components/carteirinhas/carteirinhas-manager";

export const dynamic = "force-dynamic";

export default async function CarteirinhasPage() {
  const user = await requirePermission("carteirinhas.view");
  if (!user.churchId) return null;

  const congregationIds = await scopedCongregationIdsOrNull(scopeFromUser(user));
  const [cards, members] = await Promise.all([
    listCards(user.churchId, congregationIds),
    getMemberOptionList(user.churchId, congregationIds),
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