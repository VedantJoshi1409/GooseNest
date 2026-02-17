// lib/prisma.ts (or app/lib/prisma.ts)
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const pool = globalForPrisma.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

/**
 * Delete plans for a user and clean up any custom course groups
 * that were created specifically for those plans (not shared with
 * template requirements or faculties).
 */
export async function deleteUserPlansWithCustomGroups(userId: number) {
  // Find all course group IDs used by this user's plan requirements
  const planReqs = await prisma.planRequirement.findMany({
    where: { plan: { userId } },
    select: { courseGroupId: true },
  });

  const groupIds = planReqs
    .map((r) => r.courseGroupId)
    .filter((id): id is number => id !== null);

  // Delete the plans (cascade deletes PlanRequirements)
  await prisma.plan.deleteMany({ where: { userId } });

  if (groupIds.length === 0) return;

  // Find which of these groups are "default" (referenced by template
  // requirements or faculties) — those must NOT be deleted
  const [templateRefs, facultyRefs] = await Promise.all([
    prisma.requirement.findMany({
      where: { courseGroupId: { in: groupIds } },
      select: { courseGroupId: true },
    }),
    prisma.faculty.findMany({
      where: { courseGroupId: { in: groupIds } },
      select: { courseGroupId: true },
    }),
  ]);

  const protectedIds = new Set<number>();
  for (const r of templateRefs) {
    if (r.courseGroupId !== null) protectedIds.add(r.courseGroupId);
  }
  for (const f of facultyRefs) {
    if (f.courseGroupId !== null) protectedIds.add(f.courseGroupId);
  }

  const customGroupIds = groupIds.filter((id) => !protectedIds.has(id));

  if (customGroupIds.length > 0) {
    // CourseGroupLinks cascade-delete via onDelete: Cascade on CourseGroupLink
    await prisma.courseGroup.deleteMany({
      where: { id: { in: customGroupIds } },
    });
  }
}
