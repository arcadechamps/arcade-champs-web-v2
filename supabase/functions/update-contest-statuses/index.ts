import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Transition upcoming → active where starts_at has passed
    const { data: activated, error: err1 } = await supabase
      .from("contests")
      .update({ status: "active" })
      .eq("status", "upcoming")
      .lte("starts_at", new Date().toISOString())
      .not("starts_at", "is", null)
      .select("id, title");

    // Transition active → closed where ends_at has passed
    const { data: closed, error: err2 } = await supabase
      .from("contests")
      .update({ status: "closed" })
      .eq("status", "active")
      .lte("ends_at", new Date().toISOString())
      .not("ends_at", "is", null)
      .select("id, title");

    if (err1) console.error("Error activating contests:", err1);
    if (err2) console.error("Error closing contests:", err2);

    return new Response(
      JSON.stringify({
        activated: activated?.length ?? 0,
        closed: closed?.length ?? 0,
        activatedContests: activated ?? [],
        closedContests: closed ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("update-contest-statuses error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
