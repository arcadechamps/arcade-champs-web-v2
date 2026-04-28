import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    // ── Auth: verify the caller is an admin ──────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin status via is_admin() RPC
    const { data: isAdmin } = await supabaseUser.rpc("is_admin");
    if (isAdmin !== true) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse body ───────────────────────────────────────────────────
    const body = await req.json();
    const { to, subject, message, html } = body;

    if (!to || !subject || (!message && !html)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, and message or html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-admin-email] Missing RESEND_API_KEY");
      return new Response(
        JSON.stringify({ error: "Server Configuration Error: Missing email provider key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Build HTML body ──────────────────────────────────────────────
    const emailHtml = html || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 24px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #00d4ff; margin: 0; font-size: 20px;">Arcade Champs</h2>
        </div>
        <div style="background: #0f0f23; padding: 24px; color: #e0e0e0; border-radius: 0 0 8px 8px; border: 1px solid #2a2a4a; border-top: none;">
          <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
          <hr style="border: none; border-top: 1px solid #2a2a4a; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">This email was sent from Arcade Champs administration.<br/>Do not reply directly — use the contact form at arcadechamps.com/contact</p>
        </div>
      </div>
    `;

    // ── Send via Resend ──────────────────────────────────────────────
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Arcade Champs <admin@arcadechamps.com>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html: emailHtml,
        text: message || "",
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("[send-admin-email] Resend API error:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Log to admin_emails table ────────────────────────────────────
    const recipients = Array.isArray(to) ? to : [to];
    const inserts = recipients.map((recipient: string) => ({
      direction: "outbound",
      from_email: "admin@arcadechamps.com",
      to_email: recipient,
      subject,
      body_text: message || "",
      body_html: emailHtml,
      read: true, // outbound emails are "read" by default
    }));

    const { error: dbError } = await supabaseAdmin
      .from("admin_emails")
      .insert(inserts);

    if (dbError) {
      console.error("[send-admin-email] DB insert error:", dbError);
      // Email was sent successfully so we still return success
    }

    return new Response(
      JSON.stringify({ success: true, data: resendData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-admin-email] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
