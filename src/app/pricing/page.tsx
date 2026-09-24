import { pageMetadata } from "@/lib/seo";
import PricingClient from "./pricing-client";

export const metadata = pageMetadata("Contractor Software Pricing: Free & Team Plans | WorksApp", "Compare WorksApp Free, Premium ($29/month), and Premium Team ($49/month, 2 seats). Contractor invoicing, jobs, clients, and a WhatsApp AI assistant.", "/pricing");

export default function PricingPage() { return <PricingClient />; }
