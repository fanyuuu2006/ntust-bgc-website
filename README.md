# NTUST Board Game Club Website

## Tables

### users

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each user │
│ name │ text │ Name of the user │
│ email │ text │ Email address of the user │
│ avatar │ text │ URL or path to the user's avatar image │
│ created_at │ timestamp │ Timestamp of when the user was created │
│ updated_at │ timestamp │ Timestamp of when the user was last updated │

### user_profiles

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each user profile │
│ user_id │ UUID │ Foreign key referencing the user table │
| real_name | text | Real name of the user |
│ phone │ text │ Phone number of the user │
| student_id | text | Student ID of the user |
| school | text | School or department of the user |
| department | text | Department of the user |
| grade | text | Grade or year of the user |
│ created_at │ timestamp │ Timestamp of when the user profile was created │
│ updated_at │ timestamp │ Timestamp of when the user profile was last updated │

### auth_credentials

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each auth credential │
│ user_id │ UUID │ Foreign key referencing the user table │
│ password_hash │ text │ Hashed password for the user │
│ created_at │ timestamp │ Timestamp of when the auth credential was created │
│ updated_at │ timestamp │ Timestamp of when the auth credential was last updated │

### sessions

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each session │
│ user_id │ UUID │ Foreign key referencing the user table │
│ token │ text │ Session token │
│ expires_at │ timestamp │ Timestamp of when the session expires │
│ created_at │ timestamp │ Timestamp of when the session was created │
│ last_accessed_at │ timestamp │ Timestamp of when the session was last accessed │

### memberships

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each membership │
│ user_id │ UUID │ Foreign key referencing the user table │
│ type │ text │ Type of membership (e.g., "annual", "lifetime") │
│ academic_year_id │ UUID │ Foreign key referencing the academic_years table │
│ status │ text │ Status of the membership (e.g.,"pending", "active", "expired", "suspended", "cancelled") │
│ created_at │ timestamp │ Timestamp of when the membership was created │
│ updated_at │ timestamp │ Timestamp of when the membership was last updated │
│ joined_at │ timestamp │ Timestamp of when the user joined the membership │

### academic_years

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each academic year │
│ year │ text │ Academic year (e.g., "113", "114") │
│ start_date │ timestamp │ Start date of the academic year │
│ end_date │ timestamp │ End date of the academic year │
│ is_current │ boolean │ Indicates if this is the current academic year │

### officer_positions

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each officer position │
│ user_id │ UUID │ Foreign key referencing the user table │
│ title │ text │ Title of the officer position │
│ academic_year_id │ UUID │ Foreign key referencing the academic_years table │
│ created_at │ timestamp │ Timestamp of when the officer position was created │

### board_games

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each board game │
| inventory_number | text | Unique inventory number for the board game |
│ name │ text │ Name of the board game │
│ description │ text │ Description of the board game │
│ image │ text │ URL or path to the board game's image │
│ created_at │ timestamp │ Timestamp of when the board game was created │
│ updated_at │ timestamp │ Timestamp of when the board game was last updated │
│ category_id │ UUID │ Foreign key referencing the board_game_categories table │
│ location_id │ UUID │ Foreign key referencing the locations table │
│ status │ text │ Status of the board game (e.g., "available", "borrowed", "maintenance", "lost", 'damaged', 'retired') │

### board_game_categories

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each board game category │
│ name │ text │ Name of the board game category │
│ description │ text │ Description of the board game category │

### locations

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each location │
│ name │ text │ Name of the location │
│ description │ text │ Description of the location │

### board_game_borrowings

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each board game borrowing record │
│ board_game_id │ UUID │ Foreign key referencing the board_games table │
│ user_id │ UUID │ Foreign key referencing the user table │
│ created_at │ timestamp │ Timestamp of when the borrowing record was created │
│ borrowed_at │ timestamp │ Timestamp of when the board game was borrowed │
│ due_at │ timestamp │ Timestamp of when the board game is due to be returned │
│ returned_at │ timestamp │ Timestamp of when the board game was returned │
│ status │ text │ Status of the borrowing record (e.g., "pending", "approved", "rejected", "borrowed", "returned") │
│ approved_by_user_id │ UUID │ Foreign key referencing the user table for the approver │

### events

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each event │
│ name │ text │ Name of the event │
│ created_at │ timestamp │ Timestamp of when the event was created │
│ description │ text │ Description of the event │
│ start_time │ timestamp │ Start time of the event │
│ end_time │ timestamp │ End time of the event │

### event_attendances

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each attendance record │
│ user_id │ UUID │ Foreign key referencing the user table │
│ event_id │ UUID │ Foreign key referencing the events table │
│ attended_at │ timestamp │ Timestamp of when the user attended the event │
│ status │ text │ Status of the attendance record (e.g., "present", "absent", "late") │

### announcements

│ Column Name │ Data Type │ Description │
│ --- │ --- │ --- │
│ id │ UUID │ Unique identifier for each announcement │
│ title │ text │ Title of the announcement │
│ content │ text │ Content of the announcement │
│ created_at │ timestamp │ Timestamp of when the announcement was created │
│ updated_at │ timestamp │ Timestamp of when the announcement was last updated │
│ author_id │ UUID │ Foreign key referencing the user table for the author of the announcement │
│ is_published │ boolean │ Indicates if the announcement is published or not │
│ published_at │ timestamp │ Timestamp of when the announcement was published │

