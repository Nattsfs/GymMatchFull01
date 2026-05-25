import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Pencil, LogOut, Pause, Trash2, Crown, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/me")({ component: Me });

type Plan = "free" | "gold" | "diamond" | "premium";
type Full = {
  name: string | null; age: number | null; bio: string | null; photo_url: string | null;
  goal: string | null; training_level: string | null; modalities: string[]; interests: string[];
  available_hours: string[]; plan: Plan; status: string;
  hide_orientation: boolean; hide_hours: boolean;
};
const PLAN_LABEL: Record<Plan, string> = { free: "Grátis", gold: "Gold", diamond: "Diamond", premium: "Premium" };

const GOAL_LABELS: Record<string, string> = {
  friends: "amizade",
  training_partner: "parceiro de treino",
  romance: "romance",
};
const LEVEL_LABELS: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};
const STATUS_MESSAGES: Record<string, string> = {
  active: "Conta reativada",
  paused: "Conta pausada",
  deleted: "Conta excluída",
};

function Me() {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const [p, setP] = useState<Full | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name,age,bio,photo_url,goal,training_level,modalities,interests,available_hours,plan,status,hide_orientation,hide_hours").eq("id", user.id).maybeSingle().then(({ data }) => setP(data as Full | null));
  }, [user]);

  async function setStatus(status: "active" | "paused" | "deleted") {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ status }).eq("id", user.id);
    if (error) return toast.error(error.message);
    await supabase.from("audit_logs").insert({ actor_id: user.id, action: `profile.${status}` });
    toast.success(STATUS_MESSAGES[status] ?? "Atualizado");
    if (status === "deleted") { await signOut(); nav({ to: "/" }); }
    else refreshProfile();
  }


  if (!p) return <div className="grid min-h-[60vh] place-items-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="px-6 pt-6">
      <h1 className="font-display text-2xl font-bold">Perfil</h1>
      <div className="mt-6 flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-2xl bg-muted">
          {p.photo_url && <img src={p.photo_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold">{p.name ?? "—"}{p.age ? `, ${p.age}` : ""}</p>
          <p className="text-sm text-muted-foreground">{p.training_level ? (LEVEL_LABELS[p.training_level] ?? p.training_level) : ""}{p.goal ? ` · ${GOAL_LABELS[p.goal] ?? p.goal}` : ""}</p>
          <span
            className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              p.plan === "diamond"
                ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow"
                : p.plan === "gold"
                  ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow"
                  : "bg-accent text-foreground"
            }`}
          >
            {p.plan === "diamond" && "💎 "}
            {p.plan === "gold" && "👑 "}
            {PLAN_LABEL[p.plan] ?? "Grátis"}
          </span>

        </div>
      </div>

      {p.bio && <p className="mt-4 text-sm text-muted-foreground">{p.bio}</p>}

      <div className="mt-8 grid gap-2">
        <Link to="/profile/edit" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <Pencil className="h-5 w-5" /> Editar perfil
        </Link>
        <Link to="/premium" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <Crown className="h-5 w-5 text-primary" /> Ver Premium
        </Link>
        {isAdmin && (
          <Link to="/admin" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <Shield className="h-5 w-5" /> Painel administrativo
          </Link>
        )}
        <button onClick={() => setStatus(p.status === "paused" ? "active" : "paused")} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left">
          <Pause className="h-5 w-5" /> {p.status === "paused" ? "Reativar conta" : "Pausar conta"}
        </button>
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left">
          <LogOut className="h-5 w-5" /> Sair
        </button>
        <button onClick={() => { if (confirm("Excluir conta? Seus dados serão mantidos por conformidade.")) setStatus("deleted"); }} className="flex w-full items-center gap-3 rounded-2xl border border-destructive/40 bg-card p-4 text-left text-destructive">
          <Trash2 className="h-5 w-5" /> Excluir conta
        </button>
      </div>
    </div>
  );
}
