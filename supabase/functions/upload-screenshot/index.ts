import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get("screenshot") as File | null;
    const sessionId = formData.get("session_id") as string | null;

    if (!file || !sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing screenshot or session_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Compress: convert PNG to JPEG at 70% quality using canvas API (not available in Deno)
    // Instead, we'll just store the PNG as-is but limit size. 
    // For real compression we can use the sharp-like approach or just accept the PNG.
    // The screenshot is typically small (canvas capture ~50-200KB).

    const storagePath = `${userId}/${sessionId}.png`;

    // Use service role client to bypass RLS for storage upload
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error: uploadError } = await adminClient.storage
      .from("gameplay-screenshots")
      .upload(storagePath, uint8, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[upload-screenshot] Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Upload failed", details: uploadError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get current screenshot count to increment
    const { data: sessionData } = await adminClient
      .from("game_sessions")
      .select("screenshot_count")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    const currentCount = sessionData?.screenshot_count || 0;

    // Update game_sessions with screenshot path and incremented count
    const { error: updateError } = await adminClient
      .from("game_sessions")
      .update({ 
        screenshot_path: storagePath,
        screenshot_count: currentCount + 1
      })
      .eq("session_id", sessionId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("[upload-screenshot] DB update error:", updateError);
    }

    console.log(`[upload-screenshot] Stored ${storagePath} (${uint8.length} bytes), count: ${currentCount + 1}`);

    return new Response(
      JSON.stringify({ success: true, path: storagePath, size: uint8.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[upload-screenshot] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
