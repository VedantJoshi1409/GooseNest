'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../components/Navbar";
import CourseCard from "../components/CourseCard";

interface Course {
  code: string;
  name: string;
}

interface TermCourseEntry {
  courseCode: string;
  term: string;
  course: { code: string; title: string };
}

const TERMS = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];
const USER_ID = 1;

export default function SchedulePlannerPage() {
  const [selectedTerm, setSelectedTerm] = useState<string>("1A");
  const [courses, setCourses] = useState<Record<string, Course[]>>({
    "1A": [], "1B": [], "2A": [], "2B": [],
    "3A": [], "3B": [], "4A": [], "4B": [],
  });
  const [currentTerm, setCurrentTerm] = useState<string>("1A");
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Course[]>([]);
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

  // Fetch schedule on mount
  useEffect(() => {
    async function fetchSchedule() {
      const res = await fetch(`/api/users/${USER_ID}/schedule`);
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
          });
        }
      }
      setCourses(grouped);
    }
    fetchSchedule();
  }, []);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
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
      const data: { code: string; title: string }[] = await res.json();
      setSearchResults(data.map((c) => ({ code: c.code, name: c.title })));
      setIsSearching(false);
    }, 300);
  }, []);

  const handleAddCourse = async (course: Course) => {
    // Check if already in any term
    const alreadyScheduled = Object.values(courses).some((list) =>
      list.some((c) => c.code === course.code)
    );
    if (alreadyScheduled) return;

    const res = await fetch(`/api/users/${USER_ID}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseCode: course.code, term: selectedTerm }),
    });
    if (!res.ok) return;

    setCourses((prev) => ({
      ...prev,
      [selectedTerm]: [...prev[selectedTerm], course],
    }));
    setSearchQuery("");
    setSearchResults([]);
    notifyChange();
  };

  const handleMoveCourse = async (courseCode: string, targetTerm: string) => {
    const res = await fetch(`/api/users/${USER_ID}/schedule`, {
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
    const res = await fetch(`/api/users/${USER_ID}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentTerm: term }),
    });
    if (!res.ok) return;
    setCurrentTerm(term);
    notifyChange();
  };

  const handleRemoveCourse = async (courseCode: string) => {
    const res = await fetch(`/api/users/${USER_ID}/schedule`, {
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
        <section className="border border-[var(--goose-ink)] p-8 md:p-12">
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
