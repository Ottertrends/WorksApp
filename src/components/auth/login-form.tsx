"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

function extractAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const maybe = error as Record<string, unknown>;
    for (const candidate of [maybe.message, maybe.error_description, maybe.error, maybe.msg, maybe.code]) {
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
    try {
      const s = JSON.stringify(maybe);
      if (s && s !== "{}") return s;
    } catch { /* ignore */ }
  }
  return "Login failed";
}

export function LoginForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [debugError, setDebugError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"login" | "forgot">("login");
  const [forgotEmail, setForgotEmail] = React.useState("");
  const [forgotSent, setForgotSent] = React.useState(false);
  const [forgotLoading, setForgotLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const { handleSubmit, register, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  React.useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then((result: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      if (active && result.data.session?.user) router.replace("/dashboard");
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) router.replace("/dashboard");
      },
    );
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function signInWithGoogle() {
    setDebugError(null);
    setGoogleLoading(true);
    try {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin).replace(/\/$/, "");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${appUrl}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });
      if (error) {
        const msg = extractAuthErrorMessage(error);
        setDebugError(msg);
        toast.error(msg);
        setGoogleLoading(false);
        return;
      }
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setGoogleLoading(false);
    } catch (e: unknown) {
      const msg = extractAuthErrorMessage(e);
      setDebugError(msg);
      toast.error(msg);
      setGoogleLoading(false);
    }
  }

  async function onSubmit(values: LoginValues) {
    try {
      setDebugError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        const msg = extractAuthErrorMessage(error);
        setDebugError(msg);
        toast.error(msg);
        return;
      }
      toast.success(t.toasts.loggedIn);
      router.refresh();
      router.replace("/dashboard");
    } catch (e: unknown) {
      const msg = extractAuthErrorMessage(e);
      setDebugError(msg);
      toast.error(msg);
    }
  }

  async function onForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setDebugError(null);
    try {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${appUrl}/auth/callback?redirect=/auth/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (e: unknown) {
      const msg = extractAuthErrorMessage(e);
      setDebugError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  }

  if (mode === "forgot") {
    return (
      <div className="flex flex-col gap-5">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Enter your email and we&apos;ll send you a link to reset your password.
        </div>
        {forgotSent ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
            Check your email — a password reset link has been sent.
          </div>
        ) : (
          <form onSubmit={onForgotPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>
            {debugError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {debugError}
              </div>
            )}
            <Button type="submit" disabled={forgotLoading} className="w-full">
              {forgotLoading ? "Sending…" : "Send Reset Email"}
            </Button>
          </form>
        )}
        <button
          type="button"
          onClick={() => { setMode("login"); setForgotSent(false); setDebugError(null); }}
          className="text-sm text-primary hover:underline text-center"
        >
          ← Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative flex flex-col gap-5">
      {googleLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="size-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950 dark:border-slate-700 dark:border-t-white" />
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Redirecting to Google...
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="lf-email">Email</Label>
        <Input id="lf-email" type="email" placeholder="you@example.com" {...register("email")} />
        {errors.email && <div className="text-sm text-red-500">{errors.email.message}</div>}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="lf-password">Password</Label>
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="text-xs text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <Input id="lf-password" type="password" placeholder="••••••••" {...register("password")} />
        {errors.password && <div className="text-sm text-red-500">{errors.password.message}</div>}
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Signing in…" : "Sign In"}
      </Button>
      <div className="relative flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <span className="text-xs text-slate-500">or</span>
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={googleLoading || isSubmitting}
        onClick={() => void signInWithGoogle()}
      >
        {googleLoading ? "Redirecting..." : "Continue with Google"}
      </Button>
      <div className="text-sm text-slate-500 text-center">
        No account?{" "}
        <a href="/auth/signup" className="text-primary hover:underline font-medium">
          Create one free
        </a>
      </div>
      {debugError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 break-words">
          {debugError}
        </div>
      )}
    </form>
  );
}
