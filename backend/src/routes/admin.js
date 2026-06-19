function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const { triggerGrowthEvent } = require('../utils/growthTrigger');

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.addHook('onRequest', fastify.adminOnly);

  const formatZine = (z) => z ? { ...z, tags: parseJSONField(z.tags, []) } : z;
  const formatSub = (s) => s ? { ...s, images: parseJSONField(s.images, []) } : s;

  fastify.get('/stats', async () => {
    const [totalUsers, totalZines, totalSubmissions, pendingSubmissions, totalSubscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.zine.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: 'PENDING' } }),
      prisma.subscription.count()
    ]);

    const recentSubsData = await prisma.submission.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, username: true, avatar: true } } }
    });
    const recentSubmissions = recentSubsData.map(formatSub);

    return {
      stats: { totalUsers, totalZines, totalSubmissions, pendingSubmissions, totalSubscriptions },
      recentSubmissions
    };
  });

  fastify.get('/submissions', async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (status && status !== 'all') where.status = status;

    const [subsData, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, avatar: true } } }
      }),
      prisma.submission.count({ where })
    ]);

    const submissions = subsData.map(formatSub);
    return { submissions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/submissions/:id/approve', async (request, reply) => {
    const submission = await prisma.submission.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!submission) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (submission.status !== 'PENDING') {
      return reply.code(400).send({ error: '该投稿当前状态不可审核' });
    }

    const { category, tags, description } = request.body;
    const subImages = parseJSONField(submission.images, []);

    const zine = await prisma.zine.create({
      data: {
        title: submission.title,
        description: description || submission.content.substring(0, 200),
        coverImage: subImages[0] || `https://picsum.photos/seed/zine${submission.id}/400/560`,
        content: submission.content,
        authorId: submission.userId,
        category: category || '文学',
        tags: JSON.stringify(tags || [])
      }
    });

    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: 'APPROVED',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: submission.userId,
        title: '投稿已通过审核',
        content: `恭喜！您的投稿《${submission.title}》已通过审核并发布。感谢您的创作！`,
        type: 'SYSTEM'
      }
    });

    await triggerGrowthEvent(prisma, submission.userId, 'SUBMISSION_APPROVED', {
      sourceId: zine.id
    });
    await triggerGrowthEvent(prisma, submission.userId, 'ZINE_CREATED', {
      sourceId: zine.id
    });

    return { zine: formatZine(zine), message: '审核通过，已发布' };
  });

  fastify.post('/submissions/:id/reject', async (request, reply) => {
    const submission = await prisma.submission.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!submission) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (submission.status !== 'PENDING') {
      return reply.code(400).send({ error: '该投稿当前状态不可审核' });
    }

    const { reason } = request.body;

    await prisma.submission.update({
      where: { id: submission.id },
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
        receiverId: submission.userId,
        title: '投稿审核未通过',
        content: `您的投稿《${submission.title}》未通过审核。${reason ? '原因：' + reason : '如有疑问，可修改后重新投稿。'}\n\n继续创作，感谢支持！`,
        type: 'SYSTEM'
      }
    });

    return { message: '已驳回' };
  });

  fastify.get('/users', async (request) => {
    const { page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              submissions: true,
              subscriptions: true
            }
          }
        }
      }),
      prisma.user.count()
    ]);

    return { users, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.put('/users/:id/role', async (request, reply) => {
    const { role } = request.body;
    const user = await prisma.user.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role }
    });

    return { user: { id: updated.id, role: updated.role } };
  });

  fastify.get('/zines', async (request) => {
    const { page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;

    const [zinesData, total] = await Promise.all([
      prisma.zine.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true } }
        }
      }),
      prisma.zine.count()
    ]);

    const zines = zinesData.map(formatZine);
    return { zines, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.delete('/zines/:id', async (request, reply) => {
    const zine = await prisma.zine.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!zine) {
      return reply.code(404).send({ error: '刊物不存在' });
    }

    await prisma.subscription.deleteMany({ where: { zineId: zine.id } });
    await prisma.zine.delete({ where: { id: zine.id } });

    return { message: '已删除' };
  });

  fastify.get('/topics/stats', async () => {
    const [
      totalTopics, activeTopics, draftTopics, closedTopics,
      totalTopicSubmissions, pendingTopicSubs, approvedTopicSubs,
      rejectedTopicSubs, scheduledTopicSubs, publishedTopicSubs,
      totalSchedules, activeSchedules, publishedSchedules,
      totalFeatured
    ] = await Promise.all([
      prisma.topic.count(),
      prisma.topic.count({ where: { status: 'ACTIVE' } }),
      prisma.topic.count({ where: { status: 'DRAFT' } }),
      prisma.topic.count({ where: { status: 'CLOSED' } }),
      prisma.topicSubmission.count(),
      prisma.topicSubmission.count({ where: { status: 'PENDING' } }),
      prisma.topicSubmission.count({ where: { status: 'APPROVED' } }),
      prisma.topicSubmission.count({ where: { status: 'REJECTED' } }),
      prisma.topicSubmission.count({ where: { status: 'SCHEDULED' } }),
      prisma.topicSubmission.count({ where: { status: 'PUBLISHED' } }),
      prisma.topicSchedule.count(),
      prisma.topicSchedule.count({ where: { status: 'PENDING' } }),
      prisma.topicSchedule.count({ where: { status: 'PUBLISHED' } }),
      prisma.featuredTopic.count({ where: { isActive: true } })
    ]);

    const topicStats = await prisma.topic.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { submissions: true, schedules: true } },
        creator: { select: { id: true, username: true } }
      }
    });

    return {
      stats: {
        totalTopics, activeTopics, draftTopics, closedTopics,
        totalTopicSubmissions, pendingTopicSubs, approvedTopicSubs,
        rejectedTopicSubs, scheduledTopicSubs, publishedTopicSubs,
        totalSchedules, activeSchedules, publishedSchedules,
        totalFeatured
      },
      topicStats
    };
  });

  fastify.get('/topics/report', async (request) => {
    const { topicId, startDate, endDate } = request.query;
    const where = {};

    if (topicId) where.topicId = Number(topicId);
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

    const submissions = await prisma.topicSubmission.findMany({
      where,
      include: {
        user: { select: { id: true, username: true } },
        topic: { select: { id: true, title: true } },
        reviewer: { select: { id: true, username: true } },
        schedule: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const statusCounts = {
      PENDING: 0, APPROVED: 0, REJECTED: 0, SCHEDULED: 0, PUBLISHED: 0
    };
    submissions.forEach(s => {
      if (statusCounts[s.status] !== undefined) statusCounts[s.status]++;
    });

    return { submissions, statusCounts, total: submissions.length };
  });

  fastify.get('/topics/submissions', async (request) => {
    const { status, topicId, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;
    if (topicId) where.topicId = Number(topicId);

    const [subsData, total] = await Promise.all([
      prisma.topicSubmission.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          topic: { select: { id: true, title: true } },
          reviewer: { select: { id: true, username: true } },
          schedule: { select: { id: true, title: true } }
        }
      }),
      prisma.topicSubmission.count({ where })
    ]);

    const submissions = subsData.map(s => ({ ...s, images: parseJSONField(s.images, []) }));
    return { submissions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/topics', async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, username: true } },
          _count: { select: { submissions: true, schedules: true } }
        }
      }),
      prisma.topic.count({ where })
    ]);

    return { topics, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/schedules', async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;

    const [schedules, total] = await Promise.all([
      prisma.topicSchedule.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { publishDate: 'desc' },
        include: {
          topic: { select: { id: true, title: true } },
          creator: { select: { id: true, username: true } },
          _count: { select: { submissions: true } }
        }
      }),
      prisma.topicSchedule.count({ where })
    ]);

    return { schedules, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });
}

module.exports = routes;
