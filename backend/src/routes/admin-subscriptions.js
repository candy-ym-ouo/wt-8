async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/subscriptions/stats', { preHandler: [fastify.adminOnly] }, async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalSubscriptions,
      freeSubscriptions,
      standardSubscriptions,
      premiumSubscriptions,
      newSubscriptionsThisMonth,
      seriesNotifyEnabled,
      authorNotifyEnabled,
      totalAuthorFollows,
      totalAuthorActivities
    ] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { tier: 'FREE' } }),
      prisma.subscription.count({ where: { tier: 'STANDARD' } }),
      prisma.subscription.count({ where: { tier: 'PREMIUM' } }),
      prisma.subscription.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.subscription.count({ where: { notifySeriesUpdate: true } }),
      prisma.subscription.count({ where: { notifyAuthorActivity: true } }),
      prisma.authorSubscription.count(),
      prisma.authorActivity.count()
    ]);

    const topZines = await prisma.subscription.groupBy({
      by: ['zineId'],
      _count: { zineId: true },
      orderBy: { _count: { zineId: 'desc' } },
      take: 10
    });

    const zineIds = topZines.map(t => t.zineId);
    const zines = await prisma.zine.findMany({
      where: { id: { in: zineIds } },
      select: { id: true, title: true, coverImage: true }
    });

    const topZineStats = topZines.map(t => ({
      ...zines.find(z => z.id === t.zineId),
      subscriberCount: t._count.zineId
    }));

    const topAuthors = await prisma.authorSubscription.groupBy({
      by: ['authorId'],
      _count: { authorId: true },
      orderBy: { _count: { authorId: 'desc' } },
      take: 10
    });

    const authorIds = topAuthors.map(t => t.authorId);
    const authors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, username: true, avatar: true }
    });

    const topAuthorStats = topAuthors.map(t => ({
      ...authors.find(a => a.id === t.authorId),
      followerCount: t._count.authorId
    }));

    return {
      stats: {
        totalSubscriptions,
        freeSubscriptions,
        standardSubscriptions,
        premiumSubscriptions,
        newSubscriptionsThisMonth,
        seriesNotifyEnabled,
        authorNotifyEnabled,
        totalAuthorFollows,
        totalAuthorActivities
      },
      topZineStats,
      topAuthorStats
    };
  });

  fastify.get('/subscriptions', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { page = 1, limit = 20, tier, userId } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (tier) where.tier = tier;
    if (userId) where.userId = Number(userId);

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true, avatar: true } },
          zine: { select: { id: true, title: true, coverImage: true, author: { select: { id: true, username: true } } } }
        }
      }),
      prisma.subscription.count({ where })
    ]);

    return { subscriptions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/author-follows', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { page = 1, limit = 20, authorId } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (authorId) where.authorId = Number(authorId);

    const [follows, total] = await Promise.all([
      prisma.authorSubscription.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          author: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.authorSubscription.count({ where })
    ]);

    return { follows, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/activities', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { page = 1, limit = 20, type, authorId } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (type) where.type = type;
    if (authorId) where.authorId = Number(authorId);

    const [activities, total] = await Promise.all([
      prisma.authorActivity.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.authorActivity.count({ where })
    ]);

    return { activities, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/activities', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const { authorId, type, title, content, coverImage, linkType, linkId, isPublic } = request.body;

      if (!authorId || !type || !title) {
        return reply.code(400).send({ error: '作者ID、类型和标题不能为空' });
      }

      const author = await prisma.user.findUnique({ where: { id: Number(authorId) } });
      if (!author) {
        return reply.code(404).send({ error: '作者不存在' });
      }

      const activity = await prisma.authorActivity.create({
        data: {
          authorId: Number(authorId),
          type,
          title,
          content: content || null,
          coverImage: coverImage || null,
          linkType: linkType || null,
          linkId: linkId ? Number(linkId) : null,
          isPublic: isPublic !== undefined ? isPublic : true
        },
        include: {
          author: { select: { id: true, username: true, avatar: true } }
        }
      });

      const followers = await prisma.authorSubscription.findMany({
        where: { authorId: Number(authorId), notifyNew: true },
        select: { userId: true }
      });

      if (followers.length > 0) {
        const messages = followers.map(f => ({
          senderId: 1,
          receiverId: f.userId,
          title: `📡 ${author.username} 有新动态`,
          content: `${title}${content ? '：' + content.substring(0, 100) : ''}`,
          type: 'SUBSCRIPTION'
        }));
        await prisma.message.createMany({ data: messages });
      }

      return { message: '动态创建成功', activity };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '创建失败' });
    }
  });

  fastify.put('/activities/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const id = Number(request.params.id);
      const existing = await prisma.authorActivity.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ error: '动态不存在' });
      }

      const { type, title, content, coverImage, linkType, linkId, isPublic } = request.body;

      const activity = await prisma.authorActivity.update({
        where: { id },
        data: {
          type: type !== undefined ? type : existing.type,
          title: title !== undefined ? title : existing.title,
          content: content !== undefined ? content : existing.content,
          coverImage: coverImage !== undefined ? coverImage : existing.coverImage,
          linkType: linkType !== undefined ? linkType : existing.linkType,
          linkId: linkId !== undefined ? (linkId ? Number(linkId) : null) : existing.linkId,
          isPublic: isPublic !== undefined ? isPublic : existing.isPublic
        },
        include: {
          author: { select: { id: true, username: true, avatar: true } }
        }
      });

      return { message: '更新成功', activity };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '更新失败' });
    }
  });

  fastify.delete('/activities/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const id = Number(request.params.id);
      await prisma.authorActivity.delete({ where: { id } });
      return { message: '删除成功' };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '删除失败' });
    }
  });

  fastify.get('/subscription-config', { preHandler: [fastify.adminOnly] }, async () => {
    const configs = await prisma.membershipConfig.findMany({
      where: { key: { startsWith: 'subscription_' } },
      orderBy: { key: 'asc' }
    });
    return { configs };
  });

  fastify.put('/subscription-config', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const { configs } = request.body;
      if (!Array.isArray(configs)) {
        return reply.code(400).send({ error: '数据格式错误' });
      }

      const results = [];
      for (const cfg of configs) {
        const existing = await prisma.membershipConfig.findUnique({ where: { key: cfg.key } });
        if (existing) {
          const updated = await prisma.membershipConfig.update({
            where: { key: cfg.key },
            data: { value: cfg.value, description: cfg.description || existing.description }
          });
          results.push(updated);
        } else {
          const created = await prisma.membershipConfig.create({
            data: { key: cfg.key, value: cfg.value, description: cfg.description }
          });
          results.push(created);
        }
      }

      return { message: '配置已更新', configs: results };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '保存失败' });
    }
  });
}

module.exports = routes;
