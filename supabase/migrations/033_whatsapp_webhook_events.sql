-- Durable provider webhook diagnostics.
-- Unlike bot_events, this can record failures before a profile/user is matched.

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at           timestamptz DEFAULT now(),
  provider             text        NOT NULL DEFAULT 'telnyx',
  event_type           text,
  result               text        NOT NULL,
  user_id              uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_phone_e164    text,
  recipient_phone_e164 text,
  provider_message_id  text,
  summary              text,
  error                text,
  raw                  jsonb
);

CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_user_time
  ON public.whatsapp_webhook_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_sender_time
  ON public.whatsapp_webhook_events (sender_phone_e164, created_at DESC)
  WHERE sender_phone_e164 IS NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_result_time
  ON public.whatsapp_webhook_events (result, created_at DESC);

ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own whatsapp webhook events" ON public.whatsapp_webhook_events;
CREATE POLICY "Users read own whatsapp webhook events"
  ON public.whatsapp_webhook_events FOR SELECT
  USING (
    auth.uid() = user_id
    OR sender_phone_e164 = (
      SELECT p.phone_e164 FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role insert whatsapp webhook events" ON public.whatsapp_webhook_events;
CREATE POLICY "Service role insert whatsapp webhook events"
  ON public.whatsapp_webhook_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role delete whatsapp webhook events" ON public.whatsapp_webhook_events;
CREATE POLICY "Service role delete whatsapp webhook events"
  ON public.whatsapp_webhook_events FOR DELETE
  USING (true);
