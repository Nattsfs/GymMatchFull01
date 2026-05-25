# GymMatch

GymMatch e um projeto academico de TCC para ADS com a proposta de ser um "Tinder de academia": um produto para conectar alunos da mesma academia ou unidade, facilitar amizades, parceiros de treino, objetivos em comum e possiveis interesses romanticos.

Este repositorio nao contem o produto final completo. Ele contem o que foi efetivamente implementado ate aqui, com foco maior em backend/API e em um painel administrativo web inicial. O app mobile ainda nao foi iniciado.

Para o material de apresentacao e para uma visao detalhada do que foi entregue, leia tambem `docs/tcc/apresentation.md`.

## Estado atual do projeto

- `backend/`: a parte mais avancada do repositorio. Ja possui autenticacao, cadastro vinculado a unidade, perfis, descoberta, curtidas, recusas, matches, chat, bloqueios, denuncias, metricas e rotas administrativas.
- `admin/`: painel administrativo em Next.js com login real via API, dashboard de metricas, listagem de usuarios e tela de detalhe de usuario.
- `mobile/`: placeholder. Existe apenas um `package.json` minimo para reservar o workspace.
- `docs/`: documentacao de apoio, incluindo modelagem do banco e o guia de apresentacao.

## Estrutura do repositorio

```txt
/
|- admin/
|- backend/
|  |- prisma/
|  |- src/
|- docs/
|  |- database/
|  |- tcc/
|- mobile/
|- .env.example
|- AGENTS.md
|- package.json
|- pnpm-workspace.yaml
`- README.md
```

## Stack usada ate aqui

- Monorepo com `pnpm` workspaces
- TypeScript
- Fastify no backend
- Prisma + PostgreSQL
- JWT para autenticacao
- Vitest para testes
- Next.js App Router no painel admin

## Pre-requisitos

Antes de tentar rodar em outra maquina, garanta:

- Node.js 20 ou superior
- `pnpm` 10.13.1 ou compativel
- PostgreSQL em execucao
- duas abas de terminal, uma para a API e outra para o painel admin

## Setup em outra maquina

### 1. Instalar dependencias

Na raiz do repositorio:

```bash
pnpm install
```

### 2. Configurar variaveis de ambiente da API

O backend le o arquivo `.env` da raiz do repositorio.

```bash
cp .env.example .env
```

Preencha pelo menos estas variaveis:

```bash
NODE_ENV=development
APP_NAME=GymMatch API
API_PORT=3000
API_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=replace-with-a-long-random-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=7d
PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES=30
ADMIN_WEB_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
LOG_LEVEL=info
```

Observacoes importantes:

- o backend nao usa `backend/.env`;
- `EMAIL_*`, `SMS_*`, `STORAGE_*` e `STRIPE_*` existem apenas como preparacao para fases futuras;
- nao versione segredos reais no repositorio.

### 3. Configurar variaveis do painel admin

O painel admin pode usar `admin/.env.local`. O exemplo atual ja existe em `admin/.env.example`.

```bash
cp admin/.env.example admin/.env.local
```

Conteudo minimo:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### 4. Criar o banco e aplicar migrations

Depois de ajustar `DATABASE_URL`, aplique as migrations existentes:

```bash
pnpm --filter @gymmatch/backend db:deploy
pnpm --filter @gymmatch/backend db:generate
```

Se quiser validar o schema antes:

```bash
pnpm --filter @gymmatch/backend db:validate
```

### 5. Subir o backend

```bash
pnpm dev:backend
```

Atalho equivalente:

```bash
pnpm --filter @gymmatch/backend dev
```

API local padrao:

- `http://localhost:3000`
- health check: `http://localhost:3000/health`

### 6. Subir o painel admin

Em outro terminal:

```bash
pnpm dev:admin
```

Atalho equivalente:

```bash
pnpm --filter @gymmatch/admin dev
```

Painel admin local padrao:

- `http://localhost:3001`
- login: `http://localhost:3001/login`

## Verificacao rapida depois do setup

### API

Com a API rodando:

```bash
curl http://localhost:3000/health
```

O retorno esperado deve conter algo como:

- `status`
- `service`
- `environment`
- `timestamp`
- `uptime`

### Painel admin

