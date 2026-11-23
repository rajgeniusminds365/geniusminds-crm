-- ============================================================
-- 066_gm_realtime
-- Live updates for the GeniusMinds pages (GM used server-sent
-- events; wacrm uses Supabase Realtime). REPLICA IDENTITY FULL so
-- DELETE payloads carry account_id for the client-side filter.
-- ============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gm_courses', 'gm_lead_profiles', 'gm_activities', 'gm_payments',
    'gm_expenses', 'gm_channel_logs', 'gm_certificates', 'gm_landing_pages'
  ] LOOP
    EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;
