-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Submission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
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
INSERT INTO "new_Submission" ("content", "createdAt", "id", "images", "rejectionReason", "reviewedAt", "reviewerId", "status", "title", "updatedAt", "userId") SELECT "content", "createdAt", "id", "images", "rejectionReason", "reviewedAt", "reviewerId", "status", "title", "updatedAt", "userId" FROM "Submission";
DROP TABLE "Submission";
ALTER TABLE "new_Submission" RENAME TO "Submission";
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
    "scheduledAt" DATETIME,
    "withdrawnAt" DATETIME,
    "lastSavedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "autoSaveEnabled" BOOLEAN NOT NULL DEFAULT true,
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
