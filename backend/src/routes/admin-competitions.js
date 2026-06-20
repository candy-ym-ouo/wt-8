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
  return {
    ...c,
    tags: parseJSONField(c.tags, []),
    judges: parseJSONField(c.judges, [])
  };
};

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { status, category, page = 1, limit = 20, keyword } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all') where.category = category;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } }
      ];
    }

    const [competitionsData, total] = await Promise.all([
      prisma.competition.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ createdAt: 'desc' }],
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          _count: { select: { entries: true, groups: true } },
          reviewer: { select: { id: true, username: true } }
        }
      }),
      prisma.competition.count({ where })
    ]);

    const competitions = competitionsData.map(c => ({
      ...formatCompetition(c),
      entryCount: c._count.entries,
      groupCount: c._count.groups
    }));

    return { competitions, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/stats', { preHandler: [fastify.adminOnly] }, async () => {
    const [total, published, pending, ongoing, completed] = await Promise.all([
      prisma.competition.count(),
      prisma.competition.count({ where: { status: 'PUBLISHED' } }),
      prisma.competition.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.competition.count({ where: { status: 'PUBLISHED', startDate: { lte: new Date() }, endDate: { gte: new Date() } } }),
      prisma.competition.count({ where: { status: 'COMPLETED' } })
    ]);

    const totalEntries = await prisma.competitionEntry.count();
    const totalScores = await prisma.competitionScore.count();

    return {
      total,
      published,
      pending,
      ongoing,
      completed,
      totalEntries,
      totalScores
    };
  });

  fastify.post('/:id/publish', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const competition = await prisma.competition.findUnique({ where: { id: Number(id) } });

    if (!competition) {
      return reply.code(404).send({ error: '比赛不存在' });
    }

    if (competition.status === 'PUBLISHED') {
      return reply.code(400).send({ error: '比赛已发布' });
    }

    const updated = await prisma.competition.update({
      where: { id: Number(id) },
      data: {
        status: 'PUBLISHED',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    if (competition.status === 'PENDING_REVIEW') {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: competition.creatorId,
          title: '🎉 创作比赛已审核通过',
          content: `恭喜！您的创作比赛《${competition.title}》已通过审核并成功发布！\n\n现在创作者可以浏览并向您的比赛投稿了。`,
          type: 'COMPETITION'
        }
      });
    }

    return { competition: formatCompetition(updated), message: '发布成功' };
  });

  fastify.post('/:id/reject', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const { reason } = request.body;
    const competition = await prisma.competition.findUnique({ where: { id: Number(id) } });

    if (!competition) {
      return reply.code(404).send({ error: '比赛不存在' });
    }

    if (competition.status !== 'PENDING_REVIEW') {
      return reply.code(400).send({ error: '当前状态不可驳回' });
    }

    const updated = await prisma.competition.update({
      where: { id: Number(id) },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || '未通过审核',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: competition.creatorId,
        title: '创作比赛未通过审核',
        content: `很遗憾，您的创作比赛《${competition.title}》未通过审核。\n\n${reason ? '原因：' + reason + '\n\n' : ''}您可以根据审核意见修改后重新提交。`,
        type: 'COMPETITION'
      }
    });

    return { competition: formatCompetition(updated), message: '已驳回' };
  });

  fastify.post('/:id/feature', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const competition = await prisma.competition.findUnique({ where: { id: Number(id) } });

    if (!competition) {
      return reply.code(404).send({ error: '比赛不存在' });
    }

    const updated = await prisma.competition.update({
      where: { id: Number(id) },
      data: { isFeatured: !competition.isFeatured }
    });

    return {
      competition: formatCompetition(updated),
      message: updated.isFeatured ? '已设为精选' : '已取消精选'
    };
  });

  fastify.post('/:id/complete', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const competition = await prisma.competition.findUnique({ where: { id: Number(id) } });

    if (!competition) {
      return reply.code(404).send({ error: '比赛不存在' });
    }

    if (competition.status !== 'PUBLISHED') {
      return reply.code(400).send({ error: '只有已发布的比赛可以结束' });
    }

    const updated = await prisma.competition.update({
      where: { id: Number(id) },
      data: { status: 'COMPLETED' }
    });

    const entries = await prisma.competitionEntry.findMany({
      where: { competitionId: Number(id) },
      include: { user: true }
    });

    for (const entry of entries) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: entry.userId,
          title: '创作比赛已结束',
          content: `您参与的创作比赛《${competition.title}》已结束，请关注结果公示。`,
          type: 'COMPETITION'
        }
      });
    }

    return { competition: formatCompetition(updated), message: '比赛已结束' };
  });

  fastify.post('/:id/publish-result', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const competition = await prisma.competition.findUnique({ where: { id: Number(id) } });

    if (!competition) {
      return reply.code(404).send({ error: '比赛不存在' });
    }

    const updated = await prisma.competition.update({
      where: { id: Number(id) },
      data: { isResultPublic: true }
    });

    const entries = await prisma.competitionEntry.findMany({
      where: { competitionId: Number(id), status: 'APPROVED' },
      include: { user: true, scores: true }
    });

    for (const entry of entries) {
      const avgScore = entry.scores.length > 0
        ? Math.round((entry.scores.reduce((sum, s) => sum + s.score, 0) / entry.scores.length) * 100) / 100
        : 0;
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: entry.userId,
          title: '🎉 比赛结果已公示',
          content: `创作比赛《${competition.title}》的结果已公示！\n\n您的作品《${entry.title}》获得了 ${avgScore} 分。\n\n请前往比赛页面查看完整榜单。`,
          type: 'COMPETITION'
        }
      });
    }

    return { competition: formatCompetition(updated), message: '结果已公示' };
  });

  fastify.delete('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const competition = await prisma.competition.findUnique({ where: { id: Number(id) } });

    if (!competition) {
      return reply.code(404).send({ error: '比赛不存在' });
    }

    await prisma.competitionScore.deleteMany({
      where: { entry: { competitionId: Number(id) } }
    });
    await prisma.competitionEntry.deleteMany({ where: { competitionId: Number(id) } });
    await prisma.competitionGroup.deleteMany({ where: { competitionId: Number(id) } });
    await prisma.competition.delete({ where: { id: Number(id) } });

    return { message: '删除成功' };
  });

  fastify.get('/entries', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { competitionId, status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (competitionId) where.competitionId = Number(competitionId);
    if (status && status !== 'all') where.status = status;

    const [entries, total] = await Promise.all([
      prisma.competitionEntry.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          competition: { select: { id: true, title: true } },
          user: { select: { id: true, username: true, avatar: true } },
          group: { select: { id: true, name: true } },
          scores: {
            include: {
              judge: { select: { id: true, username: true } }
            }
          }
        }
      }),
      prisma.competitionEntry.count({ where })
    ]);

    const formatted = entries.map(e => ({
      ...e,
      images: parseJSONField(e.images, []),
      avgScore: e.scores.length > 0
        ? Math.round((e.scores.reduce((sum, s) => sum + s.score, 0) / e.scores.length) * 100) / 100
        : 0
    }));

    return { entries: formatted, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.put('/entries/:entryId/approve', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { entryId } = request.params;
    const entry = await prisma.competitionEntry.findUnique({
      where: { id: Number(entryId) },
      include: { competition: true }
    });

    if (!entry) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (entry.status !== 'PENDING') {
      return reply.code(400).send({ error: '当前状态不可审核' });
    }

    const updated = await prisma.competitionEntry.update({
      where: { id: Number(entryId) },
      data: {
        status: 'APPROVED',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: entry.userId,
        title: '🎉 比赛投稿已通过',
        content: `您在比赛《${entry.competition.title}》中的投稿《${entry.title}》已通过审核！`,
        type: 'COMPETITION'
      }
    });

    return { entry: updated, message: '已通过' };
  });

  fastify.put('/entries/:entryId/reject', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { entryId } = request.params;
    const { reason } = request.body;
    const entry = await prisma.competitionEntry.findUnique({
      where: { id: Number(entryId) },
      include: { competition: true }
    });

    if (!entry) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (entry.status !== 'PENDING') {
      return reply.code(400).send({ error: '当前状态不可驳回' });
    }

    const updated = await prisma.competitionEntry.update({
      where: { id: Number(entryId) },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || '未通过审核',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: entry.userId,
        title: '比赛投稿未通过',
        content: `您在比赛《${entry.competition.title}》中的投稿《${entry.title}》未通过审核。\n\n${reason ? '原因：' + reason : ''}`,
        type: 'COMPETITION'
      }
    });

    return { entry: updated, message: '已驳回' };
  });

  fastify.post('/entries/:entryId/score', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { entryId } = request.params;
    const { score, comment } = request.body;

    const entry = await prisma.competitionEntry.findUnique({
      where: { id: Number(entryId) },
      include: { competition: true }
    });

    if (!entry) {
      return reply.code(404).send({ error: '投稿不存在' });
    }

    if (score === undefined || score < 0 || score > 100) {
      return reply.code(400).send({ error: '评分须在 0-100 之间' });
    }

    const existing = await prisma.competitionScore.findUnique({
      where: {
        entryId_judgeId: {
          entryId: Number(entryId),
          judgeId: request.user.id
        }
      }
    });

    let scoreRecord;
    if (existing) {
      scoreRecord = await prisma.competitionScore.update({
        where: { id: existing.id },
        data: {
          score: Number(score),
          comment: comment || null
        }
      });
    } else {
      scoreRecord = await prisma.competitionScore.create({
        data: {
          entryId: Number(entryId),
          judgeId: request.user.id,
          score: Number(score),
          comment: comment || null
        }
      });
    }

    return { score: scoreRecord, message: existing ? '评分已更新' : '评分成功' };
  });

  fastify.get('/ranking/:competitionId', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { competitionId } = request.params;
    const { groupId } = request.query;

    const where = { competitionId: Number(competitionId), status: 'APPROVED' };
    if (groupId) where.groupId = Number(groupId);

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
      }
    });

    const ranking = entries.map(e => {
      const scores = e.scores || [];
      const avgScore = scores.length > 0
        ? Math.round((scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 100) / 100
        : 0;
      return {
        id: e.id,
        title: e.title,
        content: e.content,
        images: parseJSONField(e.images, []),
        user: e.user,
        group: e.group,
        avgScore,
        scoreCount: scores.length,
        scores: scores.map(s => ({
          id: s.id,
          score: s.score,
          comment: s.comment,
          judge: s.judge
        }))
      };
    }).sort((a, b) => b.avgScore - a.avgScore);

    return { ranking };
  });
}

module.exports = routes;
