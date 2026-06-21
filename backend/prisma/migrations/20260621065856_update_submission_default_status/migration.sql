/*
  Warnings:

  - You are about to drop the column `autoSaveEnabled` on the `TopicSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `lastSavedAt` on the `TopicSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `TopicSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `TopicSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `withdrawnAt` on the `TopicSubmission` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Submission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "reviewerId" INTEGER,
    "reviewedAt" DATETIME,
    "scheduledAt" DATETIME,
    "withdrawnAt" DATETIME,
    "lastSavedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "autoSaveEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Submission" ("autoSaveEnabled", "content", "createdAt", "id", "images", "lastSavedAt", "rejectionReason", "reviewedAt", "reviewerId", "scheduledAt", "status", "title", "updatedAt", "userId", "version", "withdrawnAt") SELECT "autoSaveEnabled", "content", "createdAt", "id", "images", "lastSavedAt", "rejectionReason", "reviewedAt", "reviewerId", "scheduledAt", "status", "title", "updatedAt", "userId", "version", "withdrawnAt" FROM "Submission";
DROP TABLE "Submission";
ALTER TABLE "new_Submission" RENAME TO "Submission";
CREATE INDEX "Submission_userId_status_idx" ON "Submission"("userId", "status");
CREATE INDEX "Submission_status_idx" ON "Submission"("status");
CREATE INDEX "Submission_scheduledAt_idx" ON "Submission"("scheduledAt");
CREATE TABLE "new_TopicSubmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topicId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewerId" INTEGER,
    "reviewedAt" DATETIME,
    "scheduleId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TopicSubmission_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TopicSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TopicSubmission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TopicSubmission_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TopicSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TopicSubmission" ("content", "createdAt", "id", "images", "rejectionReason", "reviewedAt", "reviewerId", "scheduleId", "status", "title", "topicId", "updatedAt", "userId") SELECT "content", "createdAt", "id", "images", "rejectionReason", "reviewedAt", "reviewerId", "scheduleId", "status", "title", "topicId", "updatedAt", "userId" FROM "TopicSubmission";
DROP TABLE "TopicSubmission";
ALTER TABLE "new_TopicSubmission" RENAME TO "TopicSubmission";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
