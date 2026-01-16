/*
  Warnings:

  - The primary key for the `CourseGroup` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `courseCode` on the `CourseGroup` table. All the data in the column will be lost.
  - You are about to drop the column `requirementId` on the `CourseGroup` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Requirement` table. All the data in the column will be lost.
  - Added the required column `name` to the `CourseGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `courseGroupId` to the `Requirement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Requirement` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CourseGroup" DROP CONSTRAINT "CourseGroup_courseCode_fkey";

-- DropForeignKey
ALTER TABLE "CourseGroup" DROP CONSTRAINT "CourseGroup_requirementId_fkey";

-- DropForeignKey
ALTER TABLE "Requirement" DROP CONSTRAINT "Requirement_templateId_fkey";

-- AlterTable
ALTER TABLE "CourseGroup" DROP CONSTRAINT "CourseGroup_pkey",
DROP COLUMN "courseCode",
DROP COLUMN "requirementId",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD CONSTRAINT "CourseGroup_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Requirement" DROP COLUMN "description",
ADD COLUMN     "courseGroupId" INTEGER NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "CourseGroupLink" (
    "id" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "courseCode" TEXT NOT NULL,

    CONSTRAINT "CourseGroupLink_pkey" PRIMARY KEY ("groupId","courseCode")
);

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_courseGroupId_fkey" FOREIGN KEY ("courseGroupId") REFERENCES "CourseGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGroupLink" ADD CONSTRAINT "CourseGroupLink_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGroupLink" ADD CONSTRAINT "CourseGroupLink_courseCode_fkey" FOREIGN KEY ("courseCode") REFERENCES "Course"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
