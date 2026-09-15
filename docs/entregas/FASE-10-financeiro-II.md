# Relatório de Entrega — Fase 10 (Ecclesia)

> Data: 15/09/2026 · Projeto: `ecclesia` · Stack: Next.js 16.3.4 / React 19 / TypeScript / Prisma 6.19.3 / Auth.js v5

## Fase 10 — Financeiro II: Fornecedores, Entradas, Saídas, Livro Caixa e Fechamento Mensal

### Funcionalidades entregues
- **Fornecedores (CRUD, `/fornecedores`)**:
  - Cadastro com nome, CPF/CNPJ, telefone, e-mail, endereço, chave PIX (com tipo: CPF/CNPJ, e-mail, telefone, aleatória), observação e situação.
  - Relação com saídas (`Expense.supplierId`, exclusão com `SetNull`). RBAC `fornecedores.view/create/edit/delete`.
- **Entradas (`/entradas`)**:
  - Receitas diversas com congregação, data, descrição, valor, forma de pagamento, documento, centro de custo, conta contábil (obrigatória), responsável e observação.
  - Número sequencial por congregação (código `0001`, `0002`, ...) gerado de forma **à prova de lacunas** (máximo+1, não contagem) para evitar colisão de `@@unique([congregationId, code])`.
  - **Lançamento automático em caixa**: criar/editar entrada gera e sincroniza uma `CashEntry` `ENTRADA` (`sourceType ENTRADA`, `sourceId` rastreado) em transação atômica; excluir remove o lançamento.
- **Saídas (`/saidas`)**:
  - Despesas com data de competência, vencimento, fornecedor ou beneficiário avulso, descrição, valor, forma de pagamento, documento, centro de custo, conta contábil e observação.
  - Status gerenciado (PENDENTE → PAGO → CANCELADO): campo `status` é somente leitura no CRUD.
  - Ações de linha **Baixar** e **Cancelar** (RBAC `saidas.baixar`/`saidas.cancel`): baixar grava `paidAt`/`paidById`, apaga e recria a `CashEntry` `SAIDA`; cancelar grava `cancelledAt`/`cancelledById` e remove o lançamento.
  - **Somente saídas PAGO entram no caixa** (`shouldPostLedger`): pendentes não geram lançamento; edição de pendente não gera lançamento.
  - Saída PAGO **não pode ser excluída** (deve ser cancelada antes). RBAC `saidas.view/create/edit/cancel`.
- **Livro Caixa (`/livro-caixa`)**:
  - Extrato contábil com filtro por mês, saldo corrido por lançamento (entradas somam, saídas subtraem), totais do mês e colunas de conta/centro de custo/documento.
  - **Exportação CSV** (rota `/api/livro-caixa/export?month=AAAA-MM`, RBAC `livroCaixa.export`), com BOM UTF-8 e separador `;` para abertura direta no Excel BR.
- **Fechamento Mensal (`/fechamento`)**:
  - Tela por congregação com navegação de mês/anterior-próximo; status ABERTO/FECHADO, receita, despesa e saldo.
  - Ação **Fechar mês**: calcula receita/despesa/saldo a partir da `CashEntry` do período, grava `FinancialClosing` (upsert) e **bloqueia novos lançamentos** nesse mês (`assertLedgerPeriodOpen` nas ações create/update/delete e baixa/cancelamento). RBAC `fechamento.fechar`.
  - Ação **Reabrir** (RBAC `fechamento.reabrir`) libera o período novamente.
- **Menu lateral**: Fornecedores, Entradas, Saídas, Livro Caixa e Fechamento com ícones próprios (`Truck`, `TrendingUp`, `TrendingDown`, `BookText`, `Lock`), filtrados por permissão.

### Arquivos criados/alterados
| Arquivo | Papel |
| --- | --- |
| `src/modules/registration/definitions.ts` | Recursos `fornecedores`, `entradas`, `saidas` (+ `actions` e `status` readonly) e opções de tipo de chave PIX |
| `src/services/registration.service.ts` | Modelos `supplier`/`income`/`expense`, ledger unificado (create/update/delete transacionais), `shouldPostLedger`, `assertLedgerPeriodOpen`, geração de código máximo+1 |
| `src/services/actions.service.ts` | Ações de linha `saidas.baixar` e `saidas.cancelar` com auditoria |
| `src/modules/registration/validators.ts` | Validação valor > 0 e formatação R$ para entradas/saídas |
| `src/app/actions/registration.ts` | Rotas standalone de fornecedores/entradas/saídas |
| `src/app/actions/financial.ts` | Ações de servidor `closePeriod`/`reopenPeriod` (cálculo de totais + upsert) |
| `src/components/livro-caixa-client.tsx` | Extrato com filtro de mês, saldo corrido e totais |
| `src/components/fechamento-manager.tsx` | Tabela de fechamento com ações Fechar/Reabrir |
| `src/app/api/livro-caixa/export/route.ts` | Exportação CSV do livro caixa (RBAC `livroCaixa.export`) |
| `src/app/(app)/fornecedores|entradas|saidas|livro-caixa|fechamento/page.tsx` | Páginas standalone dos novos módulos |
| `src/app/(app)/layout.tsx`, `src/components/app-shell.tsx` | Novos itens de menu e ícones |

### Verificações e testes
- `npm run typecheck` ✔ · `npm run lint` ✔ · `npm run build` ✔ — novas rotas `/fornecedores`, `/entradas`, `/saidas`, `/livro-caixa`, `/fechamento` e `/api/livro-caixa/export` compiladas.
- **Teste de integração (banco remoto, via `tsx`)** — 11/11 passaram:
  1. Criar fornecedor ✔ (com exclusão limpa)
  2. Criar entrada → `CashEntry` ENTRADA com `sourceId` ✔
  3. Editar entrada → 1 lançamento (sem duplicar) e valor sincronizado ✔
  4. Criar saída pendente → sem lançamento em caixa ✔
  5. Editar saída pendente → continua sem lançamento ✔
  6. Baixar saída → status PAGO + `CashEntry` SAIDA criada ✔
  7. Lançar em mês aberto → permitido ✔
  8. Mês fechado → **bloqueia** novo lançamento ✔
  9. Excluir saída PAGO → **bloqueado** ✔

### Problemas encontrados e correções
- **Lançamento sem `sourceId`**: `ledgerFromRow` não preenchia `sourceId`, deixando `CashEntry` órfã (quebra a sincronização ao editar). Corrigido incluindo `sourceId: row.id`.
- **Colisão de código sequencial**: geração usava `count+1`, que colide quando há lacunas entre códigos existentes. Substituída por `máximo+1` (agregação `_max(code)`), respeitando `@@unique([congregationId, code])`.

## Próximos passos
- Relatórios (PDF/Excel/CSV), dashboards financeiros, usuários/permissões, auditoria, configurações/backup e deploy na Vercel.