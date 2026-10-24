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
| `NEXT_PUBLIC_APP_URL` | sim | URL pública da aplicação (usada nos links de recuperação) |
| `RESEND_API_KEY` | não | API key do Resend para envio dos e-mails de recuperação |
| `EMAIL_FROM` | não | Remetente verificado, ex.: `Ecclesia <no-reply@seudominio.com>` |
| `EMAIL_LOGO_URL` | não | URL pública do logo no e-mail. Se vazio, usa `NEXT_PUBLIC_APP_URL` + `/brand/ecclesia-email-logo.png` |
| `PASSWORD_RESET_DEV_LINK` | não | `true` exibe o link de redefinição na tela em ambiente local. Nunca usar em produção |
| `SEED_ADMIN_EMAIL` | não | E-mail do admin do seed |
| `SEED_ADMIN_PASSWORD` | não | Senha do admin do seed |
| `SEED_PLATFORM_ADMIN_EMAIL` | não | E-mail do Super Admin da plataforma (padrão em dev: `plataforma@ecclesia.com.br`) |
| `SEED_PLATFORM_ADMIN_PASSWORD` | não | Senha do Super Admin da plataforma (padrão em dev: `Plataforma@123`; obrigatória em produção) |

Nunca versione valores reais. Copie `.env.example` para `.env` localmente e configure as variáveis no painel da Vercel em produção.

## Painel da plataforma (Super Admin)

O Super Admin do SaaS é um usuário com `isPlatformAdmin = true` e **sem vínculo com igreja**. Ele acessa `/super-admin` e gerencia:

- **Visão geral**: total de igrejas, MRR, membros gerenciados e igrejas recentes.
- **Igrejas**: cadastro, edição, ativação/inativação e assinatura.
- **Planos**: valores mensais, faixas de membros e disponibilidade de cada plano.

No cadastro de uma igreja, informe:

1. **Estrutura**: `Somente sede` ou `Sede + congregações`.
2. **Membros da sede** e **membros das congregações** (somados automaticamente).

O sistema calcula o total de membros e sugere o plano compatível com a estrutura e a faixa de membros. O valor pode ser ajustado em **Planos**. Igrejas com plano `Somente sede` não conseguem cadastrar congregações adicionais na área da igreja.

O seed cria o Super Admin da plataforma e os 14 planos padrão (7 faixas para sede única e 7 para sede + congregações). Execute `npm run db:seed` para semear. Em produção, defina `SEED_PLATFORM_ADMIN_EMAIL` e `SEED_PLATFORM_ADMIN_PASSWORD` antes de rodar o seed; sem a senha, o Super Admin não é criado.

## Recuperação de senha

A recuperação é feita em duas telas públicas:

1. `/recuperar-senha`: o usuário informa o e-mail.
2. `/redefinir-senha?token=...`: o usuário cria a nova senha.

Regras de segurança:

- Token aleatório de 32 bytes, armazenado apenas como hash SHA-256.
- Expiração de **30 minutos**.
- **Uso único** (validação atômica no banco).
- Novos pedidos invalidam links anteriores ainda não usados.
- Limite de 3 pedidos por usuário e 10 por IP a cada 15 minutos.
- Resposta genérica, sem revelar se o e-mail existe.
- Senha nova com no mínimo 8 caracteres, contendo letras e números.
- Registro de auditoria ao concluir a redefinição.

O envio real usa o [Resend](https://resend.com). Configure `RESEND_API_KEY` e `EMAIL_FROM` (com domínio verificado). Sem a API key, o link é gravado no console do servidor. Em ambiente local, defina `PASSWORD_RESET_DEV_LINK=true` para também exibir o link diretamente na tela.

## Deploy na Vercel

1. Envie o código para um repositório no GitHub.
2. Importe o repositório na [Vercel](https://vercel.com/new).
3. Configure as variáveis de ambiente (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY` e `EMAIL_FROM`) no painel.
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