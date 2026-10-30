export type UserStatus = "active" | "inactive";

export interface User {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  status?: UserStatus;
}

export interface UpdateUserInput {
  name: string;
  email: string;
  status: UserStatus;
}
