-- CreateTable
CREATE TABLE "AuthorSubscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "notifyNew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthorSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuthorSubscription_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthorActivity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "authorId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "coverImage" TEXT,
    "linkType" TEXT,
    "linkId" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthorActivity_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "zineId" INTEGER NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'FREE',
    "notifySeriesUpdate" BOOLEAN NOT NULL DEFAULT true,
    "notifyAuthorActivity" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_zineId_fkey" FOREIGN KEY ("zineId") REFERENCES "Zine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("createdAt", "id", "userId", "zineId") SELECT "createdAt", "id", "userId", "zineId" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE UNIQUE INDEX "Subscription_userId_zineId_key" ON "Subscription"("userId", "zineId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AuthorSubscription_userId_idx" ON "AuthorSubscription"("userId");

-- CreateIndex
CREATE INDEX "AuthorSubscription_authorId_idx" ON "AuthorSubscription"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorSubscription_userId_authorId_key" ON "AuthorSubscription"("userId", "authorId");

-- CreateIndex
CREATE INDEX "AuthorActivity_authorId_idx" ON "AuthorActivity"("authorId");

-- CreateIndex
CREATE INDEX "AuthorActivity_type_idx" ON "AuthorActivity"("type");

-- CreateIndex
CREATE INDEX "AuthorActivity_createdAt_idx" ON "AuthorActivity"("createdAt");

-- CreateIndex
CREATE INDEX "AuthorActivity_isPublic_idx" ON "AuthorActivity"("isPublic");
