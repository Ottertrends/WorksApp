import { MarketingPage } from "@/components/marketing-page";
import { pageMetadata } from "@/lib/seo";

const title = "Job management software for small contractors";
export const metadata = pageMetadata(`${title} | WorksApp`, "Organize contractor jobs, clients, and schedules in WorksApp. Built for teams of 1–10 and owners working on site, with a WhatsApp AI assistant. Start free.", "/contractor-job-management-software");

export default function Page() {
  return <MarketingPage title={title} path="/contractor-job-management-software" description="WorksApp gives contractors with teams of 1–10 one place for projects, client details, invoices, and schedules. It is built for owners who work on site and handle the office themselves or share it with one or two managers."
    sections={[
      { title: "Keep context with the job", text: "Store client contact details, project information, and job notes in the workspace. Find the information you need without piecing together a customer history from separate conversations." },
      { title: "Ask from the job site", text: "Connect your WhatsApp number and ask the assistant for project information or help scheduling work. The dashboard is there when you want to review the details in one place." },
      { title: "Share the office work", text: "Premium Team provides a shared workspace and data for your team, with each member’s own WhatsApp connection. Two seats are included, and extra seats are available." },
    ]}
    steps={[
      { title: "Create the client and project", text: "Add the customer and the work you are managing. Keep the project record current so you and your managers have a common reference for the job." },
      { title: "Set the schedule", text: "Organize upcoming work in the calendar or message the WhatsApp assistant with a scheduling request. Premium includes calendar reminders." },
      { title: "Follow the work through to the invoice", text: "Review project information, prepare the customer paperwork, and send the invoice when the work is ready to bill. Keep the job and its customer in the same workspace." },
    ]}
    faq={[
      { question: "Is WorksApp suitable for a solo contractor?", answer: "Yes. A contractor working alone can start with the Free plan: 3 projects, 5 clients, 60 AI messages per month, and unlimited basic invoices. Premium removes project and client limits." },
      { question: "Can an owner and a manager use WorksApp together?", answer: "Premium Team includes 2 seats and a shared workspace. It supports each member’s own WhatsApp connection, so the owner and manager can work with shared business data." },
      { question: "Which trades is WorksApp built for?", answer: "WorksApp supports small trade businesses including remodeling, concrete, roofing, electrical, plumbing, framing, drywall, excavation, and landscaping. Its focus is the shared admin work around clients, projects, scheduling, and invoices." },
      { question: "Do I have to do everything through WhatsApp?", answer: "No. WorksApp also has a web dashboard for clients, projects, invoices, proposals, and the calendar. WhatsApp is another way to interact with the assistant when you are away from your desk." },
      { question: "How can I try WorksApp if I currently use spreadsheets and text messages?", answer: "Start by adding one client and one current project to a free account. Add the job details, try a scheduling request through the connected WhatsApp assistant, and prepare a basic invoice. This lets you evaluate the workflow before moving more work into the app." },
    ]}
    related={{ href: "/contractor-invoicing-software", label: "Explore contractor invoicing" }} />;
}
