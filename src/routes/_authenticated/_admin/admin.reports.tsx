import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/reports")({ component: Reports });

type Row = { id: string; reporter_id: string; reported_id: string; reason: string; details: string|null; status: string; urgent: boolean; created_at: string };

const REASON_LABELS: Record<string, string> = {
  harassment: "Assédio",
  fake_profile: "Perfil falso",
  offensive_language: "Linguagem ofensiva",
  spam: "Spam",
  inappropriate_behavior: "Comportamento inadequado",
  racism: "Racismo",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "pendente",
  reviewed: "revisada",
  action_taken: "ação tomada",
  dismissed: "descartada",
};

function Reports() {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
    setRows((data ?? []) as Row[]);
    const ids = Array.from(new Set((data ?? []).flatMap(r => [r.reporter_id, r.reported_id])));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,name").in("id", ids);
      setNames(Object.fromEntries((ps ?? []).map(p => [p.id, p.name ?? "—"])));
    }
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: "pending"|"reviewed"|"action_taken"|"dismissed") {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado"); load();
  }
  async function suspendUser(uid: string) {
    const { error } = await supabase.from("profiles").update({ status: "suspended" }).eq("id", uid);
    if (error) return toast.error(error.message);
    toast.success("Usuário suspenso");
  }

  const urgent = rows.filter(r => r.urgent || ["harassment","racism"].includes(r.reason));
  const others = rows.filter(r => !(r.urgent || ["harassment","racism"].includes(r.reason)));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Denúncias</h1>
      {urgent.length > 0 && (
        <Section title="Urgentes" accent>
          {urgent.map(r => <Item key={r.id} r={r} names={names} onStatus={setStatus} onSuspend={suspendUser} />)}
        </Section>
      )}
      <Section title="Todas as denúncias">
        {others.length === 0 ? <p className="text-sm text-muted-foreground">Nada por aqui.</p>
          : others.map(r => <Item key={r.id} r={r} names={names} onStatus={setStatus} onSuspend={suspendUser} />)}
      </Section>
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">{accent && <AlertTriangle className="h-5 w-5 text-destructive" />}{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Item({ r, names, onStatus, onSuspend }: { r: any; names: Record<string,string>; onStatus: (id:string,s:any)=>void; onSuspend:(id:string)=>void }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm"><span className="text-muted-foreground">Denunciante:</span> {names[r.reporter_id] ?? "—"} <span className="text-muted-foreground">→ Denunciado:</span> {names[r.reported_id] ?? "—"}</p>
          <p className="text-sm"><span className="font-medium">{REASON_LABELS[r.reason] ?? r.reason}</span> · <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</span></p>
          {r.details && <p className="mt-1 text-sm text-muted-foreground">{r.details}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-muted px-2 py-1 text-xs">{STATUS_LABELS[r.status] ?? r.status}</span>
          <button onClick={() => onStatus(r.id, "reviewed")} className="rounded-lg border border-border px-2 py-1 text-xs">Marcar como revisada</button>
          <button onClick={() => { onSuspend(r.reported_id); onStatus(r.id, "action_taken"); }} className="rounded-lg bg-destructive px-2 py-1 text-xs text-destructive-foreground">Suspender usuário</button>
          <button onClick={() => onStatus(r.id, "dismissed")} className="rounded-lg border border-border px-2 py-1 text-xs">Descartar</button>
        </div>
      </div>
    </div>
  );
}
