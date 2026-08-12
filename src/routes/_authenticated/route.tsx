import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, FileText, Layers, ListChecks, LogOut, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/evidence", label: "Evidence", icon: FileText },
  { to: "/roles", label: "Target roles", icon: Layers },
  { to: "/actions", label: "Actions", icon: ListChecks },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="bg-sidebar border-sidebar-border shrink-0 border-b md:sticky md:top-0 md:h-screen md:w-60 md:border-e md:border-b-0">
        <div className="flex h-full flex-col gap-6 p-4">
          <Link to="/dashboard" className="font-display px-2 text-sm font-semibold tracking-tight">
            Career Compass
          </Link>
          <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sidebar-foreground/80 hover:bg-sidebar-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors"
                activeProps={{
                  className:
                    "bg-sidebar-accent text-sidebar-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
                }}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start md:hidden"
            onClick={signOut}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
          <div className="mt-auto hidden md:block">
            <p className="text-muted-foreground truncate px-3 text-xs">{user.email}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 w-full justify-start"
              onClick={signOut}
            >
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
