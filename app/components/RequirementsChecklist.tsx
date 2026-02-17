"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getAnonSchedule,
  setAnonSchedule,
  getAnonDegree,
  setAnonDegree,
  nextAnonId,
} from "@/lib/session-store";

interface CourseLink {
  courseCode: string;
  course: { code: string; title: string };
}

interface RequirementNode {
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

interface DegreeData {
  type: "plan" | "none";
  plan?: {
    id: number;
    name: string;
    template: { name: string };
    requirements: RequirementNode[];
  };
}

interface SearchResult {
  code: string;
  title: string;
}

const TERMS = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];

// ---------------------------------------------------------------------------
// Tree mutation helpers for anonymous sessionStorage data
// ---------------------------------------------------------------------------

function addCourseToGroupInTree(
  reqs: RequirementNode[],
  courseGroupId: number,
  courseCode: string,
): boolean {
  for (const req of reqs) {
    if (req.courseGroup && req.courseGroup.id === courseGroupId) {
      if (!req.courseGroup.links.some((l) => l.courseCode === courseCode)) {
        req.courseGroup.links.push({
          courseCode,
          course: { code: courseCode, title: "" },
        });
      }
      return true;
    }
    if (req.children && addCourseToGroupInTree(req.children, courseGroupId, courseCode)) {
      return true;
    }
  }
  return false;
}

function addCourseToReqInTree(
  reqs: RequirementNode[],
  reqId: number,
  courseCode: string,
): boolean {
  for (const req of reqs) {
    if (req.id === reqId) {
      if (!req.courseGroup) {
        req.courseGroup = {
          id: nextAnonId(),
          name: req.name,
          links: [],
        };
        req.courseGroupId = req.courseGroup.id;
      }
      if (!req.courseGroup.links.some((l) => l.courseCode === courseCode)) {
        req.courseGroup.links.push({
          courseCode,
          course: { code: courseCode, title: "" },
        });
      }
      return true;
    }
    if (req.children && addCourseToReqInTree(req.children, reqId, courseCode)) {
      return true;
    }
  }
  return false;
}

function removeCourseFromGroupInTree(
  reqs: RequirementNode[],
  courseGroupId: number,
  courseCode: string,
): boolean {
  for (const req of reqs) {
    if (req.courseGroup && req.courseGroup.id === courseGroupId) {
      req.courseGroup.links = req.courseGroup.links.filter(
        (l) => l.courseCode !== courseCode,
      );
      return true;
    }
    if (req.children && removeCourseFromGroupInTree(req.children, courseGroupId, courseCode)) {
      return true;
    }
  }
  return false;
}

