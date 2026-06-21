async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/overview', { preHandler: [fastify.adminOnly] }, async () => {
    const [totalRevenue, totalWithdrawn, pendingWithdrawals, pendingCount] = await Promise.all([
      prisma.creatorWallet.aggregate({ _sum: { totalRevenue: true } }),
      prisma.creatorWallet.aggregate({ _sum: { totalWithdrawn: true } }),
      prisma.withdrawalRequest.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true }
      }),
      prisma.withdrawalRequest.count({ where: { status: 'PENDING' } })
    ]);

    const creatorCount = await prisma.creatorWallet.count();

    return {
      stats: {
        totalRevenue: totalRevenue._sum.totalRevenue || 0,
        totalWithdrawn: totalWithdrawn._sum.totalWithdrawn || 0,
        pendingAmount: pendingWithdrawals._sum.amount || 0,
        pendingCount,
        creatorCount
      }
    };
  });

  fastify.get('/withdrawals', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { status, page = 1, limit = 20, keyword, sort = 'newest' } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;

    if (keyword) {
      where.OR = [
        { withdrawNo: { contains: keyword } },
        {
          user: {
            username: { contains: keyword }
          }
        }
      ];
    }

    let orderBy;
    switch (sort) {
      case 'amount-high':
        orderBy = { amount: 'desc' };
        break;
      case 'amount-low':
        orderBy = { amount: 'asc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          user: { select: { id: true, username: true, avatar: true, email: true } }
        }
      }),
      prisma.withdrawalRequest.count({ where })
    ]);

    return {
      withdrawals,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.get('/withdrawals/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const id = Number(request.params.id);
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatar: true, email: true } },
        reviewer: { select: { id: true, username: true, avatar: true } },
        auditLogs: {
          orderBy: { createdAt: 'asc' },
          include: {
            operator: { select: { id: true, username: true, avatar: true } }
          }
        }
      }
    });

    if (!withdrawal) {
      return reply.code(404).send({ error: '提现申请不存在' });
    }

    return { withdrawal };
  });

  fastify.post('/withdrawals/:id/approve', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const id = Number(request.params.id);
    const { remark, transactionNo } = request.body;
    const adminId = request.user.id;

    const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id } });

    if (!withdrawal) {
      return reply.code(404).send({ error: '提现申请不存在' });
    }

    if (withdrawal.status !== 'PENDING') {
      return reply.code(400).send({ error: '只能审核待审核的提现申请' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewerId: adminId,
          reviewedAt: new Date(),
          paidAt: new Date(),
          transactionNo,
          remark
        }
      });

      await tx.creatorWallet.update({
        where: { userId: withdrawal.userId },
        data: {
          pendingWithdraw: { decrement: withdrawal.amount },
          totalWithdrawn: { increment: withdrawal.amount }
        }
      });

      await tx.withdrawalAuditLog.create({
        data: {
          withdrawalId: id,
          action: 'APPROVE',
          fromStatus: 'PENDING',
          toStatus: 'APPROVED',
          remark: remark || '审核通过',
          operatorId: adminId
        }
      });

      await tx.message.create({
        data: {
          senderId: adminId,
          receiverId: withdrawal.userId,
          title: '💰 提现申请已通过',
          content: `您的提现申请（单号：${withdrawal.withdrawNo}，金额：¥${withdrawal.actualAmount}）已审核通过，请注意查收。`,
          type: 'FINANCE'
        }
      });

      return updated;
    });

    return { withdrawal: result, message: '提现审核已通过' };
  });

  fastify.post('/withdrawals/:id/reject', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const id = Number(request.params.id);
    const { rejectionReason } = request.body;
    const adminId = request.user.id;

    const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id } });

    if (!withdrawal) {
      return reply.code(404).send({ error: '提现申请不存在' });
    }

    if (withdrawal.status !== 'PENDING') {
      return reply.code(400).send({ error: '只能审核待审核的提现申请' });
    }

    if (!rejectionReason) {
      return reply.code(400).send({ error: '请填写驳回原因' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason,
          reviewerId: adminId,
          reviewedAt: new Date()
        }
      });

      await tx.creatorWallet.update({
        where: { userId: withdrawal.userId },
        data: {
          balance: { increment: withdrawal.amount },
          pendingWithdraw: { decrement: withdrawal.amount }
        }
      });

      await tx.withdrawalAuditLog.create({
        data: {
          withdrawalId: id,
          action: 'REJECT',
          fromStatus: 'PENDING',
          toStatus: 'REJECTED',
          remark: rejectionReason,
          operatorId: adminId
        }
      });

      await tx.message.create({
        data: {
          senderId: adminId,
          receiverId: withdrawal.userId,
          title: '💰 提现申请被驳回',
          content: `您的提现申请（单号：${withdrawal.withdrawNo}，金额：¥${withdrawal.amount}）被驳回。\n驳回原因：${rejectionReason}`,
          type: 'FINANCE'
        }
      });

      return updated;
    });

    return { withdrawal: result, message: '提现审核已驳回' };
  });

  fastify.get('/revenue-rules', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { type, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (type && type !== 'all') where.type = type;

    const [rules, total] = await Promise.all([
      prisma.revenueRule.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
      }),
      prisma.revenueRule.count({ where })
    ]);

    return {
      rules,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.post('/revenue-rules', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { name, code, description, type, rate, baseAmount, minAmount, maxAmount, level, sortOrder, isActive } = request.body;

    const rule = await prisma.revenueRule.create({
      data: {
        name,
        code,
        description,
        type,
        rate: Number(rate) || 0,
        baseAmount: Number(baseAmount) || 0,
        minAmount: Number(minAmount) || 0,
        maxAmount: maxAmount ? Number(maxAmount) : null,
        level: Number(level) || 1,
        sortOrder: Number(sortOrder) || 0,
        isActive: isActive !== false
      }
    });

    return { rule, message: '分成规则已创建' };
  });

  fastify.put('/revenue-rules/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const id = Number(request.params.id);
    const { name, code, description, type, rate, baseAmount, minAmount, maxAmount, level, sortOrder, isActive } = request.body;

    const existing = await prisma.revenueRule.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '分成规则不存在' });
    }

    const rule = await prisma.revenueRule.update({
      where: { id },
      data: {
        name,
        code,
        description,
        type,
        rate: rate !== undefined ? Number(rate) : undefined,
        baseAmount: baseAmount !== undefined ? Number(baseAmount) : undefined,
        minAmount: minAmount !== undefined ? Number(minAmount) : undefined,
        maxAmount: maxAmount !== undefined ? (maxAmount ? Number(maxAmount) : null) : undefined,
        level: level !== undefined ? Number(level) : undefined,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    return { rule, message: '分成规则已更新' };
  });

  fastify.delete('/revenue-rules/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const id = Number(request.params.id);

    const existing = await prisma.revenueRule.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '分成规则不存在' });
    }

    await prisma.revenueRule.delete({ where: { id } });

    return { message: '分成规则已删除' };
  });

  fastify.get('/revenue-records', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { type, sourceType, status, page = 1, limit = 20, keyword, userId } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (type && type !== 'all') where.type = type;
    if (sourceType && sourceType !== 'all') where.sourceType = sourceType;
    if (status && status !== 'all') where.status = status;
    if (userId) where.userId = Number(userId);

    if (keyword) {
      where.OR = [
        { sourceTitle: { contains: keyword } },
        { description: { contains: keyword } },
        {
          user: {
            username: { contains: keyword }
          }
        }
      ];
    }

    const [records, total] = await Promise.all([
      prisma.revenueRecord.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          rule: { select: { id: true, name: true, code: true } }
        }
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
}

module.exports = routes;