Se o backend estiver no ar e `NEXT_PUBLIC_API_BASE_URL` estiver correto, a pagina `/login` do admin deve abrir normalmente. O login so funciona com um usuario cuja `role` seja `ADMIN`.

## Bootstrap minimo para demonstracao

Hoje o projeto nao possui seed automatica e o cadastro publico bloqueia criacao de `ADMIN`. Por isso, em ambiente novo, a conta administrativa precisa ser preparada manualmente.

### 1. Criar uma conta `ADMIN` manualmente

Gere um hash bcrypt para a senha temporaria do admin:

```bash
pnpm --filter @gymmatch/backend exec node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('Admin123!', 8).then((hash)=>console.log(hash));"
```

Se voce quiser um valor de referencia para testes locais, um hash valido para a senha `Admin123!` e:

```txt
$2b$08$mKL.a.asYSdoETDKiQnc/ONQG9XcAUc3uKr4znGNk8KMIAwgcQcWe
```

Abra o Prisma Studio:

```bash
pnpm --filter @gymmatch/backend db:studio
```

Crie manualmente um registro na tabela `User` com:

- `name`: `Administrador Demo`
- `email`: um e-mail unico, por exemplo `admin@example.com`
- `phone`: um telefone unico, por exemplo `5511990000001`
- `cpf`: um CPF unico
- `passwordHash`: o hash gerado acima
- `role`: `ADMIN`
- `status`: `ACTIVE`
- `gymId`: vazio
- `gymUnitId`: vazio
- `deletedAt`: vazio

Campos opcionais como `emailVerifiedAt`, `phoneVerifiedAt` e `termsAcceptedAt` podem ficar vazios ou ser preenchidos com a data atual.

### 2. Fazer login como admin

Opcao 1, pela interface web:

- abra `http://localhost:3001/login`
- use o e-mail e a senha do admin criado manualmente

Opcao 2, pela API:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "content-type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }'
```

Guarde o `accessToken` retornado. Ele sera usado nos exemplos abaixo como `ADMIN_TOKEN`.

### 3. Criar uma academia e uma unidade

Crie a academia:

```bash
curl -X POST http://localhost:3000/admin/gyms \
  -H "authorization: Bearer ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "GymMatch Demo",
    "legalName": "GymMatch Demo Academia Ltda",
    "document": "12345678000199",
    "email": "contato@gymmatch.demo",
    "phone": "5511991111111"
  }'
```

Guarde o `id` da academia como `GYM_ID`.

Crie a unidade:

```bash
curl -X POST http://localhost:3000/admin/gym-units \
  -H "authorization: Bearer ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "gymId": "GYM_ID",
    "name": "Unidade Centro",
    "addressLine": "Rua Exemplo",
    "number": "100",
    "neighborhood": "Centro",
    "city": "Sao Paulo",
    "state": "SP",
    "zipCode": "01001000"
  }'
```

Guarde o `qrCodeToken` retornado. Ele sera usado no cadastro dos alunos.

Se quiser validar o token publicamente:

```bash
curl http://localhost:3000/public/gym-units/qr/QR_CODE_TOKEN
```

### 4. Cadastrar alunos

O cadastro publico ja esta implementado, mas sempre exige um `qrCodeToken` valido de uma unidade ativa.

Aluno A:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "content-type: application/json" \
  -d '{
    "name": "Aluno A",
    "email": "aluno-a@example.com",
    "cpf": "12345678909",
    "phone": "5511991000001",
    "password": "Aluno123",
    "qrCodeToken": "QR_CODE_TOKEN"
  }'
```

Aluno B:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "content-type: application/json" \
  -d '{
    "name": "Aluno B",
    "email": "aluno-b@example.com",
    "cpf": "11144477735",
    "phone": "5511991000002",
    "password": "Aluno123",
    "qrCodeToken": "QR_CODE_TOKEN"
  }'
```

### 5. Obter tokens dos alunos

Faca login com cada aluno:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "content-type: application/json" \
  -d '{
    "email": "aluno-a@example.com",
    "password": "Aluno123"
  }'
```

Repita para o segundo aluno e guarde os tokens como `STUDENT_A_TOKEN` e `STUDENT_B_TOKEN`.

### 6. Criar perfis completos

Sem perfil completo e sem foto, o aluno nao entra em descoberta e nao consegue chegar a match.

Exemplo de criacao de perfil:

