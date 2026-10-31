import { supabase } from "../config/supabase";
import type { CreateUserContentViewInput, UserContentView } from "../models/userContentViewModel";

// Return both BIGINT IDs as text to preserve precision in JavaScript and JSON.
const viewColumns = "user_id::text,content_id::text,watched_at";

export async function createUserContentView(input: CreateUserContentViewInput): Promise<UserContentView> {
  const { data, error } = await supabase
    .from("user_content_views")
    .insert(input)
    .select(viewColumns)
    .single<UserContentView>();

  if (error) throw error;
  return data;
}

async function findViewsBy(field: "user_id" | "content_id", id: string): Promise<UserContentView[]> {
  const views: UserContentView[] = [];
  const pageSize = 1000;
  const orderField = field === "user_id" ? "content_id" : "user_id";

  // Supabase caps response sizes, so fetch additional pages when needed.
  while (true) {
    const { data, count, error } = await supabase
      .from("user_content_views")
      .select(viewColumns, { count: "exact" })
      .eq(field, id)
      .order(orderField, { ascending: true })
      .range(views.length, views.length + pageSize - 1)
      .returns<UserContentView[]>();

    if (error) throw error;
    views.push(...data);

    if (data.length === 0 || (count !== null ? views.length >= count : data.length < pageSize)) {
      return views;
    }
  }
}

export async function findViewsByUserId(id: string): Promise<UserContentView[]> {
  return findViewsBy("user_id", id);
}

export async function findViewsByContentId(id: string): Promise<UserContentView[]> {
  return findViewsBy("content_id", id);
}
