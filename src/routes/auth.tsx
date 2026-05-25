import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Dumbbell } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: z.object({
    mode: z.enum(["signin", "signup"]).optional(),
  }),
});

function AuthPage() {
  const nav = useNavigate();
  const { mode: modeParam } = Route.useSearch();
  const { session, isAdmin, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(modeParam ?? "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) nav({ to: isAdmin ? "/admin" : "/discover" });
  }, [loading, session, isAdmin, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Bem-vindo! Vamos configurar seu perfil...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Algo deu errado";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-10 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
          <Dumbbell className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-display text-xl font-bold">GymMatch</span>
      </div>

      <h1 className="font-display text-3xl font-bold">{mode === "signup" ? "Criar conta" : "Bem-vindo de volta"}</h1>
      <p className="mt-2 text-muted-foreground">
        {mode === "signup" ? "Cadastre-se para entrar na comunidade da sua academia." : "Faça login para continuar dando match."}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
          className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha (mín. 8 caracteres)"
          className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          disabled={busy}
          className="w-full rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {busy ? "Aguarde..." : mode === "signup" ? "Criar conta" : "Entrar"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "signup" ? "Já tem uma conta? Faça login" : "Novo por aqui? Criar uma conta"}
      </button>
    </div>
  );
}
