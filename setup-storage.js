/**
 * Setup script to create parking-images storage bucket in Supabase
 * Run with: node setup-storage.js
 */
import { createClient } from '@supabase/supabase-js';

// Use service role key (with higher permissions)
// For development, we can use environment variables or hardcoded (not recommended for production)
const supabaseUrl = 'https://qifsgbwuxebusxxgwqtf.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZnNnYnd1eGVidXN4eHdncXRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxODYyNTcyMiwiZXhwIjoxODc2Mzk0NTIyfQ.3x5lLcY4L7pKzNk5u4JBz2Z3-9qRzPpJ8vQ9mYwR5yc';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupStorageBucket() {
  try {
    console.log('Creating parking-images storage bucket...');

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('parking-images', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Bucket parking-images already exists');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Created parking-images bucket successfully');
    }

    // Verify bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    const parkingBucket = buckets.find(b => b.id === 'parking-images');
    if (parkingBucket) {
      console.log('✅ Verified bucket exists:', parkingBucket);
    } else {
      console.log('⚠️  Bucket not found in list');
    }

    console.log('\n✅ Storage setup complete! You can now upload images.');
  } catch (err) {
    console.error('❌ Error setting up storage:', err.message);
    process.exit(1);
  }
}

setupStorageBucket();
