/* =========================================================
 * NTUST Board Game Club Database Types
 * ========================================================= */

/* =========================================================
 * Common
 * ========================================================= */

export type UUID = string;

/** PostgREST serializes PostgreSQL bigint identity values as JSON numbers. */
export type UserProfileId = number;
export type BoardGameBorrowingId = number;
export type EventAttendanceId = number;
export type AnnouncementId = number;

export type ISODateString = string;

export type Timestamp = string;

/* =========================================================
 * Enums
 * ========================================================= */

/**
 * 社員類型
 */
export type MembershipType = "annual" | "lifetime";

/**
 * 社員資格狀態
 */
export type MembershipStatus =
  | "pending"
  | "active"
  | "expired"
  | "suspended"
  | "cancelled";

export type MembershipRegisterKeyStatus =
  | "available"
  | "claimed"
  | "revoked"
  | "expired";

/**
 * 桌遊狀態
 */
export type BoardGameStatus =
  | "available"
  | "borrowed"
  | "maintenance"
  | "lost"
  | "damaged"
  | "retired";

/**
 * 借用紀錄狀態
 */
export type BorrowingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "borrowed"
  | "returned"
  | "cancelled";

/**
 * 出席狀態
 */
export type AttendanceStatus = "present" | "absent" | "late";

/* =========================================================
 * Users
 * ========================================================= */

export type User = {
  id: UUID;
  name: string;
  email: string;
  avatar: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

/* =========================================================
 * User Profiles
 * ========================================================= */
export type UserProfile = {
  id: UserProfileId;
  user_id: UUID;
  real_name: string;
  phone: string;
  student_id: string | null;
  school: string | null;
  department: string | null;
  grade: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

/* =========================================================
 * Auth Credentials
 * ========================================================= */

export type AuthCredential = {
  id: UUID;
  user_id: UUID;
  password_hash: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

/* =========================================================
 * Sessions
 * ========================================================= */

export type Session = {
  id: UUID;
  user_id: UUID;
  token: string;
  expires_at: Timestamp;
  created_at: Timestamp;
  last_accessed_at: Timestamp;
};

/* =========================================================
 * Academic Years
 * ========================================================= */

export type AcademicYear = {
  id: UUID;
  year: string;
  start_date: Timestamp;
  end_date: Timestamp;
  is_current: boolean;
};

/* =========================================================
 * Memberships
 * ========================================================= */

export type Membership = {
  id: UUID;
  user_id: UUID | null;
  type: MembershipType;
  academic_year_id: UUID;
  status: MembershipStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
  joined_at: Timestamp | null;
  membership_register_key_id: UUID | null;
};

export type MembershipRegisterKey = {
  id: UUID;
  academic_year_id: UUID;
  sequence_number: number;
  register_key: string;
  status: MembershipRegisterKeyStatus;
  created_by_user_id: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  claimed_at: Timestamp | null;
  revoked_at: Timestamp | null;
};

/* =========================================================
 * Officer Positions
 * ========================================================= */

export type OfficerPosition = {
  id: UUID;
  user_id: UUID;
  title: string;
  academic_year_id: UUID;
  created_at: Timestamp;
};

/* =========================================================
 * Board Game Categories
 * ========================================================= */

export type BoardGameCategory = {
  id: UUID;
  name: string;
  description: string | null;
};

/* =========================================================
 * Board Game Locations
 * ========================================================= */

export type BoardGameLocation = {
  id: UUID;
  name: string;
  description: string | null;
};

/* =========================================================
 * Board Games
 * ========================================================= */

export type BoardGame = {
  id: UUID;
  name: string;
  description: string | null;
  image: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  category_id: UUID;
  location_id: UUID;
  status: BoardGameStatus;
  inventory_number: number;
};

/* =========================================================
 * Board Game Borrowings
 * ========================================================= */

export type BoardGameBorrowing = {
  id: BoardGameBorrowingId;
  board_game_id: UUID;
  user_id: UUID;
  created_at: Timestamp;
  borrowed_at: Timestamp | null;
  due_at: Timestamp | null;
  returned_at: Timestamp | null;
  status: BorrowingStatus;

  /**
   *
   * 僅在借用申請被核准後存在
   */
  approved_by_user_id: UUID | null;
};

/* =========================================================
 * Events
 * ========================================================= */

export type Event = {
  id: UUID;
  name: string;
  description: string | null;
  start_time: Timestamp;
  end_time: Timestamp;
  check_in_opens_at: Timestamp | null;
  check_in_closes_at: Timestamp | null;
  created_at: Timestamp;
};

/* =========================================================
 * Event Attendances
 * ========================================================= */

export type EventAttendance = {
  id: EventAttendanceId;

  user_id: UUID;

  event_id: UUID;

  attended_at: Timestamp | null;

  status: AttendanceStatus;
};

/* =========================================================
 * Announcements
 * ========================================================= */

export type Announcement = {
  id: AnnouncementId;
  title: string;
  content: string;

  created_at: Timestamp;
  updated_at: Timestamp;

  author_id: UUID;

  is_published: boolean;
  published_at: Timestamp | null;
};
