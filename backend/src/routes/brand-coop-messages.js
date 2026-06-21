async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', async (request, reply) => {
    const { id } = request.params;
    const { page = 1, limit = 50 } = request.query;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.brandCoopMessage.findMany({
        where: { brandCoopId: Number(id) },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.brandCoopMessage.count({ where: { brandCoopId: Number(id) } })
    ]);

    return { messages, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { content, type } = request.body;

    if (!content) {
      return reply.code(400).send({ error: '消息内容不能为空' });
    }

    const brandCoop = await prisma.brandCoop.findUnique({ where: { id: Number(id) } });
    if (!brandCoop) {
      return reply.code(404).send({ error: '品牌联名合作不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = brandCoop.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权在此合作中发送消息' });
    }

    const message = await prisma.brandCoopMessage.create({
      data: {
        brandCoopId: Number(id),
        senderId: request.user.id,
        content,
        type: type || 'TEXT'
      },
      include: {
        sender: { select: { id: true, username: true, avatar: true } }
      }
    });

    const otherUserId = isOwner ? brandCoop.creatorId : brandCoop.creatorId;
    if (isAdmin && brandCoop.creatorId !== request.user.id) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: brandCoop.creatorId,
          title: `品牌联名合作有新消息`,
          content: `品牌联名合作《${brandCoop.title}》有新的协同消息，请查看。\n\n${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
          type: 'BRAND_COOP'
        }
      });
    } else if (isOwner) {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await prisma.message.create({
          data: {
            senderId: request.user.id,
            receiverId: admin.id,
            title: `品牌联名合作有新消息`,
            content: `品牌联名合作《${brandCoop.title}》有新的协同消息，请查看。\n\n${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
            type: 'BRAND_COOP'
          }
        });
      }
    }

    return { message: message, msg: '消息发送成功' };
  });

  fastify.put('/:messageId/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { messageId } = request.params;
    const msg = await prisma.brandCoopMessage.findUnique({ where: { id: Number(messageId) } });
    if (!msg) {
      return reply.code(404).send({ error: '消息不存在' });
    }

    await prisma.brandCoopMessage.update({
      where: { id: Number(messageId) },
      data: { isRead: true }
    });

    return { message: '已标记为已读' };
  });

  fastify.put('/read-all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    await prisma.brandCoopMessage.updateMany({
      where: { brandCoopId: Number(id), isRead: false },
      data: { isRead: true }
    });
    return { message: '全部消息已标记为已读' };
  });
}

module.exports = routes;
