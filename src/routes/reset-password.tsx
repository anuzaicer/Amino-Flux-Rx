import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { useGender } from "@/components/gender/GenderContext";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — Amino Flux" },
      {
        name: "description",
        content: "Choose a new password for your Amino Flux account.",
      },
      { property: "og:title", content: "Set a new password — Amino Flux" },
      {
        property: "og:description",
        content: "Choose a new password for your Amino Flux account.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

type Phase = "checking" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { theme } = useGender();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A recovery link puts a session in place (via the URL hash) before we render.
  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) setPhase((p) => (p === "done" ? p : "ready"));
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setPhase((p) => {
        if (p !== "checking") return p;
        return data.session ? "ready" : "invalid";
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Your new password needs to be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match. Please type them again.");
      return;
    }

    setBusy(true);
    try {
      // Recovery sessions are exempt from the current-password requirement.
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setPhase("done");
      await supabase.auth.signOut();
      setTimeout(() => navigate({ to: "/auth" }), 2500);
    } catch {
      setError(
        "We couldn't change your password. Your reset link may have expired — request a new one.",
      );
    } finally {
      setBusy(false);
    }
  };

  const isWomen = theme === "women";
  const brandBackground = isWomen ? "bg-[#74B439]" : "bg-[#2173D1]";
  const buttonClass = isWomen
    ? "!bg-[#74B439] hover:!bg-[#74B439] active:!bg-[#74B439]"
    : "!bg-[#2173D1] hover:!bg-[#2173D1] active:!bg-[#2173D1]";

  return (
    <div className={`min-h-screen text-white ${brandBackground}`}>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-10 sm:px-6 sm:py-16">
        <p className="text-[15px] font-semibold uppercase tracking-[0.3em] text-white/70">
          Amino Flux Rx
        </p>
        <h1 className="mt-3 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Set a new password
        </h1>

        <div className="mt-8 w-full min-w-0 rounded-2xl bg-white p-5 text-[#0B3D8C] shadow-2xl sm:mt-10 sm:rounded-3xl sm:p-8">
          {phase === "checking" && (
            <div className="flex items-center gap-3 text-[15px] text-[#0B3D8C]/70">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your reset link…
            </div>
          )}

          {phase === "invalid" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">This reset link isn&apos;t valid anymore</h2>
              <p className="text-[15px] text-[#0B3D8C]/70">
                Reset links expire after a short time and can only be used once. Request a new one
                and we&apos;ll email you a fresh link.
              </p>
              <Link
                to="/auth"
                search={{ redirect: undefined }}
                className={`inline-flex h-10 w-full items-center justify-center rounded-md text-[15px] font-semibold text-white ${buttonClass}`}
              >
                Back to sign in
              </Link>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#5C9330]">Your password is updated</h2>
              <p className="text-[15px] text-[#0B3D8C]/70">
                You can now sign in with your new password. We&apos;re taking you to the sign-in
                page.
              </p>
              <Link
                to="/auth"
                search={{ redirect: undefined }}
                className={`inline-flex h-10 w-full items-center justify-center rounded-md text-[15px] font-semibold text-white ${buttonClass}`}
              >
                Go to sign in
              </Link>
            </div>
          )}

          {phase === "ready" && (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-[15px] text-[#0B3D8C]/70">
                Choose a new password for your account. You&apos;ll use it the next time you sign
                in.
              </p>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Type it again"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </div>

              {error && <p className="text-[15px] font-medium text-red-600">{error}</p>}

              <Button
                type="submit"
                disabled={busy}
                className={`w-full text-white transition-none ${buttonClass}`}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save new password
              </Button>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
