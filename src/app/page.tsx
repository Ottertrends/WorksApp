import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import { LandingPageClient } from "./page-client";

export default async function HomePage() {
  const user = await getAuthenticatedUser();
  if (user) redirect("/dashboard");

  return <LandingPageClient />;
}
