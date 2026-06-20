-- CreateTable
CREATE TABLE "SwapListing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "haveZineId" INTEGER,
    "haveZineTitle" TEXT,
    "haveZineAuthor" TEXT,
    "haveZineCategory" TEXT,
    "haveZineCondition" TEXT NOT NULL DEFAULT 'GOOD',
    "wantZineId" INTEGER,
    "wantZineTitle" TEXT,
    "wantZineAuthor" TEXT,
    "wantZineCategory" TEXT,
    "wantTags" TEXT NOT NULL DEFAULT '[]',
    "haveTags" TEXT NOT NULL DEFAULT '[]',
    "category" TEXT NOT NULL DEFAULT 'ZINE',
    "exchangeType" TEXT NOT NULL DEFAULT 'SWAP',
    "location" TEXT,
    "shippingMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "reviewerId" INTEGER,
    "reviewedAt" DATETIME,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "creatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SwapListing_haveZineId_fkey" FOREIGN KEY ("haveZineId") REFERENCES "Zine" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SwapListing_wantZineId_fkey" FOREIGN KEY ("wantZineId") REFERENCES "Zine" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SwapListing_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SwapListing_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SwapMatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "listingAId" INTEGER NOT NULL,
    "listingBId" INTEGER NOT NULL,
    "matchScore" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "initiatorId" INTEGER NOT NULL,
    "responderId" INTEGER NOT NULL,
    "initiatorConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "responderConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "SwapMatch_listingAId_fkey" FOREIGN KEY ("listingAId") REFERENCES "SwapListing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SwapMatch_listingBId_fkey" FOREIGN KEY ("listingBId") REFERENCES "SwapListing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SwapMatch_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SwapMatch_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SwapMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SwapMessage_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "SwapMatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SwapMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SwapListing_status_idx" ON "SwapListing"("status");

-- CreateIndex
CREATE INDEX "SwapListing_creatorId_idx" ON "SwapListing"("creatorId");

-- CreateIndex
CREATE INDEX "SwapListing_category_idx" ON "SwapListing"("category");

-- CreateIndex
CREATE INDEX "SwapListing_createdAt_idx" ON "SwapListing"("createdAt");

-- CreateIndex
CREATE INDEX "SwapMatch_status_idx" ON "SwapMatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SwapMatch_listingAId_listingBId_key" ON "SwapMatch"("listingAId", "listingBId");

-- CreateIndex
CREATE INDEX "SwapMessage_matchId_idx" ON "SwapMessage"("matchId");

-- CreateIndex
CREATE INDEX "SwapMessage_senderId_idx" ON "SwapMessage"("senderId");

-- CreateIndex
CREATE INDEX "SwapMessage_createdAt_idx" ON "SwapMessage"("createdAt");
