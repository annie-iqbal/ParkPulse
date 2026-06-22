import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

serve(async (req) => {
  try {
    console.log("Creating parking-images bucket...")

    // Create the bucket using the admin client
    const { data, error } = await supabase.storage.createBucket("parking-images", {
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
      ],
    })

    if (error) {
      if (error.message?.includes("already exists")) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Bucket parking-images already exists",
          }),
          { headers: { "Content-Type": "application/json" } }
        )
      }
      throw error
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Created parking-images bucket successfully",
        bucket: data,
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
