-- CreateTable
CREATE TABLE "ReadingBook" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "coverImage" TEXT,
    "isbn" TEXT,
    "publisher" TEXT,
    "publishDate" DATETIME,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReadingCheckIn" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "bookId" INTEGER,
    "bookTitle" TEXT NOT NULL,
    "bookAuthor" TEXT,
    "pagesRead" INTEGER NOT NULL DEFAULT 0,
    "minutesRead" INTEGER NOT NULL DEFAULT 0,
    "mood" TEXT NOT NULL DEFAULT 'HAPPY',
    "note" TEXT,
    "checkInDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReadingCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReadingCheckIn_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ReadingBook" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadingCheckInLike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "checkInId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadingCheckInLike_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "ReadingCheckIn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReadingCheckInLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadingCheckInComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "checkInId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReadingCheckInComment_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "ReadingCheckIn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReadingCheckInComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadingReview" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "bookId" INTEGER,
    "bookTitle" TEXT NOT NULL,
    "bookAuthor" TEXT,
    "coverImage" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "rejectionReason" TEXT,
    "reviewerId" INTEGER,
    "reviewedAt" DATETIME,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReadingReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReadingReview_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ReadingBook" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadingReviewLike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reviewId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadingReviewLike_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ReadingReview" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReadingReviewLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadingReviewComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reviewId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReadingReviewComment_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ReadingReview" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReadingReviewComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadingStreak" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalCheckIns" INTEGER NOT NULL DEFAULT 0,
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "lastCheckInDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReadingStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeaturedReadingReview" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reviewId" INTEGER NOT NULL,
    "bannerImage" TEXT,
    "bannerTitle" TEXT,
    "bannerSubtitle" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeaturedReadingReview_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ReadingReview" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReadingBook_title_idx" ON "ReadingBook"("title");

-- CreateIndex
CREATE INDEX "ReadingBook_category_idx" ON "ReadingBook"("category");

-- CreateIndex
CREATE INDEX "ReadingCheckIn_userId_idx" ON "ReadingCheckIn"("userId");

-- CreateIndex
CREATE INDEX "ReadingCheckIn_checkInDate_idx" ON "ReadingCheckIn"("checkInDate");

-- CreateIndex
CREATE INDEX "ReadingCheckIn_isPublic_idx" ON "ReadingCheckIn"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingCheckIn_userId_checkInDate_key" ON "ReadingCheckIn"("userId", "checkInDate");

-- CreateIndex
CREATE INDEX "ReadingCheckInLike_userId_idx" ON "ReadingCheckInLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingCheckInLike_checkInId_userId_key" ON "ReadingCheckInLike"("checkInId", "userId");

-- CreateIndex
CREATE INDEX "ReadingCheckInComment_checkInId_idx" ON "ReadingCheckInComment"("checkInId");

-- CreateIndex
CREATE INDEX "ReadingCheckInComment_status_idx" ON "ReadingCheckInComment"("status");

-- CreateIndex
CREATE INDEX "ReadingReview_userId_idx" ON "ReadingReview"("userId");

-- CreateIndex
CREATE INDEX "ReadingReview_status_idx" ON "ReadingReview"("status");

-- CreateIndex
CREATE INDEX "ReadingReview_category_idx" ON "ReadingReview"("category");

-- CreateIndex
CREATE INDEX "ReadingReview_createdAt_idx" ON "ReadingReview"("createdAt");

-- CreateIndex
CREATE INDEX "ReadingReviewLike_userId_idx" ON "ReadingReviewLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingReviewLike_reviewId_userId_key" ON "ReadingReviewLike"("reviewId", "userId");

-- CreateIndex
CREATE INDEX "ReadingReviewComment_reviewId_idx" ON "ReadingReviewComment"("reviewId");

-- CreateIndex
CREATE INDEX "ReadingReviewComment_status_idx" ON "ReadingReviewComment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingStreak_userId_key" ON "ReadingStreak"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedReadingReview_reviewId_key" ON "FeaturedReadingReview"("reviewId");
