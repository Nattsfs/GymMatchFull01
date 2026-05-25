import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
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

const SWIPE_THRESHOLD = 80;
const SWIPE_OUT_X = 650;

function Discover() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [loading, setLoading] = useState(true);

  // Swipe state
  const startXRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flyingOut, setFlyingOut] = useState(false);

  // Reset swipe state on card change
  useEffect(() => {
    setDragX(0);
    setDragging(false);
    setFlyingOut(false);
  }, [i]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: myGymRows } = await supabase
      .from("user_gyms").select("gym_id").eq("user_id", user.id);
    const myGymIds: string[] = myGymRows?.map((r) => r.gym_id as string) ?? [];
    if (myGymIds.length === 0 && profile?.gym_id) myGymIds.push(profile.gym_id);

    if (myGymIds.length === 0) {
      setCards([]);
      setLoading(false);
      return;
    }

    const { data: sharedRows } = await supabase
      .from("user_gyms").select("user_id")
      .in("gym_id", myGymIds)
      .neq("user_id", user.id);
    const viaTableIds = [...new Set(sharedRows?.map((r) => r.user_id as string) ?? [])];

    const { data: liked } = await supabase
      .from("likes").select("to_user").eq("from_user", user.id);
    const likedIds = liked?.map((l) => l.to_user) ?? [];

    const { data: blocks } = await supabase
      .from("blocks").select("blocker_id,blocked_id")
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
    const blockedIds = (blocks ?? []).flatMap((b: any) =>
      [b.blocker_id, b.blocked_id].filter((id) => id !== user.id)
    );

    const exclude = new Set([user.id, ...likedIds, ...blockedIds]);
    const filteredViaTable = viaTableIds.filter((id) => !exclude.has(id));

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
    if (data?.pending) {
      toast("Curtida enviada! Aguarde a resposta. 💜", { duration: 2500 });
    }
    if (data?.matched && data?.match_id) {
      toast.success(`Deu match com ${target.name ?? "alguém da academia"}! 🔥`, {
        description: "Abrindo o chat para vocês conversarem...",
        duration: 4000,
        action: {
          label: "Abrir chat",
          onClick: () => nav({ to: "/chat/$matchId", params: { matchId: data.match_id! } }),
        },
      });
      setTimeout(() => {
        nav({ to: "/chat/$matchId", params: { matchId: data.match_id! } });
      }, 1200);
      return;
    }
    setI((x) => x + 1);
  }

  function triggerSwipe(isLike: boolean) {
    if (flyingOut) return;
    setFlyingOut(true);
    setDragX(isLike ? SWIPE_OUT_X : -SWIPE_OUT_X);
    setTimeout(() => act(isLike), 320);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (flyingOut) return;
    startXRef.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || flyingOut) return;
    e.preventDefault();
    setDragX(e.clientX - startXRef.current);
  }

  function onPointerUp() {
    if (!dragging || flyingOut) return;
    setDragging(false);
    if (Math.abs(dragX) >= SWIPE_THRESHOLD) {
      const isLike = dragX > 0;
      setFlyingOut(true);
      setDragX(isLike ? SWIPE_OUT_X : -SWIPE_OUT_X);
      setTimeout(() => act(isLike), 320);
    } else {
      setDragX(0);
    }
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

  const rotate = dragX * 0.07;
  const likeOpacity = Math.max(0, Math.min(dragX / SWIPE_THRESHOLD, 1));
  const nopeOpacity = Math.max(0, Math.min(-dragX / SWIPE_THRESHOLD, 1));

  const cardStyle: React.CSSProperties = {
    transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
    transition: dragging ? "none" : "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    cursor: dragging ? "grabbing" : "grab",
    touchAction: "none",
    userSelect: "none",
  };

  return (
    <div className="px-4 pt-6">
      <Header />

      {/* Swipeable card */}
      <div
        key={card.id}
        style={cardStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="mt-4 overflow-hidden rounded-3xl border border-border bg-card shadow-glow will-change-transform"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          {card.photo_url ? (
            <img
              src={card.photo_url}
              alt={card.name ?? ""}
              className="h-full w-full object-cover pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">Sem foto</div>
          )}

          {/* CURTIR overlay */}
          <div
            className="absolute inset-0 flex items-start justify-start p-6 pointer-events-none"
            style={{ opacity: likeOpacity }}
          >
            <div className="rounded-xl border-4 border-green-400 px-4 py-2 rotate-[-20deg]">
              <span className="text-2xl font-black text-green-400 tracking-widest">CURTIR</span>
            </div>
          </div>

          {/* NOPE overlay */}
          <div
            className="absolute inset-0 flex items-start justify-end p-6 pointer-events-none"
            style={{ opacity: nopeOpacity }}
          >
            <div className="rounded-xl border-4 border-red-400 px-4 py-2 rotate-[20deg]">
              <span className="text-2xl font-black text-red-400 tracking-widest">NOPE</span>
            </div>
          </div>

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

      {/* Buttons */}
      <div className="mt-6 flex items-center justify-center gap-6">
        <Action onClick={() => triggerSwipe(false)} variant="reject"><X className="h-7 w-7" /></Action>
        <Action onClick={() => triggerSwipe(true)} variant="like"><Heart className="h-7 w-7" /></Action>
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
    <button
      type="button"
      onClick={onClick}
      className={`grid h-16 w-16 place-items-center rounded-full border transition active:scale-95 ${
        variant === "like"
          ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      {children}
    </button>
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
