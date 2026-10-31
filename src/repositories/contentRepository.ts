import { supabase } from "../config/supabase";
import type { CreateContentInput, UpdateContentInput, Content } from "../models/contentModel";

// Return BIGINT IDs as text to preserve precision in JavaScript and JSON.
const contentColumns = "id::text,module_id::text,title,content,created_at,updated_at";

export async function findAllContents(): Promise<Content[]> {
  const contents: Content[] = [];
  const pageSize = 1000;

  // Supabase caps response sizes, so fetch additional pages when needed.
  while (true) {
    const { data, count, error } = await supabase
      .from("contents")
      .select(contentColumns, { count: "exact" })
      .order("id", { ascending: true })
      .range(contents.length, contents.length + pageSize - 1)
      .returns<Content[]>();

    if (error) throw error;
    contents.push(...data);

    if (data.length === 0 || (count !== null ? contents.length >= count : data.length < pageSize)) {
      return contents;
    }
  }
}

export async function findContentById(id: string): Promise<Content | null> {
  const { data, error } = await supabase
    .from("contents")
    .select(contentColumns)
    .eq("id", id)
    .maybeSingle<Content>();

  if (error) throw error;
  return data;
}

export async function createContent(input: CreateContentInput): Promise<Content> {
  const { data, error } = await supabase
    .from("contents")
    .insert(input)
    .select(contentColumns)
    .single<Content>();

  if (error) throw error;
  return data;
}

export async function updateContent(id: string, input: UpdateContentInput): Promise<Content | null> {
  const { data, error } = await supabase
    .from("contents")
    .update(input)
    .eq("id", id)
    .select(contentColumns)
    .maybeSingle<Content>();

  if (error) throw error;
  return data;
}

export async function deleteContent(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("contents")
    .delete()
    .eq("id", id)
    .select("id::text")
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  return data !== null;
}
