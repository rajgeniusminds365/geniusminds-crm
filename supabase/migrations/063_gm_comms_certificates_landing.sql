-- ============================================================
-- 063_gm_comms_certificates_landing
-- Origin: GeniusMindsCRM-Complete pages Email, Calls (GM table
-- `messages` with a `channel` column), Certificates ("select a
-- course graduate to prepare a certificate") and Landing pages
-- (GM course landing page builder: course, batch, location,
-- promise; Draft / Published). Additive only.
--
-- gm_channel_logs records email and call touchpoints. No email or
-- telephony provider is involved: GM itself only linked to tel: and
-- kept a log, and no provider credentials exist in either project.
-- ============================================================
CREATE TABLE IF NOT EXISTS gm_channel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL CHECK (channel IN ('email', 'call')),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gm_channel_logs_channel
  ON gm_channel_logs(account_id, channel, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_gm_channel_logs_account ON gm_channel_logs(account_id);

ALTER TABLE gm_channel_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gm_channel_logs_select ON gm_channel_logs;
DROP POLICY IF EXISTS gm_channel_logs_insert ON gm_channel_logs;
DROP POLICY IF EXISTS gm_channel_logs_update ON gm_channel_logs;
DROP POLICY IF EXISTS gm_channel_logs_delete ON gm_channel_logs;
CREATE POLICY gm_channel_logs_select ON gm_channel_logs FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY gm_channel_logs_insert ON gm_channel_logs FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_channel_logs_update ON gm_channel_logs FOR UPDATE
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_channel_logs_delete ON gm_channel_logs FOR DELETE
  USING (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON gm_channel_logs;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gm_channel_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS gm_account_refs ON gm_channel_logs;
CREATE TRIGGER gm_account_refs BEFORE INSERT OR UPDATE ON gm_channel_logs
  FOR EACH ROW EXECUTE FUNCTION gm_enforce_account_refs();

-- ------------------------------------------------------------
-- gm_certificates
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gm_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  course_id UUID REFERENCES gm_courses(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL CHECK (length(btrim(recipient_name)) > 0),
  course_name TEXT NOT NULL DEFAULT '',
  certificate_no TEXT NOT NULL
    DEFAULT ('CERT-' || to_char(NOW(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  issued_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, certificate_no)
);

CREATE INDEX IF NOT EXISTS idx_gm_certificates_account ON gm_certificates(account_id);

ALTER TABLE gm_certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gm_certificates_select ON gm_certificates;
DROP POLICY IF EXISTS gm_certificates_insert ON gm_certificates;
DROP POLICY IF EXISTS gm_certificates_update ON gm_certificates;
DROP POLICY IF EXISTS gm_certificates_delete ON gm_certificates;
CREATE POLICY gm_certificates_select ON gm_certificates FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY gm_certificates_insert ON gm_certificates FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_certificates_update ON gm_certificates FOR UPDATE
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_certificates_delete ON gm_certificates FOR DELETE
  USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON gm_certificates;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gm_certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS gm_account_refs ON gm_certificates;
CREATE TRIGGER gm_account_refs BEFORE INSERT OR UPDATE ON gm_certificates
  FOR EACH ROW EXECUTE FUNCTION gm_enforce_account_refs();

-- ------------------------------------------------------------
-- gm_landing_pages
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gm_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  course_id UUID REFERENCES gm_courses(id) ON DELETE SET NULL,
  course_name TEXT NOT NULL CHECK (length(btrim(course_name)) > 0),
  batch_label TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  promise TEXT NOT NULL DEFAULT '',
  -- Where the "Enquire now" button points (wa.me link, form, mailto:, tel:).
  cta_url TEXT NOT NULL DEFAULT ''
    CHECK (cta_url = '' OR cta_url ~* '^(https?://|mailto:|tel:)'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gm_landing_pages_account ON gm_landing_pages(account_id);

ALTER TABLE gm_landing_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gm_landing_pages_select ON gm_landing_pages;
DROP POLICY IF EXISTS gm_landing_pages_insert ON gm_landing_pages;
DROP POLICY IF EXISTS gm_landing_pages_update ON gm_landing_pages;
DROP POLICY IF EXISTS gm_landing_pages_delete ON gm_landing_pages;
CREATE POLICY gm_landing_pages_select ON gm_landing_pages FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY gm_landing_pages_insert ON gm_landing_pages FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_landing_pages_update ON gm_landing_pages FOR UPDATE
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_landing_pages_delete ON gm_landing_pages FOR DELETE
  USING (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON gm_landing_pages;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gm_landing_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS gm_account_refs ON gm_landing_pages;
CREATE TRIGGER gm_account_refs BEFORE INSERT OR UPDATE ON gm_landing_pages
  FOR EACH ROW EXECUTE FUNCTION gm_enforce_account_refs();
