-- ============================================================
-- 061_gm_activities
-- Origin: GeniusMindsCRM-Complete "Activities" + "Schedule" pages
-- (GM table `activities`: title, type, date, time, done).
-- Optional link to a contact and an assignee. Additive only.
-- ============================================================
CREATE TABLE IF NOT EXISTS gm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  activity_type TEXT NOT NULL DEFAULT 'call'
    CHECK (activity_type IN ('call', 'meeting', 'follow_up')),
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_time TIME,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gm_activities_due ON gm_activities(account_id, due_date);

CREATE INDEX IF NOT EXISTS idx_gm_activities_account ON gm_activities(account_id);

ALTER TABLE gm_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gm_activities_select ON gm_activities;
DROP POLICY IF EXISTS gm_activities_insert ON gm_activities;
DROP POLICY IF EXISTS gm_activities_update ON gm_activities;
DROP POLICY IF EXISTS gm_activities_delete ON gm_activities;
CREATE POLICY gm_activities_select ON gm_activities FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY gm_activities_insert ON gm_activities FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_activities_update ON gm_activities FOR UPDATE
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_activities_delete ON gm_activities FOR DELETE
  USING (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON gm_activities;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gm_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS gm_account_refs ON gm_activities;
CREATE TRIGGER gm_account_refs BEFORE INSERT OR UPDATE ON gm_activities
  FOR EACH ROW EXECUTE FUNCTION gm_enforce_account_refs();
