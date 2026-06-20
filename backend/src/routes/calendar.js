async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', async (request) => {
    const { year, month, eventType, status, page = 1, limit = 50 } = request.query;
    const where = {};

    if (eventType && eventType !== 'all') where.eventType = eventType;
    if (status && status !== 'all') where.status = status;

    if (year && month) {
      const y = Number(year);
      const m = Number(month);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      where.startDate = { gte: start, lt: end };
    } else if (year) {
      const y = Number(year);
      const start = new Date(y, 0, 1);
      const end = new Date(y + 1, 0, 1);
      where.startDate = { gte: start, lt: end };
    }

    const [events, total] = await Promise.all([
      prisma.creationCalendar.findMany({
        where,
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: [{ startDate: 'asc' }],
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          _count: { select: { subscriptions: true, reminders: true } }
        }
      }),
      prisma.creationCalendar.count({ where })
    ]);

    return { events, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/mine', { preHandler: [fastify.authenticate] }, async (request) => {
    const { year, month } = request.query;
    const where = { creatorId: request.user.id };

    if (year && month) {
      const y = Number(year);
      const m = Number(month);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      where.startDate = { gte: start, lt: end };
    }

    const events = await prisma.creationCalendar.findMany({
      where,
      orderBy: [{ startDate: 'asc' }],
      include: {
        creator: { select: { id: true, username: true, avatar: true } },
        _count: { select: { subscriptions: true, reminders: true } }
      }
    });

    return { events };
  });

  fastify.get('/subscribed', { preHandler: [fastify.authenticate] }, async (request) => {
    const { year, month } = request.query;
    const subWhere = { userId: request.user.id };

    const subs = await prisma.calendarSubscription.findMany({
      where: subWhere,
      include: {
        calendarEvent: {
          include: {
            creator: { select: { id: true, username: true, avatar: true } },
            _count: { select: { subscriptions: true } }
          }
        }
      }
    });

    let events = subs.map(s => s.calendarEvent);

    if (year && month) {
      const y = Number(year);
      const m = Number(month);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      events = events.filter(e => {
        const d = new Date(e.startDate);
        return d >= start && d < end;
      });
    }

    return { events };
  });

  fastify.get('/reminders', { preHandler: [fastify.authenticate] }, async (request) => {
    const { sent } = request.query;
    const where = { userId: request.user.id };
    if (sent !== undefined) where.isSent = sent === 'true';

    const reminders = await prisma.calendarReminder.findMany({
      where,
      orderBy: [{ remindAt: 'asc' }],
      include: {
        calendarEvent: {
          select: { id: true, title: true, startDate: true, eventType: true, color: true }
        }
      }
    });

    return { reminders };
  });

  fastify.get('/:id', async (request, reply) => {
    const event = await prisma.creationCalendar.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true, avatar: true } },
        subscriptions: {
          include: { user: { select: { id: true, username: true, avatar: true } } }
        },
        reminders: {
          include: { user: { select: { id: true, username: true, avatar: true } } }
        }
      }
    });

    if (!event) {
      return reply.code(404).send({ error: '日历事件不存在' });
    }

    return { event };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const {
      title, description, eventType = 'SCHEDULE',
      startDate, endDate, color = '#d4624a',
      isAllDay = true, reminderEnabled = false,
      reminderMinutes = 30, linkType, linkId
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
        isAllDay,
        reminderEnabled,
        reminderMinutes,
        linkType: linkType || null,
        linkId: linkId ? Number(linkId) : null,
        creatorId: request.user.id
      },
      include: {
        creator: { select: { id: true, username: true, avatar: true } }
      }
    });

    return { event, message: '创建成功' };
  });

  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const event = await prisma.creationCalendar.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!event) {
      return reply.code(404).send({ error: '日历事件不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (event.creatorId !== request.user.id && !['ADMIN', 'EDITOR'].includes(user.role)) {
      return reply.code(403).send({ error: '无权限编辑此事件' });
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

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const event = await prisma.creationCalendar.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!event) {
      return reply.code(404).send({ error: '日历事件不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (event.creatorId !== request.user.id && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: '无权限删除此事件' });
    }

    await prisma.creationCalendar.delete({ where: { id: event.id } });

    return { message: '删除成功' };
  });

  fastify.post('/:id/subscribe', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const eventId = Number(request.params.id);
    const event = await prisma.creationCalendar.findUnique({ where: { id: eventId } });

    if (!event) {
      return reply.code(404).send({ error: '日历事件不存在' });
    }

    const existing = await prisma.calendarSubscription.findUnique({
      where: { calendarEventId_userId: { calendarEventId: eventId, userId: request.user.id } }
    });

    if (existing) {
      return reply.code(400).send({ error: '已订阅此事件' });
    }

    await prisma.calendarSubscription.create({
      data: { calendarEventId: eventId, userId: request.user.id }
    });

    if (event.reminderEnabled) {
      const remindAt = new Date(new Date(event.startDate).getTime() - event.reminderMinutes * 60 * 1000);
      const existingReminder = await prisma.calendarReminder.findUnique({
        where: { calendarEventId_userId: { calendarEventId: eventId, userId: request.user.id } }
      });
      if (!existingReminder) {
        await prisma.calendarReminder.create({
          data: {
            calendarEventId: eventId,
            userId: request.user.id,
            remindAt
          }
        });
      }
    }

    return { message: '订阅成功' };
  });

  fastify.delete('/:id/subscribe', { preHandler: [fastify.authenticate] }, async (request) => {
    const eventId = Number(request.params.id);

    await prisma.calendarSubscription.deleteMany({
      where: { calendarEventId: eventId, userId: request.user.id }
    });

    await prisma.calendarReminder.deleteMany({
      where: { calendarEventId: eventId, userId: request.user.id }
    });

    return { message: '取消订阅成功' };
  });

  fastify.post('/:id/remind', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const eventId = Number(request.params.id);
    const { minutesBefore = 30 } = request.body;

    const event = await prisma.creationCalendar.findUnique({ where: { id: eventId } });
    if (!event) {
      return reply.code(404).send({ error: '日历事件不存在' });
    }

    const remindAt = new Date(new Date(event.startDate).getTime() - minutesBefore * 60 * 1000);

    const existing = await prisma.calendarReminder.findUnique({
      where: { calendarEventId_userId: { calendarEventId: eventId, userId: request.user.id } }
    });

    if (existing) {
      const updated = await prisma.calendarReminder.update({
        where: { id: existing.id },
        data: { remindAt, isSent: false }
      });
      return { reminder: updated, message: '提醒已更新' };
    }

    const reminder = await prisma.calendarReminder.create({
      data: {
        calendarEventId: eventId,
        userId: request.user.id,
        remindAt
      }
    });

    return { reminder, message: '提醒设置成功' };
  });

  fastify.delete('/:id/remind', { preHandler: [fastify.authenticate] }, async (request) => {
    const eventId = Number(request.params.id);

    await prisma.calendarReminder.deleteMany({
      where: { calendarEventId: eventId, userId: request.user.id }
    });

    return { message: '提醒已取消' };
  });

  fastify.post('/sync-from-activities', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (!['ADMIN', 'EDITOR'].includes(user.role)) {
      return reply.code(403).send({ error: '无权限操作' });
    }

    const { sourceType } = request.body;
    let created = 0;

    if (sourceType === 'topics' || sourceType === 'all') {
      const activeTopics = await prisma.topic.findMany({
        where: { status: 'ACTIVE', deadline: { not: null } }
      });
      for (const topic of activeTopics) {
        const existing = await prisma.creationCalendar.findFirst({
          where: { linkType: 'topic', linkId: topic.id }
        });
        if (!existing) {
          await prisma.creationCalendar.create({
            data: {
              title: `征稿截止：${topic.title}`,
              description: topic.description,
              eventType: 'SUBMISSION_DEADLINE',
              startDate: topic.deadline,
              color: '#cc8800',
              reminderEnabled: true,
              reminderMinutes: 60,
              linkType: 'topic',
              linkId: topic.id,
              creatorId: request.user.id
            }
          });
          created++;
        }
      }
    }

    if (sourceType === 'events' || sourceType === 'all') {
      const activeEvents = await prisma.event.findMany({
        where: { status: { in: ['PUBLISHED', 'ACTIVE'] } }
      });
      for (const evt of activeEvents) {
        const existing = await prisma.creationCalendar.findFirst({
          where: { linkType: 'event', linkId: evt.id }
        });
        if (!existing) {
          await prisma.creationCalendar.create({
            data: {
              title: `活动：${evt.title}`,
              description: evt.description,
              eventType: 'ACTIVITY',
              startDate: evt.startTime,
              endDate: evt.endTime,
              color: '#5a8f5a',
              reminderEnabled: true,
              reminderMinutes: 60,
              linkType: 'event',
              linkId: evt.id,
              creatorId: request.user.id
            }
          });
          created++;
        }
      }
    }

    if (sourceType === 'crowdfundings' || sourceType === 'all') {
      const activeCrowdfundings = await prisma.crowdfunding.findMany({
        where: { status: 'ACTIVE', deadline: { not: null } }
      });
      for (const cf of activeCrowdfundings) {
        const existing = await prisma.creationCalendar.findFirst({
          where: { linkType: 'crowdfunding', linkId: cf.id }
        });
        if (!existing) {
          await prisma.creationCalendar.create({
            data: {
              title: `众筹截止：${cf.title}`,
              description: cf.description,
              eventType: 'SUBMISSION_DEADLINE',
              startDate: cf.deadline,
              color: '#d4624a',
              reminderEnabled: true,
              reminderMinutes: 60,
              linkType: 'crowdfunding',
              linkId: cf.id,
              creatorId: request.user.id
            }
          });
          created++;
        }
      }
    }

    return { created, message: `同步完成，新增 ${created} 个日历事件` };
  });
}

module.exports = routes;
