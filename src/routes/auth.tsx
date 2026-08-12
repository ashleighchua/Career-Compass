import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const searchSchema = z.object({ demo: z.boolean().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Career Compass" },
      {
        name: "description",
        content: "Sign in to assess your evidence against the role you want next.",
      },
      { property: "og:title", content: "Sign in — Career Compass" },
      {
        property: "og:description",
        content: "Sign in to assess your evidence against the role you want next.",
      },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      ...parsed.data,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name.trim() || null },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSentConfirmation(true);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-display text-sm font-semibold tracking-tight">
          Career Compass
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pt-6 pb-20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-display text-xl">Your evidence, in one place</CardTitle>
            <CardDescription>
              Sign in to assess what you've already proven against the role you want next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {sentConfirmation ? (
              <p className="text-sm">
                Check your email to confirm your address, then come back and sign in.
              </p>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={google}
                >
                  Continue with Google
                </Button>
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Tabs defaultValue="signin">
                  <TabsList className="w-full">
                    <TabsTrigger value="signin" className="flex-1">
                      Sign in
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="flex-1">
                      Create account
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="signin">
                    <form onSubmit={signIn} className="mt-4 space-y-4">
                      <Field
                        id="email"
                        label="Email"
                        type="email"
                        value={email}
                        onChange={setEmail}
                      />
                      <Field
                        id="password"
                        label="Password"
                        type="password"
                        value={password}
                        onChange={setPassword}
                        autoComplete="current-password"
                      />
                      <Button type="submit" className="w-full" disabled={busy}>
                        Sign in
                      </Button>
                    </form>
                  </TabsContent>
                  <TabsContent value="signup">
                    <form onSubmit={signUp} className="mt-4 space-y-4">
                      <Field id="name" label="Name" value={name} onChange={setName} />
                      <Field
                        id="email-up"
                        label="Email"
                        type="email"
                        value={email}
                        onChange={setEmail}
                      />
                      <Field
                        id="password-up"
                        label="Password"
                        type="password"
                        value={password}
                        onChange={setPassword}
                        autoComplete="new-password"
                      />
                      <Button type="submit" className="w-full" disabled={busy}>
                        Create account
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        maxLength={255}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete ?? "on"}
      />
    </div>
  );
}
