export interface Content {
  id: string;
  module_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContentInput {
  module_id: string;
  title: string;
  content: string;
}

export interface UpdateContentInput {
  module_id: string;
  title: string;
  content: string;
}
