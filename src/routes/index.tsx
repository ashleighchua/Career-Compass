import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Compass, FileText, Repeat } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Career Compass — prove what you can do next" },
      {
        name: "description",
        content:
          "Assess your evidence against a target role, find the difference between a skill gap and an evidence gap, and build the proof that closes it.",
      },
      { property: "og:title", content: "Career Compass" },
      {
        property: "og:description",
        content: "Turn everything you've done into evidence of what you can do next.",
      },
    ],
  }),
  component: Landing,
});

const LOOP = [
  { icon: Compass, title: "Assess", body: "Score your evidence against a real job description." },
  { icon: FileText, title: "Recommend", body: "Get the few actions that move coverage most." },
  { icon: CheckCircle2, title: "Build", body: "Do the work — a project, a write-up, a pilot." },
  {
    icon: Repeat,
    title: "Capture & reassess",
    body: "Log it as evidence and watch coverage move.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-sm font-semibold tracking-tight">
          Career Compass
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-16 md:py-28">
          <p className="text-sm font-medium text-primary">Assess → Recommend → Build → Reassess</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-semibold text-balance md:text-6xl">
            Turn everything you've done into evidence of what you can do next.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-xl text-lg">
            Most career tools tell you what you're missing. This one tells you whether you're
            actually missing the skill — or just the proof.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Start with your evidence <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ demo: true }}>
                See it with demo data
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-16 md:grid-cols-2">
          <div className="border-evidence-gap/30 bg-evidence-gap-soft rounded-xl border p-6">
            <h2 className="text-evidence-gap-foreground font-display text-lg font-semibold">
              Evidence gap
            </h2>
            <p className="text-evidence-gap-foreground/80 mt-2 text-sm">
              You've done it — in a different context, under a different title, or without ever
              writing it down. The fix is packaging, not years of study.
            </p>
          </div>
          <div className="border-skill-gap/30 bg-skill-gap-soft rounded-xl border p-6">
            <h2 className="text-skill-gap-foreground font-display text-lg font-semibold">
              Skill gap
            </h2>
            <p className="text-skill-gap-foreground/80 mt-2 text-sm">
              The capability genuinely isn't there yet. The fix is a deliberate, scoped piece of
              work that produces something you can point at.
            </p>
          </div>
        </section>

        <section className="grid gap-6 border-t py-16 md:grid-cols-4">
          {LOOP.map((step) => (
            <div key={step.title}>
              <step.icon className="text-primary size-5" />
              <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{step.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="text-muted-foreground mx-auto max-w-6xl border-t px-6 py-8 text-xs">
        Career Compass — evidence-first career planning.
      </footer>
    </div>
  );
}
