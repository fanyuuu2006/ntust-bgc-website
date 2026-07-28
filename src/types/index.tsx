import { Session, User, UserProfile } from "./database";

export type UpdateUserAccountInput = Partial<Pick<User, "name" | "avatar">>;

export type UpdateUserProfileInput = Partial<
  Pick<
    UserProfile,
    "real_name" | "phone" | "student_id" | "school" | "department" | "grade"
  >
>;

export type SessionSummary = Pick<
  Session,
  "id" | "created_at" | "last_accessed_at" | "expires_at"
> & {
  is_current: boolean;
};
