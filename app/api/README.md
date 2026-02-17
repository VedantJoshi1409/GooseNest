# API Routes

## Authentication

Routes are split into **public** (no auth required) and **authenticated** (require a logged-in user).

Anonymous users access the degree and schedule planners with data stored in `sessionStorage` instead of the database. The middleware (`lib/supabase/middleware.ts`) allows unauthenticated access to `/degree-planner`, `/schedule-planner`, and all `/api/*` routes.

---

## Public Routes

These are read-only endpoints that work for both authenticated and anonymous users.

### Auth

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/auth/me` | Get the current authenticated user (returns 401 if not logged in) |

### Courses

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/courses?faculty=MAT` | List all courses, optionally filter by faculty |
| POST | `/api/courses` | Create a course with optional prerequisites |
| GET | `/api/courses/[code]` | Get a course with description, prereqs, unlocks, and groups |
| PUT | `/api/courses/[code]` | Update title, faculty, or prerequisites |
| DELETE | `/api/courses/[code]` | Delete a course |

**POST/PUT body:**
```json
{
  "code": "CS135",
  "title": "Designing Functional Programs",
  "facultyName": "Mathematics",
  "prerequisites": ["CS100"]
}
```

### Course Search

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/courses/search?q=cs1` | Search courses by code or title (case-insensitive, max 20 results) |

### Faculties

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/faculties` | List all faculties with their courses |
| POST | `/api/faculties` | Create a faculty |
| GET | `/api/faculties/[name]` | Get a faculty with its courses |
| DELETE | `/api/faculties/[name]` | Delete a faculty |

**POST body:**
```json
{
  "name": "Mathematics"
}
```

### Templates (Degrees)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/templates` | List all templates |
| POST | `/api/templates` | Create a template |
| GET | `/api/templates/[id]` | Get a template with requirements, groups, and courses |
| PUT | `/api/templates/[id]` | Update template name |
| DELETE | `/api/templates/[id]` | Delete a template (cascades requirements) |

**POST/PUT body:**
```json
{
  "name": "Computer Science"
}
```

### Requirements

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/templates/[id]/requirements` | List requirements for a template |
| POST | `/api/templates/[id]/requirements` | Add a requirement to a template |
| PUT | `/api/requirements/[id]` | Update a requirement |
| DELETE | `/api/requirements/[id]` | Delete a requirement |

**POST/PUT body:**
```json
{
  "name": "Core CS Courses",
  "amount": 3,
  "courseGroupId": 1
}
```

### Course Groups

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/course-groups` | List all groups with linked courses |
| POST | `/api/course-groups` | Create a group with course codes |
| GET | `/api/course-groups/[id]` | Get a group with courses and requirements |
| PUT | `/api/course-groups/[id]` | Update name or replace course codes |
| DELETE | `/api/course-groups/[id]` | Delete a group (cascades links) |

**POST/PUT body:**
```json
{
  "name": "CS Core",
  "courseCodes": ["CS135", "CS136", "CS246"]
}
```

### Graph

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/graph?faculties=MAT,ENG` | Get graph data filtered by faculties |
| GET | `/api/graph?courses=CS135&includeUnlocked=true` | Get graph data for specific courses |

---

## Authenticated Routes

These require a logged-in user. Anonymous users bypass these entirely — their data is stored in `sessionStorage` via `lib/session-store.ts`.

### User Schedule

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users/[id]/schedule` | Get user's full schedule with current term and all term courses |
| POST | `/api/users/[id]/schedule` | Add a course to a term |
| PUT | `/api/users/[id]/schedule` | Move a course to a different term |
| PATCH | `/api/users/[id]/schedule` | Update user's current term |
| DELETE | `/api/users/[id]/schedule` | Remove a course from the schedule |

**POST body:**
```json
{
  "courseCode": "CS145",
  "term": "1A"
}
```

**PUT body:**
```json
{
  "courseCode": "CS145",
  "term": "2A"
}
```

**PATCH body:**
```json
{
  "currentTerm": "1B"
}
```

**DELETE body:**
```json
{
  "courseCode": "CS145"
}
```

### User Degree

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users/[id]/degree` | Get user's degree config (template or custom plan) |
| POST | `/api/users/[id]/degree` | Set user's degree template or create a custom plan |

**POST body (template only):**
```json
{
  "templateId": 1
}
```

**POST body (custom plan):**
```json
{
  "templateId": 1,
  "name": "My Custom Plan",
  "requirements": [
    {
      "name": "CS Core",
      "amount": 3,
      "courseGroupId": 1
    }
  ]
}
```

### User Degree Courses

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/users/[id]/degree/courses` | Add a course to a requirement group (copy-on-write) |
| DELETE | `/api/users/[id]/degree/courses` | Remove a course from a requirement group (copy-on-write) |

**POST/DELETE body:**
```json
{
  "courseGroupId": 1,
  "courseCode": "CS245"
}
```

### User Degree Requirements

| Method | Route | Description |
|--------|-------|-------------|
| PATCH | `/api/users/[id]/degree/requirements/[reqId]` | Toggle force-complete on a plan requirement |
| POST | `/api/users/[id]/degree/requirements/[reqId]/courses` | Add a course to a requirement's group (creates group if needed), optionally schedule it |

**PATCH body:**
```json
{
  "forceCompleted": true
}
```

**POST body:**
```json
{
  "courseCode": "CS245",
  "term": "2A"
}
```
