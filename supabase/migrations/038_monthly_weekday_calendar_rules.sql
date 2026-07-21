-- Supports nth weekday monthly schedules.
ALTER TABLE public.recurring_projects ADD COLUMN IF NOT EXISTS week_of_month INTEGER;
ALTER TABLE public.recurring_projects DROP CONSTRAINT IF EXISTS recurring_projects_recurrence_type_check;
ALTER TABLE public.recurring_projects ADD CONSTRAINT recurring_projects_recurrence_type_check CHECK (recurrence_type IN ('weekly', 'interval', 'monthly', 'monthly_weekday', 'manual'));
ALTER TABLE public.recurring_projects DROP CONSTRAINT IF EXISTS recurring_projects_week_of_month_check;
ALTER TABLE public.recurring_projects ADD CONSTRAINT recurring_projects_week_of_month_check CHECK (week_of_month IS NULL OR week_of_month BETWEEN 1 AND 5);
