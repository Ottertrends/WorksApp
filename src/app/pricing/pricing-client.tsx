"use client";

import { CheckCircle2, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const FREE_FEATURES = ["3 projects", "5 clients", "60 AI messages / month", "4 web searches / month", "10 price book items", "Unlimited basic invoices"];
const PREMIUM_FEATURES = ["Unlimited projects and clients", "Unlimited AI messages", "Unlimited web searches", "Invoice branding and PDFs", "AI proposal generation", "Stripe Connect payments", "Calendar reminders", "1 WhatsApp instance"];
const TEAM_FEATURES = ["Everything in Premium", "2 seats included", "Shared workspace and data", "Each member's own WhatsApp", "Team invite by email and phone", "Extra seats: +$10/mo each"];

export default function PricingClient() {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  const premiumPrice = interval === "annual" ? "$290/yr" : "$29/mo";
  const premiumSubtitle = interval === "annual" ? "$24.16/mo billed annually" : "billed monthly";
  const teamPrice = interval === "annual" ? "$490/yr" : "$49/mo";
  const teamSubtitle = interval === "annual" ? "$40.83/mo billed annually" : "billed monthly";

  return (
    <div className="min-h-dvh bg-[#f6f8f3] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-900/10 bg-[#f6f8f3]/92 backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="WorksApp" width={40} height={40} className="size-10 object-contain" />
            <span className="text-lg font-bold tracking-tight">WorksApp</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="hidden h-11 items-center rounded-md px-4 text-sm font-semibold text-slate-700 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-white/10 sm:inline-flex">
              Sign in
            </Link>
            <Link href="/auth/signup" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
              Start free
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">Pricing</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">Simple pricing for small contractor teams.</h1>
          <p className="mt-5 text-base leading-7 text-slate-600 dark:text-slate-300">
            Start free, or choose Premium for more projects and clients. Premium Team gives owners and managers a shared workspace, starting with 2 seats.
          </p>
        </div>

        <div className="mt-8 inline-flex rounded-md border border-slate-900/10 bg-white p-1 dark:border-white/10 dark:bg-white/5">
          {(["monthly", "annual"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setInterval(option)}
              className={`h-10 rounded px-4 text-sm font-semibold capitalize transition-colors ${interval === option ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"}`}
            >
              {option === "annual" ? "Annual save 17%" : "Monthly"}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <PlanCard title="Free" price="$0" subtitle="forever" features={FREE_FEATURES} href="/auth/signup" cta="Get started free" />
          <PlanCard title="Premium" price={premiumPrice} subtitle={premiumSubtitle} features={PREMIUM_FEATURES} href={`/auth/signup?plan=premium&interval=${interval}`} cta="Start Premium" featured />
          <PlanCard title="Premium Team" price={teamPrice} subtitle={teamSubtitle} features={TEAM_FEATURES} href={`/auth/signup?plan=premium_team&interval=${interval}`} cta="Start Team" />
        </div>

        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
          Sales tax is applied at checkout based on location. Questions? <a href="mailto:support@worksapp.co" className="font-semibold text-slate-900 hover:underline dark:text-white">Contact us</a>.
        </p>
        <section className="mt-12 border-t border-slate-900/10 pt-8 dark:border-white/10">
          <h2 className="text-2xl font-semibold">Explore what WorksApp can do for your crew</h2>
          <div className="mt-4 flex flex-wrap gap-6 underline underline-offset-4"><Link href="/contractor-invoicing-software">Contractor invoicing</Link><Link href="/contractor-job-management-software">Job management</Link><Link href="/">WhatsApp assistant and FAQs</Link></div>
        </section>
      </main>
    </div>
  );
}

function PlanCard({ title, price, subtitle, features, href, cta, featured = false }: {
  title: string;
  price: string;
  subtitle: string;
  features: string[];
  href: string;
  cta: string;
  featured?: boolean;
}) {
  return (
    <article className={`relative flex rounded-lg border bg-white p-6 dark:bg-slate-900/70 ${featured ? "border-slate-950 shadow-xl shadow-slate-900/10 dark:border-white" : "border-slate-900/10 dark:border-white/10"}`}>
      <div className="flex w-full flex-col">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
        <div className="mt-3 text-4xl font-bold tracking-tight">{price}</div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        <ul className="mt-6 flex-1 space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Link href={href} className={`mt-6 inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold ${featured ? "bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200" : "border border-slate-900/15 text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10"}`}>
          {cta}
        </Link>
      </div>
    </article>
  );
}
