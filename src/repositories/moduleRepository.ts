import { supabase } from "../config/supabase";
import type { CreateModuleInput, UpdateModuleInput, Module } from "../models/moduleModel";

// Return BIGINT IDs as text to preserve precision in JavaScript and JSON.
const moduleColumns = "id::text,course_id::text,user_id::text,title,description,created_at,updated_at";

export async function findAllModules(): Promise<Module[]> {
  const modules: Module[] = [];
  const pageSize = 1000;

  // Supabase caps response sizes, so fetch additional pages when needed.
  while (true) {
    const { data, count, error } = await supabase
      .from("modules")
      .select(moduleColumns, { count: "exact" })
      .order("id", { ascending: true })
      .range(modules.length, modules.length + pageSize - 1)
      .returns<Module[]>();

    if (error) throw error;
    modules.push(...data);

    if (data.length === 0 || (count !== null ? modules.length >= count : data.length < pageSize)) {
      return modules;
    }
  }
}

export async function findModuleById(id: string): Promise<Module | null> {
  const { data, error } = await supabase
    .from("modules")
    .select(moduleColumns)
    .eq("id", id)
    .maybeSingle<Module>();

  if (error) throw error;
  return data;
}

export async function createModule(input: CreateModuleInput): Promise<Module> {
  const { data, error } = await supabase
    .from("modules")
    .insert(input)
    .select(moduleColumns)
    .single<Module>();

  if (error) throw error;
  return data;
}

export async function updateModule(id: string, input: UpdateModuleInput): Promise<Module | null> {
  const { data, error } = await supabase
    .from("modules")
    .update(input)
    .eq("id", id)
    .select(moduleColumns)
    .maybeSingle<Module>();

  if (error) throw error;
  return data;
}

export async function deleteModule(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("modules")
    .delete()
    .eq("id", id)
    .select("id::text")
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  return data !== null;
}
