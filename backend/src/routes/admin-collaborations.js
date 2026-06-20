async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.addHook('onRequest', fastify.adminOnly);

  fastify.get('/stats', async () => {
    const [
      totalCollaborations,
      publishedCollaborations,
      draftCollaborations,
      closedCollaborations,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      cancelledApplications
    ] = await Promise.all([
      prisma.collaboration.count(),
      prisma.collaboration.count({ where: { status: 'PUBLISHED' } }),
      prisma.collaboration.count({ where: { status: 'DRAFT' } }),
      prisma.collaboration.count({ where: { status: 'CLOSED' } }),
      prisma.collaborationApplication.count(),
      prisma.collaborationApplication.count({ where: { status: 'PENDING' } }),
      prisma.collaborationApplication.count({ where: { status: 'APPROVED' } }),
      prisma.collaborationApplication.count({ where: { status: 'REJECTED' } }),
      prisma.collaborationApplication.count({ where: { status: 'CANCELLED' } })
    ]);

    const now = new Date();
    const activeCollaborations = await prisma.collaboration.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { deadline: null },
          { deadline: { gte: now } }
        ]
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applications: true } }
      }
    });

    return {
      stats: {
        totalCollaborations,
        publishedCollaborations,
        draftCollaborations,
        closedCollaborations,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        cancelledApplications,
        approvalRate: totalApplications > 0 ?
          Math.round((approvedApplications / totalApplications) * 100) : 0
      },
      activeCollaborations
    };
  });

  fastify.get('/overview', async (request) => {
    const { startDate, endDate, category, status } = request.query;
    const where = {};

    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    if (category && category !== 'all') where.category = category;
    if (status && status !== 'all') where.status = status;

    const collaborations = await prisma.collaboration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applications: true } },
        creator: { select: { id: true, username: true } }
      }
    });

    const collabStats = collaborations.map(c => {
      return {
        id: c.id,
        title: c.title,
        category: c.category,
        status: c.status,
        deadline: c.deadline,
        viewCount: c.viewCount,
        applicationCount: c._count.applications,
        compensation: c.compensation,
        creator: c.creator,
        createdAt: c.createdAt
      };
    });

    const categoryStats = {};
    collaborations.forEach(c => {
      if (!categoryStats[c.category]) {
        categoryStats[c.category] = {
          count: 0,
          totalApplications: 0,
          totalViews: 0
        };
      }
      categoryStats[c.category].count++;
      categoryStats[c.category].totalApplications += c._count.applications;
      categoryStats[c.category].totalViews += c.viewCount;
    });

    return {
      collaborations: collabStats,
      categoryStats,
      summary: {
        totalCollaborations: collaborations.length,
        totalApplications: collabStats.reduce((s, c) => s + c.applicationCount, 0),
        totalViews: collaborations.reduce((s, c) => s + c.viewCount, 0)
      }
    };
  });

  fastify.get('/:id/report', async (request, reply) => {
    const collaborationId = Number(request.params.id);
    const collaboration = await prisma.collaboration.findUnique({
      where: { id: collaborationId },
      include: {
        creator: { select: { id: true, username: true } }
      }
    });

    if (!collaboration) {
      return reply.code(404).send({ error: '合作项目不存在' });
    }

    const [
      applicationStats,
      applicationList
    ] = await Promise.all([
      prisma.collaborationApplication.groupBy({
        by: ['status'],
        where: { collaborationId },
        _count: { id: true }
      }),
      prisma.collaborationApplication.findMany({
        where: { collaborationId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatar: true, email: true } },
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
    applicationStats.forEach(s => {
      statusCounts[s.status] = s._count.id;
    });

    return {
      collaboration,
      statusCounts,
      applicationList,
      summary: {
        totalApplications: applicationList.length,
        pendingCount: statusCounts.PENDING,
        approvedCount: statusCounts.APPROVED,
        rejectedCount: statusCounts.REJECTED,
        cancelledCount: statusCounts.CANCELLED,
        approvalRate: applicationList.length > 0 ?
          Math.round((statusCounts.APPROVED / applicationList.length) * 100) : 0
      }
    };
  });

  fastify.get('/applications/export', async (request) => {
    const { collaborationId, status } = request.query;
    const where = {};
    if (collaborationId) where.collaborationId = Number(collaborationId);
    if (status && status !== 'all') where.status = status;

    const applications = await prisma.collaborationApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { username: true, email: true } },
        collaboration: { select: { title: true, compensation: true, deadline: true } },
        reviewer: { select: { username: true } }
      }
    });

    const exportData = applications.map(a => ({
      id: a.id,
      collaborationTitle: a.collaboration.title,
      collaborationCompensation: a.collaboration.compensation || '',
      collaborationDeadline: a.collaboration.deadline || '',
      username: a.user.username,
      email: a.user.email,
      portfolio: a.portfolio || '',
      skills: a.skills || '',
      motivation: a.motivation || '',
      contactInfo: a.contactInfo || '',
      status: a.status,
      rejectionReason: a.rejectionReason || '',
      reviewer: a.reviewer?.username || '',
      appliedAt: a.createdAt,
      reviewedAt: a.reviewedAt || ''
    }));

    return { applications: exportData, total: exportData.length };
  });
}

module.exports = routes;
