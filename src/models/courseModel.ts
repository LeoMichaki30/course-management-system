export interface Course {
  id: string;
  user_id: string;
  code: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCourseInput {
  user_id: string;
  code: string;
  title: string;
  description?: string | null;
}

export interface UpdateCourseInput {
  user_id: string;
  code: string;
  title: string;
  description: string | null;
}
