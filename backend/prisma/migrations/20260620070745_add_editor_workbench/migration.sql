-- CreateTable
CREATE TABLE "ProofreadingTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zineId" INTEGER,
    "submissionId" INTEGER,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ZINE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "deadline" DATETIME,
    "assigneeId" INTEGER,
    "creatorId" INTEGER NOT NULL,
    "feedback" TEXT,
    "corrections" TEXT NOT NULL DEFAULT '[]',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProofreadingTask_zineId_fkey" FOREIGN KEY ("zineId") REFERENCES "Zine" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProofreadingTask_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProofreadingTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProofreadingTask_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EditorTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SUBMISSION',
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "content" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "creatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EditorTemplate_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollaborationNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "targetTitle" TEXT,
    "content" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#ffeaa7',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" INTEGER NOT NULL,
    "mentions" TEXT NOT NULL DEFAULT '[]',
    "attachments" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollaborationNote_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "targetTitle" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "remark" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "operatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowRecord_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewPerformance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reviewerId" INTEGER NOT NULL,
    "periodType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "avgReviewTime" REAL NOT NULL DEFAULT 0,
    "avgScore" REAL NOT NULL DEFAULT 0,
    "submissions" INTEGER NOT NULL DEFAULT 0,
    "topicSubs" INTEGER NOT NULL DEFAULT 0,
    "collaborations" INTEGER NOT NULL DEFAULT 0,
    "crowdfundings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewPerformance_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProofreadingTask_status_idx" ON "ProofreadingTask"("status");

-- CreateIndex
CREATE INDEX "ProofreadingTask_assigneeId_idx" ON "ProofreadingTask"("assigneeId");

-- CreateIndex
CREATE INDEX "ProofreadingTask_priority_idx" ON "ProofreadingTask"("priority");

-- CreateIndex
CREATE INDEX "EditorTemplate_type_idx" ON "EditorTemplate"("type");

-- CreateIndex
CREATE INDEX "EditorTemplate_category_idx" ON "EditorTemplate"("category");

-- CreateIndex
CREATE INDEX "CollaborationNote_targetType_targetId_idx" ON "CollaborationNote"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "CollaborationNote_creatorId_idx" ON "CollaborationNote"("creatorId");

-- CreateIndex
CREATE INDEX "CollaborationNote_isPinned_idx" ON "CollaborationNote"("isPinned");

-- CreateIndex
CREATE INDEX "WorkflowRecord_targetType_targetId_idx" ON "WorkflowRecord"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "WorkflowRecord_operatorId_idx" ON "WorkflowRecord"("operatorId");

-- CreateIndex
CREATE INDEX "WorkflowRecord_action_idx" ON "WorkflowRecord"("action");

-- CreateIndex
CREATE INDEX "WorkflowRecord_createdAt_idx" ON "WorkflowRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewPerformance_reviewerId_key" ON "ReviewPerformance"("reviewerId");

-- CreateIndex
CREATE INDEX "ReviewPerformance_periodType_idx" ON "ReviewPerformance"("periodType");

-- CreateIndex
CREATE INDEX "ReviewPerformance_reviewerId_idx" ON "ReviewPerformance"("reviewerId");
