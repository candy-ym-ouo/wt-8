async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', async (request) => {
    const { topicId, status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (topicId) where.topicId = Number(topicId);
    if (status && status !== 'all') where.status = status;

    const [schedules, total] = await Promise.all([
      prisma.topicSchedule.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ publishDate: 'asc' }],
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

  fastify.get('/:id', async (request, reply) => {
    const schedule = await prisma.topicSchedule.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        topic: { select: { id: true, title: true, status: true } },
        creator: { select: { id: true, username: true, avatar: true } },
        submissions: {
          include: {
            user: { select: { id: true, username: true, avatar: true } }
          }
        }
      }
    });

    if (!schedule) {
      return reply.code(404).send({ error: '排期不存在' });
    }

    return { schedule };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (!['ADMIN', 'EDITOR'].includes(user.role)) {
      return reply.code(403).send({ error: '无权限创建排期' });
    }

    const { topicId, title, description, publishDate, status = 'PENDING' } = request.body;

    if (!topicId || !title || !publishDate) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const topic = await prisma.topic.findUnique({ where: { id: Number(topicId) } });
    if (!topic) {
      return reply.code(404).send({ error: '征稿专题不存在' });
    }

    const schedule = await prisma.topicSchedule.create({
      data: {
        topicId: Number(topicId),
        title,
        description: description || null,
        publishDate: new Date(publishDate),
        status,
        creatorId: request.user.id
      }
    });

    return { schedule, message: '排期创建成功' };
  });

  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const schedule = await prisma.topicSchedule.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!schedule) {
      return reply.code(404).send({ error: '排期不存在' });
    }

    if (!['ADMIN', 'EDITOR'].includes(user.role)) {
      return reply.code(403).send({ error: '无权限编辑此排期' });
    }

    const { title, description, publishDate, status } = request.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (publishDate !== undefined) updateData.publishDate = new Date(publishDate);
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.topicSchedule.update({
      where: { id: schedule.id },
      data: updateData
    });

    return { schedule: updated, message: '更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const schedule = await prisma.topicSchedule.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!schedule) {
      return reply.code(404).send({ error: '排期不存在' });
    }

    if (user.role !== 'ADMIN') {
      return reply.code(403).send({ error: '无权限删除此排期' });
    }

    const hasSubmissions = await prisma.topicSubmission.count({
      where: { scheduleId: schedule.id }
    });
    if (hasSubmissions > 0) {
      return reply.code(400).send({ error: '该排期下还有投稿，无法删除' });
    }

    await prisma.topicSchedule.delete({ where: { id: schedule.id } });

    return { message: '删除成功' };
  });

  fastify.post('/:id/submissions', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (!['ADMIN', 'EDITOR'].includes(user.role)) {
      return reply.code(403).send({ error: '无权限操作' });
    }

    const schedule = await prisma.topicSchedule.findUnique({
      where: { id: Number(request.params.id) },
      include: { topic: true }
    });

    if (!schedule) {
      return reply.code(404).send({ error: '排期不存在' });
    }

    const { submissionIds } = request.body;
    if (!submissionIds || !Array.isArray(submissionIds)) {
      return reply.code(400).send({ error: '请提供投稿ID列表' });
    }

    for (const sid of submissionIds) {
      const submission = await prisma.topicSubmission.findUnique({
        where: { id: Number(sid) }
      });
      if (submission && submission.topicId === schedule.topicId) {
        await prisma.topicSubmission.update({
          where: { id: Number(sid) },
          data: {
            scheduleId: schedule.id,
            status: 'SCHEDULED'
          }
        });
      }
    }

    return { message: '已添加到排期' };
  });

  fastify.delete('/:id/submissions/:submissionId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (!['ADMIN', 'EDITOR'].includes(user.role)) {
      return reply.code(403).send({ error: '无权限操作' });
    }

    const schedule = await prisma.topicSchedule.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!schedule) {
      return reply.code(404).send({ error: '排期不存在' });
    }

    const submission = await prisma.topicSubmission.findUnique({
      where: { id: Number(request.params.submissionId) }
    });

    if (!submission || submission.scheduleId !== schedule.id) {
      return reply.code(404).send({ error: '该投稿不在此排期中' });
    }

    await prisma.topicSubmission.update({
      where: { id: submission.id },
      data: {
        scheduleId: null,
        status: 'APPROVED'
      }
    });

    return { message: '已从排期移除' };
  });

  fastify.put('/:id/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (!['ADMIN', 'EDITOR'].includes(user.role)) {
      return reply.code(403).send({ error: '无权限操作' });
    }

    const schedule = await prisma.topicSchedule.findUnique({
      where: { id: Number(request.params.id) },
      include: { submissions: true }
    });

    if (!schedule) {
      return reply.code(404).send({ error: '排期不存在' });
    }

    const { status } = request.body;
    const validStatuses = ['PENDING', 'PUBLISHED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return reply.code(400).send({ error: '无效的状态值' });
    }

    const updated = await prisma.topicSchedule.update({
      where: { id: schedule.id },
      data: { status }
    });

    if (status === 'PUBLISHED') {
      for (const sub of schedule.submissions) {
        if (sub.status === 'SCHEDULED') {
          await prisma.topicSubmission.update({
            where: { id: sub.id },
            data: { status: 'PUBLISHED' }
          });
          await prisma.message.create({
            data: {
              senderId: request.user.id,
              receiverId: sub.userId,
              title: '投稿已发布',
              content: `您的投稿《${sub.title}》已随排期发布。感谢您的创作！`,
              type: 'TOPIC'
            }
          });
        }
      }
    }

    return { schedule: updated, message: '状态更新成功' };
  });
}

module.exports = routes;
