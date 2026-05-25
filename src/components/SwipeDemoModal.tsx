import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Heart, X } from "lucide-react";

const DEMO_PROFILE = {
  initials: "EX",
  name: "Exemplo, 25",
  sub: "Musculação · Iniciante",
};

type Props = { visible: boolean; onClose: () => void };

export function SwipeDemoModal({ visible, onClose }: Props) {
  const [offsetX, setOffsetX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [result, setResult] = useState<string>("");
  const [demoRunning, setDemoRunning] = useState(false);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      setOffsetX(0);
      setAnimating(false);
      setResult("");
      setDemoRunning(false);
    }
  }, [visible]);

  const likeOpacity = Math.min(Math.max(offsetX / 90, 0), 1) * 0.9;
  const nopeOpacity = Math.min(Math.max(-offsetX / 90, 0), 1) * 0.9;

  function resetCard(delay = 900) {
    setTimeout(() => {
      setAnimating(true);
      setOffsetX(0);
      setTimeout(() => {
        setAnimating(false);
        setResult("");
      }, 250);
    }, delay);
  }

  function commit(direction: "like" | "nope") {
    setAnimating(true);
    setOffsetX(direction === "like" ? 600 : -600);
    setResult(direction === "like" ? "Match possível!" : "Perfil removido.");
    resetCard(900);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (demoRunning) return;
    draggingRef.current = true;
    startXRef.current = e.clientX - offsetX;
    setAnimating(false);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    setOffsetX(e.clientX - startXRef.current);
  }
  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (offsetX > 90) commit("like");
    else if (offsetX < -90) commit("nope");
    else {
      setAnimating(true);
      setOffsetX(0);
      setTimeout(() => setAnimating(false), 200);
    }
  }

  async function runDemo() {
    if (demoRunning) return;
    setDemoRunning(true);
    setResult("");
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    setAnimating(true);
    setOffsetX(80);
    await wait(700);
    setOffsetX(0);
    await wait(700);
    setOffsetX(-80);
    await wait(700);
    setOffsetX(0);
    await wait(300);
    setAnimating(false);
    setDemoRunning(false);
  }

  return (
    <Dialog open={visible} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-5">
        <div className="text-center text-xs uppercase tracking-wider text-muted-foreground">demonstração</div>

        <div className="relative mt-3 flex items-center justify-center" style={{ height: 340 }}>
          <button
            aria-label="Não"
            className="absolute left-0 z-10 grid h-9 w-9 place-items-center rounded-full text-red-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            aria-label="Sim"
            className="absolute right-0 z-10 grid h-9 w-9 place-items-center rounded-full text-green-500"
          >
            <ArrowRight className="h-5 w-5" />
          </button>

          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative h-[320px] w-[220px] cursor-grab touch-none select-none rounded-2xl border border-border bg-card shadow-glow active:cursor-grabbing"
            style={{
              transform: `translateX(${offsetX}px) rotate(${offsetX / 20}deg)`,
              transition: animating ? "transform 250ms ease" : "none",
            }}
          >
            <span
              className="absolute left-3 top-3 rounded-md border-2 border-green-500 px-2 py-1 text-sm font-bold text-green-500"
              style={{ transform: "rotate(-8deg)", opacity: likeOpacity }}
            >
              GOSTEI
            </span>
            <span
              className="absolute right-3 top-3 rounded-md border-2 border-red-500 px-2 py-1 text-sm font-bold text-red-500"
              style={{ transform: "rotate(8deg)", opacity: nopeOpacity }}
            >
              NÃO
            </span>

            <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-accent text-xl font-bold text-foreground">
                {DEMO_PROFILE.initials}
              </div>
              <div className="text-center">
                <div className="font-display text-lg font-bold">{DEMO_PROFILE.name}</div>
                <div className="text-xs text-muted-foreground">{DEMO_PROFILE.sub}</div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          arraste para não curtir · curtir arraste
        </p>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => commit("nope")}
            className="grid h-12 w-12 place-items-center rounded-full border border-red-500/40 text-red-500 hover:bg-red-500/10"
            aria-label="Não"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={runDemo}
            disabled={demoRunning}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Demo
          </button>
          <button
            onClick={() => commit("like")}
            className="grid h-12 w-12 place-items-center rounded-full border border-green-500/40 text-green-500 hover:bg-green-500/10"
            aria-label="Sim"
          >
            <Heart className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 h-5 text-center text-sm text-muted-foreground">{result}</div>
      </DialogContent>
    </Dialog>
  );
}