function toggleForceCompletedInTree(
  reqs: RequirementNode[],
  reqId: number,
  value: boolean,
): boolean {
  for (const req of reqs) {
    if (req.id === reqId) {
      req.forceCompleted = value;
      return true;
    }
    if (req.children && toggleForceCompletedInTree(req.children, reqId, value)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a node is naturally fulfilled (by courses alone, ignoring forceCompleted).
 */
function isNaturallyFulfilled(
  node: RequirementNode,
  completedCourses: Set<string>,
): boolean {
  if (node.isText) return false;

  if (node.courseGroup) {
    const completed = node.courseGroup.links.filter((l) =>
      completedCourses.has(l.courseCode),
    ).length;
    return completed >= node.amount;
  }

  if (node.children && node.children.length > 0) {
    const fulfilledChildren = node.children.filter((c) =>
      isNaturallyFulfilled(c, completedCourses) || !!c.forceCompleted,
    ).length;
    return fulfilledChildren >= node.amount;
  }

  return false;
}

/**
 * Check if a node is fulfilled when counting planned courses too.
 */
function isFulfilledWithPlanned(
  node: RequirementNode,
  completedCourses: Set<string>,
  plannedCourses: Set<string>,
): boolean {
  if (node.forceCompleted) return true;
  if (node.isText) return false;

  if (node.courseGroup) {
    const completed = node.courseGroup.links.filter((l) =>
      completedCourses.has(l.courseCode),
    ).length;
    const planned = node.courseGroup.links.filter((l) =>
      plannedCourses.has(l.courseCode),
    ).length;
    return completed + planned >= node.amount;
  }

  if (node.children && node.children.length > 0) {
    const fulfilledChildren = node.children.filter((c) =>
      isFulfilledWithPlanned(c, completedCourses, plannedCourses),
    ).length;
    return fulfilledChildren >= node.amount;
  }

  return false;
}

export default function RequirementsChecklist() {
  const { user } = useAuth();
  const [degreeData, setDegreeData] = useState<DegreeData | null>(null);
  const [completedCourses, setCompletedCourses] = useState<Set<string>>(new Set());
  const [plannedCourses, setPlannedCourses] = useState<Set<string>>(new Set());
  const [missingPrereqs, setMissingPrereqs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [currentTerm, setCurrentTerm] = useState<string>("1A");

  // Add-course panel state
  const [addingToReq, setAddingToReq] = useState<number | null>(null);
  const [schedulingCourse, setSchedulingCourse] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<SearchResult | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel("schedule-updates");
    return () => channelRef.current?.close();
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const closePanel = () => {
    setAddingToReq(null);
    setSchedulingCourse(null);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedCourse(null);
    setIsSearching(false);
  };

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setSelectedCourse(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/courses/search?q=${encodeURIComponent(value)}`);
      if (!res.ok) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      const data: SearchResult[] = await res.json();
      setSearchResults(data);
      setIsSearching(false);
    }, 300);
  }, []);

  const refreshDegreeData = async () => {
    if (user) {
      const res = await fetch(`/api/users/${user.id}/degree`);
      if (res.ok) setDegreeData(await res.json());
    } else {
      setDegreeData(getAnonDegree() as DegreeData);
    }
  };

  const handleSelectCourse = (course: SearchResult, courseGroupId: number | null, reqId?: number) => {
    const isAlreadyScheduled = completedCourses.has(course.code) || plannedCourses.has(course.code);
    if (isAlreadyScheduled) {
      if (courseGroupId === null && reqId !== undefined) {
        // Requirement without courseGroup — create group via reqId-based API
        handleAddToTextReq(reqId, course.code);
      } else if (courseGroupId !== null) {
        handleAddToGroupOnly(courseGroupId, course.code);
      }
    } else {
      setSelectedCourse(course);
    }
  };

  const handleAddToGroupOnly = async (courseGroupId: number, courseCode: string) => {
    try {
      if (user) {
        const res = await fetch(`/api/users/${user.id}/degree/courses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseGroupId, courseCode }),
        });
        if (!res.ok) return;
      } else {
        const degree = getAnonDegree();
        if (degree.plan) {
          addCourseToGroupInTree(degree.plan.requirements, courseGroupId, courseCode);
          setAnonDegree(degree);
        }
      }
      await refreshDegreeData();
      closePanel();
    } catch (error) {
      console.error("Error adding course to group:", error);
    }
  };

  const handleAddToRequirement = async (
    courseGroupId: number,
    courseCode: string,
    term: string,
  ) => {
    try {
      if (user) {
        const [groupRes, scheduleRes] = await Promise.all([
          fetch(`/api/users/${user.id}/degree/courses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseGroupId, courseCode }),
          }),
          fetch(`/api/users/${user.id}/schedule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseCode, term }),
          }),
        ]);
        if (!groupRes.ok || !scheduleRes.ok) return;
      } else {
        // Add to degree group
        const degree = getAnonDegree();
        if (degree.plan) {
          addCourseToGroupInTree(degree.plan.requirements, courseGroupId, courseCode);
          setAnonDegree(degree);
        }
        // Add to schedule
        const schedule = getAnonSchedule();
        if (!schedule.entries.some((e) => e.courseCode === courseCode)) {
          schedule.entries.push({
            courseCode,
            term,
            course: { code: courseCode, title: "", prereqs: [] },
          });
          setAnonSchedule(schedule);
        }
      }

      await refreshDegreeData();
      setPlannedCourses((prev) => new Set(prev).add(courseCode));
      channelRef.current?.postMessage("changed");
      closePanel();
    } catch (error) {
      console.error("Error adding course to requirement:", error);
    }
  };

  const handleAddToTextReq = async (
    reqId: number,
    courseCode: string,
    term?: string,
  ) => {
    try {
      if (user) {
        const res = await fetch(`/api/users/${user.id}/degree/requirements/${reqId}/courses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseCode, term }),
        });
        if (!res.ok) return;
      } else {
        // Add to text req's courseGroup in sessionStorage
        const degree = getAnonDegree();
        if (degree.plan) {
          addCourseToReqInTree(degree.plan.requirements, reqId, courseCode);
          setAnonDegree(degree);
        }
        // Add to schedule if term provided
        if (term) {
          const schedule = getAnonSchedule();
          if (!schedule.entries.some((e) => e.courseCode === courseCode)) {
            schedule.entries.push({
              courseCode,
              term,
              course: { code: courseCode, title: "", prereqs: [] },
            });
            setAnonSchedule(schedule);
          }
        }
      }
      await refreshDegreeData();
      if (term) {
        setPlannedCourses((prev) => new Set(prev).add(courseCode));
        channelRef.current?.postMessage("changed");
      }
      closePanel();
    } catch (error) {
      console.error("Error adding course to text requirement:", error);
    }
  };

  const handleQuickSchedule = async (courseCode: string, term: string) => {
    try {
      if (user) {
        const res = await fetch(`/api/users/${user.id}/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseCode, term }),
        });
        if (!res.ok) return;
      } else {
        const schedule = getAnonSchedule();
        if (!schedule.entries.some((e) => e.courseCode === courseCode)) {
          schedule.entries.push({
            courseCode,
            term,
            course: { code: courseCode, title: "", prereqs: [] },
          });
          setAnonSchedule(schedule);
        }
      }
      setPlannedCourses((prev) => new Set(prev).add(courseCode));
      channelRef.current?.postMessage("changed");
      setSchedulingCourse(null);
    } catch (error) {
      console.error("Error scheduling course:", error);
    }
  };

  const handleRemoveFromGroup = async (courseGroupId: number, courseCode: string) => {
    try {
      if (user) {
        const res = await fetch(`/api/users/${user.id}/degree/courses`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseGroupId, courseCode }),
        });
        if (!res.ok) return;
      } else {
        const degree = getAnonDegree();
        if (degree.plan) {
          removeCourseFromGroupInTree(degree.plan.requirements, courseGroupId, courseCode);
          setAnonDegree(degree);
        }
      }
      await refreshDegreeData();
    } catch (error) {
      console.error("Error removing course from group:", error);
    }
  };

  const handleForceComplete = async (reqId: number, currentlyForced: boolean) => {
    try {
      if (user) {
        const res = await fetch(`/api/users/${user.id}/degree/requirements/${reqId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceCompleted: !currentlyForced }),
        });
        if (!res.ok) return;
      } else {
        const degree = getAnonDegree();
        if (degree.plan) {
          toggleForceCompletedInTree(degree.plan.requirements, reqId, !currentlyForced);
          setAnonDegree(degree);
        }
      }
      await refreshDegreeData();
    } catch (error) {
      console.error("Error toggling force-complete:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        let degreeResult: DegreeData | null = null;
        let scheduleData: {
          currentTerm: string;
          entries: {
            courseCode: string;
            term: string;
            course: { prereqs: { prereqCode: string }[] };
          }[];
        } | null = null;

        if (user) {
          const [degreeRes, scheduleRes] = await Promise.all([
            fetch(`/api/users/${user.id}/degree`),
            fetch(`/api/users/${user.id}/schedule`),
          ]);
          if (degreeRes.ok) degreeResult = await degreeRes.json();
          if (scheduleRes.ok) scheduleData = await scheduleRes.json();
        } else {
          const anonDegree = getAnonDegree();
          degreeResult = anonDegree as DegreeData;
          const anonSchedule = getAnonSchedule();
          scheduleData = {
            currentTerm: anonSchedule.currentTerm,
            entries: anonSchedule.entries.map((e) => ({
              courseCode: e.courseCode,
              term: e.term,
              course: { prereqs: e.course.prereqs },
            })),
          };
        }

        if (degreeResult) setDegreeData(degreeResult);

        if (scheduleData) {
          setCurrentTerm(scheduleData.currentTerm);
          const currentTermIndex = TERMS.indexOf(scheduleData.currentTerm);
          const completed = new Set<string>();
          const planned = new Set<string>();

          for (const entry of scheduleData.entries) {
            if (TERMS.indexOf(entry.term) < currentTermIndex) {
              completed.add(entry.courseCode);
            } else {
              planned.add(entry.courseCode);
            }
          }

          const coursesByTerm = new Map<string, Set<string>>();
          for (const entry of scheduleData.entries) {
            if (!coursesByTerm.has(entry.term)) coursesByTerm.set(entry.term, new Set());
            coursesByTerm.get(entry.term)!.add(entry.courseCode);
          }
          const missing = new Set<string>();
          for (const entry of scheduleData.entries) {
            const prereqs = entry.course.prereqs.map((p) => p.prereqCode);
            if (prereqs.length === 0) continue;
            const termIndex = TERMS.indexOf(entry.term);
            const priorCourses = new Set<string>();
            for (const t of TERMS) {
              if (TERMS.indexOf(t) < termIndex) {
                coursesByTerm.get(t)?.forEach((c) => priorCourses.add(c));
              }
            }
            if (!prereqs.some((p) => priorCourses.has(p))) {
              missing.add(entry.courseCode);
            }
          }

          setCompletedCourses(completed);
          setPlannedCourses(planned);
          setMissingPrereqs(missing);
        }
      } catch (error) {
        console.error("Error fetching requirements data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-[var(--goose-slate)] italic">Loading...</p>
      </div>
    );
  }

  if (!degreeData || degreeData.type === "none") {
    return (
      <div className="p-4">
        <p className="text-sm text-[var(--goose-slate)] italic">
          Select a degree to see requirements.
        </p>
      </div>
    );
  }

  const requirements = degreeData.plan?.requirements;
  const degreeName = degreeData.plan?.name;
  const templateName = degreeData.plan?.template?.name;

  if (!requirements || requirements.length === 0) {
    return (
      <div className="p-4">
        <h3 className="font-display font-bold text-[var(--goose-ink)] mb-2">
          {degreeName}
        </h3>
        <p className="text-sm text-[var(--goose-slate)] italic">
          No requirements found.
        </p>
      </div>
    );
  }

  // Count fulfilled requirements (top-level only for summary)
  const countNodes = (nodes: RequirementNode[]): { total: number; fulfilled: number; forced: number; planned: number } => {
    let total = 0;
    let fulfilled = 0;
    let forced = 0;
    let planned = 0;
    for (const node of nodes) {
      total++;
      const natural = isNaturallyFulfilled(node, completedCourses);
      const isForced = !natural && !!node.forceCompleted;
      const plannedOk = !natural && !isForced && isFulfilledWithPlanned(node, completedCourses, plannedCourses);
      if (natural) fulfilled++;
      if (isForced) forced++;
      if (plannedOk) planned++;
    }
    return { total, fulfilled, forced, planned };
  };

  const { total: totalRequirements, fulfilled: totalFulfilled, forced: totalForceCompleted, planned: totalFulfilledWithPlanned } = countNodes(requirements);

  // Recursive requirement renderer
  function RequirementItem({ req, depth = 0 }: { req: RequirementNode; depth?: number }) {
    const natural = isNaturallyFulfilled(req, completedCourses);
    const isForced = !!req.forceCompleted;
    const fulfilled = natural || isForced;
    const fulfilledWithPlanned = !fulfilled && isFulfilledWithPlanned(req, completedCourses, plannedCourses);
    const isAdding = addingToReq === req.id;
    const isLeaf = !req.isText && (!req.children || req.children.length === 0);
    const isLeafWithGroup = isLeaf && req.courseGroup !== null;
    const isLeafWithoutGroup = isLeaf && req.courseGroup === null;
    const isBranch = !req.isText && req.children && req.children.length > 0;
    const isText = req.isText;
    const needsReqApi = isText || isLeafWithoutGroup; // nodes without a courseGroup use the reqId-based API

    const eligible = req.courseGroup?.links || [];
    const completedLinks = eligible.filter((l) => completedCourses.has(l.courseCode));
    const plannedLinks = eligible.filter((l) => plannedCourses.has(l.courseCode));

    function CourseRow({ link, groupId }: { link: CourseLink; groupId: number }) {
      const isCompleted = completedCourses.has(link.courseCode);
      const isPlanned = plannedCourses.has(link.courseCode);
      const isMissing = missingPrereqs.has(link.courseCode);
      const isScheduled = isCompleted || isPlanned;
      const isPickingTerm = schedulingCourse === link.courseCode;

      return (
        <div key={link.courseCode}>
          <div
            className={`text-xs flex items-center gap-1.5 group ${
              isMissing
                ? "text-red-500"
                : isCompleted
                  ? "text-[var(--goose-slate)]"
                  : isPlanned
                    ? "text-blue-600"
                    : "text-[var(--goose-ink)]"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                isMissing
                  ? "bg-red-500"
                  : isCompleted
                    ? "bg-[var(--goose-ink)]"
                    : isPlanned
                      ? "bg-blue-500"
                      : "bg-[var(--goose-mist)]"
              }`}
            />
            <span className={`flex-1 ${isCompleted && !isMissing ? "line-through" : ""}`}>
              {link.courseCode}
              {isMissing && " (prereqs missing)"}
              {!isMissing && isPlanned && " (planned)"}
            </span>
            {!isScheduled && (
              <button
                onClick={() => setSchedulingCourse(isPickingTerm ? null : link.courseCode)}
                className="opacity-0 group-hover:opacity-100 text-[var(--goose-slate)] hover:text-[var(--goose-ink)] transition-all shrink-0"
                aria-label={`Schedule ${link.courseCode}`}
                title="Add to term"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M6 2v8M2 6h8" />
                </svg>
              </button>
            )}
            <button
              onClick={() => handleRemoveFromGroup(groupId, link.courseCode)}
              className="opacity-0 group-hover:opacity-100 text-[var(--goose-slate)] hover:text-red-500 transition-all shrink-0"
              aria-label={`Remove ${link.courseCode} from ${req.name}`}
              title="Remove from requirement"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          </div>
          {isPickingTerm && (
            <div className="ml-3 mt-0.5 mb-1 flex flex-wrap gap-1">
              {TERMS.filter((t) => TERMS.indexOf(t) >= TERMS.indexOf(currentTerm)).map((term) => (
                <button
                  key={term}
                  onClick={() => handleQuickSchedule(link.courseCode, term)}
                  className="text-[10px] px-1.5 py-0.5 border border-[var(--goose-mist)] rounded hover:border-[var(--goose-ink)] hover:bg-[var(--goose-mist)]/30 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Naturally fulfilled + not forced = disabled (can't toggle)
    // Forced (with or without natural) = clickable to undo
    // Not fulfilled at all = clickable to force
    const canClick = isForced || !natural;

    return (
      <div className={depth > 0 ? "ml-4 border-l border-[var(--goose-mist)] pl-3" : ""}>
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => {
              if (canClick) {
                handleForceComplete(req.id, isForced);
              }
            }}
            disabled={!canClick}
            className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 transition-colors ${
              natural && !isForced
                ? "bg-[var(--goose-ink)] border-[var(--goose-ink)] cursor-default"
                : isForced
                  ? "bg-amber-500 border-amber-500 cursor-pointer hover:bg-amber-600"
                  : fulfilledWithPlanned
                    ? "bg-blue-500 border-blue-500 cursor-pointer hover:bg-blue-600"
                    : "border-[var(--goose-slate)] cursor-pointer hover:border-[var(--goose-ink)] hover:bg-[var(--goose-mist)]/30"
            }`}
            aria-label={isForced ? `Unmark ${req.name} as complete` : `Mark ${req.name} as complete`}
            title={isForced ? "Click to unmark override" : natural ? "Completed" : "Click to mark as complete (override)"}
          >
            {natural && !isForced && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--goose-cream)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6l3 3 5-5" />
              </svg>
            )}
            {isForced && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6l3 3 5-5" />
              </svg>
            )}
            {!fulfilled && fulfilledWithPlanned && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6h8" />
              </svg>
            )}
          </button>
          <span
            className={`text-sm font-medium flex-1 ${
              fulfilled
                ? "text-[var(--goose-slate)] line-through"
                : "text-[var(--goose-ink)]"
            }`}
          >
            {isBranch
              ? `Complete ${req.amount} of the following:`
              : isText
                ? req.name
                : req.courseGroup?.name || req.name}
            {isForced && (
              <span className="text-[10px] text-amber-600 ml-1 no-underline inline-block">(overridden)</span>
            )}
          </span>
          {/* Add course button — on leaf nodes and text nodes */}
          {(isLeaf || isText) && !fulfilled && !isForced && (
            <button
              onClick={() => {
                if (isAdding) {
                  closePanel();
                } else {
                  closePanel();
                  setAddingToReq(req.id);
                }
              }}
              className="w-5 h-5 flex items-center justify-center rounded border border-[var(--goose-mist)] hover:border-[var(--goose-ink)] hover:bg-[var(--goose-mist)]/30 transition-colors flex-shrink-0"
              aria-label={`Add course to ${req.name}`}
              title="Add course"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 2v8M2 6h8" />
              </svg>
            </button>
          )}
        </div>

        {/* Add course panel for leaf nodes and text requirements */}
        {(isLeaf || isText) && isAdding && (
          <div ref={panelRef} className="ml-6 mb-2 border border-[var(--goose-ink)] rounded p-2 bg-[var(--goose-cream)] shadow-sm">
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full text-xs border border-[var(--goose-mist)] rounded px-2 py-1.5 bg-[var(--goose-cream)] focus:outline-none focus:border-[var(--goose-ink)]"
              autoFocus
              autoComplete="off"
            />

            {searchQuery && !selectedCourse && (
              <div className="mt-1 max-h-32 overflow-y-auto">
                {isSearching && (
                  <p className="text-[10px] text-[var(--goose-slate)] italic p-1">Searching...</p>
                )}
                {!isSearching && searchResults.length === 0 && (
                  <p className="text-[10px] text-[var(--goose-slate)] italic p-1">No courses found</p>
                )}
                {!isSearching && searchResults.map((course) => {
                  const alreadyInGroup = eligible.some((l) => l.courseCode === course.code);
                  const isScheduled = completedCourses.has(course.code) || plannedCourses.has(course.code);
                  return (
                    <button
                      key={course.code}
                      onClick={() => !alreadyInGroup && handleSelectCourse(
                        course,
                        req.courseGroup?.id ?? null,
                        needsReqApi ? req.id : undefined,
                      )}
                      disabled={alreadyInGroup}
                      className={`w-full text-left text-xs px-1.5 py-1 rounded transition-colors ${
                        alreadyInGroup
                          ? "opacity-40 cursor-default"
                          : "hover:bg-[var(--goose-mist)]/30"
                      }`}
                    >
                      <span className="font-semibold">{course.code}</span>
                      <span className="text-[var(--goose-slate)] ml-1">{course.title}</span>
                      {isScheduled && !alreadyInGroup && (
                        <span className="text-blue-600 ml-1">(scheduled)</span>
                      )}
                      {alreadyInGroup && (
                        <span className="text-[var(--goose-slate)] ml-1">(already added)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedCourse && (
              <div className="mt-1.5">
                <p className="text-[10px] text-[var(--goose-slate)] mb-1">
                  Add <span className="font-semibold text-[var(--goose-ink)]">{selectedCourse.code}</span> to term:
                </p>
                <div className="flex flex-wrap gap-1">
                  {TERMS.filter((t) => TERMS.indexOf(t) >= TERMS.indexOf(currentTerm)).map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        if (!req.courseGroup) {
                          handleAddToTextReq(req.id, selectedCourse.code, term);
                        } else {
                          handleAddToRequirement(req.courseGroup.id, selectedCourse.code, term);
                        }
                      }}
                      className="text-[10px] px-2 py-0.5 border border-[var(--goose-mist)] rounded hover:border-[var(--goose-ink)] hover:bg-[var(--goose-mist)]/30 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Course list for text requirements with courses added */}
        {isText && req.courseGroup && eligible.length > 0 && (
          <div className="ml-6">
            <div className={`space-y-0.5 ${eligible.length > 5 ? "max-h-[100px] overflow-y-auto pr-1" : ""}`}>
              {eligible.map((link) => (
                <CourseRow key={link.courseCode} link={link} groupId={req.courseGroup!.id} />
              ))}
            </div>
          </div>
        )}

        {/* Course list for leaf nodes */}
        {isLeafWithGroup && (
          <div className="ml-6">
            <p className="text-xs text-[var(--goose-slate)] mb-1">
              {completedLinks.length}/{req.amount} courses
              {plannedLinks.length > 0 && (
                <span className="text-blue-600"> (+{plannedLinks.length} planned)</span>
              )}
            </p>
            <div className={`space-y-0.5 ${eligible.length > 5 ? "max-h-[100px] overflow-y-auto pr-1" : ""}`}>
              {eligible.map((link) => (
                <CourseRow key={link.courseCode} link={link} groupId={req.courseGroup!.id} />
              ))}
            </div>
          </div>
        )}

        {/* Recurse into children for branch nodes */}
        {isBranch && (
          <div className="mt-1 space-y-3">
            {req.children.map((child) => (
              <RequirementItem key={child.id} req={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full">
      <h3 className="font-display text-lg font-bold text-[var(--goose-ink)] mb-0.5">
        {degreeName}
      </h3>
      {templateName && (
        <p className="text-[10px] text-[var(--goose-slate)] mb-0.5">
          Based on {templateName}
        </p>
      )}
      <p className="text-xs text-[var(--goose-slate)] mb-4">
        {totalFulfilled + totalForceCompleted}/{totalRequirements} completed
        {totalForceCompleted > 0 && (
          <span className="text-amber-600"> ({totalForceCompleted} overridden)</span>
        )}
        {totalFulfilledWithPlanned > 0 && (
          <span className="text-blue-600"> (+{totalFulfilledWithPlanned} planned)</span>
        )}
      </p>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1" style={{ scrollbarWidth: "none" }}>
        {requirements.map((req) => (
          <RequirementItem key={req.id} req={req} />
        ))}
      </div>
    </div>
  );
}
