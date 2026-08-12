import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  analyseRole,
  assessRole,
  createRole,
  deleteRole,
  listRoles,
  setActiveRole,
} from "@/lib/career.functions";

export const Route = createFileRoute("/_authenticated/roles/")({
  head: () => ({
    meta: [
      { title: "Target roles — Career Evidence Engine" },
      {
        name: "description",
        content: "Paste a job description and see exactly which requirements your evidence covers.",
      },
      { property: "og:title", content: "Target roles — Career Evidence Engine" },
      {
        property: "og:description",
        content: "Assess your evidence against a real job description.",
      },
    ],
  }),
  component: RolesPage,
});

type RoleRow = {
  id: string;
  title: string;
  company: string | null;
  is_active: boolean;
  analysis_status: string | null;
  assessment_status: string | null;
};

function RolesPage() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listRoles);
  const create = useServerFn(createRole);
  const parse = useServerFn(analyseRole);
  const assess = useServerFn(assessRole);
  const activate = useServerFn(setActiveRole);
  const remove = useServerFn(deleteRole);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", company: "", job_description: "" });

  const { data, isLoading } = useQuery({ queryKey: ["roles"], queryFn: () => fetchAll() });
  const invalidate = () => void qc.invalidateQueries();
  const fail = (e: Error) => toast.error(e.message);

  const createMutation = useMutation({
    mutationFn: async () => {
      const created = await create({
        data: {
          title: form.title.trim(),
          company: form.company.trim() || null,
          job_description: form.job_description.trim() || null,
        },
      });
      if (form.job_description.trim()) {
        await parse({ data: { id: created.id } });
        await assess({ data: { id: created.id } });
      }
      return created;
    },
    onSuccess: () => {
      toast.success("Role analysed against your evidence.");
      setForm({ title: "", company: "", job_description: "" });
      setOpen(false);
      invalidate();
    },
    onError: fail,
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => activate({ data: { id } }),
    onSuccess: invalidate,
    onError: fail,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
    onError: fail,
  });

  const roles = (data ?? []) as unknown as RoleRow[];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Target roles</h1>
          <p className="text-muted-foreground text-sm">
            Paste a real job description. We extract what it actually requires, then check it
            against your evidence.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add role</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Add a target role</DialogTitle>
              <DialogDescription>
                The more of the original posting you paste, the sharper the assessment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Role title</Label>
                <Input
                  value={form.title}
                  maxLength={200}
                  placeholder="AI Product Manager"
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Company (optional)</Label>
                <Input
                  value={form.company}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Job description</Label>
                <Textarea
                  rows={10}
                  maxLength={40000}
                  value={form.job_description}
                  placeholder="Paste the full posting here"
                  onChange={(e) => setForm({ ...form, job_description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (!form.title.trim()) {
                    toast.error("Give the role a title");
                    return;
                  }
                  createMutation.mutate();
                }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Analysing…" : "Add & analyse"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : roles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No target roles yet</CardTitle>
            <CardDescription>Add one to see your evidence coverage.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {role.title}
                    {role.is_active ? (
                      <span className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-xs">
                        Active
                      </span>
                    ) : null}
                  </CardTitle>
                  <CardDescription>
                    {role.company ?? "No company"} · assessment{" "}
                    {role.assessment_status ?? "pending"}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  {!role.is_active ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => activateMutation.mutate(role.id)}
                    >
                      <Star className="size-4" /> Make active
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Delete role"
                    onClick={() => deleteMutation.mutate(role.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link to="/roles/$roleId" params={{ roleId: role.id }}>
                  Open assessment
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
