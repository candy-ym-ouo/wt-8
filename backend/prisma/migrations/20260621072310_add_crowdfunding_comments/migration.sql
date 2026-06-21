-- CreateTable
CREATE TABLE "CrowdfundingComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "crowdfundingId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" INTEGER,
    "replyToUserId" INTEGER,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrowdfundingComment_crowdfundingId_fkey" FOREIGN KEY ("crowdfundingId") REFERENCES "Crowdfunding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrowdfundingComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CrowdfundingComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CrowdfundingComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrowdfundingCommentLike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "commentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrowdfundingCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CrowdfundingComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrowdfundingCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Crowdfunding" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "category" TEXT NOT NULL DEFAULT 'ZINE',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "targetAmount" REAL NOT NULL DEFAULT 0,
    "currentAmount" REAL NOT NULL DEFAULT 0,
    "backerCount" INTEGER NOT NULL DEFAULT 0,
    "deadline" DATETIME,
    "startTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "reviewerId" INTEGER,
    "reviewedAt" DATETIME,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "stockThreshold" INTEGER NOT NULL DEFAULT 0,
    "lowStockAlert" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Crowdfunding_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Crowdfunding_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Crowdfunding" ("backerCount", "category", "coverImage", "createdAt", "creatorId", "currentAmount", "deadline", "description", "id", "isFeatured", "lowStockAlert", "rejectionReason", "reviewedAt", "reviewerId", "sortOrder", "startTime", "status", "stockThreshold", "tags", "targetAmount", "title", "updatedAt", "viewCount") SELECT "backerCount", "category", "coverImage", "createdAt", "creatorId", "currentAmount", "deadline", "description", "id", "isFeatured", "lowStockAlert", "rejectionReason", "reviewedAt", "reviewerId", "sortOrder", "startTime", "status", "stockThreshold", "tags", "targetAmount", "title", "updatedAt", "viewCount" FROM "Crowdfunding";
DROP TABLE "Crowdfunding";
ALTER TABLE "new_Crowdfunding" RENAME TO "Crowdfunding";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CrowdfundingComment_crowdfundingId_idx" ON "CrowdfundingComment"("crowdfundingId");

-- CreateIndex
CREATE INDEX "CrowdfundingComment_userId_idx" ON "CrowdfundingComment"("userId");

-- CreateIndex
CREATE INDEX "CrowdfundingComment_parentId_idx" ON "CrowdfundingComment"("parentId");

-- CreateIndex
CREATE INDEX "CrowdfundingComment_status_idx" ON "CrowdfundingComment"("status");

-- CreateIndex
CREATE INDEX "CrowdfundingComment_createdAt_idx" ON "CrowdfundingComment"("createdAt");

-- CreateIndex
CREATE INDEX "CrowdfundingCommentLike_commentId_idx" ON "CrowdfundingCommentLike"("commentId");

-- CreateIndex
CREATE INDEX "CrowdfundingCommentLike_userId_idx" ON "CrowdfundingCommentLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CrowdfundingCommentLike_commentId_userId_key" ON "CrowdfundingCommentLike"("commentId", "userId");
