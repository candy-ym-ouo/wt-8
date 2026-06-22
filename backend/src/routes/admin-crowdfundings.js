function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const formatCrowdfunding = (c) => {
  if (!c) return c;
  return {
    ...c,
    tags: parseJSONField(c.tags, []),
    progress: c.targetAmount > 0 ? Math.min(100, Math.round((c.currentAmount / c.targetAmount) * 100)) : 0
  };
};

const formatTier = (t) => {
  if (!t) return t;
  return {
    ...t,
    perks: parseJSONField(t.perks, []),
    remainingStock: t.isUnlimited ? -1 : Math.max(0, t.stock - t.soldCount),
    isLowStock: !t.isUnlimited && t.stock > 0 && (t.stock - t.soldCount) > 0 && (t.stock - t.soldCount) <= 5
  };
};

const getOrderStatusText = (status) => {
  const map = {
    PENDING: '待支付',
    PAID: '已支付',
    SHIPPED: '已发货',
    DELIVERED: '已完成',
    CANCELLED: '已取消',
    REFUNDED: '已退款'
  };
  return map[status] || status;
};

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { status, category, page = 1, limit = 20, keyword } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all') where.category = category;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } }
      ];
    }

    const [crowdfundingsData, total] = await Promise.all([
      prisma.crowdfunding.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ createdAt: 'desc' }],
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          _count: { select: { tiers: true, orders: true } },
          reviewer: { select: { id: true, username: true } }
        }
      }),
      prisma.crowdfunding.count({ where })
    ]);

    const crowdfundings = crowdfundingsData.map(c => ({
      ...formatCrowdfunding(c),
      tierCount: c._count.tiers,
      orderCount: c._count.orders
    }));

    return { crowdfundings, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/stats', { preHandler: [fastify.adminOnly] }, async () => {
    const [total, published, pending, funded] = await Promise.all([
      prisma.crowdfunding.count(),
      prisma.crowdfunding.count({ where: { status: 'PUBLISHED' } }),
      prisma.crowdfunding.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.crowdfunding.count({ where: { status: 'SUCCESSFUL' } })
    ]);

    const totalAmount = await prisma.crowdfundingOrder.aggregate({
      where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
      _sum: { amount: true }
    });

    const totalBackers = await prisma.crowdfundingOrder.count({
      where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } }
    });

    const totalLikes = await prisma.crowdfundingLike.count();

    const hotStats = await prisma.crowdfunding.aggregate({
      where: { status: 'PUBLISHED' },
      _avg: { hotScore: true },
      _max: { hotScore: true }
    });

    return {
      total,
      published,
      pending,
      funded,
      totalAmount: totalAmount._sum.amount || 0,
      totalBackers,
      totalLikes,
      avgHotScore: Math.round((hotStats._avg.hotScore || 0) * 100) / 100,
      maxHotScore: Math.round((hotStats._max.hotScore || 0) * 100) / 100
    };
  });

  fastify.post('/:id/publish', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const crowdfunding = await prisma.crowdfunding.findUnique({ where: { id: Number(id) } });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    const updated = await prisma.crowdfunding.update({
      where: { id: Number(id) },
      data: {
        status: 'PUBLISHED',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    if (crowdfunding.status === 'PENDING_REVIEW') {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: crowdfunding.creatorId,
          title: '🎉 众筹项目已审核通过',
          content: `恭喜！您的众筹项目《${crowdfunding.title}》已通过审核并成功发布！\n\n目标金额：¥${crowdfunding.targetAmount}\n\n现在支持者可以浏览并支持您的项目了。`,
          type: 'CROWDFUNDING'
        }
      });
    }

    return { crowdfunding: formatCrowdfunding(updated), message: '发布成功' };
  });

  fastify.post('/:id/reject', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const { reason } = request.body;
    const crowdfunding = await prisma.crowdfunding.findUnique({ where: { id: Number(id) } });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    const updated = await prisma.crowdfunding.update({
      where: { id: Number(id) },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || '未通过审核',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: crowdfunding.creatorId,
        title: '众筹项目未通过审核',
        content: `很遗憾，您的众筹项目《${crowdfunding.title}》未通过审核。\n\n${reason ? '原因：' + reason + '\n\n' : ''}您可以根据审核意见修改后重新提交。`,
        type: 'CROWDFUNDING'
      }
    });

    return { crowdfunding: formatCrowdfunding(updated), message: '已驳回' };
  });

  fastify.post('/:id/feature', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const crowdfunding = await prisma.crowdfunding.findUnique({ where: { id: Number(id) } });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    const updated = await prisma.crowdfunding.update({
      where: { id: Number(id) },
      data: { isFeatured: !crowdfunding.isFeatured }
    });

    return {
      crowdfunding: formatCrowdfunding(updated),
      message: updated.isFeatured ? '已设为精选' : '已取消精选'
    };
  });

  fastify.delete('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const crowdfunding = await prisma.crowdfunding.findUnique({ where: { id: Number(id) } });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    await prisma.crowdfundingOrder.deleteMany({ where: { crowdfundingId: Number(id) } });
    await prisma.crowdfundingTier.deleteMany({ where: { crowdfundingId: Number(id) } });
    await prisma.crowdfunding.delete({ where: { id: Number(id) } });

    return { message: '删除成功' };
  });

  fastify.get('/orders', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { status, crowdfundingId, page = 1, limit = 20, keyword } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;
    if (crowdfundingId) where.crowdfundingId = Number(crowdfundingId);
    if (keyword) {
      where.OR = [
        { orderNo: { contains: keyword } },
        { receiverName: { contains: keyword } },
        { receiverPhone: { contains: keyword } }
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.crowdfundingOrder.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          crowdfunding: { select: { id: true, title: true } },
          tier: { select: { id: true, name: true } },
          user: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.crowdfundingOrder.count({ where })
    ]);

    const formattedOrders = orders.map(o => ({
      ...o,
      statusText: getOrderStatusText(o.status),
      tier: formatTier(o.tier)
    }));

    return { orders: formattedOrders, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/orders/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const order = await prisma.crowdfundingOrder.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        crowdfunding: {
          select: {
            id: true, title: true, coverImage: true,
            creator: { select: { id: true, username: true, avatar: true } }
          }
        },
        tier: true,
        user: { select: { id: true, username: true, avatar: true, email: true } }
      }
    });

    if (!order) {
      return reply.code(404).send({ error: '订单不存在' });
    }

    return {
      order: {
        ...order,
        tier: formatTier(order.tier),
        statusText: getOrderStatusText(order.status)
      }
    };
  });

  fastify.put('/orders/:id/ship', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const { trackingNumber } = request.body;

    const order = await prisma.crowdfundingOrder.findUnique({
      where: { id: Number(id) },
      include: { crowdfunding: true }
    });

    if (!order) {
      return reply.code(404).send({ error: '订单不存在' });
    }

    if (order.status !== 'PAID') {
      return reply.code(400).send({ error: '订单状态不正确' });
    }

    const updated = await prisma.crowdfundingOrder.update({
      where: { id: Number(id) },
      data: {
        status: 'SHIPPED',
        shippedAt: new Date(),
        trackingNumber: trackingNumber || null
      },
      include: { tier: true }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: order.userId,
        title: '📦 您的订单已发货',
        content: `您支持的众筹项目《${order.crowdfunding.title}》已发货！\n\n订单号：${order.orderNo}\n${trackingNumber ? '物流单号：' + trackingNumber + '\n' : ''}\n请留意查收。`,
        type: 'CROWDFUNDING'
      }
    });

    return {
      order: {
        ...updated,
        tier: formatTier(updated.tier),
        statusText: getOrderStatusText(updated.status)
      },
      message: '已发货'
    };
  });

  fastify.put('/orders/:id/deliver', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;

    const order = await prisma.crowdfundingOrder.findUnique({
      where: { id: Number(id) },
      include: { crowdfunding: true }
    });

    if (!order) {
      return reply.code(404).send({ error: '订单不存在' });
    }

    if (order.status !== 'SHIPPED') {
      return reply.code(400).send({ error: '订单状态不正确' });
    }

    const updated = await prisma.crowdfundingOrder.update({
      where: { id: Number(id) },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date()
      },
      include: { tier: true }
    });

    return {
      order: {
        ...updated,
        tier: formatTier(updated.tier),
        statusText: getOrderStatusText(updated.status)
      },
      message: '已确认收货'
    };
  });

  fastify.put('/orders/:id/refund', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const { reason } = request.body;

    const order = await prisma.crowdfundingOrder.findUnique({
      where: { id: Number(id) },
      include: { crowdfunding: true, tier: true }
    });

    if (!order) {
      return reply.code(404).send({ error: '订单不存在' });
    }

    if (!['PAID', 'SHIPPED'].includes(order.status)) {
      return reply.code(400).send({ error: '订单状态不正确' });
    }

    const updated = await prisma.crowdfundingOrder.update({
      where: { id: Number(id) },
      data: {
        status: 'REFUNDED',
        cancelReason: reason || null
      },
      include: { tier: true }
    });

    await prisma.crowdfundingTier.update({
      where: { id: order.tierId },
      data: {
        soldCount: { decrement: order.quantity }
      }
    });

    await prisma.crowdfunding.update({
      where: { id: order.crowdfundingId },
      data: {
        currentAmount: { decrement: order.amount },
        backerCount: { decrement: 1 }
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: order.userId,
        title: '💰 订单已退款',
        content: `您支持的众筹项目《${order.crowdfunding.title}》订单已退款。\n\n订单号：${order.orderNo}\n退款金额：¥${order.amount}\n${reason ? '原因：' + reason : ''}\n\n退款将在1-7个工作日内原路返回。`,
        type: 'CROWDFUNDING'
      }
    });

    return {
      order: {
        ...updated,
        tier: formatTier(updated.tier),
        statusText: getOrderStatusText(updated.status)
      },
      message: '已退款'
    };
  });
}

module.exports = routes;
