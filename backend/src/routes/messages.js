async function routes(fastify) {
  const { prisma } = fastify;

  const SYSTEM_MESSAGE_TYPES = ['SYSTEM', 'REPORT', 'ZINE', 'CROWDFUNDING', 'COLLABORATION', 'EVENT', 'FINANCE', 'MEMBERSHIP', 'SUBMISSION'];

  const buildMessageWhere = (userId, { type, archived, onlyUnread, category } = {}) => {
    const where = { receiverId: userId };

    if (archived === 'true' || archived === true) {
      where.isArchived = true;
    } else if (archived === 'false' || archived === false || archived === undefined) {
      where.isArchived = false;
    }

    if (category === 'SYSTEM') {
      where.type = { in: SYSTEM_MESSAGE_TYPES };
    } else if (category === 'USER') {
      where.type = 'USER';
    } else if (type && type !== 'all') {
      where.type = type;
    }

    if (onlyUnread === 'true' || onlyUnread === true) {
      where.isRead = false;
    }

    return where;
  };

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { type, page = 1, limit = 20, archived, onlyUnread, category } = request.query;
    const skip = (page - 1) * limit;
    const where = buildMessageWhere(request.user.id, { type, archived, onlyUnread, category });

    const [messages, total, unreadCount, archivedCount] = await Promise.all([
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
      prisma.message.count({
        where: buildMessageWhere(request.user.id, { type, archived: false, onlyUnread: true, category })
      }),
      prisma.message.count({
        where: { receiverId: request.user.id, isArchived: true }
      })
    ]);

    const categoryUnreadCounts = {};
    const categoryTypes = [
      { key: 'all', types: null },
      { key: 'SYSTEM', types: SYSTEM_MESSAGE_TYPES },
      { key: 'USER', types: ['USER'] },
      ...SYSTEM_MESSAGE_TYPES.map(t => ({ key: t, types: [t] }))
    ];

    for (const cat of categoryTypes) {
      const catWhere = { receiverId: request.user.id, isArchived: false, isRead: false };
      if (cat.types) catWhere.type = { in: cat.types };
      categoryUnreadCounts[cat.key] = await prisma.message.count({ where: catWhere });
    }

    return {
      messages,
      total,
      unreadCount,
      archivedCount,
      categoryUnreadCounts,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.get('/unread', { preHandler: [fastify.authenticate] }, async (request) => {
    const { category, type } = request.query;
    const where = { receiverId: request.user.id, isRead: false, isArchived: false };

    if (category === 'SYSTEM') {
      where.type = { in: SYSTEM_MESSAGE_TYPES };
    } else if (category === 'USER') {
      where.type = 'USER';
    } else if (type && type !== 'all') {
      where.type = type;
    }

    const count = await prisma.message.count({ where });

    const categoryUnreadCounts = {};
    const categoryTypes = [
      { key: 'all', types: null },
      { key: 'SYSTEM', types: SYSTEM_MESSAGE_TYPES },
      { key: 'USER', types: ['USER'] },
      ...SYSTEM_MESSAGE_TYPES.map(t => ({ key: t, types: [t] }))
    ];

    for (const cat of categoryTypes) {
      const catWhere = { receiverId: request.user.id, isArchived: false, isRead: false };
      if (cat.types) catWhere.type = { in: cat.types };
      categoryUnreadCounts[cat.key] = await prisma.message.count({ where: catWhere });
    }

    return { unreadCount: count, categoryUnreadCounts };
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
    const { category, type } = request.query;
    const where = { receiverId: request.user.id, isRead: false, isArchived: false };

    if (category === 'SYSTEM') {
      where.type = { in: SYSTEM_MESSAGE_TYPES };
    } else if (category === 'USER') {
      where.type = 'USER';
    } else if (type && type !== 'all') {
      where.type = type;
    }

    await prisma.message.updateMany({
      where,
      data: { isRead: true }
    });
    return { message: '已全部标记为已读' };
  });

  fastify.put('/:id/archive', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const message = await prisma.message.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!message) {
      return reply.code(404).send({ error: '消息不存在' });
    }

    if (message.receiverId !== request.user.id) {
      return reply.code(403).send({ error: '无权归档此消息' });
    }

    await prisma.message.update({
      where: { id: message.id },
      data: { isArchived: true }
    });

    return { message: '已归档' };
  });

  fastify.put('/:id/unarchive', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
      data: { isArchived: false }
    });

    return { message: '已取消归档' };
  });

  fastify.put('/archive-batch', { preHandler: [fastify.authenticate] }, async (request) => {
    const { ids, archive = true } = request.body || {};
    const messageIds = (ids || []).map(Number).filter(Boolean);

    if (messageIds.length === 0) {
      return { message: '没有需要操作的消息' };
    }

    await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        receiverId: request.user.id
      },
      data: { isArchived: archive }
    });

    return { message: archive ? '已批量归档' : '已批量取消归档' };
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

  fastify.get('/quick-replies', { preHandler: [fastify.authenticate] }, async (request) => {
    const { includeInactive } = request.query;
    const where = { userId: request.user.id };
    if (includeInactive !== 'true') where.isActive = true;

    const quickReplies = await prisma.quickReply.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    });

    return { quickReplies };
  });

  fastify.post('/quick-replies', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { title, content, sortOrder = 0, isActive = true } = request.body || {};

    if (!title || !content) {
      return reply.code(400).send({ error: '标题和内容不能为空' });
    }

    const quickReply = await prisma.quickReply.create({
      data: {
        userId: request.user.id,
        title: String(title).slice(0, 50),
        content: String(content),
        sortOrder: Number(sortOrder) || 0,
        isActive: Boolean(isActive)
      }
    });

    return { quickReply, message: '创建成功' };
  });

  fastify.put('/quick-replies/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const quickReplyId = Number(request.params.id);
    const existing = await prisma.quickReply.findUnique({ where: { id: quickReplyId } });

    if (!existing) {
      return reply.code(404).send({ error: '快捷回复不存在' });
    }

    if (existing.userId !== request.user.id) {
      return reply.code(403).send({ error: '无权修改此快捷回复' });
    }

    const { title, content, sortOrder, isActive } = request.body || {};
    const data = {};
    if (title !== undefined) data.title = String(title).slice(0, 50);
    if (content !== undefined) data.content = String(content);
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.quickReply.update({
      where: { id: quickReplyId },
      data
    });

    return { quickReply: updated, message: '更新成功' };
  });

  fastify.delete('/quick-replies/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const quickReplyId = Number(request.params.id);
    const existing = await prisma.quickReply.findUnique({ where: { id: quickReplyId } });

    if (!existing) {
      return reply.code(404).send({ error: '快捷回复不存在' });
    }

    if (existing.userId !== request.user.id) {
      return reply.code(403).send({ error: '无权删除此快捷回复' });
    }

    await prisma.quickReply.delete({ where: { id: quickReplyId } });
    return { message: '删除成功' };
  });
}

module.exports = routes;
