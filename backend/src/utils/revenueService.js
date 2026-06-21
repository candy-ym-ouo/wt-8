const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getOrCreateWallet = async (userId, tx = prisma) => {
  let wallet = await tx.creatorWallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await tx.creatorWallet.create({ data: { userId } });
  }
  return wallet;
};

const getActiveRule = async (type, tx = prisma) => {
  return await tx.revenueRule.findFirst({
    where: { type, isActive: true },
    orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }]
  });
};

const calculateRevenue = async (type, grossAmount, tx = prisma) => {
  const rule = await getActiveRule(type, tx);
  let rate = 0.7;
  let ruleId = null;
  let baseAmount = 0;

  if (rule) {
    rate = rule.rate;
    ruleId = rule.id;
    baseAmount = rule.baseAmount || 0;
    if (rule.minAmount && grossAmount < rule.minAmount) {
      return { amount: 0, rate: 0, ruleId: null, baseAmount: 0 };
    }
    if (rule.maxAmount && grossAmount > rule.maxAmount) {
      grossAmount = rule.maxAmount;
    }
  }

  const creatorAmount = baseAmount + grossAmount * rate;
  return {
    amount: Math.round(creatorAmount * 100) / 100,
    rate,
    ruleId,
    baseAmount
  };
};

const addRevenue = async (
  userId,
  type,
  grossAmount,
  sourceType,
  sourceId,
  sourceTitle,
  description,
  orderNo,
  tx = prisma
) => {
  const { amount, rate, ruleId } = await calculateRevenue(type, grossAmount, tx);

  if (amount <= 0) {
    return null;
  }

  const wallet = await getOrCreateWallet(userId, tx);

  const record = await tx.revenueRecord.create({
    data: {
      userId,
      type,
      sourceType,
      sourceId,
      sourceTitle,
      amount,
      description,
      status: 'SETTLED',
      ruleId,
      orderNo,
      settleDate: new Date()
    }
  });

  await tx.creatorWallet.update({
    where: { id: wallet.id },
    data: {
      balance: { increment: amount },
      totalRevenue: { increment: amount }
    }
  });

  await tx.message.create({
    data: {
      senderId: 1,
      receiverId: userId,
      title: '💰 收益到账',
      content: `您有一笔新的收益已到账！\n\n来源：${sourceTitle || sourceType}\n金额：¥${amount}\n${description ? `说明：${description}` : ''}\n\n您可以在「创作收益」中查看详情。`,
      type: 'FINANCE'
    }
  });

  return record;
};

module.exports = {
  getOrCreateWallet,
  getActiveRule,
  calculateRevenue,
  addRevenue
};
