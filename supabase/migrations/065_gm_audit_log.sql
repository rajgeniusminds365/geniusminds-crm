-- ============================================================
-- 065_gm_audit_log
-- Origin: GeniusMindsCRM-Complete "Audit log" page (GM table
-- `audit_log`: who did what to which record).
--
-- Rows are written ONLY by an AFTER trigger on the GM tables (a
-- SECURITY DEFINER function), so the log can't be forged or edited
-- from the client. Readable by admins and owners only, matching GM
-- where the audit log was admin-only.
--
-- Scope: GM tables only. wacrm's own tables are deliberately not
-- hooked, so its WhatsApp / automation write paths are untouched.
-- ============================================================
CREATE TABLE IF NOT EXISTS gm_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gm_audit_log_account_created
  ON gm_audit_log(account_id, created_at DESC);

ALTER TABLE gm_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gm_audit_log_select ON gm_audit_log;
CREATE POLICY gm_audit_log_select ON gm_audit_log FOR SELECT
  USING (is_account_member(account_id, 'admin'));
-- No INSERT/UPDATE/DELETE policies: only the trigger below writes.
REVOKE INSERT, UPDATE, DELETE ON gm_audit_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.gm_write_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row JSONB;
  v_changed JSONB := '{}'::jsonb;
  k TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
  ELSE
    v_row := to_jsonb(NEW);
  END IF;

  IF TG_OP = 'UPDATE' THEN
    FOR k IN SELECT jsonb_object_keys(v_row) LOOP
      IF k NOT IN ('updated_at') AND (to_jsonb(OLD) -> k) IS DISTINCT FROM (v_row -> k) THEN
        v_changed := v_changed || jsonb_build_object(k, v_row -> k);
      END IF;
    END LOOP;
    IF v_changed = '{}'::jsonb THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO gm_audit_log (account_id, user_id, action, entity_type, entity_id, details)
  VALUES (
    (v_row ->> 'account_id')::uuid,
    auth.uid(),
    CASE TG_OP WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'update' ELSE 'delete' END,
    TG_TABLE_NAME,
    v_row ->> 'id',
    CASE TG_OP WHEN 'UPDATE' THEN v_changed ELSE v_row - 'account_id' END
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Never let an audit failure block the user's write.
  RAISE WARNING 'gm audit write failed on %: %', TG_TABLE_NAME, SQLERRM;
  RETURN NULL;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gm_courses', 'gm_lead_profiles', 'gm_activities', 'gm_payments',
    'gm_expenses', 'gm_channel_logs', 'gm_certificates', 'gm_landing_pages'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS gm_audit ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER gm_audit AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION gm_write_audit()', t);
  END LOOP;
END $$;
