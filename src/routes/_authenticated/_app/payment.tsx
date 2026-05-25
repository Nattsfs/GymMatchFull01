import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CreditCard, HelpCircle, Loader2, QrCode } from "lucide-react";
import QRCode from "qrcode";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Plan = "gold" | "diamond";

export const Route = createFileRoute("/_authenticated/_app/payment")({
  validateSearch: (s: Record<string, unknown>) => {
    const plan = s.plan === "diamond" ? "diamond" : "gold";
    const price = Number(s.price) || (plan === "gold" ? 29.9 : 59.9);
    return { plan: plan as Plan, price };
  },
  component: PaymentScreen,
});

function PaymentScreen() {
  const { plan, price } = Route.useSearch();
  const nav = useNavigate();
  const [method, setMethod] = useState<"pix" | "card">("pix");

  const planLabel = plan === "gold" ? "Gold" : "Diamond";
  const planBadgeClass =
    plan === "gold"
      ? "bg-amber-400/20 text-amber-500 border-amber-500/40"
      : "bg-violet-500/20 text-violet-400 border-violet-500/40";

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <button onClick={() => nav({ to: "/premium" })} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold">Finalizar assinatura</h1>
        <span className="w-5" />
      </header>

      <section className="border-b border-border/50 bg-muted/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Plano selecionado</p>
            <p className="font-display text-lg font-bold">Plano {planLabel}</p>
            <p className="text-sm text-muted-foreground">R$ {fmt(price)}/mês</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${planBadgeClass}`}>
            {planLabel}
          </span>
        </div>
      </section>

      <section className="px-6 pt-6">
        <h2 className="mb-3 text-sm font-semibold">Como você quer pagar?</h2>
        <div className="grid grid-cols-2 gap-3">
          <MethodCard
            selected={method === "pix"}
            onClick={() => setMethod("pix")}
            color="#32BCAD"
            icon={<QrCode className="h-5 w-5" />}
            label="Pix"
            sub="Aprovação imediata"
          />
          <MethodCard
            selected={method === "card"}
            onClick={() => setMethod("card")}
            color="#534AB7"
            icon={<CreditCard className="h-5 w-5" />}
            label="Cartão de crédito"
            sub="Crédito ou débito"
          />
        </div>
      </section>

      <section className="px-6 pt-6">
        {method === "pix" ? (
          <PixSection plan={plan} price={price} />
        ) : (
          <CardForm plan={plan} price={price} />
        )}
      </section>
    </div>
  );
}

function MethodCard({
  selected,
  onClick,
  color,
  icon,
  label,
  sub,
}: {
  selected: boolean;
  onClick: () => void;
  color: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border bg-card px-4 py-3 text-left transition-colors"
      style={{
        borderColor: selected ? color : "hsl(var(--border) / 0.6)",
        borderWidth: selected ? 2 : 1,
        backgroundColor: selected ? `${color}14` : undefined,
      }}
    >
      <div className="mb-1 flex items-center gap-2" style={{ color: selected ? color : undefined }}>
        {icon}
        <span className="font-semibold">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </button>
  );
}

/* ---------------- PIX ---------------- */

const PIX_CODE =
  "00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986";

function PixSection({ plan, price }: { plan: Plan; price: number }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [qr, setQr] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<number | null>(null);

  const expired = expiresAt !== null && now >= expiresAt;
  const remainingMs = expiresAt ? Math.max(0, expiresAt - now) : 0;

  const generate = useCallback(async () => {
    setGenerating(true);
    const dataUrl = await QRCode.toDataURL(PIX_CODE, { width: 256, margin: 1 });
    setQr(dataUrl);
    setExpiresAt(Date.now() + 15 * 60 * 1000);
    setGenerating(false);
  }, []);

  // ticker
  useEffect(() => {
    if (!expiresAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [expiresAt]);

  // mock polling: confirm after 10s
  useEffect(() => {
    if (!qr || expired) return;
    const start = Date.now();
    pollRef.current = window.setInterval(async () => {
      if (Date.now() - start >= 10_000) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        await activatePlan(user?.id, plan);
        nav({
          to: "/payment/success",
          search: { plan, price, method: "pix" },
        });
      }
    }, 5000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [qr, expired, plan, price, user?.id, nav]);

  const copy = async () => {
    await navigator.clipboard.writeText(PIX_CODE);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (!qr) {
    return (
      <div className="flex flex-col items-center">
        <button
          onClick={generate}
          disabled={generating}
          className="w-full rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: "#32BCAD" }}
        >
          {generating ? "Gerando..." : "Gerar QR Code Pix"}
        </button>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center">
        <p className="font-semibold text-destructive">QR Code expirado.</p>
        <button
          onClick={generate}
          className="rounded-2xl px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: "#32BCAD" }}
        >
          Gerar novo QR Code
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <img src={qr} alt="QR Code Pix" width={256} height={256} className="rounded-xl bg-white p-2" />
      <div className="w-full">
        <p className="mb-1 text-xs text-muted-foreground">Ou copie o código Pix:</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={PIX_CODE}
            className="flex-1 truncate rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs"
          />
          <button
            onClick={copy}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: "#32BCAD" }}
          >
            {copied ? "Código copiado!" : "Copiar código"}
          </button>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Abra o app do seu banco, escolha pagar via Pix e escaneie o QR Code ou cole o código acima.
      </p>
      <p className="text-sm font-semibold">Este QR Code expira em {fmtMs(remainingMs)}</p>
    </div>
  );
}

/* ---------------- CARD ---------------- */

function CardForm({ plan, price }: { plan: Plan; price: number }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cpf, setCpf] = useState("");
  const [installments, setInstallments] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [declinedMsg, setDeclinedMsg] = useState<string | null>(null);

  const installmentOptions = useMemo(() => {
    if (plan === "gold") {
      return [
        { n: 1, label: `1x de R$ ${fmt(price)} (sem juros)` },
        { n: 2, label: `2x de R$ ${fmt(price / 2)} (sem juros)` },
      ];
    }
    return [
      { n: 1, label: `1x de R$ ${fmt(price)} (sem juros)` },
      { n: 2, label: `2x de R$ ${fmt(price / 2)} (sem juros)` },
      { n: 3, label: `3x de R$ ${fmt(price / 3)} (sem juros)` },
    ];
  }, [plan, price]);

  const numberDigits = number.replace(/\D/g, "");
  const errors = {
    number: numberDigits.length > 0 && numberDigits.length < 16 ? "Número do cartão inválido" : "",
    name: name.length > 0 && name.trim().length < 3 ? "Informe o nome impresso no cartão" : "",
    expiry: "",
    cvv: cvv.length > 0 && cvv.length < 3 ? "CVV inválido" : "",
    cpf: "",
  };
  const allFilled =
    numberDigits.length === 16 &&
    name.trim().length >= 3 &&
    expiry.trim().length > 0 &&
    cvv.length >= 3 &&
    cpf.trim().length > 0;
  const canSubmit = allFilled && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setDeclinedMsg(null);
    setSubmitting(true);
    // Mock backend
    const declined = numberDigits === "4000000000000002";
    await new Promise((r) => setTimeout(r, declined ? 600 : 1500));
    // Wipe card data from local state on completion
    if (declined) {
      setSubmitting(false);
      setDeclinedMsg("Pagamento recusado. Verifique os dados ou tente outro cartão.");
      return;
    }
    await activatePlan(user?.id, plan);
    // Clear sensitive state before navigating
    setNumber("");
    setCvv("");
    setCpf("");
    setName("");
    setExpiry("");
    nav({ to: "/payment/success", search: { plan, price, method: "card" } });
  };

  const btnColor = plan === "gold" ? "#F5A623" : "#534AB7";
  const brand = detectBrand(numberDigits);

  return (
    <div className="flex flex-col gap-4">
      <Field label="Número do cartão" error={errors.number}>
        <div className="relative">
          <input
            inputMode="numeric"
            placeholder="0000 0000 0000 0000"
            value={number}
            onChange={(e) => setNumber(formatCardNumber(e.target.value))}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 pr-16 text-sm"
            maxLength={19}
            autoComplete="cc-number"
          />
          {brand && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-muted-foreground">
              {brand}
            </span>
          )}
        </div>
      </Field>

      <Field label="Nome impresso no cartão" error={errors.name}>
        <input
          placeholder="NOME SOBRENOME"
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm uppercase"
          autoComplete="cc-name"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Validade" error={errors.expiry}>
          <input
            placeholder="MM/AA"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            autoComplete="cc-exp"
          />

        </Field>
        <Field
          label={
            <span className="flex items-center gap-1">
              CVV
              <HelpCircle
                className="h-3 w-3 text-muted-foreground"
                aria-label="Código de 3 dígitos no verso do cartão"
              />
            </span>
          }
          error={errors.cvv}
        >
          <input
            inputMode="numeric"
            type="password"
            placeholder="123"
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            autoComplete="cc-csc"
          />
        </Field>
      </div>

      <Field label="CPF do titular" error={errors.cpf}>
        <input
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
        />
      </Field>


      <Field label="Parcelamento">
        <select
          value={installments}
          onChange={(e) => setInstallments(Number(e.target.value))}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
        >
          {installmentOptions.map((o) => (
            <option key={o.n} value={o.n}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="mt-2 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: btnColor }}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Pagar R$ {fmt(price)}
      </button>
      {declinedMsg && (
        <p className="text-center text-sm font-medium text-destructive">{declinedMsg}</p>
      )}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

/* ---------------- helpers ---------------- */

function fmt(v: number) {
  return v.toFixed(2).replace(".", ",");
}
function fmtMs(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function formatCardNumber(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length < 3) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}
function validateExpiry(v: string) {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const end = new Date(year, month, 0, 23, 59, 59);
  return end.getTime() >= Date.now();
}
function formatCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function validateCPF(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += Number(d[i]) * (slice + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}
function detectBrand(num: string) {
  if (/^4/.test(num)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(num)) return "Mastercard";
  if (/^(4011|4312|4389|4514|5041|5067|6277|6362|6363|6500|6504|6505|6516|6550)/.test(num))
    return "Elo";
  if (/^(384100|384140|384160|606282|637095|637568)/.test(num)) return "Hipercard";
  return null;
}

async function activatePlan(userId: string | undefined, plan: Plan) {
  if (!userId) return;
  try {
    await supabase.from("profiles").update({ plan }).eq("id", userId);
  } catch (e) {
    console.error("Failed to update plan", e);
  }
}
