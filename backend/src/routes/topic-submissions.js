function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const formatSubmission = (s) => {
  if (!s) return s;
  return { ...s, images: parseJSONField(s.images, []) };
};

const { triggerGrowthEvent } = require('../utils/growthTrigger');

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, topicId, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });

    const where = {};
    if (user.role === 'USER') {
      where.userId = request.user.id;
    }
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
          topic: { select: { id: true, title: true, status: true } },
          reviewer: { select: { id: true, username: true } },
          schedule: { select: { id: true, title: true, publishDate: true } }
        }
      }),
      prisma.topicSubmission.count({ where })
    ]);

    const submissions = subsData.map(formatSubmission);
    return { submissions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const submissionData = await prisma.topicSubmission.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        topic: { select: { id: true, title: true, status: true } },
        reviewer: { select: { id: true, username: true } },
        schedule: { select: { id: true, title: true, publishDate: true } }
      }
    });

    if (!submissionData) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (submissionData.userId !== request.user.id && user.role === 'USER') {
      return reply.code(403).send({ error: '无权查看此投稿' });
    }

    return { submission: formatSubmission(submissionData) };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { topicId, title, content, images } = request.body;

    if (!topicId || !title || !content) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const topic = await prisma.topic.findUnique({ where: { id: Number(topicId) } });
    if (!topic) {
      return reply.code(404).send({ error: '征稿专题不存在' });
    }

    if (topic.status !== 'ACTIVE') {
      return reply.code(400).send({ error: '该专题当前不可投稿' });
    }

    if (topic.deadline && new Date(topic.deadline) < new Date()) {
      return reply.code(400).send({ error: '投稿截止时间已过' });
    }

    if (topic.maxSubmissions > 0) {
      const subCount = await prisma.topicSubmission.count({ where: { topicId: Number(topicId) } });
      if (subCount >= topic.maxSubmissions) {
        return reply.code(400).send({ error: '该专题投稿数量已达上限' });
      }
    }

    const existing = await prisma.topicSubmission.findFirst({
      where: { topicId: Number(topicId), userId: request.user.id }
    });
    if (existing) {
      return reply.code(400).send({ error: '您已在该专题投过稿' });
    }

    const submission = await prisma.topicSubmission.create({
      data: {
        topicId: Number(topicId),
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
        title: '专题投稿已收到',
        content: `您的投稿《${title}》已提交至《${topic.title}》专题，等待编辑审核。我们会尽快处理并通知您结果。`,
        type: 'TOPIC'
      }
    });

    await triggerGrowthEvent(prisma, request.user.id, 'TOPIC_SUBMISSION_CREATED', {
      sourceId: submission.id
    });

    return { submission: formatSubmission(submission), message: '投稿成功，等待审核' };
  });

  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const submission = await prisma.topicSubmission.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!submission) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (submission.userId !== request.user.id) {
      return reply.code(403).send({ error: '无权修改此投稿' });
    }

    if (!['PENDING', 'REJECTED'].includes(submission.status)) {
      return reply.code(400).send({ error: '当前状态不可修改' });
    }

    const { title, content, images } = request.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (images !== undefined) updateData.images = JSON.stringify(images);
    updateData.status = 'PENDING';

    const updated = await prisma.topicSubmission.update({
      where: { id: submission.id },
      data: updateData
    });

    return { submission: formatSubmission(updated), message: '更新成功，已重新提交审核' };
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const submission = await prisma.topicSubmission.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!submission) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (submission.userId !== request.user.id && user.role === 'USER') {
      return reply.code(403).send({ error: '无权删除此投稿' });
    }

    if (submission.status === 'APPROVED' || submission.status === 'SCHEDULED') {
      return reply.code(400).send({ error: '已审核通过的投稿不可删除' });
    }

    await prisma.topicSubmission.delete({ where: { id: submission.id } });

    return { message: '删除成功' };
  });

  fastify.post('/:id/review', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (!['ADMIN', 'EDITOR'].includes(user.role)) {
      return reply.code(403).send({ error: '无权限审核投稿' });
    }

    const submission = await prisma.topicSubmission.findUnique({
      where: { id: Number(request.params.id) },
      include: { topic: true, user: true }
    });

    if (!submission) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (submission.status !== 'PENDING') {
      return reply.code(400).send({ error: '该投稿当前状态不可审核' });
    }

    const { action, reason, scheduleId } = request.body;

    if (action === 'APPROVE') {
      const data = {
        status: scheduleId ? 'SCHEDULED' : 'APPROVED',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      };
      if (scheduleId) data.scheduleId = Number(scheduleId);

      const updated = await prisma.topicSubmission.update({
        where: { id: submission.id },
        data
      });

      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: submission.userId,
          title: '专题投稿已通过审核',
          content: `恭喜！您在《${submission.topic.title}》的投稿《${submission.title}》已通过审核${scheduleId ? '并已排期发布' : ''}。感谢您的创作！`,
          type: 'TOPIC'
        }
      });

      await triggerGrowthEvent(prisma, submission.userId, 'SUBMISSION_APPROVED', {
        sourceId: submission.id
      });

      return { submission: formatSubmission(updated), message: '审核通过' };
    } else if (action === 'REJECT') {
      const updated = await prisma.topicSubmission.update({
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
          title: '专题投稿审核未通过',
          content: `您在《${submission.topic.title}》的投稿《${submission.title}》未通过审核。${reason ? '原因：' + reason : '如有疑问，可修改后重新投稿。'}`,
          type: 'TOPIC'
        }
      });

      return { submission: formatSubmission(updated), message: '已驳回' };
    } else {
      return reply.code(400).send({ error: '无效的审核操作' });
    }
  });
}

module.exports = routes;
