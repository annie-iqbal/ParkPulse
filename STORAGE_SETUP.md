# Parking Images Storage Setup Guide

## Overview
The app requires a `parking-images` storage bucket in Supabase to store parking spot photos captured in the Park feature. This guide provides multiple methods to create it.

## Storage Bucket Specifications
- **Bucket ID**: `parking-images`
- **Public**: Yes (allows public read access)
- **File Size Limit**: 10MB (10485760 bytes)
- **Allowed MIME Types**: 
  - image/jpeg
  - image/png
  - image/webp
  - image/heic
  - image/heif

## Method 1: Supabase Dashboard (Easiest)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Sign in and select your project: `qifsgbwuxebusxxgwqtf`
3. In the left sidebar, click **Storage**
4. Click **Create a new bucket**
5. Fill in the form:
   - **Name**: `parking-images`
   - **Visibility**: Select "Public"
6. Click **Create bucket**
7. After creation, click the bucket and select **Policies**
8. Add a policy for public read:
   - **Allowed operations**: SELECT
   - **Policy Name**: Public read parking images
   - **Target roles**: anon, authenticated
   - Leave target checked roles as is, click **Review**
   - For the policy definition, use:
     ```
     true
     ```
9. Add a policy for anon uploads:
   - **Allowed operations**: INSERT
   - **Policy Name**: Anon upload parking images
   - **Target roles**: anon
   - For the policy definition, use:
     ```
     (bucket_id = 'parking-images')
     ```

## Method 2: SQL Query (Via Supabase SQL Editor)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. In the left sidebar, click **SQL Editor**
4. Click **New query**
5. Paste the following SQL:

```sql
-- Create the storage bucket for parking images
INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, allowed_mime_types)
VALUES (
  'parking-images',
  'parking-images',
  (SELECT id FROM auth.users LIMIT 1),
  true,
  10485760,
  '["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]'
)
ON CONFLICT (id) DO NOTHING;

-- Create public read policy
CREATE POLICY "Public read parking images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'parking-images');

-- Create anon upload policy
CREATE POLICY "Anon upload parking images"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'parking-images');
```

6. Click **Run**
7. Verify success in the output

## Method 3: Using Supabase CLI (For Developers)

1. Ensure you have the Supabase CLI installed:
   ```bash
   brew install supabase/tap/supabase
   ```

2. Link your local project to Supabase (requires access token):
   ```bash
   supabase link --project-ref qifsgbwuxebusxxgwqtf
   ```
   You'll need your Supabase access token from: https://app.supabase.com/account/tokens

3. Push migrations:
   ```bash
   supabase db push
   ```

4. Deploy functions:
   ```bash
   supabase functions deploy setup-storage
   ```

## Method 4: Using Edge Function (Automated Setup)

1. An Edge Function `setup-storage` has been created at `supabase/functions/setup-storage/index.ts`
2. Deploy it using the Supabase CLI:
   ```bash
   supabase functions deploy setup-storage
   ```
3. Once deployed, call it from your app or via curl:
   ```bash
   curl -X POST https://qifsgbwuxebusxxgwqtf.supabase.co/functions/v1/setup-storage \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

## Verification

After creating the bucket, verify it exists:

```bash
curl -s https://qifsgbwuxebusxxgwqtf.supabase.co/storage/v1/bucket \
  -H "Authorization: Bearer sb_publishable_rjPqvgv7AMwinmu9UuyxmA_m0Lf2dNH" | jq .
```

You should see `parking-images` in the response array.

## Testing Image Upload

Once the bucket is created:

1. Open the app at `http://localhost:5173`
2. Navigate to the **Park** tab
3. Take a photo or upload an image
4. Fill in parking details
5. Click **Confirm**
6. The image should upload successfully and be associated with the parking session

## Troubleshooting

### "Bucket not found" Error
- Verify the bucket exists using the verification curl command above
- Check that the bucket name is exactly `parking-images` (case-sensitive)

### "403 Unauthorized" Error
- Ensure the bucket has public read access
- Check that policies are correctly configured
- Verify bucket policies allow anonymous uploads

### "File size limit exceeded" Error
- The bucket is set to 10MB limit
- Try uploading a smaller image
- Check image compression settings in the app

### Upload Still Not Working
- Clear browser cache: Cmd+Shift+Delete
- Check browser console for detailed error messages
- Verify image file size is under 10MB
- Try uploading via the dashboard first to confirm bucket works

## Next Steps

Once the bucket is set up:
1. Test image uploads in the Park feature
2. Verify images are stored and accessible
3. Check that parking sessions are created with image_url populated
