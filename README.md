# NTUST Board Game Club Website

## Tables

### users

| Column Name | Data Type | Description |
| --- | --- | --- |
| updated_at | timestamp | Timestamp of when the user was last updated |

### user_profiles

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each user profile |
| user_id | UUID | Foreign key referencing the user table |
| real_name | text | Real name of the user |
| phone | text | Phone number of the user |
| student_id | text | Student ID of the user |
| school | text | School or department of the user |
| department | text | Department of the user |
| grade | text | Grade or year of the user |
| created_at | timestamp | Timestamp of when the user profile was created |
| updated_at | timestamp | Timestamp of when the user profile was last updated |

### auth_credentials

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each auth credential |
| user_id | UUID | Foreign key referencing the user table |
| password_hash | text | Hashed password for the user |
| created_at | timestamp | Timestamp of when the auth credential was created |
| updated_at | timestamp | Timestamp of when the auth credential was last updated |

### sessions

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each session |
| user_id | UUID | Foreign key referencing the user table |
| token | text | Session token |
| expires_at | timestamp | Timestamp of when the session expires |
| created_at | timestamp | Timestamp of when the session was created |
| last_accessed_at | timestamp | Timestamp of when the session was last accessed |

### memberships

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each membership |
| user_id | UUID | Foreign key referencing the user table |
| type | text | Type of membership (e.g., "annual", "lifetime") |
| academic_year_id | UUID | Foreign key referencing the academic_years table |
| status | text | Status of the membership (e.g.,"pending", "active", "expired", "suspended", "cancelled") |
| created_at | timestamp | Timestamp of when the membership was created |
| updated_at | timestamp | Timestamp of when the membership was last updated |
| joined_at | timestamp | Timestamp of when the user joined the membership |
| membership_register_key_id | UUID | Nullable foreign key referencing the membership_register_keys table |

### membership_register_keys

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each membership register key |
| academic_year_id | UUID | Foreign key referencing the academic_years table |
| sequence_number | integer | Per-academic-year generation sequence |
| register_key | text | Full membership register key shown to admins and students |
| status | text | Status of the register key ("available", "claimed", "revoked", "expired") |
| created_by_user_id | UUID | Nullable foreign key referencing the admin/officer user who generated the key |
| created_at | timestamp | Timestamp of when the register key was created |
| updated_at | timestamp | Timestamp of when the register key was last updated |
| claimed_at | timestamp | Timestamp of when the key successfully created a membership |
| revoked_at | timestamp | Timestamp of when the key was revoked |

### academic_years

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each academic year |
| year | text | Academic year (e.g., "113", "114") |
| start_date | timestamp | Start date of the academic year |
| end_date | timestamp | End date of the academic year |
| is_current | boolean | Indicates if this is the current academic year |

### officer_positions

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each officer position |
| user_id | UUID | Foreign key referencing the user table |
| title | text | Title of the officer position |
| academic_year_id | UUID | Foreign key referencing the academic_years table |
| created_at | timestamp | Timestamp of when the officer position was created |

### board_games

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each board game |
| inventory_number | int8 | Unique inventory number for the board game |
| name | text | Name of the board game |
| description | text | Description of the board game |
| image | text | URL or path to the board game's image |
| created_at | timestamp | Timestamp of when the board game was created |
| updated_at | timestamp | Timestamp of when the board game was last updated |
| category_id | UUID | Foreign key referencing the board_game_categories table |
| location_id | UUID | Foreign key referencing the locations table |
| status | text | Status of the board game (e.g., "available", "borrowed", "maintenance", "lost", 'damaged', 'retired') |

### board_game_categories

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each board game category |
| name | text | Name of the board game category |
| description | text | Description of the board game category |

### board_game_locations

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each location |
| name | text | Name of the location |
| description | text | Description of the location |

### board_game_borrowings

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each board game borrowing record |
| board_game_id | UUID | Foreign key referencing the board_games table |
| user_id | UUID | Foreign key referencing the user table |
| created_at | timestamp | Timestamp of when the borrowing record was created |
| borrowed_at | timestamp | Timestamp of when the board game was borrowed |
| due_at | timestamp | Timestamp of when the board game is due to be returned |
| returned_at | timestamp | Timestamp of when the board game was returned |
| status | text | Status of the borrowing record (e.g., "pending", "approved", "rejected", "borrowed", "returned") |
| approved_by_user_id | UUID | Foreign key referencing the user table for the approver |

