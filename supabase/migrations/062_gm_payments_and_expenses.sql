-- ============================================================
-- 062_gm_payments_and_expenses
-- Origin: GeniusMindsCRM-Complete "Payments received", "Fee
-- management" and "Expenses" pages (GM tables `payments`,
-- `expenses`). Money defaults to INR. Additive only.
--
-- payer_name is kept alongside contact_id (as GM stored a name) so a
-- payment still reads correctly if its contact is later deleted.
-- Expense approval (status change) is limited to admins+ via the
-- update policy; agents can record and delete expenses.
-- ============================================================
CREATE TABLE IF NOT EXISTS gm_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  payer_name TEXT NOT NULL CHECK (length(btrim(payer_name)) > 0),
  course_id UUID REFERENCES gm_courses(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT NOT NULL DEFAULT '',
  reference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'pending', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gm_payments_paid_on ON gm_payments(account_id, paid_on DESC);
CREATE INDEX IF NOT EXISTS idx_gm_payments_contact ON gm_payments(contact_id);

CREATE INDEX IF NOT EXISTS idx_gm_payments_account ON gm_payments(account_id);

ALTER TABLE gm_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gm_payments_select ON gm_payments;
DROP POLICY IF EXISTS gm_payments_insert ON gm_payments;
DROP POLICY IF EXISTS gm_payments_update ON gm_payments;
DROP POLICY IF EXISTS gm_payments_delete ON gm_payments;
CREATE POLICY gm_payments_select ON gm_payments FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY gm_payments_insert ON gm_payments FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_payments_update ON gm_payments FOR UPDATE
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_payments_delete ON gm_payments FOR DELETE
  USING (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON gm_payments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gm_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS gm_account_refs ON gm_payments;
CREATE TRIGGER gm_account_refs BEFORE INSERT OR UPDATE ON gm_payments
  FOR EACH ROW EXECUTE FUNCTION gm_enforce_account_refs();

-- ------------------------------------------------------------
-- gm_expenses
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gm_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  category TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  spent_on DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gm_expenses_spent_on ON gm_expenses(account_id, spent_on DESC);

CREATE INDEX IF NOT EXISTS idx_gm_expenses_account ON gm_expenses(account_id);

ALTER TABLE gm_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gm_expenses_select ON gm_expenses;
DROP POLICY IF EXISTS gm_expenses_insert ON gm_expenses;
DROP POLICY IF EXISTS gm_expenses_update ON gm_expenses;
DROP POLICY IF EXISTS gm_expenses_delete ON gm_expenses;
CREATE POLICY gm_expenses_select ON gm_expenses FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY gm_expenses_insert ON gm_expenses FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY gm_expenses_update ON gm_expenses FOR UPDATE
  USING (is_account_member(account_id, 'admin'))
  WITH CHECK (is_account_member(account_id, 'admin'));
CREATE POLICY gm_expenses_delete ON gm_expenses FOR DELETE
  USING (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON gm_expenses;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gm_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS gm_account_refs ON gm_expenses;
CREATE TRIGGER gm_account_refs BEFORE INSERT OR UPDATE ON gm_expenses
  FOR EACH ROW EXECUTE FUNCTION gm_enforce_account_refs();
