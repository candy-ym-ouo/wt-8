-- CreateTable
CREATE TABLE "ZineComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zineId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" INTEGER,
    "replyToUserId" INTEGER,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ZineComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ZineComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ZineComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ZineComment_replyToUserId_fkey" FOREIGN KEY ("replyToUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ZineComment_zineId_fkey" FOREIGN KEY ("zineId") REFERENCES "Zine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ZineCommentLike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "commentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ZineCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ZineComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ZineCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Zine_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Zine" ("authorId", "category", "content", "coverImage", "createdAt", "description", "id", "likes", "status", "tags", "title", "updatedAt", "views") SELECT "authorId", "category", "content", "coverImage", "createdAt", "description", "id", "likes", "status", "tags", "title", "updatedAt", "views" FROM "Zine";
DROP TABLE "Zine";
ALTER TABLE "new_Zine" RENAME TO "Zine";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ZineComment_zineId_idx" ON "ZineComment"("zineId");

-- CreateIndex
CREATE INDEX "ZineComment_userId_idx" ON "ZineComment"("userId");

-- CreateIndex
CREATE INDEX "ZineComment_parentId_idx" ON "ZineComment"("parentId");

-- CreateIndex
CREATE INDEX "ZineComment_status_idx" ON "ZineComment"("status");

-- CreateIndex
CREATE INDEX "ZineComment_createdAt_idx" ON "ZineComment"("createdAt");

-- CreateIndex
CREATE INDEX "ZineCommentLike_commentId_idx" ON "ZineCommentLike"("commentId");

-- CreateIndex
CREATE INDEX "ZineCommentLike_userId_idx" ON "ZineCommentLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ZineCommentLike_commentId_userId_key" ON "ZineCommentLike"("commentId", "userId");
