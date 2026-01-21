-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BASIC');

-- CreateEnum
CREATE TYPE "TaskListType" AS ENUM ('TODAY', 'THIS_WEEK', 'THIS_MONTH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('NONE', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "IntegrationScope" AS ENUM ('GLOBAL', 'USER');

-- CreateEnum
CREATE TYPE "IntegrationStatusEnum" AS ENUM ('CONFIGURED', 'NOT_CONFIGURED', 'STUBBED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'BASIC',
    "nickname" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "geographicDescription" TEXT,
    "accountExecutives" TEXT,
    "managerName" TEXT,
    "quotaCalls" INTEGER NOT NULL DEFAULT 0,
    "quotaEmails" INTEGER NOT NULL DEFAULT 0,
    "quotaMeetingsBooked" INTEGER NOT NULL DEFAULT 0,
    "quotaCleanOpportunities" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMarket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "emails" INTEGER NOT NULL DEFAULT 0,
    "meetingsBooked" INTEGER NOT NULL DEFAULT 0,
    "meetingsHeld" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesCreated" INTEGER NOT NULL DEFAULT 0,
    "cleanOpportunities" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TaskListType" NOT NULL DEFAULT 'CUSTOM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "taskListId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationStatus" (
    "id" TEXT NOT NULL,
    "scope" "IntegrationScope" NOT NULL,
    "userId" TEXT,
    "salesforceStatus" "IntegrationStatusEnum" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "outreachStatus" "IntegrationStatusEnum" NOT NULL DEFAULT 'STUBBED',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserMarket_userId_marketId_key" ON "UserMarket"("userId", "marketId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiSnapshot_userId_date_key" ON "KpiSnapshot"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TaskList_userId_name_key" ON "TaskList"("userId", "name");

-- AddForeignKey
ALTER TABLE "UserMarket" ADD CONSTRAINT "UserMarket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMarket" ADD CONSTRAINT "UserMarket_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSnapshot" ADD CONSTRAINT "KpiSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskList" ADD CONSTRAINT "TaskList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_taskListId_fkey" FOREIGN KEY ("taskListId") REFERENCES "TaskList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
