import type { RecurringRule } from '@/app/api/recurring/route';
import type { Opportunity } from './model';

export function ruleOccurs(rule: RecurringRule, key: string): boolean {
  if (!rule.active || key < rule.start_date) return false;
  const d = new Date(key + 'T00:00:00Z');
  if (rule.recurrence_type === 'manual') return !!rule.manual_dates?.includes(key);
  if (rule.recurrence_type === 'weekly') return d.getUTCDay() === rule.day_of_week;
  if (rule.recurrence_type === 'monthly') return d.getUTCDate() === rule.day_of_month;
  if (rule.recurrence_type === 'monthly_weekday') return d.getUTCDay() === rule.day_of_week && Math.ceil(d.getUTCDate()/7) === rule.week_of_month;
  if (rule.recurrence_type === 'interval' && rule.interval_days && rule.interval_days > 0) {
    const anchor = new Date(rule.next_occurrence + 'T00:00:00Z');
    const days = Math.round((d.getTime() - anchor.getTime()) / 86400000);
    return d.getUTCDay() !== 0 && (days % rule.interval_days === 0 || (d.getUTCDay() === 1 && (days-1) % rule.interval_days === 0));
  }
  return false;
}
export function commitments(key: string, rows: Opportunity[], rules: RecurringRule[], excludeId?: string) {
  return [
    ...rows.filter(o => o.id !== excludeId && o.visit_date === key && o.stage !== 'lost').map(o => ({ label: `${o.client_name}: ${o.name}`, time: o.visit_time, duration: o.duration_minutes, source: 'CRM visit' })),
    ...rules.filter(r => ruleOccurs(r,key)).map(r => ({ label: r.project_name || r.notes || 'Scheduled service', time: r.event_time, duration: null, source: 'Calendar' })),
  ];
}
