const generateWithdrawNo = () => {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `WD${dateStr}${random}`;
};

async function routes(fastify, options) {
  const { prisma } = fastify;

  const getOrCreateWallet = async (userId) => {
    let wallet = await prisma.creatorWallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await prisma.creatorWallet.create({ data: { userId } });
    }
    return wallet;
  };

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = { userId: request.user.id };

    if (status && status !== 'all') where.status = status;

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
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

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request) => {
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          include: { operator: { select: { id: true, username: true, avatar: true } } }
        }
      }
    });

    if (!withdrawal || withdrawal.userId !== request.user.id) {
      return reply.code(404).send({ error: '提现申请不存在' });
    }

    return { withdrawal };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { amount, withdrawMethod, bankName, bankAccount, bankAccountName, alipayAccount, wechatAccount, remark } = request.body;
    const userId = request.user.id;

    if (!amount || amount <= 0) {
      return reply.code(400).send({ error: '提现金额必须大于0' });
    }

    const minWithdraw = 10;
    if (amount < minWithdraw) {
      return reply.code(400).send({ error: `最低提现金额为¥${minWithdraw}` });
    }

    if (!withdrawMethod) {
      return reply.code(400).send({ error: '请选择提现方式' });
    }

    if (withdrawMethod === 'BANK' && (!bankName || !bankAccount || !bankAccountName)) {
      return reply.code(400).send({ error: '请填写完整的银行卡信息' });
    }

    if (withdrawMethod === 'ALIPAY' && !alipayAccount) {
      return reply.code(400).send({ error: '请填写支付宝账号' });
    }

    if (withdrawMethod === 'WECHAT' && !wechatAccount) {
      return reply.code(400).send({ error: '请填写微信账号' });
    }

    const wallet = await getOrCreateWallet(userId);

    if (wallet.balance < amount) {
      return reply.code(400).send({ error: '余额不足' });
    }

    if (wallet.pendingWithdraw + amount > wallet.balance) {
      return reply.code(400).send({ error: '待审核提现金额已超出可用余额' });
    }

    const feeRate = 0.01;
    const fee = Math.round(amount * feeRate * 100) / 100;
    const actualAmount = Math.round((amount - fee) * 100) / 100;

    const result = await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          withdrawNo: generateWithdrawNo(),
          userId,
          amount: Number(amount),
          fee,
          actualAmount,
          withdrawMethod,
          bankName,
          bankAccount,
          bankAccountName,
          alipayAccount,
          wechatAccount,
          remark,
          status: 'PENDING'
        }
      });

      await tx.creatorWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: Number(amount) },
          pendingWithdraw: { increment: Number(amount) }
        }
      });

      await tx.withdrawalAuditLog.create({
        data: {
          withdrawalId: withdrawal.id,
          action: 'SUBMIT',
          fromStatus: null,
          toStatus: 'PENDING',
          remark: '用户提交提现申请',
          operatorId: userId
        }
      });

      await tx.message.create({
        data: {
          senderId: userId,
          receiverId: userId,
          title: '💰 提现申请已提交',
          content: `您已提交提现申请，等待财务审核。\n\n提现单号：${withdrawal.withdrawNo}\n提现金额：¥${withdrawal.amount}\n手续费：¥${withdrawal.fee}\n实际到账：¥${withdrawal.actualAmount}\n提现方式：${withdrawMethod === 'BANK' ? '银行卡' : withdrawMethod === 'ALIPAY' ? '支付宝' : '微信'}\n\n审核通过后将尽快为您处理打款。`,
          type: 'FINANCE'
        }
      });

      return withdrawal;
    });

    return { withdrawal: result, message: '提现申请已提交，等待审核' };
  });

  fastify.post('/:id/cancel', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const id = Number(request.params.id);
    const userId = request.user.id;

    const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id } });

    if (!withdrawal || withdrawal.userId !== userId) {
      return reply.code(404).send({ error: '提现申请不存在' });
    }

    if (withdrawal.status !== 'PENDING') {
      return reply.code(400).send({ error: '只能取消待审核的提现申请' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });

      await tx.creatorWallet.update({
        where: { userId },
        data: {
          balance: { increment: withdrawal.amount },
          pendingWithdraw: { decrement: withdrawal.amount }
        }
      });

      await tx.withdrawalAuditLog.create({
        data: {
          withdrawalId: id,
          action: 'CANCEL',
          fromStatus: 'PENDING',
          toStatus: 'CANCELLED',
          remark: '用户取消提现申请',
          operatorId: userId
        }
      });

      await tx.message.create({
        data: {
          senderId: userId,
          receiverId: userId,
          title: '💰 提现申请已取消',
          content: `您已取消提现申请。\n\n提现单号：${withdrawal.withdrawNo}\n提现金额：¥${withdrawal.amount}\n\n金额已退回至您的钱包余额。`,
          type: 'FINANCE'
        }
      });

      return updated;
    });

    return { withdrawal: result, message: '提现申请已取消' };
  });
}

module.exports = routes;
