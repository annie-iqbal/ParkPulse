-- Add image_url column to parking_sessions table
ALTER TABLE parking_sessions 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create a comment for documentation
COMMENT ON COLUMN parking_sessions.image_url IS 'URL to the parking spot visual reference image stored in Supabase Storage';
