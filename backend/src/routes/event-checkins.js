const { triggerGrowthEvent } = require('../utils/growthTrigger');

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { eventId, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (eventId) where.eventId = Number(eventId);

    const [checkIns, total] = await Promise.all([
      prisma.eventCheckIn.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { checkInTime: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          event: { select: { id: true, title: true } },
          registration: { select: { id: true, name: true, phone: true, status: true } }
        }
      }),
      prisma.eventCheckIn.count({ where })
    ]);

    return { checkIns, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/event/:eventId', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const event = await prisma.event.findUnique({
      where: { id: Number(request.params.eventId) }
    });

    if (!event) {
      return reply.code(404).send({ error: '活动不存在' });
    }

    const checkIns = await prisma.eventCheckIn.findMany({
      where: { eventId: event.id },
      orderBy: { checkInTime: 'asc' },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        registration: { select: { id: true, name: true, phone: true, email: true, company: true } }
      }
    });

    const approvedRegistrations = await prisma.eventRegistration.findMany({
      where: { eventId: event.id, status: 'APPROVED' },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        checkIn: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const checkedInIds = new Set(checkIns.map(c => c.registrationId));
    const notCheckedIn = approvedRegistrations.filter(r => !checkedInIds.has(r.id));

    return {
      checkIns,
      checkedInCount: checkIns.length,
      approvedCount: approvedRegistrations.length,
      notCheckedIn
    };
  });

  fastify.get('/my/:eventId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const eventId = Number(request.params.eventId);
    const checkIn = await prisma.eventCheckIn.findFirst({
      where: { eventId, userId: request.user.id },
      include: {
        event: { select: { id: true, title: true } },
        registration: { select: { id: true, name: true, phone: true } }
      }
    });

    return { checkIn };
  });

  fastify.post('/registration/:registrationId', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { checkInType, remark } = request.body;

    const registration = await prisma.eventRegistration.findUnique({
      where: { id: Number(request.params.registrationId) },
      include: { event: true, checkIn: true }
    });

    if (!registration) {
      return reply.code(404).send({ error: '报名记录不存在' });
    }

    if (registration.status !== 'APPROVED') {
      return reply.code(400).send({ error: '该报名尚未通过审核，无法签到' });
    }

    if (registration.checkIn) {
      return reply.code(400).send({ error: '已签到，请勿重复操作' });
    }

    if (new Date(registration.event.endTime) < new Date()) {
      return reply.code(400).send({ error: '活动已结束，无法签到' });
    }

    const checkIn = await prisma.eventCheckIn.create({
      data: {
        eventId: registration.eventId,
        registrationId: registration.id,
        userId: registration.userId,
        checkInType: checkInType || 'QRCODE',
        operatorId: request.user.id,
        remark: remark || null
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: registration.userId,
        title: '活动签到成功',
        content: `您已成功签到《${registration.event.title}》，祝您活动愉快！`,
        type: 'EVENT'
      }
    });

    await triggerGrowthEvent(prisma, registration.userId, 'EVENT_ATTENDED', {
      sourceId: registration.eventId
    });

    return { checkIn, message: '签到成功' };
  });

  fastify.post('/qr/:eventId/:userId', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const eventId = Number(request.params.eventId);
    const userId = Number(request.params.userId);
    const { remark } = request.body;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return reply.code(404).send({ error: '活动不存在' });
    }

    const registration = await prisma.eventRegistration.findFirst({
      where: { eventId, userId },
      include: { checkIn: true }
    });

    if (!registration) {
      return reply.code(404).send({ error: '未找到该用户的报名记录' });
    }

    if (registration.status !== 'APPROVED') {
      return reply.code(400).send({ error: '报名尚未通过审核，无法签到' });
    }

    if (registration.checkIn) {
      return reply.code(400).send({ error: '已签到，请勿重复操作' });
    }

    if (new Date(event.endTime) < new Date()) {
      return reply.code(400).send({ error: '活动已结束，无法签到' });
    }

    const checkIn = await prisma.eventCheckIn.create({
      data: {
        eventId,
        registrationId: registration.id,
        userId,
        checkInType: 'QRCODE',
        operatorId: request.user.id,
        remark: remark || null
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: userId,
        title: '活动签到成功',
        content: `您已成功签到《${event.title}》，祝您活动愉快！`,
        type: 'EVENT'
      }
    });

    await triggerGrowthEvent(prisma, userId, 'EVENT_ATTENDED', { sourceId: eventId });

    return { checkIn, registration, message: '签到成功' };
  });

  fastify.post('/batch/:eventId', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const eventId = Number(request.params.eventId);
    const { registrationIds } = request.body;

    if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return reply.code(400).send({ error: '请选择要签到的报名记录' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return reply.code(404).send({ error: '活动不存在' });
    }

    if (new Date(event.endTime) < new Date()) {
      return reply.code(400).send({ error: '活动已结束，无法签到' });
    }

    const registrations = await prisma.eventRegistration.findMany({
      where: {
        id: { in: registrationIds.map(Number) },
        eventId,
        status: 'APPROVED'
      },
      include: { checkIn: true }
    });

    const toCheckIn = registrations.filter(r => !r.checkIn);
    let successCount = 0;
    const errors = [];

    for (const reg of toCheckIn) {
      try {
        await prisma.eventCheckIn.create({
          data: {
            eventId,
            registrationId: reg.id,
            userId: reg.userId,
            checkInType: 'BATCH',
            operatorId: request.user.id
          }
        });
        successCount++;

        await prisma.message.create({
          data: {
            senderId: request.user.id,
            receiverId: reg.userId,
            title: '活动签到成功',
            content: `您已成功签到《${event.title}》，祝您活动愉快！`,
            type: 'EVENT'
          }
        });

        await triggerGrowthEvent(prisma, reg.userId, 'EVENT_ATTENDED', { sourceId: eventId });
      } catch (e) {
        errors.push(`ID ${reg.id}: ${e.message}`);
      }
    }

    return {
      successCount,
      total: registrationIds.length,
      skipped: registrationIds.length - toCheckIn.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `批量签到完成，成功 ${successCount} 条`
    };
  });

  fastify.delete('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const checkIn = await prisma.eventCheckIn.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!checkIn) {
      return reply.code(404).send({ error: '签到记录不存在' });
    }

    await prisma.eventCheckIn.delete({ where: { id: checkIn.id } });

    return { message: '签到记录已删除' };
  });

  fastify.post('/self/:eventId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const eventId = Number(request.params.eventId);
    const userId = request.user.id;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return reply.code(404).send({ error: '活动不存在' });
    }

    const registration = await prisma.eventRegistration.findFirst({
      where: { eventId, userId },
      include: { checkIn: true }
    });

    if (!registration) {
      return reply.code(404).send({ error: '未找到报名记录' });
    }

    if (registration.status !== 'APPROVED') {
      return reply.code(400).send({ error: '报名尚未通过审核' });
    }

    if (registration.checkIn) {
      return reply.code(400).send({ error: '已签到' });
    }

    const now = new Date();
    const startCheckIn = new Date(event.startTime.getTime() - 30 * 60 * 1000);
    if (now < startCheckIn) {
      return reply.code(400).send({ error: '签到尚未开始，请在活动开始前30分钟内签到' });
    }

    if (now > new Date(event.endTime)) {
      return reply.code(400).send({ error: '活动已结束' });
    }

    const checkIn = await prisma.eventCheckIn.create({
      data: {
        eventId,
        registrationId: registration.id,
        userId,
        checkInType: 'SELF'
      }
    });

    await prisma.message.create({
      data: {
        senderId: 1,
        receiverId: userId,
        title: '活动签到成功',
        content: `您已成功签到《${event.title}》，祝您活动愉快！`,
        type: 'EVENT'
      }
    });

    await triggerGrowthEvent(prisma, userId, 'EVENT_ATTENDED', { sourceId: eventId });

    return { checkIn, message: '签到成功' };
  });
}

module.exports = routes;
