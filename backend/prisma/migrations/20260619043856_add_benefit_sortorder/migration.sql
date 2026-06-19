-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Benefit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PRIVILEGE',
    "value" TEXT,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Benefit" ("code", "createdAt", "description", "id", "isActive", "minLevel", "name", "type", "updatedAt", "value") SELECT "code", "createdAt", "description", "id", "isActive", "minLevel", "name", "type", "updatedAt", "value" FROM "Benefit";
DROP TABLE "Benefit";
ALTER TABLE "new_Benefit" RENAME TO "Benefit";
CREATE UNIQUE INDEX "Benefit_code_key" ON "Benefit"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
