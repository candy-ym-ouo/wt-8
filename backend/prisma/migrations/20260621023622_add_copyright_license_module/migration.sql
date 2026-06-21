-- CreateTable
CREATE TABLE "CopyrightLicense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "licenseNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "workId" INTEGER NOT NULL,
    "workType" TEXT NOT NULL,
    "workTitle" TEXT NOT NULL,
    "workCoverImage" TEXT,
    "purposeCategory" TEXT NOT NULL DEFAULT 'OTHER',
    "purposeDetail" TEXT NOT NULL,
    "usageScope" TEXT NOT NULL DEFAULT 'PERSONAL',
    "useRegions" TEXT NOT NULL DEFAULT '[]',
    "commercialUse" BOOLEAN NOT NULL DEFAULT false,
    "derivativeAllowed" BOOLEAN NOT NULL DEFAULT false,
    "distributeAllowed" BOOLEAN NOT NULL DEFAULT false,
    "attributionRequired" BOOLEAN NOT NULL DEFAULT true,
    "licenseType" TEXT NOT NULL DEFAULT 'STANDARD',
    "licenseFee" REAL NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "durationDays" INTEGER NOT NULL DEFAULT 0,
    "applicantId" INTEGER NOT NULL,
    "applicantContact" TEXT,
    "applicantCompany" TEXT,
    "authorId" INTEGER NOT NULL,
    "authorConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "authorConfirmedAt" DATETIME,
    "authorConfirmRemark" TEXT,
    "authorAskedPrice" REAL,
    "authorContractTerms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "reviewerId" INTEGER,
    "reviewedAt" DATETIME,
    "reviewRemark" TEXT,
    "contractContent" TEXT,
    "contractFile" TEXT,
    "contractSigned" BOOLEAN NOT NULL DEFAULT false,
    "contractSignedAt" DATETIME,
    "attachments" TEXT NOT NULL DEFAULT '[]',
    "viewedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CopyrightLicense_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CopyrightLicense_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CopyrightLicense_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CopyrightLicenseLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "licenseId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "detail" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "operatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CopyrightLicenseLog_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "CopyrightLicense" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CopyrightLicenseLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CopyrightLicense_licenseNo_key" ON "CopyrightLicense"("licenseNo");

-- CreateIndex
CREATE INDEX "CopyrightLicense_applicantId_idx" ON "CopyrightLicense"("applicantId");

-- CreateIndex
CREATE INDEX "CopyrightLicense_authorId_idx" ON "CopyrightLicense"("authorId");

-- CreateIndex
CREATE INDEX "CopyrightLicense_status_idx" ON "CopyrightLicense"("status");

-- CreateIndex
CREATE INDEX "CopyrightLicense_workType_workId_idx" ON "CopyrightLicense"("workType", "workId");

-- CreateIndex
CREATE INDEX "CopyrightLicense_createdAt_idx" ON "CopyrightLicense"("createdAt");

-- CreateIndex
CREATE INDEX "CopyrightLicense_licenseType_idx" ON "CopyrightLicense"("licenseType");

-- CreateIndex
CREATE INDEX "CopyrightLicenseLog_licenseId_idx" ON "CopyrightLicenseLog"("licenseId");

-- CreateIndex
CREATE INDEX "CopyrightLicenseLog_operatorId_idx" ON "CopyrightLicenseLog"("operatorId");

-- CreateIndex
CREATE INDEX "CopyrightLicenseLog_action_idx" ON "CopyrightLicenseLog"("action");

-- CreateIndex
CREATE INDEX "CopyrightLicenseLog_createdAt_idx" ON "CopyrightLicenseLog"("createdAt");
