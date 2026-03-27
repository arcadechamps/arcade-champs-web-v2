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

    const formData = await req.formData();
    const file = formData.get("recording") as File | null;
    const sessionId = formData.get("session_id") as string | null;

    if (!file || !sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing recording or session_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const storagePath = `${userId}/${sessionId}.webm`;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error: uploadError } = await adminClient.storage
      .from("gameplay-recordings")
      .upload(storagePath, uint8, {
        contentType: "video/webm",
        upsert: true,
      });

    if (uploadError) {
      console.error("[upload-recording] Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Upload failed", details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await adminClient
      .from("game_sessions")
      .update({ recording_path: storagePath })
      .eq("session_id", sessionId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("[upload-recording] DB update error:", updateError);
    }

    console.log(`[upload-recording] Stored ${storagePath} (${uint8.length} bytes)`);

    return new Response(
      JSON.stringify({ success: true, path: storagePath, size: uint8.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[upload-recording] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
