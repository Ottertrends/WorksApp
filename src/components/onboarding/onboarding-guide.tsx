"use client";

import * as React from "react";

const steps = [
  {
    title: "Welcome to WorksApp!",
    subtitle: "Your contractor assistant on WhatsApp",
    content: (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-6xl">👷</div>
        <p className="max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          WorksApp is ready whenever you need it. Just send a WhatsApp message to the WorksApp number to manage jobs,
          draft invoices, save prices, and more.
        </p>
      </div>
    ),
  },
  {
    title: "Start with a message",
    subtitle: "Step 1 of 2",
    content: (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
          {[
            "Open WhatsApp on your phone.",
            "Send a message to the WorksApp number.",
            "Tell your assistant what you need in plain language.",
          ].map((item, index) => (
            <div key={item} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {index + 1}
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-300">{item}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No pairing code or dashboard setup is required.
        </p>
      </div>
    ),
  },
  {
    title: "What you can do",
    subtitle: "Step 2 of 2",
    content: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Send a message like “Create a kitchen remodel project” or “Draft an invoice for this project.” Your WorksApp assistant can also help you with:
        </p>
        <ul className="grid grid-cols-2 gap-2">
          {[
            { icon: "📁", text: "Create & manage projects" },
            { icon: "🧾", text: "Draft & download invoices" },
            { icon: "📸", text: "Save photos & notes" },
            { icon: "💰", text: "Look up material prices" },
            { icon: "👤", text: "Manage clients" },
            { icon: "🔍", text: "Web price search" },
            { icon: "📋", text: "Track job history" },
            { icon: "💼", text: "Price book management" },
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <span>{icon}</span> {text}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
];

type Props = { show: boolean };

export function OnboardingGuide({ show }: Props) {
  const [visible, setVisible] = React.useState(show);
  const [step, setStep] = React.useState(0);
  const [completing, setCompleting] = React.useState(false);

  if (!visible) return null;

  async function complete() {
    if (completing) return;
    setCompleting(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch {
      // The modal can still close when the optional completion marker fails.
    }
    setVisible(false);
  }

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between px-6 pb-0 pt-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{current.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{current.subtitle}</p>
          </div>
          <button type="button" onClick={() => void complete()} className="mt-1 text-xs text-slate-400 underline underline-offset-2 transition-colors hover:text-slate-600 dark:hover:text-slate-300">
            Skip
          </button>
        </div>

        <div className="px-6 py-5">{current.content}</div>

        <div className="flex justify-center gap-1.5 pb-4">
          {steps.map((_, index) => (
            <div key={index} className={`h-1.5 rounded-full transition-all ${index === step ? "w-6 bg-primary" : "w-1.5 bg-slate-200 dark:bg-slate-700"}`} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 pb-6">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((currentStep) => currentStep - 1)} className="text-sm text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300">
              ← Back
            </button>
          ) : <div />}
          <button type="button" onClick={() => (isLast ? void complete() : setStep((currentStep) => currentStep + 1))} disabled={completing} className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
            {isLast ? "Let's go!" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
