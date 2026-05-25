# GymMatch

GymMatch é um app de conexões para pessoas que frequentam academia — um "Tinder de academia" para encontrar parceiros de treino, amizades e muito mais. Projeto de TCC para ADS.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | TanStack Start v1 (SSR + React 19) |
| Backend / DB | Supabase (Auth, PostgreSQL, Realtime, Storage) |
| Estilos | Tailwind CSS v4 + tw-animate-css |
| IA (Lucia) | Groq API — Llama 3.1 8B Instant |
| Package manager | Bun |
| Linguagem | TypeScript |

## Funcionalidades implementadas

- **Auth** — cadastro, login e sessão via Supabase Auth
- **Onboarding** — preenchimento de perfil, foto e academia antes de entrar no app
- **Descobrir** — swipe em perfis da mesma academia com curtida/rejeição
- **Matches** — match automático quando dois usuários se curtem mutuamente
- **Chat** — mensagens em tempo real via Supabase Realtime; envio de imagens (Gold/Diamond)
- **Planos** — Free, Gold (R$ 29,90/mês) e Diamond (R$ 59,90/mês) com restrições por plano
- **Segurança** — bloquear e denunciar usuários direto pelo chat
- **Painel admin** — gestão de usuários, academias, anúncios e denúncias
- **Lucia** — assistente virtual com IA (Groq) que responde perguntas sobre o app
  - Timer de inatividade: avisa após 10 min, reseta após mais 3 min
  - Notificação in-app animada quando o usuário está em outra tela
  - Notificação nativa do sistema operacional via Web Push API + Service Worker
  - Badge de não-lidos na tela de matches

## Pré-requisitos

- [Bun](https://bun.sh) 1.x
- Conta no [Supabase](https://supabase.com) com projeto criado
- Chave da [Groq API](https://console.groq.com/keys) (gratuita)

## Setup

### 1. Instalar dependências

```bash
bun install
```

### 2. Variáveis de ambiente

Crie um arquivo `.env` na raiz com:

```env
SUPABASE_URL="https://<seu-projeto>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<anon-key>"
VITE_SUPABASE_URL="https://<seu-projeto>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
VITE_SUPABASE_PROJECT_ID="<project-id>"

# Groq API — Lucia AI (gratuito em console.groq.com/keys)
GROQ_API_KEY="gsk_..."
VITE_GROQ_API_KEY="gsk_..."
```

### 3. Rodar em desenvolvimento

```bash
bun dev
```

App disponível em `http://localhost:3000`.

## Estrutura do projeto

```
src/
├── components/        # Componentes reutilizáveis (BottomNav, LuciaNotif, etc.)
├── hooks/             # useAuth e outros hooks
├── integrations/      # Cliente Supabase
├── lib/
│   ├── lucia.ts       # Lógica da assistente (localStorage, respostas, timer)
│   ├── lucia-ai.ts    # Server function para chamar a Groq API
│   └── push.ts        # Web Push / Service Worker utilities
└── routes/
    ├── _authenticated/
    │   ├── _app/      # Páginas com BottomNav (discover, matches, me, premium)
    │   ├── chat.$matchId.tsx   # Chat entre usuários
    │   └── chat.lucia.tsx      # Chat com a Lucia
    └── auth.tsx       # Login / cadastro
public/
└── sw.js              # Service Worker para notificações push
```

## Notificações push (Lucia)

O Service Worker em `public/sw.js` já está preparado para receber eventos push. O fluxo atual:

1. Usuário envia mensagem para a Lucia → app pede permissão de notificação
2. Após 10 min sem atividade → Lucia envia aviso; notificação nativa aparece mesmo com o app em background
3. Após mais 3 min → conversa reseta; badge de não-lidos permanece na tela de matches

Para notificações quando o browser está completamente fechado é necessário um servidor de push (VAPID + Supabase Edge Function) — a infraestrutura do SW já está pronta para essa integração.

## Planos

| Recurso | Free | Gold | Diamond |
|---|---|---|---|
| Likes por dia | 20 | Ilimitado | Ilimitado |
| Matches ativos | 5 | 20 | Ilimitado |
| Envio de imagens no chat | ✗ | ✓ | ✓ |
| Desfazer última ação | ✗ | ✓ | ✓ |
| Boost semanal de perfil | ✗ | ✗ | ✓ |
| Filtros avançados | ✗ | ✗ | ✓ |
| Badge exclusivo | ✗ | ✗ | ✓ |
| Preço | Grátis | R$ 29,90/mês | R$ 59,90/mês |

## Suporte

Dúvidas e contato: **suporte@gymmatch.app**
