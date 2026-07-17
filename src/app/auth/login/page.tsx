"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#f6f8f3] px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <Card className="w-full max-w-md rounded-lg border-slate-900/10 bg-white shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900/70">
        <CardHeader>
          <CardTitle>Sign in to WorksApp</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
