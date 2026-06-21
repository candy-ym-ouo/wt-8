function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const { triggerGrowthEvent } = require('../utils/growthTrigger');

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.addHook('onRequest', fastify.adminOnly);

  const formatZine = (z) => z ? { ...z, tags: parseJSONField(z.tags, []) } : z;
  const formatSub = (s) => s ? { ...s, images: parseJSONField(s.images, []) } : s;

  fastify.get('/stats', async () => {
    const [
      totalUsers, totalZines, totalSubmissions, totalSubscriptions,
      draftSubmissions, pendingSubmissions, scheduledSubmissions,
      approvedSubmissions, rejectedSubmissions, withdrawnSubmissions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.zine.count(),
      prisma.submission.count(),
      prisma.subscription.count(),
      prisma.submission.count({ where: { status: 'DRAFT' } }),
      prisma.submission.count({ where: { status: 'PENDING' } }),
      prisma.submission.count({ where: { status: 'SCHEDULED' } }),
      prisma.submission.count({ where: { status: 'APPROVED' } }),
      prisma.submission.count({ where: { status: 'REJECTED' } }),
      prisma.submission.count({ where: { status: 'WITHDRAWN' } })
    ]);

    const recentSubsData = await prisma.submission.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, username: true, avatar: true } } }
    });
    const recentSubmissions = recentSubsData.map(formatSub);

    return {
      stats: {
        totalUsers, totalZines, totalSubmissions, totalSubscriptions,
        draftSubmissions, pendingSubmissions, scheduledSubmissions,
        approvedSubmissions, rejectedSubmissions, withdrawnSubmissions
      },
      recentSubmissions
    };
  });

  fastify.get('/submissions', async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (status && status !== 'all') where.status = status;

    const [subsData, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, avatar: true } } }
      }),
      prisma.submission.count({ where })
    ]);

    const submissions = subsData.map(formatSub);
    return { submissions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/submissions/:id/approve', async (request, reply) => {
    const submission = await prisma.submission.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!submission) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (submission.status !== 'PENDING') {
      return reply.code(400).send({ error: '该投稿当前状态不可审核' });
    }

    const { category, tags, description } = request.body;
    const subImages = parseJSONField(submission.images, []);

    const zine = await prisma.zine.create({
      data: {
        title: submission.title,
        description: description || submission.content.substring(0, 200),
        coverImage: subImages[0] || `https://picsum.photos/seed/zine${submission.id}/400/560`,
        content: submission.content,
        authorId: submission.userId,
        category: category || '文学',
        tags: JSON.stringify(tags || [])
      }
    });

    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: 'APPROVED',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: submission.userId,
        title: '投稿已通过审核',
        content: `恭喜！您的投稿《${submission.title}》已通过审核并发布。感谢您的创作！`,
        type: 'SYSTEM'
      }
    });

    await triggerGrowthEvent(prisma, submission.userId, 'SUBMISSION_APPROVED', {
      sourceId: zine.id
    });
    await triggerGrowthEvent(prisma, submission.userId, 'ZINE_CREATED', {
      sourceId: zine.id
    });

    await prisma.workflowRecord.create({
      data: {
        targetType: 'SUBMISSION',
        targetId: submission.id,
        targetTitle: submission.title,
        action: 'APPROVE',
        fromStatus: 'PENDING',
        toStatus: 'APPROVED',
        remark: '审核通过',
        metadata: JSON.stringify({ zineId: zine.id }),
        operatorId: request.user.id
      }
    });

    return { zine: formatZine(zine), message: '审核通过，已发布' };
  });

  fastify.post('/submissions/:id/reject', async (request, reply) => {
    const submission = await prisma.submission.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!submission) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (submission.status !== 'PENDING') {
      return reply.code(400).send({ error: '该投稿当前状态不可审核' });
    }

    const { reason, templateId } = request.body;

    let template = null;
    let finalReason = reason || '';

    if (templateId) {
      template = await prisma.rejectTemplate.findUnique({
        where: { id: Number(templateId) }
      });
      if (template && template.isActive) {
        finalReason = template.content + (reason ? '\n\n' + reason : '');
        await prisma.rejectTemplate.update({
          where: { id: template.id },
          data: { usageCount: { increment: 1 } }
        });
      }
    }

    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: 'REJECTED',
        rejectionReason: finalReason || '未通过审核',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: submission.userId,
        title: '投稿审核未通过',
        content: `您的投稿《${submission.title}》未通过审核。${finalReason ? '原因：' + finalReason : '如有疑问，可修改后重新投稿。'}\n\n继续创作，感谢支持！`,
        type: 'SYSTEM'
      }
    });

    await prisma.workflowRecord.create({
      data: {
        targetType: 'SUBMISSION',
        targetId: submission.id,
        targetTitle: submission.title,
        action: 'REJECT',
        fromStatus: 'PENDING',
        toStatus: 'REJECTED',
        remark: '审核驳回',
        metadata: JSON.stringify({ reason: finalReason, templateId }),
        operatorId: request.user.id
      }
    });

    return { message: '已驳回' };
  });

  fastify.get('/users', async (request) => {
    const { page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              submissions: true,
              subscriptions: true
            }
          }
        }
      }),
      prisma.user.count()
    ]);

    return { users, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.put('/users/:id/role', async (request, reply) => {
    const { role } = request.body;
    const user = await prisma.user.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role }
    });

    return { user: { id: updated.id, role: updated.role } };
  });

  fastify.get('/zines', async (request) => {
    const { page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;

    const [zinesData, total] = await Promise.all([
      prisma.zine.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true } }
        }
      }),
      prisma.zine.count()
    ]);

    const zines = zinesData.map(formatZine);
    return { zines, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.delete('/zines/:id', async (request, reply) => {
    const zine = await prisma.zine.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!zine) {
      return reply.code(404).send({ error: '刊物不存在' });
    }

    await prisma.subscription.deleteMany({ where: { zineId: zine.id } });
    await prisma.zine.delete({ where: { id: zine.id } });

    return { message: '已删除' };
  });

  fastify.get('/topics/stats', async () => {
    const [
      totalTopics, activeTopics, draftTopics, closedTopics,
      totalTopicSubmissions, pendingTopicSubs, approvedTopicSubs,
      rejectedTopicSubs, scheduledTopicSubs, publishedTopicSubs,
      totalSchedules, activeSchedules, publishedSchedules,
      totalFeatured
    ] = await Promise.all([
      prisma.topic.count(),
      prisma.topic.count({ where: { status: 'ACTIVE' } }),
      prisma.topic.count({ where: { status: 'DRAFT' } }),
      prisma.topic.count({ where: { status: 'CLOSED' } }),
      prisma.topicSubmission.count(),
      prisma.topicSubmission.count({ where: { status: 'PENDING' } }),
      prisma.topicSubmission.count({ where: { status: 'APPROVED' } }),
      prisma.topicSubmission.count({ where: { status: 'REJECTED' } }),
      prisma.topicSubmission.count({ where: { status: 'SCHEDULED' } }),
      prisma.topicSubmission.count({ where: { status: 'PUBLISHED' } }),
      prisma.topicSchedule.count(),
      prisma.topicSchedule.count({ where: { status: 'PENDING' } }),
      prisma.topicSchedule.count({ where: { status: 'PUBLISHED' } }),
      prisma.featuredTopic.count({ where: { isActive: true } })
    ]);

    const topicStats = await prisma.topic.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { submissions: true, schedules: true } },
        creator: { select: { id: true, username: true } }
      }
    });

    return {
      stats: {
        totalTopics, activeTopics, draftTopics, closedTopics,
        totalTopicSubmissions, pendingTopicSubs, approvedTopicSubs,
        rejectedTopicSubs, scheduledTopicSubs, publishedTopicSubs,
        totalSchedules, activeSchedules, publishedSchedules,
        totalFeatured
      },
      topicStats
    };
  });

  fastify.get('/topics/report', async (request) => {
    const { topicId, startDate, endDate } = request.query;
    const where = {};

    if (topicId) where.topicId = Number(topicId);
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

    const submissions = await prisma.topicSubmission.findMany({
      where,
      include: {
        user: { select: { id: true, username: true } },
        topic: { select: { id: true, title: true } },
        reviewer: { select: { id: true, username: true } },
        schedule: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const statusCounts = {
      PENDING: 0, APPROVED: 0, REJECTED: 0, SCHEDULED: 0, PUBLISHED: 0
    };
    submissions.forEach(s => {
      if (statusCounts[s.status] !== undefined) statusCounts[s.status]++;
    });

    return { submissions, statusCounts, total: submissions.length };
  });

  fastify.get('/topics/submissions', async (request) => {
    const { status, topicId, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;
    if (topicId) where.topicId = Number(topicId);

    const [subsData, total] = await Promise.all([
      prisma.topicSubmission.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          topic: { select: { id: true, title: true } },
          reviewer: { select: { id: true, username: true } },
          schedule: { select: { id: true, title: true } }
        }
      }),
      prisma.topicSubmission.count({ where })
    ]);

    const submissions = subsData.map(s => ({ ...s, images: parseJSONField(s.images, []) }));
    return { submissions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/topics', async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, username: true } },
          _count: { select: { submissions: true, schedules: true } }
        }
      }),
      prisma.topic.count({ where })
    ]);

    return { topics, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/schedules', async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;

    const [schedules, total] = await Promise.all([
      prisma.topicSchedule.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { publishDate: 'desc' },
        include: {
          topic: { select: { id: true, title: true } },
          creator: { select: { id: true, username: true } },
          _count: { select: { submissions: true } }
        }
      }),
      prisma.topicSchedule.count({ where })
    ]);

    return { schedules, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/submissions/batch-approve', async (request, reply) => {
    const { ids, category, tags, description } = request.body || {};
    const submissionIds = (ids || []).map(Number).filter(Boolean);

    if (submissionIds.length === 0) {
      return reply.code(400).send({ error: '请选择要审核的投稿' });
    }

    if (submissionIds.length > 50) {
      return reply.code(400).send({ error: '单次批量审核最多50条' });
    }

    const successCount = { count: 0 };
    const failCount = { count: 0 };
    const failedItems = [];
    const processedIds = [];

    const defaultCategory = category || '文学';
    const defaultTags = tags ? JSON.stringify(tags.split(',').map(t => t.trim()).filter(Boolean)) : JSON.stringify([]);

    await Promise.all(submissionIds.map(async (id) => {
      try {
        const submission = await prisma.submission.findUnique({
          where: { id }
        });

        if (!submission || submission.status !== 'PENDING') {
          failCount.count++;
          failedItems.push({ id, reason: '投稿不存在或状态不可审核' });
          return;
        }

        const subImages = parseJSONField(submission.images, []);

        const zine = await prisma.zine.create({
          data: {
            title: submission.title,
            description: description || submission.content.substring(0, 200),
            coverImage: subImages[0] || `https://picsum.photos/seed/zine${submission.id}/400/560`,
            content: submission.content,
            authorId: submission.userId,
            category: defaultCategory,
            tags: defaultTags
          }
        });

        await prisma.submission.update({
          where: { id: submission.id },
          data: {
            status: 'APPROVED',
            reviewerId: request.user.id,
            reviewedAt: new Date()
          }
        });

        await prisma.message.create({
          data: {
            senderId: request.user.id,
            receiverId: submission.userId,
            title: '投稿已通过审核',
            content: `恭喜！您的投稿《${submission.title}》已通过审核并发布。感谢您的创作！`,
            type: 'SYSTEM'
          }
        });

        await prisma.workflowRecord.create({
          data: {
            targetType: 'SUBMISSION',
            targetId: submission.id,
            targetTitle: submission.title,
            action: 'APPROVE',
            fromStatus: 'PENDING',
            toStatus: 'APPROVED',
            remark: '批量审核通过',
            metadata: JSON.stringify({ batch: true, zineId: zine.id }),
            operatorId: request.user.id
          }
        });

        await triggerGrowthEvent(prisma, submission.userId, 'SUBMISSION_APPROVED', {
          sourceId: zine.id
        });
        await triggerGrowthEvent(prisma, submission.userId, 'ZINE_CREATED', {
          sourceId: zine.id
        });

        successCount.count++;
        processedIds.push(id);
      } catch (e) {
        console.error('批量审核失败:', id, e);
        failCount.count++;
        failedItems.push({ id, reason: e.message || '处理失败' });
      }
    }));

    await prisma.batchReviewRecord.create({
      data: {
        reviewerId: request.user.id,
        action: 'BATCH_APPROVE',
        submissionIds: JSON.stringify(processedIds),
        successCount: successCount.count,
        failCount: failCount.count,
        metadata: JSON.stringify({
          category: defaultCategory,
          description,
          failedItems
        })
      }
    });

    return {
      message: `批量审核完成：成功 ${successCount.count} 条，失败 ${failCount.count} 条`,
      successCount: successCount.count,
      failCount: failCount.count,
      failedItems
    };
  });

  fastify.post('/submissions/batch-reject', async (request, reply) => {
    const { ids, reason, templateId } = request.body || {};
    const submissionIds = (ids || []).map(Number).filter(Boolean);

    if (submissionIds.length === 0) {
      return reply.code(400).send({ error: '请选择要驳回的投稿' });
    }

    if (submissionIds.length > 100) {
      return reply.code(400).send({ error: '单次批量驳回最多100条' });
    }

    if (!reason && !templateId) {
      return reply.code(400).send({ error: '请填写驳回原因或选择驳回模板' });
    }

    let template = null;
    let finalReason = reason || '';

    if (templateId) {
      template = await prisma.rejectTemplate.findUnique({
        where: { id: Number(templateId) }
      });
      if (template && template.isActive) {
        finalReason = template.content + (reason ? '\n\n' + reason : '');
        await prisma.rejectTemplate.update({
          where: { id: template.id },
          data: { usageCount: { increment: 1 } }
        });
      }
    }

    const successCount = { count: 0 };
    const failCount = { count: 0 };
    const failedItems = [];
    const processedIds = [];

    await Promise.all(submissionIds.map(async (id) => {
      try {
        const submission = await prisma.submission.findUnique({
          where: { id }
        });

        if (!submission || submission.status !== 'PENDING') {
          failCount.count++;
          failedItems.push({ id, reason: '投稿不存在或状态不可审核' });
          return;
        }

        await prisma.submission.update({
          where: { id: submission.id },
          data: {
            status: 'REJECTED',
            rejectionReason: finalReason,
            reviewerId: request.user.id,
            reviewedAt: new Date()
          }
        });

        await prisma.message.create({
          data: {
            senderId: request.user.id,
            receiverId: submission.userId,
            title: '投稿审核未通过',
            content: `您的投稿《${submission.title}》未通过审核。${finalReason ? '原因：' + finalReason : '如有疑问，可修改后重新投稿。'}\n\n继续创作，感谢支持！`,
            type: 'SYSTEM'
          }
        });

        await prisma.workflowRecord.create({
          data: {
            targetType: 'SUBMISSION',
            targetId: submission.id,
            targetTitle: submission.title,
            action: 'REJECT',
            fromStatus: 'PENDING',
            toStatus: 'REJECTED',
            remark: '批量审核驳回',
            metadata: JSON.stringify({ batch: true, reason: finalReason, templateId }),
            operatorId: request.user.id
          }
        });

        successCount.count++;
        processedIds.push(id);
      } catch (e) {
        console.error('批量驳回失败:', id, e);
        failCount.count++;
        failedItems.push({ id, reason: e.message || '处理失败' });
      }
    }));

    await prisma.batchReviewRecord.create({
      data: {
        reviewerId: request.user.id,
        action: 'BATCH_REJECT',
        submissionIds: JSON.stringify(processedIds),
        successCount: successCount.count,
        failCount: failCount.count,
        reason: finalReason,
        templateId: template?.id || null,
        metadata: JSON.stringify({ failedItems })
      }
    });

    return {
      message: `批量驳回完成：成功 ${successCount.count} 条，失败 ${failCount.count} 条`,
      successCount: successCount.count,
      failCount: failCount.count,
      failedItems
    };
  });

  fastify.get('/reject-templates', async (request) => {
    const { category, includeInactive, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (includeInactive !== 'true') where.isActive = true;
    if (category && category !== 'all') where.category = category;

    const [templates, total] = await Promise.all([
      prisma.rejectTemplate.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ sortOrder: 'asc' }, { usageCount: 'desc' }],
        include: {
          creator: { select: { id: true, username: true } }
        }
      }),
      prisma.rejectTemplate.count({ where })
    ]);

    return { templates, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/reject-templates', async (request, reply) => {
    const { title, content, category = 'GENERAL', sortOrder = 0, isActive = true, isGlobal = true } = request.body || {};

    if (!title || !content) {
      return reply.code(400).send({ error: '模板标题和内容不能为空' });
    }

    const template = await prisma.rejectTemplate.create({
      data: {
        title: String(title).slice(0, 50),
        content: String(content),
        category: String(category),
        sortOrder: Number(sortOrder) || 0,
        isActive: Boolean(isActive),
        isGlobal: Boolean(isGlobal),
        creatorId: request.user.id
      }
    });

    return { template, message: '驳回模板创建成功' };
  });

  fastify.put('/reject-templates/:id', async (request, reply) => {
    const templateId = Number(request.params.id);
    const existing = await prisma.rejectTemplate.findUnique({ where: { id: templateId } });

    if (!existing) {
      return reply.code(404).send({ error: '驳回模板不存在' });
    }

    const { title, content, category, sortOrder, isActive, isGlobal } = request.body || {};
    const data = {};
    if (title !== undefined) data.title = String(title).slice(0, 50);
    if (content !== undefined) data.content = String(content);
    if (category !== undefined) data.category = String(category);
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (isGlobal !== undefined) data.isGlobal = Boolean(isGlobal);

    const updated = await prisma.rejectTemplate.update({
      where: { id: templateId },
      data
    });

    return { template: updated, message: '驳回模板更新成功' };
  });

  fastify.delete('/reject-templates/:id', async (request, reply) => {
    const templateId = Number(request.params.id);
    const existing = await prisma.rejectTemplate.findUnique({ where: { id: templateId } });

    if (!existing) {
      return reply.code(404).send({ error: '驳回模板不存在' });
    }

    await prisma.rejectTemplate.delete({ where: { id: templateId } });
    return { message: '驳回模板删除成功' };
  });

  fastify.get('/review-stats', async (request) => {
    const { period = 'TODAY', reviewerId } = request.query;

    const now = new Date();
    let startDate;

    switch (period) {
      case 'TODAY':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'WEEK':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const where = {
      createdAt: { gte: startDate }
    };
    if (reviewerId) where.operatorId = Number(reviewerId);

    const [
      totalApproved,
      totalRejected,
      totalPending,
      totalBatchRecords,
      workflowRecords
    ] = await Promise.all([
      prisma.submission.count({ where: { status: 'APPROVED', reviewedAt: { gte: startDate } } }),
      prisma.submission.count({ where: { status: 'REJECTED', reviewedAt: { gte: startDate } } }),
      prisma.submission.count({ where: { status: 'PENDING' } }),
      prisma.batchReviewRecord.count({ where: { createdAt: { gte: startDate } } }),
      prisma.workflowRecord.findMany({
        where,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { operator: { select: { id: true, username: true, avatar: true } } }
      })
    ]);

    const reviewerStats = await prisma.workflowRecord.groupBy({
      by: ['operatorId'],
      where: {
        action: { in: ['APPROVE', 'REJECT'] },
        createdAt: { gte: startDate }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });

    const reviewerDetails = await Promise.all(
      reviewerStats.map(async (stat) => {
        const user = await prisma.user.findUnique({
          where: { id: stat.operatorId },
          select: { id: true, username: true, avatar: true }
        });
        const approved = await prisma.workflowRecord.count({
          where: {
            operatorId: stat.operatorId,
            action: 'APPROVE',
            createdAt: { gte: startDate }
          }
        });
        const rejected = await prisma.workflowRecord.count({
          where: {
            operatorId: stat.operatorId,
            action: 'REJECT',
            createdAt: { gte: startDate }
          }
        });
        return { ...user, total: stat._count.id, approved, rejected };
      })
    );

    return {
      stats: {
        totalApproved,
        totalRejected,
        totalPending,
        totalBatchRecords,
        approvalRate: totalApproved + totalRejected > 0
          ? Math.round((totalApproved / (totalApproved + totalRejected)) * 100)
          : 0
      },
      reviewerRanking: reviewerDetails.filter(r => r.id),
      recentActivities: workflowRecords
    };
  });

  fastify.get('/batch-records', async (request) => {
    const { action, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (action && action !== 'all') where.action = action;

    const [records, total] = await Promise.all([
      prisma.batchReviewRecord.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: { id: true, username: true, avatar: true } },
          template: { select: { id: true, title: true } }
        }
      }),
      prisma.batchReviewRecord.count({ where })
    ]);

    return { records, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });
}

module.exports = routes;
