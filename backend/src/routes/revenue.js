async function routes(fastify, options) {
  const { prisma } = fastify;

  const getOrCreateWallet = async (userId) => {
    let wallet = await prisma.creatorWallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await prisma.creatorWallet.create({
        data: { userId }
      });
    }
    return wallet;
  };

  fastify.get('/wallet', { preHandler: [fastify.authenticate] }, async (request) => {
    const wallet = await getOrCreateWallet(request.user.id);
    return { wallet };
  });

  fastify.put('/wallet/bank-info', { preHandler: [fastify.authenticate] }, async (request) => {
    const { bankName, bankAccount, bankAccountName, alipayAccount, wechatAccount } = request.body;
    const wallet = await getOrCreateWallet(request.user.id);
    const updated = await prisma.creatorWallet.update({
      where: { id: wallet.id },
      data: { bankName, bankAccount, bankAccountName, alipayAccount, wechatAccount }
    });
    return { wallet: updated, message: '收款信息已更新' };
  });

  fastify.get('/records', { preHandler: [fastify.authenticate] }, async (request) => {
    const { type, sourceType, status, page = 1, limit = 20, startDate, endDate } = request.query;
    const skip = (page - 1) * limit;
    const where = { userId: request.user.id };

    if (type && type !== 'all') where.type = type;
    if (sourceType && sourceType !== 'all') where.sourceType = sourceType;
    if (status && status !== 'all') where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      prisma.revenueRecord.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { rule: { select: { id: true, name: true, code: true } } }
      }),
      prisma.revenueRecord.count({ where })
    ]);

    const totalAmount = await prisma.revenueRecord.aggregate({
      where,
      _sum: { amount: true }
    });

    return {
      records,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      totalAmount: totalAmount._sum.amount || 0
    };
  });

  fastify.get('/records/summary', { preHandler: [fastify.authenticate] }, async (request) => {
    const { period = 'month' } = request.query;
    const userId = request.user.id;

    const now = new Date();
    let startDate;

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const where = {
      userId,
      status: 'SETTLED',
      createdAt: { gte: startDate }
    };

    const [totalEarnings, typeBreakdown] = await Promise.all([
      prisma.revenueRecord.aggregate({
        where,
        _sum: { amount: true }
      }),
      prisma.revenueRecord.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
        _count: true
      })
    ]);

    return {
      period,
      totalEarnings: totalEarnings._sum.amount || 0,
      startDate,
      typeBreakdown: typeBreakdown.map(t => ({
        type: t.type,
        amount: t._sum.amount || 0,
        count: t._count
      }))
    };
  });

  fastify.get('/rules', { preHandler: [fastify.authenticate] }, async () => {
    const rules = await prisma.revenueRule.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    });
    return { rules };
  });

  fastify.post('/records/test-add', { preHandler: [fastify.authenticate] }, async (request) => {
    const { amount, type, sourceType, sourceTitle, description } = request.body;
    const userId = request.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await getOrCreateWallet(userId);
      const record = await tx.revenueRecord.create({
        data: {
          userId,
          type: type || 'SALE',
          sourceType: sourceType || 'ZINE',
          sourceTitle: sourceTitle || '测试收益',
          amount: Number(amount) || 0,
          description: description || '',
          status: 'SETTLED',
          settleDate: new Date()
        }
      });

      await tx.creatorWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: Number(amount) || 0 },
          totalRevenue: { increment: Number(amount) || 0 }
        }
      });

      return record;
    });

    return { record: result, message: '测试收益已添加' };
  });
}

module.exports = routes;
