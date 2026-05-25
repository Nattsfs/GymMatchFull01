import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Pencil, LogOut, Pause, Trash2, Crown, Shield, ChevronRight, Play } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/me")({ component: Me });

type Plan = "free" | "gold" | "diamond" | "premium";
type Full = {
  name: string | null; age: number | null; bio: string | null; photo_url: string | null;
  goal: string | null; training_level: string | null; modalities: string[]; interests: string[];
  available_hours: string[]; plan: Plan; status: string;
  hide_orientation: boolean; hide_hours: boolean;
};

const GOAL_LABELS: Record<string, string> = {
  friends: "Amizade",
  training_partner: "Parceiro de treino",
  romance: "Romance",
};
const LEVEL_LABELS: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

function PlanBadge({ plan }: { plan: Plan }) {
  if (plan === "diamond") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow">
      💎 Diamond
    </span>
  );
  if (plan === "gold") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-black shadow">
      👑 Gold
    </span>
  );
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      Grátis
    </span>
  );
}

function Me() {
  const { user, isAdmin, signOut, refreshProfile } = useAuth();
  const [p, setP] = useState<Full | null>(null);
  const [photos, setPhotos] = useState<Array<{ id: string; url: string }>>([]);
  const nav = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles")
      .select("name,age,bio,photo_url,goal,training_level,modalities,interests,available_hours,plan,status,hide_orientation,hide_hours")
      .eq("id", user.id).maybeSingle()
      .then(({ data }) => setP(data as Full | null));
    supabase.from("user_photos").select("id,url,position").eq("user_id", user.id).order("position")
      .then(({ data }) => setPhotos((data ?? []) as Array<{ id: string; url: string }>));
  }, [user]);

  async function setStatus(status: "active" | "paused" | "deleted") {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ status }).eq("id", user.id);
    if (error) return toast.error(error.message);
    await supabase.from("audit_logs").insert({ actor_id: user.id, action: `profile.${status}` });
    if (status === "deleted") { await signOut(); nav({ to: "/" }); }
    else { toast.success(status === "paused" ? "Conta pausada" : "Conta reativada"); refreshProfile(); }
  }

  if (!p) return <div className="grid min-h-[60vh] place-items-center text-muted-foreground">Carregando...</div>;

  const isPaused = p.status === "paused";

  return (
    <div>
      {/* Hero */}
      <div className="relative h-60 bg-muted overflow-hidden">
        {p.photo_url
          ? <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
          : <div className="h-full w-full bg-gradient-to-br from-muted to-card" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

        {/* Edit button */}
        <Link
          to="/profile/edit"
          className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-background/70 backdrop-blur px-3 py-1.5 text-xs font-semibold"
        >
          <Pencil className="h-3 w-3" /> Editar
        </Link>

        {/* Name + info */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold leading-tight">
                {p.name ?? "—"}{p.age ? `, ${p.age}` : ""}
              </h1>
              {(p.training_level || p.goal) && (
                <p className="mt-0.5 text-sm text-foreground/70">
                  {p.training_level ? LEVEL_LABELS[p.training_level] : ""}
                  {p.training_level && p.goal ? " · " : ""}
                  {p.goal ? GOAL_LABELS[p.goal] : ""}
                </p>
              )}
            </div>
            <PlanBadge plan={p.plan} />
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-4">
        {/* Bio */}
        {p.bio && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">{p.bio}</p>
        )}

        {/* Modalities chips */}
        {p.modalities?.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {p.modalities.slice(0, 5).map((m) => (
              <span key={m} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{m}</span>
            ))}
          </div>
        )}

        {/* Extra photos grid — estilo Instagram */}
        {photos.length > 0 && (
          <div className="mb-5 -mx-5">
            <div className="grid grid-cols-3 gap-px bg-border/30">
              {photos.map((photo) => (
                <div key={photo.id} className="aspect-square overflow-hidden bg-muted">
                  <img src={photo.url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu */}
        <div className="space-y-1.5">
          <MenuItem to="/premium" icon={<Crown className="h-4 w-4 text-amber-400" />} label="Ver Premium" />
          {isAdmin && <MenuItem to="/admin" icon={<Shield className="h-4 w-4 text-blue-400" />} label="Painel administrativo" />}

          <div className="my-3 h-px bg-border/50" />

          <ActionItem
            icon={isPaused
              ? <Play className="h-4 w-4 text-green-400" />
              : <Pause className="h-4 w-4 text-muted-foreground" />
            }
            label={isPaused ? "Reativar conta" : "Pausar conta"}
            onClick={() => setStatus(isPaused ? "active" : "paused")}
          />
          <ActionItem
            icon={<LogOut className="h-4 w-4 text-muted-foreground" />}
            label="Sair"
            onClick={signOut}
          />

          <div className="my-3 h-px bg-border/50" />

          <ActionItem
            icon={<Trash2 className="h-4 w-4 text-destructive" />}
            label="Excluir conta"
            danger
            onClick={() => {
              if (confirm("Excluir conta? Seus dados serão mantidos por conformidade.")) setStatus("deleted");
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MenuItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl bg-card/60 border border-border/60 px-4 py-3.5 hover:bg-card transition-colors"
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </Link>
  );
}

function ActionItem({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border border-border/60 px-4 py-3.5 text-left transition-colors ${
        danger ? "bg-destructive/5 hover:bg-destructive/10 border-destructive/20" : "bg-card/60 hover:bg-card"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className={`flex-1 text-sm font-medium ${danger ? "text-destructive" : ""}`}>{label}</span>
    </button>
  );
}
