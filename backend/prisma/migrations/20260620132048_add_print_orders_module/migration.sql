-- CreateTable
CREATE TABLE "PrintOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "zineId" INTEGER,
    "category" TEXT NOT NULL DEFAULT 'ZINE',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "paperType" TEXT NOT NULL DEFAULT 'COATED',
    "paperSize" TEXT NOT NULL DEFAULT 'A5',
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "colorMode" TEXT NOT NULL DEFAULT 'CMYK',
    "binding" TEXT NOT NULL DEFAULT 'SADDLE_STITCH',
    "coverType" TEXT NOT NULL DEFAULT 'SOFT',
    "printQuantity" INTEGER NOT NULL DEFAULT 100,
    "specialReq" TEXT NOT NULL DEFAULT '[]',
    "unitPrice" REAL,
    "totalPrice" REAL,
    "quotationNote" TEXT,
    "quotedAt" DATETIME,
    "quoterId" INTEGER,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactAddress" TEXT,
    "deliveryAddress" TEXT,
    "deliveryDate" DATETIME,
    "attachments" TEXT NOT NULL DEFAULT '[]',
    "remark" TEXT,
    "reviewerId" INTEGER,
    "reviewedAt" DATETIME,
    "creatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrintOrder_quoterId_fkey" FOREIGN KEY ("quoterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PrintOrder_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PrintOrder_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PrintOrder_status_idx" ON "PrintOrder"("status");

-- CreateIndex
CREATE INDEX "PrintOrder_creatorId_idx" ON "PrintOrder"("creatorId");

-- CreateIndex
CREATE INDEX "PrintOrder_reviewerId_idx" ON "PrintOrder"("reviewerId");

-- CreateIndex
CREATE INDEX "PrintOrder_createdAt_idx" ON "PrintOrder"("createdAt");
