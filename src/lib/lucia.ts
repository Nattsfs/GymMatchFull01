// Lucia: frontend-only welcome bot. NOT a real user.
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
  "Olá! Eu sou a Lucia, sua assistente do GymMatch. Estou aqui para garantir que sua experiência seja incrível e segura.",
  "Lembre-se: o GymMatch é um espaço de respeito mútuo. Trate todos com educação, assim como você gostaria de ser tratado.",
  "Se precisar de ajuda ou quiser saber mais sobre as regras da comunidade, é só me chamar. Bom treino!",
];

export const QUICK_REPLIES: { label: string; reply: string }[] = [
  { label: "Regras da comunidade", reply: "As regras são simples: respeito, sem assédio, sem spam, sem fotos inadequadas. Use o botão de denúncia se algo te incomodar." },
  { label: "Como funciona o match?", reply: "Você dá like nos perfis da sua academia. Quando a outra pessoa também curte você, vira match e libera o chat!" },
  { label: "Sobre segurança", reply: "Sua privacidade é prioridade. Você pode bloquear ou denunciar qualquer pessoa. Combine encontros sempre em locais públicos." },
  { label: "Falar com suporte", reply: "Para falar com a equipe humana, envie um email para suporte@gymmatch.app — respondemos em até 24h." },
];

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

