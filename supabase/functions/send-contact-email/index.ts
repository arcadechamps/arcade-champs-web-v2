const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-contact-email] Missing RESEND_API_KEY");
      return new Response(
        JSON.stringify({ error: "Server Configuration Error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { name, email, subject, message, recaptchaToken } = body;

    if (!name || !email || !message || !recaptchaToken) {
      return new Response(
        JSON.stringify({ error: "Missing required fields or security token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify reCAPTCHA token
    const recaptchaSecret = Deno.env.get("RECAPTCHA_SECRET_KEY");
    if (!recaptchaSecret) {
      console.error("[send-contact-email] Missing RECAPTCHA_SECRET_KEY");
      return new Response(
        JSON.stringify({ error: "Server Configuration Error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verificationResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${encodeURIComponent(recaptchaSecret)}&response=${encodeURIComponent(recaptchaToken)}`,
    });

    const verificationData = await verificationResponse.json();

    if (!verificationData.success || verificationData.score < 0.5) {
      console.warn("[send-contact-email] reCAPTCHA verification failed:", verificationData);
      return new Response(
        JSON.stringify({ error: "Security check failed. Please try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <hr />
          <p>${message.replace(/\n/g, "<br>")}</p>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[send-contact-email] Resend API error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: data }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-contact-email] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
