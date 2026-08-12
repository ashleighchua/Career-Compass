import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { deleteAllUserData, exportUserData, seedDemoData } from "@/lib/career.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Career Compass" },
      { name: "description", content: "Manage your demo data, exports and account." },
      { property: "og:title", content: "Settings — Career Compass" },
      { property: "og:description", content: "Manage your data and account." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const seed = useServerFn(seedDemoData);
  const wipe = useServerFn(deleteAllUserData);
  const exportAll = useServerFn(exportUserData);

  const seedMutation = useMutation({
    mutationFn: () => seed(),
    onSuccess: () => {
      toast.success("Demo profile loaded.");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const wipeMutation = useMutation({
    mutationFn: () => wipe(),
    onSuccess: () => {
      toast.success("All your career data has been deleted.");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportMutation = useMutation({
    mutationFn: () => exportAll(),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "career-evidence-export.json";
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <h1 className="font-display text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demo profile</CardTitle>
          <CardDescription>
            Load a fictional consultant moving into AI product management, with evidence and a
            target role already in place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            {seedMutation.isPending ? "Loading…" : "Load demo profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your data</CardTitle>
          <CardDescription>Export everything, or delete it all.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            Export as JSON
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Delete all your evidence, roles and assessments? This can't be undone."))
                wipeMutation.mutate();
            }}
            disabled={wipeMutation.isPending}
          >
            Delete all data
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
