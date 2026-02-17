/*
  Warnings:

  - You are about to drop the column `templateId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_templateId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "templateId";
