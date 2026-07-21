-- Team invitations reserve required contact details before account activation.
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS invited_zip_code TEXT, ADD COLUMN IF NOT EXISTS invited_phone_e164 TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS team_members_pending_or_active_phone_unique ON public.team_members (invited_phone_e164) WHERE status IN ('pending', 'active') AND invited_phone_e164 IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_team_member_phone_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('pending', 'active') AND NEW.invited_phone_e164 IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.phone_e164 = NEW.invited_phone_e164 AND p.id IS DISTINCT FROM NEW.member_user_id) THEN RAISE EXCEPTION 'This phone number is already used by a WorksApp account'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_team_member_phone_reservation ON public.team_members;
CREATE TRIGGER guard_team_member_phone_reservation BEFORE INSERT OR UPDATE OF invited_phone_e164, status, member_user_id ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.guard_team_member_phone_reservation();

CREATE OR REPLACE FUNCTION public.get_workspace_owner_id(p_user_id UUID) RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT owner_user_id FROM public.team_members WHERE member_user_id = p_user_id AND status = 'active' LIMIT 1), p_user_id);
$$;

-- Active members can edit only their owner's shared business records.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['projects','invoices','price_book','clients','proposals','subscriptions','tax_rates','invoice_designs'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "Team workspace access" ON public.%I', t);
      EXECUTE format('CREATE POLICY "Team workspace access" ON public.%I FOR ALL USING (user_id = public.get_workspace_owner_id(auth.uid())) WITH CHECK (user_id = public.get_workspace_owner_id(auth.uid()))', t);
    END IF;
  END LOOP;
END $$;
DROP POLICY IF EXISTS "Team workspace invoice items" ON public.invoice_items;
CREATE POLICY "Team workspace invoice items" ON public.invoice_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND i.user_id = public.get_workspace_owner_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND i.user_id = public.get_workspace_owner_id(auth.uid())));
