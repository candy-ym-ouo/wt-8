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

  const formatSub = (s) => {
    if (!s) return s;
    return { ...s, images: parseJSONField(s.images, []) };
  };

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 10 } = request.query;
    const skip = (page - 1) * limit;
    const where = { userId: request.user.id };
    if (status) where.status = status;

    const [submissionsData, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.submission.count({ where })
    ]);

    const submissions = submissionsData.map(formatSub);

    return { submissions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { title, content, images } = request.body;

    if (!title || !content) {
      return reply.code(400).send({ error: '标题和内容为必填项' });
    }

    const submission = await prisma.submission.create({
      data: {
        userId: request.user.id,
        title,
        content,
        images: JSON.stringify(images || [])
      }
    });

    await prisma.message.create({
      data: {
        senderId: 1,
        receiverId: request.user.id,
        title: '投稿已收到',
        content: `您的投稿《${title}》已提交，等待编辑审核。我们会尽快处理并通知您结果。`,
        type: 'SYSTEM'
      }
    });

    return { submission: formatSub(submission), message: '投稿成功，等待审核' };
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const submissionData = await prisma.submission.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        user: { select: { id: true, username: true, avatar: true } }
      }
    });

    if (!submissionData) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (submissionData.userId !== request.user.id) {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (user.role !== 'ADMIN') {
        return reply.code(403).send({ error: '无权查看此投稿' });
      }
    }

    return { submission: formatSub(submissionData) };
  });

  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const submission = await prisma.submission.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!submission) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (submission.userId !== request.user.id) {
      return reply.code(403).send({ error: '无权修改此投稿' });
    }

    if (submission.status !== 'PENDING' && submission.status !== 'REJECTED') {
      return reply.code(400).send({ error: '当前状态不可修改' });
    }

    const { title, content, images } = request.body;
    const updateData = {
      title: title || submission.title,
      content: content || submission.content,
      status: 'PENDING'
    };
    if (images !== undefined) updateData.images = JSON.stringify(images);

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: updateData
    });

    return { submission: formatSub(updated), message: '更新成功，已重新提交审核' };
  });
}

module.exports = routes;
