function generateOrderNo() {
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CF${timestamp}${random}`;
}

function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

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

  fastify.get('/mine', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = { userId: request.user.id };

    if (status && status !== 'all') where.status = status;

    const [orders, total] = await Promise.all([
      prisma.crowdfundingOrder.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          crowdfunding: {
            select: { id: true, title: true, coverImage: true, status: true }
          },
          tier: true
        }
      }),
      prisma.crowdfundingOrder.count({ where })
    ]);

    const formattedOrders = orders.map(o => ({
      ...o,
      tier: formatTier(o.tier),
      statusText: getOrderStatusText(o.status)
    }));

    return { orders: formattedOrders, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const order = await prisma.crowdfundingOrder.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        crowdfunding: {
          select: {
            id: true, title: true, coverImage: true, description: true,
            creator: { select: { id: true, username: true, avatar: true } }
          }
        },
        tier: true,
        user: { select: { id: true, username: true, avatar: true } }
      }
    });

    if (!order) {
      return reply.code(404).send({ error: '订单不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = order.userId === request.user.id;
    const isCreator = order.crowdfunding.creator.id === request.user.id;

    if (!isAdmin && !isOwner && !isCreator) {
      return reply.code(403).send({ error: '无权查看此订单' });
    }

    return {
      order: {
        ...order,
        tier: formatTier(order.tier),
        statusText: getOrderStatusText(order.status)
      }
    };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { crowdfundingId, tierId, quantity = 1, receiverName, receiverPhone, receiverAddress, remark } = request.body;

    if (!crowdfundingId || !tierId) {
      return reply.code(400).send({ error: '请选择众筹项目和档位' });
    }

    const crowdfunding = await prisma.crowdfunding.findUnique({
      where: { id: Number(crowdfundingId) }
    });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    if (crowdfunding.status !== 'PUBLISHED') {
      return reply.code(400).send({ error: '该众筹项目不可支持' });
    }

    if (crowdfunding.deadline && new Date(crowdfunding.deadline) < new Date()) {
      return reply.code(400).send({ error: '众筹已结束' });
    }

    const tier = await prisma.crowdfundingTier.findUnique({
      where: { id: Number(tierId) }
    });

    if (!tier || tier.crowdfundingId !== Number(crowdfundingId)) {
      return reply.code(404).send({ error: '档位不存在' });
    }

    if (!tier.isUnlimited && tier.soldCount + quantity > tier.stock) {
      return reply.code(400).send({ error: '库存不足' });
    }

    const existingOrder = await prisma.crowdfundingOrder.findFirst({
      where: {
        crowdfundingId: Number(crowdfundingId),
        userId: request.user.id,
        status: { in: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'] }
      }
    });

    if (existingOrder) {
      return reply.code(400).send({ error: '您已支持过该众筹项目，每人仅可支持一次' });
    }

    const orderNo = generateOrderNo();
    const amount = tier.price * quantity;

    const order = await prisma.crowdfundingOrder.create({
      data: {
        orderNo,
        crowdfundingId: Number(crowdfundingId),
        tierId: Number(tierId),
        userId: request.user.id,
        amount,
        quantity,
        receiverName: receiverName || null,
        receiverPhone: receiverPhone || null,
        receiverAddress: receiverAddress || null,
        remark: remark || null,
        status: 'PENDING'
      }
    });

    return { order: { ...order, statusText: getOrderStatusText(order.status) }, message: '订单创建成功' };
  });

  fastify.post('/:id/pay', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;

    const order = await prisma.crowdfundingOrder.findUnique({
      where: { id: Number(id) },
      include: {
        crowdfunding: true,
        tier: true
      }
    });

    if (!order) {
      return reply.code(404).send({ error: '订单不存在' });
    }

    if (order.userId !== request.user.id) {
      return reply.code(403).send({ error: '无权操作此订单' });
    }

    if (order.status !== 'PENDING') {
      return reply.code(400).send({ error: '订单状态不正确' });
    }

    const tier = order.tier;
    if (!tier.isUnlimited && tier.soldCount + order.quantity > tier.stock) {
      return reply.code(400).send({ error: '库存不足' });
    }

    const updatedOrder = await prisma.crowdfundingOrder.update({
      where: { id: Number(id) },
      data: {
        status: 'PAID',
        paidAt: new Date()
      },
      include: {
        crowdfunding: true,
        tier: true
      }
    });

    await prisma.crowdfundingTier.update({
      where: { id: order.tierId },
      data: {
        soldCount: { increment: order.quantity }
      }
    });

    const crowdfunding = await prisma.crowdfunding.update({
      where: { id: order.crowdfundingId },
      data: {
        currentAmount: { increment: order.amount },
        backerCount: { increment: 1 }
      }
    });

    const progress = crowdfunding.targetAmount > 0
      ? Math.round((crowdfunding.currentAmount / crowdfunding.targetAmount) * 100)
      : 0;

    if (progress >= 100 && crowdfunding.status === 'PUBLISHED') {
      await prisma.crowdfunding.update({
        where: { id: order.crowdfundingId },
        data: { status: 'SUCCESSFUL' }
      });

      await prisma.message.create({
        data: {
          senderId: 1,
          receiverId: crowdfunding.creatorId,
          title: '🎉 众筹项目已达成目标！',
          content: `恭喜！您的众筹项目《${crowdfunding.title}》已成功达成目标金额！\n\n当前筹款：¥${crowdfunding.currentAmount}\n目标金额：¥${crowdfunding.targetAmount}\n支持人数：${crowdfunding.backerCount}人\n\n感谢您的努力，请及时处理订单发货。`,
          type: 'CROWDFUNDING'
        }
      });
    }

    const updatedTier = await prisma.crowdfundingTier.findUnique({
      where: { id: order.tierId }
    });

    const remainingStock = updatedTier.isUnlimited ? -1 : updatedTier.stock - updatedTier.soldCount;
    if (crowdfunding.stockThreshold > 0 && remainingStock > 0 && remainingStock <= crowdfunding.stockThreshold) {
      if (!crowdfunding.lowStockAlert) {
        await prisma.crowdfunding.update({
          where: { id: order.crowdfundingId },
          data: { lowStockAlert: true }
        });

        await prisma.message.create({
          data: {
            senderId: 1,
            receiverId: crowdfunding.creatorId,
            title: '⚠️ 库存预警提醒',
            content: `您的众筹项目《${crowdfunding.title}》档位【${updatedTier.name}】库存已不足${crowdfunding.stockThreshold}件！\n\n当前剩余：${remainingStock}件\n\n请及时关注库存情况。`,
            type: 'CROWDFUNDING'
          }
        });
      }
    }

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: request.user.id,
        title: '✅ 支持成功！',
        content: `您已成功支持众筹项目《${crowdfunding.title}》\n\n档位：${tier.name}\n金额：¥${order.amount}\n订单号：${order.orderNo}\n\n感谢您的支持，我们会尽快为您处理订单。`,
        type: 'CROWDFUNDING'
      }
    });

    return {
      order: {
        ...updatedOrder,
        tier: formatTier(updatedOrder.tier),
        statusText: getOrderStatusText(updatedOrder.status)
      },
      message: '支付成功'
    };
  });

  fastify.post('/:id/cancel', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { reason } = request.body;

    const order = await prisma.crowdfundingOrder.findUnique({
      where: { id: Number(id) },
      include: { crowdfunding: true }
    });

    if (!order) {
      return reply.code(404).send({ error: '订单不存在' });
    }

    if (order.userId !== request.user.id) {
      return reply.code(403).send({ error: '无权操作此订单' });
    }

    if (order.status !== 'PENDING') {
      return reply.code(400).send({ error: '当前订单状态不可取消' });
    }

    const updated = await prisma.crowdfundingOrder.update({
      where: { id: Number(id) },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason || null
      },
      include: { tier: true }
    });

    return {
      order: {
        ...updated,
        tier: formatTier(updated.tier),
        statusText: getOrderStatusText(updated.status)
      },
      message: '订单已取消'
    };
  });

  fastify.put('/:id/deliver', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;

    const order = await prisma.crowdfundingOrder.findUnique({
      where: { id: Number(id) },
      include: { crowdfunding: true }
    });

    if (!order) {
      return reply.code(404).send({ error: '订单不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = order.userId === request.user.id;
    const isCreator = order.crowdfunding.creatorId === request.user.id;

    if (!isAdmin && !isOwner && !isCreator) {
      return reply.code(403).send({ error: '无权操作此订单' });
    }

    if (order.status !== 'SHIPPED') {
      return reply.code(400).send({ error: '订单状态不正确，只有已发货的订单才能确认收货' });
    }

    const updated = await prisma.crowdfundingOrder.update({
      where: { id: Number(id) },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date()
      },
      include: { tier: true }
    });

    if (isAdmin) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: order.userId,
          title: '✅ 订单已完成',
          content: `您支持的众筹项目《${order.crowdfunding.title}》订单已确认收货！\n\n订单号：${order.orderNo}\n感谢您的支持！`,
          type: 'CROWDFUNDING'
        }
      });
    }

    return {
      order: {
        ...updated,
        tier: formatTier(updated.tier),
        statusText: getOrderStatusText(updated.status)
      },
      message: '已确认收货'
    };
  });
}

module.exports = routes;
