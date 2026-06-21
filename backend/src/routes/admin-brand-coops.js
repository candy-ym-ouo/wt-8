function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const formatBrandCoop = (c) => {
  if (!c) return c;
  return { ...c, tags: parseJSONField(c.tags, []) };
};

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.addHook('onRequest', fastify.adminOnly);

  fastify.get('/stats', async () => {
    const [
      totalCoops,
      draftCoops,
      pendingReviewCoops,
      publishedCoops,
      inProgressCoops,
      completedCoops,
      rejectedCoops,
      proposalCount,
      negotiatingCount,
      confirmedCount,
      executingCount,
      completedKanbanCount,
      archivedCount
    ] = await Promise.all([
      prisma.brandCoop.count(),
      prisma.brandCoop.count({ where: { status: 'DRAFT' } }),
      prisma.brandCoop.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.brandCoop.count({ where: { status: 'PUBLISHED' } }),
      prisma.brandCoop.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.brandCoop.count({ where: { status: 'COMPLETED' } }),
      prisma.brandCoop.count({ where: { status: 'REJECTED' } }),
      prisma.brandCoop.count({ where: { kanbanColumn: 'PROPOSAL' } }),
      prisma.brandCoop.count({ where: { kanbanColumn: 'NEGOTIATING' } }),
      prisma.brandCoop.count({ where: { kanbanColumn: 'CONFIRMED' } }),
      prisma.brandCoop.count({ where: { kanbanColumn: 'EXECUTING' } }),
      prisma.brandCoop.count({ where: { kanbanColumn: 'COMPLETED' } }),
      prisma.brandCoop.count({ where: { kanbanColumn: 'ARCHIVED' } })
    ]);

    return {
      stats: {
        totalCoops,
        draftCoops,
        pendingReviewCoops,
        publishedCoops,
        inProgressCoops,
        completedCoops,
        rejectedCoops,
        proposalCount,
        negotiatingCount,
        confirmedCount,
        executingCount,
        completedKanbanCount,
        archivedCount
      }
    };
  });

  fastify.get('/kanban', async () => {
    const columns = ['PROPOSAL', 'NEGOTIATING', 'CONFIRMED', 'EXECUTING', 'COMPLETED', 'ARCHIVED'];

    const kanban = {};
    for (const col of columns) {
      const coops = await prisma.brandCoop.findMany({
        where: { kanbanColumn: col },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          _count: { select: { zines: true, schedules: true, messages: true } }
        }
      });

      kanban[col] = coops.map(c => ({
        ...formatBrandCoop(c),
        zineCount: c._count.zines,
        scheduleCount: c._count.schedules,
        messageCount: c._count.messages
      }));
    }

    return { kanban };
  });

  fastify.get('/list', async (request) => {
    const { status, kanbanColumn, category, keyword, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;
    if (kanbanColumn) where.kanbanColumn = kanbanColumn;
    if (category && category !== 'all') where.category = category;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { brandName: { contains: keyword } },
        { description: { contains: keyword } }
      ];
    }

    const [brandCoopsData, total] = await Promise.all([
      prisma.brandCoop.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          reviewer: { select: { id: true, username: true } },
          _count: { select: { zines: true, schedules: true, messages: true } }
        }
      }),
      prisma.brandCoop.count({ where })
    ]);

    const brandCoops = brandCoopsData.map(c => ({
      ...formatBrandCoop(c),
      zineCount: c._count.zines,
      scheduleCount: c._count.schedules,
      messageCount: c._count.messages
    }));

    return { brandCoops, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id/report', async (request, reply) => {
    const brandCoopId = Number(request.params.id);
    const brandCoop = await prisma.brandCoop.findUnique({
      where: { id: brandCoopId },
      include: {
        creator: { select: { id: true, username: true } }
      }
    });

    if (!brandCoop) {
      return reply.code(404).send({ error: '品牌联名合作不存在' });
    }

    const [zines, schedules, messageStats] = await Promise.all([
      prisma.brandCoopZine.findMany({
        where: { brandCoopId },
        include: { zine: { select: { id: true, title: true, category: true } } }
      }),
      prisma.brandCoopSchedule.findMany({
        where: { brandCoopId },
        orderBy: { plannedDate: 'asc' }
      }),
      prisma.brandCoopMessage.groupBy({
        by: ['type'],
        where: { brandCoopId },
        _count: { id: true }
      })
    ]);

    const scheduleStats = {
      total: schedules.length,
      completed: schedules.filter(s => s.status === 'COMPLETED').length,
      inProgress: schedules.filter(s => s.status === 'IN_PROGRESS').length,
      pending: schedules.filter(s => s.status === 'PENDING').length,
      overdue: schedules.filter(s => s.status !== 'COMPLETED' && new Date(s.plannedDate) < new Date()).length
    };

    return {
      brandCoop: formatBrandCoop(brandCoop),
      zines,
      schedules,
      scheduleStats,
      messageStats
    };
  });
}

module.exports = routes;
