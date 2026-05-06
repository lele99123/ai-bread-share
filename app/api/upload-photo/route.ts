import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const branchId = formData.get("branch_id") as string;
    const photo = formData.get("photo") as File;

    if (!branchId || !photo) {
      return NextResponse.json({ error: "Missing branch_id or photo" }, { status: 400 });
    }

    // Get branch to check ownership
    const { data: branch, error: branchErr } = await supabase
      .from("recipe_branches")
      .select("recipe_id, recipes!inner(author_id)")
      .eq("id", branchId)
      .single();

    if (branchErr || !branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Upload photo to storage
    const ext = photo.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("outcome-photos")
      .upload(fileName, photo);

    if (uploadErr) {
      return NextResponse.json({ error: "Upload failed: " + uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("outcome-photos").getPublicUrl(fileName);

    // Update branch with photo URL
    const { error: updateErr } = await supabase
      .from("recipe_branches")
      .update({ outcome_photo_url: urlData.publicUrl })
      .eq("id", branchId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update branch" }, { status: 500 });
    }

    return NextResponse.json({ success: true, outcome_photo_url: urlData.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}