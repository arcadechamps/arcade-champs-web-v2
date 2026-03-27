import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } =
      await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Parse session_id
    const { session_id } = await req.json();
    if (!session_id || typeof session_id !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing session_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Retrieve Stripe session
    const stripe = new Stripe(Deno.env.get("STRIPE_TEST_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Validate payment
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Payment not completed", status: session.payment_status }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the session belongs to this user
    if (session.metadata?.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Session does not belong to this user" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const amountCents = parseInt(session.metadata?.amount_cents || "0", 10);
    if (amountCents <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use service role to insert transaction (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check for duplicate — prevent double-crediting
    const { data: existing } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "topup")
      .eq("status", "succeeded")
      .eq("meta->>stripe_session_id", session_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          already_credited: true,
          amount_cents: amountCents,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Insert the wallet transaction — the DB trigger will update balance
    const { error: txError } = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        user_id: userId,
        type: "topup",
        status: "succeeded",
        amount_cents: amountCents,
        meta: {
          stripe_session_id: session_id,
          stripe_payment_intent: session.payment_intent,
        },
      });

    if (txError) {
      console.error("Failed to insert transaction:", txError);
      return new Response(
        JSON.stringify({ error: "Failed to credit wallet" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, amount_cents: amountCents }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error verifying payment:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
