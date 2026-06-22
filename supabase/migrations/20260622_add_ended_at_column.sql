-- Add ended_at column to parking_sessions table
ALTER TABLE parking_sessions
ADD COLUMN IF NOT EXISTS ended_at timestamptz DEFAULT NULL;

-- Update existing sessions
UPDATE parking_sessions
SET ended_at = created_at
WHERE status = 'cancelled' AND ended_at IS NULL;

UPDATE parking_sessions
SET ended_at = expires_at
WHERE status = 'expired' AND ended_at IS NULL;
