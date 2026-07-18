-- Canonicalize every profile phone before the unique E.164 index checks it.

CREATE OR REPLACE FUNCTION public.canonicalize_profile_phone_e164()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  canonical_phone text;
BEGIN
  canonical_phone := public.normalize_us_phone_e164(
    COALESCE(NULLIF(NEW.phone_e164, ''), NULLIF(NEW.phone, ''))
  );

  NEW.phone_e164 := canonical_phone;
  IF canonical_phone IS NOT NULL THEN
    NEW.phone := canonical_phone;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS canonicalize_profile_phone_e164_trigger
  ON public.profiles;

CREATE TRIGGER canonicalize_profile_phone_e164_trigger
BEFORE INSERT OR UPDATE OF phone, phone_e164
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.canonicalize_profile_phone_e164();
