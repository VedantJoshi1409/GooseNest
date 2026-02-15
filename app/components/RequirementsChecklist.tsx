"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CourseLink {
  courseCode: string;
  course: { code: string; title: string };
}

interface Requirement {
  id: number;
  name: string;
  amount: number;
  courseGroup: {
    id: number;
    name: string;
    links: CourseLink[];
  };
}

interface DegreeData {
  type: "template" | "plan" | "none";
  template?: { name: string; requirements: Requirement[] };
  plan?: {
    name: string;
    template: { name: string };
    requirements: Requirement[];
  };
}

interface SearchResult {
  code: string;
  title: string;
}

const TERMS = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];

export default function RequirementsChecklist() {
  const [degreeData, setDegreeData] = useState<DegreeData | null>(null);
  const [completedCourses, setCompletedCourses] = useState<Set<string>>(new Set());
  const [plannedCourses, setPlannedCourses] = useState<Set<string>>(new Set());
  const [missingPrereqs, setMissingPrereqs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [currentTerm, setCurrentTerm] = useState<string>("1A");

  // Add-course panel state
  const [addingToReq, setAddingToReq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<SearchResult | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // TODO: replace with actual user ID from auth
  const userId = 1;

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

  // Re-fetch degree data from DB (needed after copy-on-write changes group IDs)
  const refreshDegreeData = async () => {
    const res = await fetch(`/api/users/${userId}/degree`);
    if (res.ok) setDegreeData(await res.json());
  };

  const handleSelectCourse = (course: SearchResult, courseGroupId: number) => {
    const isAlreadyScheduled = completedCourses.has(course.code) || plannedCourses.has(course.code);
    if (isAlreadyScheduled) {
      handleAddToGroupOnly(courseGroupId, course.code);
    } else {
      setSelectedCourse(course);
    }
  };

  const handleAddToGroupOnly = async (courseGroupId: number, courseCode: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/degree/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseGroupId, courseCode }),
      });
      if (!res.ok) return;
      // Group IDs may have changed due to copy-on-write, re-fetch
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
      const [groupRes, scheduleRes] = await Promise.all([
        fetch(`/api/users/${userId}/degree/courses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseGroupId, courseCode }),
        }),
        fetch(`/api/users/${userId}/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseCode, term }),
        }),
      ]);

      if (!groupRes.ok || !scheduleRes.ok) return;

      // Group IDs may have changed due to copy-on-write, re-fetch
      await refreshDegreeData();
      setPlannedCourses((prev) => new Set(prev).add(courseCode));
      channelRef.current?.postMessage("changed");
      closePanel();
    } catch (error) {
      console.error("Error adding course to requirement:", error);
    }
  };

  const handleRemoveFromGroup = async (courseGroupId: number, courseCode: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/degree/courses`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseGroupId, courseCode }),
      });
      if (!res.ok) return;
      // Group IDs may have changed due to copy-on-write, re-fetch
      await refreshDegreeData();
    } catch (error) {
      console.error("Error removing course from group:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [degreeRes, scheduleRes] = await Promise.all([
          fetch(`/api/users/${userId}/degree`),
          fetch(`/api/users/${userId}/schedule`),
        ]);

        if (degreeRes.ok) {
          setDegreeData(await degreeRes.json());
        }

        if (scheduleRes.ok) {
          const data: {
            currentTerm: string;
            entries: {
              courseCode: string;
              term: string;
              course: { prereqs: { prereqCode: string }[] };
            }[];
          } = await scheduleRes.json();

          setCurrentTerm(data.currentTerm);
          const currentTermIndex = TERMS.indexOf(data.currentTerm);
          const completed = new Set<string>();
          const planned = new Set<string>();

          for (const entry of data.entries) {
            if (TERMS.indexOf(entry.term) < currentTermIndex) {
              completed.add(entry.courseCode);
            } else {
              planned.add(entry.courseCode);
            }
          }

          // Compute courses with no prerequisites met
          const coursesByTerm = new Map<string, Set<string>>();
          for (const entry of data.entries) {
            if (!coursesByTerm.has(entry.term)) coursesByTerm.set(entry.term, new Set());
            coursesByTerm.get(entry.term)!.add(entry.courseCode);
          }
          const missing = new Set<string>();
          for (const entry of data.entries) {
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
  }, []);

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

  const requirements =
    degreeData.type === "plan"
      ? degreeData.plan?.requirements
      : degreeData.template?.requirements;

  const degreeName =
    degreeData.type === "plan"
      ? degreeData.plan?.name
      : degreeData.template?.name;

  const templateName =
    degreeData.type === "plan"
      ? degreeData.plan?.template?.name
      : null;

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

  const totalRequirements = requirements.length;
  const totalFulfilled = requirements.filter((r) => {
    const completed = r.courseGroup.links.filter((l) =>
      completedCourses.has(l.courseCode)
    ).length;
    return completed >= r.amount;
  }).length;
  const totalFulfilledWithPlanned = requirements.filter((r) => {
    const completed = r.courseGroup.links.filter((l) =>
      completedCourses.has(l.courseCode)
    ).length;
    const planned = r.courseGroup.links.filter((l) =>
      plannedCourses.has(l.courseCode)
    ).length;
    return completed + planned >= r.amount;
  }).length - totalFulfilled;

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
        {totalFulfilled}/{totalRequirements} completed
        {totalFulfilledWithPlanned > 0 && (
          <span className="text-blue-600"> (+{totalFulfilledWithPlanned} planned)</span>
        )}
      </p>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {requirements.map((req) => {
          const eligible = req.courseGroup.links;
          const completed = eligible.filter((l) =>
            completedCourses.has(l.courseCode)
          );
          const planned = eligible.filter((l) =>
            plannedCourses.has(l.courseCode)
          );
          const fulfilled = completed.length >= req.amount;
          const fulfilledWithPlanned = completed.length + planned.length >= req.amount;
          const isAdding = addingToReq === req.id;

          return (
            <div key={req.id}>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                    fulfilled
                      ? "bg-[var(--goose-ink)] border-[var(--goose-ink)]"
                      : fulfilledWithPlanned
                        ? "bg-blue-500 border-blue-500"
                        : "border-[var(--goose-slate)]"
                  }`}
                >
                  {fulfilled && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="var(--goose-cream)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                  {!fulfilled && fulfilledWithPlanned && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 6h8" />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm font-medium flex-1 ${
                    fulfilled
                      ? "text-[var(--goose-slate)] line-through"
                      : "text-[var(--goose-ink)]"
                  }`}
                >
                  {req.courseGroup.name}
                </span>
                {!fulfilled && (
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
                    aria-label={`Add course to ${req.courseGroup.name}`}
                    title="Add course"
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M6 2v8M2 6h8" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Add course panel */}
              {isAdding && (
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

                  {/* Search results */}
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
                            onClick={() => !alreadyInGroup && handleSelectCourse(course, req.courseGroup.id)}
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

                  {/* Term picker after selecting a course */}
                  {selectedCourse && (
                    <div className="mt-1.5">
                      <p className="text-[10px] text-[var(--goose-slate)] mb-1">
                        Add <span className="font-semibold text-[var(--goose-ink)]">{selectedCourse.code}</span> to term:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {TERMS.filter((t) => TERMS.indexOf(t) >= TERMS.indexOf(currentTerm)).map((term) => (
                          <button
                            key={term}
                            onClick={() => handleAddToRequirement(req.courseGroup.id, selectedCourse.code, term)}
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

              <div className="ml-6">
                <p className="text-xs text-[var(--goose-slate)] mb-1">
                  {completed.length}/{req.amount} courses
                  {planned.length > 0 && (
                    <span className="text-blue-600"> (+{planned.length} planned)</span>
                  )}
                </p>
                <div className={`space-y-0.5 ${eligible.length > 5 ? "max-h-[100px] overflow-y-auto pr-1" : ""}`}>
                  {eligible.map((link) => {
                    const isCompleted = completedCourses.has(link.courseCode);
                    const isPlanned = plannedCourses.has(link.courseCode);
                    const isMissing = missingPrereqs.has(link.courseCode);
                    return (
                      <div
                        key={link.courseCode}
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
                        <button
                          onClick={() => handleRemoveFromGroup(req.courseGroup.id, link.courseCode)}
                          className="opacity-0 group-hover:opacity-100 text-[var(--goose-slate)] hover:text-red-500 transition-all shrink-0"
                          aria-label={`Remove ${link.courseCode} from ${req.courseGroup.name}`}
                          title="Remove from requirement"
                        >
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M3 3l6 6M9 3l-6 6" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
