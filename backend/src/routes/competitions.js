function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const formatCompetition = (c) => {
  if (!c) return c;
  const now = new Date();
  let phase = 'UPCOMING';
  if (c.status === 'PUBLISHED') {
    if (now < new Date(c.startDate)) phase = 'UPCOMING';
    else if (now > new Date(c.endDate)) phase = 'ENDED';
    else phase = 'ONGOING';
  } else if (c.status === 'COMPLETED') {
    phase = 'COMPLETED';
  }
  return {
    ...c,
    tags: parseJSONField(c.tags, []),
    judges: parseJSONField(c.judges, []),
    phase,
    isAcceptingEntries: c.status === 'PUBLISHED' && phase === 'ONGOING'
  };
};

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', async (request) => {
    const { status, category, page = 1, limit = 20, keyword, sort = 'newest' } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    let user = null;
    try {
      const decoded = await request.jwtVerify();
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      }
    } catch (e) {}

    if (!user || user.role === 'USER') {
      where.status = { in: ['PUBLISHED', 'COMPLETED'] };
    } else if (status && status !== 'all') {
      where.status = status;
    }

    if (category && category !== 'all') where.category = category;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } }
      ];
    }

    let orderBy;
    switch (sort) {
      case 'most-entries':
        orderBy = { entryCount: 'desc' };
        break;
      case 'ending-soon':
        orderBy = { endDate: 'asc' };
        break;
      default:
        orderBy = [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }];
    }

    const [competitionsData, total] = await Promise.all([
      prisma.competition.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          _count: { select: { entries: true, groups: true } }
        }
      }),
      prisma.competition.count({ where })
    ]);

    const competitions = competitionsData.map(c => ({
      ...formatCompetition(c),
      groupCount: c._count.groups
    }));

    return { competitions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/mine', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = { creatorId: request.user.id };

    if (status && status !== 'all') where.status = status;

    const [competitionsData, total] = await Promise.all([
      prisma.competition.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { entries: true, groups: true } },
          reviewer: { select: { id: true, username: true } }
        }
      }),
      prisma.competition.count({ where })
    ]);

    const competitions = competitionsData.map(c => ({
      ...formatCompetition(c),
      groupCount: c._count.groups
    }));

    return { competitions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', async (request, reply) => {
    const competitionData = await prisma.competition.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true, avatar: true, bio: true } },
        groups: { orderBy: { sortOrder: 'asc' } },
        reviewer: { select: { id: true, username: true } },
        _count: { select: { entries: true } }
      }
    });

    if (!competitionData) {
      return reply.code(404).send({ error: '比赛不存在' });
    }

    let user = null;
    try {
      const decoded = await request.jwtVerify();
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      }
    } catch (e) {}

    const isOwner = user && competitionData.creatorId === user.id;
    const isAdmin = user && user.role === 'ADMIN';

    if (!['PUBLISHED', 'COMPLETED'].includes(competitionData.status) && !isOwner && !isAdmin) {
      return reply.code(403).send({ error: '无权查看此比赛' });
    }

    const competition = formatCompetition(competitionData);

    if (user && competition.status === 'PUBLISHED' && !isOwner && !isAdmin) {
      await prisma.competition.update({
        where: { id: competition.id },
        data: { viewCount: { increment: 1 } }
      });
      competition.viewCount += 1;
    }

    let userEntry = null;
    if (user) {
      userEntry = await prisma.competitionEntry.findUnique({
        where: {
          competitionId_userId: {
            competitionId: competition.id,
            userId: user.id
          }
        }
      });
    }

    let ranking = [];
    if (competition.isResultPublic || isOwner || isAdmin) {
      const entries = await prisma.competitionEntry.findMany({
        where: { competitionId: competition.id, status: 'APPROVED' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          group: { select: { id: true, name: true } },
          scores: true
        }
      });
      ranking = entries.map(e => {
        const scores = e.scores || [];
        const avgScore = scores.length > 0
          ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
          : 0;
        return {
          id: e.id,
          title: e.title,
          user: e.user,
          group: e.group,
          avgScore: Math.round(avgScore * 100) / 100,
          scoreCount: scores.length,
          images: parseJSONField(e.images, [])
        };
      }).sort((a, b) => b.avgScore - a.avgScore);
    }

    return { competition, userEntry, isOwner, isAdmin, ranking };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const {
      title, description, coverImage, category, tags,
      rules, prizes, judges, startDate, endDate, resultDate,
      maxEntries, scoringMode, groups, status
    } = request.body;

    if (!title || !description) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    if (!startDate || !endDate) {
      return reply.code(400).send({ error: '请设置比赛时间' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    let initialStatus;
    if (status && isAdmin) {
      initialStatus = status;
    } else {
      initialStatus = isAdmin ? 'DRAFT' : 'PENDING_REVIEW';
    }

    const competition = await prisma.competition.create({
      data: {
        title,
        description,
        coverImage: coverImage || null,
        category: category || 'CREATION',
        tags: tags ? JSON.stringify(tags) : '[]',
        rules: rules || null,
        prizes: prizes || null,
        judges: judges ? JSON.stringify(judges) : '[]',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        resultDate: resultDate ? new Date(resultDate) : null,
        maxEntries: Number(maxEntries) || 0,
        scoringMode: scoringMode || 'AVERAGE',
        status: initialStatus,
        creatorId: request.user.id
      }
    });

    if (groups && Array.isArray(groups) && groups.length > 0) {
      for (const group of groups) {
        await prisma.competitionGroup.create({
          data: {
            competitionId: competition.id,
            name: group.name,
            description: group.description || null,
            sortOrder: Number(group.sortOrder) || 0
          }
        });
      }
    }

    if (!isAdmin && initialStatus === 'PENDING_REVIEW') {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: request.user.id,
          title: '创作比赛已提交审核',
          content: `您创建的比赛《${competition.title}》已成功提交，等待管理员审核。\n\n审核通过后将自动发布，审核结果将通过站内消息通知您。`,
          type: 'COMPETITION'
        }
      });

      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await prisma.message.create({
          data: {
            senderId: request.user.id,
            receiverId: admin.id,
            title: '新的创作比赛待审核',
            content: `用户 ${user.username} 提交了新的创作比赛《${competition.title}》，请及时审核。`,
            type: 'COMPETITION'
          }
        });
      }
    }

    return {
      competition: formatCompetition(competition),
      message: isAdmin ? '比赛创建成功' : '比赛已提交，等待审核'
    };
  });

  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const competition = await prisma.competition.findUnique({ where: { id: Number(id) } });

    if (!competition) {
      return reply.code(404).send({ error: '比赛不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = competition.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权编辑此比赛' });
    }

    const data = request.body;
    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.rules !== undefined) updateData.rules = data.rules;
    if (data.prizes !== undefined) updateData.prizes = data.prizes;
    if (data.judges !== undefined) updateData.judges = JSON.stringify(data.judges);
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.resultDate !== undefined) updateData.resultDate = data.resultDate ? new Date(data.resultDate) : null;
    if (data.maxEntries !== undefined) updateData.maxEntries = Number(data.maxEntries);
    if (data.scoringMode !== undefined) updateData.scoringMode = data.scoringMode;

    if (isAdmin) {
      if (data.status !== undefined) updateData.status = data.status;
      if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
      if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);
      if (data.isResultPublic !== undefined) updateData.isResultPublic = data.isResultPublic;
    }

    if (isOwner && !isAdmin && ['PUBLISHED', 'PENDING_REVIEW', 'REJECTED'].includes(competition.status)) {
      if (['PUBLISHED', 'PENDING_REVIEW'].includes(competition.status)) {
        updateData.status = 'PENDING_REVIEW';
      }
    }

    const updated = await prisma.competition.update({
      where: { id: Number(id) },
      data: updateData
    });

    if (data.groups && Array.isArray(data.groups)) {
      const existingGroups = await prisma.competitionGroup.findMany({
        where: { competitionId: Number(id) }
      });
      const existingGroupIds = existingGroups.map(g => g.id);
      const newGroupIds = data.groups.filter(g => g.id).map(g => g.id);
      const groupsToDelete = existingGroupIds.filter(gid => !newGroupIds.includes(gid));

      for (const groupId of groupsToDelete) {
        await prisma.competitionEntry.updateMany({
          where: { groupId },
          data: { groupId: null }
        });
        await prisma.competitionGroup.delete({ where: { id: groupId } });
      }

      for (const group of data.groups) {
        if (group.id) {
          await prisma.competitionGroup.update({
            where: { id: group.id },
            data: {
              name: group.name,
              description: group.description || null,
              sortOrder: Number(group.sortOrder) || 0
            }
          });
        } else {
          await prisma.competitionGroup.create({
            data: {
              competitionId: Number(id),
              name: group.name,
              description: group.description || null,
              sortOrder: Number(group.sortOrder) || 0
            }
          });
        }
      }
    }

    return { competition: formatCompetition(updated), message: '更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const competition = await prisma.competition.findUnique({ where: { id: Number(id) } });

    if (!competition) {
      return reply.code(404).send({ error: '比赛不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = competition.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权删除此比赛' });
    }

    await prisma.competitionScore.deleteMany({
      where: { entry: { competitionId: Number(id) } }
    });
    await prisma.competitionEntry.deleteMany({ where: { competitionId: Number(id) } });
    await prisma.competitionGroup.deleteMany({ where: { competitionId: Number(id) } });
    await prisma.competition.delete({ where: { id: Number(id) } });

    return { message: '删除成功' };
  });

  fastify.post('/:id/entries', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { groupId, title, content, images } = request.body;

    const competition = await prisma.competition.findUnique({
      where: { id: Number(id) },
      include: { groups: true }
    });

    if (!competition) {
      return reply.code(404).send({ error: '比赛不存在' });
    }

    if (competition.status !== 'PUBLISHED') {
      return reply.code(400).send({ error: '比赛未开放投稿' });
    }

    const now = new Date();
    if (now < new Date(competition.startDate) || now > new Date(competition.endDate)) {
      return reply.code(400).send({ error: '不在投稿时间范围内' });
    }

    if (competition.maxEntries > 0 && competition.entryCount >= competition.maxEntries) {
      return reply.code(400).send({ error: '投稿名额已满' });
    }

    const existing = await prisma.competitionEntry.findUnique({
      where: {
        competitionId_userId: {
          competitionId: Number(id),
          userId: request.user.id
        }
      }
    });

    if (existing) {
      return reply.code(400).send({ error: '您已投稿，不能重复投稿' });
    }

    if (!title || !content) {
      return reply.code(400).send({ error: '请填写标题和内容' });
    }

    const entry = await prisma.competitionEntry.create({
      data: {
        competitionId: Number(id),
        groupId: groupId ? Number(groupId) : null,
        userId: request.user.id,
        title,
        content,
        images: images ? JSON.stringify(images) : '[]',
        status: 'PENDING'
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        group: { select: { id: true, name: true } }
      }
    });

    await prisma.competition.update({
      where: { id: Number(id) },
      data: { entryCount: { increment: 1 } }
    });

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: request.user.id,
        title: '比赛投稿成功',
        content: `您已成功向比赛《${competition.title}》投稿《${title}》。\n\n投稿审核结果将通过站内消息通知您。`,
        type: 'COMPETITION'
      }
    });

    return {
      entry: {
        ...entry,
        images: parseJSONField(entry.images, [])
      },
      message: '投稿成功'
    };
  });

  fastify.put('/:id/entries', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { title, content, images, groupId } = request.body;

    const entry = await prisma.competitionEntry.findUnique({
      where: {
        competitionId_userId: {
          competitionId: Number(id),
          userId: request.user.id
        }
      }
    });

    if (!entry) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (!['PENDING', 'REJECTED'].includes(entry.status)) {
      return reply.code(400).send({ error: '当前状态不可修改投稿' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (images !== undefined) updateData.images = JSON.stringify(images);
    if (groupId !== undefined) updateData.groupId = Number(groupId) || null;
    updateData.status = 'PENDING';
    updateData.rejectionReason = null;

    const updated = await prisma.competitionEntry.update({
      where: { id: entry.id },
      data: updateData,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        group: { select: { id: true, name: true } }
      }
    });

    return {
      entry: {
        ...updated,
        images: parseJSONField(updated.images, [])
      },
      message: '投稿已更新'
    };
  });

  fastify.get('/:id/entries', async (request) => {
    const { id } = request.params;
    const { groupId, status, page = 1, limit = 50 } = request.query;
    const where = { competitionId: Number(id) };

    if (groupId) where.groupId = Number(groupId);
    if (status) where.status = status;

    let user = null;
    try {
      const decoded = await request.jwtVerify();
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      }
    } catch (e) {}

    const competition = await prisma.competition.findUnique({
      where: { id: Number(id) }
    });

    const isOwner = user && competition && competition.creatorId === user.id;
    const isAdmin = user && user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      where.status = 'APPROVED';
    }

    const entries = await prisma.competitionEntry.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        group: { select: { id: true, name: true } },
        scores: {
          include: {
            judge: { select: { id: true, username: true, avatar: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit)
    });

    const formatted = entries.map(e => ({
      ...e,
      images: parseJSONField(e.images, []),
      avgScore: e.scores.length > 0
        ? Math.round((e.scores.reduce((sum, s) => sum + s.score, 0) / e.scores.length) * 100) / 100
        : 0
    }));

    return { entries: formatted };
  });

  fastify.post('/:id/resubmit', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const competition = await prisma.competition.findUnique({ where: { id: Number(id) } });

    if (!competition) {
      return reply.code(404).send({ error: '比赛不存在' });
    }

    if (competition.creatorId !== request.user.id) {
      return reply.code(403).send({ error: '无权操作此比赛' });
    }

    if (!['DRAFT', 'REJECTED'].includes(competition.status)) {
      return reply.code(400).send({ error: '当前状态不可重新提交' });
    }

    const updated = await prisma.competition.update({
      where: { id: Number(id) },
      data: {
        status: 'PENDING_REVIEW',
        rejectionReason: null,
        reviewerId: null,
        reviewedAt: null
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: request.user.id,
        title: '比赛已重新提交',
        content: `您的比赛《${competition.title}》已重新提交审核。`,
        type: 'COMPETITION'
      }
    });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: admin.id,
          title: '比赛重新提交审核',
          content: `用户重新提交了比赛《${competition.title}》，请及时审核。`,
          type: 'COMPETITION'
        }
      });
    }

    return { competition: formatCompetition(updated), message: '已重新提交审核' };
  });
}

module.exports = routes;
