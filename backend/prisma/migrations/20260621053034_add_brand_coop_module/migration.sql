-- CreateTable
CREATE TABLE "BrandCoop" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "brandLogo" TEXT,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "category" TEXT NOT NULL DEFAULT 'COBRANDING',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "cooperationType" TEXT NOT NULL DEFAULT 'COBRANDING',
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "budget" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "requirements" TEXT,
    "deliverables" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "kanbanColumn" TEXT NOT NULL DEFAULT 'PROPOSAL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "reviewerId" INTEGER,
    "reviewedAt" DATETIME,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "creatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrandCoop_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BrandCoop_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrandCoopZine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brandCoopId" INTEGER NOT NULL,
    "zineId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'RELATED',
    "recommendNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandCoopZine_brandCoopId_fkey" FOREIGN KEY ("brandCoopId") REFERENCES "BrandCoop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BrandCoopZine_zineId_fkey" FOREIGN KEY ("zineId") REFERENCES "Zine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrandCoopSchedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brandCoopId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "plannedDate" DATETIME NOT NULL,
    "actualDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assigneeId" INTEGER,
    "remark" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "creatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrandCoopSchedule_brandCoopId_fkey" FOREIGN KEY ("brandCoopId") REFERENCES "BrandCoop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrandCoopMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brandCoopId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandCoopMessage_brandCoopId_fkey" FOREIGN KEY ("brandCoopId") REFERENCES "BrandCoop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BrandCoopMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BrandCoop_status_idx" ON "BrandCoop"("status");

-- CreateIndex
CREATE INDEX "BrandCoop_kanbanColumn_idx" ON "BrandCoop"("kanbanColumn");

-- CreateIndex
CREATE INDEX "BrandCoop_creatorId_idx" ON "BrandCoop"("creatorId");

-- CreateIndex
CREATE INDEX "BrandCoop_category_idx" ON "BrandCoop"("category");

-- CreateIndex
CREATE INDEX "BrandCoop_createdAt_idx" ON "BrandCoop"("createdAt");

-- CreateIndex
CREATE INDEX "BrandCoopZine_brandCoopId_idx" ON "BrandCoopZine"("brandCoopId");

-- CreateIndex
CREATE INDEX "BrandCoopZine_zineId_idx" ON "BrandCoopZine"("zineId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandCoopZine_brandCoopId_zineId_key" ON "BrandCoopZine"("brandCoopId", "zineId");

-- CreateIndex
CREATE INDEX "BrandCoopSchedule_brandCoopId_idx" ON "BrandCoopSchedule"("brandCoopId");

-- CreateIndex
CREATE INDEX "BrandCoopSchedule_status_idx" ON "BrandCoopSchedule"("status");

-- CreateIndex
CREATE INDEX "BrandCoopSchedule_plannedDate_idx" ON "BrandCoopSchedule"("plannedDate");

-- CreateIndex
CREATE INDEX "BrandCoopMessage_brandCoopId_idx" ON "BrandCoopMessage"("brandCoopId");

-- CreateIndex
CREATE INDEX "BrandCoopMessage_senderId_idx" ON "BrandCoopMessage"("senderId");

-- CreateIndex
CREATE INDEX "BrandCoopMessage_createdAt_idx" ON "BrandCoopMessage"("createdAt");
