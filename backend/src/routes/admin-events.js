async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.addHook('onRequest', fastify.adminOnly);

  fastify.get('/stats', async () => {
    const [
      totalEvents,
      publishedEvents,
      draftEvents,
      cancelledEvents,
      totalRegistrations,
      pendingRegistrations,
      approvedRegistrations,
      rejectedRegistrations,
      cancelledRegistrations,
      totalCheckIns,
      totalParticipants
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: 'PUBLISHED' } }),
      prisma.event.count({ where: { status: 'DRAFT' } }),
      prisma.event.count({ where: { status: 'CANCELLED' } }),
      prisma.eventRegistration.count(),
      prisma.eventRegistration.count({ where: { status: 'PENDING' } }),
      prisma.eventRegistration.count({ where: { status: 'APPROVED' } }),
      prisma.eventRegistration.count({ where: { status: 'REJECTED' } }),
      prisma.eventRegistration.count({ where: { status: 'CANCELLED' } }),
      prisma.eventCheckIn.count(),
      prisma.eventRegistration.count({ where: { status: 'APPROVED' } })
    ]);

    const totalFee = await prisma.event.aggregate({
      _sum: { fee: true }
    });

    const now = new Date();
    const upcomingEvents = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startTime: { gte: now }
      },
      take: 5,
      orderBy: { startTime: 'asc' },
      include: {
        _count: { select: { registrations: true, checkIns: true } }
      }
    });

    const ongoingEvents = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startTime: { lte: now },
        endTime: { gte: now }
      },
      include: {
        _count: { select: { registrations: true, checkIns: true } }
      }
    });

    return {
      stats: {
        totalEvents,
        publishedEvents,
        draftEvents,
        cancelledEvents,
        totalRegistrations,
        pendingRegistrations,
        approvedRegistrations,
        rejectedRegistrations,
        cancelledRegistrations,
        totalCheckIns,
        totalParticipants,
        averageCheckInRate: totalParticipants > 0 ?
          Math.round((totalCheckIns / totalParticipants) * 100) : 0,
        totalFee: totalFee._sum.fee || 0
      },
      upcomingEvents,
      ongoingEvents
    };
  });

  fastify.get('/:id/report', async (request, reply) => {
    const eventId = Number(request.params.id);
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        creator: { select: { id: true, username: true } }
      }
    });

    if (!event) {
      return reply.code(404).send({ error: '活动不存在' });
    }

    const [
      registrationStats,
      checkInList,
      registrationList
    ] = await Promise.all([
      prisma.eventRegistration.groupBy({
        by: ['status'],
        where: { eventId },
        _count: { id: true }
      }),
      prisma.eventCheckIn.findMany({
        where: { eventId },
        orderBy: { checkInTime: 'asc' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          registration: { select: { id: true, name: true, phone: true, email: true, company: true } }
        }
      }),
      prisma.eventRegistration.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          checkIn: true,
          reviewer: { select: { id: true, username: true } }
        }
      })
    ]);

    const statusCounts = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0
    };
    registrationStats.forEach(s => {
      statusCounts[s.status] = s._count.id;
    });

    const checkInRate = statusCounts.APPROVED > 0
      ? Math.round((checkInList.length / statusCounts.APPROVED) * 100)
      : 0;

    const checkInTypes = {};
    checkInList.forEach(c => {
      checkInTypes[c.checkInType] = (checkInTypes[c.checkInType] || 0) + 1;
    });

    const hourlyCheckIns = {};
    checkInList.forEach(c => {
      const hour = new Date(c.checkInTime).getHours();
      const hourKey = `${String(hour).padStart(2, '0')}:00`;
      hourlyCheckIns[hourKey] = (hourlyCheckIns[hourKey] || 0) + 1;
    });

    return {
      event,
      statusCounts,
      checkInList,
      registrationList,
      summary: {
        totalRegistrations: registrationList.length,
        approvedCount: statusCounts.APPROVED,
        pendingCount: statusCounts.PENDING,
        rejectedCount: statusCounts.REJECTED,
        cancelledCount: statusCounts.CANCELLED,
        checkInCount: checkInList.length,
        checkInRate,
        fillRate: event.maxParticipants > 0
          ? Math.round((statusCounts.APPROVED / event.maxParticipants) * 100)
          : null,
        checkInTypes,
        hourlyCheckIns
      }
    };
  });

  fastify.get('/registrations/export', async (request) => {
    const { eventId, status } = request.query;
    const where = {};
    if (eventId) where.eventId = Number(eventId);
    if (status && status !== 'all') where.status = status;

    const registrations = await prisma.eventRegistration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { username: true, email: true } },
        event: { select: { title: true, startTime: true, location: true } },
        checkIn: true
      }
    });

    const exportData = registrations.map(r => ({
      id: r.id,
      eventTitle: r.event.title,
      eventTime: r.event.startTime,
      eventLocation: r.event.location,
      username: r.user.username,
      name: r.name,
      phone: r.phone,
      email: r.email || r.user.email,
      company: r.company || '',
      note: r.note || '',
      status: r.status,
      rejectionReason: r.rejectionReason || '',
      registeredAt: r.createdAt,
      reviewedAt: r.reviewedAt || '',
      checkedIn: !!r.checkIn,
      checkedInAt: r.checkIn?.checkInTime || ''
    }));

    return { registrations: exportData, total: exportData.length };
  });

  fastify.get('/overview', async (request) => {
    const { startDate, endDate, category } = request.query;
    const where = {};

    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    if (category && category !== 'all') where.category = category;

    const events = await prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { registrations: true, checkIns: true } }
      }
    });

    const eventStats = events.map(e => {
      const approvedCount = e._count.registrations;
      const checkInCount = e._count.checkIns;
      return {
        id: e.id,
        title: e.title,
        category: e.category,
        status: e.status,
        startTime: e.startTime,
        location: e.location,
        maxParticipants: e.maxParticipants,
        fee: e.fee,
        viewCount: e.viewCount,
        registrationCount: e._count.registrations,
        checkInCount,
        fillRate: e.maxParticipants > 0 ? Math.round((approvedCount / e.maxParticipants) * 100) : null,
        checkInRate: approvedCount > 0 ? Math.round((checkInCount / approvedCount) * 100) : 0,
        revenue: e.fee * checkInCount
      };
    });

    const categoryStats = {};
    events.forEach(e => {
      if (!categoryStats[e.category]) {
        categoryStats[e.category] = {
          count: 0,
          totalRegistrations: 0,
          totalCheckIns: 0,
          totalRevenue: 0
        };
      }
      const checkInCount = e._count.checkIns;
      categoryStats[e.category].count++;
      categoryStats[e.category].totalRegistrations += e._count.registrations;
      categoryStats[e.category].totalCheckIns += checkInCount;
      categoryStats[e.category].totalRevenue += e.fee * checkInCount;
    });

    return {
      events: eventStats,
      categoryStats,
      summary: {
        totalEvents: events.length,
        totalRegistrations: eventStats.reduce((s, e) => s + e.registrationCount, 0),
        totalCheckIns: eventStats.reduce((s, e) => s + e.checkInCount, 0),
        totalRevenue: eventStats.reduce((s, e) => s + e.revenue, 0),
        totalViews: events.reduce((s, e) => s + e.viewCount, 0)
      }
    };
  });

  fastify.get('/registrations/trend', async (request) => {
    const { eventId, days = 30 } = request.query;
    const where = {};
    if (eventId) where.eventId = Number(eventId);

    const now = new Date();
    const startDate = new Date(now.getTime() - Number(days) * 24 * 60 * 60 * 1000);

    const registrations = await prisma.eventRegistration.findMany({
      where: {
        ...where,
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'asc' }
    });

    const checkIns = await prisma.eventCheckIn.findMany({
      where: {
        ...where,
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'asc' }
    });

    const dailyData = {};
    for (let i = 0; i < Number(days); i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyData[key] = { registrations: 0, checkIns: 0 };
    }

    registrations.forEach(r => {
      const key = new Date(r.createdAt).toISOString().split('T')[0];
      if (dailyData[key]) dailyData[key].registrations++;
    });

    checkIns.forEach(c => {
      const key = new Date(c.createdAt).toISOString().split('T')[0];
      if (dailyData[key]) dailyData[key].checkIns++;
    });

    const trend = Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data
    }));

    return { trend };
  });
}

module.exports = routes;
