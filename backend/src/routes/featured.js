async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', async (request) => {
    const { activeOnly = 'true' } = request.query;
    const now = new Date();
    const where = {};

    if (activeOnly === 'true') {
      where.isActive = true;
      where.AND = [
        {
          OR: [
            { startDate: null },
            { startDate: { lte: now } }
          ]
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } }
          ]
        }
      ];
    }

    const featured = await prisma.featuredTopic.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        topic: {
          include: {
            creator: { select: { id: true, username: true, avatar: true } },
            _count: { select: { submissions: true } }
          }
        }
      }
    });

    return { featured };
  });

  fastify.post('/', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const {
      topicId, bannerImage, bannerTitle,
      bannerSubtitle, sortOrder = 0,
      startDate, endDate, isActive = true
    } = request.body;

    if (!topicId) {
      return reply.code(400).send({ error: '请选择征稿专题' });
    }

    const topic = await prisma.topic.findUnique({ where: { id: Number(topicId) } });
    if (!topic) {
      return reply.code(404).send({ error: '征稿专题不存在' });
    }

    const existing = await prisma.featuredTopic.findUnique({
      where: { topicId: Number(topicId) }
    });
    if (existing) {
      return reply.code(400).send({ error: '该专题已设置首页曝光' });
    }

    const featured = await prisma.featuredTopic.create({
      data: {
        topicId: Number(topicId),
        bannerImage: bannerImage || null,
        bannerTitle: bannerTitle || null,
        bannerSubtitle: bannerSubtitle || null,
        sortOrder,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive
      }
    });

    await prisma.topic.update({
      where: { id: Number(topicId) },
      data: { isFeatured: true }
    });

    return { featured, message: '首页曝光设置成功' };
  });

  fastify.put('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const featured = await prisma.featuredTopic.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!featured) {
      return reply.code(404).send({ error: '曝光配置不存在' });
    }

    const {
      bannerImage, bannerTitle, bannerSubtitle,
      sortOrder, startDate, endDate, isActive
    } = request.body;

    const updateData = {};
    if (bannerImage !== undefined) updateData.bannerImage = bannerImage;
    if (bannerTitle !== undefined) updateData.bannerTitle = bannerTitle;
    if (bannerSubtitle !== undefined) updateData.bannerSubtitle = bannerSubtitle;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.featuredTopic.update({
      where: { id: featured.id },
      data: updateData
    });

    if (isActive !== undefined) {
      await prisma.topic.update({
        where: { id: featured.topicId },
        data: { isFeatured }
      });
    }

    return { featured: updated, message: '更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const featured = await prisma.featuredTopic.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!featured) {
      return reply.code(404).send({ error: '曝光配置不存在' });
    }

    const topicId = featured.topicId;
    await prisma.featuredTopic.delete({ where: { id: featured.id } });

    await prisma.topic.update({
      where: { id: topicId },
      data: { isFeatured: false }
    });

    return { message: '已取消首页曝光' };
  });

  fastify.put('/reorder', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { orders } = request.body;

    if (orders && Array.isArray(orders)) {
      for (const item of orders) {
        await prisma.featuredTopic.update({
          where: { id: Number(item.id) },
          data: { sortOrder: Number(item.sortOrder) }
        });
      }
    }

    return { message: '排序已更新' };
  });
}

module.exports = routes;
