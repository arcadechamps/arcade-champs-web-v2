const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Escape user input before putting it into the HTML email
const escapeHtml = (s: string) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-contact-email] Missing RESEND_API_KEY");
      return json({ error: "Server Configuration Error" }, 500);
    }

    const body = await req.json();
    const { name, email, subject, message } = body;
    // Frontend sends the Cloudflare Turnstile token as captchaToken
    const captchaToken = body.captchaToken ?? body.recaptchaToken;

    if (!name || !email || !message || !captchaToken) {
      return json({ error: "Missing required fields or security token" }, 400);
    }

    // Verify Cloudflare Turnstile token
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!turnstileSecret) {
      console.error("[send-contact-email] Missing TURNSTILE_SECRET_KEY");
      return json({ error: "Server Configuration Error" }, 500);
    }

    const form = new URLSearchParams();
    form.append("secret", turnstileSecret);
    form.append("response", String(captchaToken));
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (ip) form.append("remoteip", ip);

    const verificationResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form },
    );
    const verificationData = await verificationResponse.json();

    if (!verificationData.success) {
      console.warn("[send-contact-email] Turnstile verification failed:", verificationData["error-codes"]);
      return json({ error: "Security check failed. Please try again." }, 400);
    }

    // Call Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Arcade Champs <noreply@arcadechamps.com>",
        to: "admin@arcadechamps.com",
        reply_to: email,
        subject: subject || `New Contact Form Submission from ${name}`,
        html: `
          <h3>New Message from Arcade Champs Contact Form</h3>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <hr />
          <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[send-contact-email] Resend API error:", data);
      return json({ error: "Failed to send email", details: data }, 500);
    }

    return json({ success: true, data }, 200);
  } catch (err) {
    console.error("[send-contact-email] Unexpected error:", err);
    return json({ error: "Internal error", details: String(err) }, 500);
  }
});
