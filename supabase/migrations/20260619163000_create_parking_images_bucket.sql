-- Create public Supabase Storage bucket for parking spot images.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parking-images',
  'parking-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read parking images'
  ) THEN
    CREATE POLICY "Public read parking images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'parking-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anon upload parking images'
  ) THEN
    CREATE POLICY "Anon upload parking images"
    ON storage.objects
    FOR INSERT
    TO anon
    WITH CHECK (bucket_id = 'parking-images');
  END IF;
END $$;
