-- Keep one WhatsApp-routable phone number mapped to one WorksApp profile.

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_e164_unique
  ON public.profiles (phone_e164)
  WHERE phone_e164 IS NOT NULL AND phone_e164 <> '';

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
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
