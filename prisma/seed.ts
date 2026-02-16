import "dotenv/config";
import { readFileSync } from "fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface CourseJson {
  id: string;
  title: string;
  subject: string;
  description: string;
  faculty: string;
  level: number;
  prerequisites: string[];
  unlocks: string[];
}

type ReqNode = string | { amount: number; options: ReqNode[] };

interface DegreeTemplate {
  name: string;
  href: string;
  requirements: ReqNode[];
}

const BATCH_SIZE = 500;

async function main() {
  await prisma.$executeRawUnsafe(`
  TRUNCATE TABLE
    "TermCourse",
    "PlanRequirement",
    "Plan",
    "User",
    "Requirement",
    "Template",
    "CourseGroup",
    "CourseGroupLink",
    "CoursePrereq",
    "Course",
    "Faculty"
  RESTART IDENTITY CASCADE;
`);

  // 1. Load courses from JSON
  const coursesJson: Record<string, CourseJson> = JSON.parse(
    readFileSync(new URL("../lib/courses.json", import.meta.url), "utf8"),
  );
  const allCourses = Object.values(coursesJson);
  const validCodes = new Set(allCourses.map((c) => c.id));
  console.log(`Loaded ${allCourses.length} courses from courses.json`);

  // 2. Seed faculties
  const faculties = [...new Set(allCourses.map((c) => c.faculty))];
  await prisma.faculty.createMany({
    data: faculties.map((name) => ({ name })),
  });
  console.log(`Seeded ${faculties.length} faculties: ${faculties.join(", ")}`);

  // 3. Seed courses in batches
  const courseData = allCourses.map((c) => {
    const title = c.title.includes(" - ")
      ? c.title.substring(c.title.indexOf(" - ") + 3)
      : c.title;
    return {
      code: c.id,
      title,
      description: c.description || null,
      subject: c.subject || null,
      level: c.level || null,
      facultyName: c.faculty,
    };
  });

  for (let i = 0; i < courseData.length; i += BATCH_SIZE) {
    const batch = courseData.slice(i, i + BATCH_SIZE);
    await prisma.course.createMany({ data: batch });
  }
  console.log(`Seeded ${courseData.length} courses`);

  // 4. Seed prerequisites in batches
  const prereqData: { courseCode: string; prereqCode: string }[] = [];
  for (const course of allCourses) {
    for (const prereq of course.prerequisites) {
      prereqData.push({ courseCode: course.id, prereqCode: prereq });
    }
  }

  for (let i = 0; i < prereqData.length; i += BATCH_SIZE) {
    const batch = prereqData.slice(i, i + BATCH_SIZE);
    await prisma.coursePrereq.createMany({ data: batch });
  }
  console.log(`Seeded ${prereqData.length} prerequisite links`);

  // 5. Faculty-based course groups
  const coursesByFaculty = new Map<string, string[]>();
  for (const course of allCourses) {
    if (!coursesByFaculty.has(course.faculty)) coursesByFaculty.set(course.faculty, []);
    coursesByFaculty.get(course.faculty)!.push(course.id);
  }

  for (const [facultyName, courseCodes] of coursesByFaculty) {
    const group = await prisma.courseGroup.create({
      data: { name: `${facultyName} Courses` },
    });

    for (let i = 0; i < courseCodes.length; i += BATCH_SIZE) {
      const batch = courseCodes.slice(i, i + BATCH_SIZE);
      await prisma.courseGroupLink.createMany({
        data: batch.map((code) => ({ groupId: group.id, courseCode: code })),
      });
    }

    await prisma.faculty.update({
      where: { name: facultyName },
      data: { courseGroupId: group.id },
    });

    console.log(`Created faculty group "${group.name}" with ${courseCodes.length} courses (id: ${group.id})`);
  }

  // 6. Seed all 181 degree templates from degree_requirements.json
  const degreeData: Record<string, DegreeTemplate> = JSON.parse(
    readFileSync(new URL("../lib/degree_requirements.json", import.meta.url), "utf8"),
  );

  let templateCount = 0;
  let reqCount = 0;
  let groupCount = 0;

  for (const [, degreeTemplate] of Object.entries(degreeData)) {
    const template = await prisma.template.create({
      data: { name: degreeTemplate.name },
    });

    await seedRequirements(template.id, degreeTemplate.requirements, null);
    templateCount++;
  }

  /**
   * Recursively seed requirements for a template.
   * Each ReqNode can be:
   * - A string → text-only requirement (isText: true)
   * - An object with all-string options → leaf requirement with CourseGroup
   * - An object with nested objects/mixed options → branch requirement with children
   */
  async function seedRequirements(
    templateId: number,
    nodes: ReqNode[],
    parentId: number | null,
  ) {
    for (const node of nodes) {
      if (typeof node === "string") {
        // Text-only requirement
        await prisma.requirement.create({
          data: {
            name: node,
            amount: 0,
            isText: true,
            templateId,
            parentId,
          },
        });
        reqCount++;
        continue;
      }

      // Object node — check if all options are course codes (strings)
      const stringOptions = node.options.filter((o): o is string => typeof o === "string");
      const objectOptions = node.options.filter((o): o is { amount: number; options: ReqNode[] } => typeof o !== "string");

      if (objectOptions.length === 0) {
        // All options are course codes → leaf with CourseGroup
        const validOptions = stringOptions.filter((code) => validCodes.has(code));

        if (validOptions.length === 0) {
          // No valid courses — treat as text
          const label = `Complete ${node.amount} from: ${stringOptions.join(", ")}`;
          await prisma.requirement.create({
            data: {
              name: label,
              amount: node.amount,
              isText: true,
              templateId,
              parentId,
            },
          });
          reqCount++;
          continue;
        }

        const groupName =
          validOptions.length <= 3
            ? validOptions.join(", ")
            : `${validOptions[0]}...${validOptions[validOptions.length - 1]}`;

        const group = await prisma.courseGroup.create({
          data: { name: groupName },
        });
        groupCount++;

        for (let i = 0; i < validOptions.length; i += BATCH_SIZE) {
          const batch = validOptions.slice(i, i + BATCH_SIZE);
          await prisma.courseGroupLink.createMany({
            data: batch.map((code) => ({ groupId: group.id, courseCode: code })),
          });
        }

        await prisma.requirement.create({
          data: {
            name: groupName,
            amount: node.amount,
            courseGroupId: group.id,
            templateId,
            parentId,
          },
        });
        reqCount++;
      } else {
        // Mixed or all-objects → branch node with children
        const branchName = `Complete ${node.amount} of the following`;
        const branch = await prisma.requirement.create({
          data: {
            name: branchName,
            amount: node.amount,
            templateId,
            parentId,
          },
        });
        reqCount++;

        // Recurse into all options as children
        await seedRequirements(templateId, node.options, branch.id);
      }
    }
  }

  console.log(`Seeded ${templateCount} templates, ${reqCount} requirements, ${groupCount} course groups`);

  // 7. Seed test user (no plan/template assigned)
  const user = await prisma.user.create({
    data: { email: "test@uwaterloo.ca", name: "Test User" },
  });

  console.log("Seeded user:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
