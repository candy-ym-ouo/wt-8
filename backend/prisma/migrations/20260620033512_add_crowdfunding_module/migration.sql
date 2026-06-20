-- CreateTable
CREATE TABLE "Crowdfunding" (
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
    "stockThreshold" INTEGER NOT NULL DEFAULT 0,
    "lowStockAlert" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Crowdfunding_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Crowdfunding_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrowdfundingTier" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "crowdfundingId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deliveryDate" DATETIME,
    "perks" TEXT NOT NULL DEFAULT '[]',
    "isUnlimited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrowdfundingTier_crowdfundingId_fkey" FOREIGN KEY ("crowdfundingId") REFERENCES "Crowdfunding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrowdfundingOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNo" TEXT NOT NULL,
    "crowdfundingId" INTEGER NOT NULL,
    "tierId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "receiverName" TEXT,
    "receiverPhone" TEXT,
    "receiverAddress" TEXT,
    "remark" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'BALANCE',
    "paidAt" DATETIME,
    "shippedAt" DATETIME,
    "deliveredAt" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "trackingNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrowdfundingOrder_crowdfundingId_fkey" FOREIGN KEY ("crowdfundingId") REFERENCES "Crowdfunding" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CrowdfundingOrder_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "CrowdfundingTier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CrowdfundingOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CrowdfundingTier_crowdfundingId_idx" ON "CrowdfundingTier"("crowdfundingId");

-- CreateIndex
CREATE UNIQUE INDEX "CrowdfundingOrder_orderNo_key" ON "CrowdfundingOrder"("orderNo");

-- CreateIndex
CREATE INDEX "CrowdfundingOrder_crowdfundingId_idx" ON "CrowdfundingOrder"("crowdfundingId");

-- CreateIndex
CREATE INDEX "CrowdfundingOrder_userId_idx" ON "CrowdfundingOrder"("userId");

-- CreateIndex
CREATE INDEX "CrowdfundingOrder_status_idx" ON "CrowdfundingOrder"("status");
