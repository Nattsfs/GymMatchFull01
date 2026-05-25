import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated/_app")({ component: AppLayout });

function AppLayout() {
  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <Outlet />
      <BottomNav />
    </div>
  );
}
