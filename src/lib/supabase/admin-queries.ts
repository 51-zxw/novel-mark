import { supabaseAdmin } from "./admin";
import type { Book, AdminUser } from "@/types/database";

export async function adminLogin(
  username: string,
  passwordHash: string
): Promise<AdminUser | null> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("username", username)
    .eq("password_hash", passwordHash)
    .single();
  if (error) throw error;
  return (data as AdminUser) || null;
}

export async function adminListBooks(): Promise<Book[]> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Book[]) || [];
}

export async function fetchBookForAdmin(id: string): Promise<Book | null> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return (data as Book) || null;
}

export async function adminCreateBook(book: Partial<Book>): Promise<Book> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("books")
    .insert([book] as never)
    .select()
    .single();
  if (error) throw error;
  return data as Book;
}

export async function adminUpdateBook(
  id: string,
  book: Partial<Book>
): Promise<void> {
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("books")
    .update(book as never)
    .eq("id", id);
  if (error) throw error;
}

export async function adminDeleteBook(id: string): Promise<void> {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) throw error;
}
