import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/admin/announcements")({ component: Announcements });

type Row = { id: string; title: string; body: string; gym_id: string|null; created_at: string };

function Announcements() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [gyms, setGyms] = useState<{id:string;name:string}[]>([]);
  const [form, setForm] = useState({ title: "", body: "", gym_id: "" });

  async function load() {
    const [{ data: a }, { data: g }] = await Promise.all([
      supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("gyms").select("id,name"),
    ]);
    setRows((a ?? []) as Row[]);
    setGyms(g ?? []);
  }
  useEffect(() => { load(); }, []);

  async function send() {
    if (!form.title || !form.body) return toast.error("Título e mensagem são obrigatórios");
    const { error } = await supabase.from("announcements").insert({
      title: form.title, body: form.body,
      gym_id: form.gym_id || null,
      created_by: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    setForm({ title: "", body: "", gym_id: "" });
    toast.success("Aviso enviado"); load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Avisos</h1>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-3">
          <input placeholder="Título" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="ipt" />
          <textarea rows={3} placeholder="Mensagem" value={form.body} onChange={(e) => setForm({...form, body: e.target.value})} className="ipt" />
          <select value={form.gym_id} onChange={(e) => setForm({...form, gym_id: e.target.value})} className="ipt">
            <option value="">Todas as academias (global)</option>
            {gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button onClick={send} className="rounded-xl bg-gradient-primary px-4 py-2.5 font-semibold text-primary-foreground">Enviar</button>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex justify-between"><p className="font-display font-semibold">{r.title}</p><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">{r.gym_id ? gyms.find(g => g.id === r.gym_id)?.name : "Global"}</p>
          </div>
        ))}
      </div>
      <style>{`.ipt{border-radius:.75rem;border:1px solid var(--border);background:var(--background);padding:.5rem .75rem;color:var(--foreground);font-size:.875rem;outline:none;width:100%}`}</style>
    </div>
  );
}
