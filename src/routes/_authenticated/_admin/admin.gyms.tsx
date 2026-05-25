import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/admin/gyms")({ component: Gyms });

type Row = { id: string; name: string; address: string|null; qr_code: string; active: boolean };

function Gyms() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({ name: "", address: "", qr_code: "" });

  async function load() {
    const { data } = await supabase.from("gyms").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.name || !form.qr_code) return toast.error("Nome e código QR são obrigatórios");
    const { error } = await supabase.from("gyms").insert(form);
    if (error) return toast.error(error.message);
    setForm({ name: "", address: "", qr_code: "" });
    toast.success("Academia cadastrada"); load();
  }
  async function toggleActive(g: Row) {
    await supabase.from("gyms").update({ active: !g.active }).eq("id", g.id); load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Unidades de academia</h1>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Cadastrar nova academia</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="ipt" />
          <input placeholder="Endereço" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} className="ipt" />
          <input placeholder="Código QR (ex: CENTRO)" value={form.qr_code} onChange={(e) => setForm({...form, qr_code: e.target.value.toUpperCase()})} className="ipt" />
          <button onClick={create} className="rounded-xl bg-gradient-primary px-4 py-2 font-semibold text-primary-foreground">Cadastrar</button>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map(g => {
          const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${g.qr_code}` : `/join/${g.qr_code}`;
          return (
            <div key={g.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <img alt="qr" className="h-24 w-24 rounded-lg bg-white p-1"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`} />
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold">{g.name}</p>
                <p className="text-xs text-muted-foreground">{g.address ?? "—"}</p>
                <p className="mt-1 text-xs"><span className="text-muted-foreground">Código:</span> <code className="rounded bg-muted px-1.5 py-0.5">{g.qr_code}</code></p>
                <a href={joinUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary underline">Testar link</a>
              </div>
              <button onClick={() => toggleActive(g)} className="rounded-lg border border-border px-2 py-1 text-xs">{g.active ? "Desativar" : "Ativar"}</button>
            </div>
          );
        })}
      </div>
      <style>{`.ipt{border-radius:.75rem;border:1px solid var(--border);background:var(--background);padding:.5rem .75rem;color:var(--foreground);font-size:.875rem;outline:none}`}</style>
    </div>
  );
}
