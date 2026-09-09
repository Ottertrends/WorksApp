'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { stages, stageLabels, pipelineSummary, staleOpportunity, type Opportunity } from '@/lib/crm/model';
import { commitments } from '@/lib/crm/availability';
import type { RecurringRule } from '@/app/api/recurring/route';

type Client = { id: string; client_name: string; address: string | null; email: string | null; phone: string | null; notes: string | null };
type Data = { opportunities: Opportunity[]; clients: Client[]; rules: (RecurringRule & { projects?: { name: string } })[]; subscriptions: { id: string; current_period_end: string | null; stripe_customer_name: string | null }[]; warnings: string[] };
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const blank = () => ({ name: '', client_name: '', client_id: null, address: '', email: '', phone: '', notes: '', information: '', value: 0, stage: 'lead', visit_date: null, visit_time: null, duration_minutes: 60, closed_date: null, final_amount: null, closing_notes: '' } as Omit<Opportunity, 'id' | 'created_at' | 'updated_at'> & { id?: string });
const inputClass = 'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-2 text-sm';
const panel = 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4';

export function CrmClient({ calendarOnly = false }: { calendarOnly?: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ReturnType<typeof blank> | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [day, setDay] = useState(todayKey);
  const [staleOnly, setStaleOnly] = useState(false);
  const editor = useRef<HTMLElement>(null);
  const editing = form !== null;
  useEffect(() => { if (editing) editor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [editing]);
  async function load() {
    try {
      const r = await fetch('/api/crm', { cache: 'no-store' }); const j = await r.json();
      if (!r.ok) throw new Error(j.error); setData(j); setError('');
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not load CRM'); }
  }
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 60000); return () => clearInterval(timer); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const r = await fetch('/api/crm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setForm(null); await load();
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not save'); }
    finally { setSaving(false); }
  }
  async function addClient() {
    if (!form?.id) return;
    setSaving(true);
    try {
      const r = await fetch('/api/crm/client', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: form.id }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setForm({ ...form, client_id: j.client_id }); await load();
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not add client'); }
    finally { setSaving(false); }
  }
  if (!data) return <div className={panel}>{error || 'Loading CRM…'}{error && <button className="ml-3 underline" onClick={() => void load()}>Retry</button>}</div>;
  const summary = pipelineSummary(data.opportunities);
  const selectedDay = form?.visit_date || day;
  const busy = commitments(selectedDay, data.opportunities, data.rules.map(r => ({ ...r, project_name: r.projects?.name ?? r.project_name })), form?.id);
  const renewals = data.subscriptions.filter(s => s.current_period_end?.slice(0,10) === selectedDay);
  const availability = <section className={panel}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Visits & availability</h2><input aria-label="Availability date" type="date" className="rounded border p-2 dark:bg-slate-900" value={selectedDay} onChange={e => { setDay(e.target.value); if(form) setForm({ ...form, visit_date: e.target.value || null }); }} /></div>
    <p className="my-2 text-sm text-slate-500">Times follow the calendar’s local time. Calendar services have no duration; review before booking.</p>
    {busy.length ? busy.map((b,i) => <div key={i} className="border-t py-2 text-sm">{b.time?.slice(0,5) || 'Time unspecified'} · {b.label} · {b.source}{b.duration ? ` · ${b.duration} min` : ' · duration unspecified'}</div>) : <p className="py-2 text-sm">{data.warnings.length ? 'Availability cannot be confirmed while a source is unavailable.' : 'No recorded commitments on this date.'}</p>}
    {renewals.map(s => <p key={s.id} className="text-sm text-blue-600">Subscription renewal: {s.stripe_customer_name || 'Client'} (billing date; verify service schedule)</p>)}
    <Link href={calendarOnly ? '/dashboard/crm' : '/dashboard/calendar'} className="mt-2 inline-block text-sm underline">{calendarOnly ? 'Open CRM pipeline' : 'Open full calendar'}</Link>
  </section>;
  if (calendarOnly) return availability;
  return <div className="space-y-5 text-slate-900 dark:text-slate-100">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">CRM</h1><p className="text-sm text-slate-500">Keep every opportunity moving.</p></div><button className="rounded-lg bg-primary px-4 py-2 text-white" onClick={() => { setForm(blank()); setError(''); }}>Add lead</button></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {data.warnings.map(w => <p key={w} role="alert" className="text-amber-700">{w}</p>)}
    <section className={panel}><h2 className="font-semibold">Week of {summary.week}</h2><div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div><div className="text-xl font-semibold">{money(summary.value)}</div><p className="text-sm text-slate-500">{summary.open} open opportunities</p></div>
      <div><div className="text-xl font-semibold">{summary.newLeads}</div><p className="text-sm text-slate-500">New this week</p></div>
      <div><div className="text-xl font-semibold">{money(summary.wonValue)}</div><p className="text-sm text-slate-500">{summary.won} won this week</p></div>
      <button className="text-left" onClick={() => setStaleOnly(!staleOnly)}><div className="text-xl font-semibold text-amber-600">{summary.stale}</div><p className="text-sm text-slate-500">Unchanged for over 5 days {staleOnly ? '(show all)' : '(filter)'}</p></button>
    </div></section>
    {availability}
    <input className={inputClass} placeholder="Search client, project, address or notes" aria-label="Search opportunities" value={search} onChange={e => setSearch(e.target.value)} />
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[['lead'], ['scheduled'], ['quoted'], ['won','lost']].map(group => {
      const rows = data.opportunities.filter(o => group.includes(o.stage) && (!staleOnly || staleOpportunity(o)) && `${o.name} ${o.client_name} ${o.address} ${o.notes}`.toLowerCase().includes(search.toLowerCase()));
      return <section key={group[0]} className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900"><h2 className="mb-3 font-semibold">{group.length > 1 ? 'Won / Lost' : stageLabels[group[0] as keyof typeof stageLabels]} <span className="text-slate-500">{rows.length}</span></h2>
        <div className="space-y-3">{rows.map(o => <button key={o.id} className={`${panel} w-full text-left ${staleOpportunity(o) ? 'ring-2 ring-amber-400' : ''}`} onClick={() => { setForm(o); setError(''); }}>
          <p className="font-semibold">{o.name}</p><p className="text-sm">{o.client_name}</p><p className="text-xs text-slate-500">{o.address}</p><p className="mt-2 font-medium">{money(Number(o.stage === 'won' ? o.final_amount : o.value))}</p>
          {o.visit_date && <p className="text-xs">Visit: {o.visit_date} {o.visit_time?.slice(0,5)}</p>}
          {['won','lost'].includes(o.stage) && <p className="text-xs">{stageLabels[o.stage]} · {o.closed_date}</p>}
          {o.notes && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{o.notes}</p>}
          {staleOpportunity(o) && <p className="mt-2 text-xs font-semibold text-amber-700">Follow up · no changes in over 5 days</p>}
        </button>)}{!rows.length && <p className="py-6 text-center text-sm text-slate-500">No opportunities</p>}</div>
      </section>;
    })}</div>
    {form && <section ref={editor} className={panel}><form onSubmit={save} className="space-y-4"><h2 className="text-lg font-semibold">{form.id ? 'Edit opportunity' : 'New lead'}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">Existing client<select className={inputClass} value={form.client_id || ''} onChange={e => { const c = data.clients.find(c => c.id === e.target.value); setForm(c ? { ...form, client_id: c.id, client_name: c.client_name, address: c.address || '', phone: c.phone || '', email: c.email || '' } : { ...form, client_id: null }); }}><option value="">New / unlinked client</option>{data.clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}</select></label>
        <label className="text-sm">Stage<select className={inputClass} value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value as Opportunity['stage'], closed_date: ['won','lost'].includes(e.target.value) ? form.closed_date || todayKey() : form.closed_date })}>{stages.map(s => <option key={s} value={s}>{stageLabels[s]}</option>)}</select></label>
        {(['name','client_name','address','phone','email'] as const).map(k => <label key={k} className="text-sm">{{name:'Project name',client_name:'Client name',address:'Address',phone:'Phone',email:'Email'}[k]}<input className={inputClass} required={k === 'name' || k === 'client_name'} type={k === 'email' ? 'email' : 'text'} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></label>)}
        <label className="text-sm">Project value ($)<input type="number" min="0" step="0.01" required className={inputClass} value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} /></label>
        <label className="text-sm">Visit date<input type="date" required={form.stage === 'scheduled'} className={inputClass} value={form.visit_date || ''} onChange={e => setForm({ ...form, visit_date: e.target.value || null })} /></label>
        <label className="text-sm">Visit time<input type="time" required={form.stage === 'scheduled'} className={inputClass} value={form.visit_time?.slice(0,5) || ''} onChange={e => setForm({ ...form, visit_time: e.target.value || null })} /></label>
        <label className="text-sm">Visit duration (minutes)<input type="number" min="1" max="1440" required className={inputClass} value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></label>
        {(['notes','information','closing_notes'] as const).map(k => <label key={k} className="text-sm">{{notes:'Project notes',information:'Project information',closing_notes:'Closing notes'}[k]}<textarea className={inputClass} rows={3} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></label>)}
        {['won','lost'].includes(form.stage) && <><label className="text-sm">{form.stage === 'won' ? 'Win date' : 'Lost date'}<input required type="date" className={inputClass} value={form.closed_date || ''} onChange={e => setForm({ ...form, closed_date: e.target.value || null })} /></label><label className="text-sm">Final project amount ($)<input required={form.stage === 'won'} type="number" min="0" step="0.01" className={inputClass} value={form.final_amount ?? ''} onChange={e => setForm({ ...form, final_amount: e.target.value === '' ? null : Number(e.target.value) })} /></label></>}
      </div>
      <div className="flex flex-wrap gap-3"><button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-white">{saving ? 'Saving…' : 'Save opportunity'}</button><button type="button" disabled={saving} className="px-4 py-2" onClick={() => setForm(null)}>Cancel</button>
      {form.id && ['won','lost'].includes(form.stage) && !form.client_id && <button type="button" disabled={saving} onClick={() => void addClient()} className="underline">Add saved contact to client list</button>}
      {form.client_id && <Link href="/dashboard/clients" className="py-2 underline">View client directory</Link>}</div>
      <p className="text-xs text-slate-500">Adding a contact saves it for future use. It does not send messages or record marketing consent.</p>
    </form></section>}
  </div>;
}
