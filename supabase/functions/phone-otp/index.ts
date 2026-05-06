import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { phone } = await req.json();

    if (!phone || typeof phone !== "string" || !/^\+\d{10,15}$/.test(phone)) {
      return new Response(JSON.stringify({ error: "Неверный формат номера телефона" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fakeEmail = `phone_${phone.replace(/\+/g, "")}@quizflow.local`;

    // Find existing user by phone
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let user = existingUsers?.users?.find(
      (u) => u.phone === phone.replace(/^\+/, "") || u.email === fakeEmail
    );

    if (!user) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: fakeEmail,
        email_confirm: true,
        user_metadata: { display_name: phone, phone },
      });
      if (createError || !newUser.user) {
        console.error("Create user error:", createError);
        return new Response(JSON.stringify({ error: "Ошибка создания пользователя" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = newUser.user;
    }

    // Issue session via temporary password
    const tempPassword = crypto.randomUUID();
    await supabase.auth.admin.updateUserById(user.id, {
      password: tempPassword,
      email: fakeEmail,
      email_confirm: true,
    });

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password: tempPassword,
    });

    // Rotate password so the temp value can't be reused
    await supabase.auth.admin.updateUserById(user.id, { password: crypto.randomUUID() });

    if (signInError || !signInData.session) {
      console.error("Sign in error:", signInError);
      return new Response(JSON.stringify({ error: "Ошибка авторизации" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Phone login error:", err);
    return new Response(JSON.stringify({ error: "Внутренняя ошибка сервера" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
