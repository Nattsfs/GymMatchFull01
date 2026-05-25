import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Check, Crown, Heart, Sparkles } from "lucide-react";


export const Route = createFileRoute("/_authenticated/_app/premium")({ component: Premium });

const PRICES = {
  gold: 29.9,
  diamond: 59.9,
} as const;

const GOLD_BENEFITS = [
  "Curtidas diárias ilimitadas",
  "Até 20 matches ativos",
  "Envio de imagens no chat",
  "Desfazer última curtida ou match",
  "Veja os últimos 5 perfis que te curtiram",
  "Sem anúncios",
];
const FREE_BENEFITS = [
  "Até 10 curtidas por dia",
  "Até 5 matches ativos",
  "Chat de texto com seus matches",
  "Descobrir perfis na sua academia",
  "Perfil básico personalizável",
];
const DIAMOND_BENEFITS = [
  "Tudo do Gold",
  "Matches ilimitados",
  "Veja todos os perfis que te curtiram",
  "Boost semanal de 30 min no topo da fila",
  "Filtros avançados (nível, modalidade, horário)",
  'Badge exclusivo "Diamond" no perfil',
  "Suporte prioritário",
];


function Premium() {
  const { profile } = useAuth();
  const nav = useNavigate();

  const current = (profile?.plan ?? "free") as string;

  const goCheckout = (plan: "gold" | "diamond") =>
    nav({ to: "/payment", search: { plan, price: PRICES[plan] } });


  return (
    <div className="min-h-screen bg-background">
      
      <div className="px-6 pt-6">
        <button
          onClick={() => nav({ to: "/me" })}
          className="mb-2 flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <h1 className="font-display text-2xl font-bold">Escolha seu plano</h1>
        <p className="text-sm text-muted-foreground">
          Encontre mais pessoas, conecte-se melhor. Seu plano atual:{" "}
          <strong className="text-foreground">{labelOf(current)}</strong>
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <PlanCard
            name="Grátis"
            priceLabel="R$ 0/mês"
            icon={<Heart className="h-5 w-5" />}
            benefits={FREE_BENEFITS}
            active={current === "free"}
            ctaLabel={current === "free" ? "Plano atual ✓" : "Voltar plano"}
            onSubscribe={() => nav({ to: "/discover" })}
          />
          <PlanCard
            name="Gold"
            priceLabel="R$ 29,90/mês"
            icon={<Crown className="h-5 w-5" />}
            benefits={GOLD_BENEFITS}
            active={current === "gold"}
            ctaLabel={current === "gold" ? "Plano atual ✓" : "Assinar Plano"}
            onSubscribe={() => goCheckout("gold")}
          />
          <PlanCard
            name="Diamond"
            priceLabel="R$ 59,90/mês"
            icon={<Sparkles className="h-5 w-5" />}
            benefits={DIAMOND_BENEFITS}
            active={current === "diamond"}
            highlight
            ctaLabel={current === "diamond" ? "Plano atual ✓" : "Assinar Plano"}
            onSubscribe={() => goCheckout("diamond")}
          />
        </div>


        <button
          onClick={() => nav({ to: "/discover" })}
          className="mt-6 w-full rounded-2xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground"
        >
          Continuar no plano gratuito
        </button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Simulação de pagamento — nenhum valor será cobrado.
        </p>
      </div>
    </div>
  );
}

function PlanCard({
  name,
  priceLabel,
  icon,
  benefits,
  active,
  highlight,
  disabled,
  ctaLabel,
  onSubscribe,
}: {
  name: string;
  priceLabel: string;
  icon: React.ReactNode;
  benefits: string[];
  active: boolean;
  highlight?: boolean;
  disabled?: boolean;
  ctaLabel: string;
  onSubscribe: () => void;
}) {
  return (
    <div
      className={`relative rounded-3xl border p-5 ${highlight ? "border-primary bg-gradient-to-b from-primary/10 to-card shadow-glow" : "border-border bg-card"}`}
    >
      {highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
          Mais popular
        </span>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <h2 className="font-display text-xl font-bold">{name}</h2>
        </div>
        {active && (
          <span className="rounded-full bg-gradient-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
            Ativo
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{priceLabel}</p>
      <ul className="mt-4 space-y-2">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <button
        disabled={active || disabled}
        onClick={onSubscribe}
        className={`mt-5 w-full rounded-2xl py-3 text-sm font-semibold disabled:opacity-60 ${highlight ? "bg-gradient-primary text-primary-foreground shadow-glow" : "border border-primary text-primary"}`}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

function labelOf(p: string) {
  if (p === "gold") return "Gold";
  if (p === "diamond") return "Diamond";
  return "Grátis";
}
