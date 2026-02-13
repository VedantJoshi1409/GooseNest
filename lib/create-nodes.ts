import { GraphNode } from "@/graph/types";
import courses from "./courses.json";

type CourseData = {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  faculty: string;
  level: number | null;
  prerequisites: string[];
  unlocks: string[];
};

type CoursesJson = Record<string, CourseData>;

/**
 * Converts the courses JSON data to an array of GraphNodes
 */
export function createNodes(): GraphNode[] {
  const data = courses as CoursesJson;

  return Object.values(data).map((course) => ({
    id: course.id,
    title: course.title,
    subject: course.subject,
    description: course.description ?? "",
    faculty: course.faculty,
    level: course.level ?? 0,
    prerequisites: course.prerequisites,
    unlocks: course.unlocks ?? [],
  }));
}

export default createNodes;
