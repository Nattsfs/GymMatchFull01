import { useEffect, useRef, useState, useCallback } from "react";
import { X, Heart, Play, ArrowLeft, ArrowRight } from "lucide-react";

type Props = { gymName?: string };

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

const SNAP = "transform 350ms cubic-bezier(.25,.46,.45,.94)";

export function SwipeDemoSection({ gymName: _gymName }: Props) {
  const [dx, setDx] = useState(0);
  const [transition, setTransition] = useState<string | "none">("none");
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<{ text: string; color: string } | null>(null);
  const dragStart = useRef<number | null>(null);
  const reduced = prefersReducedMotion();

  const reset = useCallback(() => {
    setTransition(SNAP);
    setDx(0);
  }, []);

  const triggerSwipe = useCallback((dir: 1 | -1) => {
    if (locked) return;
    setLocked(true);
    setTransition(SNAP);
    setDx(dir * 260);
    setResult(
      dir > 0
        ? { text: "Match possível! Aguardando a outra pessoa.", color: "#3B6D11" }
        : { text: "Perfil removido. Sem chance de match.", color: "#A32D2D" },
    );
    setTimeout(() => {
      setTransition(SNAP);
      setDx(0);
      setResult(null);
      setLocked(false);
    }, 800);
  }, [locked]);

  const runDemo = useCallback(async () => {
    if (locked || reduced) return;
    setLocked(true);
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    setTransition(SNAP); setDx(70); await wait(700);
    setTransition(SNAP); setDx(0); await wait(700);
    setTransition(SNAP); setDx(-70); await wait(700);
    setTransition(SNAP); setDx(0); await wait(700);
    setLocked(false);
  }, [locked, reduced]);

  function onPointerDown(e: React.PointerEvent) {
    if (locked || reduced) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragStart.current = e.clientX;
    setTransition("none");
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragStart.current === null) return;
    setDx(e.clientX - dragStart.current);
  }
  function onPointerUp() {
    if (dragStart.current === null) return;
    const final = dx;
    dragStart.current = null;
    if (final > 90) triggerSwipe(1);
    else if (final < -90) triggerSwipe(-1);
    else reset();
  }

  const stampOpacity = Math.min(1, Math.abs(dx) / 100);

  return (
    <section
      data-testid="swipe-demo-section"
      role="region"
      aria-label="Demonstração de como funciona o swipe"
      className="border-b border-border/50 bg-card/40 px-[18px] py-4"
    >
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Como funciona o swipe
      </p>

      {reduced ? (
        <p className="text-sm text-muted-foreground">
          Arraste para a direita para curtir, para a esquerda para não curtir.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-center gap-3">
            {/* Left arrow */}
            <div className="flex flex-col items-center" style={{ color: "#A32D2D", opacity: 0.5 }}>
              <ArrowLeft className="h-5 w-5" />
              <span className="text-[11px]">Não</span>
            </div>

            {/* Card */}
            <div
              aria-label="Card de demonstração, arraste para experimentar"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                width: 150,
                height: 190,
                borderRadius: 16,
                transform: `translateX(${dx}px) rotate(${dx * 0.07}deg)`,
                transition,
                touchAction: "pan-y",
              }}
              className="relative flex select-none flex-col items-center justify-center border border-border/60 bg-background shadow-sm"
            >
              <div
                className="absolute left-1/2 top-2 -translate-x-1/2 rounded-md border px-2 py-[3px] text-[10px]"
                style={{ background: "#EEEDFE", color: "#3C3489", borderColor: "#AFA9EC" }}
              >
                demonstração
              </div>

              {/* Stamps */}
              <div
                aria-hidden
                className="absolute left-2 top-9 rounded-md border px-2 py-[2px] text-[12px] font-medium"
                style={{
                  background: "#EAF3DE", color: "#27500A", borderColor: "#639922", borderWidth: 1.5,
                  transform: "rotate(-8deg)",
                  opacity: dx > 0 ? stampOpacity : 0,
                }}
              >GOSTEI</div>
              <div
                aria-hidden
                className="absolute right-2 top-9 rounded-md border px-2 py-[2px] text-[12px] font-medium"
                style={{
                  background: "#FCEBEB", color: "#791F1F", borderColor: "#E24B4A", borderWidth: 1.5,
                  transform: "rotate(8deg)",
                  opacity: dx < 0 ? stampOpacity : 0,
                }}
              >NÃO</div>

              <div
                className="grid h-12 w-12 place-items-center rounded-full text-[15px] font-medium"
                style={{ background: "#E6F1FB", color: "#0C447C" }}
              >EX</div>
              <p className="mt-2 text-[13px] font-medium">Exemplo, 25</p>
              <p className="text-[11px] text-muted-foreground">Musculação · Iniciante</p>
            </div>

            {/* Right arrow */}
            <div className="flex flex-col items-center" style={{ color: "#3B6D11", opacity: 0.5 }}>
              <ArrowRight className="h-5 w-5" />
              <span className="text-[11px]">Sim</span>
            </div>
          </div>

          {/* Hint row */}
          <div className="mt-3 flex items-center justify-center gap-2 text-[12px]">
            <span className="flex items-center gap-1" style={{ color: "#A32D2D" }}>
              <X className="h-3.5 w-3.5" /> arraste para não curtir
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1" style={{ color: "#3B6D11" }}>
              curtir arraste <Heart className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* Buttons */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              aria-label="Simular rejeição"
              onClick={() => triggerSwipe(-1)}
              disabled={locked}
              className="flex items-center gap-2 rounded-[9px] border px-4 py-2 text-[13px] font-medium disabled:opacity-50"
              style={{ background: "#FCEBEB", borderColor: "#E24B4A", color: "#791F1F" }}
            >
              <X className="h-4 w-4" /> Não
            </button>
            <button
              aria-label="Reproduzir demonstração"
              onClick={runDemo}
              disabled={locked}
              className="flex items-center gap-2 rounded-[9px] border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground disabled:opacity-50"
            >
              <Play className="h-4 w-4" /> Demo
            </button>
            <button
              aria-label="Simular curtida"
              onClick={() => triggerSwipe(1)}
              disabled={locked}
              className="flex items-center gap-2 rounded-[9px] border px-4 py-2 text-[13px] font-medium disabled:opacity-50"
              style={{ background: "#EAF3DE", borderColor: "#639922", color: "#27500A" }}
            >
              <Heart className="h-4 w-4" /> Sim
            </button>
          </div>

          <p
            className="mt-2 text-center text-[12px] font-medium"
            style={{ minHeight: 16, color: result?.color ?? "transparent" }}
          >
            {result?.text ?? "·"}
          </p>
        </>
      )}
    </section>
  );
}
