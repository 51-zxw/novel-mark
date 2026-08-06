import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";
const TOKEN_NAME = "admin_token";

type TokenPayload = {
  adminId: string;
  username: string;
};

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function TOKEN_KEY() {
  return TOKEN_NAME;
}

// ============================================
// 二期追加：从 Cookie 获取当前登录 Admin
// ============================================
export interface AdminPayload {
  id: string;
  username: string;
}
export async function getCurrentAdmin(): Promise<AdminPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) return null;

    // 一期签的是 adminId，二期期望的是 id，做个兼容
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (!payload) return null;

    return {
      id: payload.adminId || payload.id, // ← 兼容两种字段名
      username: payload.username,
    };
  } catch {
    return null;
  }
}
