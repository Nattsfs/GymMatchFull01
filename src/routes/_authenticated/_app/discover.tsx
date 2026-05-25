import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Heart, X, Dumbbell, MapPin, Zap } from "lucide-react";
import { toast } from "sonner";
import { hasUsedSwipe, markSwipeUsed } from "@/lib/lucia";

export const Route = createFileRoute("/_authenticated/_app/discover")({ component: Discover });

type Card = {
  id: string;
  name: string | null;
  age: number | null;
  bio: string | null;
  photo_url: string | null;
  goal: string | null;
  training_level: string | null;
  modalities: string[];
  interests: string[];
  available_hours: string[];
  hide_hours: boolean;
};



const GOAL_LABELS: Record<string, string> = {
  friends: "amizade",
  training_partner: "parceiro de treino",
  romance: "romance",
};
const LEVEL_LABELS: Record<string, string> = {
  beginner: "iniciante",
  intermediate: "intermediário",
  advanced: "avançado",
};
const HOUR_LABELS: Record<string, string> = {
  morning: "manhã",
  afternoon: "tarde",
  night: "noite",
};

function Discover() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [loading, setLoading] = useState(true);
  

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Pega todas as academias do usuário (user_gyms tem precedência; fallback para gym_id do perfil)
    const { data: myGymRows } = await supabase
      .from("user_gyms").select("gym_id").eq("user_id", user.id);
    const myGymIds: string[] = myGymRows?.map((r) => r.gym_id as string) ?? [];
    if (myGymIds.length === 0 && profile?.gym_id) myGymIds.push(profile.gym_id);

    if (myGymIds.length === 0) {
      setCards([]);
      setLoading(false);
      return;
    }

    // Usuários que compartilham pelo menos uma academia via user_gyms
    const { data: sharedRows } = await supabase
      .from("user_gyms").select("user_id")
      .in("gym_id", myGymIds)
      .neq("user_id", user.id);
    const viaTableIds = [...new Set(sharedRows?.map((r) => r.user_id as string) ?? [])];

    // Exclude users already liked/rejected
    const { data: liked } = await supabase
      .from("likes").select("to_user").eq("from_user", user.id);
    const likedIds = liked?.map((l) => l.to_user) ?? [];

    // Exclude blocked (either direction)
    const { data: blocks } = await supabase
      .from("blocks").select("blocker_id,blocked_id")
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
    const blockedIds = (blocks ?? []).flatMap((b: any) =>
      [b.blocker_id, b.blocked_id].filter((id) => id !== user.id)
    );

    const exclude = new Set([user.id, ...likedIds, ...blockedIds]);
    const filteredViaTable = viaTableIds.filter((id) => !exclude.has(id));

    // OR: gym_id principal está nas minhas academias  OU  aparece em user_gyms compartilhado
    // Isso cobre usuários que só fizeram onboarding (só têm gym_id) e quem editou o perfil
    const gymFilter = `gym_id.in.(${myGymIds.join(",")})`;
    const tableFilter = filteredViaTable.length > 0 ? `,id.in.(${filteredViaTable.join(",")})` : "";

    let query = supabase
      .from("profiles")
      .select("id,name,age,bio,photo_url,goal,training_level,modalities,interests,available_hours,hide_hours")
      .or(gymFilter + tableFilter)
      .eq("status", "active")
      .eq("profile_complete", true)
      .not("photo_url", "is", null)
      .limit(50);

    const excludeArr = [...exclude];
    if (excludeArr.length > 0) {
      query = query.not("id", "in", `(${excludeArr.join(",")})`);
    }

    const { data, error } = await query;
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const mapped: Card[] = (data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      bio: p.bio,
      photo_url: p.photo_url,
      goal: p.goal,
      training_level: p.training_level,
      modalities: p.modalities ?? [],
      interests: p.interests ?? [],
      available_hours: p.hide_hours ? [] : (p.available_hours ?? []),
      hide_hours: !!p.hide_hours,
    }));
    setCards(mapped);
    setI(0);

    setLoading(false);
  }, [user, profile?.gym_id]);

  useEffect(() => { load(); }, [load]);

  async function act(isLike: boolean) {
    if (!user || !cards[i]) return;
    if (!hasUsedSwipe()) { markSwipeUsed(); }
    const target = cards[i];
    const { data: rpcData, error } = await supabase.rpc("handle_swipe", {
      from_user: user.id,
      to_user: target.id,
      swipe_action: isLike ? "like" : "reject",
    });
    const data = rpcData as { blocked?: boolean; reason?: string; matched?: boolean; match_id?: string } | null;
    if (error) { toast.error(error.message); return; }
    if (data?.blocked && data?.reason === "daily_limit_reached") {
      toast.error("Limite diário de curtidas atingido. Assine um plano para curtidas ilimitadas.");
      return;
    }
    if (data?.blocked && data?.reason === "limit_reached") {
      toast.error("Você atingiu o limite de matches do seu plano.");
      nav({ to: "/premium" });
      return;
    }
    if (data?.matched && data?.match_id) {
      toast.success(`Deu match com ${target.name ?? "alguém da academia"}! 🔥`, {
        description: "Abrindo o chat para vocês conversarem...",
        duration: 4000,
        action: {
          label: "Abrir chat",
          onClick: () => nav({ to: "/chat/$matchId", params: { matchId: data.match_id } }),
        },
      });
      setTimeout(() => {
        nav({ to: "/chat/$matchId", params: { matchId: data.match_id } });
      }, 1200);
      return;
    }
    setI((x) => x + 1);
  }

  if (loading) return <Loader />;
  if (!profile?.gym_id) return <Empty title="Nenhuma academia selecionada." body="Adicione uma academia no seu perfil para ver membros." />;
  const card = cards[i];
  if (!card) return (
    <div className="px-4 pt-6">
      <Header />
      <Empty title="Nenhum membro encontrado na sua academia ainda." body="Volte mais tarde ou convide amigos para entrar no GymMatch!" />
    </div>
  );

  return (
    <div className="px-4 pt-6">
      <Header />
      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card shadow-glow">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          {card.photo_url ? (
            <img src={card.photo_url} alt={card.name ?? ""} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">Sem foto</div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 pt-20">
            <h2 className="font-display text-3xl font-bold text-white">
              {card.name ?? "Membro"}{card.age ? `, ${card.age}` : ""}
            </h2>
            {card.bio && <p className="mt-1 text-sm text-white/80 line-clamp-2">{card.bio}</p>}
          </div>
        </div>
        <div className="space-y-3 p-5">
          {card.goal && <Row icon={<Heart className="h-4 w-4" />}>Buscando {GOAL_LABELS[card.goal] ?? card.goal}</Row>}
          {card.training_level && <Row icon={<Zap className="h-4 w-4" />}>Nível {LEVEL_LABELS[card.training_level] ?? card.training_level}</Row>}
          {card.modalities?.length > 0 && <Row icon={<Dumbbell className="h-4 w-4" />}>{card.modalities.slice(0, 4).join(" · ")}</Row>}
          {!card.hide_hours && card.available_hours?.length > 0 && <Row icon={<MapPin className="h-4 w-4" />}>Treina pela {card.available_hours.map(h => HOUR_LABELS[h] ?? h).join(", ")}</Row>}
          {card.interests?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {card.interests.slice(0, 6).map((it) => (
                <span key={it} className="rounded-full bg-accent px-2.5 py-1 text-xs">{it}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-center gap-6">
        <Action onClick={() => act(false)} variant="reject"><X className="h-7 w-7" /></Action>
        <Action onClick={() => act(true)} variant="like"><Heart className="h-7 w-7" /></Action>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between">
      <h1 className="font-display text-2xl font-bold">Descobrir</h1>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="text-primary">{icon}</span>{children}</div>;
}

function Action({ onClick, variant, children }: { onClick: () => void; variant: "like" | "reject"; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`grid h-16 w-16 place-items-center rounded-full border transition active:scale-95 ${
        variant === "like" ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow" : "border-border bg-card text-muted-foreground"
      }`}>{children}</button>
  );
}

function Loader() { return <div className="grid min-h-[60vh] place-items-center text-muted-foreground">Carregando...</div>; }
function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="mt-20 px-6 text-center">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      {body && <p className="mt-2 text-muted-foreground">{body}</p>}
    </div>
  );
}
