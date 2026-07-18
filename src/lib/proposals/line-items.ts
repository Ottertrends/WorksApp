import type { ProposalLineItem } from "@/lib/types/proposals";

type InvoiceItem = { description: unknown; quantity: unknown; unit_price: unknown };

/** Stored invoice values are the source of truth for proposal pricing. */
export function authoritativeProposalLineItems(rows: InvoiceItem[] | null | undefined): ProposalLineItem[] {
  return (rows ?? []).flatMap((row) => {
    const qty = Number(row.quantity);
    const unitPrice = Number(row.unit_price);
    const description = typeof row.description === "string" ? row.description.trim() : "";
    return description && Number.isFinite(qty) && qty > 0 && Number.isFinite(unitPrice) && unitPrice >= 0
      ? [{ description, qty, unitPrice }]
      : [];
  });
}
