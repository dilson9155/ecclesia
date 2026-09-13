# Relatório de Entrega — Fase 8 (Ecclesia)

> Data: 13/09/2026 · Projeto: `ecclesia` · Stack: Next.js 16.3.4 / React 19 / TypeScript / Prisma 6.19.3 / Auth.js v5 / @react-pdf/renderer 4.9 / qrcode 1.5

## Fase 8 — Carteirinhas de Membros e Cartas/Declarações

### Funcionalidades entregues
- **Carteirinha de membro (PDF)**:
  - Emissão por membro com **matrícula sequencial** por igreja (`000001`...), **QR Code único** (token aleatório), validade de 2 anos, status `ATIVO`/`CANCELADO` e congregação derivada do membro.
  - PDF pronto para impressão (A5 paisagem, frente e verso): identificação, matrícula, congregação, datas, QR verificável e avisos; auditoria `CREATE` + `PRINT`.
  - Cancelamento com confirmação e auditoria `CANCEL`.
  - Página `/carteirinhas` com emissão (seletor de membro), cancelamento e download do PDF; guarda de autorização no endpoint `/api/cards/[id]/pdf` (`carteirinhas.view`).
- **Cartas e declarações (PDF)**:
  - **7 modelos padrão** semeados por igreja (`LetterTemplate`): Declaração de Membro, Vínculo, Batismo, Transferência, Recomendação, Apresentação e Personalizado.
  - Geração de documento com **protocolo sequencial** (`DOC-AAAAMM-0001`), membro opcional (preenche automaticamente nome, matrícula, congregação, cidade/UF, datas de batismo/admissão), conteúdo com **placeholders** (`{nome}`, `{matricula}`, `{igreja}`, `{cnpj}`, `{data}` etc.), assinatura e título editáveis.
  - PDF A4 com cabeçalho da igreja (nome/CNPJ/contato), protocolo, corpo, data de emissão, linha de assinatura e rodapé; página `/cartas` com listagem, criação e exclusão; guarda em `/api/documents/[id]/pdf` (`cartas.view`).
- **RBAC**: emissão/cancelamento e criação/exclusão por permissões já semeadas (`carteirinhas.view/emit/delete`, `cartas.view/create/delete`).

### Arquivos criados/alterados
| Arquivo | Papel |
| --- | --- |
| `prisma/seed.ts` | `LetterTemplate` padrão (7 tipos) por igreja (`seedTemplates`) |
| `src/services/cards.service.ts` | emitir/cancelar/listar carteirinhas + PDF (QR, matrícula, validade) |
| `src/app/actions/cards.ts` | `emitCard`, `cancelCardById` (RBAC + revalidação) |
| `src/app/api/cards/[id]/pdf/route.tsx` | PDF da carteirinha (react-pdf + qrcode) |
| `src/components/carteirinhas/carteirinhas-manager.tsx` | UI de carteirinhas |
| `src/app/(app)/carteirinhas/page.tsx` | Página `/carteirinhas` |
| `src/services/documents.service.ts` | modelos, contexto de placeholders, geração com protocolo,listagem/exclusão |
| `src/app/actions/documents.ts` | `newLetter`, `removeLetter` (RBAC) |
| `src/app/api/documents/[id]/pdf/route.tsx` | PDF A4 do documento |
| `src/components/cartas/cartas-manager.tsx` | UI de cartas (nova carta, placeholders) |
| `src/app/(app)/cartas/page.tsx` | Página `/cartas` |
| `src/app/(app)/layout.tsx` + `src/components/app-shell.tsx` | Itens "Carteirinhas" e "Cartas" no menu |

### Verificações e testes
- `npm run typecheck` ✔ · `npm run lint` ✔ · `npm run build` ✔ (2 novas rotas de API + 2 páginas; Proxy reconhecido).
- **Smoke E2E (server production, porta 3001):** login real → `/carteirinhas` e `/cartas` 200 com UI; criação de membro → carteirinha (`000001`) e documento (`DOC-202609-0001`); **PDFs válidos** (`%PDF`) com 5.784 e 2.726 bytes; **anônimos bloqueados** nas rotas de PDF (redirect); regressão de membros/visitantes/dashboard/estrutura OK; **sem resíduo** após limpeza.

### Problemas encontrados e correções
- **JSX em rota `.ts`**: `route.ts` com JSX do react-pdf não compila (TS1005). Solução: renomear para `route.tsx` (suportado pelo Next).
- **Conflito `Image`**: o nome `Image` colidia com o global `Image` do DOM (`lib.dom`). Solução: `import * as PDF from "@react-pdf/renderer"` e uso de `PDF.Document/Page/View/Text/Image`.
- **EADDRINUSE 3001**: subprocesso da Fase 7 ainda ouvia a porta; derrubado o processo órfão antes do novo smoke.

## Próximos passos
- Fase 9: **financeiro I** — plano de contas e centros de custo (CRUD), dízimos e ofertas com lançamento em caixa.
- Fase 10: **financeiro II** — entradas/saídas (caixa), fornecedores, fechamento mensal e livro caixa.
- Fases seguintes: relatórios (PDF/Excel/CSV), usuários/permissões, auditoria, configurações/backup e deploy na Vercel.