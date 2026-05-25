import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Dumbbell, QrCode, Heart, Users } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { session, isAdmin, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      nav({ to: isAdmin ? "/admin" : "/discover" });
    }
  }, [loading, session, isAdmin, nav]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-6 pt-10 pb-16">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Dumbbell className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">GymMatch</span>
        </div>

        <div className="mt-16">
          <h1 className="font-display text-5xl font-extrabold leading-[1.05]">
            Encontre sua <span className="bg-gradient-primary bg-clip-text text-transparent">galera da academia.</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Parceiros de treino, amizades ou algo a mais — só pessoas da sua academia. Escaneie o QR Code na sua academia para entrar.
          </p>
        </div>

        <div className="mt-10 grid gap-3">
          <Feature icon={<QrCode className="h-5 w-5" />} title="Escaneie" body="Procure o QR Code na recepção. Confirme seu telefone e perfil." />
          <Feature icon={<Heart className="h-5 w-5" />} title="Dê match" body="Veja membros de verdade — mesma academia, mesma vibe." />
          <Feature icon={<Users className="h-5 w-5" />} title="Conecte-se" body="Converse depois do match. Treine. Saia. Repita." />
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            to="/auth"
            className="rounded-2xl bg-gradient-primary px-6 py-4 text-center font-semibold text-primary-foreground shadow-glow"
          >
            Começar agora
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="rounded-2xl border border-border bg-card px-6 py-4 text-center font-medium"
          >
            Já tenho uma conta
          </Link>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Apenas 18+ · Em conformidade com a LGPD · Ao continuar você aceita os Termos e a Política de Privacidade.
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">{icon}</div>
      <div>
        <div className="font-display font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}
