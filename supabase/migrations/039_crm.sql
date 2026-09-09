BEGIN;

CREATE TABLE public.crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  client_name text NOT NULL CHECK (length(trim(client_name)) > 0),
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  information text NOT NULL DEFAULT '',
  value numeric(14,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  stage text NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead','scheduled','quoted','won','lost')),
  visit_date date,
  visit_time time,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 1 AND 1440),
  closed_date date,
  final_amount numeric(14,2) CHECK (final_amount >= 0),
  closing_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (stage <> 'scheduled' OR (visit_date IS NOT NULL AND visit_time IS NOT NULL)),
  CHECK (stage NOT IN ('won','lost') OR closed_date IS NOT NULL),
  CHECK (stage <> 'won' OR final_amount IS NOT NULL)
);
CREATE INDEX crm_workspace_stage ON public.crm_opportunities(user_id, stage);
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace CRM access" ON public.crm_opportunities FOR ALL
  USING (user_id = public.get_workspace_owner_id(auth.uid()))
  WITH CHECK (user_id = public.get_workspace_owner_id(auth.uid()));
CREATE FUNCTION public.touch_crm_opportunity() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clients WHERE id = NEW.client_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Client must belong to the same workspace';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := OLD.updated_at;
    IF NEW IS DISTINCT FROM OLD THEN NEW.updated_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER touch_crm BEFORE INSERT OR UPDATE ON public.crm_opportunities
FOR EACH ROW EXECUTE FUNCTION public.touch_crm_opportunity();

-- Transactional, retry-safe promotion. Only the authenticated server calls this.
CREATE FUNCTION public.crm_add_client(p_user_id uuid, p_id uuid, p_limit integer)
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE opportunity public.crm_opportunities; saved_id uuid;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  SELECT * INTO opportunity FROM public.crm_opportunities WHERE id = p_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Opportunity not found'; END IF;
  IF opportunity.client_id IS NOT NULL THEN RETURN opportunity.client_id; END IF;
  IF opportunity.stage NOT IN ('won','lost') THEN RAISE EXCEPTION 'Save the won/lost stage before adding the client'; END IF;
  IF (SELECT count(*) FROM public.clients WHERE user_id = p_user_id) >= p_limit THEN RAISE EXCEPTION 'Client plan limit reached. Upgrade to add clients.'; END IF;
  INSERT INTO public.clients(user_id, client_name, address, email, phone, notes)
  VALUES(p_user_id, opportunity.client_name, opportunity.address, nullif(opportunity.email,''), nullif(opportunity.phone,''), concat_ws(E'\n', opportunity.notes, opportunity.information, opportunity.closing_notes)) RETURNING id INTO saved_id;
  UPDATE public.crm_opportunities SET client_id = saved_id WHERE id = p_id;
  RETURN saved_id;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_add_client(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_add_client(uuid, uuid, integer) TO service_role;

COMMIT;