```bash
curl -X POST http://localhost:3000/profiles/me \
  -H "authorization: Bearer STUDENT_A_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "birthDate": "1998-05-10",
    "gender": "MAN",
    "sexualOrientation": "STRAIGHT",
    "appGoal": "TRAINING_PARTNER",
    "trainingLevel": "INTERMEDIATE",
    "availablePeriods": ["MORNING", "EVENING"],
    "preferredModalities": ["BODYBUILDING", "CARDIO"],
    "workoutSplit": "ABC",
    "bio": "Procuro parceiro de treino para hipertrofia.",
    "showSexualOrientation": false,
    "showAvailablePeriods": true
  }'
```

Repita para o segundo aluno, trocando os dados necessarios.

### 7. Enviar foto de perfil

O endpoint espera `multipart/form-data` com o campo `photo`.

```bash
curl -X POST http://localhost:3000/profiles/me/photo \
  -H "authorization: Bearer STUDENT_A_TOKEN" \
  -F "photo=@/caminho/para/foto-a.jpg"
```

Repita para o segundo aluno.

Observacoes:

- tipos aceitos: JPG, JPEG, PNG e WEBP
- limite atual: 5 MB
- o arquivo e salvo localmente em `tmp/storage`
- o backend retorna URLs do tipo `/storage/...`, mas a exposicao publica desses arquivos ainda nao esta pronta

### 8. Gerar descoberta, likes, match e chat

Descoberta:

```bash
curl http://localhost:3000/discovery/profiles \
  -H "authorization: Bearer STUDENT_A_TOKEN"
```

Like do aluno A no aluno B:

```bash
curl -X POST http://localhost:3000/likes \
  -H "authorization: Bearer STUDENT_A_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "likedUserId": "ID_DO_ALUNO_B"
  }'
```

Like de volta, para gerar match:

```bash
curl -X POST http://localhost:3000/likes \
  -H "authorization: Bearer STUDENT_B_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "likedUserId": "ID_DO_ALUNO_A"
  }'
```

Listar matches:

```bash
curl http://localhost:3000/matches/me \
  -H "authorization: Bearer STUDENT_A_TOKEN"
```

Enviar mensagem de texto:

```bash
curl -X POST http://localhost:3000/chat/conversations/CONVERSATION_ID/messages \
  -H "authorization: Bearer STUDENT_A_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "content": "Ola, vamos treinar amanha?"
  }'
```

Listar mensagens da conversa:

```bash
curl "http://localhost:3000/chat/conversations/CONVERSATION_ID/messages?page=1&limit=20" \
  -H "authorization: Bearer STUDENT_A_TOKEN"
```

WebSocket de chat em tempo real:

- endpoint: `/chat/ws`
- autenticacao por header `Authorization: Bearer ...` ou por query `?token=...`
- evento publicado hoje: `message.created`

### 9. Gerar recusa, bloqueio e denuncia

Recusa:

```bash
curl -X POST http://localhost:3000/rejections \
  -H "authorization: Bearer STUDENT_A_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "rejectedUserId": "ID_DO_ALUNO_B"
  }'
```

Bloqueio:

```bash
curl -X POST http://localhost:3000/blocks \
  -H "authorization: Bearer STUDENT_A_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "blockedUserId": "ID_DO_ALUNO_B"
  }'
```

Denuncia de usuario:

```bash
curl -X POST http://localhost:3000/reports/users \
  -H "authorization: Bearer STUDENT_A_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "reportedUserId": "ID_DO_ALUNO_B",
    "reason": "INAPPROPRIATE_BEHAVIOR",
    "description": "Comportamento inadequado durante a conversa."
  }'
```

Depois disso, o admin pode consultar:

- `GET /admin/reports`
- `GET /admin/reports/:id`
- `PATCH /admin/reports/:id/status`
- `PATCH /admin/reports/:id/urgency`
- `POST /admin/reports/:id/suspend-reported-user`
- `POST /admin/reports/:id/ban-reported-user`

## Scripts uteis

### Raiz

```bash
pnpm dev:backend
pnpm dev:admin
pnpm lint
pnpm typecheck
pnpm test
pnpm test:admin
pnpm build
pnpm build:admin
pnpm format:check
```

Observacoes:

