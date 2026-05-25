import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_admin/admin/")({ component: Dashboard });

type Stats = { users: number; matches: number; reports: number; active: number; ageBuckets: Record<string, number>; topHours: Record<string, number>; planDist: Record<string, number> };

const HOUR_LABELS: Record<string, string> = { morning: "Manhã", afternoon: "Tarde", night: "Noite" };
const PLAN_LABELS: Record<string, string> = { free: "Grátis", gold: "Gold", diamond: "Diamond", premium: "Premium" };

function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const [{ count: users }, { count: matches }, { count: reports }, { count: active }, { data: profiles }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("matches").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("profiles").select("age,available_hours,plan"),
      ]);
      const ageBuckets: Record<string, number> = { "18-24": 0, "25-34": 0, "35-44": 0, "45+": 0 };
      const topHours: Record<string, number> = { morning: 0, afternoon: 0, night: 0 };
      const planDist: Record<string, number> = { free: 0, gold: 0, diamond: 0 };
      profiles?.forEach((p) => {
        if (p.age) {
          if (p.age < 25) ageBuckets["18-24"]++;
          else if (p.age < 35) ageBuckets["25-34"]++;
          else if (p.age < 45) ageBuckets["35-44"]++;
          else ageBuckets["45+"]++;
        }
        (p.available_hours ?? []).forEach((h: string) => { topHours[h] = (topHours[h] ?? 0) + 1; });
        const plan = (p as { plan?: string }).plan ?? "free";
        const key = plan === "premium" ? "gold" : plan;
        planDist[key] = (planDist[key] ?? 0) + 1;
      });
      setS({ users: users ?? 0, matches: matches ?? 0, reports: reports ?? 0, active: active ?? 0, ageBuckets, topHours, planDist });
    })();
  }, []);

  if (!s) return <p className="text-muted-foreground">Carregando...</p>;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Painel</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total de usuários" value={s.users} />
        <Stat label="Usuários ativos" value={s.active} />
        <Stat label="Matches realizados" value={s.matches} />
        <Stat label="Denúncias" value={s.reports} accent={s.reports > 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Distribuição por idade">
          {Object.entries(s.ageBuckets).map(([k, v]) => <Bar key={k} label={k} value={v} max={Math.max(1, ...Object.values(s.ageBuckets))} />)}
        </Panel>
        <Panel title="Horários mais procurados">
          {Object.entries(s.topHours).map(([k, v]) => <Bar key={k} label={HOUR_LABELS[k] ?? k} value={v} max={Math.max(1, ...Object.values(s.topHours))} />)}
        </Panel>
        <Panel title="Distribuição por plano">
          {Object.entries(s.planDist).map(([k, v]) => <Bar key={k} label={PLAN_LABELS[k] ?? k} value={v} max={Math.max(1, ...Object.values(s.planDist))} />)}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-2">{children}</div>
    </div>
  );
}
function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="capitalize">{label}</span><span className="text-muted-foreground">{value}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-gradient-primary" style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}
