import { createServerFn } from "@tanstack/react-start";

const SYSTEM_PROMPT = `Você é a Lucia, assistente virtual do GymMatch — um app de conexões para pessoas que frequentam academia, similar ao Tinder mas focado em fitness e treino.

Seu papel:
- Ajudar usuários com dúvidas sobre o app
- Explicar como funciona o sistema de match e descoberta
- Dar dicas de segurança para encontros
- Informar sobre os planos disponíveis
- Explicar as regras da comunidade
- Ser simpática, motivacional e focada no universo fitness

Informações do GymMatch:
- Plano Free: 20 likes/dia, até 5 matches ativos, chat por texto
- Plano Gold (R$ 29,90/mês): likes ilimitados, até 20 matches, envio de imagens no chat, desfazer última ação
- Plano Diamond (R$ 59,90/mês): tudo ilimitado, boost semanal de perfil, filtros avançados, badge exclusivo
- Matches acontecem quando dois usuários da mesma academia se curtem mutuamente
- O chat é liberado automaticamente após o match
- É possível bloquear e denunciar usuários pelo chat

Regras da comunidade: respeito mútuo, sem assédio, sem spam, sem fotos inadequadas.
Para suporte humano: suporte@gymmatch.app

Instruções:
- Responda SEMPRE em português brasileiro informal mas educado
- Seja concisa (máximo 3 parágrafos curtos)
- Use emojis com moderação
- Não invente funcionalidades não descritas acima
- Se não souber, direcione para suporte@gymmatch.app`;

export type AIMessage = { role: "user" | "assistant"; content: string };

export const askLucia = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const { messages } = ctx.data as { messages: AIMessage[] };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { text: "Estou em manutenção no momento. Entre em contato com suporte@gymmatch.app 🛠️" };
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 400,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    }),
  });

  if (!res.ok) {
    console.error("Groq error:", res.status, await res.text());
    return { text: "Ops, tive um probleminha. Tente novamente ou escreva para suporte@gymmatch.app 🙏" };
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const text = data.choices[0]?.message?.content ?? "Não consegui processar. Tente novamente!";
  return { text };
});
