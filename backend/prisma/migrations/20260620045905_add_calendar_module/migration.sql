-- CreateTable
CREATE TABLE "CreationCalendar" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL DEFAULT 'SCHEDULE',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "color" TEXT NOT NULL DEFAULT '#d4624a',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isAllDay" BOOLEAN NOT NULL DEFAULT true,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderMinutes" INTEGER NOT NULL DEFAULT 30,
    "linkType" TEXT,
    "linkId" INTEGER,
    "creatorId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreationCalendar_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarReminder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "calendarEventId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "remindAt" DATETIME NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalendarReminder_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CreationCalendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalendarReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarSubscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "calendarEventId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalendarSubscription_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CreationCalendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalendarSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CreationCalendar_creatorId_idx" ON "CreationCalendar"("creatorId");

-- CreateIndex
CREATE INDEX "CreationCalendar_startDate_idx" ON "CreationCalendar"("startDate");

-- CreateIndex
CREATE INDEX "CreationCalendar_eventType_idx" ON "CreationCalendar"("eventType");

-- CreateIndex
CREATE INDEX "CreationCalendar_status_idx" ON "CreationCalendar"("status");

-- CreateIndex
CREATE INDEX "CalendarReminder_userId_idx" ON "CalendarReminder"("userId");

-- CreateIndex
CREATE INDEX "CalendarReminder_remindAt_idx" ON "CalendarReminder"("remindAt");

-- CreateIndex
CREATE INDEX "CalendarReminder_isSent_idx" ON "CalendarReminder"("isSent");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarReminder_calendarEventId_userId_key" ON "CalendarReminder"("calendarEventId", "userId");

-- CreateIndex
CREATE INDEX "CalendarSubscription_userId_idx" ON "CalendarSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSubscription_calendarEventId_userId_key" ON "CalendarSubscription"("calendarEventId", "userId");
