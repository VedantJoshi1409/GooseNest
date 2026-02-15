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
  console.log(`Loaded ${allCourses.length} courses from courses.json`);

  // 2. Seed faculties
  const faculties = [...new Set(allCourses.map((c) => c.faculty))];
  await prisma.faculty.createMany({
    data: faculties.map((name) => ({ name })),
  });
  console.log(`Seeded ${faculties.length} faculties: ${faculties.join(", ")}`);

  // 3. Seed courses in batches
  const BATCH_SIZE = 500;
  const courseData = allCourses.map((c) => {
    // Strip course code prefix from title (e.g. "CS135 - Designing..." -> "Designing...")
    const title = c.title.includes(" - ")
      ? c.title.substring(c.title.indexOf(" - ") + 3)
      : c.title;
    return { code: c.id, title, facultyName: c.faculty };
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

  // 6. Specific course groups
  const csCore = await prisma.courseGroup.create({
    data: { name: "CS Core Courses" },
  });

  const mathCore = await prisma.courseGroup.create({
    data: { name: "Math Core Courses" },
  });

  await prisma.courseGroupLink.createMany({
    data: [
      { groupId: csCore.id, courseCode: "CS145" },
      { groupId: csCore.id, courseCode: "CS146" },
      { groupId: csCore.id, courseCode: "CS245" },
      { groupId: csCore.id, courseCode: "CS246" },
    ],
  });

  await prisma.courseGroupLink.createMany({
    data: [
      { groupId: mathCore.id, courseCode: "MATH145" },
      { groupId: mathCore.id, courseCode: "MATH146" },
      { groupId: mathCore.id, courseCode: "MATH147" },
      { groupId: mathCore.id, courseCode: "MATH148" },
    ],
  });

  // 7. Template
  const template = await prisma.template.create({
    data: { name: "Computer Science, Honours, 2025" },
  });

  await prisma.requirement.createMany({
    data: [
      {
        name: "CS Core",
        amount: 3,
        templateId: template.id,
        courseGroupId: csCore.id,
      },
      {
        name: "Math Core",
        amount: 2,
        templateId: template.id,
        courseGroupId: mathCore.id,
      },
    ],
  });

  // 8. Seed user
  const user = await prisma.user.create({
    data: { email: "test@uwaterloo.ca", name: "Test User" },
  });

  const plan = await prisma.plan.create({
    data: {
      name: "Computer Science, Honours, 2025 (Custom)",
      userId: user.id,
      templateId: template.id,
    },
  });

  await prisma.planRequirement.createMany({
    data: [
      { name: "CS Core", amount: 3, planId: plan.id, courseGroupId: csCore.id },
      {
        name: "Math Core",
        amount: 2,
        planId: plan.id,
        courseGroupId: mathCore.id,
      },
    ],
  });

  await prisma.termCourse.createMany({
    data: [
      { userId: user.id, courseCode: "CS145", term: "1A" },
      { userId: user.id, courseCode: "MATH145", term: "1A" },
      { userId: user.id, courseCode: "MATH137", term: "1A" },
      { userId: user.id, courseCode: "COMMST100", term: "1A" },
      { userId: user.id, courseCode: "AFM101", term: "1A" },
      { userId: user.id, courseCode: "CS146", term: "1B" },
      { userId: user.id, courseCode: "MATH148", term: "1B" },
      { userId: user.id, courseCode: "COMMST225", term: "1B" },
      { userId: user.id, courseCode: "MATH146", term: "1B" },
      { userId: user.id, courseCode: "STAT230", term: "1B" },
    ],
  });

  console.log("Seeded user:", user.email);
  console.log("Plan:", plan.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
