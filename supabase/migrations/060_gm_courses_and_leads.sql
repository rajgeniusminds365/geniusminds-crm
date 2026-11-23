-- ============================================================
-- 060_gm_courses_and_leads
--
-- Origin: GeniusMindsCRM-Complete (education / admissions features),
-- rebuilt on wacrm's Supabase stack.
--
-- Adds:
--   1. gm_courses        — batches & courses (GM "courses" table).
--   2. gm_lead_profiles  — admissions details for a wacrm contact
--                          (GM "leads" columns: status, course, area,
--                          source, follow-up). One row per contact.
--   3. gm_enforce_account_refs() — trigger that stops a row pointing
--      at a contact / course owned by a different account.
--
-- Design notes:
--   * GM leads and students ARE wacrm contacts. We never add columns
--     to `contacts` (the WhatsApp webhook, automations and dedup all
--     write there). Admissions data lives in a side table keyed on
--     contact_id, so phone numbers stay single-sourced and every
--     lead keeps its WhatsApp conversation link.
--   * A "student" is a lead whose lead_status = 'enrolled'.
--   * Money defaults to INR (GM was an Indian admissions CRM).
--   * Purely additive: no existing table, policy or function changes.
-- ============================================================

-- ------------------------------------------------------------
-- Shared guard: keep cross-table references inside one account.
-- RLS alone can't stop someone inserting a row in their own account
-- that references another account's contact UUID; this can.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gm_enforce_account_refs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r JSONB := to_jsonb(NEW);
  v_account UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.account_id IS DISTINCT FROM OLD.account_id THEN
    RAISE EXCEPTION 'account_id cannot be changed' USING ERRCODE = '42501';
  END IF;

  IF r ? 'contact_id' AND (r->>'contact_id') IS NOT NULL THEN
    SELECT account_id INTO v_account FROM contacts WHERE id = (r->>'contact_id')::uuid;
    IF v_account IS DISTINCT FROM NEW.account_id THEN
      RAISE EXCEPTION 'contact does not belong to this account' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF r ? 'course_id' AND (r->>'course_id') IS NOT NULL THEN
    SELECT account_id INTO v_account FROM gm_courses WHERE id = (r->>'course_id')::uuid;
    IF v_account IS DISTINCT FROM NEW.account_id THEN
      RAISE EXCEPTION 'course does not belong to this account' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 1. gm_courses
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gm_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  batch TEXT NOT NULL DEFAULT '',
  fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, name, batch)
);

CREATE INDEX IF NOT EXISTS idx_gm_courses_account ON gm_courses(account_id);

ALTER TABLE gm_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gm_courses_select ON gm_courses;
DROP POLICY IF EXISTS gm_courses_insert ON gm_courses;
DROP POLICY IF EXISTS gm_courses_update ON gm_courses;
DROP POLICY IF EXISTS gm_courses_delete ON gm_courses;
CREATE POLICY gm_courses_select ON gm_courses FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY gm_courses_insert ON gm_courses FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_courses_update ON gm_courses FOR UPDATE
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_courses_delete ON gm_courses FOR DELETE
  USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON gm_courses;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gm_courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS gm_account_refs ON gm_courses;
CREATE TRIGGER gm_account_refs BEFORE INSERT OR UPDATE ON gm_courses
  FOR EACH ROW EXECUTE FUNCTION gm_enforce_account_refs();

-- ------------------------------------------------------------
-- 2. gm_lead_profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gm_lead_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE CASCADE,
  course_id UUID REFERENCES gm_courses(id) ON DELETE SET NULL,
  lead_status TEXT NOT NULL DEFAULT 'new'
    CHECK (lead_status IN ('new', 'contacted', 'qualified', 'enrolled')),
  source TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  follow_up_date DATE,
  enrolled_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gm_lead_profiles_account_status
  ON gm_lead_profiles(account_id, lead_status);
CREATE INDEX IF NOT EXISTS idx_gm_lead_profiles_follow_up
  ON gm_lead_profiles(account_id, follow_up_date)
  WHERE follow_up_date IS NOT NULL;

-- Stamp the enrolment date the first time a lead becomes enrolled.
CREATE OR REPLACE FUNCTION public.gm_stamp_enrolled_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.lead_status = 'enrolled' AND NEW.enrolled_at IS NULL THEN
    NEW.enrolled_at := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE gm_lead_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gm_lead_profiles_select ON gm_lead_profiles;
DROP POLICY IF EXISTS gm_lead_profiles_insert ON gm_lead_profiles;
DROP POLICY IF EXISTS gm_lead_profiles_update ON gm_lead_profiles;
DROP POLICY IF EXISTS gm_lead_profiles_delete ON gm_lead_profiles;
CREATE POLICY gm_lead_profiles_select ON gm_lead_profiles FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY gm_lead_profiles_insert ON gm_lead_profiles FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_lead_profiles_update ON gm_lead_profiles FOR UPDATE
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_lead_profiles_delete ON gm_lead_profiles FOR DELETE
  USING (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON gm_lead_profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gm_lead_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS gm_account_refs ON gm_lead_profiles;
CREATE TRIGGER gm_account_refs BEFORE INSERT OR UPDATE ON gm_lead_profiles
  FOR EACH ROW EXECUTE FUNCTION gm_enforce_account_refs();
DROP TRIGGER IF EXISTS gm_enrolled_at ON gm_lead_profiles;
CREATE TRIGGER gm_enrolled_at BEFORE INSERT OR UPDATE ON gm_lead_profiles
  FOR EACH ROW EXECUTE FUNCTION gm_stamp_enrolled_at();
