export interface Module {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateModuleInput {
  user_id: string;
  course_id: string;
  title: string;
  description?: string | null;
}

export interface UpdateModuleInput {
  user_id: string;
  course_id: string;
  title: string;
  description: string | null;
}
