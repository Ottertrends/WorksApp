import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import { LandingPageClient } from "./page-client";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : null;
  if (code) {
    const redirectParam = typeof params.redirect === "string" ? params.redirect : "/dashboard";
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(redirectParam)}`);
  }

  const user = await getAuthenticatedUser();
  if (user) redirect("/dashboard");

  return <LandingPageClient />;
}
