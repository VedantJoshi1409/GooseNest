# API Routes

## Courses

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/courses?faculty=MAT` | List all courses, optionally filter by faculty |
| POST | `/api/courses` | Create a course with optional prerequisites |
| GET | `/api/courses/[code]` | Get a course with prereqs, unlocks, and groups |
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

## Faculties

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

## Templates (Degrees)

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

## Requirements

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

## Course Groups

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

## Graph

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/graph?faculties=MAT,ENG` | Get graph data filtered by faculties |
| GET | `/api/graph?courses=CS135&includeUnlocked=true` | Get graph data for specific courses |
