async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/overview', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const pendingSubs = await prisma.submission.count({ where: { status: 'PENDING' } });
    const pendingTopicSubs = await prisma.topicSubmission.count({ where: { status: 'PENDING' } });
    const pendingCollabs = await prisma.collaboration.count({ where: { status: 'PENDING_REVIEW' } });
    const pendingCrowdfundings = await prisma.crowdfunding.count({ where: { status: 'PENDING_REVIEW' } });
    const pendingProofreadings = await prisma.proofreadingTask.count({ where: { status: 'IN_PROGRESS' } });
    const myProofreadings = await prisma.proofreadingTask.count({ 
      where: { assigneeId: request.user.id, status: { in: ['PENDING', 'IN_PROGRESS'] } } 
    });

    const recentRecords = await prisma.workflowRecord.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { operator: { select: { username: true, avatar: true } } }
    });

    return {
      pendingSubs,
      pendingTopicSubs,
      pendingCollabs,
      pendingCrowdfundings,
      pendingProofreadings,
      myProofreadings,
      recentRecords
    };
  });

  fastify.get('/pending-submissions', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { type = 'ALL', page = 1, pageSize = 20 } = request.query;
    const skip = (page - 1) * pageSize;

    let where = {};
    if (type === 'SUBMISSION') where = { status: 'PENDING' };
    else if (type === 'TOPIC') where = { status: 'PENDING' };
    else if (type === 'COLLABORATION') where = { status: 'PENDING_REVIEW' };
    else if (type === 'CROWDFUNDING') where = { status: 'PENDING_REVIEW' };

    const [subs, topicSubs, collabs, crowdfundings] = await Promise.all([
      prisma.submission.findMany({
        where: type === 'ALL' || type === 'SUBMISSION' ? { status: 'PENDING' } : { id: -1 },
        include: { user: { select: { username: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
        skip: type === 'ALL' ? skip : 0,
        take: type === 'ALL' ? pageSize : parseInt(pageSize)
      }),
      prisma.topicSubmission.findMany({
        where: type === 'ALL' || type === 'TOPIC' ? { status: 'PENDING' } : { id: -1 },
        include: { 
          user: { select: { username: true, avatar: true } },
          topic: { select: { title: true } }
        },
        orderBy: { createdAt: 'asc' },
        skip: type === 'ALL' ? skip : 0,
        take: type === 'ALL' ? pageSize : parseInt(pageSize)
      }),
      prisma.collaboration.findMany({
        where: type === 'ALL' || type === 'COLLABORATION' ? { status: 'PENDING_REVIEW' } : { id: -1 },
        include: { creator: { select: { username: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
        skip: type === 'ALL' ? skip : 0,
        take: type === 'ALL' ? pageSize : parseInt(pageSize)
      }),
      prisma.crowdfunding.findMany({
        where: type === 'ALL' || type === 'CROWDFUNDING' ? { status: 'PENDING_REVIEW' } : { id: -1 },
        include: { creator: { select: { username: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
        skip: type === 'ALL' ? skip : 0,
        take: type === 'ALL' ? pageSize : parseInt(pageSize)
      })
    ]);

    return {
      submissions: subs.map(s => ({ ...s, sourceType: 'SUBMISSION' })),
      topicSubmissions: topicSubs.map(s => ({ ...s, sourceType: 'TOPIC' })),
      collaborations: collabs.map(s => ({ ...s, sourceType: 'COLLABORATION' })),
      crowdfundings: crowdfundings.map(s => ({ ...s, sourceType: 'CROWDFUNDING' }))
    };
  });

  fastify.get('/proofreading', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { status = 'ALL', assigneeId, page = 1, pageSize = 20 } = request.query;
    const skip = (page - 1) * pageSize;

    let where = {};
    if (status !== 'ALL') where.status = status;
    if (assigneeId) where.assigneeId = parseInt(assigneeId);

    const [tasks, total] = await Promise.all([
      prisma.proofreadingTask.findMany({
        where,
        include: {
          zine: { select: { title: true } },
          submission: { select: { title: true } },
          assignee: { select: { username: true, avatar: true } },
          creator: { select: { username: true } }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ],
        skip,
        take: parseInt(pageSize)
      }),
      prisma.proofreadingTask.count({ where })
    ]);

    return { tasks, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  fastify.post('/proofreading', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { zineId, submissionId, title, content, type, priority, deadline, assigneeId } = request.body;

    const task = await prisma.proofreadingTask.create({
      data: {
        zineId: zineId || null,
        submissionId: submissionId || null,
        title,
        content,
        type: type || 'ZINE',
        priority: priority || 'NORMAL',
        deadline: deadline ? new Date(deadline) : null,
        assigneeId: assigneeId || null,
        creatorId: request.user.id
      }
    });

    await prisma.workflowRecord.create({
      data: {
        targetType: 'PROOFREADING',
        targetId: task.id,
        targetTitle: task.title,
        action: 'CREATE',
        toStatus: task.status,
        remark: '创建校对任务',
        operatorId: request.user.id
      }
    });

    return task;
  });

  fastify.patch('/proofreading/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const { status, feedback, corrections, assigneeId, deadline, priority } = request.body;

    const old = await prisma.proofreadingTask.findUnique({ where: { id: parseInt(id) } });
    const data = {};
    if (status !== undefined) data.status = status;
    if (feedback !== undefined) data.feedback = feedback;
    if (corrections !== undefined) data.corrections = JSON.stringify(corrections);
    if (assigneeId !== undefined) data.assigneeId = assigneeId;
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;
    if (priority !== undefined) data.priority = priority;
    if (status === 'COMPLETED') data.completedAt = new Date();

    const task = await prisma.proofreadingTask.update({
      where: { id: parseInt(id) },
      data
    });

    if (status && status !== old.status) {
      await prisma.workflowRecord.create({
        data: {
          targetType: 'PROOFREADING',
          targetId: task.id,
          targetTitle: task.title,
          action: 'STATUS_CHANGE',
          fromStatus: old.status,
          toStatus: status,
          remark: feedback || '状态变更',
          operatorId: request.user.id
        }
      });
    }

    return task;
  });

  fastify.delete('/proofreading/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    await prisma.proofreadingTask.delete({ where: { id: parseInt(id) } });
    return { success: true };
  });

  fastify.get('/templates', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { type = 'ALL', category = 'ALL', page = 1, pageSize = 50 } = request.query;
    const skip = (page - 1) * pageSize;

    const where = { OR: [{ isPublic: true }, { creatorId: request.user.id }] };
    if (type !== 'ALL') where.type = type;
    if (category !== 'ALL') where.category = category;

    const [templates, total] = await Promise.all([
      prisma.editorTemplate.findMany({
        where,
        include: { creator: { select: { username: true, avatar: true } } },
        orderBy: [{ sortOrder: 'asc' }, { usageCount: 'desc' }],
        skip,
        take: parseInt(pageSize)
      }),
      prisma.editorTemplate.count({ where })
    ]);

    return { templates, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  fastify.post('/templates', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { name, type, category, content, description, isPublic, sortOrder } = request.body;

    const template = await prisma.editorTemplate.create({
      data: {
        name,
        type: type || 'SUBMISSION',
        category: category || 'GENERAL',
        content,
        description,
        isPublic: isPublic !== undefined ? isPublic : true,
        sortOrder: sortOrder || 0,
        creatorId: request.user.id
      }
    });

    return template;
  });

  fastify.patch('/templates/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const template = await prisma.editorTemplate.findUnique({ where: { id: parseInt(id) } });

    if (template.creatorId !== request.user.id) {
      reply.code(403).send({ error: '无权限编辑此模板' });
      return;
    }

    const { name, type, category, content, description, isPublic, sortOrder } = request.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (category !== undefined) data.category = category;
    if (content !== undefined) data.content = content;
    if (description !== undefined) data.description = description;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    return await prisma.editorTemplate.update({ where: { id: parseInt(id) }, data });
  });

  fastify.delete('/templates/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const template = await prisma.editorTemplate.findUnique({ where: { id: parseInt(id) } });

    if (template.creatorId !== request.user.id) {
      reply.code(403).send({ error: '无权限删除此模板' });
      return;
    }

    await prisma.editorTemplate.delete({ where: { id: parseInt(id) } });
    return { success: true };
  });

  fastify.post('/templates/:id/use', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    await prisma.editorTemplate.update({
      where: { id: parseInt(id) },
      data: { usageCount: { increment: 1 } }
    });
    return { success: true };
  });

  fastify.get('/notes', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { targetType, targetId, page = 1, pageSize = 50 } = request.query;
    const skip = (page - 1) * pageSize;

    const where = { creatorId: request.user.id };
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = parseInt(targetId);

    const [notes, total] = await Promise.all([
      prisma.collaborationNote.findMany({
        where,
        include: { creator: { select: { username: true, avatar: true } } },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: parseInt(pageSize)
      }),
      prisma.collaborationNote.count({ where })
    ]);

    return { notes, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  fastify.post('/notes', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { targetType, targetId, targetTitle, content, color, isPinned, mentions, attachments } = request.body;

    const note = await prisma.collaborationNote.create({
      data: {
        targetType,
        targetId: targetId || 0,
        targetTitle,
        content,
        color: color || '#ffeaa7',
        isPinned: isPinned || false,
        mentions: JSON.stringify(mentions || []),
        attachments: JSON.stringify(attachments || []),
        creatorId: request.user.id
      }
    });

    return note;
  });

  fastify.patch('/notes/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const note = await prisma.collaborationNote.findUnique({ where: { id: parseInt(id) } });

    if (note.creatorId !== request.user.id) {
      reply.code(403).send({ error: '无权限编辑此备注' });
      return;
    }

    const { targetType, targetId, targetTitle, content, color, isPinned, mentions, attachments } = request.body;
    const data = {};
    if (targetType !== undefined) data.targetType = targetType;
    if (targetId !== undefined) data.targetId = targetId;
    if (targetTitle !== undefined) data.targetTitle = targetTitle;
    if (content !== undefined) data.content = content;
    if (color !== undefined) data.color = color;
    if (isPinned !== undefined) data.isPinned = isPinned;
    if (mentions !== undefined) data.mentions = JSON.stringify(mentions);
    if (attachments !== undefined) data.attachments = JSON.stringify(attachments);

    return await prisma.collaborationNote.update({ where: { id: parseInt(id) }, data });
  });

  fastify.delete('/notes/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const note = await prisma.collaborationNote.findUnique({ where: { id: parseInt(id) } });

    if (note.creatorId !== request.user.id) {
      reply.code(403).send({ error: '无权限删除此备注' });
      return;
    }

    await prisma.collaborationNote.delete({ where: { id: parseInt(id) } });
    return { success: true };
  });

  fastify.get('/workflow', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { targetType, targetId, operatorId, action, page = 1, pageSize = 50 } = request.query;
    const skip = (page - 1) * pageSize;

    const where = {};
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = parseInt(targetId);
    if (operatorId) where.operatorId = parseInt(operatorId);
    if (action) where.action = action;

    const [records, total] = await Promise.all([
      prisma.workflowRecord.findMany({
        where,
        include: { operator: { select: { username: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(pageSize)
      }),
      prisma.workflowRecord.count({ where })
    ]);

    return { records, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  fastify.post('/workflow', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { targetType, targetId, targetTitle, action, fromStatus, toStatus, remark, metadata } = request.body;

    return await prisma.workflowRecord.create({
      data: {
        targetType,
        targetId,
        targetTitle,
        action,
        fromStatus,
        toStatus,
        remark,
        metadata: JSON.stringify(metadata || {}),
        operatorId: request.user.id
      }
    });
  });

  fastify.get('/performance', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { periodType = 'MONTHLY', reviewerId, startDate, endDate } = request.query;

    const reviewers = await prisma.user.findMany({
      where: reviewerId ? { id: parseInt(reviewerId) } : { role: 'ADMIN' },
      select: { id: true, username: true, avatar: true }
    });

    const now = new Date();
    let periodStart, periodEnd;
    if (startDate && endDate) {
      periodStart = new Date(startDate);
      periodEnd = new Date(endDate);
    } else if (periodType === 'WEEKLY') {
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 7);
      periodEnd = now;
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = now;
    }

    const results = await Promise.all(reviewers.map(async (reviewer) => {
      const [submissions, topicSubs, collabs, crowdfundings] = await Promise.all([
        prisma.submission.findMany({
          where: { reviewerId: reviewer.id, reviewedAt: { gte: periodStart, lte: periodEnd } },
          select: { id: true, status: true, createdAt: true, reviewedAt: true }
        }),
        prisma.topicSubmission.findMany({
          where: { reviewerId: reviewer.id, reviewedAt: { gte: periodStart, lte: periodEnd } },
          select: { id: true, status: true, createdAt: true, reviewedAt: true }
        }),
        prisma.collaboration.findMany({
          where: { reviewerId: reviewer.id, reviewedAt: { gte: periodStart, lte: periodEnd } },
          select: { id: true, status: true, createdAt: true, reviewedAt: true }
        }),
        prisma.crowdfunding.findMany({
          where: { reviewerId: reviewer.id, reviewedAt: { gte: periodStart, lte: periodEnd } },
          select: { id: true, status: true, createdAt: true, reviewedAt: true }
        })
      ]);

      const allReviews = [...submissions, ...topicSubs, ...collabs, ...crowdfundings];
      const totalReviews = allReviews.length;
      const approvedCount = allReviews.filter(r => r.status === 'APPROVED' || r.status === 'PUBLISHED' || r.status === 'ACTIVE').length;
      const rejectedCount = allReviews.filter(r => r.status === 'REJECTED').length;

      const reviewTimes = allReviews
        .filter(r => r.reviewedAt && r.createdAt)
        .map(r => (new Date(r.reviewedAt) - new Date(r.createdAt)) / (1000 * 60 * 60));
      const avgReviewTime = reviewTimes.length > 0
        ? reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length
        : 0;

      const proofreadings = await prisma.proofreadingTask.count({
        where: { assigneeId: reviewer.id, completedAt: { gte: periodStart, lte: periodEnd } }
      });

      const workflowCount = await prisma.workflowRecord.count({
        where: { operatorId: reviewer.id, createdAt: { gte: periodStart, lte: periodEnd } }
      });

      return {
        reviewer,
        periodType,
        periodStart,
        periodEnd,
        totalReviews,
        approvedCount,
        rejectedCount,
        avgReviewTime: Math.round(avgReviewTime * 100) / 100,
        submissions: submissions.length,
        topicSubs: topicSubs.length,
        collaborations: collabs.length,
        crowdfundings: crowdfundings.length,
        proofreadings,
        workflowCount
      };
    }));

    return { results, periodStart, periodEnd, periodType };
  });

  fastify.get('/admins', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, username: true, avatar: true }
    });
    return admins;
  });
}

module.exports = routes;
