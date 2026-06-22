-- CreateTable
CREATE TABLE "ZineLike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zineId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ZineLike_zineId_fkey" FOREIGN KEY ("zineId") REFERENCES "Zine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ZineLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Zine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "hotScore" REAL NOT NULL DEFAULT 0,
    "hotScoreUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Zine_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Zine" ("authorId", "category", "commentCount", "content", "coverImage", "createdAt", "description", "id", "likes", "status", "tags", "title", "updatedAt", "views") SELECT "authorId", "category", "commentCount", "content", "coverImage", "createdAt", "description", "id", "likes", "status", "tags", "title", "updatedAt", "views" FROM "Zine";
DROP TABLE "Zine";
ALTER TABLE "new_Zine" RENAME TO "Zine";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ZineLike_zineId_idx" ON "ZineLike"("zineId");

-- CreateIndex
CREATE INDEX "ZineLike_userId_idx" ON "ZineLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ZineLike_zineId_userId_key" ON "ZineLike"("zineId", "userId");
