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
    "UserCourse",
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

  // 1. Faculty
  await prisma.faculty.createMany({
    data: [{ name: "MAT" }],
  });

  // 2. Courses (CS and MATH are both under MAT faculty)
  await prisma.course.createMany({
    data: [
      { code: "CS135", title: "Designing Functional Programs", facultyName: "MAT" },
      { code: "CS136", title: "Elementary Algorithm Design", facultyName: "MAT" },
      { code: "CS245", title: "Logic and Computation", facultyName: "MAT" },
      { code: "CS246", title: "Object-Oriented Software Development", facultyName: "MAT" },
      { code: "MATH135", title: "Algebra", facultyName: "MAT" },
      { code: "MATH137", title: "Calculus 1", facultyName: "MAT" },
      { code: "MATH138", title: "Calculus 2", facultyName: "MAT" },
      { code: "MATH136", title: "Linear Algebra 1", facultyName: "MAT" },
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

  // 7. Seed user with a custom plan and courses taken
  const user = await prisma.user.create({
    data: {
      email: "test@uwaterloo.ca",
      name: "Test User",
    },
  });

  // Create a custom plan based on the template
  const plan = await prisma.plan.create({
    data: {
      name: "Computer Science, Honours, 2025 (Custom)",
      userId: user.id,
      templateId: template.id,
    },
  });

  // Copy template requirements into plan requirements
  await prisma.planRequirement.createMany({
    data: [
      {
        name: "CS Core",
        amount: 3,
        planId: plan.id,
        courseGroupId: csCore.id,
      },
      {
        name: "Math Core",
        amount: 2,
        planId: plan.id,
        courseGroupId: mathCore.id,
      },
    ],
  });

  // Mark some courses as taken
  await prisma.userCourse.createMany({
    data: [
      { userId: user.id, courseCode: "CS135" },
      { userId: user.id, courseCode: "CS136" },
      { userId: user.id, courseCode: "MATH135" },
      { userId: user.id, courseCode: "MATH137" },
    ],
  });

  console.log("Seeded user:", user.email);
  console.log("Plan:", plan.name);
  console.log("Courses taken: CS135, CS136, MATH135, MATH137");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
