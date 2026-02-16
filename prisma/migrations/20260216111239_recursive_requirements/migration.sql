-- DropForeignKey
ALTER TABLE "PlanRequirement" DROP CONSTRAINT "PlanRequirement_courseGroupId_fkey";

-- DropForeignKey
ALTER TABLE "Requirement" DROP CONSTRAINT "Requirement_courseGroupId_fkey";

-- AlterTable
ALTER TABLE "PlanRequirement" ADD COLUMN     "forceCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isText" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" INTEGER,
ALTER COLUMN "courseGroupId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Requirement" ADD COLUMN     "isText" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" INTEGER,
ALTER COLUMN "courseGroupId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PlanRequirement" ADD CONSTRAINT "PlanRequirement_courseGroupId_fkey" FOREIGN KEY ("courseGroupId") REFERENCES "CourseGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanRequirement" ADD CONSTRAINT "PlanRequirement_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PlanRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_courseGroupId_fkey" FOREIGN KEY ("courseGroupId") REFERENCES "CourseGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
