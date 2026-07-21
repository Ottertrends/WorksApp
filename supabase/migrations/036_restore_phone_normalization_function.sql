-- Repair the dependency used by the profile phone canonicalization trigger.
-- This is intentionally idempotent: some environments have the trigger from
-- migration 034 even though the function from migration 031 is missing.
CREATE OR REPLACE FUNCTION public.normalize_us_phone_e164(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_phone IS NULL OR regexp_replace(p_phone, '\D', '', 'g') = '' THEN NULL
    WHEN left(trim(p_phone), 1) = '+' THEN '+' || regexp_replace(p_phone, '\D', '', 'g')
    WHEN length(regexp_replace(p_phone, '\D', '', 'g')) = 10 THEN '+1' || regexp_replace(p_phone, '\D', '', 'g')
    WHEN length(regexp_replace(p_phone, '\D', '', 'g')) = 11
      AND left(regexp_replace(p_phone, '\D', '', 'g'), 1) = '1' THEN '+' || regexp_replace(p_phone, '\D', '', 'g')
    ELSE '+' || regexp_replace(p_phone, '\D', '', 'g')
  END;
$$;

-- Recreate the trigger after its dependency so every Settings save succeeds,
-- including updates that leave the phone number unchanged.
DROP TRIGGER IF EXISTS canonicalize_profile_phone_e164_trigger ON public.profiles;

CREATE TRIGGER canonicalize_profile_phone_e164_trigger
BEFORE INSERT OR UPDATE OF phone, phone_e164
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.canonicalize_profile_phone_e164();
