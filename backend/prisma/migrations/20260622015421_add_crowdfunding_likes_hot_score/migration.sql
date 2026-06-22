-- CreateTable
CREATE TABLE "CrowdfundingLike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "crowdfundingId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrowdfundingLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CrowdfundingLike_crowdfundingId_fkey" FOREIGN KEY ("crowdfundingId") REFERENCES "Crowdfunding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "hotScore" REAL NOT NULL DEFAULT 0,
    "hotScoreUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stockThreshold" INTEGER NOT NULL DEFAULT 0,
    "lowStockAlert" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Crowdfunding_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Crowdfunding_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Crowdfunding" ("backerCount", "category", "commentCount", "coverImage", "createdAt", "creatorId", "currentAmount", "deadline", "description", "id", "isFeatured", "lowStockAlert", "rejectionReason", "reviewedAt", "reviewerId", "sortOrder", "startTime", "status", "stockThreshold", "tags", "targetAmount", "title", "updatedAt", "viewCount") SELECT "backerCount", "category", "commentCount", "coverImage", "createdAt", "creatorId", "currentAmount", "deadline", "description", "id", "isFeatured", "lowStockAlert", "rejectionReason", "reviewedAt", "reviewerId", "sortOrder", "startTime", "status", "stockThreshold", "tags", "targetAmount", "title", "updatedAt", "viewCount" FROM "Crowdfunding";
DROP TABLE "Crowdfunding";
ALTER TABLE "new_Crowdfunding" RENAME TO "Crowdfunding";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CrowdfundingLike_userId_idx" ON "CrowdfundingLike"("userId");

-- CreateIndex
CREATE INDEX "CrowdfundingLike_crowdfundingId_idx" ON "CrowdfundingLike"("crowdfundingId");

-- CreateIndex
CREATE UNIQUE INDEX "CrowdfundingLike_crowdfundingId_userId_key" ON "CrowdfundingLike"("crowdfundingId", "userId");
