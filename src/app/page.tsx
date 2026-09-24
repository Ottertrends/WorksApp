import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import { LandingPageClient } from "./page-client";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";

export const metadata = pageMetadata("Contractor Software for Small Teams – Free Plan | WorksApp", "Try WorksApp free: 3 projects, 5 clients, 60 AI messages/month, and unlimited basic invoices. Contractor software with a WhatsApp assistant for teams of 1–10.", "/");

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

  return <><StructuredData data={{ "@context": "https://schema.org", "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "WorksApp", url: SITE_URL, logo: `${SITE_URL}/logo.png`, email: "support@worksapp.co" },
    { "@type": "SoftwareApplication", "@id": `${SITE_URL}/#software`, name: "WorksApp", url: SITE_URL, applicationCategory: "BusinessApplication", operatingSystem: "Web", description: "Business management software for contractors with teams of 1–10, with invoices, clients, projects, scheduling, and a WhatsApp AI assistant.", publisher: { "@id": `${SITE_URL}/#organization` }, offers: { "@type": "Offer", price: "0", priceCurrency: "USD", url: `${SITE_URL}/pricing`, description: "Free plan with 3 projects, 5 clients, and 60 AI messages per month." } },
  ] }} /><LandingPageClient /></>;
}
