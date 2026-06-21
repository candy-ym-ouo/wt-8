function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

async function routes(fastify, options) {
  const { prisma } = fastify;

  const formatZine = (zine) => {
    if (!zine) return zine;
    return { ...zine, tags: parseJSONField(zine.tags, []) };
  };

  const formatSub = (s) => {
    if (!s) return s;
    return { ...s, images: parseJSONField(s.images, []) };
  };

  const getOverview = async (userId, currentUserId) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        createdAt: true,
        role: true
      }
    });

    if (!user) return null;

    const isOwner = currentUserId && currentUserId === userId;

    const [
      publishedZinesCount,
      totalZineViews,
      totalZineLikes,
      totalZineComments,
      submissionsCount,
      approvedSubmissionsCount,
      followerCount,
      subscriptionCount
    ] = await Promise.all([
      prisma.zine.count({ where: { authorId: userId, status: 'PUBLISHED' } }),
      prisma.zine.aggregate({
        where: { authorId: userId, status: 'PUBLISHED' },
        _sum: { views: true }
      }).then(r => r._sum.views || 0),
      prisma.zine.aggregate({
        where: { authorId: userId, status: 'PUBLISHED' },
        _sum: { likes: true }
      }).then(r => r._sum.likes || 0),
      prisma.zine.aggregate({
        where: { authorId: userId, status: 'PUBLISHED' },
        _sum: { commentCount: true }
      }).then(r => r._sum.commentCount || 0),
      prisma.submission.count({ where: { userId } }),
      prisma.submission.count({ where: { userId, status: 'APPROVED' } }),
      prisma.authorSubscription.count({ where: { authorId: userId } }),
      prisma.subscription.count({
        where: { zine: { authorId: userId } }
      })
    ]);

    return {
      user,
      stats: {
        publishedZines: publishedZinesCount,
        totalZineViews,
        totalZineLikes,
        totalZineComments,
        totalSubmissions: submissionsCount,
        approvedSubmissions: approvedSubmissionsCount,
        followerCount,
        subscriptionCount
      },
      isOwner
    };
  };

  const getZines = async (userId, page = 1, limit = 10, sort = 'newest') => {
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const where = { authorId: userId, status: 'PUBLISHED' };

    let orderBy = { createdAt: 'desc' };
    if (sort === 'popular') orderBy = { views: 'desc' };
    if (sort === 'liked') orderBy = { likes: 'desc' };

    const [zinesData, total] = await Promise.all([
      prisma.zine.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          author: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.zine.count({ where })
    ]);

    const zines = zinesData.map(formatZine);

    return {
      zines,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  };

  const getSubmissions = async (userId, page = 1, limit = 10, status) => {
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const where = { userId };
    if (status && status !== 'all') where.status = status;

    const [submissionsData, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          review: true
        }
      }),
      prisma.submission.count({ where })
    ]);

    const submissions = submissionsData.map(formatSub);

    const statusCounts = {};
    const statuses = ['DRAFT', 'PENDING', 'SCHEDULED', 'APPROVED', 'REJECTED', 'WITHDRAWN'];
    for (const s of statuses) {
      statusCounts[s] = await prisma.submission.count({ where: { userId, status: s } });
    }

    return {
      submissions,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      statusCounts
    };
  };

  const getLikesStats = async (userId, period = 'month') => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const zines = await prisma.zine.findMany({
      where: { authorId: userId, status: 'PUBLISHED' },
      select: { id: true, title: true, likes: true, views: true, coverImage: true }
    });

    const zineLikesRanking = [...zines]
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 10);

    const totalLikes = zines.reduce((sum, z) => sum + z.likes, 0);
    const totalViews = zines.reduce((sum, z) => sum + z.views, 0);

    const now = new Date();
    let dateFrom;
    if (period === 'week') {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const recentComments = await prisma.zineComment.findMany({
      where: {
        zine: { authorId: userId },
        status: 'APPROVED',
        createdAt: dateFrom ? { gte: dateFrom } : undefined
      },
      include: {
        zine: { select: { id: true, title: true } },
        user: { select: { id: true, username: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return {
      totalLikes,
      totalViews,
      zineLikesRanking,
      recentComments,
      period
    };
  };

  const getSubscriberGrowth = async (userId, period = 'month') => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const now = new Date();
    let days;
    if (period === 'week') days = 7;
    else if (period === 'month') days = 30;
    else if (period === 'year') days = 365;
    else days = 30;

    const dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        zine: { authorId: userId },
        createdAt: { gte: dateFrom }
      },
      select: { createdAt: true, tier: true }
    });

    const authorSubscriptions = await prisma.authorSubscription.findMany({
      where: {
        authorId: userId,
        createdAt: { gte: dateFrom }
      },
      select: { createdAt: true }
    });

    const dailyData = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dailyData[key] = { subscriptions: 0, followers: 0 };
    }

    subscriptions.forEach(sub => {
      const d = new Date(sub.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dailyData[key]) {
        dailyData[key].subscriptions++;
      }
    });

    authorSubscriptions.forEach(sub => {
      const d = new Date(sub.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dailyData[key]) {
        dailyData[key].followers++;
      }
    });

    const growthData = Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data
    }));

    const tierBreakdown = { FREE: 0, STANDARD: 0, PREMIUM: 0 };
    const allSubscriptions = await prisma.subscription.findMany({
      where: { zine: { authorId: userId } },
      select: { tier: true }
    });
    allSubscriptions.forEach(sub => {
      if (tierBreakdown[sub.tier] !== undefined) {
        tierBreakdown[sub.tier]++;
      }
    });

    const totalFollowers = await prisma.authorSubscription.count({ where: { authorId: userId } });
    const totalSubscriptions = allSubscriptions.length;

    return {
      growthData,
      tierBreakdown,
      totalFollowers,
      totalSubscriptions,
      period,
      days
    };
  };

  fastify.get('/overview/:userId', async (request, reply) => {
    const userId = Number(request.params.userId);
    const currentUserId = request.user?.id;

    const overview = await getOverview(userId, currentUserId);

    if (!overview) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    return { overview };
  });

  fastify.get('/zines/:userId', async (request, reply) => {
    const userId = Number(request.params.userId);
    const { page = 1, limit = 10, sort = 'newest' } = request.query;

    const result = await getZines(userId, page, limit, sort);

    if (!result) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    return result;
  });

  fastify.get('/submissions/:userId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = Number(request.params.userId);
    const isOwner = request.user.id === userId;

    if (!isOwner) {
      return reply.code(403).send({ error: '无权查看他人投稿记录' });
    }

    const { page = 1, limit = 10, status } = request.query;

    const result = await getSubmissions(userId, page, limit, status);

    if (!result) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    return result;
  });

  fastify.get('/likes-stats/:userId', async (request, reply) => {
    const userId = Number(request.params.userId);
    const { period = 'month' } = request.query;

    const result = await getLikesStats(userId, period);

    if (!result) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    return result;
  });

  fastify.get('/subscriber-growth/:userId', async (request, reply) => {
    const userId = Number(request.params.userId);
    const { period = 'month' } = request.query;

    const result = await getSubscriberGrowth(userId, period);

    if (!result) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    return result;
  });

  fastify.get('/my-portfolio', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;

    const [
      overview,
      zinesData,
      likesStats,
      subscriberGrowth
    ] = await Promise.all([
      getOverview(userId, userId),
      getZines(userId, 1, 5, 'newest'),
      getLikesStats(userId, 'month'),
      getSubscriberGrowth(userId, 'month')
    ]);

    return {
      overview,
      recentZines: zinesData?.zines || [],
      likesStats,
      subscriberGrowth
    };
  });
}

module.exports = routes;
