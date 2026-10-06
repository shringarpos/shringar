import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify access_requests
    const { data: request, error: reqErr } = await supabase
      .from("access_requests")
      .select("id, status, full_name, shop_name")
      .ilike("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reqErr) throw reqErr;

    if (!request || request.status !== "approved") {
      return new Response(
        JSON.stringify({
          error:
            request?.status === "pending"
              ? "Access request is pending approval by sahilkhude11@gmail.com"
              : "Account creation is restricted to approved users.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create user with confirmed email
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: request.full_name,
        shop_name: request.shop_name,
        email_verified: true,
      },
    });

    if (createErr) throw createErr;

    // 3. Mark access request as registered
    await supabase
      .from("access_requests")
      .update({
        status: "registered",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    return new Response(
      JSON.stringify({ success: true, user: newUser.user }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
