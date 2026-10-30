import { supabase } from "../config/supabase";
import type { CreateUserInput, UpdateUserInput, User } from "../models/userModel";

// Return BIGINT IDs as text to preserve precision in JavaScript and JSON.
const userColumns = "id::text,name,email,status,created_at,updated_at";

export async function findAllUsers(): Promise<User[]> {
  const users: User[] = [];
  const pageSize = 1000;

  // Supabase caps response sizes, so fetch additional pages when needed.
  while (true) {
    const { data, count, error } = await supabase
      .from("users")
      .select(userColumns, { count: "exact" })
      .order("id", { ascending: true })
      .range(users.length, users.length + pageSize - 1)
      .returns<User[]>();

    if (error) throw error;
    users.push(...data);

    if (data.length === 0 || (count !== null ? users.length >= count : data.length < pageSize)) {
      return users;
    }
  }
}

export async function findUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select(userColumns)
    .eq("id", id)
    .maybeSingle<User>();

  if (error) throw error;
  return data;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .insert(input)
    .select(userColumns)
    .single<User>();

  if (error) throw error;
  return data;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .update(input)
    .eq("id", id)
    .select(userColumns)
    .maybeSingle<User>();

  if (error) throw error;
  return data;
}

export async function deleteUser(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .delete()
    .eq("id", id)
    .select("id::text")
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  return data !== null;
}
