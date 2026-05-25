import { useEffect, useRef, useState, useCallback } from "react";
import { Heart, X, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { markSwipeDemoSeen } from "@/lib/lucia";

type Props = {
  open: boolean;
  onClose: () => void;
  gymName?: string | null;
};

const THRESHOLD = 90;

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function SwipeDemoCard({ open, onClose, gymName }: Props) {
  const [dx, setDx] = useState(0);
  const [transition, setTransition] = useState(true);
  const [phase, setPhase] = useState<"auto" | "manual" | "leaving">("auto");
  const [leaveDir, setLeaveDir] = useState<0 | 1 | -1>(0);
  const [stamp, setStamp] = useState<"like" | "nope" | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const reduced = prefersReducedMotion();

  const close = useCallback(() => {
    markSwipeDemoSeen();
    setPhase("auto");
    setDx(0);
    setStamp(null);
    setLeaveDir(0);
    onClose();
    toast.success("Agora é com você!", { duration: 2000 });
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    overlayRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, close]);

  // Auto-play animation sequence
  useEffect(() => {
    if (!open || phase !== "auto") return;
    if (reduced) {
      setPhase("manual");
      return;
    }
    let cancelled = false;
    const seq = async () => {
      const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
      // a. slide right
      setTransition(true); setDx(80); setStamp("like"); await wait(700);
      if (cancelled) return;
      // b. return
      setDx(0); setStamp(null); await wait(400);
      if (cancelled) return;
      // c. slide left
      setDx(-80); setStamp("nope"); await wait(700);
      if (cancelled) return;
      // d. return
      setDx(0); setStamp(null); await wait(400);
      if (cancelled) return;
      setPhase("manual");
    };
    seq();
    return () => { cancelled = true; };
  }, [open, phase, reduced]);

  function commit(isLike: boolean) {
    setTransition(true);
    setLeaveDir(isLike ? 1 : -1);
    setDx(isLike ? 600 : -600);
    setStamp(isLike ? "like" : "nope");
    setPhase("leaving");
    setTimeout(() => {
      toast(isLike ? "Match possível! Aguardando a outra pessoa." : "Perfil removido. Sem chance de match.");
      close();
    }, 350);
  }

  // Drag handlers
  function onPointerDown(e: React.PointerEvent) {
    if (phase === "leaving") return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragStart.current = e.clientX;
    setTransition(false);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragStart.current === null) return;
    const delta = e.clientX - dragStart.current;
    setDx(delta);
    if (delta > 10) setStamp("like");
    else if (delta < -10) setStamp("nope");
    else setStamp(null);
  }
  function onPointerUp() {
    if (dragStart.current === null) return;
    dragStart.current = null;
    setTransition(true);
    if (dx > THRESHOLD) commit(true);
    else if (dx < -THRESHOLD) commit(false);
    else { setDx(0); setStamp(null); }
  }

  if (!open) return null;

  const rot = dx / 20;
  const stampOpacity = Math.min(1, Math.abs(dx) / THRESHOLD);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Demonstração de como deslizar os perfis"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 px-4 backdrop-blur"
    >
      <button
        onClick={close}
        aria-label="Fechar demonstração"
        className="absolute right-4 top-4 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium"
      >
        Fechar demo
      </button>

      <div className="relative w-full max-w-sm">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            transform: `translateX(${dx}px) rotate(${rot}deg)`,
            transition: transition && !reduced ? "transform 300ms ease-out" : "none",
            touchAction: "pan-y",
          }}
          className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-glow"
        >
          {/* DEMO badge */}
          <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold tracking-wider text-primary-foreground">
            DEMONSTRAÇÃO
          </div>

          {/* Stamps */}
          {stamp === "like" && (
            <div
              aria-hidden
              className="absolute left-4 top-14 z-10"
              style={{
                opacity: phase === "auto" || phase === "leaving" ? 1 : stampOpacity,
                transform: "rotate(-8deg)",
                background: "#EAF3DE",
                border: "3px solid #639922",
                color: "#27500A",
                padding: "4px 14px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "0.05em",
              }}
            >GOSTEI</div>
          )}
          {(stamp === "nope") && (
            <div
              aria-hidden
              className="absolute right-4 top-14 z-10"
              style={{
                opacity: phase === "auto" || phase === "leaving" ? 1 : stampOpacity,
                transform: "rotate(8deg)",
                background: "#FCEBEB",
                border: "3px solid #E24B4A",
                color: "#791F1F",
                padding: "4px 14px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "0.05em",
              }}
            >NÃO</div>
          )}

          <div className="grid aspect-[3/4] w-full place-items-center bg-gradient-to-br from-accent to-muted">
            <div className="grid h-32 w-32 place-items-center rounded-full bg-card font-display text-5xl font-bold text-primary shadow-glow">
              Ex
            </div>
          </div>
          <div className="p-5">
            <h3 className="font-display text-2xl font-bold">Exemplo, 28</h3>
            <p className="mt-1 text-sm text-muted-foreground">{gymName ?? "Sua academia"}</p>
            {reduced && (
              <p className="mt-3 text-sm">
                Arraste para a direita para curtir, para a esquerda para não curtir.
              </p>
            )}
          </div>
        </div>
      </div>

      {phase === "manual" && (
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={() => commit(false)}
            aria-label="Arrastar para a esquerda para não curtir"
            className="flex items-center gap-2 rounded-full border-2 px-5 py-2.5 font-semibold"
            style={{ borderColor: "#E24B4A", color: "#791F1F" }}
          >
            <X className="h-5 w-5" /> Não gostei
          </button>
          <button
            onClick={() => commit(true)}
            aria-label="Arrastar para a direita para curtir"
            className="flex items-center gap-2 rounded-full border-2 px-5 py-2.5 font-semibold"
            style={{ borderColor: "#639922", color: "#27500A" }}
          >
            <Heart className="h-5 w-5" /> Gostei
          </button>
        </div>
      )}

      {phase === "auto" && (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <PlayCircle className="h-4 w-4" /> Mostrando como funciona...
        </p>
      )}
    </div>
  );
}
