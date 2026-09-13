# Relatório de Entrega — Fase 6 (Ecclesia)

> Data: 12/09/2026 · Projeto: `ecclesia` · Stack: Next.js 16.3.4 / React 19 / TypeScript / Prisma 6.19.3 / Auth.js v5 / shadcn/ui

## Fase 6 — Membros

### Funcionalidades entregues
- **Cadastro completo de membros** (CRUD) no padrão declarativo da Fase 5: dados pessoais (nome, CPF, RG, nascimento, sexo, estado civil), contato (telefone, WhatsApp, e-mail), endereço (endereço, CEP, bairro, cidade, UF), dados eclesiásticos (conversão, batismo, recepção, cargo, ministério, departamento, observações) e situação (Ativo, Inativo, Transferido, Desligado, Falecido).
- **Matrícula automática** por congregação (sequência `0001`, `0002`...) quando o campo é deixado em branco, respeitando a unicidade `congregationId + code`.
- **Sede derivada automaticamente da congregação**: o `sedeId` do membro é preenchido pelo serviço a partir da congregação selecionada — nunca fica dessincronizado com a hierarquia.
- **Validação de CPF** em módulo puro (`src/modules/cpf.ts`, algoritmo de dígitos verificadores) validada **no servidor** (Server Action → serviço) e formatada na exibição (`529.982.247-25`).
- **Suporte a campos de data** no cadastro genérico (input `date`, persistência em `DateTime`, exibição `yyyy-MM-dd`).
- **Situação** como coluna de status parametrizada (`status`/`situation`) com labels e cores por valor.
- **RBAC por operação** já semeadas: `membros.view` (todos), `membros.create/edit/delete/export` (SUPER_ADMIN, ADMIN_SEDE, ADMIN_CONGREGACAO, SECRETARIA).
- **Auditoria** de create/update/delete no módulo `membros` (descrições neutras em gênero).
- Rota `/membros` com item na barra lateral (ícone membros).

### Arquivos criados/alterados
| Arquivo | Papel |
| --- | --- |
| `src/modules/cpf.ts` | Validação e formatação de CPF (puro, testável) |
| `src/modules/registration/validators.ts` | Registro de validação/exibição por `recurso.campo` (cliente+servidor) |
| `src/modules/registration/definitions.ts` | Recurso `membros` (24 campos) |
| `src/services/registration.service.ts` | `date`, matrícula automática, `sedeId` derivado, validação via registro, módulo de auditoria por recurso |
| `src/components/crud/crud-manager.tsx` | Inputs/labels de data, coluna de situação parametrizada, display via registro |
| `src/app/(app)/membros/page.tsx` | Página de membros (render do CrudManager) |
| `src/app/(app)/layout.tsx` | Item "Membros" no menu |
| `src/app/(app)/estrutura/layout.tsx` | Filtra recursos `standalone` do submenu |

### Verificações e testes
- `npm run typecheck` ✔ · `npm run lint` ✔ · `npm run build` ✔ (rota `ƒ /membros` + Proxy reconhecido).
- **Módulo CPF**: válido (`52998224725`) ✔, inválido (`12345678900`) ✔, repetido (`11111111111`) ✔, formatação ✔.
- **Smoke E2E (server production, porta 3003):** login real → `GET /membros` 200; com um membro criado no banco a página renderiza nome, **congregação resolvida pelo nome** ("Congregação Central"), **CPF formatado** (529.982.247-25), data de nascimento e situação; após exclusão, sem resíduo.
- **Regressão Fase 5:** `/estrutura/igrejas`, `/sedes`, `/congregacoes` e `/membros` todos 200 (porta 3004).

### Problemas encontrados e correções
- **RSC: funções não podem cruzar para Client Components.** `validate`/`display` declarados no `definitions` (Server) quebravam `/membros` (500). Solução: movidos para `validators.ts` (registro `usuário.recurso.campo`, puro e importável dos dois lados); as definições ficam 100% serializáveis.

## Próximos passos
- Fase 7: **visitantes** (cadastro, visita, conversão em membro) e, em seguida, carteirinhas/cartas.
- Fases seguintes: financeiro (dízimos, ofertas, entradas/saídas), plano de contas, relatórios (PDF/Excel/CSV), usuários/permissões, auditoria e fechamento.