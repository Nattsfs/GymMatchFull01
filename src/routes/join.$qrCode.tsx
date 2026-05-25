import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell } from "lucide-react";

export const Route = createFileRoute("/join/$qrCode")({ component: Join });

function Join() {
  const { qrCode } = useParams({ from: "/join/$qrCode" });
  const [gym, setGym] = useState<{ id: string; name: string; address: string | null } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pending_gym_code", qrCode);
    }
    supabase.from("gyms").select("id,name,address").eq("qr_code", qrCode).eq("active", true).maybeSingle().then(({ data }) => {
      if (!data) setNotFound(true);
      else setGym(data);
    });
  }, [qrCode]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
          <Dumbbell className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-display text-xl font-bold">GymMatch</span>
      </div>

      <div className="mt-20 text-center">
        {notFound ? (
          <>
            <h1 className="font-display text-3xl font-bold">QR Code não reconhecido</h1>
            <p className="mt-3 text-muted-foreground">Peça à equipe da sua academia um QR Code ativo do GymMatch.</p>
          </>
        ) : (
          <>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Bem-vindo à</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold">
              {gym?.name ?? "Carregando..."}
            </h1>
            {gym?.address && <p className="mt-2 text-muted-foreground">{gym.address}</p>}
            <Link
              to="/auth"
              className="mt-10 inline-block rounded-2xl bg-gradient-primary px-8 py-4 font-semibold text-primary-foreground shadow-glow"
            >
              Entrar nesta academia
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
