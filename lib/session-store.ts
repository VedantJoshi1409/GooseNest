/**
 * SessionStorage helpers for anonymous (unauthenticated) users.
 *
 * When there is no logged-in user we persist schedule and degree data
 * in the browser's sessionStorage so it survives page refreshes but
 * disappears when the tab is closed.
 */

// ---------------------------------------------------------------------------
// Types (mirror the shapes returned by the real API)
// ---------------------------------------------------------------------------

export interface TermCourseEntry {
  courseCode: string;
  term: string;
  course: {
    code: string;
    title: string;
    prereqs: { prereqCode: string }[];
  };
}

export interface AnonSchedule {
  currentTerm: string;
  entries: TermCourseEntry[];
}

export interface CourseLink {
  courseCode: string;
  course: { code: string; title: string };
}

export interface RequirementNode {
  id: number;
  name: string;
  amount: number;
  isText: boolean;
  forceCompleted?: boolean;
  courseGroupId?: number | null;
  courseGroup: {
    id: number;
    name: string;
    links: CourseLink[];
  } | null;
  children: RequirementNode[];
}

export interface AnonDegree {
  type: "plan" | "none";
  plan?: {
    id: number;
    name: string;
    templateName: string;
    requirements: RequirementNode[];
  };
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const SCHEDULE_KEY = "goose_nest_anon_schedule";
const DEGREE_KEY = "goose_nest_anon_degree";
const ID_COUNTER_KEY = "goose_nest_anon_id_counter";

// ---------------------------------------------------------------------------
// ID generator (negative IDs to avoid collisions with real DB IDs)
// ---------------------------------------------------------------------------

export function nextAnonId(): number {
  let counter = parseInt(sessionStorage.getItem(ID_COUNTER_KEY) || "0", 10);
  counter -= 1;
  sessionStorage.setItem(ID_COUNTER_KEY, String(counter));
  return counter;
}

// ---------------------------------------------------------------------------
// Schedule helpers
// ---------------------------------------------------------------------------

export function getAnonSchedule(): AnonSchedule {
  try {
    const raw = sessionStorage.getItem(SCHEDULE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { currentTerm: "1A", entries: [] };
}

export function setAnonSchedule(data: AnonSchedule): void {
  sessionStorage.setItem(SCHEDULE_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Degree helpers
// ---------------------------------------------------------------------------

export function getAnonDegree(): AnonDegree {
  try {
    const raw = sessionStorage.getItem(DEGREE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { type: "none", plan: undefined };
}

export function setAnonDegree(data: AnonDegree): void {
  sessionStorage.setItem(DEGREE_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Client-side copyReqTree
//
// Replicates the server's recursive requirement-tree copy but entirely
// in-memory, assigning negative IDs to every new node and courseGroup.
// ---------------------------------------------------------------------------

export function copyReqTreeClient(reqs: any[]): RequirementNode[] {
  return reqs.map((req) => {
    const nodeId = nextAnonId();
    let courseGroup: RequirementNode["courseGroup"] = null;

    if (req.courseGroup && req.courseGroupId) {
      const groupId = nextAnonId();
      courseGroup = {
        id: groupId,
        name: req.courseGroup.name,
        links: (req.courseGroup.links || []).map((l: any) => ({
          courseCode: l.courseCode || l.course?.code,
          course: {
            code: l.courseCode || l.course?.code,
            title: l.course?.title || l.course?.name || "",
          },
        })),
      };
    }

    const children =
      req.children && req.children.length > 0
        ? copyReqTreeClient(req.children)
        : [];

    return {
      id: nodeId,
      name: req.name,
      amount: req.amount,
      isText: req.isText ?? false,
      forceCompleted: false,
      courseGroupId: courseGroup?.id ?? null,
      courseGroup,
      children,
    };
  });
}
