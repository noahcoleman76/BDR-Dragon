/*
  Warnings:

  - You are about to drop the column `quotaCalls` on the `Market` table. All the data in the column will be lost.
  - You are about to drop the column `quotaCleanOpportunities` on the `Market` table. All the data in the column will be lost.
  - You are about to drop the column `quotaEmails` on the `Market` table. All the data in the column will be lost.
  - You are about to drop the column `quotaMeetingsBooked` on the `Market` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Market" DROP COLUMN "quotaCalls",
DROP COLUMN "quotaCleanOpportunities",
DROP COLUMN "quotaEmails",
DROP COLUMN "quotaMeetingsBooked";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "quotaCalls" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quotaCleanOpportunities" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quotaEmails" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quotaMeetingsBooked" INTEGER NOT NULL DEFAULT 0;
