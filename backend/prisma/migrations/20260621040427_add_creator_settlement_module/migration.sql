-- CreateTable
CREATE TABLE "CreatorWallet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "frozenAmount" REAL NOT NULL DEFAULT 0,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "totalWithdrawn" REAL NOT NULL DEFAULT 0,
    "pendingWithdraw" REAL NOT NULL DEFAULT 0,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankAccountName" TEXT,
    "alipayAccount" TEXT,
    "wechatAccount" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreatorWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RevenueRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" INTEGER,
    "sourceTitle" TEXT,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SETTLED',
    "ruleId" INTEGER,
    "orderNo" TEXT,
    "settleDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RevenueRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RevenueRecord_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RevenueRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RevenueRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "rate" REAL NOT NULL DEFAULT 0,
    "baseAmount" REAL NOT NULL DEFAULT 0,
    "minAmount" REAL NOT NULL DEFAULT 0,
    "maxAmount" REAL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "withdrawNo" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "fee" REAL NOT NULL DEFAULT 0,
    "actualAmount" REAL NOT NULL,
    "withdrawMethod" TEXT NOT NULL,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankAccountName" TEXT,
    "alipayAccount" TEXT,
    "wechatAccount" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewerId" INTEGER,
    "reviewedAt" DATETIME,
    "paidAt" DATETIME,
    "transactionNo" TEXT,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WithdrawalRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WithdrawalAuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "withdrawalId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "remark" TEXT,
    "operatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WithdrawalAuditLog_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "WithdrawalRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WithdrawalAuditLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorWallet_userId_key" ON "CreatorWallet"("userId");

-- CreateIndex
CREATE INDEX "CreatorWallet_userId_idx" ON "CreatorWallet"("userId");

-- CreateIndex
CREATE INDEX "RevenueRecord_userId_idx" ON "RevenueRecord"("userId");

-- CreateIndex
CREATE INDEX "RevenueRecord_type_idx" ON "RevenueRecord"("type");

-- CreateIndex
CREATE INDEX "RevenueRecord_sourceType_sourceId_idx" ON "RevenueRecord"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "RevenueRecord_status_idx" ON "RevenueRecord"("status");

-- CreateIndex
CREATE INDEX "RevenueRecord_createdAt_idx" ON "RevenueRecord"("createdAt");

-- CreateIndex
CREATE INDEX "RevenueRecord_settleDate_idx" ON "RevenueRecord"("settleDate");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueRule_code_key" ON "RevenueRule"("code");

-- CreateIndex
CREATE INDEX "RevenueRule_type_idx" ON "RevenueRule"("type");

-- CreateIndex
CREATE INDEX "RevenueRule_isActive_idx" ON "RevenueRule"("isActive");

-- CreateIndex
CREATE INDEX "RevenueRule_sortOrder_idx" ON "RevenueRule"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalRequest_withdrawNo_key" ON "WithdrawalRequest"("withdrawNo");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_userId_idx" ON "WithdrawalRequest"("userId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_createdAt_idx" ON "WithdrawalRequest"("createdAt");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_reviewedAt_idx" ON "WithdrawalRequest"("reviewedAt");

-- CreateIndex
CREATE INDEX "WithdrawalAuditLog_withdrawalId_idx" ON "WithdrawalAuditLog"("withdrawalId");

-- CreateIndex
CREATE INDEX "WithdrawalAuditLog_operatorId_idx" ON "WithdrawalAuditLog"("operatorId");

-- CreateIndex
CREATE INDEX "WithdrawalAuditLog_action_idx" ON "WithdrawalAuditLog"("action");

-- CreateIndex
CREATE INDEX "WithdrawalAuditLog_createdAt_idx" ON "WithdrawalAuditLog"("createdAt");
