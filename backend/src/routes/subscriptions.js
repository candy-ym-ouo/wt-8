const { triggerGrowthEvent } = require('../utils/growthTrigger');

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { page = 1, limit = 12, tier } = request.query;
    const skip = (page - 1) * limit;
    const where = { userId: request.user.id };
    if (tier) where.tier = tier;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
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
      prisma.subscription.count({ where })
    ]);

    return { subscriptions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/:zineId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const zineId = Number(request.params.zineId);
    const { tier = 'FREE', notifySeriesUpdate = true, notifyAuthorActivity = false } = request.body || {};
    const zine = await prisma.zine.findUnique({ where: { id: zineId } });

    if (!zine) {
      return reply.code(404).send({ error: '刊物不存在' });
    }

    const validTiers = ['FREE', 'STANDARD', 'PREMIUM'];
    if (!validTiers.includes(tier)) {
      return reply.code(400).send({ error: '无效的订阅等级' });
    }

    const existing = await prisma.subscription.findUnique({
      where: { userId_zineId: { userId: request.user.id, zineId } }
    });

    if (existing) {
      return reply.code(400).send({ error: '已订阅该刊物' });
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: request.user.id,
        zineId,
        tier,
        notifySeriesUpdate,
        notifyAuthorActivity
      }
    });

    await prisma.message.create({
      data: {
        senderId: 1,
        receiverId: request.user.id,
        title: '订阅成功',
        content: `您已成功订阅《${zine.title}》，订阅等级：${tierLabel(tier)}。我们会在有更新时第一时间通知您。`,
        type: 'SYSTEM'
      }
    });

    await triggerGrowthEvent(prisma, zine.authorId, 'SUBSCRIPTION_GAINED', {
      sourceId: zine.id
    });

    return { subscription, message: '订阅成功' };
  });

  fastify.put('/:zineId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const zineId = Number(request.params.zineId);
    const { tier, notifySeriesUpdate, notifyAuthorActivity } = request.body || {};

    const existing = await prisma.subscription.findUnique({
      where: { userId_zineId: { userId: request.user.id, zineId } }
    });

    if (!existing) {
      return reply.code(404).send({ error: '未订阅该刊物' });
    }

    const data = {};
    if (tier !== undefined) {
      const validTiers = ['FREE', 'STANDARD', 'PREMIUM'];
      if (!validTiers.includes(tier)) {
        return reply.code(400).send({ error: '无效的订阅等级' });
      }
      data.tier = tier;
    }
    if (notifySeriesUpdate !== undefined) data.notifySeriesUpdate = notifySeriesUpdate;
    if (notifyAuthorActivity !== undefined) data.notifyAuthorActivity = notifyAuthorActivity;

    const subscription = await prisma.subscription.update({
      where: { userId_zineId: { userId: request.user.id, zineId } },
      data
    });

    return { subscription, message: '订阅已更新' };
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
    return { subscribed: !!subscription, tier: subscription?.tier || null };
  });

  fastify.get('/series-updates', { preHandler: [fastify.authenticate] }, async (request) => {
    const { page = 1, limit = 10 } = request.query;
    const skip = (page - 1) * limit;

    const subsWithNotify = await prisma.subscription.findMany({
      where: {
        userId: request.user.id,
        notifySeriesUpdate: true
      },
      select: { zineId: true }
    });

    const zineIds = subsWithNotify.map(s => s.zineId);
    if (zineIds.length === 0) {
      return { updates: [], total: 0, page: Number(page), totalPages: 0 };
    }

    const [zines, total] = await Promise.all([
      prisma.zine.findMany({
        where: { id: { in: zineIds } },
        skip,
        take: Number(limit),
        orderBy: { updatedAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.zine.count({ where: { id: { in: zineIds } } })
    ]);

    const updates = zines.map(z => ({
      zineId: z.id,
      title: z.title,
      coverImage: z.coverImage,
      category: z.category,
      updatedAt: z.updatedAt,
      author: z.author,
      updateType: 'CONTENT_UPDATE'
    }));

    return { updates, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/author-feed', { preHandler: [fastify.authenticate] }, async (request) => {
    const { page = 1, limit = 10 } = request.query;
    const skip = (page - 1) * limit;

    const authorSubs = await prisma.authorSubscription.findMany({
      where: { userId: request.user.id },
      select: { authorId: true }
    });

    const authorIds = authorSubs.map(s => s.authorId);

    const subsWithAuthorNotify = await prisma.subscription.findMany({
      where: {
        userId: request.user.id,
        notifyAuthorActivity: true
      },
      select: { zine: { select: { authorId: true } } }
    });

    const zineAuthorIds = subsWithAuthorNotify.map(s => s.zine.authorId);
    const allAuthorIds = [...new Set([...authorIds, ...zineAuthorIds])];

    if (allAuthorIds.length === 0) {
      return { activities: [], total: 0, page: Number(page), totalPages: 0 };
    }

    const [activities, total] = await Promise.all([
      prisma.authorActivity.findMany({
        where: {
          authorId: { in: allAuthorIds },
          isPublic: true
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.authorActivity.count({
        where: {
          authorId: { in: allAuthorIds },
          isPublic: true
        }
      })
    ]);

    return { activities, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/authors/:authorId/follow', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const authorId = Number(request.params.authorId);
    const { notifyNew = true } = request.body || {};

    if (authorId === request.user.id) {
      return reply.code(400).send({ error: '不能关注自己' });
    }

    const author = await prisma.user.findUnique({ where: { id: authorId } });
    if (!author) {
      return reply.code(404).send({ error: '作者不存在' });
    }

    const existing = await prisma.authorSubscription.findUnique({
      where: { userId_authorId: { userId: request.user.id, authorId } }
    });

    if (existing) {
      return reply.code(400).send({ error: '已关注该作者' });
    }

    const sub = await prisma.authorSubscription.create({
      data: {
        userId: request.user.id,
        authorId,
        notifyNew
      }
    });

    return { subscription: sub, message: '关注成功' };
  });

  fastify.delete('/authors/:authorId/follow', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const authorId = Number(request.params.authorId);

    const existing = await prisma.authorSubscription.findUnique({
      where: { userId_authorId: { userId: request.user.id, authorId } }
    });

    if (!existing) {
      return reply.code(404).send({ error: '未关注该作者' });
    }

    await prisma.authorSubscription.delete({
      where: { userId_authorId: { userId: request.user.id, authorId } }
    });

    return { message: '已取消关注' };
  });

  fastify.get('/authors', { preHandler: [fastify.authenticate] }, async (request) => {
    const { page = 1, limit = 12 } = request.query;
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      prisma.authorSubscription.findMany({
        where: { userId: request.user.id },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, avatar: true, bio: true } }
        }
      }),
      prisma.authorSubscription.count({ where: { userId: request.user.id } })
    ]);

    return { subscriptions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/check-author/:authorId', { preHandler: [fastify.authenticate] }, async (request) => {
    const authorId = Number(request.params.authorId);
    const sub = await prisma.authorSubscription.findUnique({
      where: { userId_authorId: { userId: request.user.id, authorId } }
    });
    return { followed: !!sub };
  });

  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request) => {
    const [totalSubs, freeSubs, standardSubs, premiumSubs, followedAuthors, seriesNotifyCount, authorNotifyCount] = await Promise.all([
      prisma.subscription.count({ where: { userId: request.user.id } }),
      prisma.subscription.count({ where: { userId: request.user.id, tier: 'FREE' } }),
      prisma.subscription.count({ where: { userId: request.user.id, tier: 'STANDARD' } }),
      prisma.subscription.count({ where: { userId: request.user.id, tier: 'PREMIUM' } }),
      prisma.authorSubscription.count({ where: { userId: request.user.id } }),
      prisma.subscription.count({ where: { userId: request.user.id, notifySeriesUpdate: true } }),
      prisma.subscription.count({ where: { userId: request.user.id, notifyAuthorActivity: true } })
    ]);

    return {
      totalSubs,
      freeSubs,
      standardSubs,
      premiumSubs,
      followedAuthors,
      seriesNotifyCount,
      authorNotifyCount
    };
  });
}

function tierLabel(tier) {
  const labels = { FREE: '免费订阅', STANDARD: '标准订阅', PREMIUM: '高级订阅' };
  return labels[tier] || tier;
}

module.exports = routes;
