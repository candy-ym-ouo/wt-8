function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const formatEvent = (e) => {
  if (!e) return e;
  return { ...e, tags: parseJSONField(e.tags, []) };
};

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', async (request) => {
    const { status, category, page = 1, limit = 20, keyword } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    let user = null;
    try {
      const decoded = await request.jwtVerify();
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      }
    } catch (e) {}

    if (!user || user.role === 'USER') {
      where.status = 'PUBLISHED';
    } else if (status && status !== 'all') {
      where.status = status;
    }

    if (category && category !== 'all') where.category = category;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
        { location: { contains: keyword } }
      ];
    }

    const [eventsData, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { startTime: 'desc' }],
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          _count: { select: { registrations: true, checkIns: true } }
        }
      }),
      prisma.event.count({ where })
    ]);

    const events = eventsData.map(e => ({
      ...formatEvent(e),
      registrationCount: e._count.registrations,
      checkInCount: e._count.checkIns
    }));

    return { events, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/featured', async () => {
    const eventsData = await prisma.event.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      take: 5,
      orderBy: [{ sortOrder: 'asc' }, { startTime: 'desc' }],
      include: {
        creator: { select: { id: true, username: true, avatar: true } },
        _count: { select: { registrations: true } }
      }
    });

    const events = eventsData.map(e => ({
      ...formatEvent(e),
      registrationCount: e._count.registrations
    }));

    return { events };
  });

  fastify.get('/:id', async (request, reply) => {
    const eventData = await prisma.event.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true, avatar: true } },
        _count: { select: { registrations: true, checkIns: true } }
      }
    });

    if (!eventData) {
      return reply.code(404).send({ error: '活动不存在' });
    }

    const event = {
      ...formatEvent(eventData),
      registrationCount: eventData._count.registrations,
      checkInCount: eventData._count.checkIns
    };

    let user = null;
    try {
      const decoded = await request.jwtVerify();
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      }
    } catch (e) {}

    if (event.status !== 'PUBLISHED' && (!user || user.role === 'USER')) {
      return reply.code(403).send({ error: '无权查看此活动' });
    }

    if (user && user.role === 'USER') {
      await prisma.event.update({
        where: { id: event.id },
        data: { viewCount: { increment: 1 } }
      });
      event.viewCount += 1;
    }

    let userRegistration = null;
    if (user) {
      userRegistration = await prisma.eventRegistration.findFirst({
        where: { eventId: event.id, userId: user.id }
      });
    }

    return { event, userRegistration };
  });

  fastify.post('/', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const {
      title, description, coverImage, location, address,
      category, tags, startTime, endTime, registrationDeadline,
      maxParticipants, minParticipants, fee, organizer, organizerContact,
      requirements, notice, status, isFeatured, sortOrder
    } = request.body;

    if (!title || !description || !location || !startTime || !endTime) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    if (new Date(startTime) >= new Date(endTime)) {
      return reply.code(400).send({ error: '活动开始时间必须早于结束时间' });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        coverImage: coverImage || null,
        location,
        address: address || null,
        category: category || 'OTHER',
        tags: tags ? JSON.stringify(tags) : '[]',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        maxParticipants: maxParticipants || 0,
        minParticipants: minParticipants || 0,
        fee: fee || 0,
        organizer: organizer || null,
        organizerContact: organizerContact || null,
        requirements: requirements || null,
        notice: notice || null,
        status: status || 'DRAFT',
        isFeatured: isFeatured || false,
        sortOrder: sortOrder || 0,
        creatorId: request.user.id
      }
    });

    return { event: formatEvent(event), message: '活动创建成功' };
  });

  fastify.put('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const event = await prisma.event.findUnique({ where: { id: Number(id) } });

    if (!event) {
      return reply.code(404).send({ error: '活动不存在' });
    }

    const data = request.body;
    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
    if (data.registrationDeadline !== undefined) {
      updateData.registrationDeadline = data.registrationDeadline ? new Date(data.registrationDeadline) : null;
    }
    if (data.maxParticipants !== undefined) updateData.maxParticipants = Number(data.maxParticipants);
    if (data.minParticipants !== undefined) updateData.minParticipants = Number(data.minParticipants);
    if (data.fee !== undefined) updateData.fee = Number(data.fee);
    if (data.organizer !== undefined) updateData.organizer = data.organizer;
    if (data.organizerContact !== undefined) updateData.organizerContact = data.organizerContact;
    if (data.requirements !== undefined) updateData.requirements = data.requirements;
    if (data.notice !== undefined) updateData.notice = data.notice;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
    if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);

    if (updateData.startTime && updateData.endTime) {
      if (new Date(updateData.startTime) >= new Date(updateData.endTime)) {
        return reply.code(400).send({ error: '活动开始时间必须早于结束时间' });
      }
    }

    const updated = await prisma.event.update({
      where: { id: Number(id) },
      data: updateData
    });

    return { event: formatEvent(updated), message: '活动更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const event = await prisma.event.findUnique({ where: { id: Number(id) } });

    if (!event) {
      return reply.code(404).send({ error: '活动不存在' });
    }

    await prisma.eventCheckIn.deleteMany({ where: { eventId: Number(id) } });
    await prisma.eventRegistration.deleteMany({ where: { eventId: Number(id) } });
    await prisma.event.delete({ where: { id: Number(id) } });

    return { message: '活动删除成功' };
  });

  fastify.post('/:id/publish', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const event = await prisma.event.findUnique({ where: { id: Number(id) } });

    if (!event) {
      return reply.code(404).send({ error: '活动不存在' });
    }

    if (event.status === 'PUBLISHED') {
      return reply.code(400).send({ error: '活动已发布' });
    }

    const updated = await prisma.event.update({
      where: { id: Number(id) },
      data: { status: 'PUBLISHED' }
    });

    return { event: formatEvent(updated), message: '活动发布成功' };
  });

  fastify.post('/:id/unpublish', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const event = await prisma.event.findUnique({ where: { id: Number(id) } });

    if (!event) {
      return reply.code(404).send({ error: '活动不存在' });
    }

    if (event.status !== 'PUBLISHED') {
      return reply.code(400).send({ error: '活动当前不是发布状态' });
    }

    const updated = await prisma.event.update({
      where: { id: Number(id) },
      data: { status: 'DRAFT' }
    });

    return { event: formatEvent(updated), message: '活动已下架' };
  });
}

module.exports = routes;
