async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { eventType, status, search, page = 1, limit = 20 } = request.query;
    const where = {};

    if (eventType && eventType !== 'all') where.eventType = eventType;
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.title = { contains: search };
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      prisma.creationCalendar.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ sortOrder: 'asc' }, { startDate: 'asc' }],
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          _count: { select: { subscriptions: true, reminders: true } }
        }
      }),
      prisma.creationCalendar.count({ where })
    ]);

    return { events, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const {
      title, description, eventType = 'SCHEDULE',
      startDate, endDate, color = '#d4624a',
      status = 'ACTIVE', isAllDay = true,
      reminderEnabled = false, reminderMinutes = 30,
      linkType, linkId, sortOrder = 0
    } = request.body;

    if (!title || !startDate) {
      return reply.code(400).send({ error: '请填写标题和开始日期' });
    }

    const event = await prisma.creationCalendar.create({
      data: {
        title,
        description: description || null,
        eventType,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        color,
        status,
        isAllDay,
        reminderEnabled,
        reminderMinutes,
        linkType: linkType || null,
        linkId: linkId ? Number(linkId) : null,
        sortOrder,
        creatorId: request.user.id
      },
      include: {
        creator: { select: { id: true, username: true, avatar: true } }
      }
    });

    return { event, message: '创建成功' };
  });

  fastify.put('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const event = await prisma.creationCalendar.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!event) {
      return reply.code(404).send({ error: '日历事件不存在' });
    }

    const {
      title, description, eventType,
      startDate, endDate, color, status,
      isAllDay, reminderEnabled, reminderMinutes,
      linkType, linkId, sortOrder
    } = request.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (eventType !== undefined) updateData.eventType = eventType;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (color !== undefined) updateData.color = color;
    if (status !== undefined) updateData.status = status;
    if (isAllDay !== undefined) updateData.isAllDay = isAllDay;
    if (reminderEnabled !== undefined) updateData.reminderEnabled = reminderEnabled;
    if (reminderMinutes !== undefined) updateData.reminderMinutes = reminderMinutes;
    if (linkType !== undefined) updateData.linkType = linkType;
    if (linkId !== undefined) updateData.linkId = linkId ? Number(linkId) : null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updated = await prisma.creationCalendar.update({
      where: { id: event.id },
      data: updateData,
      include: {
        creator: { select: { id: true, username: true, avatar: true } }
      }
    });

    return { event: updated, message: '更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const event = await prisma.creationCalendar.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!event) {
      return reply.code(404).send({ error: '日历事件不存在' });
    }

    await prisma.creationCalendar.delete({ where: { id: event.id } });

    return { message: '删除成功' };
  });

  fastify.put('/:id/sort', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { sortOrder } = request.body;
    await prisma.creationCalendar.update({
      where: { id: Number(request.params.id) },
      data: { sortOrder }
    });
    return { message: '排序已更新' };
  });

  fastify.post('/link-activity', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { calendarEventId, linkType, linkId } = request.body;

    if (!calendarEventId || !linkType || !linkId) {
      return reply.code(400).send({ error: '请提供完整的关联信息' });
    }

    const event = await prisma.creationCalendar.findUnique({
      where: { id: Number(calendarEventId) }
    });

    if (!event) {
      return reply.code(404).send({ error: '日历事件不存在' });
    }

    const updated = await prisma.creationCalendar.update({
      where: { id: event.id },
      data: { linkType, linkId: Number(linkId) },
      include: {
        creator: { select: { id: true, username: true, avatar: true } }
      }
    });

    return { event: updated, message: '活动关联成功' };
  });

  fastify.get('/stats', { preHandler: [fastify.adminOnly] }, async (request) => {
    const [total, active, byType, withReminders] = await Promise.all([
      prisma.creationCalendar.count(),
      prisma.creationCalendar.count({ where: { status: 'ACTIVE' } }),
      prisma.creationCalendar.groupBy({
        by: ['eventType'],
        _count: { id: true }
      }),
      prisma.creationCalendar.count({ where: { reminderEnabled: true } })
    ]);

    return {
      total,
      active,
      byType: byType.reduce((acc, item) => {
        acc[item.eventType] = item._count.id;
        return acc;
      }, {}),
      withReminders
    };
  });
}

module.exports = routes;
