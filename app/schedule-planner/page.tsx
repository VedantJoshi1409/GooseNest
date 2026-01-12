'use client';

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import CourseCard from "../components/CourseCard";

interface Course {
  id: string;
  code: string;
  name: string;
}

const TERMS = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];

const availableCourses: Course[] = [
  { id: "1", code: "CS 145", name: "Designing Functional Programs" },
  { id: "2", code: "MATH 135", name: "Algebra for Honours Mathematics" },
  { id: "3", code: "MATH 137", name: "Calculus 1 for Honours Mathematics" },
  { id: "4", code: "CS 136", name: "Elementary Algorithm Design and Data Abstraction" },
  { id: "5", code: "MATH 136", name: "Linear Algebra 1 for Honours Mathematics" },
  { id: "6", code: "MATH 138", name: "Calculus 2 for Honours Mathematics" },
  { id: "7", code: "CS 246", name: "Object-Oriented Software Development" },
  { id: "8", code: "STAT 230", name: "Probability" },
  { id: "9", code: "STAT 231", name: "Statistics" },
  { id: "10", code: "CS 245", name: "Logic and Computation" },
  { id: "11", code: "CS 251", name: "Computer Organization and Design" },
  { id: "12", code: "CS 241", name: "Foundations of Sequential Programs" },
  { id: "13", code: "CS 240", name: "Data Structures and Data Management" },
  { id: "14", code: "CS 341", name: "Algorithms" },
  { id: "15", code: "CS 350", name: "Operating Systems" },
];

export default function SchedulePlannerPage() {
  const [selectedTerm, setSelectedTerm] = useState<string>("1A");
  const [courses, setCourses] = useState<Record<string, Course[]>>({
    "1A": [],
    "1B": [],
    "2A": [],
    "2B": [],
    "3A": [],
    "3B": [],
    "4A": [],
    "4B": []
  });
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter courses based on search query using useMemo
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return [];

    return availableCourses.filter((course) =>
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleAddCourse = (course: Course) => {
    // Check for duplicates
    const isDuplicate = courses[selectedTerm].some((c) => c.id === course.id);
    if (isDuplicate) {
      return;
    }

    setCourses((prev) => ({
      ...prev,
      [selectedTerm]: [...prev[selectedTerm], course]
    }));
    setSearchQuery("");
  };

  const handleMoveCourse = (courseId: string, targetTerm: string) => {
    setCourses((prev) => {
      const course = prev[selectedTerm].find((c) => c.id === courseId);
      if (!course) return prev;

      return {
        ...prev,
        [selectedTerm]: prev[selectedTerm].filter((c) => c.id !== courseId),
        [targetTerm]: [...prev[targetTerm], course]
      };
    });
    setEditingCourse(null);
  };

  const handleRemoveCourse = (courseId: string) => {
    setCourses((prev) => ({
      ...prev,
      [selectedTerm]: prev[selectedTerm].filter((c) => c.id !== courseId)
    }));
    setEditingCourse(null);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Term Selection Section */}
        <section className="mb-8">
          <label htmlFor="term-select" className="font-display text-lg font-semibold text-[var(--goose-ink)] mr-4">
            Term:
          </label>
          <select
            id="term-select"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="border border-[var(--goose-ink)] px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--goose-slate)] bg-[var(--goose-cream)]"
          >
            {TERMS.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </section>

        {/* Course Search Bar */}
        <section className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for courses"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-[var(--goose-ink)] px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--goose-slate)] bg-[var(--goose-cream)]"
              aria-label="Search for courses"
              autoComplete="off"
            />

            {/* Search results dropdown */}
            {searchQuery && filteredCourses.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-[var(--goose-cream)] border border-[var(--goose-ink)] rounded shadow-lg max-h-60 overflow-y-auto">
                {filteredCourses.map((course) => (
                  <div
                    key={course.id}
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

            {/* No results message */}
            {searchQuery && filteredCourses.length === 0 && (
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
          <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--goose-ink)] mb-6">
            Courses for Term {selectedTerm}
          </h2>

          {courses[selectedTerm].length > 0 ? (
            <div className="space-y-3">
              {courses[selectedTerm].map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isEditing={editingCourse === course.id}
                  onEdit={() => setEditingCourse(course.id)}
                  onMove={(targetTerm) => handleMoveCourse(course.id, targetTerm)}
                  onRemove={() => handleRemoveCourse(course.id)}
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
