import { z } from 'zod';

export const stages = ['lead', 'scheduled', 'quoted', 'won', 'lost'] as const;
export const stageLabels = { lead: 'Leads', scheduled: 'Scheduled', quoted: 'Quoted', won: 'Won', lost: 'Lost' };
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(v + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, 'Invalid date');
export const opportunitySchema = z.object({
  name: z.string().trim().min(1).max(200), client_name: z.string().trim().min(1).max(200),
  client_id: z.uuid().nullable().default(null),
  address: z.string().max(2000).default(''), phone: z.string().max(100).default(''),
  email: z.union([z.email(), z.literal('')]).default(''),
  notes: z.string().max(20000).default(''), information: z.string().max(20000).default(''),
  value: z.number().finite().min(0).max(999999999999).default(0), stage: z.enum(stages).default('lead'),
  visit_date: date.nullable().default(null),
  visit_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).nullable().default(null),
  duration_minutes: z.number().int().min(1).max(1440).default(60),
  closed_date: date.nullable().default(null), final_amount: z.number().finite().min(0).max(999999999999).nullable().default(null),
  closing_notes: z.string().max(20000).default(''),
}).superRefine((v, ctx) => {
  if (v.stage === 'scheduled' && (!v.visit_date || !v.visit_time)) ctx.addIssue({ code: 'custom', message: 'Scheduled opportunities need a visit date and time.' });
  if (['won', 'lost'].includes(v.stage) && !v.closed_date) ctx.addIssue({ code: 'custom', message: 'Enter the closing date.' });
  if (v.stage === 'won' && v.final_amount === null) ctx.addIssue({ code: 'custom', message: 'Enter the final project amount.' });
});
export type Opportunity = z.infer<typeof opportunitySchema> & { id: string; created_at: string; updated_at: string };
export function staleOpportunity(o: Opportunity, now = new Date()) {
  return !['won', 'lost'].includes(o.stage) && now.getTime() - new Date(o.updated_at).getTime() > 5 * 86400000;
}
export function pipelineSummary(rows: Opportunity[], now = new Date()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const key = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
  const end = new Date(start); end.setDate(end.getDate()+7);
  const endKey = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
  const won = rows.filter(o => o.stage === 'won' && o.closed_date && o.closed_date >= key && o.closed_date < endKey);
  return { week: key, open: rows.filter(o => !['won','lost'].includes(o.stage)).length,
    value: rows.filter(o => !['won','lost'].includes(o.stage)).reduce((n,o) => n + Number(o.value),0),
    newLeads: rows.filter(o => new Date(o.created_at) >= start && new Date(o.created_at) < end).length,
    won: won.length, wonValue: won.reduce((n,o) => n + Number(o.final_amount ?? 0),0),
    stale: rows.filter(o => staleOpportunity(o, now)).length };
}
