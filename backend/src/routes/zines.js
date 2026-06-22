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

  const formatZine = (zine) => {
    if (!zine) return zine;
    return { ...zine, tags: parseJSONField(zine.tags, []) };
  };

  const calculateHotScore = (z) => {
    const likeWeight = 3;
    const commentWeight = 2;
    const viewWeight = 0.01;
    const rawScore =
      (z.likes || 0) * likeWeight +
      (z.commentCount || 0) * commentWeight +
      (z.views || 0) * viewWeight;
    const ageHours = (Date.now() - new Date(z.createdAt).getTime()) / (1000 * 60 * 60);
    const decayFactor = Math.pow(0.995, ageHours);
    return Math.round(rawScore * decayFactor * 100) / 100;
  };

  const recalcHotScore = async (zineId) => {
    const z = await prisma.zine.findUnique({ where: { id: zineId } });
    if (!z) return;
    const newScore = calculateHotScore(z);
    await prisma.zine.update({
      where: { id: zineId },
      data: { hotScore: newScore, hotScoreUpdatedAt: new Date() }
    });
    return newScore;
  };

  fastify.get('/hot-recalc', { preHandler: [fastify.adminOnly] }, async () => {
    const zines = await prisma.zine.findMany({
      where: { status: 'PUBLISHED' }
    });
    let updated = 0;
    for (const z of zines) {
      const newScore = calculateHotScore(z);
      await prisma.zine.update({
        where: { id: z.id },
        data: { hotScore: newScore, hotScoreUpdatedAt: new Date() }
      });
      updated++;
    }
    return { updated, message: `已重新计算 ${updated} 个刊物的热度` };
  });

  fastify.get('/', async (request) => {
    const {
      category, search, page = 1, limit = 12, sort = 'newest',
      tags, authorId, minViews, minLikes, dateFrom, dateTo, dateField = 'updatedAt'
    } = request.query;
    const skip = (page - 1) * limit;

    const where = { status: 'PUBLISHED' };
    if (category && category !== 'all') where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }
    if (authorId && authorId !== 'all') where.authorId = Number(authorId);
    if (minViews) where.views = { gte: Number(minViews) };
    if (minLikes) where.likes = { gte: Number(minLikes) };
    if (dateFrom || dateTo) {
      where[dateField] = {};
      if (dateFrom) where[dateField].gte = new Date(dateFrom);
      if (dateTo) where[dateField].lte = new Date(dateTo);
    }

    const tagList = tags ? tags.split(',').filter(t => t.trim()) : [];

    let orderBy = { createdAt: 'desc' };
    if (sort === 'popular') orderBy = { views: 'desc' };
    if (sort === 'liked') orderBy = { likes: 'desc' };
    if (sort === 'hottest') orderBy = { hotScore: 'desc' };
    if (sort === 'recently-updated') orderBy = { updatedAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };

    let zinesData = await prisma.zine.findMany({
      where,
      orderBy,
      include: {
        author: { select: { id: true, username: true, avatar: true } }
      }
    });

    if (tagList.length > 0) {
      zinesData = zinesData.filter(zine => {
        const zineTags = parseJSONField(zine.tags, []);
        return tagList.every(tag => zineTags.includes(tag));
      });
    }

    const total = zinesData.length;
    const paginatedZines = zinesData.slice(skip, skip + Number(limit));
    const zines = paginatedZines.map(formatZine);

    return {
      zines,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.get('/tags', async () => {
    const zines = await prisma.zine.findMany({
      where: { status: 'PUBLISHED' },
      select: { tags: true }
    });

    const tagSet = new Set();
    zines.forEach(zine => {
      const tags = parseJSONField(zine.tags, []);
      tags.forEach(tag => tagSet.add(tag));
    });

    const tags = Array.from(tagSet).sort();
    return { tags };
  });

  fastify.get('/authors', async () => {
    const authors = await prisma.user.findMany({
      where: {
        zines: { some: { status: 'PUBLISHED' } }
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        _count: { select: { zines: true } }
      },
      orderBy: { zines: { _count: 'desc' } }
    });

    return { authors };
  });

  fastify.get('/categories', async () => {
    const categories = [
      { id: 'all', name: '全部', icon: '📚' },
      { id: '文学', name: '文学创作', icon: '✍️' },
      { id: '艺术', name: '艺术插画', icon: '🎨' },
      { id: '摄影', name: '摄影作品', icon: '📷' },
      { id: '音乐', name: '音乐文化', icon: '🎵' },
      { id: '生活', name: '生活方式', icon: '🌿' },
      { id: '亚文化', name: '亚文化', icon: '💀' },
      { id: '学术', name: '独立学术', icon: '📖' },
      { id: '漫画', name: '独立漫画', icon: '🎭' }
    ];
    return { categories };
  });

  fastify.get('/:id', async (request, reply) => {
    const zineData = await prisma.zine.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        author: { select: { id: true, username: true, avatar: true, bio: true } }
      }
    });

    if (!zineData || zineData.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: '刊物不存在' });
    }

    let user = null;
    try {
      const decoded = await request.jwtVerify();
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      }
    } catch (e) {}

    let isLiked = false;
    if (user) {
      const likeRecord = await prisma.zineLike.findUnique({
        where: {
          zineId_userId: {
            zineId: zineData.id,
            userId: user.id
          }
        }
      });
      isLiked = !!likeRecord;
    }

    const updated = await prisma.zine.update({
      where: { id: zineData.id },
      data: { views: zineData.views + 1 }
    });

    await recalcHotScore(zineData.id);

    const zine = formatZine({ ...zineData, views: updated.views, isLiked });
    return { zine };
  });

  fastify.post('/:id/like', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const zine = await prisma.zine.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!zine) {
      return reply.code(404).send({ error: '刊物不存在' });
    }

    if (zine.status !== 'PUBLISHED') {
      return reply.code(400).send({ error: '只能对已发布的刊物点赞' });
    }

    const existing = await prisma.zineLike.findUnique({
      where: {
        zineId_userId: {
          zineId: zine.id,
          userId: request.user.id
        }
      }
    });

    if (existing) {
      await prisma.zineLike.delete({ where: { id: existing.id } });
      const updated = await prisma.zine.update({
        where: { id: zine.id },
        data: { likes: { decrement: 1 } }
      });
      const newHotScore = await recalcHotScore(zine.id);
      return { liked: false, likes: updated.likes, hotScore: newHotScore, message: '已取消收藏' };
    }

    await prisma.zineLike.create({
      data: {
        zineId: zine.id,
        userId: request.user.id
      }
    });
    const updated = await prisma.zine.update({
      where: { id: zine.id },
      data: { likes: { increment: 1 } }
    });
    const newHotScore = await recalcHotScore(zine.id);
    return { liked: true, likes: updated.likes, hotScore: newHotScore, message: '已收藏' };
  });
}

module.exports = routes;