## Permissions

│ 功能 │ 未登入 │ 已登入非社員 │ 社員 │ 幹部 │
│ --- │ --- │ --- │ --- │ --- │
│ 查看首頁 │ ✅ │ ✅ │ ✅ │ ✅ │
│ 查看桌遊 │ ✅ │ ✅ │ ✅ │ ✅ │
│ 查看公告 │ ✅ │ ✅ │ ✅ │ ✅ │
│ 註冊帳號 │ ✅ │ - │ - │ - │
│ 社課簽到 │ ❌ │ ❌ │ ✅ │ ✅ │
│ 借用桌遊 │ ❌ │ ✅(需要繳費) │ ✅ │ ✅ │
│ 查看個人紀錄 │ ❌ │ ✅ │ ✅ │ ✅ │
│ 管理桌遊 │ ❌ │ ❌ │ ❌ │ ✅ │
│ 發布公告 │ ❌ │ ❌ │ ❌ │ ✅ │

## Routes

### current routes

```text
src
├── app
│   ├── (admin)
│   ├── (auth)
│   │   ├── layout.tsx
│   │   ├── login
│   │   │   └── page.tsx
│   │   └── register
│   │       └── page.tsx
│   ├── (authenticated)
│   │   ├── dashboard
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── profile
│   │   │   │   └── page.tsx
│   │   │   └── settings
│   │   │       ├── layout.tsx
│   │   │       └── page.tsx
│   │   └── layout.tsx
│   ├── (public)
│   │   ├── announcements
│   │   │   └── page.tsx
│   │   ├── board-games
│   │   │   └── page.tsx
│   │   ├── privacy
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── terms
│   │       ├── layout.tsx
│   │       └── page.tsx
│   ├── api
│   │   ├── auth
│   │   │   ├── login
│   │   │   │   └── route.ts
│   │   │   ├── logout
│   │   │   │   └── route.ts
│   │   │   ├── me
│   │   │   │   └── route.ts
│   │   │   ├── password
│   │   │   │   └── route.ts
│   │   │   ├── register
│   │   │   │   └── route.ts
│   │   │   └── sessions
│   │   │       ├── [id]
│   │   │       │   └── route.ts
│   │   │       └── route.ts
│   │   └── users
│   │       └── me
│   │           ├── account
│   │           │   └── route.ts
│   │           └── profile
│   │               └── route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components
│   ├── (auth)
│   │   ├── AuthCard.tsx
│   │   ├── AuthNotice.tsx
│   │   ├── login
│   │   │   └── LoginForm.tsx
│   │   └── register
│   │       └── RegisterForm.tsx
│   ├── (authenticated)
│   │   └── dashboard
│   │       ├── DashboardCard.tsx
│   │       ├── DashboardMenu.tsx
│   │       ├── DashboardWelcome.tsx
│   │       ├── profile
│   │       └── settings
│   │           ├── AccountSettingsCard.tsx
│   │           ├── PasswordSettingsCard.tsx
│   │           ├── ProfileSettingsCard.tsx
│   │           ├── SessionList.tsx
│   │           ├── SessionSettingsCard.tsx
│   │           └── SettingsCard.tsx
│   ├── FieldInput.tsx
│   ├── FormFeedback.tsx
│   ├── Header
│   │   ├── DesktopNavigation.tsx
│   │   ├── Header.tsx
│   │   ├── HeaderActions.tsx
│   │   ├── MobileNavigation.tsx
│   │   └── UserMenu.tsx
│   ├── LogoutButton.tsx
│   └── UserAvatar.tsx
├── contexts
│   └── UserContext.tsx
├── libs
│   ├── api
│   │   ├── client.tsx
│   │   └── errors.tsx
│   ├── auth.tsx
│   ├── css.tsx
│   ├── env.tsx
│   ├── metadata.tsx
│   ├── navigation.tsx
│   ├── siteConfigs.tsx
│   ├── supabase
│   │   └── server.tsx
│   └── zod
│       └── helpers.tsx
├── repositories
│   ├── auth.repository.tsx
│   ├── error.tsx
│   ├── sessions.repository.tsx
│   ├── user-profiles.repository.tsx
│   └── users.repository.tsx
├── services
│   ├── auth
│   │   ├── auth.errors.tsx
│   │   ├── auth.schema.tsx
│   │   ├── auth.service.tsx
│   │   └── auth.types.tsx
│   └── users
│       ├── user.errors.tsx
│       ├── users.schema.tsx
│       └── users.service.tsx
├── styles
│   └── globals.css
├── types
│   ├── database.tsx
│   └── index.tsx
└── utils
    ├── auth
    │   ├── password.tsx
    │   └── session.tsx
    ├── className.tsx
    └── date.tsx
```

### expected file structure

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
│   │   └── dashboard/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── profile/
│   │       │   └── page.tsx
│   │       ├── settings/
│   │       │   └── page.tsx
│   │       ├── borrowings/
│   │       │   └── page.tsx    
│   │       └── attendance/
│   │           └── page.tsx
│   └── (admin)
│       └── admin/
│           ├── layout.tsx
│           ├── page.tsx
│           ├── board-games/
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
