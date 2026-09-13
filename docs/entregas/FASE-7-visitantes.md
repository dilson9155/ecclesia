# Relatório de Entrega — Fase 7 (Ecclesia)

> Data: 13/09/2026 · Projeto: `ecclesia` · Stack: Next.js 16.3.4 / React 19 / TypeScript / Prisma 6.19.3 / Auth.js v5 / shadcn/ui

## Fase 7 — Visitantes

### Funcionalidades entregues
- **Cadastro de visitantes** (CRUD) no padrão declarativo: congregação (obrigatória), nome (obrigatório), telefone, WhatsApp, e-mail, data da visita, observações (campo `textarea`) e coluna **Situação** (Convertido/Pendente) derivada do vínculo com membro.
- **Conversão em membro** por ação de linha ("Converter em membro", autorizada por `membros.create`): o serviço cria o Membro a partir do visitante com **matrícula automática** por congregação (sequência `0001`, `0002`...), **sede derivada da congregação**, situação `ATIVO` e dados de contato copiados; marca o visitante como convertido (`convertedToMemberId`) e emite **auditoria** CREATE (`membros`) + UPDATE (`visitantes`). Impede conversões repetidas (visita já convertida) e fora do escopo da igreja.
- **Ações de linha no CRUD genérico**: novo `RowActionDef { key, label, permission }` em `ResourceDef`; renderiza botão na linha e executa Server Action com autorização e mensagens de erro na tela.
- **Novos tipos de campo**: `textarea` (textarea com label e placeholder) e `readonly` (campos ignorados no salvamento e não renderizados no formulário — `convertedToMemberId`).
- **Display via registro de validadores**: `visitantes.convertedToMemberId` → "Convertido"/"Pendente".
- Rota `/visitantes` com item na barra lateral (ícone visitantes, permissão `visitantes.view`).
- Permissões de visitantes já estavam semeadas (`visitantes.view/create/edit/delete`), o que garante acessos corretos sem migração.

### Arquivos criados/alterados
| Arquivo | Papel |
| --- | --- |
| `src/modules/registration/definitions.ts` | Tipo `textarea`/`readonly`, `RowActionDef`, `ResourceDef.actions`, recurso `visitantes` (ação `converter`) |
| `src/modules/registration/validators.ts` | Display `visitantes.convertedToMemberId` (Convertido/Pendente) |
| `src/services/actions.service.ts` | `runRowAction(rec, action, actor, id)` + `convertVisitor` (transação + auditoria) |
| `src/app/actions/registration.ts` | `runRowActionById` (RBAC pela permissão da ação, revalidação das rotas) |
| `src/components/crud/crud-manager.tsx` | Ações de linha, `textarea`, campos `readonly` ignorados, erros de ação na tela |
| `src/services/registration.service.ts` | `buildData` desconsidera campos `readonly` |
| `src/app/(app)/visitantes/page.tsx` | Página de visitantes (render do CrudManager com ações autorizadas) |
| `src/app/(app)/layout.tsx` + `src/components/app-shell.tsx` | Item "Visitantes" no menu |

### Verificações e testes
- `npm run typecheck` ✔ · `npm run lint` ✔ · `npm run build` ✔ (rota `ƒ /visitantes` + Proxy reconhecido).
- **Smoke E2E (server production, porta 3001):** login real → `GET /visitantes` 200 contendo "Converter em membro", "Situação" e "Observações"; `/membros`, `/dashboard` e as 3 rotas de estrutura OK (regressão); anônimo redirecionado (307) para login.
- **Ciclo de banco (conversão):** criar visitante → criar membro (matrícula `0001`, `sedeId` derivado) → gravar `convertedToMemberId` → conferir persistência; **sem resíduo** após limpeza.

### Problemas encontrados e correções
- Filtro async inline (`array.filter(async ...)`) devolve Promise — substituído por laço `for...of` com `await can(...)` (mesmo padrão inexistente na Fase 5, corrigido aqui no template de ação de linha).

## Próximos passos
- Fase 8: **carteirinhas de membros e cartas** (declarações e transferências PDF).
- Fases seguintes: financeiro (dízimos, ofertas, entradas/saídas), plano de contas, relatórios (PDF/Excel/CSV), usuários/permissões, auditoria, fechamento e deploy Vercel.