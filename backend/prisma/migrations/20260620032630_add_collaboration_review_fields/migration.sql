-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Collaboration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "requirements" TEXT,
    "deliverables" TEXT,
    "compensation" TEXT,
    "deadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "reviewerId" INTEGER,
    "reviewedAt" DATETIME,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "creatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Collaboration_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Collaboration_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Collaboration" ("category", "compensation", "coverImage", "createdAt", "creatorId", "deadline", "deliverables", "description", "id", "isFeatured", "requirements", "sortOrder", "status", "tags", "title", "updatedAt", "viewCount") SELECT "category", "compensation", "coverImage", "createdAt", "creatorId", "deadline", "deliverables", "description", "id", "isFeatured", "requirements", "sortOrder", "status", "tags", "title", "updatedAt", "viewCount" FROM "Collaboration";
DROP TABLE "Collaboration";
ALTER TABLE "new_Collaboration" RENAME TO "Collaboration";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
