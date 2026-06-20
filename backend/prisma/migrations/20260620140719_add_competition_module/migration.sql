-- CreateTable
CREATE TABLE "Competition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "category" TEXT NOT NULL DEFAULT 'CREATION',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "rules" TEXT,
    "prizes" TEXT,
    "judges" TEXT NOT NULL DEFAULT '[]',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "resultDate" DATETIME,
    "maxEntries" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "reviewerId" INTEGER,
    "reviewedAt" DATETIME,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "entryCount" INTEGER NOT NULL DEFAULT 0,
    "scoringMode" TEXT NOT NULL DEFAULT 'AVERAGE',
    "isResultPublic" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Competition_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Competition_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitionGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "competitionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompetitionGroup_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitionEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "competitionId" INTEGER NOT NULL,
    "groupId" INTEGER,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewerId" INTEGER,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompetitionEntry_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompetitionEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CompetitionGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CompetitionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitionScore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entryId" INTEGER NOT NULL,
    "judgeId" INTEGER NOT NULL,
    "score" REAL NOT NULL DEFAULT 0,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompetitionScore_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CompetitionEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompetitionScore_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Competition_status_idx" ON "Competition"("status");

-- CreateIndex
CREATE INDEX "Competition_creatorId_idx" ON "Competition"("creatorId");

-- CreateIndex
CREATE INDEX "Competition_category_idx" ON "Competition"("category");

-- CreateIndex
CREATE INDEX "Competition_startDate_idx" ON "Competition"("startDate");

-- CreateIndex
CREATE INDEX "Competition_createdAt_idx" ON "Competition"("createdAt");

-- CreateIndex
CREATE INDEX "CompetitionGroup_competitionId_idx" ON "CompetitionGroup"("competitionId");

-- CreateIndex
CREATE INDEX "CompetitionEntry_competitionId_idx" ON "CompetitionEntry"("competitionId");

-- CreateIndex
CREATE INDEX "CompetitionEntry_groupId_idx" ON "CompetitionEntry"("groupId");

-- CreateIndex
CREATE INDEX "CompetitionEntry_userId_idx" ON "CompetitionEntry"("userId");

-- CreateIndex
CREATE INDEX "CompetitionEntry_status_idx" ON "CompetitionEntry"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionEntry_competitionId_userId_key" ON "CompetitionEntry"("competitionId", "userId");

-- CreateIndex
CREATE INDEX "CompetitionScore_entryId_idx" ON "CompetitionScore"("entryId");

-- CreateIndex
CREATE INDEX "CompetitionScore_judgeId_idx" ON "CompetitionScore"("judgeId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionScore_entryId_judgeId_key" ON "CompetitionScore"("entryId", "judgeId");
