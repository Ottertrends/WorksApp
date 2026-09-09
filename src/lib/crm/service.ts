import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { opportunitySchema, type Opportunity, pipelineSummary } from './model';
import { z } from 'zod';
import { maxClients } from '@/lib/billing/access';

export async function addOpportunityClient(userId: string, opportunityId: unknown) {
  const id = z.uuid().parse(opportunityId);
  const db = createSupabaseAdminClient();
  const { data: profile, error } = await db.from('profiles').select('subscription_plan, subscription_status').eq('id', userId).single();
  if (error) throw new Error('Could not verify client allowance.');
  const limit = maxClients(profile ?? {});
  const result = await db.rpc('crm_add_client', { p_user_id: userId, p_id: id, p_limit: Number.isFinite(limit) ? limit : 2147483647 });
  if (result.error) throw new Error(result.error.message);
  return { client_id: result.data };
}

export async function readCrm(userId: string) {
  const db = createSupabaseAdminClient();
  const [opportunities, clients, rules, subscriptions] = await Promise.all([
    db.from('crm_opportunities').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    db.from('clients').select('id, client_name, address, phone, email, notes').eq('user_id', userId).order('client_name'),
    db.from('recurring_projects').select('*, projects(name)').eq('user_id', userId).eq('active', true),
    db.from('client_subscriptions').select('id, status, current_period_end, stripe_customer_name').eq('user_id', userId).in('status', ['active','trialing','past_due']),
  ]);
  if (opportunities.error) throw new Error('CRM could not load. Ensure database migration 039_crm.sql has been applied.');
  const warnings = [clients.error && 'Client directory unavailable.', rules.error && 'Calendar unavailable; availability is incomplete.', subscriptions.error && 'Subscriptions unavailable; availability is incomplete.'].filter(Boolean) as string[];
  const rows = (opportunities.data ?? []).map(o => ({ ...o, value: Number(o.value), final_amount: o.final_amount === null ? null : Number(o.final_amount) })) as Opportunity[];
  return { opportunities: rows, clients: clients.data ?? [], rules: rules.data ?? [], subscriptions: subscriptions.data ?? [], warnings, summary: pipelineSummary(rows) };
}

export async function saveOpportunity(userId: string, input: Record<string, unknown>) {
  const db = createSupabaseAdminClient();
  const id = input.id === undefined ? undefined : z.uuid().parse(input.id);
  let previous = {};
  if (id) {
    const result = await db.from('crm_opportunities').select('*').eq('user_id', userId).eq('id', id).single();
    if (result.error) throw new Error('Opportunity not found.');
    previous = { ...result.data, value: Number(result.data.value), final_amount: result.data.final_amount === null ? null : Number(result.data.final_amount) };
  }
  const row = opportunitySchema.parse({ ...previous, ...input });
  if (row.client_id) {
    const { data, error } = await db.from('clients').select('id').eq('user_id', userId).eq('id', row.client_id).single();
    if (error || !data) throw new Error('Client not found in this workspace.');
  }
  const query = id ? db.from('crm_opportunities').update(row).eq('user_id', userId).eq('id', id) : db.from('crm_opportunities').insert({ ...row, user_id: userId });
  const { data, error } = await query.select('*').single();
  if (error) throw new Error(error.message);
  return data;
}
