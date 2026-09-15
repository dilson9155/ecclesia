# Relatório de Entrega — Fase 9 (Ecclesia)

> Data: 15/09/2026 · Projeto: `ecclesia` · Stack: Next.js 16.3.4 / React 19 / TypeScript / Prisma 6.19.3 / Auth.js v5

## Fase 9 — Financeiro I: Plano de Contas, Centros de Custo, Dízimos e Ofertas

### Funcionalidades entregues
- **Plano de contas (CRUD, `/plano-contas`)**:
  - Contas contábeis com código (`1.01.001`), nome, natureza (`RECEITA`/`DESPESA`), conta pai (âmbito por igreja, `Account.accountingCode` derivado do código), descrição e situação.
  - Listagem ordenada por código contábil com exibição de natureza; RBAC `planoContas.view/create/edit/delete`.
- **Centros de custo (CRUD, `/centros-custo`)**:
  - Código único por igreja, nome, descrição e congregação opcional; RBAC `centrosCusto.view/create/edit/delete`.
- **Dízimos (`/dizimos`)**:
  - Lançamento com congregação, membro opcional, data, valor, forma de pagamento, centro de custo, conta contábil (obrigatória), observação e flag de anônimo.
  - Validação **valor > 0** (Zod-free, validador de domínio); listagem com valor formatado em **R$** e indicador "Anônimo".
- **Ofertas (`/ofertas`)**:
  - Igual aos dízimos + **tipo de oferta** (`CULTO`, `MISSOES`, ...) e contribuinte avulso (campo opcional quando não há membro).
- **Lançamento automático em caixa**:
  - Criar/editar dízimo ou oferta gera e sincroniza uma `CashEntry` de natureza `ENTRADA` com `sourceType` `DIZIMO`/`OFERTA` e `sourceId` (rastreável), em **transação atômica** (`prisma.$transaction`).
  - Excluir dízimo/oferta remove também o lançamento correspondente (transacional).
  - `accountingCode` da movimentação derivado da conta contábil; `createdById` registrado.
- **Menu lateral**: novos itens Plano de Contas, Centros de Custo, Dízimos e Ofertas com ícones próprios (`Landmark`, `Tags`, `HandCoins`, `Gift`), filtrados por permissão.
- **RBAC/seed**: permissões `dizimos.edit` e `ofertas.edit` adicionadas (faltavam) e concedidas às roles `FINANCEIRO` e `ADMIN_CONGREGACAO`; demais permissões financeiras já semeadas.
- **Revalidação por rota**: as ações `create/update/delete` agora revalidam a rota correta de cada recurso standalone (`/plano-contas`, `/centros-custo`, `/dizimos`, `/ofertas`, `/membros`, `/visitantes`).

### Arquivos criados/alterados
| Arquivo | Papel |
| --- | --- |
| `src/app/(app)/dizimos/page.tsx`, `ofertas/page.tsx` | Páginas standalone de dízimos e ofertas |
| `src/app/(app)/plano-contas/page.tsx`, `centros-custo/page.tsx` | Páginas standalone (já em andamento, agora commitadas) |
| `src/modules/registration/definitions.ts` | Recursos `contas`, `centrosCusto`, `dizimos`, `ofertas` + tipo de campo `decimal` |
| `src/services/registration.service.ts` | Modelos financeiros, conversão `decimal`, lançamento em `CashEntry` (create/update/delete transacionais) |
| `src/modules/registration/validators.ts` | Validação `valor > 0` + `displayField` de valor (R$) e anônimo |
| `src/components/crud/crud-manager.tsx` | Formatação de decimais (R$) e checkboxes (Sim/Não) na listagem |
| `src/app/actions/registration.ts` | Revalidação de rotas standalone por recurso |
| `src/app/(app)/layout.tsx`, `src/components/app-shell.tsx` | Itens financeiros no menu + novos ícones |
| `prisma/seed.ts` | Permissões `dizimos.edit`/`ofertas.edit` e atribuição às roles |

### Verificações e testes
- `npm run typecheck` ✔ · `npm run lint` ✔ · `npm run build` ✔ — novas rotas `/dizimos`, `/ofertas`, `/plano-contas`, `/centros-custo` compiladas e listadas no build.
- Seed (permissões) validado localmente; banco remoto (Neon) não acessível deste ambiente — **aplicar `npm run db:seed` no ambiente de deploy** para sincronizar as novas permissões.

### Problemas encontrados e correções
- **Imports duplicados** em `src/app/actions/registration.ts` durante edição (TS2300). Corrigido normalizando o cabeçalho do arquivo e a decisão de revalidação ficou centralizada em `resourcePaths()`.
- **`direction: "desc"` não atribuível a `"asc"`**: o tipo de `SORT_BY_MODEL` foi alargado para `"asc" | "desc"` (dízimos/ofertas ordenam por data desc).

## Próximos passos
- Fase 10: **financeiro II** — entradas/saídas (caixa), fornecedores, fechamento mensal e livro caixa.
- Fases seguintes: relatórios (PDF/Excel/CSV), usuários/permissões, auditoria, configurações/backup e deploy na Vercel.