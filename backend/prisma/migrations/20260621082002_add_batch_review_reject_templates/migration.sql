-- CreateTable
CREATE TABLE "RejectTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "creatorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RejectTemplate_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BatchReviewRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reviewerId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "submissionIds" TEXT NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "templateId" INTEGER,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BatchReviewRecord_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BatchReviewRecord_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RejectTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RejectTemplate_category_idx" ON "RejectTemplate"("category");

-- CreateIndex
CREATE INDEX "RejectTemplate_isActive_idx" ON "RejectTemplate"("isActive");

-- CreateIndex
CREATE INDEX "RejectTemplate_isGlobal_idx" ON "RejectTemplate"("isGlobal");

-- CreateIndex
CREATE INDEX "BatchReviewRecord_reviewerId_idx" ON "BatchReviewRecord"("reviewerId");

-- CreateIndex
CREATE INDEX "BatchReviewRecord_action_idx" ON "BatchReviewRecord"("action");

-- CreateIndex
CREATE INDEX "BatchReviewRecord_createdAt_idx" ON "BatchReviewRecord"("createdAt");
