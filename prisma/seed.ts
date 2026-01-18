import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.$executeRawUnsafe(`
  TRUNCATE TABLE
    "Requirement",
    "Template",
    "CourseGroup",
    "CourseGroupLink",
    "CoursePrereq",
    "Course",
    "Faculty"
  RESTART IDENTITY CASCADE;
`);

  // 1. Faculty
  await prisma.faculty.createMany({
    data: [
      {
        name: "MATH",
      },
      {
        name: "CS",
      },
    ],
  });

  // 2. Courses
  await prisma.course.createMany({
    data: [
      {
        code: "CS135",
        title: "Designing Functional Programs",
        facultyName: "CS",
      },
      {
        code: "CS136",
        title: "Elementary Algorithm Design",
        facultyName: "CS",
      },
      { code: "CS245", title: "Logic and Computation", facultyName: "CS" },
      {
        code: "CS246",
        title: "Object-Oriented Software Development",
        facultyName: "CS",
      },
      { code: "MATH135", title: "Algebra", facultyName: "MATH" },
      { code: "MATH137", title: "Calculus 1", facultyName: "MATH" },
      { code: "MATH138", title: "Calculus 2", facultyName: "MATH" },
      { code: "MATH136", title: "Linear Algebra 1", facultyName: "MATH" },
    ],
  });

  await prisma.coursePrereq.createMany({
    data: [
      { courseCode: "CS136", prereqCode: "CS135" },
      { courseCode: "CS246", prereqCode: "CS245" },
      { courseCode: "CS245", prereqCode: "CS136" },
      { courseCode: "MATH138", prereqCode: "MATH137" },
      { courseCode: "MATH136", prereqCode: "MATH135" },
    ],
  });

  // 3. Course Group
  const csCore = await prisma.courseGroup.create({
    data: {
      name: "CS Core Courses",
    },
  });

  const mathCore = await prisma.courseGroup.create({
    data: {
      name: "Math Core Courses",
    },
  });

  // 4. Link courses to group
  await prisma.courseGroupLink.createMany({
    data: [
      { groupId: csCore.id, courseCode: "CS135" },
      { groupId: csCore.id, courseCode: "CS136" },
      { groupId: csCore.id, courseCode: "CS245" },
      { groupId: csCore.id, courseCode: "CS246" },
    ],
  });

  await prisma.courseGroupLink.createMany({
    data: [
      { groupId: mathCore.id, courseCode: "MATH135" },
      { groupId: mathCore.id, courseCode: "MATH136" },
      { groupId: mathCore.id, courseCode: "MATH137" },
      { groupId: mathCore.id, courseCode: "MATH138" },
    ],
  });

  // 5. Template
  const template = await prisma.template.create({
    data: {
      name: "Computer Science, Honours, 2025",
    },
  });

  // 6. Requirement
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
