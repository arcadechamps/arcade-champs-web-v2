import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Webhook } from "npm:svix";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get the webhook secret from environment variables
    const webhookSecret = Deno.env.get("SEND_AND_RECEIVE_RESEND_API_KEY");

    if (!webhookSecret) {
      console.error("[receive-email-webhook] Missing RESEND_WEBHOOK_SECRET");
      return new Response(
        JSON.stringify({ error: "Server Configuration Error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read headers
    const svix_id = req.headers.get("svix-id");
    const svix_timestamp = req.headers.get("svix-timestamp");
    const svix_signature = req.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response(
        JSON.stringify({ error: "Missing svix headers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read payload
    const payload = await req.text();

    // Verify signature
    const wh = new Webhook(webhookSecret);
    let evt: any;

    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err: any) {
      console.error("[receive-email-webhook] Svix verification failed:", err.message);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[receive-email-webhook] Received verified payload:", JSON.stringify(evt).substring(0, 500));

    let fromEmail = "";
    let toEmail = "";
    let subject = "";
    let bodyText = "";
    let bodyHtml = "";

    if (evt.type === "email.received" && evt.data) {
      const d = evt.data;
      fromEmail = d.from || "";
      toEmail = Array.isArray(d.to) ? d.to[0] : (d.to || "");
      subject = d.subject || "(No Subject)";
      bodyText = d.text || "";
      bodyHtml = d.html || "";
    } else {
      console.log("[receive-email-webhook] Non-inbound event type:", evt.type);
      return new Response(
        JSON.stringify({ success: true, message: "Event acknowledged but not stored" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fromEmail) {
      return new Response(
        JSON.stringify({ error: "Missing from_email in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert into admin_emails using service role (bypasses RLS)
    const { data: insertData, error: dbError } = await supabaseAdmin
      .from("admin_emails")
      .insert({
        direction: "inbound",
        from_email: fromEmail,
        to_email: toEmail,
        subject,
        body_text: bodyText,
        body_html: bodyHtml,
        read: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[receive-email-webhook] DB insert error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to store email", details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[receive-email-webhook] Stored email:", insertData?.id);

    return new Response(
      JSON.stringify({ success: true, id: insertData?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[receive-email-webhook] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