### events

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each event |
| name | text | Name of the event |
| created_at | timestamp | Timestamp of when the event was created |
| description | text | Description of the event |
| start_time | timestamp | Start time of the event |
| end_time | timestamp | End time of the event |

### event_attendances

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each attendance record |
| user_id | UUID | Foreign key referencing the user table |
| event_id | UUID | Foreign key referencing the events table |
| attended_at | timestamp | Timestamp of when the user attended the event |
| status | text | Status of the attendance record (e.g., "present", "absent", "late") |

### announcements

| Column Name | Data Type | Description |
| --- | --- | --- |
| id | UUID | Unique identifier for each announcement |
| title | text | Title of the announcement |
| content | text | Content of the announcement |
| created_at | timestamp | Timestamp of when the announcement was created |
| updated_at | timestamp | Timestamp of when the announcement was last updated |
| author_id | UUID | Foreign key referencing the user table for the author of the announcement |
| is_published | boolean | Indicates if the announcement is published or not |
| published_at | timestamp | Timestamp of when the announcement was published |

## Permissions

| 功能 | 未登入 | 已登入非社員 | 社員 | 幹部 |
| --- | --- | --- | --- | --- |
| 查看首頁 | ✅ | ✅ | ✅ | ✅ |
| 查看桌遊 | ✅ | ✅ | ✅ | ✅ |
| 查看公告 | ✅ | ✅ | ✅ | ✅ |
| 註冊帳號 | ✅ | - | - | - |
| 社課簽到 | ❌ | ❌ | ✅ | ✅ |
| 借用桌遊 | ❌ | ✅(需要繳費) | ✅ | ✅ |
| 查看個人紀錄 | ❌ | ✅ | ✅ | ✅ |
| 管理桌遊 | ❌ | ❌ | ❌ | ✅ |
| 發布公告 | ❌ | ❌ | ❌ | ✅ |

## Routes

### current routes

