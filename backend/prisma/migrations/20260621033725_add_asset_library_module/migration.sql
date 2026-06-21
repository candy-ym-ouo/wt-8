-- CreateTable
CREATE TABLE "AssetCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AssetResource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL DEFAULT '',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "fileType" TEXT NOT NULL DEFAULT 'IMAGE',
    "categoryId" INTEGER NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "type" TEXT NOT NULL DEFAULT 'COVER_TEMPLATE',
    "minLevel" INTEGER NOT NULL DEFAULT 0,
    "requirePlan" BOOLEAN NOT NULL DEFAULT false,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "creatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetResource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssetResource_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetDownload" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "resourceId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "failReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetDownload_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "AssetResource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetCategory_slug_key" ON "AssetCategory"("slug");

-- CreateIndex
CREATE INDEX "AssetCategory_type_idx" ON "AssetCategory"("type");

-- CreateIndex
CREATE INDEX "AssetCategory_sortOrder_idx" ON "AssetCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "AssetResource_categoryId_idx" ON "AssetResource"("categoryId");

-- CreateIndex
CREATE INDEX "AssetResource_type_idx" ON "AssetResource"("type");

-- CreateIndex
CREATE INDEX "AssetResource_status_idx" ON "AssetResource"("status");

-- CreateIndex
CREATE INDEX "AssetResource_isFeatured_idx" ON "AssetResource"("isFeatured");

-- CreateIndex
CREATE INDEX "AssetResource_sortOrder_idx" ON "AssetResource"("sortOrder");

-- CreateIndex
CREATE INDEX "AssetResource_createdAt_idx" ON "AssetResource"("createdAt");

-- CreateIndex
CREATE INDEX "AssetDownload_userId_idx" ON "AssetDownload"("userId");

-- CreateIndex
CREATE INDEX "AssetDownload_createdAt_idx" ON "AssetDownload"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssetDownload_resourceId_userId_key" ON "AssetDownload"("resourceId", "userId");
