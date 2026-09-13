# Ecclesia — Gestão de Igrejas

Sistema profissional de gestão administrativa e financeira para igrejas: **membros, congregações, dízimos, ofertas, contabilidade gerencial, relatórios e auditoria**.

Aplicação **web** (navegador — computador, notebook, tablet e celular), hospedada na **Vercel**, com banco **PostgreSQL** em nuvem. Sem Electron, sem armazenamento local.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 · Tailwind CSS v4 · shadcn/ui · lucide-react |
| Forms | React Hook Form + Zod |
| Banco | PostgreSQL + Prisma ORM |
| Autenticação | NextAuth v5 (Auth.js) + bcryptjs |
| Gráficos | Recharts |
| Relatórios | PDF (@react-pdf/renderer) · Excel (xlsx) · CSV (papaparse) |
| Testes | Vitest |

## Começando

```bash
# 1. instalar dependências
npm install

# 2. configurar variáveis de ambiente
cp .env.example .env
#    edite o .env com DATABASE_URL, AUTH_SECRET e NEXT_PUBLIC_APP_URL

# 3. criar o banco
npx prisma migrate dev        # aplica migrations e gera o Prisma Client

# 4. seed (usuário administrador inicial + dados de demonstração)
npm run db:seed

# 5. rodar em desenvolvimento
npm run dev                   # http://localhost:3000
```

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Inicia build de produção |
| `npm run lint` | Lint (ESLint) |
| `npm run typecheck` | Verificação de tipos (TypeScript) |
| `npm test` | Testes (Vitest) |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` | Cria migração (dev) |
| `npm run prisma:deploy` | Aplica migrations (produção) |
| `npm run prisma:studio` | Abre o Prisma Studio |
| `npm run db:seed` | Semeia o banco |

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | URL do PostgreSQL (ex.: Neon/Supabase) |
| `AUTH_SECRET` | sim | Segredo de autenticação (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | sim | URL pública da aplicação |
| `SEED_ADMIN_EMAIL` | não | E-mail do admin do seed |
| `SEED_ADMIN_PASSWORD` | não | Senha do admin do seed |

Nunca versione valores reais. Copie `.env.example` para `.env` localmente e configure as variáveis no painel da Vercel em produção.

## Deploy na Vercel

1. Envie o código para um repositório no GitHub.
2. Importe o repositório na [Vercel](https://vercel.com/new).
3. Configure as variáveis de ambiente (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`) no painel.
4. Ajuste o comando de build, se necessário:

```bash
prisma generate && next build
```

E aplique as migrations no ambiente de produção:

```bash
npx prisma migrate deploy
```

## Estrutura

```
src/
├── app/            # Rotas (App Router)
│   ├── (app)/      # Área autenticada (dashboard, membros, financeiro...)
│   ├── login/      # Autenticação
│   └── api/        # API routes
├── components/     # Componentes (ui = shadcn/ui; business = domínio)
├── lib/            # infraestrutura (prisma, auth, rbac, formatadores)
├── modules/        # Lógica de domínio pura (testável)
├── services/       # Camada de dados/regras Prisma
└── types/          # Tipos globais

prisma/
├── schema.prisma   # Modelos do banco
├── migrations/     # Migrations versionadas
└── seed.ts         # Seed admin + demo
```

## Segurança

- Autenticação com Auth.js + `bcryptjs`
- RBAC: papéis + permissões granulares verificadas **no servidor** (Server Actions e páginas)
- Escopo por congregação em todas as consultas
- Validação de entradas com Zod
- Auditoria de operações sensíveis (principalmente financeiras)
- Saldo financeiro calculado, nunca armazenado

## Licença

Projeto privado. Uso autorizado pelo detentor do repositório.