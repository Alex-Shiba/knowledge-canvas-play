import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, phone, code, twilio_from } = await req.json();

    if (!phone || typeof phone !== "string" || !phone.startsWith("+")) {
      return new Response(JSON.stringify({ error: "Неверный формат номера телефона" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- SEND OTP ---
    if (action === "send") {
      const fromNumber = twilio_from || Deno.env.get("TWILIO_PHONE_NUMBER");
      if (!fromNumber) {
        return new Response(JSON.stringify({ error: "Twilio phone number not configured. Set TWILIO_PHONE_NUMBER secret." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate 6-digit code
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

      // Invalidate old codes for this phone
      await supabase
        .from("phone_otps")
        .delete()
        .eq("phone", phone);

      // Store new OTP
      const { error: insertError } = await supabase
        .from("phone_otps")
        .insert({ phone, code: otpCode, expires_at: expiresAt });

      if (insertError) {
        console.error("Insert OTP error:", insertError);
        return new Response(JSON.stringify({ error: "Ошибка сохранения кода" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send SMS via Twilio gateway
      const smsResponse = await fetch(`${GATEWAY_URL}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TWILIO_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: fromNumber,
          Body: `QuizFlow: ваш код подтверждения ${otpCode}`,
        }),
      });

      const smsData = await smsResponse.json();
      if (!smsResponse.ok) {
        console.error("Twilio error:", JSON.stringify(smsData));
        return new Response(JSON.stringify({ error: "Ошибка отправки SMS" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- VERIFY OTP ---
    if (action === "verify") {
      if (!code || typeof code !== "string") {
        return new Response(JSON.stringify({ error: "Код не указан" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: otp, error: otpError } = await supabase
        .from("phone_otps")
        .select("*")
        .eq("phone", phone)
        .eq("code", code)
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otpError || !otp) {
        return new Response(JSON.stringify({ error: "Неверный или просроченный код" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark as verified
      await supabase
        .from("phone_otps")
        .update({ verified: true })
        .eq("id", otp.id);

      // Find or create user by phone
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.phone === phone);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user with phone
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          phone,
          phone_confirm: true,
          user_metadata: { display_name: phone },
        });
        if (createError || !newUser.user) {
          console.error("Create user error:", createError);
          return new Response(JSON.stringify({ error: "Ошибка создания пользователя" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = newUser.user.id;
      }

      // Generate session link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: `${phone.replace(/\+/g, "")}@phone.local`,
      });

      // Alternative: use a custom approach - sign in with a generated password
      // For simplicity, let's create a magic link-style token
      // Instead, we'll use admin to generate a session directly
      
      // Use a workaround: create a temporary email-based user and swap
      // Actually, the simplest way is to use the phone-based sign-in token
      
      // Generate a one-time token by using admin API
      const generatedPassword = crypto.randomUUID();
      
      // Update user with a known password
      await supabase.auth.admin.updateUser(userId, {
        password: generatedPassword,
        email: `phone_${phone.replace(/\+/g, "")}@quizflow.local`,
        email_confirm: true,
      });

      // Now sign in with that password to get a session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: `phone_${phone.replace(/\+/g, "")}@quizflow.local`,
        password: generatedPassword,
      });

      if (signInError || !signInData.session) {
        console.error("Sign in error:", signInError);
        return new Response(JSON.stringify({ error: "Ошибка авторизации" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clean up - change password to something random so the temp password can't be reused
      await supabase.auth.admin.updateUser(userId, {
        password: crypto.randomUUID(),
      });

      return new Response(JSON.stringify({
        success: true,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Неизвестное действие" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Phone OTP error:", err);
    return new Response(JSON.stringify({ error: "Внутренняя ошибка сервера" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
