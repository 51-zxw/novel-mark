import { NextResponse } from "next/server";
import { TOKEN_KEY } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(TOKEN_KEY());
  return response;
}
