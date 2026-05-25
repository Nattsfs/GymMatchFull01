// Lucia: frontend-only assistant bot.
// All data is local; nothing hits the backend.

export const FEATURE_SWIPE_DEMO = true;

export const LUCIA_BOT = {
  id: "lucia-bot",
  isBot: true as const,
  name: "Lucia",
  initials: "Lú",
  tag: "assistente",
  status: "online agora",
  avatarBg: "#EEEDFE",
  avatarText: "#3C3489",
  borderColor: "#7F77DD",
};

export type LuciaMessage = {
  id: string;
  from: "lucia" | "user";
  content: string;
  created_at: number;
};

const HISTORY_KEY = "lucia_chat_history";
const WELCOMED_KEY = "lucia_welcomed";
const UNREAD_KEY = "lucia_unread";

export const WELCOME_MESSAGES = [
  "Olá! 👋 Eu sou a Lucia, assistente do GymMatch! Estou aqui para te ajudar com qualquer dúvida sobre o app.",
  "Pode me perguntar sobre matches, perfil, planos, segurança ou qualquer outra coisa. Use os atalhos abaixo ou escreva livremente!",
];

export const QUICK_REPLIES: { label: string; reply: string }[] = [
  { label: "Como dar match?", reply: null as unknown as string },
  { label: "Editar perfil", reply: null as unknown as string },
  { label: "Ver planos", reply: null as unknown as string },
  { label: "Segurança", reply: null as unknown as string },
  { label: "Denunciar alguém", reply: null as unknown as string },
  { label: "Falar com atendente", reply: null as unknown as string },
];

type ResponseRule = {
  keywords: string[];
  response: string;
};

const RESPONSE_RULES: ResponseRule[] = [
  {
    keywords: ["match", "like", "curtir", "curtida", "coração", "descobrir", "discover"],
    response: "Para dar match no GymMatch é simples! 💪\n\nVá na aba **Descobrir**, veja os perfis da sua academia e clique no coração para curtir. Quando a outra pessoa também te curtir, vocês fazem match e o chat é liberado automaticamente!\n\nNo plano Free você tem 20 likes por dia e até 5 matches ativos.",
  },
  {
    keywords: ["perfil", "foto", "editar", "nome", "bio", "informação", "atualizar"],
    response: "Para editar seu perfil, vá em **Perfil → Editar perfil**. 📝\n\nVocê pode atualizar foto, bio, modalidades de treino, objetivos e academias. Campos como CPF, email e telefone não podem ser alterados após o cadastro por segurança.",
  },
  {
    keywords: ["plano", "gold", "diamond", "premium", "assinar", "upgrade", "preço", "valor", "pagar"],
    response: "Temos 3 planos no GymMatch: 💎\n\n• **Free** — 20 likes/dia, 5 matches ativos\n• **Gold (R$ 29,90/mês)** — likes ilimitados, 20 matches, envio de fotos no chat\n• **Diamond (R$ 59,90/mês)** — tudo ilimitado, boost semanal de perfil, filtros avançados\n\nPara assinar, vá em **Perfil → Premium**.",
  },
  {
    keywords: ["bloquear", "block", "bloqueio"],
    response: "Para bloquear alguém, abra o chat com essa pessoa e toque no menu (⋮) no canto superior direito. Selecione **Bloquear**. 🚫\n\nApós bloqueado, a pessoa não aparecerá mais para você e não poderá te encontrar no Descobrir.",
  },
  {
    keywords: ["denunciar", "reportar", "assédio", "ofensa", "spam", "fake", "falso", "inadequado", "abuso"],
    response: "Para denunciar um usuário, abra o chat com ele e toque no menu (⋮) → **Denunciar**. 🚨\n\nEscolha o motivo (assédio, perfil falso, spam, etc). Nossa equipe analisa todas as denúncias em até 24h e toma as medidas necessárias.\n\nSe for urgente, escreva para **suporte@gymmatch.app**.",
  },
  {
    keywords: ["segurança", "seguro", "privacidade", "privado", "proteger", "encontro"],
    response: "Sua segurança é nossa prioridade! 🔒\n\n• Nunca compartilhe dados pessoais (endereço, CPF, banco) no chat\n• Combine primeiros encontros sempre em **locais públicos**\n• Você pode ocultar seus horários de treino e orientação sexual nas configurações de perfil\n• Bloqueie ou denuncie qualquer comportamento suspeito",
  },
  {
    keywords: ["academia", "gym", "trocar academia", "mudar academia", "adicionar academia"],
    response: "Para gerenciar suas academias, vá em **Perfil → Editar perfil → Minhas academias**. 🏋️\n\nVocê pode estar em múltiplas academias ao mesmo tempo! O Descobrir mostrará pessoas de todas as academias que você frequenta.",
  },
  {
    keywords: ["chat", "mensagem", "conversar", "falar", "imagem", "foto no chat", "áudio"],
    response: "O chat é liberado automaticamente após o match! 💬\n\n• **Texto e áudio** — disponível em todos os planos\n• **Envio de fotos** — disponível no Gold e Diamond\n\nSe o chat estiver bloqueado, pode ser que o match foi encerrado ou o limite do plano Free foi atingido.",
  },
  {
    keywords: ["qr", "qrcode", "código", "entrar na academia", "join"],
    response: "Para entrar em uma academia via QR Code, acesse o link de convite da academia ou escaneie o QR Code disponível na recepção. 📱\n\nSe tiver o código da academia, acesse: **gymmatch.app/join/[código]**",
  },
  {
    keywords: ["cancelar", "excluir conta", "deletar conta", "pausar", "desativar"],
    response: "Você pode **pausar** ou **excluir** sua conta em **Perfil → (botão Pausar ou Excluir conta)**. ⚠️\n\nAo pausar, seu perfil fica oculto mas você mantém seus matches. Ao excluir, todos os dados são removidos permanentemente.\n\nSe quiser cancelar uma assinatura, entre em contato: **suporte@gymmatch.app**.",
  },
  {
    keywords: ["atendente", "humano", "quero falar", "falar com", "suporte", "ajuda", "problema", "erro", "bug", "não funciona", "contato", "email"],
    response: "Claro! Vou te conectar com nossa equipe de suporte. 👥\n\nEnvie um email para suporte@gymmatch.app e nossa equipe responde em até 24 horas úteis.\n\nDescreva seu problema com detalhes (conta, dispositivo, o que aconteceu) para agilizarmos o atendimento!",
  },
];

