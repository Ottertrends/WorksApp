import Image from "next/image";
import Link from "next/link";
import { StructuredData } from "@/components/structured-data";
import { SITE_URL } from "@/lib/seo";

type Section = { title: string; text: string };
export function MarketingPage({ title, description, path, sections, steps, faq, related }: {
  title: string; description: string; path: string; sections: Section[]; steps: Section[];
  faq: { question: string; answer: string }[]; related: { href: string; label: string };
}) {
  return <div className="min-h-screen bg-[#f8f6f2] text-slate-900">
    <StructuredData data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "WorksApp", item: SITE_URL }, { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}${path}` }] }} />
    <header className="border-b border-slate-200"><nav aria-label="Primary navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5"><Link href="/" className="flex items-center gap-2 text-xl font-bold"><Image src="/logo.png" alt="" width={38} height={38} />WorksApp</Link><div className="flex items-center gap-6"><Link href="/pricing">Pricing</Link><Link href="/auth/signup" className="rounded-lg bg-slate-900 px-4 py-3 text-white">Start free</Link></div></nav></header>
    <main className="mx-auto max-w-5xl px-6 py-12 sm:py-20">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm"><Link className="underline" href="/">Home</Link><span aria-hidden="true"> / </span><span aria-current="page">{title}</span></nav>
      <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-amber-900">For contractor teams of 1–10</p>
      <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{description}</p>
      <div className="my-8 flex flex-wrap items-center gap-6"><Link href="/auth/signup" className="rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white">Create free account</Link><Link className="underline underline-offset-4" href="/pricing">Compare plans</Link></div>
      <div className="rounded-xl border border-amber-900/15 bg-[#eee8de] p-6"><h2 className="text-xl font-semibold">Try it free on a real job.</h2><p className="mt-3 leading-7">3 projects, 5 clients, 60 AI messages per month, and unlimited basic invoices. No credit card required. No trial deadline.</p><p className="mt-2 text-sm leading-6 text-slate-600">Premium adds invoice branding, PDFs, Stripe Connect payments, and calendar reminders. Shared team access requires Premium Team.</p></div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">{sections.map(section => <section key={section.title} className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">{section.title}</h2><p className="mt-4 leading-7 text-slate-600">{section.text}</p></section>)}</div>
      <section className="mt-16"><h2 className="text-3xl font-semibold">How it works</h2><ol className="mt-6 space-y-6">{steps.map((step, index) => <li key={step.title} className="flex gap-5"><span className="font-bold text-amber-900">0{index + 1}</span><div><h3 className="text-xl font-semibold">{step.title}</h3><p className="mt-2 max-w-3xl leading-7 text-slate-600">{step.text}</p></div></li>)}</ol></section>
      <section className="mt-16"><h2 className="text-3xl font-semibold">Common questions</h2><div className="mt-6">{faq.map(item => <details key={item.question} className="border-b border-slate-200 py-5"><summary className="cursor-pointer text-lg font-semibold">{item.question}</summary><p className="mt-4 max-w-3xl leading-7 text-slate-600">{item.answer}</p></details>)}</div></section>
      <aside className="mt-14 rounded-xl bg-slate-900 p-8 text-white"><h2 className="text-2xl font-semibold">Keep the rest of the job organized, too.</h2><Link className="mt-4 inline-block underline underline-offset-4" href={related.href}>{related.label}</Link><p className="mt-4">Start with the free plan, then choose Premium or Premium Team as your business needs grow.</p><Link href="/pricing" className="mt-4 inline-block underline underline-offset-4">See pricing and plan limits</Link></aside>
    </main>
    <footer className="mx-auto flex max-w-5xl flex-wrap gap-6 border-t border-slate-200 px-6 py-8 text-sm"><Link href="/">WorksApp</Link><Link href="/pricing">Pricing</Link><Link href="/privacy-policy">Privacy</Link><a href="mailto:support@worksapp.co">Contact support</a></footer>
  </div>;
}
