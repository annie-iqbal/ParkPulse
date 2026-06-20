ALTER TABLE parking_sessions
ADD COLUMN IF NOT EXISTS lat double precision,
ADD COLUMN IF NOT EXISTS lng double precision,
ADD COLUMN IF NOT EXISTS payment_due numeric(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS spot_note text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS ended_at timestamptz;
