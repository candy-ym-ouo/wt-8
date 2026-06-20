async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { type, reason, description, targetType, targetId, targetTitle, evidence, targetUserId } = request.body;

    if (!reason || !targetType || !targetId) {
      return reply.code(400).send({ error: '请填写举报原因、目标类型和目标ID' });
    }

    const validTypes = ['CONTENT', 'USER', 'SPAM', 'ILLEGAL', 'OTHER'];
    if (type && !validTypes.includes(type)) {
      return reply.code(400).send({ error: '无效的举报类型' });
    }

    const validTargetTypes = ['ZINE', 'SUBMISSION', 'COLLABORATION', 'CROWDFUNDING', 'EVENT', 'COMMENT', 'USER', 'OTHER'];
    if (!validTargetTypes.includes(targetType)) {
      return reply.code(400).send({ error: '无效的目标类型' });
    }

    const existing = await prisma.report.findFirst({
      where: {
        reporterId: request.user.id,
        targetType,
        targetId: Number(targetId),
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    });

    if (existing) {
      return reply.code(400).send({ error: '您已对该目标提交过举报，请等待处理' });
    }

    let priority = 'NORMAL';
    let handlerLevel = 'LEVEL_1';
    const reportType = type || 'CONTENT';
    if (reportType === 'ILLEGAL') {
      priority = 'HIGH';
      handlerLevel = 'LEVEL_2';
    } else if (reportType === 'SPAM') {
      priority = 'LOW';
    }

    const report = await prisma.report.create({
      data: {
        type: reportType,
        reason,
        description: description || null,
        targetType,
        targetId: Number(targetId),
        targetTitle: targetTitle || null,
        evidence: evidence ? JSON.stringify(evidence) : '[]',
        priority,
        handlerLevel,
        reporterId: request.user.id,
        targetUserId: targetUserId ? Number(targetUserId) : null
      }
    });

    await prisma.reportLog.create({
      data: {
        reportId: report.id,
        action: 'CREATE',
        detail: `提交举报：${reason}`,
        operatorId: request.user.id
      }
    });

    return { report, message: '举报已提交，我们会尽快处理' };
  });

  fastify.get('/my', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 10 } = request.query;
    const skip = (page - 1) * limit;
    const where = { reporterId: request.user.id };

    if (status && status !== 'all') where.status = status;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          handler: { select: { id: true, username: true, avatar: true } },
          appeals: { orderBy: { createdAt: 'desc' } }
        }
      }),
      prisma.report.count({ where })
    ]);

    return { reports, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const report = await prisma.report.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        handler: { select: { id: true, username: true, avatar: true } },
        targetUser: { select: { id: true, username: true, avatar: true } },
        appeals: {
          orderBy: { createdAt: 'desc' },
          include: {
            handler: { select: { id: true, username: true, avatar: true } }
          }
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          include: {
            operator: { select: { id: true, username: true, avatar: true } }
          }
        }
      }
    });

    if (!report) {
      return reply.code(404).send({ error: '举报记录不存在' });
    }

    if (report.reporterId !== request.user.id && request.user.role !== 'ADMIN') {
      return reply.code(403).send({ error: '无权查看此举报' });
    }

    return { report };
  });

  fastify.post('/:id/appeal', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const reportId = Number(request.params.id);
    const { reason, evidence } = request.body;

    if (!reason) {
      return reply.code(400).send({ error: '请填写申诉原因' });
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { appeals: { where: { status: { in: ['PENDING', 'PROCESSING'] } } } }
    });

    if (!report) {
      return reply.code(404).send({ error: '举报记录不存在' });
    }

    if (report.reporterId !== request.user.id && report.targetUserId !== request.user.id) {
      return reply.code(403).send({ error: '只有举报者或被举报者可以申诉' });
    }

    if (report.status !== 'RESOLVED' && report.status !== 'PENALIZED') {
      return reply.code(400).send({ error: '只能对已处理或已处罚的举报进行申诉' });
    }

    if (report.appeals.length > 0) {
      return reply.code(400).send({ error: '该举报已有进行中的申诉' });
    }

    const appeal = await prisma.appeal.create({
      data: {
        reportId,
        reason,
        evidence: evidence ? JSON.stringify(evidence) : '[]',
        appellantId: request.user.id
      }
    });

    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'APPEALING' }
    });

    await prisma.reportLog.create({
      data: {
        reportId,
        appealId: appeal.id,
        action: 'APPEAL',
        detail: `提交申诉：${reason}`,
        operatorId: request.user.id
      }
    });

    return { appeal, message: '申诉已提交，我们会重新审核' };
  });

  fastify.get('/my/appeals', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 10 } = request.query;
    const skip = (page - 1) * limit;
    const where = { appellantId: request.user.id };

    if (status && status !== 'all') where.status = status;

    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          report: {
            select: { id: true, type: true, reason: true, targetType: true, targetId: true, targetTitle: true, status: true }
          },
          handler: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.appeal.count({ where })
    ]);

    return { appeals, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.put('/:id/cancel', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const report = await prisma.report.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!report) {
      return reply.code(404).send({ error: '举报记录不存在' });
    }

    if (report.reporterId !== request.user.id) {
      return reply.code(403).send({ error: '只能撤回自己的举报' });
    }

    if (report.status !== 'PENDING') {
      return reply.code(400).send({ error: '只能撤回待处理的举报' });
    }

    await prisma.report.update({
      where: { id: report.id },
      data: { status: 'CANCELLED' }
    });

    await prisma.reportLog.create({
      data: {
        reportId: report.id,
        action: 'CANCEL',
        detail: '举报者主动撤回举报',
        operatorId: request.user.id
      }
    });

    return { message: '举报已撤回' };
  });
}

module.exports = routes;
