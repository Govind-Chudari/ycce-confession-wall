import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, image_url } = await req.json();

    if (!user_id || !image_url) {
      return new Response(
        JSON.stringify({ error: "Missing data" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // OCR
    const ocrRes = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: Deno.env.get("OCR_API_KEY")!,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ url: image_url, language: "eng" }),
    });

    const ocrJson = await ocrRes.json();
    const text =
      ocrJson?.ParsedResults?.[0]?.ParsedText?.toLowerCase() || "";

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, branch, year")
      .eq("id", user_id)
      .single();

    if (!profile) throw new Error("Profile not found");

    const verified =
      text.includes(profile.full_name.toLowerCase()) &&
      text.includes(profile.branch.toLowerCase()) &&
      text.includes(profile.year.toString());

    await supabase
      .from("id_verifications")
      .update({
        extracted_name: profile.full_name,
        extracted_branch: profile.branch,
        extracted_year: profile.year,
        status: verified ? "approved" : "rejected",
      })
      .eq("user_id", user_id);

    if (verified) {
      await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", user_id);
    }

    return new Response(
      JSON.stringify({ verified }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
