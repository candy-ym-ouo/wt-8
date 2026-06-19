async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { type, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = { receiverId: request.user.id };
    if (type && type !== 'all') where.type = type;

    const [messages, total, unreadCount] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.message.count({ where }),
      prisma.message.count({ where: { ...where, isRead: false } })
    ]);

    return { messages, total, unreadCount, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/unread', { preHandler: [fastify.authenticate] }, async (request) => {
    const count = await prisma.message.count({
      where: { receiverId: request.user.id, isRead: false }
    });
    return { unreadCount: count };
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const message = await prisma.message.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        sender: { select: { id: true, username: true, avatar: true } }
      }
    });

    if (!message) {
      return reply.code(404).send({ error: '消息不存在' });
    }

    if (message.receiverId !== request.user.id) {
      return reply.code(403).send({ error: '无权查看此消息' });
    }

    if (!message.isRead) {
      await prisma.message.update({
        where: { id: message.id },
        data: { isRead: true }
      });
      message.isRead = true;
    }

    return { message };
  });

  fastify.put('/:id/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const message = await prisma.message.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!message) {
      return reply.code(404).send({ error: '消息不存在' });
    }

    if (message.receiverId !== request.user.id) {
      return reply.code(403).send({ error: '无权操作此消息' });
    }

    await prisma.message.update({
      where: { id: message.id },
      data: { isRead: true }
    });

    return { message: '已标记为已读' };
  });

  fastify.put('/read-all', { preHandler: [fastify.authenticate] }, async (request) => {
    await prisma.message.updateMany({
      where: { receiverId: request.user.id, isRead: false },
      data: { isRead: true }
    });
    return { message: '已全部标记为已读' };
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const message = await prisma.message.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!message) {
      return reply.code(404).send({ error: '消息不存在' });
    }

    if (message.receiverId !== request.user.id) {
      return reply.code(403).send({ error: '无权删除此消息' });
    }

    await prisma.message.delete({ where: { id: message.id } });
    return { message: '删除成功' };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { receiverId, title, content } = request.body;

    if (!receiverId || !title || !content) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const receiver = await prisma.user.findUnique({ where: { id: Number(receiverId) } });
    if (!receiver) {
      return reply.code(404).send({ error: '接收用户不存在' });
    }

    const message = await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: Number(receiverId),
        title,
        content,
        type: 'USER'
      }
    });

    return { message, messageText: '发送成功' };
  });
}

module.exports = routes;
