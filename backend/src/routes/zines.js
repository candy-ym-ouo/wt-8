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

  fastify.get('/', async (request) => {
    const { category, search, page = 1, limit = 12, sort = 'newest' } = request.query;
    const skip = (page - 1) * limit;

    const where = { status: 'PUBLISHED' };
    if (category && category !== 'all') where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'popular') orderBy = { views: 'desc' };
    if (sort === 'liked') orderBy = { likes: 'desc' };

    const [zinesData, total] = await Promise.all([
      prisma.zine.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          author: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.zine.count({ where })
    ]);

    const zines = zinesData.map(formatZine);

    return {
      zines,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
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

    const updated = await prisma.zine.update({
      where: { id: zineData.id },
      data: { views: zineData.views + 1 }
    });

    const zine = formatZine({ ...zineData, views: updated.views });
    return { zine };
  });

  fastify.post('/:id/like', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const zine = await prisma.zine.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!zine) {
      return reply.code(404).send({ error: '刊物不存在' });
    }

    const updated = await prisma.zine.update({
      where: { id: zine.id },
      data: { likes: zine.likes + 1 }
    });

    return { likes: updated.likes };
  });
}

module.exports = routes;