const FALLBACK_RESPONSES = [
  "Hmm, não tenho uma resposta pronta para isso. 🤔 Tente usar um dos atalhos abaixo ou entre em contato com nossa equipe em **suporte@gymmatch.app**!",
  "Não entendi bem sua pergunta. 😅 Pode tentar de outra forma ou usar os atalhos abaixo? Se precisar de ajuda humana: **suporte@gymmatch.app**",
  "Essa é uma boa pergunta! Para te ajudar melhor, nossa equipe de suporte pode responder em detalhes. Escreva para **suporte@gymmatch.app** 💪",
];

export function getLuciaResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const rule of RESPONSE_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.response;
    }
  }
  const idx = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
  return FALLBACK_RESPONSES[idx];
}

export function getQuickReplyResponse(label: string): string {
  const map: Record<string, string> = {
    "🔥 Como dar match?": RESPONSE_RULES[0].response,
    "👤 Editar perfil": RESPONSE_RULES[1].response,
    "💎 Ver planos": RESPONSE_RULES[2].response,
    "🔒 Segurança": RESPONSE_RULES[5].response,
    "🚨 Denunciar alguém": RESPONSE_RULES[4].response,
    "💬 Falar com atendente": RESPONSE_RULES[10].response,
  };
  return map[label] ?? FALLBACK_RESPONSES[0];
}

function safeStorage(): Storage | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

export function getLuciaHistory(): LuciaMessage[] {
  const s = safeStorage();
  if (!s) return [];
  try { return JSON.parse(s.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
}

export function setLuciaHistory(msgs: LuciaMessage[]) {
  safeStorage()?.setItem(HISTORY_KEY, JSON.stringify(msgs));
}

export function hasWelcomed(): boolean {
  return safeStorage()?.getItem(WELCOMED_KEY) === "1";
}

export function markWelcomed() {
  safeStorage()?.setItem(WELCOMED_KEY, "1");
}

export function getLuciaUnread(): number {
  const v = safeStorage()?.getItem(UNREAD_KEY);
  if (v === null || v === undefined) return hasWelcomed() ? 0 : 1;
  return Number(v) || 0;
}

export function setLuciaUnread(n: number) {
  safeStorage()?.setItem(UNREAD_KEY, String(n));
}

const LAST_ACTIVITY_KEY = "lucia_last_activity";
export function getLuciaLastActivity(): number {
  return Number(safeStorage()?.getItem(LAST_ACTIVITY_KEY) ?? "0");
}
export function setLuciaLastActivity(ts: number) {
  safeStorage()?.setItem(LAST_ACTIVITY_KEY, String(ts));
}

export const SWIPE_DEMO_SEEN_KEY = "hasSeenSwipeDemo";
export function hasSeenSwipeDemo(): boolean {
  return safeStorage()?.getItem(SWIPE_DEMO_SEEN_KEY) === "1";
}
export function markSwipeDemoSeen() {
  safeStorage()?.setItem(SWIPE_DEMO_SEEN_KEY, "1");
}

const HAS_USED_SWIPE_KEY = "hasUsedSwipe";
export function hasUsedSwipe(): boolean {
  return safeStorage()?.getItem(HAS_USED_SWIPE_KEY) === "1";
}
export function markSwipeUsed() {
  safeStorage()?.setItem(HAS_USED_SWIPE_KEY, "1");
}
