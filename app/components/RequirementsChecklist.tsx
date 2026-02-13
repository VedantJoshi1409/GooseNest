"use client";

import { useEffect, useState } from "react";

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

export default function RequirementsChecklist() {
  const [degreeData, setDegreeData] = useState<DegreeData | null>(null);
  const [coursesTaken, setCoursesTaken] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // TODO: replace with actual user ID from auth
  const userId = 1;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [degreeRes, coursesRes] = await Promise.all([
          fetch(`/api/users/${userId}/degree`),
          fetch(`/api/users/${userId}/courses`),
        ]);

        if (degreeRes.ok) {
          setDegreeData(await degreeRes.json());
        }

        if (coursesRes.ok) {
          const courses: { courseCode: string }[] = await coursesRes.json();
          setCoursesTaken(new Set(courses.map((c) => c.courseCode)));
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

  const totalRequired = requirements.reduce((sum, r) => sum + r.amount, 0);
  const totalCompleted = requirements.reduce((sum, r) => {
    const completed = r.courseGroup.links.filter((l) =>
      coursesTaken.has(l.courseCode)
    ).length;
    return sum + Math.min(completed, r.amount);
  }, 0);

  return (
    <div className="p-4 flex flex-col h-full">
      <h3 className="font-display text-lg font-bold text-[var(--goose-ink)] mb-1">
        Requirements
      </h3>
      <p className="text-xs text-[var(--goose-slate)] mb-4">
        {totalCompleted}/{totalRequired} completed
      </p>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {requirements.map((req) => {
          const eligible = req.courseGroup.links;
          const completed = eligible.filter((l) =>
            coursesTaken.has(l.courseCode)
          );
          const fulfilled = completed.length >= req.amount;

          return (
            <div key={req.id}>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                    fulfilled
                      ? "bg-[var(--goose-ink)] border-[var(--goose-ink)]"
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
                </div>
                <span
                  className={`text-sm font-medium ${
                    fulfilled
                      ? "text-[var(--goose-slate)] line-through"
                      : "text-[var(--goose-ink)]"
                  }`}
                >
                  {req.courseGroup.name}
                </span>
              </div>

              <div className="ml-6">
                <p className="text-xs text-[var(--goose-slate)] mb-1">
                  {completed.length}/{req.amount} courses
                </p>
                <div className="space-y-0.5">
                  {eligible.map((link) => {
                    const taken = coursesTaken.has(link.courseCode);
                    return (
                      <div
                        key={link.courseCode}
                        className={`text-xs flex items-center gap-1.5 ${
                          taken
                            ? "text-[var(--goose-slate)]"
                            : "text-[var(--goose-ink)]"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            taken
                              ? "bg-[var(--goose-ink)]"
                              : "bg-[var(--goose-mist)]"
                          }`}
                        />
                        <span className={taken ? "line-through" : ""}>
                          {link.courseCode}
                        </span>
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
