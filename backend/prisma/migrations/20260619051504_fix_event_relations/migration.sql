-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventCheckIn" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventId" INTEGER NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "checkInTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkInType" TEXT NOT NULL DEFAULT 'QRCODE',
    "operatorId" INTEGER,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventCheckIn_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventCheckIn_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventCheckIn_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EventCheckIn" ("checkInTime", "checkInType", "createdAt", "eventId", "id", "operatorId", "registrationId", "remark", "userId") SELECT "checkInTime", "checkInType", "createdAt", "eventId", "id", "operatorId", "registrationId", "remark", "userId" FROM "EventCheckIn";
DROP TABLE "EventCheckIn";
ALTER TABLE "new_EventCheckIn" RENAME TO "EventCheckIn";
CREATE UNIQUE INDEX "EventCheckIn_registrationId_key" ON "EventCheckIn"("registrationId");
CREATE UNIQUE INDEX "EventCheckIn_eventId_registrationId_key" ON "EventCheckIn"("eventId", "registrationId");
CREATE TABLE "new_EventRegistration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "company" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewerId" INTEGER,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventRegistration_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EventRegistration" ("company", "createdAt", "email", "eventId", "id", "name", "note", "phone", "rejectionReason", "reviewedAt", "reviewerId", "status", "updatedAt", "userId") SELECT "company", "createdAt", "email", "eventId", "id", "name", "note", "phone", "rejectionReason", "reviewedAt", "reviewerId", "status", "updatedAt", "userId" FROM "EventRegistration";
DROP TABLE "EventRegistration";
ALTER TABLE "new_EventRegistration" RENAME TO "EventRegistration";
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
