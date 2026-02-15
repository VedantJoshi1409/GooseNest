/*
  Warnings:

  - You are about to drop the `UserCourse` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserCourse" DROP CONSTRAINT "UserCourse_courseCode_fkey";

-- DropForeignKey
ALTER TABLE "UserCourse" DROP CONSTRAINT "UserCourse_userId_fkey";

-- AlterTable
ALTER TABLE "Faculty" ADD COLUMN     "courseGroupId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentTerm" TEXT NOT NULL DEFAULT '1A';

-- DropTable
DROP TABLE "UserCourse";

-- CreateTable
CREATE TABLE "TermCourse" (
    "userId" INTEGER NOT NULL,
    "courseCode" TEXT NOT NULL,
    "term" TEXT NOT NULL,

    CONSTRAINT "TermCourse_pkey" PRIMARY KEY ("userId","courseCode")
);

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_courseGroupId_fkey" FOREIGN KEY ("courseGroupId") REFERENCES "CourseGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermCourse" ADD CONSTRAINT "TermCourse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermCourse" ADD CONSTRAINT "TermCourse_courseCode_fkey" FOREIGN KEY ("courseCode") REFERENCES "Course"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
