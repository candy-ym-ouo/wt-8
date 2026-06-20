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

  const formatInterview = (interview) => {
    if (!interview) return interview;
    return { ...interview, tags: parseJSONField(interview.tags, []) };
  };

  const formatInterviewZine = (iz) => {
    if (!iz) return iz;
    const zine = iz.zine ? { ...iz.zine, tags: parseJSONField(iz.zine.tags, []) } : null;
    return { ...iz, zine };
  };

  fastify.get('/', async (request) => {
    const { category, search, page = 1, limit = 12, sort = 'newest' } = request.query;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where = {
      status: 'PUBLISHED',
      AND: [
        {
          OR: [
            { publishDate: null },
            { publishDate: { lte: now } }
          ]
        }
      ]
    };
    if (category && category !== 'all') where.category = category;
    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { authorName: { contains: search } }
        ]
      });
    }

    let orderBy = [{ publishDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
    if (sort === 'popular') orderBy = { viewCount: 'desc' };
    if (sort === 'liked') orderBy = { likeCount: 'desc' };
    if (sort === 'featured') orderBy = [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { publishDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];

    const [interviewsData, total] = await Promise.all([
      prisma.interview.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
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

    return {
      interviews,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.get('/categories', async () => {
    const categories = [
      { id: 'all', name: '全部访谈', icon: '📚' },
      { id: 'CREATOR', name: '创作者专访', icon: '✍️' },
      { id: 'DESIGNER', name: '设计师访谈', icon: '🎨' },
      { id: 'PHOTOGRAPHER', name: '摄影师对话', icon: '📷' },
      { id: 'WRITER', name: '作家笔谈', icon: '📝' },
      { id: 'ARTIST', name: '艺术家专访', icon: '🖼️' },
      { id: 'PUBLISHER', name: '出版人访谈', icon: '📖' },
      { id: 'OTHER', name: '其他', icon: '💬' }
    ];
    return { categories };
  });

  fastify.get('/featured', async () => {
    const now = new Date();
    const featured = await prisma.featuredInterview.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] }
        ],
        interview: {
          status: 'PUBLISHED',
          OR: [
            { publishDate: null },
            { publishDate: { lte: now } }
          ]
        }
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        interview: {
          include: {
            creator: { select: { id: true, username: true, avatar: true } },
            _count: { select: { zines: true } }
          }
        }
      }
    });

    return {
      featured: featured.map(f => ({
        ...f,
        interview: {
          ...formatInterview(f.interview),
          zineCount: f.interview._count.zines
        }
      }))
    };
  });

  fastify.get('/:id', async (request, reply) => {
    const interviewId = Number(request.params.id);
    const now = new Date();

    const interviewData = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        creator: { select: { id: true, username: true, avatar: true, bio: true } },
        authorUser: { select: { id: true, username: true, avatar: true, bio: true } }
      }
    });

    if (!interviewData || interviewData.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: '访谈不存在' });
    }

    if (interviewData.publishDate && interviewData.publishDate > now) {
      return reply.code(404).send({ error: '访谈不存在' });
    }

    await prisma.interview.update({
      where: { id: interviewId },
      data: { viewCount: interviewData.viewCount + 1 }
    });

    const zinesData = await prisma.interviewZine.findMany({
      where: { interviewId },
      orderBy: [{ sortOrder: 'asc' }, { addedAt: 'desc' }],
      include: {
        zine: {
          include: {
            author: { select: { id: true, username: true, avatar: true } }
          }
        }
      }
    });

    const zines = zinesData.map(formatInterviewZine);
    const interview = formatInterview({ ...interviewData, viewCount: interviewData.viewCount + 1 });

    return { interview, zines };
  });

  fastify.get('/:id/comments', async (request, reply) => {
    const interviewId = Number(request.params.id);
    const { page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const now = new Date();

    const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview || interview.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: '访谈不存在' });
    }
    if (interview.publishDate && interview.publishDate > now) {
      return reply.code(404).send({ error: '访谈不存在' });
    }

    const [comments, total] = await Promise.all([
      prisma.interviewComment.findMany({
        where: { interviewId, status: 'APPROVED' },
        skip,
        take: Number(limit),
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.interviewComment.count({ where: { interviewId, status: 'APPROVED' } })
    ]);

    return {
      comments,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.post('/:id/comments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const interviewId = Number(request.params.id);
    const { content } = request.body;
    const now = new Date();

    if (!content || !content.trim()) {
      return reply.code(400).send({ error: '评论内容不能为空' });
    }

    const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview || interview.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: '访谈不存在' });
    }
    if (interview.publishDate && interview.publishDate > now) {
      return reply.code(404).send({ error: '访谈不存在' });
    }

    const comment = await prisma.interviewComment.create({
      data: {
        interviewId,
        userId: request.user.id,
        content: content.trim()
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } }
      }
    });

    await prisma.interview.update({
      where: { id: interviewId },
      data: { commentCount: { increment: 1 } }
    });

    return { comment, message: '评论成功' };
  });

  fastify.post('/:id/like', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const interviewId = Number(request.params.id);
    const now = new Date();

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });

    if (!interview || interview.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: '访谈不存在' });
    }
    if (interview.publishDate && interview.publishDate > now) {
      return reply.code(404).send({ error: '访谈不存在' });
    }

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: { likeCount: interview.likeCount + 1 }
    });

    return { likeCount: updated.likeCount };
  });
}

module.exports = routes;