```text
src
├── app/
│   ├── (admin)/
│   │   ├── admin/
│   │   │   ├── academic-years/
│   │   │   │   └── page.tsx
│   │   │   ├── announcements/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── edit/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── board-game-categories/
│   │   │   │   └── page.tsx
│   │   │   ├── board-game-locations/
│   │   │   │   └── page.tsx
│   │   │   ├── board-games/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── edit/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── borrowings/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── categories/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── constants.ts
│   │   │   │   ├── locations/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   └── types.tsx
│   │   │   ├── borrowings/
│   │   │   │   └── page.tsx
│   │   │   ├── events/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── members/
│   │   │   │   ├── page.tsx
│   │   │   │   └── register-keys/
│   │   │   │       └── page.tsx
│   │   │   ├── memberships/
│   │   │   │   ├── page.tsx
│   │   │   │   └── register-keys/
│   │   │   │       └── page.tsx
│   │   │   ├── officers/
│   │   │   │   └── page.tsx
│   │   │   ├── page.tsx
│   │   │   └── users/
│   │   │       ├── [id]/
│   │   │       │   └── page.tsx
│   │   │       └── page.tsx
│   │   └── layout.tsx
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (authenticated)/
│   │   ├── borrowings/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── memberships/
│   │   │   └── page.tsx
│   │   ├── profile/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── settings/
│   │       ├── layout.tsx
│   │       └── page.tsx
│   ├── (public)/
│   │   ├── announcements/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── board-games/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   ├── constants.ts
│   │   │   ├── page.tsx
│   │   │   └── types.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── privacy/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── terms/
│   │       ├── layout.tsx
│   │       └── page.tsx
│   ├── api/
│   │   ├── admin/
│   │   │   ├── academic-years/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── announcements/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── board-game-categories/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── board-game-locations/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── board-games/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── borrowings/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── events/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── attendances/
│   │   │   │   │   │   ├── [attendanceId]/
│   │   │   │   │   │   │   └── route.ts
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── members/
│   │   │   │   └── register-keys/
│   │   │   │       ├── [id]/
│   │   │   │       │   └── route.ts
│   │   │   │       └── route.ts
│   │   │   ├── memberships/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── officers/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   └── users/
│   │   │       └── [id]/
│   │   │           └── profile/
│   │   │               └── route.ts
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── route.ts
│   │   │   ├── logout/
│   │   │   │   └── route.ts
│   │   │   ├── me/
│   │   │   │   └── route.ts
│   │   │   ├── password/
│   │   │   │   └── route.ts
│   │   │   ├── register/
│   │   │   │   └── route.ts
│   │   │   └── sessions/
│   │   │       ├── [id]/
│   │   │       │   └── route.ts
│   │   │       └── route.ts
│   │   ├── board-games/
│   │   │   └── [id]/
│   │   │       └── borrow/
│   │   │           └── route.ts
│   │   ├── memberships/
│   │   │   └── activate/
│   │   │       └── route.ts
│   │   └── users/
│   │       └── me/
│   │           ├── account/
│   │           │   └── route.ts
│   │           ├── borrowings/
│   │           │   └── route.ts
│   │           └── profile/
│   │               └── route.ts
│   └── layout.tsx
├── components/
│   ├── (admin)/
│   │   ├── AdminHeader.tsx
│   │   ├── AdminSidebar.tsx
│   │   ├── AdminSidebarNav.tsx
│   │   └── admin/
│   │       ├── AdminListSection.tsx
│   │       ├── AdminToolbar.tsx
│   │       ├── HeadingSection.tsx
│   │       ├── SortableTableHeader.tsx
│   │       ├── academic-years/
│   │       │   └── AcademicYearManager.tsx
│   │       ├── announcements/
│   │       │   ├── AnnouncementEditor.tsx
│   │       │   └── AnnouncementStatusBadge.tsx
│   │       ├── board-games/
│   │       │   ├── BoardGameActions.tsx
│   │       │   ├── BoardGameFilterBar.tsx
│   │       │   ├── BoardGameForm.tsx
│   │       │   ├── BoardGameSearchForm.tsx
│   │       │   ├── BoardGameStatusBadge.tsx
│   │       │   └── BoardGameTable.tsx
│   │       ├── borrowings/
│   │       │   └── AdminBorrowingList.tsx
│   │       ├── events/
│   │       │   ├── AttendanceManager.tsx
│   │       │   ├── EventManager.tsx
│   │       │   └── EventStatusBadge.tsx
│   │       ├── master-data/
│   │       │   └── MasterDataManager.tsx
│   │       ├── members/
│   │       │   ├── MemberFilterBar.tsx
│   │       │   ├── MemberStatusBadge.tsx
│   │       │   ├── RegisterKeyGenerateForm.tsx
│   │       │   ├── RegisterKeyStatusBadge.tsx
│   │       │   ├── RegisterKeyTable.tsx
│   │       │   └── register-keys/
│   │       │       └── RegisterKeyFilterBar.tsx
│   │       ├── memberships/
│   │       │   └── MembershipManager.tsx
│   │       ├── officers/
│   │       │   └── OfficerManager.tsx
│   │       └── users/
│   │           └── UserProfileEditButton.tsx
│   ├── (auth)/
│   │   ├── AuthCard.tsx
│   │   ├── AuthNotice.tsx
│   │   ├── login/
│   │   │   └── LoginForm.tsx
│   │   └── register/
│   │       └── RegisterForm.tsx
│   ├── (authenticated)/
│   │   ├── dashboard/
│   │   ├── membership/
│   │   ├── memberships/
│   │   │   ├── CurrentMembershipCard.tsx
│   │   │   ├── MembershipActivationForm.tsx
│   │   │   ├── MembershipHistory.tsx
│   │   │   └── MembershipStatusBadge.tsx
│   │   ├── profile/
│   │   │   ├── HistorySection.tsx
│   │   │   ├── ProfileBasicInfoSection.tsx
│   │   │   └── ProfileHeroSection.tsx
│   │   └── settings/
│   │       ├── AccountSettingsCard.tsx
│   │       ├── PasswordSettingsCard.tsx
│   │       ├── SessionList.tsx
│   │       ├── SessionSettingsCard.tsx
│   │       ├── SettingsCard.tsx
│   │       └── UserProfileSettingsCard.tsx
│   ├── (public)/
│   │   └── board-games/
│   │       ├── BoardGameActiveFilters.tsx
│   │       ├── BoardGameCard.tsx
│   │       ├── BoardGameFilterPanel.tsx
│   │       ├── BoardGameGrid.tsx
│   │       ├── BoardGameSearchForm.tsx
│   │       ├── BoardGameSortMenu.tsx
│   │       ├── BoardGameStatusBadge.tsx
│   │       └── BorrowBoardGameForm.tsx
│   ├── BoardGameImage.tsx
│   ├── BorrowingStatusBadge.tsx
│   ├── ConfirmDialog.tsx
│   ├── FieldInput.tsx
│   ├── FormFeedback.tsx
│   ├── Header/
│   │   ├── DesktopNavigation.tsx
│   │   ├── Header.tsx
│   │   ├── HeaderActions.tsx
│   │   ├── MobileNavigation.tsx
│   │   └── UserMenu.tsx
│   ├── LogoutButton.tsx
│   ├── Modal.tsx
│   ├── Pagination/
│   │   ├── Pagination.tsx
│   │   ├── PaginationNavLinks.tsx
│   │   ├── PaginationPageSelect.tsx
│   │   └── PaginationPageSizeSelect.tsx
│   ├── QuickStats.tsx
│   ├── UserAvatar.tsx
│   ├── layouts/
│   │   ├── AdminShell.tsx
│   │   └── WebsiteShell.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── EmptyState.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Table.tsx
│       └── Textarea.tsx
├── contexts/
│   └── UserContext.tsx
├── hooks/
│   └── useOutsideDismiss.tsx
├── libs/
│   ├── api/
│   │   ├── client.tsx
│   │   └── errors.tsx
│   ├── auth.tsx
│   ├── css.tsx
│   ├── env.tsx
│   ├── metadata.tsx
│   ├── navigation.tsx
│   ├── security/
│   │   ├── rate-limit.ts
│   │   └── turnstile.ts
│   ├── siteConfigs.tsx
│   ├── supabase/
│   │   └── server.tsx
│   └── zod/
│       └── helpers.tsx
├── repositories/
│   ├── academic-years.repository.ts
│   ├── announcements.repository.ts
│   ├── auth.repository.tsx
│   ├── board-game-borrowings.repository.ts
│   ├── board-game-categories.repository.ts
│   ├── board-game-locations.repository.ts
│   ├── board-games.repository.ts
│   ├── event-attendances.repository.ts
│   ├── events.repository.ts
│   ├── membership-register-keys.repository.ts
│   ├── memberships.repository.ts
│   ├── officer-positions.repository.ts
│   ├── sessions.repository.tsx
│   ├── shared/
│   │   ├── errors.ts
│   │   ├── pagination.ts
│   │   ├── search.ts
│   │   └── types.ts
│   ├── user-profiles.repository.tsx
│   └── users.repository.ts
├── services/
│   ├── academic-years/
│   │   ├── academic-years.schema.ts
│   │   └── academic-years.service.ts
│   ├── announcements/
│   │   └── announcements.service.ts
│   ├── auth/
│   │   ├── auth.errors.tsx
│   │   ├── auth.schema.tsx
│   │   ├── auth.service.tsx
│   │   └── auth.types.tsx
│   ├── board-games/
│   │   ├── board-games.errors.tsx
│   │   ├── board-games.schema.ts
│   │   ├── board-games.service.ts
│   │   └── board-games.types.ts
│   ├── events/
│   │   ├── events.errors.ts
│   │   ├── events.schema.ts
│   │   ├── events.service.ts
│   │   └── events.types.ts
│   ├── memberships/
│   │   ├── memberships.errors.ts
│   │   ├── memberships.schema.ts
│   │   ├── memberships.service.ts
│   │   └── memberships.types.ts
│   ├── officer-positions/
│   │   ├── officer-positions.service.ts
│   │   └── officer-positions.types.ts
│   └── users/
│       ├── users.errors.tsx
│       ├── users.schema.tsx
│       ├── users.service.tsx
│       └── users.types.ts
├── styles/
│   └── globals.css
├── types/
│   └── database.tsx
└── utils/
    ├── auth/
    │   ├── password.tsx
    │   └── session.tsx
    ├── className.tsx
    ├── date.tsx
    ├── navigation.tsx
    ├── pagination.tsx
    └── url.tsx
```

### expected file structure (for reference)

```text
src/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── error.tsx
│   ├── sitemap.ts
│   ├── robots.ts
│   ├── (public)
│   │   ├── board-games/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── announcements/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── officers/
│   │   │   └── page.tsx
│   │   └── events/
│   │       ├── page.tsx
│   │       └── [id]/
│   │           └── page.tsx
│   ├── (auth)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   ├── (authenticated)
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── borrowings/
│   │   │   └── page.tsx    
│   │   └── attendance/
│   │       └── page.tsx
│   └── (admin)
│       └── admin/
│           ├── layout.tsx
│           ├── page.tsx
│           ├── board-games/
│           │   └── page.tsx
│           ├── borrowings/
│           │   └── page.tsx
│           ├── members/
│           │   └── page.tsx
│           ├── events/
│           │   └── page.tsx
│           ├── attendance/
│           │   └── page.tsx        
│           ├── officers/
│           │   └── page.tsx  
│           └── announcements/
│               └── page.tsx
...
```
