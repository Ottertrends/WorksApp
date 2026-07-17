-- Telnyx WhatsApp routing fields.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT;

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS invited_phone_e164 TEXT;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_phone_e164
  ON public.profiles (phone_e164)
  WHERE phone_e164 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_invited_phone_e164
  ON public.team_members (invited_phone_e164)
  WHERE invited_phone_e164 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_sender_phone_e164
  ON public.messages (sender_phone_e164)
  WHERE sender_phone_e164 IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_us_phone_e164(p_phone TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_phone IS NULL OR regexp_replace(p_phone, '\D', '', 'g') = '' THEN NULL
    WHEN left(trim(p_phone), 1) = '+' THEN '+' || regexp_replace(p_phone, '\D', '', 'g')
    WHEN length(regexp_replace(p_phone, '\D', '', 'g')) = 10 THEN '+1' || regexp_replace(p_phone, '\D', '', 'g')
    WHEN length(regexp_replace(p_phone, '\D', '', 'g')) = 11
      AND left(regexp_replace(p_phone, '\D', '', 'g'), 1) = '1' THEN '+' || regexp_replace(p_phone, '\D', '', 'g')
    ELSE '+' || regexp_replace(p_phone, '\D', '', 'g')
  END;
$$;

UPDATE public.profiles
SET phone_e164 = public.normalize_us_phone_e164(phone)
WHERE phone_e164 IS NULL AND phone IS NOT NULL;

UPDATE public.team_members
SET invited_phone_e164 = public.normalize_us_phone_e164(invited_phone)
WHERE invited_phone_e164 IS NULL AND invited_phone IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    company_name,
    email,
    phone,
    phone_e164,
    quotes_per_month,
    business_areas,
    services,
    whatsapp_connected,
    whatsapp_instance_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_e164', public.normalize_us_phone_e164(NEW.raw_user_meta_data->>'phone')),
    NEW.raw_user_meta_data->>'quotes_per_month',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'business_areas', '[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'services', '[]'::jsonb))),
    COALESCE((NEW.raw_user_meta_data->>'whatsapp_connected')::boolean, false),
    NEW.raw_user_meta_data->>'whatsapp_instance_id'
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
