function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const formatPrintOrder = (o) => {
  if (!o) return o;
  return {
    ...o,
    tags: parseJSONField(o.tags, []),
    specialReq: parseJSONField(o.specialReq, []),
    attachments: parseJSONField(o.attachments, [])
  };
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

    const [orders, total] = await Promise.all([
      prisma.printOrder.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          reviewer: { select: { id: true, username: true } },
          quoter: { select: { id: true, username: true } }
        }
      }),
      prisma.printOrder.count({ where })
    ]);

    return { orders: orders.map(formatPrintOrder), total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/stats', { preHandler: [fastify.adminOnly] }, async () => {
    const [total, pending, quoted, confirmed, printing, completed] = await Promise.all([
      prisma.printOrder.count(),
      prisma.printOrder.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.printOrder.count({ where: { status: 'QUOTED' } }),
      prisma.printOrder.count({ where: { status: 'CONFIRMED' } }),
      prisma.printOrder.count({ where: { status: 'PRINTING' } }),
      prisma.printOrder.count({ where: { status: 'COMPLETED' } })
    ]);

    const totalRevenue = await prisma.printOrder.aggregate({
      where: { status: { in: ['CONFIRMED', 'PRINTING', 'COMPLETED'] } },
      _sum: { totalPrice: true }
    });

    return {
      total,
      pending,
      quoted,
      confirmed,
      printing,
      completed,
      totalRevenue: totalRevenue._sum.totalPrice || 0
    };
  });

  fastify.get('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const order = await prisma.printOrder.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true, avatar: true, email: true } },
        reviewer: { select: { id: true, username: true } },
        quoter: { select: { id: true, username: true } }
      }
    });

    if (!order) {
      return reply.code(404).send({ error: '印刷预约不存在' });
    }

    return { order: formatPrintOrder(order) };
  });

  fastify.post('/:id/approve', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const order = await prisma.printOrder.findUnique({ where: { id: Number(id) } });

    if (!order) {
      return reply.code(404).send({ error: '印刷预约不存在' });
    }

    if (order.status !== 'PENDING_REVIEW') {
      return reply.code(400).send({ error: '当前状态不可审核' });
    }

    const updated = await prisma.printOrder.update({
      where: { id: Number(id) },
      data: {
        status: 'APPROVED',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: order.creatorId,
        title: '印刷预约已审核通过',
        content: `您的印刷预约《${order.title}》已通过审核，管理员将尽快为您提供报价。\n\n规格：${order.paperSize} / ${order.pageCount}页 / ${order.printQuantity}册`,
        type: 'SYSTEM'
      }
    });

    return { order: formatPrintOrder(updated), message: '已审核通过' };
  });

  fastify.post('/:id/reject', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const { reason } = request.body;
    const order = await prisma.printOrder.findUnique({ where: { id: Number(id) } });

    if (!order) {
      return reply.code(404).send({ error: '印刷预约不存在' });
    }

    if (order.status !== 'PENDING_REVIEW') {
      return reply.code(400).send({ error: '当前状态不可驳回' });
    }

    const updated = await prisma.printOrder.update({
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
        receiverId: order.creatorId,
        title: '印刷预约未通过审核',
        content: `很遗憾，您的印刷预约《${order.title}》未通过审核。\n\n${reason ? '原因：' + reason + '\n\n' : ''}您可以根据审核意见修改后重新提交。`,
        type: 'SYSTEM'
      }
    });

    return { order: formatPrintOrder(updated), message: '已驳回' };
  });

  fastify.post('/:id/quote', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const { unitPrice, totalPrice, quotationNote } = request.body;
    const order = await prisma.printOrder.findUnique({ where: { id: Number(id) } });

    if (!order) {
      return reply.code(404).send({ error: '印刷预约不存在' });
    }

    if (!['APPROVED', 'PENDING_REVIEW'].includes(order.status)) {
      return reply.code(400).send({ error: '当前状态不可报价' });
    }

    if (!unitPrice || !totalPrice) {
      return reply.code(400).send({ error: '请填写报价信息' });
    }

    const updated = await prisma.printOrder.update({
      where: { id: Number(id) },
      data: {
        status: 'QUOTED',
        unitPrice: Number(unitPrice),
        totalPrice: Number(totalPrice),
        quotationNote: quotationNote || null,
        quotedAt: new Date(),
        quoterId: request.user.id,
        reviewerId: order.reviewerId || request.user.id,
        reviewedAt: order.reviewedAt || new Date()
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: order.creatorId,
        title: '印刷报价已出',
        content: `您的印刷预约《${order.title}》已出报价：\n\n单价：¥${unitPrice}\n总价：¥${totalPrice}\n${quotationNote ? '备注：' + quotationNote + '\n' : ''}\n请登录查看并确认报价。`,
        type: 'SYSTEM'
      }
    });

    return { order: formatPrintOrder(updated), message: '报价已提交' };
  });

  fastify.post('/:id/start-printing', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const order = await prisma.printOrder.findUnique({ where: { id: Number(id) } });

    if (!order) {
      return reply.code(404).send({ error: '印刷预约不存在' });
    }

    if (order.status !== 'CONFIRMED') {
      return reply.code(400).send({ error: '当前状态不可开始印刷' });
    }

    const updated = await prisma.printOrder.update({
      where: { id: Number(id) },
      data: { status: 'PRINTING' }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: order.creatorId,
        title: '印刷已开始',
        content: `您的印刷预约《${order.title}》已开始印刷，请耐心等待。`,
        type: 'SYSTEM'
      }
    });

    return { order: formatPrintOrder(updated), message: '已开始印刷' };
  });

  fastify.post('/:id/complete', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const order = await prisma.printOrder.findUnique({ where: { id: Number(id) } });

    if (!order) {
      return reply.code(404).send({ error: '印刷预约不存在' });
    }

    if (order.status !== 'PRINTING') {
      return reply.code(400).send({ error: '当前状态不可完成' });
    }

    const updated = await prisma.printOrder.update({
      where: { id: Number(id) },
      data: { status: 'COMPLETED' }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: order.creatorId,
        title: '印刷已完成',
        content: `您的印刷预约《${order.title}》已完成印刷！\n\n印刷数量：${order.printQuantity} 册\n请留意物流信息。`,
        type: 'SYSTEM'
      }
    });

    return { order: formatPrintOrder(updated), message: '印刷已完成' };
  });

  fastify.delete('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const order = await prisma.printOrder.findUnique({ where: { id: Number(id) } });

    if (!order) {
      return reply.code(404).send({ error: '印刷预约不存在' });
    }

    await prisma.printOrder.delete({ where: { id: Number(id) } });
    return { message: '删除成功' };
  });
}

module.exports = routes;
