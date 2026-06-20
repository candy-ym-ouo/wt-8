async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.addHook('onRequest', fastify.adminOnly);

  fastify.get('/stats', async () => {
    const [
      totalReports,
      pendingReports,
      processingReports,
      resolvedReports,
      penalizedReports,
      appealingReports,
      dismissedReports,
      totalAppeals,
      pendingAppeals,
      resolvedAppeals,
      todayReports,
      highPriorityReports
    ] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'PROCESSING' } }),
      prisma.report.count({ where: { status: 'RESOLVED' } }),
      prisma.report.count({ where: { status: 'PENALIZED' } }),
      prisma.report.count({ where: { status: 'APPEALING' } }),
      prisma.report.count({ where: { status: 'DISMISSED' } }),
      prisma.appeal.count(),
      prisma.appeal.count({ where: { status: 'PENDING' } }),
      prisma.appeal.count({ where: { status: { in: ['APPROVED', 'REJECTED'] } } }),
      prisma.report.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.report.count({ where: { priority: 'HIGH', status: { in: ['PENDING', 'PROCESSING'] } } })
    ]);

    return {
      stats: {
        totalReports,
        pendingReports,
        processingReports,
        resolvedReports,
        penalizedReports,
        appealingReports,
        dismissedReports,
        totalAppeals,
        pendingAppeals,
        resolvedAppeals,
        todayReports,
        highPriorityReports
      }
    };
  });

  fastify.get('/reports', async (request) => {
    const { status, type, priority, handlerLevel, page = 1, limit = 15, keyword } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;
    if (type && type !== 'all') where.type = type;
    if (priority && priority !== 'all') where.priority = priority;
    if (handlerLevel && handlerLevel !== 'all') where.handlerLevel = handlerLevel;
    if (keyword) {
      where.OR = [
        { reason: { contains: keyword } },
        { targetTitle: { contains: keyword } },
        { description: { contains: keyword } }
      ];
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          reporter: { select: { id: true, username: true, avatar: true, email: true } },
          handler: { select: { id: true, username: true, avatar: true } },
          targetUser: { select: { id: true, username: true, avatar: true } },
          _count: { select: { appeals: true, logs: true } }
        }
      }),
      prisma.report.count({ where })
    ]);

    return { reports, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/reports/:id', async (request, reply) => {
    const report = await prisma.report.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        reporter: { select: { id: true, username: true, avatar: true, email: true } },
        handler: { select: { id: true, username: true, avatar: true } },
        targetUser: { select: { id: true, username: true, avatar: true, email: true } },
        appeals: {
          orderBy: { createdAt: 'desc' },
          include: {
            appellant: { select: { id: true, username: true, avatar: true } },
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

    return { report };
  });

  fastify.put('/reports/:id/handle', async (request, reply) => {
    const reportId = Number(request.params.id);
    const { action, handleNote, penaltyType, penaltyDetail, escalate } = request.body;

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      return reply.code(404).send({ error: '举报记录不存在' });
    }

    if (report.status !== 'PENDING' && report.status !== 'PROCESSING' && report.status !== 'APPEALING') {
      return reply.code(400).send({ error: '该举报不在可处理状态' });
    }

    if (escalate) {
      const levelMap = { LEVEL_1: 'LEVEL_2', LEVEL_2: 'LEVEL_3' };
      const newLevel = levelMap[report.handlerLevel] || 'LEVEL_3';
      await prisma.report.update({
        where: { id: reportId },
        data: {
          handlerLevel: newLevel,
          handlerId: request.user.id,
          status: 'PROCESSING'
        }
      });

      await prisma.reportLog.create({
        data: {
          reportId,
          action: 'ESCALATE',
          detail: `升级处理至${newLevel === 'LEVEL_2' ? '二级' : '三级'}审核`,
          operatorId: request.user.id
        }
      });

      return { message: '已升级处理级别', handlerLevel: newLevel };
    }

    let newStatus = report.status;
    let logDetail = '';

    if (action === 'DISMISS') {
      newStatus = 'DISMISSED';
      logDetail = '举报不成立，已驳回';
    } else if (action === 'RESOLVE') {
      newStatus = 'RESOLVED';
      logDetail = '举报成立，已处理';
    } else if (action === 'PENALIZE') {
      if (!penaltyType) {
        return reply.code(400).send({ error: '处罚类型不能为空' });
      }
      newStatus = 'PENALIZED';
      logDetail = `举报成立，已处罚：${penaltyType}`;
    } else {
      return reply.code(400).send({ error: '无效的处理操作' });
    }

    const updateData = {
      status: newStatus,
      handlerId: request.user.id,
      handledAt: new Date(),
      handleResult: action,
      handleNote: handleNote || null
    };

    if (action === 'PENALIZE') {
      updateData.penaltyType = penaltyType;
      updateData.penaltyDetail = penaltyDetail || null;
    }

    await prisma.report.update({
      where: { id: reportId },
      data: updateData
    });

    await prisma.reportLog.create({
      data: {
        reportId,
        action: `HANDLE_${action}`,
        detail: logDetail + (handleNote ? `。备注：${handleNote}` : ''),
        operatorId: request.user.id
      }
    });

    if (report.reporterId) {
      const typeLabels = { CONTENT: '内容', USER: '用户', SPAM: '垃圾信息', ILLEGAL: '违规', OTHER: '其他' };
      const statusLabels = { DISMISSED: '不成立已驳回', RESOLVED: '已处理', PENALIZED: '已处罚' };
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: report.reporterId,
          title: '举报处理结果通知',
          content: `您提交的${typeLabels[report.type] || ''}举报已处理完毕，处理结果：${statusLabels[newStatus] || newStatus}。${handleNote ? `处理说明：${handleNote}` : ''}`,
          type: 'REPORT'
        }
      });
    }

    if (newStatus === 'PENALIZED' && report.targetUserId) {
      const penaltyLabels = { WARNING: '警告', MUTE: '禁言', BAN: '封禁', DELETE_CONTENT: '删除内容' };
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: report.targetUserId,
          title: '违规处理通知',
          content: `您的内容/行为因被举报已受到处理，处罚类型：${penaltyLabels[penaltyType] || penaltyType}。${penaltyDetail ? `详情：${penaltyDetail}` : ''}。如对处理结果有异议，可在举报中心提交申诉。`,
          type: 'REPORT'
        }
      });
    }

    return { message: '处理完成', newStatus };
  });

  fastify.put('/reports/:id/priority', async (request, reply) => {
    const reportId = Number(request.params.id);
    const { priority } = request.body;

    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(priority)) {
      return reply.code(400).send({ error: '无效的优先级' });
    }

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      return reply.code(404).send({ error: '举报记录不存在' });
    }

    await prisma.report.update({
      where: { id: reportId },
      data: { priority }
    });

    const priorityLabels = { LOW: '低', NORMAL: '普通', HIGH: '高', URGENT: '紧急' };
    await prisma.reportLog.create({
      data: {
        reportId,
        action: 'PRIORITY_CHANGE',
        detail: `优先级从${priorityLabels[report.priority]}变更为${priorityLabels[priority]}`,
        operatorId: request.user.id
      }
    });

    return { message: '优先级已更新' };
  });

  fastify.get('/appeals', async (request) => {
    const { status, page = 1, limit = 15 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;

    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          report: {
            select: { id: true, type: true, reason: true, targetType: true, targetId: true, targetTitle: true, status: true, penaltyType: true, penaltyDetail: true }
          },
          appellant: { select: { id: true, username: true, avatar: true, email: true } },
          handler: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.appeal.count({ where })
    ]);

    return { appeals, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.put('/appeals/:id/handle', async (request, reply) => {
    const appealId = Number(request.params.id);
    const { action, handleNote } = request.body;

    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
      include: { report: true }
    });

    if (!appeal) {
      return reply.code(404).send({ error: '申诉记录不存在' });
    }

    if (appeal.status !== 'PENDING' && appeal.status !== 'PROCESSING') {
      return reply.code(400).send({ error: '该申诉不在可处理状态' });
    }

    let newStatus = '';
    let reportNewStatus = appeal.report.status;
    let logDetail = '';

    if (action === 'APPROVE') {
      newStatus = 'APPROVED';
      if (appeal.report.status === 'PENALIZED') {
        reportNewStatus = 'RESOLVED';
      } else {
        reportNewStatus = 'DISMISSED';
      }
      logDetail = '申诉成立，原处理已变更';
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
      reportNewStatus = appeal.report.status === 'APPEALING' ? appeal.report.handleResult === 'PENALIZE' ? 'PENALIZED' : 'RESOLVED' : appeal.report.status;
      logDetail = '申诉不成立，维持原处理';
    } else {
      return reply.code(400).send({ error: '无效的处理操作' });
    }

    await prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: newStatus,
        handlerId: request.user.id,
        handledAt: new Date(),
        handleResult: action,
        handleNote: handleNote || null
      }
    });

    await prisma.report.update({
      where: { id: appeal.reportId },
      data: { status: reportNewStatus }
    });

    await prisma.reportLog.create({
      data: {
        reportId: appeal.reportId,
        appealId,
        action: `APPEAL_${action}`,
        detail: logDetail + (handleNote ? `。备注：${handleNote}` : ''),
        operatorId: request.user.id
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: appeal.appellantId,
        title: '申诉处理结果通知',
        content: `您的申诉已处理完毕，结果：${newStatus === 'APPROVED' ? '申诉成立，已变更原处理' : '申诉不成立，维持原处理'}。${handleNote ? `处理说明：${handleNote}` : ''}`,
        type: 'REPORT'
      }
    });

    return { message: '申诉处理完成', newStatus };
  });

  fastify.get('/logs', async (request) => {
    const { reportId, action, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (reportId) where.reportId = Number(reportId);
    if (action && action !== 'all') where.action = action;

    const [logs, total] = await Promise.all([
      prisma.reportLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          operator: { select: { id: true, username: true, avatar: true } },
          report: { select: { id: true, type: true, reason: true, targetTitle: true } }
        }
      }),
      prisma.reportLog.count({ where })
    ]);

    return { logs, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.delete('/reports/:id', async (request, reply) => {
    const report = await prisma.report.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!report) {
      return reply.code(404).send({ error: '举报记录不存在' });
    }

    await prisma.report.delete({ where: { id: report.id } });
    return { message: '举报记录已删除' };
  });
}

module.exports = routes;
