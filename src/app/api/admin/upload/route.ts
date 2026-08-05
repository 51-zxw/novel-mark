import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyToken, TOKEN_KEY } from "@/lib/auth";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function getExt(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY())?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  }

  const ext = getExt(file.name);
  if (!ALLOWED_EXT.includes(ext) || !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `不支持的图片格式，仅支持 ${ALLOWED_EXT.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `图片不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // 生成唯一文件名，避免冲突 + 避免中文文件名导致的 URL 问题
  const safeName = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  const supabase = supabaseAdmin();

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("book-covers")
    .upload(safeName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("book-covers")
    .getPublicUrl(safeName);

  return NextResponse.json({
    url: urlData.publicUrl,
    path: uploadData.path,
  });
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
