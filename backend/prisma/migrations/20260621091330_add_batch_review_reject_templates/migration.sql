-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RejectTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "creatorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RejectTemplate_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RejectTemplate" ("category", "content", "createdAt", "creatorId", "id", "isActive", "isGlobal", "sortOrder", "title", "updatedAt", "usageCount") SELECT "category", "content", "createdAt", "creatorId", "id", "isActive", "isGlobal", "sortOrder", "title", "updatedAt", "usageCount" FROM "RejectTemplate";
DROP TABLE "RejectTemplate";
ALTER TABLE "new_RejectTemplate" RENAME TO "RejectTemplate";
CREATE INDEX "RejectTemplate_category_idx" ON "RejectTemplate"("category");
CREATE INDEX "RejectTemplate_isActive_idx" ON "RejectTemplate"("isActive");
CREATE INDEX "RejectTemplate_isGlobal_idx" ON "RejectTemplate"("isGlobal");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
