export interface UserContentView {
  user_id: string;
  content_id: string;
  watched_at: string;
}

export interface CreateUserContentViewInput {
  user_id: string;
  content_id: string;
  watched_at?: string;
}
