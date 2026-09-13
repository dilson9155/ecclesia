# Relatório de Entrega — Fase 5 (Ecclesia)

> Data: 12/09/2026 · Projeto: `ecclesia` · Stack: Next.js 16.3.4 / React 19 / TypeScript / Prisma 6.19.3 / Auth.js v5 / shadcn/ui

## Fase 5 — Estrutura da Igreja (Igrejas · Sedes · Congregações)

### Funcionalidades entregues
- **3 cadastros hierárquicos** com CRUD completo por metadados declarativos (`definitions.ts`): **Igreja** (nome, razão social, CNPJ, contato, descrição, situação), **Sede** (nome, CNPJ, contato, endereço, situação) e **Congregação** (código, sede de vínculo, nome, contato, endereço, situação).
- **Serviço genérico** `registration.service.ts`: `listRows`, `saveRow`, `deleteRow` e `getRelationOptions` baseados em `prisma[model]`, com **escopo por igreja em todas as consultas e gravações** (o usuário só acessa/edita dados da própria igreja).
- **Relacionamento congregação→sede** resolvido dinamicamente: o campo "Sede" vira um `select` populado no servidor (`getRelationOptions`), e a coluna exibe o nome da sede (não o id).
- **RBAC por operação**: permissões `igrejas.view/manage`, `sedes.view/manage`, `congregacoes.view/create/edit/delete`. Admin de sede (ADMIN_SEDE) gerencia sedes e congregações; SUPER_ADMIN gere também a igreja; demais papéis têm leitura.
- **Auditoria** de create/update/delete no módulo `estrutura` (registros em `audit_logs` com usuário, igreja, entidade, operação e valores novos).
- Validações: campos obrigatórios, unicidade `sede+code` da congregação e `churchId+name` da sede, exclusão protegida por `Restrict` (sede com congregações não é removida).
- UI: `CrudManager` (tabela + diálogos Novo/Editar/Excluir com React Hook Form), rotas `/estrutura`, `/estrutura/igrejas`, `/estrutura/sedes`, `/estrutura/congregacoes`, item "Estrutura" na barra lateral e atalho no dashboard.

### Arquivos criados
| Arquivo | Papel |
| --- | --- |
| `src/modules/registration/definitions.ts` | Metadados dos 3 recursos (campos, permissões, relações) |
| `src/services/registration.service.ts` | Serviço genérico CRUD escopado por igreja + auditoria |
| `src/app/actions/registration.ts` | Server Actions `createRecord`/`updateRecord`/`removeRecord` |
| `src/components/crud/crud-manager.tsx` | Tabela + diálogos CRUD (RHF, selects estáticos e relacionais) |
| `src/app/(app)/estrutura/layout.tsx` | Cabeçalho + navegação entre recursos |
| `src/app/(app)/estrutura/page.tsx` | Redirect para `/estrutura/igrejas` |
| `src/app/(app)/estrutura/[resource]/page.tsx` | Render do CrudManager por recurso |
| `src/lib/form-utils.ts`, `src/lib/format.ts`, `src/lib/styles.ts` | Utilitários de formulário/formatação |
| `prisma/seed.ts` (alterado) | Novas permissões `sedes.view` e `sedes.manage` |

### Verificações e testes
- `npm run typecheck` ✔ · `npm run lint` ✔ (0 erros/avisos) · `npm run build` ✔ (rotas `ƒ /estrutura` e `ƒ /estrutura/[resource]` + Proxy reconhecido).
- **Seed reexecutado:** 71 permissões (69 + 2 de sedes); papéis atualizados (ADMIN_SEDE ± SUPER_ADMIN administram sedes; demais veem).
- **Smoke E2E (server production):** login real → `/estrutura/igrejas` 200 ("Minha Igreja"), `/estrutura/sedes` 200 ("Sede Central"), `/estrutura/congregacoes` 200 ("Congregação Central" + sede resolvida); anônimo em `/estrutura` → 307 `/login?callbackUrl=/estrutura`.
- **Ciclo CRUD real no banco:** create sede → create congregação (FK) → update sede → duplicata bloqueada (unique `sede+code`) → delete da sede com filhos bloqueado (Restrict) → delete em ordem ok; sem resíduos; listas escopadas corretas.
- **Proteção `server-only`** confirmada (importar o serviço fora do servidor falha propositalmente).

### Problemas encontrados e correções
- `orderBy` passado como `{ field, direction }` (metadado) em vez de `{ [field]: direction }` em `getRelationOptions` → 500 em `/estrutura/congregacoes`; corrigido desestruturando o metadado.
- Layout `(app)/estrutura` usava `Promise[]` de `filter`/`map` async → reescrito com loop síncrono.
- `server-only` impede testes de serviço via `tsx` externo → teste de constraints feito direto no Prisma (comportamento equivalente ao do serviço).

## Próximos passos
- Fase 6: cadastro de **membros** (dados pessoais, endereço, situação, vínculo congregação) com validação de CPF — seguindo o mesmo padrão declarativo.
- Fase 7: **visitantes** (cadastro e conversão em membro) e carteirinhas/cartas.
- Fases seguintes: financeiro (dízimos, ofertas, entradas/saídas), plano de contas, relatórios (PDF/Excel/CSV), usuários/permissões, auditoria e fechamento.