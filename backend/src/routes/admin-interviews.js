function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.addHook('onRequest', fastify.adminOnly);

  const formatInterview = (i) => i ? { ...i, tags: parseJSONField(i.tags, []) } : i;
  const formatZine = (z) => z ? { ...z, tags: parseJSONField(z.tags, []) } : z;

  fastify.get('/stats', async () => {
    const [
      totalInterviews,
      publishedInterviews,
      draftInterviews,
      totalInterviewZines,
      totalFeatured,
      totalComments,
      totalSchedules
    ] = await Promise.all([
      prisma.interview.count(),
      prisma.interview.count({ where: { status: 'PUBLISHED' } }),
      prisma.interview.count({ where: { status: 'DRAFT' } }),
      prisma.interviewZine.count(),
      prisma.featuredInterview.count({ where: { isActive: true } }),
      prisma.interviewComment.count(),
      prisma.interviewSchedule.count()
    ]);

    return {
      stats: {
        totalInterviews,
        publishedInterviews,
        draftInterviews,
        totalInterviewZines,
        totalFeatured,
        totalComments,
        totalSchedules
      }
    };
  });

  fastify.get('/', async (request) => {
    const { status, search, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { authorName: { contains: search } }
      ];
    }

    const [interviewsData, total] = await Promise.all([
      prisma.interview.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          creator: { select: { id: true, username: true } },
          _count: { select: { zines: true, comments: true } }
        }
      }),
      prisma.interview.count({ where })
    ]);

    const interviews = interviewsData.map(i => ({
      ...formatInterview(i),
      zineCount: i._count.zines,
      commentCount: i._count.comments
    }));

    return { interviews, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', async (request, reply) => {
    const interview = await prisma.interview.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true } },
        featured: true
      }
    });

    if (!interview) {
      return reply.code(404).send({ error: '访谈不存在' });
    }

    return { interview: formatInterview(interview) };
  });

  fastify.post('/', async (request) => {
    const {
      title,
      description,
      coverImage,
      content,
      category,
      tags = [],
      authorName,
      authorAvatar,
      authorBio,
      authorUserId,
      interviewerName,
      publishDate,
      status = 'DRAFT',
      sortOrder = 0
    } = request.body;

    const interview = await prisma.interview.create({
      data: {
        title,
        description,
        coverImage: coverImage || `https://picsum.photos/seed/interview${Date.now()}/800/600`,
        content: content || description,
        category: category || 'CREATOR',
        tags: JSON.stringify(tags),
        authorName,
        authorAvatar,
        authorBio,
        authorUserId: authorUserId || null,
        interviewerName,
        publishDate: publishDate ? new Date(publishDate) : null,
        status,
        sortOrder,
        creatorId: request.user.id
      }
    });

    return { interview: formatInterview(interview), message: '创建成功' };
  });

  fastify.put('/:id', async (request, reply) => {
    const interviewId = Number(request.params.id);
    const existing = await prisma.interview.findUnique({ where: { id: interviewId } });

    if (!existing) {
      return reply.code(404).send({ error: '访谈不存在' });
    }

    const {
      title,
      description,
      coverImage,
      content,
      category,
      tags,
      authorName,
      authorAvatar,
      authorBio,
      authorUserId,
      interviewerName,
      publishDate,
      status,
      sortOrder,
      isFeatured,
      rejectionReason,
      reviewerId,
      reviewedAt
    } = request.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (authorName !== undefined) updateData.authorName = authorName;
    if (authorAvatar !== undefined) updateData.authorAvatar = authorAvatar;
    if (authorBio !== undefined) updateData.authorBio = authorBio;
    if (authorUserId !== undefined) updateData.authorUserId = authorUserId || null;
    if (interviewerName !== undefined) updateData.interviewerName = interviewerName;
    if (publishDate !== undefined) updateData.publishDate = publishDate ? new Date(publishDate) : null;
    if (status !== undefined) updateData.status = status;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (reviewerId !== undefined) updateData.reviewerId = reviewerId;
    if (reviewedAt !== undefined) updateData.reviewedAt = reviewedAt ? new Date(reviewedAt) : null;

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: updateData
    });

    return { interview: formatInterview(updated), message: '更新成功' };
  });

  fastify.delete('/:id', async (request, reply) => {
    const interviewId = Number(request.params.id);
    const existing = await prisma.interview.findUnique({ where: { id: interviewId } });

    if (!existing) {
      return reply.code(404).send({ error: '访谈不存在' });
    }

    await prisma.interviewZine.deleteMany({ where: { interviewId } });
    await prisma.interviewComment.deleteMany({ where: { interviewId } });
    await prisma.interviewSchedule.deleteMany({ where: { interviewId } });
    await prisma.featuredInterview.deleteMany({ where: { interviewId } });
    await prisma.interview.delete({ where: { id: interviewId } });

    return { message: '删除成功' };
  });

  fastify.get('/:id/zines', async (request, reply) => {
    const interviewId = Number(request.params.id);
    const interview = await prisma.interview.findUnique({ where: { id: interviewId } });

    if (!interview) {
      return reply.code(404).send({ error: '访谈不存在' });
    }

    const zinesData = await prisma.interviewZine.findMany({
      where: { interviewId },
      orderBy: [{ sortOrder: 'asc' }, { addedAt: 'desc' }],
      include: {
        zine: {
          include: {
            author: { select: { id: true, username: true } }
          }
        }
      }
    });

    const zines = zinesData.map(iz => ({
      ...iz,
      zine: formatZine(iz.zine)
    }));

    return { zines };
  });

  fastify.post('/:id/zines', async (request, reply) => {
    const interviewId = Number(request.params.id);
    const { zineId, recommendNote, sortOrder = 0 } = request.body;

    const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview) {
      return reply.code(404).send({ error: '访谈不存在' });
    }

    const zine = await prisma.zine.findUnique({ where: { id: Number(zineId) } });
    if (!zine) {
      return reply.code(404).send({ error: '刊物不存在' });
    }

    const existing = await prisma.interviewZine.findUnique({
      where: {
        interviewId_zineId: {
          interviewId,
          zineId: Number(zineId)
        }
      }
    });

    if (existing) {
      return reply.code(400).send({ error: '该刊物已在访谈关联中' });
    }

    const interviewZine = await prisma.interviewZine.create({
      data: {
        interviewId,
        zineId: Number(zineId),
        recommendNote,
        sortOrder
      },
      include: {
        zine: {
          include: {
            author: { select: { id: true, username: true } }
          }
        }
      }
    });

    return { interviewZine: { ...interviewZine, zine: formatZine(interviewZine.zine) }, message: '添加成功' };
  });

  fastify.put('/:id/zines/:zineId', async (request, reply) => {
    const interviewId = Number(request.params.id);
    const zineId = Number(request.params.zineId);
    const { recommendNote, sortOrder } = request.body;

    const existing = await prisma.interviewZine.findUnique({
      where: {
        interviewId_zineId: { interviewId, zineId }
      }
    });

    if (!existing) {
      return reply.code(404).send({ error: '该刊物不在访谈关联中' });
    }

    const updateData = {};
    if (recommendNote !== undefined) updateData.recommendNote = recommendNote;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updated = await prisma.interviewZine.update({
      where: {
        interviewId_zineId: { interviewId, zineId }
      },
      data: updateData,
      include: {
        zine: {
          include: {
            author: { select: { id: true, username: true } }
          }
        }
      }
    });

    return { interviewZine: { ...updated, zine: formatZine(updated.zine) }, message: '更新成功' };
  });

  fastify.delete('/:id/zines/:zineId', async (request, reply) => {
    const interviewId = Number(request.params.id);
    const zineId = Number(request.params.zineId);

    const existing = await prisma.interviewZine.findUnique({
      where: {
        interviewId_zineId: { interviewId, zineId }
      }
    });

    if (!existing) {
      return reply.code(404).send({ error: '该刊物不在访谈关联中' });
    }

    await prisma.interviewZine.delete({
      where: {
        interviewId_zineId: { interviewId, zineId }
      }
    });

    return { message: '移除成功' };
  });

  fastify.post('/:id/zines/batch', async (request, reply) => {
    const interviewId = Number(request.params.id);
    const { zineIds = [] } = request.body;

    const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview) {
      return reply.code(404).send({ error: '访谈不存在' });
    }

    let addedCount = 0;
    for (const zineId of zineIds) {
      const existing = await prisma.interviewZine.findUnique({
        where: {
          interviewId_zineId: { interviewId, zineId: Number(zineId) }
        }
      });

      if (!existing) {
        const maxSort = await prisma.interviewZine.aggregate({
          where: { interviewId },
          _max: { sortOrder: true }
        });
        const nextSort = (maxSort._max.sortOrder || 0) + 1;

        await prisma.interviewZine.create({
          data: {
            interviewId,
            zineId: Number(zineId),
            sortOrder: nextSort
          }
        });
        addedCount++;
      }
    }

    return { message: `成功添加 ${addedCount} 本刊物`, addedCount };
  });

  fastify.get('/featured/list', async () => {
    const featured = await prisma.featuredInterview.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        interview: {
          select: { id: true, title: true, coverImage: true }
        }
      }
    });

    return { featured };
  });

  fastify.post('/featured', async (request, reply) => {
    const {
      interviewId,
      bannerImage,
      bannerTitle,
      bannerSubtitle,
      sortOrder = 0,
      startDate,
      endDate,
      isActive = true
    } = request.body;

    const existing = await prisma.featuredInterview.findUnique({
      where: { interviewId: Number(interviewId) }
    });

    if (existing) {
      return reply.code(400).send({ error: '该访谈已在专题推荐中' });
    }

    const featured = await prisma.featuredInterview.create({
      data: {
        interviewId: Number(interviewId),
        bannerImage,
        bannerTitle,
        bannerSubtitle,
        sortOrder,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive
      },
      include: {
        interview: { select: { id: true, title: true } }
      }
    });

    return { featured, message: '添加专题推荐成功' };
  });

  fastify.put('/featured/:id', async (request, reply) => {
    const featuredId = Number(request.params.id);
    const existing = await prisma.featuredInterview.findUnique({ where: { id: featuredId } });

    if (!existing) {
      return reply.code(404).send({ error: '专题推荐不存在' });
    }

    const {
      bannerImage,
      bannerTitle,
      bannerSubtitle,
      sortOrder,
      startDate,
      endDate,
      isActive
    } = request.body;

    const updateData = {};
    if (bannerImage !== undefined) updateData.bannerImage = bannerImage;
    if (bannerTitle !== undefined) updateData.bannerTitle = bannerTitle;
    if (bannerSubtitle !== undefined) updateData.bannerSubtitle = bannerSubtitle;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.featuredInterview.update({
      where: { id: featuredId },
      data: updateData
    });

    return { featured: updated, message: '更新成功' };
  });

  fastify.delete('/featured/:id', async (request, reply) => {
    const featuredId = Number(request.params.id);
    const existing = await prisma.featuredInterview.findUnique({ where: { id: featuredId } });

    if (!existing) {
      return reply.code(404).send({ error: '专题推荐不存在' });
    }

    await prisma.featuredInterview.delete({ where: { id: featuredId } });
    return { message: '删除成功' };
  });

  fastify.get('/zines/search', async (request) => {
    const { search, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;

    const where = { status: 'PUBLISHED' };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const [zinesData, total] = await Promise.all([
      prisma.zine.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true } }
        }
      }),
      prisma.zine.count({ where })
    ]);

    const zines = zinesData.map(formatZine);
    return { zines, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id/comments', async (request, reply) => {
    const interviewId = Number(request.params.id);
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = { interviewId };
    if (status && status !== 'all') where.status = status;

    const [comments, total] = await Promise.all([
      prisma.interviewComment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.interviewComment.count({ where })
    ]);

    return { comments, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.put('/comments/:id', async (request, reply) => {
    const commentId = Number(request.params.id);
    const { status, isPinned } = request.body;

    const existing = await prisma.interviewComment.findUnique({ where: { id: commentId } });
    if (!existing) {
      return reply.code(404).send({ error: '评论不存在' });
    }

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (isPinned !== undefined) updateData.isPinned = isPinned;

    const updated = await prisma.interviewComment.update({
      where: { id: commentId },
      data: updateData
    });

    return { comment: updated, message: '更新成功' };
  });

  fastify.delete('/comments/:id', async (request, reply) => {
    const commentId = Number(request.params.id);

    const existing = await prisma.interviewComment.findUnique({ where: { id: commentId } });
    if (!existing) {
      return reply.code(404).send({ error: '评论不存在' });
    }

    await prisma.interview.update({
      where: { id: existing.interviewId },
      data: { commentCount: { decrement: 1 } }
    });

    await prisma.interviewComment.delete({ where: { id: commentId } });
    return { message: '删除成功' };
  });

  fastify.get('/:id/schedules', async (request, reply) => {
    const interviewId = Number(request.params.id);
    const interview = await prisma.interview.findUnique({ where: { id: interviewId } });

    if (!interview) {
      return reply.code(404).send({ error: '访谈不存在' });
    }

    const schedules = await prisma.interviewSchedule.findMany({
      where: { interviewId },
      orderBy: { scheduledAt: 'asc' },
      include: {
        creator: { select: { id: true, username: true } }
      }
    });

    return { schedules };
  });

  fastify.get('/schedules/all', async (request) => {
    const { status, startDate, endDate, page = 1, limit = 50 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;
    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }

    const [schedules, total] = await Promise.all([
      prisma.interviewSchedule.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { scheduledAt: 'asc' },
        include: {
          interview: { select: { id: true, title: true, coverImage: true } },
          creator: { select: { id: true, username: true } }
        }
      }),
      prisma.interviewSchedule.count({ where })
    ]);

    return { schedules, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/schedules', async (request, reply) => {
    const { interviewId, title, description, scheduledAt, status = 'PENDING', note } = request.body;

    if (!interviewId) {
      return reply.code(400).send({ error: '请选择关联的访谈' });
    }
    if (!title || !title.trim()) {
      return reply.code(400).send({ error: '请填写排期标题' });
    }
    if (!scheduledAt) {
      return reply.code(400).send({ error: '请选择排期时间' });
    }

    const iid = Number(interviewId);
    const interview = await prisma.interview.findUnique({ where: { id: iid } });
    if (!interview) {
      return reply.code(404).send({ error: '访谈不存在' });
    }

    const scheduledDate = new Date(scheduledAt);

    let createdSchedule;
    await prisma.$transaction(async (tx) => {
      createdSchedule = await tx.interviewSchedule.create({
        data: {
          interviewId: iid,
          title: title.trim(),
          description,
          scheduledAt: scheduledDate,
          status,
          note,
          creatorId: request.user.id
        },
        include: {
          creator: { select: { id: true, username: true } }
        }
      });

      if (status === 'PUBLISHED') {
        await tx.interview.update({
          where: { id: iid },
          data: {
            status: 'PUBLISHED',
            publishDate: scheduledDate
          }
        });
      }
    });

    return { schedule: createdSchedule, message: '创建排期成功' };
  });

  fastify.put('/schedules/:id', async (request, reply) => {
    const scheduleId = Number(request.params.id);
    const { title, description, scheduledAt, status, note, interviewId } = request.body;

    const existing = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
    if (!existing) {
      return reply.code(404).send({ error: '排期不存在' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt);
    if (status !== undefined) updateData.status = status;
    if (note !== undefined) updateData.note = note;
    let targetInterviewId = existing.interviewId;
    if (interviewId !== undefined) {
      const newIid = Number(interviewId);
      const intv = await prisma.interview.findUnique({ where: { id: newIid } });
      if (!intv) {
        return reply.code(404).send({ error: '目标访谈不存在' });
      }
      updateData.interviewId = newIid;
      targetInterviewId = newIid;
    }

    let updated;
    await prisma.$transaction(async (tx) => {
      updated = await tx.interviewSchedule.update({
        where: { id: scheduleId },
        data: updateData,
        include: {
          creator: { select: { id: true, username: true } }
        }
      });

      if (status === 'PUBLISHED') {
        const finalScheduledAt = scheduledAt ? new Date(scheduledAt) : existing.scheduledAt;
        await tx.interview.update({
          where: { id: targetInterviewId },
          data: {
            status: 'PUBLISHED',
            publishDate: finalScheduledAt
          }
        });
      }
    });

    return { schedule: updated, message: '更新成功' };
  });

  fastify.delete('/schedules/:id', async (request, reply) => {
    const scheduleId = Number(request.params.id);

    const existing = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
    if (!existing) {
      return reply.code(404).send({ error: '排期不存在' });
    }

    await prisma.interviewSchedule.delete({ where: { id: scheduleId } });
    return { message: '删除成功' };
  });
}

module.exports = routes;
