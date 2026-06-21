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

  const formatSub = (s) => {
    if (!s) return s;
    return { ...s, images: parseJSONField(s.images, []) };
  };

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 10 } = request.query;
    const skip = (page - 1) * limit;
    const where = { userId: request.user.id };
    if (status && status !== 'all') where.status = status;

    const [submissionsData, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.submission.count({ where })
    ]);

    const submissions = submissionsData.map(formatSub);

    return { submissions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const statuses = ['DRAFT', 'PENDING', 'SCHEDULED', 'APPROVED', 'REJECTED', 'WITHDRAWN'];
    const counts = {};
    
    for (const status of statuses) {
      counts[status] = await prisma.submission.count({
        where: { userId, status }
      });
    }
    
    return { counts };
  });

  fastify.post('/draft', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { title, content, images, id, autoSaveEnabled } = request.body;

    if (id) {
      const existing = await prisma.submission.findUnique({
        where: { id: Number(id) }
      });

      if (!existing) {
        return reply.code(404).send({ error: '草稿不存在' });
      }

      if (existing.userId !== request.user.id) {
        return reply.code(403).send({ error: '无权修改此草稿' });
      }

      const updated = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          title: title || existing.title,
          content: content || existing.content,
          images: images !== undefined ? JSON.stringify(images) : existing.images,
          status: existing.status === 'DRAFT' ? 'DRAFT' : existing.status,
          lastSavedAt: new Date(),
          version: { increment: 1 },
          autoSaveEnabled: autoSaveEnabled !== undefined ? autoSaveEnabled : existing.autoSaveEnabled
        }
      });

      return { submission: formatSub(updated), message: '草稿已保存' };
    }

    const submission = await prisma.submission.create({
      data: {
        userId: request.user.id,
        title: title || '未命名草稿',
        content: content || '',
        images: JSON.stringify(images || []),
        status: 'DRAFT',
        lastSavedAt: new Date(),
        autoSaveEnabled: autoSaveEnabled !== undefined ? autoSaveEnabled : true
      }
    });

    return { submission: formatSub(submission), message: '草稿已保存' };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { title, content, images, scheduledAt } = request.body;

    if (!title || !content) {
      return reply.code(400).send({ error: '标题和内容为必填项' });
    }

    let status = 'PENDING';
    let scheduledAtDate = null;

    if (scheduledAt) {
      const scheduleTime = new Date(scheduledAt);
      if (scheduleTime <= new Date()) {
        return reply.code(400).send({ error: '定时发布时间必须晚于当前时间' });
      }
      status = 'SCHEDULED';
      scheduledAtDate = scheduleTime;
    }

    const submission = await prisma.submission.create({
      data: {
        userId: request.user.id,
        title,
        content,
        images: JSON.stringify(images || []),
        status,
        scheduledAt: scheduledAtDate,
        lastSavedAt: new Date()
      }
    });

    await prisma.message.create({
      data: {
        senderId: 1,
        receiverId: request.user.id,
        title: scheduledAtDate ? '投稿已定时提交' : '投稿已收到',
        content: scheduledAtDate
          ? `您的投稿《${title}》已定时提交，将于 ${scheduleTime.toLocaleString('zh-CN')} 进入审核队列。`
          : `您的投稿《${title}》已提交，等待编辑审核。我们会尽快处理并通知您结果。`,
        type: 'SYSTEM'
      }
    });

    if (status === 'PENDING') {
      await triggerGrowthEvent(prisma, request.user.id, 'SUBMISSION_CREATED', {
        sourceId: submission.id
      });
    }

    return { submission: formatSub(submission), message: scheduledAtDate ? '定时提交成功' : '投稿成功，等待审核' };
  });

  fastify.post('/:id/submit', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const submission = await prisma.submission.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!submission) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (submission.userId !== request.user.id) {
      return reply.code(403).send({ error: '无权操作此投稿' });
    }

    if (submission.status !== 'DRAFT' && submission.status !== 'REJECTED' && submission.status !== 'WITHDRAWN') {
      return reply.code(400).send({ error: '当前状态不可提交' });
    }

    const { title, content, images, scheduledAt } = request.body;

    if (!title && !submission.title) {
      return reply.code(400).send({ error: '标题为必填项' });
    }
    if (!content && !submission.content) {
      return reply.code(400).send({ error: '内容为必填项' });
    }

    let status = 'PENDING';
    let scheduledAtDate = null;

    if (scheduledAt) {
      const scheduleTime = new Date(scheduledAt);
      if (scheduleTime <= new Date()) {
        return reply.code(400).send({ error: '定时发布时间必须晚于当前时间' });
      }
      status = 'SCHEDULED';
      scheduledAtDate = scheduleTime;
    }

    const finalTitle = title || submission.title;
    const finalContent = content || submission.content;
    const finalImages = images !== undefined ? JSON.stringify(images) : submission.images;

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        title: finalTitle,
        content: finalContent,
        images: finalImages,
        status,
        scheduledAt: scheduledAtDate,
        withdrawnAt: null,
        rejectionReason: null,
        reviewerId: null,
        reviewedAt: null,
        lastSavedAt: new Date(),
        version: { increment: 1 }
      }
    });

    await prisma.message.create({
      data: {
        senderId: 1,
        receiverId: request.user.id,
        title: scheduledAtDate ? '投稿已定时提交' : '投稿已提交',
        content: scheduledAtDate
          ? `您的投稿《${finalTitle}》已定时提交，将于 ${scheduleTime.toLocaleString('zh-CN')} 进入审核队列。`
          : `您的投稿《${finalTitle}》已提交，等待编辑审核。`,
        type: 'SYSTEM'
      }
    });

    if (status === 'PENDING') {
      await triggerGrowthEvent(prisma, request.user.id, 'SUBMISSION_CREATED', {
        sourceId: submission.id
      });
    }

    return { submission: formatSub(updated), message: scheduledAtDate ? '定时提交成功' : '提交成功，等待审核' };
  });

  fastify.post('/:id/withdraw', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const submission = await prisma.submission.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!submission) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (submission.userId !== request.user.id) {
      return reply.code(403).send({ error: '无权操作此投稿' });
    }

    if (submission.status !== 'PENDING' && submission.status !== 'SCHEDULED') {
      return reply.code(400).send({ error: '当前状态不可撤回' });
    }

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
        scheduledAt: null,
        lastSavedAt: new Date(),
        version: { increment: 1 }
      }
    });

    await prisma.message.create({
      data: {
        senderId: 1,
        receiverId: request.user.id,
        title: '投稿已撤回',
        content: `您的投稿《${submission.title}》已成功撤回。您可以修改后重新提交。`,
        type: 'SYSTEM'
      }
    });

    return { submission: formatSub(updated), message: '撤回成功' };
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

    const { title, content, images } = request.body;
    const updateData = {
      title: title || submission.title,
      content: content || submission.content,
      lastSavedAt: new Date(),
      version: { increment: 1 }
    };
    if (images !== undefined) updateData.images = JSON.stringify(images);

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: updateData
    });

    return { submission: formatSub(updated), message: '更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const submission = await prisma.submission.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!submission) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (submission.userId !== request.user.id) {
      return reply.code(403).send({ error: '无权删除此投稿' });
    }

    if (submission.status === 'APPROVED') {
      return reply.code(400).send({ error: '已发布的投稿无法删除' });
    }

    await prisma.submission.delete({
      where: { id: submission.id }
    });

    return { message: '删除成功' };
  });
}

module.exports = routes;
