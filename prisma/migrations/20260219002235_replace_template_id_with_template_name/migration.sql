/*
  Warnings:

  - You are about to drop the column `templateId` on the `Plan` table. All the data in the column will be lost.
  - Added the required column `templateName` to the `Plan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Plan" DROP CONSTRAINT "Plan_templateId_fkey";

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "templateId",
ADD COLUMN     "templateName" TEXT NOT NULL;
