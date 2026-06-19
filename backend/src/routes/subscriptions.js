async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { page = 1, limit = 12 } = request.query;
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where: { userId: request.user.id },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          zine: {
            include: {
              author: { select: { id: true, username: true, avatar: true } }
            }
          }
        }
      }),
      prisma.subscription.count({ where: { userId: request.user.id } })
    ]);

    return { subscriptions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/:zineId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const zineId = Number(request.params.zineId);
    const zine = await prisma.zine.findUnique({ where: { id: zineId } });

    if (!zine) {
      return reply.code(404).send({ error: '刊物不存在' });
    }

    const existing = await prisma.subscription.findUnique({
      where: { userId_zineId: { userId: request.user.id, zineId } }
    });

    if (existing) {
      return reply.code(400).send({ error: '已订阅该刊物' });
    }

    const subscription = await prisma.subscription.create({
      data: { userId: request.user.id, zineId }
    });

    await prisma.message.create({
      data: {
        senderId: 1,
        receiverId: request.user.id,
        title: '订阅成功',
        content: `您已成功订阅《${zine.title}》，我们会在有更新时第一时间通知您。`,
        type: 'SYSTEM'
      }
    });

    return { subscription, message: '订阅成功' };
  });

  fastify.delete('/:zineId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const zineId = Number(request.params.zineId);

    const subscription = await prisma.subscription.findUnique({
      where: { userId_zineId: { userId: request.user.id, zineId } }
    });

    if (!subscription) {
      return reply.code(404).send({ error: '未订阅该刊物' });
    }

    await prisma.subscription.delete({
      where: { userId_zineId: { userId: request.user.id, zineId } }
    });

    return { message: '已取消订阅' };
  });

  fastify.get('/check/:zineId', { preHandler: [fastify.authenticate] }, async (request) => {
    const zineId = Number(request.params.zineId);
    const subscription = await prisma.subscription.findUnique({
      where: { userId_zineId: { userId: request.user.id, zineId } }
    });
    return { subscribed: !!subscription };
  });
}

module.exports = routes;
