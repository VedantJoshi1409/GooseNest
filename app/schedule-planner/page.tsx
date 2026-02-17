'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Navbar from "../components/Navbar";
import CourseCard from "../components/CourseCard";
import { useAuth } from "../context/AuthContext";

interface Course {
  code: string;
  name: string;
  prereqs: string[];
}

interface SearchResult {
  code: string;
  name: string;
}

interface TermCourseEntry {
  courseCode: string;
  term: string;
  course: {
    code: string;
    title: string;
    prereqs: { prereqCode: string }[];
  };
}

const TERMS = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];
const SEARCH_CACHE_KEY = "goose_nest_course_search";

export default function SchedulePlannerPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedTerm, setSelectedTerm] = useState<string>("1A");
  const [courses, setCourses] = useState<Record<string, Course[]>>({
    "1A": [], "1B": [], "2A": [], "2B": [],
    "3A": [], "3B": [], "4A": [], "4B": [],
  });
  const [currentTerm, setCurrentTerm] = useState<string>("1A");
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel("schedule-updates");
    return () => channelRef.current?.close();
  }, []);

  const notifyChange = () => channelRef.current?.postMessage("changed");

  const isTermCompleted = (term: string) =>
    TERMS.indexOf(term) < TERMS.indexOf(currentTerm);

  // Compute courses with no prerequisites met (prereqs exist but none in earlier terms)
  const missingPrereqs = useMemo(() => {
    const missing = new Set<string>();
    // Build a set of all courses scheduled in each term or before
    for (const term of TERMS) {
      const termIndex = TERMS.indexOf(term);
      const priorCourses = new Set<string>();
      for (const t of TERMS) {
        if (TERMS.indexOf(t) < termIndex) {
          for (const c of courses[t]) priorCourses.add(c.code);
        }
      }
      for (const course of courses[term]) {
        if (course.prereqs.length > 0 && !course.prereqs.some((p) => priorCourses.has(p))) {
          missing.add(course.code);
        }
      }
    }
    return missing;
  }, [courses]);

  // Fetch schedule on mount
  useEffect(() => {
    if (!user) return;
    async function fetchSchedule() {
      const res = await fetch(`/api/users/${user!.id}/schedule`);
      if (!res.ok) return;
      const data: { currentTerm: string; entries: TermCourseEntry[] } = await res.json();

      setCurrentTerm(data.currentTerm);

      const grouped: Record<string, Course[]> = {
        "1A": [], "1B": [], "2A": [], "2B": [],
        "3A": [], "3B": [], "4A": [], "4B": [],
      };
      for (const entry of data.entries) {
        if (grouped[entry.term]) {
          grouped[entry.term].push({
            code: entry.course.code,
            name: entry.course.title,
            prereqs: entry.course.prereqs.map((p) => p.prereqCode),
          });
        }
      }
      setCourses(grouped);
    }
    fetchSchedule();
  }, [user]);

  // Debounced search with sessionStorage caching
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Check cache first
    try {
      const cache: Record<string, SearchResult[]> = JSON.parse(
        sessionStorage.getItem(SEARCH_CACHE_KEY) || "{}"
      );
      if (cache[trimmed]) {
        setSearchResults(cache[trimmed]);
        setIsSearching(false);
        return;
      }
    } catch {}

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/courses/search?q=${encodeURIComponent(value)}`);
      if (!res.ok) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      const data: { code: string; title: string }[] = await res.json();
      const results = data.map((c) => ({ code: c.code, name: c.title }));
      setSearchResults(results);
      setIsSearching(false);

      // Cache the results
      try {
        const cache: Record<string, SearchResult[]> = JSON.parse(
          sessionStorage.getItem(SEARCH_CACHE_KEY) || "{}"
        );
        cache[trimmed] = results;
        sessionStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(cache));
      } catch {}
    }, 300);
  }, []);

  const handleAddCourse = async (course: Pick<Course, "code" | "name">) => {
    // Check if already in any term
    const alreadyScheduled = Object.values(courses).some((list) =>
      list.some((c) => c.code === course.code)
    );
    if (alreadyScheduled) return;

    const res = await fetch(`/api/users/${user!.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseCode: course.code, term: selectedTerm }),
    });
    if (!res.ok) return;

    const entry = await res.json();
    const prereqs = (entry.course?.prereqs || []).map((p: { prereqCode: string }) => p.prereqCode);

    setCourses((prev) => ({
      ...prev,
      [selectedTerm]: [...prev[selectedTerm], { ...course, prereqs }],
    }));
    setSearchQuery("");
    setSearchResults([]);
    notifyChange();
  };

  const handleMoveCourse = async (courseCode: string, targetTerm: string) => {
    const res = await fetch(`/api/users/${user!.id}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseCode, term: targetTerm }),
    });
    if (!res.ok) return;

    setCourses((prev) => {
      const course = prev[selectedTerm].find((c) => c.code === courseCode);
      if (!course) return prev;
      return {
        ...prev,
        [selectedTerm]: prev[selectedTerm].filter((c) => c.code !== courseCode),
        [targetTerm]: [...prev[targetTerm], course],
      };
    });
    setEditingCourse(null);
    notifyChange();
  };

  const handleSetCurrentTerm = async (term: string) => {
    const res = await fetch(`/api/users/${user!.id}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentTerm: term }),
    });
    if (!res.ok) return;
    setCurrentTerm(term);
    notifyChange();
  };

  const handleRemoveCourse = async (courseCode: string) => {
    const res = await fetch(`/api/users/${user!.id}/schedule`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseCode }),
    });
    if (!res.ok) return;

    setCourses((prev) => ({
      ...prev,
      [selectedTerm]: prev[selectedTerm].filter((c) => c.code !== courseCode),
    }));
    setEditingCourse(null);
    notifyChange();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--goose-slate)] italic">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Term Tabs */}
        <section className="mb-8">
          <div className="flex flex-wrap gap-2">
            {TERMS.map((term) => (
              <button
                key={term}
                onClick={() => setSelectedTerm(term)}
                className={`relative px-4 py-2 rounded font-display font-semibold transition-colors ${
                  selectedTerm === term
                    ? "bg-[var(--goose-ink)] text-[var(--goose-cream)]"
                    : "border border-[var(--goose-ink)] text-[var(--goose-ink)] hover:bg-[var(--goose-mist)]/30"
                }`}
              >
                {term}
                {courses[term].length > 0 && (
                  <span className="ml-2 text-xs">({courses[term].length})</span>
                )}
                {currentTerm === term && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full" title="Current term" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Course Search Bar */}
        <section className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for courses"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full border border-[var(--goose-ink)] px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--goose-slate)] bg-[var(--goose-cream)]"
              aria-label="Search for courses"
              autoComplete="off"
            />

            {/* Search results dropdown */}
            {searchQuery && !isSearching && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-[var(--goose-cream)] border border-[var(--goose-ink)] rounded shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((course) => (
                  <div
                    key={course.code}
                    onClick={() => handleAddCourse(course)}
                    className="p-3 hover:bg-[var(--goose-mist)]/30 cursor-pointer border-b border-[var(--goose-mist)] last:border-b-0"
                  >
                    <div className="font-display font-semibold text-[var(--goose-ink)]">
                      {course.code}
                    </div>
                    <div className="text-sm text-[var(--goose-slate)]">
                      {course.name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Loading state */}
            {searchQuery && isSearching && (
              <div className="absolute z-10 w-full mt-2 bg-[var(--goose-cream)] border border-[var(--goose-ink)] rounded shadow-lg p-4">
                <p className="text-[var(--goose-slate)] italic text-center">
                  Searching...
                </p>
              </div>
            )}

            {/* No results message */}
            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div className="absolute z-10 w-full mt-2 bg-[var(--goose-cream)] border border-[var(--goose-ink)] rounded shadow-lg p-4">
                <p className="text-[var(--goose-slate)] italic text-center">
                  No courses found matching &quot;{searchQuery}&quot;
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Courses for Selected Term Section */}
        <section className="border border-[var(--goose-ink)] rounded-xl p-8 md:p-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--goose-ink)]">
              Courses for Term {selectedTerm}
              {currentTerm === selectedTerm && (
                <span className="ml-3 text-sm font-normal text-green-600">(current)</span>
              )}
            </h2>
            {currentTerm !== selectedTerm && (
              <button
                onClick={() => handleSetCurrentTerm(selectedTerm)}
                className="text-sm border border-[var(--goose-ink)] px-3 py-1 rounded hover:bg-[var(--goose-mist)]/30 transition-colors"
              >
                Set as current term
              </button>
            )}
          </div>

          {courses[selectedTerm].length > 0 ? (
            <div className="space-y-3">
              {courses[selectedTerm].map((course) => (
                <CourseCard
                  key={course.code}
                  course={course}
                  completed={isTermCompleted(selectedTerm)}
                  missingPrereqs={missingPrereqs.has(course.code)}
                  isEditing={editingCourse === course.code}
                  onEdit={() => setEditingCourse(course.code)}
                  onMove={(targetTerm) => handleMoveCourse(course.code, targetTerm)}
                  onRemove={() => handleRemoveCourse(course.code)}
                  onCancelEdit={() => setEditingCourse(null)}
                />
              ))}
            </div>
          ) : (
            <p className="text-[var(--goose-slate)] italic">
              No courses added for this term yet
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
