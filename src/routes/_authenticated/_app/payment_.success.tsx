import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";

type Plan = "gold" | "diamond";

export const Route = createFileRoute("/_authenticated/_app/payment_/success")({
  validateSearch: (s: Record<string, unknown>) => {
    const plan: Plan = s.plan === "diamond" ? "diamond" : "gold";
    const price = Number(s.price) || (plan === "gold" ? 29.9 : 59.9);
    const method = s.method === "card" ? "card" : "pix";
    return { plan, price, method: method as "pix" | "card" };
  },
  component: PaymentSuccess,
});

function PaymentSuccess() {
  const { plan, price, method } = Route.useSearch();
  const nav = useNavigate();
  const [scale, setScale] = useState(0);
  const confirmedAt = useMemo(() => new Date(), []);

  useEffect(() => {
    const t = window.setTimeout(() => setScale(1), 50);
    return () => window.clearTimeout(t);
  }, []);

  const planLabel = plan === "gold" ? "Gold" : "Diamond";
  const planBadgeClass =
    plan === "gold"
      ? "bg-amber-400/20 text-amber-500 border-amber-500/40"
      : "bg-violet-500/20 text-violet-400 border-violet-500/40";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 transition-transform duration-500"
        style={{ transform: `scale(${scale})` }}
      >
        <Check className="h-10 w-10 text-white" strokeWidth={3} />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold">Pagamento confirmado!</h1>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        Bem-vindo ao plano {planLabel}! Seu plano já está ativo e você já pode aproveitar todos os
        benefícios.
      </p>

      <div className="mt-6 w-full max-w-sm rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Plano {planLabel}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${planBadgeClass}`}>
            {planLabel}
          </span>
        </div>
        <Row label="Valor pago" value={`R$ ${price.toFixed(2).replace(".", ",")}`} />
        <Row label="Método" value={method === "pix" ? "Pix" : "Cartão de crédito"} />
        <Row
          label="Confirmado em"
          value={confirmedAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
        />
      </div>

      <button
        onClick={() => nav({ to: "/discover", replace: true })}
        className="mt-8 w-full max-w-sm rounded-2xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow"
      >
        Começar a usar
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-border/40 py-2 text-sm first:border-t-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
