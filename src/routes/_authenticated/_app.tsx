import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { LuciaNotif } from "@/components/LuciaNotif";
import { registerSW } from "@/lib/push";

export const Route = createFileRoute("/_authenticated/_app")({ component: AppLayout });

function AppLayout() {
  useEffect(() => { registerSW(); }, []);

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <LuciaNotif />
      <Outlet />
      <BottomNav />
    </div>
  );
}
