
CREATE TABLE parking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL,
  zone text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  reminder_enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE parking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_select_sessions" ON parking_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "allow_insert_sessions" ON parking_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "allow_update_sessions" ON parking_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_sessions" ON parking_sessions FOR DELETE TO anon USING (true);
