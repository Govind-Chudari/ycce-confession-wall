import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client with Service Role Key for admin updates
// WARNING: Never expose SUPABASE_SERVICE_ROLE_KEY in client-side code (use process.env)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { user_id, image_url } = await req.json();

    if (!user_id || !image_url) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const ocrApiKey = process.env.OCR_API_KEY;
    if (!ocrApiKey) {
      console.error("OCR_API_KEY is missing in environment variables");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Perform OCR
    const ocrRes = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: ocrApiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ url: image_url, language: "eng" }),
    });

    const ocrJson = await ocrRes.json();
    
    if (ocrJson.IsErroredOnProcessing) {
        throw new Error(ocrJson.ErrorMessage?.[0] || "OCR Processing failed");
    }

    const text = ocrJson?.ParsedResults?.[0]?.ParsedText?.toLowerCase() || "";

    // Fetch User Profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, branch, year")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Verification Logic (Case insensitive check)
    const fullNameLower = profile.full_name.toLowerCase();
    const branchLower = profile.branch.toLowerCase();
    const yearString = profile.year.toString();

    // Check if the extracted text contains the profile details
    const verified =
      text.includes(fullNameLower) &&
      text.includes(branchLower) &&
      text.includes(yearString);

    // Update Verification Status in DB
    const { error: updateError } = await supabase
      .from("id_verifications")
      .update({
        extracted_name: profile.full_name,
        extracted_branch: profile.branch,
        extracted_year: profile.year,
        status: verified ? "approved" : "rejected",
        ocr_text_dump: text.slice(0, 500) // Optional: Save snippet for debugging
      })
      .eq("user_id", user_id);

    if (updateError) throw updateError;

    // If verified, update the main profile
    if (verified) {
      await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", user_id);
    }

    return NextResponse.json({ verified });

  } catch (err: any) {
    console.error("Verification Error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}