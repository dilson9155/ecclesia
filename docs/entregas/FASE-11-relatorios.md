# Relatório de Entrega — Fase 11 (Ecclesia)

> Data: 15/09/2026 · Projeto: `ecclesia` · Stack: Next.js 16.3.4 / React 19 / TypeScript / Prisma 6.19.3 / Auth.js v5 / Recharts 3

## Fase 11 — Relatórios (PDF, Excel e CSV) e Dashboard

### Funcionalidades entregues
- **Centro de Relatórios (`/relatorios`)**: hub com acesso aos três relatórios, protegido por `relatorios.view`.
- **Mapa de Membros (`/relatorios/mapa-membros`)**:
  - Filtros por congregação e situação; listagem com código, nome, congregação, situação, sexo, estado civil, cidade, telefone e nascimento.
  - Cards de resumo por situação e gráfico de distribuição (pizza).
  - Exportação em **PDF, Excel (xlsx) e CSV** (`/api/relatorios/mapa-membros?fmt=...`).
- **Relatório Financeiro (`/relatorios/financeiro`)**:
  - Filtros período (de/até) e congregação; cards de entradas, saídas e saldo; gráfico de **fluxo mensal** (barras) e tabela de **movimentação por conta** (receita/despesa) com total.
  - Exportações **PDF/Excel/CSV** (`/api/relatorios/financeiro?fmt=...`).
- **Contribuições (`/relatorios/contribuicoes`)**:
  - Filtros período, tipo (dízimos/ofertas/ambos) e congregação; resumo de dízimos, ofertas e total; tabela de **total por contribuinte** e detalhe de lançamentos.
  - Exportações **PDF/Excel/CSV** (`/api/relatorios/contribuicoes?fmt=...`).
- **Exportação consistente**: cada rota atende simultaneamente `fmt=pdf|xlsx|csv`; CSV com BOM UTF-8 e separador `;` (Excel BR); Excel via `xlsx`; PDF via `@react-pdf/renderer` com componente compartilhado (`ReportHeader`, `PdfSummary`, `PdfTable`, `ReportFooter`) e cabeçalho/rodapé com dados da igreja.
- **Auditoria**: cada exportação registra `AuditAction.EXPORT` no módulo `relatorios`.
- **Dashboard (`/dashboard`)** upgrade:
  - Cards: congregações, membros, saídas pendentes e **contribuições do mês** (dízimos + ofertas).
  - Gráfico de **fluxo de caixa dos últimos 6 meses** (Recharts, barras) e **membros por situação** (pizza com legenda).
  - Painel de **resultado do mês** (entradas/saídas/saldo de caixa) e atalhos rápidos (membros, dízimos, livro caixa, relatórios, fechamento).
- **Menu lateral**: item **Relatórios** (ícone `FileText`) filtrado por `relatorios.view`.

### Arquivos criados/alterados
| Arquivo | Papel |
| --- | --- |
| `src/services/reports.service.ts` | Queries dos 3 relatórios, contexto da igreja, builders CSV/sheet e rótulos (`kindLabel`) |
| `src/components/reports/report-pdf.tsx` | Layout PDF compartilhado (cabeçalho, resumo, tabela, rodapé) |
| `src/components/reports/charts.tsx` | Gráficos Recharts reutilizáveis (barras mensais e pizza) |
| `src/app/(app)/relatorios/page.tsx` | Hub de relatórios |
| `src/app/(app)/relatorios/mapa-membros\|financeiro\|contribuicoes/page.tsx` | Páginas dos relatórios com filtros, resumos, tabelas e botões de exportação |
| `src/app/api/relatorios/{mapa-membros,financeiro,contribuicoes}/route.tsx` | Rotas de exportação PDF/XLSX/CSV com RBAC `relatorios.export` e auditoria |
| `src/app/(app)/dashboard/page.tsx` | Dashboard com indicadores e gráficos |
| `src/app/(app)/layout.tsx` | Item Relatórios no menu |
| `src/lib/format.ts` | Helper `formatDate` (pt-BR) |

### Verificações e testes
- `npm run typecheck` ✔ · `npm run lint` ✔ · `npm run build` ✔ — novas rotas `/relatorios*` e `/api/relatorios/*` compiladas.
- **Testes de dados (banco remoto, via `tsx`)** — 9/9 passaram: consistência dos totais financeiros (saldo = entradas − saídas), soma mensal = saldo do período, totais de contribuições (dízimo + oferta = total) e geração válida dos 3 CSVs (BOM + separador `;`).
- Componentes PDF validados pelo pattern já existente (cartas/carteirinhas usam `@react-pdf/renderer` da mesma forma); execução direta via `tsx`/`esbuild` fora do Next falha em resolução de assets do fontkit (limitação do tooling, não do código).

### Notas
- Período padrão dos relatórios financeiro e contribuições: mês corrente.
- Permissões `relatorios.view`/`relatorios.export` já existiam no seed (sem alteração de schema).

## Próximos passos
- Usuários/permissões (gestão de usuários e roles), auditoria, configurações/backup e deploy na Vercel.