- `pnpm test` roda os testes do backend
- `pnpm test:admin` roda os testes do painel admin
- `pnpm build` cobre typecheck raiz + build do backend
- `pnpm build:admin` deve ser executado separadamente

### Backend

```bash
pnpm --filter @gymmatch/backend dev
pnpm --filter @gymmatch/backend build
pnpm --filter @gymmatch/backend start
pnpm --filter @gymmatch/backend test
pnpm --filter @gymmatch/backend db:generate
pnpm --filter @gymmatch/backend db:deploy
pnpm --filter @gymmatch/backend db:migrate
pnpm --filter @gymmatch/backend db:studio
pnpm --filter @gymmatch/backend db:reset
pnpm --filter @gymmatch/backend db:validate
```

### Admin

```bash
pnpm --filter @gymmatch/admin dev
pnpm --filter @gymmatch/admin build
pnpm --filter @gymmatch/admin start
pnpm --filter @gymmatch/admin lint
pnpm --filter @gymmatch/admin typecheck
pnpm --filter @gymmatch/admin test
```

## O que ja foi implementado

Resumo rapido do que existe hoje:

- autenticacao com `register`, `login`, `refresh`, `logout`, `me` e recuperacao de senha
- cadastro de aluno vinculado a unidade por `qrCodeToken`
- modelos de `Gym` e `GymUnit` com CRUD administrativo por API
- perfil de aluno com regra de completude, foto e visibilidade de campos
- descoberta de perfis da mesma unidade, filtrando self, inativos, soft deleted, bloqueios e recusas
- curtidas com limite diario do plano gratis e geracao automatica de match por curtida mutua
- matches com conversa criada automaticamente
- chat com texto, audio, listagem, delecao logica e base de WebSocket
- bloqueios com impacto em match
- denuncias de usuario e mensagem, com acoes administrativas de moderacao
- metricas administrativas basicas
- painel admin com login, dashboard, listagem e detalhe de usuarios
- cobertura de testes em backend e parte das libs do painel admin

## O que esta parcial ou ainda nao existe

- `mobile/` ainda nao foi iniciado
- nao existe seed automatica de demonstracao
- nao existe criacao publica de conta `ADMIN`
- o painel admin ainda nao possui telas para gyms, units e reports; essas operacoes existem na API
- verificacao real de e-mail e SMS nao foi integrada
- `MailService` faz envio simulado por log
- o sistema de premium existe apenas como stub; envio de imagem no chat continua bloqueado
- os arquivos de foto/audio/imagem sao gravados localmente, mas a exposicao publica em `/storage/...` ainda nao foi concluida
- pagamentos, storage externo, analytics avancado, auditoria persistida e app mobile ficaram para fases futuras

## Troubleshooting rapido

### `Invalid environment configuration`

Revise o `.env` da raiz. Os campos obrigatorios de autenticacao e banco precisam estar preenchidos.

### `Public registration for ADMIN users is not allowed`

Esse comportamento e esperado. Conta admin precisa ser criada manualmente via banco/Prisma Studio.

### O login do painel admin falha mesmo com usuario existente

Revise:

- se o backend esta rodando
- se `NEXT_PUBLIC_API_BASE_URL` aponta para a API correta
- se o usuario tem `role = ADMIN`
- se o usuario nao esta `SUSPENDED`, `BANNED`, `DELETED` ou com `deletedAt` preenchido

### A descoberta volta vazia

Confira se existem pelo menos dois alunos:

- na mesma `GymUnit`
- com `status = ACTIVE`
- sem `deletedAt`
- com perfil completo
- com `profilePhotoUrl` preenchido
- sem bloqueio ou recusa entre eles

### O chat com imagem retorna `403`

Esse comportamento tambem e esperado no estado atual. O endpoint existe, mas o stub de premium ainda retorna `false` para todo mundo.

### O reset de senha nao envia e-mail real

Tambem esperado. Em `development` e `test`, o backend registra `previewUrl` e `previewToken` no log para facilitar o teste manual.

## Material de apoio para a apresentacao

Se a documentacao estiver sendo usada por outra pessoa para apresentar o TCC, a leitura recomendada e:

1. este `README.md` para setup e execucao
2. `docs/tcc/apresentation.md` para entender o que foi entregue, o que demonstrar e quais limitacoes precisam ser explicadas com honestidade
