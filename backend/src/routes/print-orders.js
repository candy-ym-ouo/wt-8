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

  fastify.get('/', async (request) => {
    const { status, category, page = 1, limit = 20, keyword, sort = 'newest' } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    let user = null;
    try {
      const decoded = await request.jwtVerify();
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      }
    } catch (e) {}

    if (!user || user.role === 'USER') {
      where.status = { in: ['PUBLISHED', 'QUOTED', 'CONFIRMED', 'PRINTING', 'COMPLETED'] };
    } else if (status && status !== 'all') {
      where.status = status;
    }

    if (category && category !== 'all') where.category = category;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } }
      ];
    }

    let orderBy;
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [orders, total] = await Promise.all([
      prisma.printOrder.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          creator: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.printOrder.count({ where })
    ]);

    return { orders: orders.map(formatPrintOrder), total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/mine', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = { creatorId: request.user.id };

    if (status && status !== 'all') where.status = status;

    const [orders, total] = await Promise.all([
      prisma.printOrder.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: { id: true, username: true } },
          quoter: { select: { id: true, username: true } }
        }
      }),
      prisma.printOrder.count({ where })
    ]);

    return { orders: orders.map(formatPrintOrder), total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', async (request, reply) => {
    const order = await prisma.printOrder.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true, avatar: true, bio: true } },
        reviewer: { select: { id: true, username: true } },
        quoter: { select: { id: true, username: true } }
      }
    });

    if (!order) {
      return reply.code(404).send({ error: '印刷预约不存在' });
    }

    let user = null;
    try {
      const decoded = await request.jwtVerify();
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      }
    } catch (e) {}

    const isOwner = user && order.creatorId === user.id;
    const isAdmin = user && user.role === 'ADMIN';

    if (!['QUOTED', 'CONFIRMED', 'PRINTING', 'COMPLETED'].includes(order.status) && !isOwner && !isAdmin) {
      return reply.code(403).send({ error: '无权查看此印刷预约' });
    }

    return { order: formatPrintOrder(order), isOwner, isAdmin };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const {
      title, description, zineId, category, tags,
      paperType, paperSize, pageCount, colorMode, binding, coverType, printQuantity, specialReq,
      contactName, contactPhone, contactAddress, deliveryAddress, deliveryDate,
      attachments, remark, status
    } = request.body;

    if (!title || !description || !contactName || !contactPhone) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    let initialStatus;
    if (status && isAdmin) {
      initialStatus = status;
    } else {
      initialStatus = isAdmin ? 'DRAFT' : 'PENDING_REVIEW';
    }

    const order = await prisma.printOrder.create({
      data: {
        title,
        description,
        zineId: zineId || null,
        category: category || 'ZINE',
        tags: tags ? JSON.stringify(tags) : '[]',
        status: initialStatus,
        paperType: paperType || 'COATED',
        paperSize: paperSize || 'A5',
        pageCount: Number(pageCount) || 1,
        colorMode: colorMode || 'CMYK',
        binding: binding || 'SADDLE_STITCH',
        coverType: coverType || 'SOFT',
        printQuantity: Number(printQuantity) || 100,
        specialReq: specialReq ? JSON.stringify(specialReq) : '[]',
        contactName,
        contactPhone,
        contactAddress: contactAddress || null,
        deliveryAddress: deliveryAddress || null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        attachments: attachments ? JSON.stringify(attachments) : '[]',
        remark: remark || null,
        creatorId: request.user.id
      }
    });

    if (!isAdmin && initialStatus === 'PENDING_REVIEW') {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: request.user.id,
          title: '印刷预约已提交审核',
          content: `您的印刷预约《${order.title}》已成功提交，等待管理员审核。\n\n审核通过后将为您提供报价，审核结果将通过站内消息通知您。`,
          type: 'SYSTEM'
        }
      });

      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await prisma.message.create({
          data: {
            senderId: request.user.id,
            receiverId: admin.id,
            title: '新的印刷预约待审核',
            content: `用户 ${user.username} 提交了新的印刷预约《${order.title}》，请及时审核并提供报价。\n\n印刷数量：${order.printQuantity} 册\n纸张规格：${order.paperSize}\n页数：${order.pageCount}`,
            type: 'SYSTEM'
          }
        });
      }
    }

    return {
      order: formatPrintOrder(order),
      message: isAdmin ? '印刷预约创建成功' : '印刷预约已提交，等待审核'
    };
  });

  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const order = await prisma.printOrder.findUnique({ where: { id: Number(id) } });

    if (!order) {
      return reply.code(404).send({ error: '印刷预约不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = order.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权编辑此印刷预约' });
    }

    const data = request.body;
    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.zineId !== undefined) updateData.zineId = data.zineId || null;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);

    if (data.paperType !== undefined) updateData.paperType = data.paperType;
    if (data.paperSize !== undefined) updateData.paperSize = data.paperSize;
    if (data.pageCount !== undefined) updateData.pageCount = Number(data.pageCount);
    if (data.colorMode !== undefined) updateData.colorMode = data.colorMode;
    if (data.binding !== undefined) updateData.binding = data.binding;
    if (data.coverType !== undefined) updateData.coverType = data.coverType;
    if (data.printQuantity !== undefined) updateData.printQuantity = Number(data.printQuantity);
    if (data.specialReq !== undefined) updateData.specialReq = JSON.stringify(data.specialReq);

    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.contactAddress !== undefined) updateData.contactAddress = data.contactAddress;
    if (data.deliveryAddress !== undefined) updateData.deliveryAddress = data.deliveryAddress;
    if (data.deliveryDate !== undefined) {
      updateData.deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : null;
    }
    if (data.attachments !== undefined) updateData.attachments = JSON.stringify(data.attachments);
    if (data.remark !== undefined) updateData.remark = data.remark;

    if (isOwner && !isAdmin && ['PENDING_REVIEW', 'REJECTED'].includes(order.status)) {
      updateData.status = 'PENDING_REVIEW';
      updateData.rejectionReason = null;
      updateData.reviewerId = null;
      updateData.reviewedAt = null;
    }

    if (isAdmin) {
      if (data.status !== undefined) updateData.status = data.status;
    }

    const updated = await prisma.printOrder.update({
      where: { id: Number(id) },
      data: updateData
    });

    return { order: formatPrintOrder(updated), message: '更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const order = await prisma.printOrder.findUnique({ where: { id: Number(id) } });

    if (!order) {
      return reply.code(404).send({ error: '印刷预约不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = order.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权删除此印刷预约' });
    }

    if (['CONFIRMED', 'PRINTING'].includes(order.status) && !isAdmin) {
      return reply.code(400).send({ error: '印刷中或已确认的订单无法删除' });
    }

    await prisma.printOrder.delete({ where: { id: Number(id) } });
    return { message: '删除成功' };
  });

  fastify.post('/:id/resubmit', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const order = await prisma.printOrder.findUnique({ where: { id: Number(id) } });

    if (!order) {
      return reply.code(404).send({ error: '印刷预约不存在' });
    }

    if (order.creatorId !== request.user.id) {
      return reply.code(403).send({ error: '无权操作此印刷预约' });
    }

    if (!['DRAFT', 'REJECTED'].includes(order.status)) {
      return reply.code(400).send({ error: '当前状态不可重新提交' });
    }

    const updated = await prisma.printOrder.update({
      where: { id: Number(id) },
      data: {
        status: 'PENDING_REVIEW',
        rejectionReason: null,
        reviewerId: null,
        reviewedAt: null
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: request.user.id,
        title: '印刷预约已重新提交',
        content: `您的印刷预约《${order.title}》已重新提交审核，等待管理员处理。`,
        type: 'SYSTEM'
      }
    });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: admin.id,
          title: '印刷预约重新提交审核',
          content: `用户重新提交了印刷预约《${order.title}》，请及时审核。`,
          type: 'SYSTEM'
        }
      });
    }

    return { order: formatPrintOrder(updated), message: '已重新提交审核' };
  });

  fastify.post('/:id/confirm', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const order = await prisma.printOrder.findUnique({ where: { id: Number(id) } });

    if (!order) {
      return reply.code(404).send({ error: '印刷预约不存在' });
    }

    if (order.creatorId !== request.user.id) {
      return reply.code(403).send({ error: '无权操作此印刷预约' });
    }

    if (order.status !== 'QUOTED') {
      return reply.code(400).send({ error: '当前状态不可确认报价' });
    }

    const updated = await prisma.printOrder.update({
      where: { id: Number(id) },
      data: { status: 'CONFIRMED' }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: request.user.id,
        title: '印刷报价已确认',
        content: `您已确认印刷预约《${order.title}》的报价，管理员将安排印刷。`,
        type: 'SYSTEM'
      }
    });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: admin.id,
          title: '印刷报价已被确认',
          content: `用户已确认印刷预约《${order.title}》的报价，请安排印刷。\n\n单价：¥${order.unitPrice}\n总价：¥${order.totalPrice}`,
          type: 'SYSTEM'
        }
      });
    }

    return { order: formatPrintOrder(updated), message: '报价已确认' };
  });

  fastify.post('/:id/cancel', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { reason } = request.body;
    const order = await prisma.printOrder.findUnique({ where: { id: Number(id) } });

    if (!order) {
      return reply.code(404).send({ error: '印刷预约不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = order.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权操作此印刷预约' });
    }

    if (!['PENDING_REVIEW', 'QUOTED', 'CONFIRMED'].includes(order.status)) {
      return reply.code(400).send({ error: '当前状态不可取消' });
    }

    const updated = await prisma.printOrder.update({
      where: { id: Number(id) },
      data: { status: 'CANCELLED', remark: reason ? `${order.remark || ''}\n取消原因：${reason}`.trim() : order.remark }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: order.creatorId,
        title: '印刷预约已取消',
        content: `印刷预约《${order.title}》已取消。${reason ? '\n原因：' + reason : ''}`,
        type: 'SYSTEM'
      }
    });

    return { order: formatPrintOrder(updated), message: '已取消' };
  });
}

module.exports = routes;
