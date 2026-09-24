import type { Metadata } from "next";

export const SITE_URL = "https://www.worksapp.co";
export const publicPaths = ["/", "/pricing", "/contractor-invoicing-software", "/contractor-job-management-software", "/privacy-policy"];

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title, description, alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: { title, description, url: `${SITE_URL}${path}`, siteName: "WorksApp", type: "website", images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [`${SITE_URL}/opengraph-image`] },
  };
}

export const homeFaq = [
  { question: "What is WorksApp?", answer: "WorksApp is business management software for independent contractors and small trade businesses. It brings clients, projects, quotes, invoices, and scheduling into one workspace, with an AI assistant you can message through WhatsApp." },
  { question: "Who is WorksApp for?", answer: "WorksApp is built for contractor teams of 1–10 people, especially owners who work on job sites and run the business themselves or with one or two managers. Trades include remodeling, roofing, concrete, electrical, plumbing, drywall, excavation, framing, and landscaping." },
  { question: "Can I create invoices through WhatsApp?", answer: "Yes. Connect your WhatsApp number to WorksApp and message the assistant to prepare an invoice using your job details. Review the draft and amounts before sending it to your customer." },
  { question: "Is WorksApp free?", answer: "WorksApp has a free plan with 3 projects, 5 clients, 60 AI messages per month, and unlimited basic invoices. Premium is $29 per month, and Premium Team starts at $49 per month with 2 seats. Annual plans are also available." },
  { question: "Is the free plan a time-limited trial?", answer: "No. You can use the Free plan without a trial deadline, within its project, client, and monthly AI usage limits. You do not need a credit card to create a free account. Upgrade when you need Premium features or a shared team workspace." },
  { question: "Can customers pay an invoice online?", answer: "Premium includes Stripe Connect payments. Connect your payment account to offer customers an invoice payment link. Payment account setup is required." },
];
