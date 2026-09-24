import { MarketingPage } from "@/components/marketing-page";
import { pageMetadata } from "@/lib/seo";

const title = "Contractor invoicing software for small teams";
const description = "WorksApp helps small contractors prepare invoices, keep customer and job details together, and review drafts before sending. Use your workspace or message the WhatsApp AI assistant when you are on a job site.";
export const metadata = pageMetadata("Contractor Invoicing Software with a Free Plan | WorksApp", "Try contractor invoicing free with WorksApp. Unlimited basic invoices, 3 projects, and 5 clients. Use the WhatsApp AI assistant to prepare drafts on the job.", "/contractor-invoicing-software");

export default function Page() {
  return <MarketingPage title={title} description={description} path="/contractor-invoicing-software"
    sections={[
      { title: "Turn job details into a draft", text: "Ask the WhatsApp assistant to prepare an invoice for a project. Keep labor, materials, and customer details with the job so you have the context to check the draft." },
      { title: "Review before sending", text: "Check the customer, line items, quantities, and amounts before sharing the invoice. AI helps prepare the paperwork; you remain responsible for the final details." },
      { title: "Offer an online payment link", text: "Premium includes Stripe Connect payments, invoice branding, and PDFs. Set up your connected payment account before offering customers an online payment link." },
    ]}
    steps={[
      { title: "Add the client and project", text: "Keep the customer contact information and job details in WorksApp. A free account includes up to 5 clients and 3 projects." },
      { title: "Prepare and check the invoice", text: "Create the invoice in your workspace or ask your connected WhatsApp assistant. For example: ‘Draft an invoice for the patio job.’ Review the scope, labor, materials, and totals." },
      { title: "Send it to the customer", text: "Share the reviewed invoice. If you use Premium and have connected your payment account, the customer can pay through a payment link." },
    ]}
    faq={[
      { question: "Can I create contractor invoices for free?", answer: "Yes. The Free plan includes unlimited basic invoices, up to 3 projects, 5 clients, and 60 AI messages per month. Invoice branding, PDFs, and Stripe Connect payments are Premium features." },
      { question: "Does WorksApp replace accounting software?", answer: "WorksApp focuses on running jobs, managing clients, and preparing quotes and invoices. It is not presented as a full accounting or tax filing system. Check your bookkeeping requirements separately." },
      { question: "What should I check before sending an invoice?", answer: "Confirm the customer and project, describe the completed work clearly, check quantities and rates, and review the total and payment details. Compare the invoice with the agreed scope before sending." },
      { question: "Can my team share the workspace?", answer: "Premium Team includes a shared workspace, 2 seats, and each member’s own WhatsApp connection. Additional seats are $10 per month each. See the pricing page for the full plan comparison." },
    ]}
    related={{ href: "/contractor-job-management-software", label: "Explore contractor job management" }} />;
}
