"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/login-form";

const features = [
  {
    icon: MessageSquareText,
    title: "WhatsApp AI assistant",
    desc: "Send job details, pricing questions, or invoice requests from the truck and keep the work moving.",
  },
  {
    icon: FileText,
    title: "Invoices and proposals",
    desc: "Draft professional invoices and quotes from project data, then share links without rebuilding the same paperwork.",
  },
  {
    icon: FolderKanban,
    title: "Projects and clients",
    desc: "Track job status, client notes, locations, and work history in one place the agent can reference.",
  },
  {
    icon: CalendarDays,
    title: "Schedules and reminders",
    desc: "Keep recurring work visible and get WhatsApp reminders before upcoming jobs.",
  },
  {
    icon: CreditCard,
    title: "Payment collection",
    desc: "Send Stripe payment links, see what is outstanding, and close out jobs faster.",
  },
  {
    icon: Users,
    title: "Team-ready workspace",
    desc: "Invite a team member so office and field work stay connected without more group chats.",
  },
];

const workflow = [
  "Text your AI assistant with a job update, client request, or pricing question.",
  "WorksApp files the details under the right account, project, invoice, or client.",
  "Send the next action: proposal, invoice, payment link, reminder, or follow-up.",
];

const outcomes = [
  "One WhatsApp number linked to one account",
  "Client and project context retained for the agent",
  "Invoices, proposals, and payments in the same workspace",
];

export default function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#f6f8f3] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-900/10 bg-[#f6f8f3]/92 backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <Image src="/logo.png" alt="WorksApp" width={40} height={40} className="size-10 object-contain" priority />
            <span className="text-lg font-bold tracking-tight">WorksApp</span>
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
            <a href="#features" className="transition-colors hover:text-slate-950 dark:hover:text-white">Features</a>
            <a href="#workflow" className="transition-colors hover:text-slate-950 dark:hover:text-white">Workflow</a>
            <Link href="/pricing" className="transition-colors hover:text-slate-950 dark:hover:text-white">Pricing</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="hidden h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:text-slate-200 dark:hover:bg-white/10 sm:inline-flex"
            >
              Sign in
            </button>
            <Link
              href="/auth/signup"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Start free
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to WorksApp</DialogTitle>
          </DialogHeader>
          <LoginForm />
        </DialogContent>
      </Dialog>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:min-h-[calc(100dvh-64px)] lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:py-14">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-700/20 bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200">
              <Sparkles className="size-4" aria-hidden="true" />
              Built for contractors running jobs from the field
            </div>

            <h1 className="max-w-3xl text-4xl font-bold leading-[1.04] tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
              Your contracting business, organized by text.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg sm:leading-8">
              WorksApp connects WhatsApp AI, projects, clients, invoices, proposals, schedules, and payments so your assistant always works from the right account context.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link
                href="/auth/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-slate-950 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Create free account
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a
                href="#workflow"
                className="inline-flex h-12 items-center justify-center rounded-md border border-slate-900/15 bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                See how it works
              </a>
            </div>

            <div className="mt-6 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:mt-8 sm:grid-cols-3 sm:gap-3">
              {outcomes.map((item) => (
                <div key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <ProductPreview />
        </section>

        <section id="features" className="border-y border-slate-900/10 bg-white py-16 dark:border-white/10 dark:bg-slate-900/45 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">Workspace</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Everything the agent needs to help you.</h2>
              <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
                The product is designed around real contractor workflows: capture the request, organize the job, send the paperwork, and follow up.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="rounded-lg border border-slate-900/10 bg-[#fbfcf8] p-5 transition-all hover:-translate-y-0.5 hover:border-slate-900/20 hover:shadow-sm dark:border-white/10 dark:bg-slate-950/70 dark:hover:border-white/20"
                  >
                    <div className="mb-5 flex size-11 items-center justify-center rounded-md bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{feature.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">Workflow</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From WhatsApp message to paid invoice.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              The experience stays simple on the surface, but every message is routed back to the right profile and workspace data.
            </p>
          </div>

          <div className="grid gap-3">
            {workflow.map((item, index) => (
              <div key={item} className="grid grid-cols-[48px_1fr] gap-4 rounded-lg border border-slate-900/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex size-12 items-center justify-center rounded-md bg-amber-100 text-sm font-bold text-amber-900 dark:bg-amber-300/10 dark:text-amber-200">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <p className="self-center text-base leading-7 text-slate-700 dark:text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto grid max-w-6xl gap-8 rounded-lg bg-slate-950 p-6 text-white dark:bg-white dark:text-slate-950 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-200 dark:text-amber-700">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Built around account-level context
              </div>
              <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Give your agent one reliable number and one reliable source of truth.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 dark:text-slate-700">
                Once a phone number is linked, messages route to that user&apos;s profile, projects, searches, invoices, clients, and memory.
              </p>
            </div>
            <Link
              href="/auth/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
            >
              Start free
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-900/10 py-6 text-sm text-slate-600 dark:border-white/10 dark:text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>Powered by OtterQ. Built for the trades.</span>
          <div className="flex gap-5">
            <Link href="/pricing" className="hover:text-slate-950 dark:hover:text-white">Pricing</Link>
            <Link href="/privacy-policy" className="hover:text-slate-950 dark:hover:text-white">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:mx-0">
      <div className="rounded-lg border border-slate-900/10 bg-white p-3 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/30">
        <div className="rounded-md border border-slate-900/10 bg-[#f6f8f3] p-4 dark:border-white/10 dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Today</p>
              <h2 className="text-lg font-bold">Dashboard</h2>
            </div>
            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300">
              Agent online
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Open jobs", "12"],
              ["Draft invoices", "$4.8k"],
              ["Due this week", "5"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-900/10 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-1 text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-md border border-slate-900/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardList className="size-4 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                <p className="font-semibold">Project queue</p>
              </div>
              {["Kitchen remodel", "Roof repair", "Patio concrete"].map((job, index) => (
                <div key={job} className="flex items-center justify-between border-t border-slate-900/10 py-3 first:border-t-0 dark:border-white/10">
                  <div>
                    <p className="text-sm font-medium">{job}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{index === 0 ? "Invoice ready" : index === 1 ? "Proposal pending" : "Scheduled"}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                    {index === 0 ? "Send" : "Review"}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-emerald-700/20 bg-emerald-50 p-4 dark:border-emerald-300/20 dark:bg-emerald-300/10">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquareText className="size-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                <p className="font-semibold">WhatsApp agent</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="rounded-md bg-white p-3 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  Draft an invoice for the Blanco patio job.
                </div>
                <div className="rounded-md bg-emerald-700 p-3 text-white dark:bg-emerald-500 dark:text-slate-950">
                  Done. I found the project, added line items, and prepared a payment link.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
