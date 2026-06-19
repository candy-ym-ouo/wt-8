function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return parsed;
  } catch (e) {
    return defaultValue;
  }
}

const formatTopic = (t) => {
  if (!t) return t;
  return {
    ...t,
    tags: parseJSONField(t.tags, []),
    reviewers: parseJSONField(t.reviewers, [])
  };
};

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', async (request) => {
    const { status, category, search, page = 1, limit = 20, featured } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all') where.category = category;
    if (featured !== undefined) where.isFeatured = featured === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [topicsData, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'desc' }
        ],
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          _count: { select: { submissions: true } }
        }
      }),
      prisma.topic.count({ where })
    ]);

    const topics = topicsData.map(formatTopic);
    return { topics, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', async (request, reply) => {
    const topicData = await prisma.topic.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true, avatar: true } },
        _count: { select: { submissions: true, schedules: true } }
      }
    });

    if (!topicData) {
      return reply.code(404).send({ error: '征稿专题不存在' });
    }

    return { topic: formatTopic(topicData) };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (user.role !== 'ADMIN' && user.role !== 'EDITOR') {
      return reply.code(403).send({ error: '无权限创建征稿专题' });
    }

    const {
      title, description, coverImage, content, category,
      tags, deadline, startDate, endDate,
      status = 'DRAFT', isFeatured = false,
      sortOrder = 0, maxSubmissions = 0,
      requirements, prizes, reviewers = []
    } = request.body;

    if (!title || !description || !content || !category) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const topic = await prisma.topic.create({
      data: {
        title,
        description,
        coverImage: coverImage || null,
        content,
        category,
        tags: JSON.stringify(tags || []),
        deadline: deadline ? new Date(deadline) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status,
        isFeatured,
        sortOrder,
        maxSubmissions,
        requirements: requirements || null,
        prizes: prizes || null,
        creatorId: request.user.id,
        reviewers: JSON.stringify(reviewers)
      }
    });

    return { topic: formatTopic(topic), message: '征稿专题创建成功' };
  });

  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const topic = await prisma.topic.findUnique({ where: { id: Number(request.params.id) } });

    if (!topic) {
      return reply.code(404).send({ error: '征稿专题不存在' });
    }

    if (user.role !== 'ADMIN' && user.id !== topic.creatorId) {
      return reply.code(403).send({ error: '无权限编辑此征稿专题' });
    }

    const {
      title, description, coverImage, content, category,
      tags, deadline, startDate, endDate,
      status, isFeatured,
      sortOrder, maxSubmissions,
      requirements, prizes, reviewers
    } = request.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) updateData.status = status;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (maxSubmissions !== undefined) updateData.maxSubmissions = maxSubmissions;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (prizes !== undefined) updateData.prizes = prizes;
    if (reviewers !== undefined) updateData.reviewers = JSON.stringify(reviewers);

    const updated = await prisma.topic.update({
      where: { id: topic.id },
      data: updateData
    });

    return { topic: formatTopic(updated), message: '更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const topic = await prisma.topic.findUnique({ where: { id: Number(request.params.id) } });

    if (!topic) {
      return reply.code(404).send({ error: '征稿专题不存在' });
    }

    if (user.role !== 'ADMIN') {
      return reply.code(403).send({ error: '无权限删除此征稿专题' });
    }

    await prisma.topic.delete({ where: { id: topic.id } });

    return { message: '删除成功' };
  });

  fastify.put('/:id/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const topic = await prisma.topic.findUnique({ where: { id: Number(request.params.id) } });

    if (!topic) {
      return reply.code(404).send({ error: '征稿专题不存在' });
    }

    if (user.role !== 'ADMIN' && user.id !== topic.creatorId) {
      return reply.code(403).send({ error: '无权限操作此征稿专题' });
    }

    const { status } = request.body;
    const validStatuses = ['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      return reply.code(400).send({ error: '无效的状态值' });
    }

    const updated = await prisma.topic.update({
      where: { id: topic.id },
      data: { status }
    });

    return { topic: formatTopic(updated), message: '状态更新成功' };
  });
}

module.exports = routes;
