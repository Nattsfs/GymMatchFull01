import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/users")({ component: Users });

type Row = { id: string; name: string|null; email: string|null; age: number|null; gym_id: string|null; status: string; plan: string; created_at: string };

const STATUS_LABELS: Record<string, string> = { active: "ativo", suspended: "suspenso", paused: "pausado", deleted: "excluído" };
const PLAN_LABELS: Record<string, string> = { free: "Grátis", premium: "Premium" };

function Users() {
  const [rows, setRows] = useState<Row[]>([]);
  const [gyms, setGyms] = useState<{ id: string; name: string }[]>([]);
  const [gymFilter, setGymFilter] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    let query = supabase.from("profiles").select("id,name,email,age,gym_id,status,plan,created_at").order("created_at", { ascending: false }).limit(500);
    if (gymFilter) query = query.eq("gym_id", gymFilter);
    const { data } = await query;
    setRows((data ?? []) as Row[]);
  }
  useEffect(() => {
    supabase.from("gyms").select("id,name").then(({ data }) => setGyms(data ?? []));
  }, []);
  useEffect(() => { load(); }, [gymFilter]);

  async function setStatus(id: string, status: "active"|"paused"|"deleted"|"suspended") {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado"); load();
  }

  function exportCsv() {
    const cols = ["id","name","email","age","gym_id","status","plan","created_at"];
    const csv = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify((r as any)[c] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `usuarios-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = rows.filter(r => !q || r.name?.toLowerCase().includes(q.toLowerCase()) || r.email?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Usuários</h1>
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" /> Exportar CSV</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
        <select value={gymFilter} onChange={(e) => setGymFilter(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
          <option value="">Todas as academias</option>
          {gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Idade</th><th className="px-4 py-3">Plano</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Ações</th></tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="px-4 py-3 font-medium">{r.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.email ?? "—"}</td>
                <td className="px-4 py-3">{r.age ?? "—"}</td>
                <td className="px-4 py-3">{PLAN_LABELS[r.plan] ?? r.plan}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "active" ? "bg-success/20 text-success" : r.status === "suspended" ? "bg-destructive/20 text-destructive" : "bg-muted"}`}>{STATUS_LABELS[r.status] ?? r.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => setStatus(r.id, r.status === "suspended" ? "active" : "suspended")} className="rounded-lg border border-border px-2 py-1 text-xs">{r.status === "suspended" ? "Reativar" : "Suspender"}</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
