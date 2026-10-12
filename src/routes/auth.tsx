import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Mars, Venus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/amino-flux-logo-transparent.png";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGender } from "@/components/gender/GenderContext";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect:
      typeof search.redirect === "string" &&
      search.redirect.startsWith("/") &&
      !search.redirect.startsWith("//")
        ? search.redirect
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign In — Amino Flux" },
      {
        name: "description",
        content:
          "Sign in or create your Amino Flux account to manage orders, lab panels, and consultations.",
      },
      { property: "og:title", content: "Sign In — Amino Flux" },
      {
        property: "og:description",
        content:
          "Sign in or create your Amino Flux account to manage orders, lab panels, and consultations.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { theme } = useGender();
  const { redirect: redirectTo } = Route.useSearch();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [forgot, setForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGenderChoice] = useState<"men" | "women" | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    title: string;
    detail: string;
    redirect: boolean;
  } | null>(null);

  // Persist the intended destination so OAuth round-trips keep it.
  useEffect(() => {
    if (redirectTo) window.sessionStorage.setItem("af:redirect", redirectTo);
  }, [redirectTo]);

  const destination =
    redirectTo ??
    (typeof window !== "undefined"
      ? (window.sessionStorage.getItem("af:redirect") ?? undefined)
      : undefined);

  useEffect(() => {
    if (!loading && user && !success) {
      window.sessionStorage.removeItem("af:redirect");
      navigate({ to: destination ?? "/account" });
    }
  }, [loading, user, navigate, destination, success]);

  useEffect(() => {
    if (!success?.redirect) return;
    const timer = window.setTimeout(() => {
      window.sessionStorage.removeItem("af:redirect");
      navigate({ to: destination ?? "/account" });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [success, navigate, destination]);

  const sendReset = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Never reveal whether the address exists.
      setResetSent(true);
    } catch {
      setError("We couldn't send the email just now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        setSuccess({
          title: "Welcome back",
          detail: "You’re signed in. Taking you to your account now.",
          redirect: true,
        });
      } else {
        if (!gender) {
          setError("Please select Men or Women so we can personalize your care.");
          setBusy(false);
          return;
        }
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, gender_preference: gender },
            emailRedirectTo: window.location.origin,
          },
        });
        if (err) throw err;
        setSuccess({
          title: "Check your email",
          detail: "We sent you a confirmation link. Confirm your email, then return here to sign in.",
          redirect: false,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const isWomen = theme === "women";
  const themeClass = isWomen ? "auth-theme-women" : "";

  return (
    <div className={`${themeClass} min-h-dvh bg-auth-canvas text-auth-ink`}>
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <Link to="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-accent">
          <img src={logoAsset} alt="Amino Flux Rx" className="h-auto w-36 sm:w-40" />
        </Link>
        <h1 className="mt-5 text-center font-display text-3xl font-bold sm:text-4xl">Account login</h1>
        <p className="mt-2 text-center text-[15px] text-auth-copy">
          Access your secure care dashboard
        </p>

        <div className="mt-7 w-full min-w-0 rounded-2xl border border-auth-border bg-auth-surface p-4 shadow-[var(--auth-shadow)] sm:mt-8 sm:p-7">
          {forgot ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-2xl font-bold">Reset your password</h2>
                <p className="mt-2 text-[15px] leading-6 text-auth-copy">
                  Enter your email and we’ll send you a secure reset link.
                </p>
              </div>
              {resetSent ? (
                <>
                  <p className="text-[15px] leading-6 text-auth-copy">
                    If an account exists for this email, you&apos;ll receive a reset link. It can
                    take a couple of minutes — remember to check your spam folder.
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      setForgot(false);
                      setResetSent(false);
                    }}
                    className="h-12 w-full bg-auth-accent text-auth-accent-foreground hover:bg-auth-accent/90"
                  >
                    Back to sign in
                  </Button>
                </>
              ) : (
                <form onSubmit={sendReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                  {error && <p className="text-[15px] font-medium text-destructive">{error}</p>}
                  <Button
                    type="submit"
                    disabled={busy}
                    className="h-12 w-full bg-auth-accent text-auth-accent-foreground hover:bg-auth-accent/90"
                  >
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send reset link
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setForgot(false);
                      setError(null);
                    }}
                    className="w-full text-[14px] font-semibold text-auth-copy hover:bg-transparent hover:text-auth-ink"
                  >
                    Back to sign in
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <Tabs
              value={mode}
              onValueChange={(v) => {
                setMode(v as "signin" | "signup");
                setError(null);
                setMessage(null);
              }}
            >
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-auth-border/60 p-1">
                <TabsTrigger
                  value="signin"
                  className="rounded-lg text-auth-copy data-[state=active]:bg-auth-control data-[state=active]:text-auth-ink data-[state=active]:shadow-sm"
                >
                  Log in
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-lg text-auth-copy data-[state=active]:bg-auth-control data-[state=active]:text-auth-ink data-[state=active]:shadow-sm"
                >
                  Register
                </TabsTrigger>
              </TabsList>

              <form onSubmit={submit} className="mt-7 space-y-5">
                <div>
                  <h2 className="font-display text-2xl font-bold">
                    {mode === "signin" ? "Welcome back" : "Create your account"}
                  </h2>
                  <p className="mt-1.5 text-[15px] text-auth-copy">
                    {mode === "signin"
                      ? "Enter your details to continue your care journey."
                      : "Start with a few details. Your health information stays secure."}
                  </p>
                </div>
                <TabsContent value="signup" className="m-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Rivera"
                      required={mode === "signup"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>I&apos;m shopping for</Label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {[
                        { id: "men" as const, label: "Men", Icon: Mars },
                        { id: "women" as const, label: "Women", Icon: Venus },
                      ].map(({ id, label, Icon }) => (
                        <Button
                          key={id}
                          type="button"
                          variant="outline"
                          onClick={() => setGenderChoice(id)}
                          aria-pressed={gender === id}
                          className={`h-12 min-w-0 gap-2 rounded-xl border-auth-border bg-auth-control text-[15px] font-semibold text-auth-copy hover:bg-auth-control hover:text-auth-ink ${gender === id ? "border-auth-accent text-auth-accent ring-1 ring-auth-accent" : ""}`}
                        >
                          <Icon className="h-4 w-4" /> {label}
                        </Button>
                      ))}
                    </div>
                    <p className="text-[14px] leading-5 text-auth-copy">
                      This personalizes your experience and can&apos;t be changed after signup.
                    </p>
                  </div>
                </TabsContent>

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <Button
                        variant="link"
                        type="button"
                        onClick={() => {
                          setForgot(true);
                          setResetSent(false);
                          setError(null);
                          setMessage(null);
                        }}
                        className="h-auto p-0 text-[14px] font-semibold text-auth-accent"
                      >
                        Forgot password?
                      </Button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      className="pr-12"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword((shown) => !shown)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-auth-copy hover:bg-auth-border/50"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {error && <p className="text-[15px] font-medium text-destructive">{error}</p>}
                {message && <p className="text-[15px] font-medium text-auth-accent">{message}</p>}

                <Button
                  type="submit"
                  disabled={busy}
                  className="h-12 w-full bg-auth-accent text-base font-semibold text-auth-accent-foreground shadow-lg shadow-auth-accent/20 hover:bg-auth-accent/90"
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signin" ? "Log in" : "Create account"}
                </Button>
              </form>
            </Tabs>
          )}
        </div>
        <Link
          to="/"
          className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-[15px] font-medium text-auth-copy transition hover:text-auth-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </main>

      <AnimatePresence>
        {success && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-auth-ink/45 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-success-title"
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl border border-auth-border bg-auth-surface p-6 text-center shadow-[var(--auth-shadow)] sm:p-8"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
            >
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-auth-accent text-auth-accent-foreground shadow-lg shadow-auth-accent/25">
                <Check className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <h2 id="auth-success-title" className="mt-5 font-display text-2xl font-bold">
                {success.title}
              </h2>
              <p className="mt-2 text-[15px] leading-6 text-auth-copy">{success.detail}</p>
              {success.redirect ? (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-auth-accent">
                  <Loader2 className="h-4 w-4 animate-spin" /> Opening your account
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    setSuccess(null);
                    setMode("signin");
                    setPassword("");
                  }}
                  className="mt-6 h-11 w-full bg-auth-accent text-auth-accent-foreground hover:bg-auth-accent/90"
                >
                  Back to log in
                </Button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
