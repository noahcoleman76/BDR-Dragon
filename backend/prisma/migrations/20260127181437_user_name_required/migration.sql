/*
  Warnings:

  - You are about to drop the column `userId` on the `IntegrationStatus` table. All the data in the column will be lost.
  - The `salesforceStatus` column on the `IntegrationStatus` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `outreachStatus` column on the `IntegrationStatus` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `nickname` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[scope]` on the table `IntegrationStatus` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `scope` on the `IntegrationStatus` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "IntegrationStatus" DROP COLUMN "userId",
DROP COLUMN "scope",
ADD COLUMN     "scope" TEXT NOT NULL,
DROP COLUMN "salesforceStatus",
ADD COLUMN     "salesforceStatus" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
DROP COLUMN "outreachStatus",
ADD COLUMN     "outreachStatus" TEXT NOT NULL DEFAULT 'STUBBED';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "nickname",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationStatus_scope_key" ON "IntegrationStatus"("scope");
