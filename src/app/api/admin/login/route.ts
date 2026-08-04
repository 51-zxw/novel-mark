import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { signToken, TOKEN_KEY } from "@/lib/auth";
import type { AdminUser } from "@/types/database";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "缺少用户名或密码" }, { status: 400 });
  }

  // 查用户
  const { data, error } = await supabaseAdmin()
    .from("admin_users")
    .select("*")
    .eq("username", username)
    .single();

  const admin = data as AdminUser | null;
  if (error || !admin) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  // 验密码
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  // 签发 token
  const token = signToken({
    adminId: admin.id,
    username: admin.username,
  });

  // 更新 last_login
  await supabaseAdmin()
    .from("admin_users")
    .update({ last_login: new Date().toISOString() } as never)
    .eq("id", admin.id);

  const response = NextResponse.json({ ok: true, username: admin.username });
  response.cookies.set(TOKEN_KEY(), token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
