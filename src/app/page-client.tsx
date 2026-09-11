"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowRight, CalendarDays, Check, CheckCheck, FileText, FolderKanban, MessageCircle, Plus } from "lucide-react";
import styles from "./landing.module.css";

const examples = [
  { label: "Draft an invoice", icon: FileText, request: "Patio is done. Draft an invoice for the Blanco job.", reply: "Your invoice is ready. I added the labor and materials from the job. Review it before sending.", type: "INVOICE DRAFT", title: "Blanco patio", detail: "Concrete patio · Labor & materials", value: "$2,450.00", status: "Ready for your review" },
  { label: "Plan a job", icon: CalendarDays, request: "Schedule the Davis roof repair for Monday at 9 am.", reply: "The Davis roof repair is scheduled for Monday at 9 am.", type: "SCHEDULED JOB", title: "Davis roof repair", detail: "Monday · 9:00 AM", value: "On the calendar", status: "Project schedule updated" },
  { label: "Find job details", icon: FolderKanban, request: "What’s the status of the kitchen remodel?", reply: "The Miller kitchen is in progress. The quote is ready for your review.", type: "PROJECT UPDATE", title: "Miller kitchen", detail: "Kitchen remodel · In progress", value: "Quote ready", status: "Everything in one place" },
];

export function LandingPageClient() {
  const [selected, setSelected] = useState(0);
  const example = examples[selected];
  const ExampleIcon = example.icon;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.navbar}>
          <Link href="/" className={styles.brand} aria-label="WorksApp home"><Image src="/logo.png" alt="" width={38} height={38} priority />WorksApp<span className={styles.brandDot}>.</span></Link>
          <nav aria-label="Primary navigation" className={styles.navLinks}><a href="#features">Features</a><a href="#workflow">How it works</a><Link href="/pricing">Pricing</Link></nav>
          <div className={styles.navActions}><Link href="/auth/login" className={styles.login}>Log in</Link><Link href="/auth/signup" className={styles.navCta}>Start free <ArrowRight size={15} aria-hidden="true" /></Link></div>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span /> BUILT FOR INDEPENDENT CONTRACTORS</p>
            <h1>Less paperwork.<br /><span>More time for<br />your business.</span></h1>
            <p className={styles.intro}>Send a WhatsApp message to prepare an invoice, schedule a job, or find customer details. Keep working. Keep your business organized.</p>
            <div className={styles.heroActions}><Link href="/auth/signup" className={styles.primary}>Create free account <ArrowRight size={18} aria-hidden="true" /></Link><a href="#workflow" className={styles.secondary}>See how it works <ArrowDown size={16} aria-hidden="true" /></a></div>
            <p className={styles.heroNote}><Check size={14} aria-hidden="true" /> Start free <span>·</span> Built for the way you work</p>
            <div className={styles.heroCaption}><span className={styles.captionLine} /> YOUR JOBS. YOUR CUSTOMERS. YOUR BUSINESS.</div>
          </div>

          <div className={styles.demoStage}>
            <div className={styles.stageLabel}>FROM A MESSAGE TO AN INVOICE</div>

            <div className={styles.chat}>
              <div className={styles.chatHeader}><Image src="/logo.png" alt="WorksApp logo" width={64} height={64} className={styles.demoLogo} /><div><strong>WorksApp</strong><span>Your business assistant on WhatsApp</span></div><MessageCircle size={21} aria-hidden="true" /></div>
              <div className={styles.chatBody}>
                <p className={styles.demoLabel}>EXAMPLE CONVERSATION</p>
                <div key={selected} className={styles.conversation} aria-live="polite" aria-atomic="true">
                  <div className={styles.userBubble}>{example.request}<span>9:41 <CheckCheck size={14} aria-hidden="true" /></span></div>
                  <div className={styles.agentBubble}>{example.reply}</div>
                  <div className={styles.result}><div className={styles.resultType}><ExampleIcon size={15} aria-hidden="true" />{example.type}<span>WorksApp</span></div><h3>{example.title}</h3><p>{example.detail}</p><strong>{example.value}</strong><div className={styles.resultStatus}><span><Check size={13} aria-hidden="true" />{example.status}</span><ArrowRight size={16} aria-hidden="true" /></div></div>
                </div>
              </div>
              <div className={styles.chatInput} aria-hidden="true"><Plus size={18} /><span>Message WorksApp…</span><span className={styles.send}><ArrowRight size={16} /></span></div>
            </div>
            <div className={styles.demoControls}><p>CHOOSE AN EXAMPLE</p><div role="group" aria-label="Choose an example conversation">{examples.map((item, index) => <button key={item.label} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)} className={selected === index ? styles.selected : ""}>{item.label}</button>)}</div></div>
          </div>
        </section>

        <section id="features" className={styles.features} aria-labelledby="features-heading">
          <div className={styles.sectionTop}><p className={styles.eyebrow}>LESS TO HANDLE AFTER WORK</p><h2 id="features-heading">Keep the business under control.</h2><p>From the first quote to the final payment.</p></div>
          <div className={styles.featureGrid}>
            <article><span className={styles.featureIcon}><FileText size={23} aria-hidden="true" /></span><h3>Make it easier to get paid.</h3><p>Send clear quotes and invoices. Let customers pay through a link.</p></article>
            <article><span className={styles.featureIcon}><FolderKanban size={23} aria-hidden="true" /></span><h3>Keep every job and client organized.</h3><p>Manage client accounts and projects in one place, with contact details, job notes, and work history.</p></article>
            <article><span className={styles.featureIcon}><CalendarDays size={23} aria-hidden="true" /></span><h3>Know what comes next.</h3><p>Keep track of upcoming jobs with your schedule and WhatsApp reminders.</p></article>
          </div>
        </section>

        <section id="workflow" className={styles.workflow} aria-labelledby="workflow-heading"><div><p className={styles.eyebrow}>SIMPLE TO GET STARTED</p><h2 id="workflow-heading">Use WhatsApp.<br />We handle the details.</h2><a href="#top" className={styles.workflowLink} onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }}>Try the examples above <ArrowRight size={16} aria-hidden="true" /></a></div><ol>{[{ title: "Connect your WhatsApp.", text: "Create your account and link your number." }, { title: "Send a message.", text: "Tell WorksApp what you need, just as you would text someone." }, { title: "Review and send.", text: "Check your invoice or job details before taking the next step." }].map((step, index) => <li key={step.title}><span>0{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol></section>

        <section className={styles.finalCta}><div><p className={styles.eyebrow}>BUILT FOR YOUR BUSINESS</p><h2>Finish the job.<br />Bring less paperwork home.</h2></div><Link href="/auth/signup" className={styles.primary}>Create free account <ArrowRight size={18} aria-hidden="true" /></Link></section>
      </main>
      <footer className={styles.footer}><Link href="/" className={styles.footerBrand}>WorksApp<span>.</span></Link><p><a href="https://otterq.com" className={styles.poweredBy}>Powered by OtterQ</a><span> · Built for the trades.</span></p><div><Link href="/pricing">Pricing</Link><Link href="/privacy-policy">Privacy</Link><Link href="/auth/login">Log in <ArrowRight size={13} aria-hidden="true" /></Link></div></footer>
    </div>
  );
}
