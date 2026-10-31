import { supabase } from "../config/supabase";
import type { CreateCourseInput, UpdateCourseInput, Course } from "../models/courseModel";

// Return BIGINT IDs as text to preserve precision in JavaScript and JSON.
const courseColumns = "id::text,user_id::text,code,title,description,created_at,updated_at";

export async function findAllCourses(): Promise<Course[]> {
  const courses: Course[] = [];
  const pageSize = 1000;

  // Supabase caps response sizes, so fetch additional pages when needed.
  while (true) {
    const { data, count, error } = await supabase
      .from("courses")
      .select(courseColumns, { count: "exact" })
      .order("id", { ascending: true })
      .range(courses.length, courses.length + pageSize - 1)
      .returns<Course[]>();

    if (error) throw error;
    courses.push(...data);

    if (data.length === 0 || (count !== null ? courses.length >= count : data.length < pageSize)) {
      return courses;
    }
  }
}

export async function findCourseById(id: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from("courses")
    .select(courseColumns)
    .eq("id", id)
    .maybeSingle<Course>();

  if (error) throw error;
  return data;
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const { data, error } = await supabase
    .from("courses")
    .insert(input)
    .select(courseColumns)
    .single<Course>();

  if (error) throw error;
  return data;
}

export async function updateCourse(id: string, input: UpdateCourseInput): Promise<Course | null> {
  const { data, error } = await supabase
    .from("courses")
    .update(input)
    .eq("id", id)
    .select(courseColumns)
    .maybeSingle<Course>();

  if (error) throw error;
  return data;
}

export async function deleteCourse(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id)
    .select("id::text")
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  return data !== null;
}
