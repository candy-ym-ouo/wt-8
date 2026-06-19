const { triggerGrowthEvent } = require('../utils/growthTrigger');

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, eventId, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });

    const where = {};
    if (user.role === 'USER') {
      where.userId = request.user.id;
    }
    if (status && status !== 'all') where.status = status;
    if (eventId) where.eventId = Number(eventId);

    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          event: { select: { id: true, title: true, startTime: true, location: true, status: true } },
          checkIn: true
        }
      }),
      prisma.eventRegistration.count({ where })
    ]);

    return { registrations, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        event: { select: { id: true, title: true, startTime: true, endTime: true, location: true, address: true, status: true } },
        checkIn: true,
        reviewer: { select: { id: true, username: true } }
      }
    });

    if (!registration) {
      return reply.code(404).send({ error: '报名记录不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (registration.userId !== request.user.id && user.role === 'USER') {
      return reply.code(403).send({ error: '无权查看此报名记录' });
    }

    return { registration };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { eventId, name, phone, email, company, note } = request.body;

    if (!eventId || !name || !phone) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const event = await prisma.event.findUnique({ where: { id: Number(eventId) } });
    if (!event) {
      return reply.code(404).send({ error: '活动不存在' });
    }

    if (event.status !== 'PUBLISHED') {
      return reply.code(400).send({ error: '该活动当前不可报名' });
    }

    if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
      return reply.code(400).send({ error: '报名截止时间已过' });
    }

    if (new Date(event.startTime) < new Date()) {
      return reply.code(400).send({ error: '活动已开始，无法报名' });
    }

    const existing = await prisma.eventRegistration.findFirst({
      where: { eventId: Number(eventId), userId: request.user.id }
    });
    if (existing) {
      return reply.code(400).send({ error: '您已报名此活动' });
    }

    if (event.maxParticipants > 0) {
      const approvedCount = await prisma.eventRegistration.count({
        where: { eventId: Number(eventId), status: 'APPROVED' }
      });
      if (approvedCount >= event.maxParticipants) {
        return reply.code(400).send({ error: '活动名额已满' });
      }
    }

    const registration = await prisma.eventRegistration.create({
      data: {
        eventId: Number(eventId),
        userId: request.user.id,
        name,
        phone,
        email: email || null,
        company: company || null,
        note: note || null
      }
    });

    await prisma.message.create({
      data: {
        senderId: 1,
        receiverId: request.user.id,
        title: '活动报名已提交',
        content: `您已成功提交《${event.title}》的报名申请，等待管理员审核。我们会尽快处理并通知您审核结果。\n\n活动时间：${event.startTime.toLocaleString('zh-CN')}\n活动地点：${event.location}`,
        type: 'EVENT'
      }
    });

    return { registration, message: '报名成功，等待审核' };
  });

  fastify.put('/:id/cancel', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: Number(request.params.id) },
      include: { event: true }
    });

    if (!registration) {
      return reply.code(404).send({ error: '报名记录不存在' });
    }

    if (registration.userId !== request.user.id) {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (user.role === 'USER') {
        return reply.code(403).send({ error: '无权取消此报名' });
      }
    }

    if (registration.status === 'CANCELLED') {
      return reply.code(400).send({ error: '报名已取消' });
    }

    if (registration.checkIn) {
      return reply.code(400).send({ error: '已签到，无法取消报名' });
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { status: 'CANCELLED' }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: registration.userId,
        title: '活动报名已取消',
        content: `您已取消《${registration.event.title}》的报名。如有疑问可联系活动组织者。`,
        type: 'EVENT'
      }
    });

    return { registration: updated, message: '报名已取消' };
  });

  fastify.post('/:id/review', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: Number(request.params.id) },
      include: { event: true, user: true }
    });

    if (!registration) {
      return reply.code(404).send({ error: '报名记录不存在' });
    }

    if (registration.status !== 'PENDING') {
      return reply.code(400).send({ error: '该报名当前状态不可审核' });
    }

    const { action, reason } = request.body;

    if (action === 'APPROVE') {
      if (registration.event.maxParticipants > 0) {
        const approvedCount = await prisma.eventRegistration.count({
          where: {
            eventId: registration.eventId,
            status: 'APPROVED',
            NOT: { id: registration.id }
          }
        });
        if (approvedCount >= registration.event.maxParticipants) {
          return reply.code(400).send({ error: '活动名额已满，无法通过审核' });
        }
      }

      const updated = await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          status: 'APPROVED',
          reviewerId: request.user.id,
          reviewedAt: new Date()
        }
      });

      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: registration.userId,
          title: '活动报名已通过审核',
          content: `恭喜！您报名的《${registration.event.title}》已通过审核。\n\n活动时间：${registration.event.startTime.toLocaleString('zh-CN')} - ${registration.event.endTime.toLocaleString('zh-CN')}\n活动地点：${registration.event.location}${registration.event.address ? '(' + registration.event.address + ')' : ''}\n\n请准时参加，期待与您相见！`,
          type: 'EVENT'
        }
      });

      await triggerGrowthEvent(prisma, registration.userId, 'EVENT_REGISTERED', {
        sourceId: registration.eventId
      });

      return { registration: updated, message: '审核通过' };
    } else if (action === 'REJECT') {
      const updated = await prisma.eventRegistration.update({
        where: { id: registration.id },
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
          receiverId: registration.userId,
          title: '活动报名未通过审核',
          content: `很遗憾，您报名的《${registration.event.title}》未通过审核。${reason ? '原因：' + reason : '如有疑问可联系活动组织者。'}`,
          type: 'EVENT'
        }
      });

      return { registration: updated, message: '已驳回' };
    } else {
      return reply.code(400).send({ error: '无效的审核操作' });
    }
  });

  fastify.delete('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: Number(request.params.id) },
      include: { checkIn: true }
    });

    if (!registration) {
      return reply.code(404).send({ error: '报名记录不存在' });
    }

    if (registration.checkIn) {
      await prisma.eventCheckIn.delete({ where: { id: registration.checkIn.id } });
    }
    await prisma.eventRegistration.delete({ where: { id: registration.id } });

    return { message: '删除成功' };
  });
}

module.exports = routes;
