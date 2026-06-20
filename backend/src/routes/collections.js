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

  const formatCollection = (collection) => {
    if (!collection) return collection;
    return { ...collection, tags: parseJSONField(collection.tags, []) };
  };

  const formatCollectionZine = (cz) => {
    if (!cz) return cz;
    const zine = cz.zine ? { ...cz.zine, tags: parseJSONField(cz.zine.tags, []) } : null;
    return { ...cz, zine };
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
    if (sort === 'popular') orderBy = { viewCount: 'desc' };
    if (sort === 'liked') orderBy = { likeCount: 'desc' };
    if (sort === 'featured') orderBy = [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }];

    const [collectionsData, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          _count: { select: { zines: true } }
        }
      }),
      prisma.collection.count({ where })
    ]);

    const collections = collectionsData.map(c => ({
      ...formatCollection(c),
      zineCount: c._count.zines
    }));

    return {
      collections,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.get('/categories', async () => {
    const categories = [
      { id: 'all', name: '全部合集', icon: '📚' },
      { id: '精选推荐', name: '精选推荐', icon: '⭐' },
      { id: '主题特辑', name: '主题特辑', icon: '🎯' },
      { id: '创作灵感', name: '创作灵感', icon: '💡' },
      { id: '独立文化', name: '独立文化', icon: '🎨' },
      { id: '生活方式', name: '生活方式', icon: '🌿' },
      { id: '艺术设计', name: '艺术设计', icon: '🖼️' },
      { id: '文学诗歌', name: '文学诗歌', icon: '📝' },
      { id: '摄影影像', name: '摄影影像', icon: '📷' }
    ];
    return { categories };
  });

  fastify.get('/featured', async () => {
    const now = new Date();
    const featured = await prisma.featuredCollection.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] }
        ]
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        collection: {
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
        collection: {
          ...formatCollection(f.collection),
          zineCount: f.collection._count.zines
        }
      }))
    };
  });

  fastify.get('/:id', async (request, reply) => {
    const collectionId = Number(request.params.id);

    const collectionData = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        creator: { select: { id: true, username: true, avatar: true, bio: true } }
      }
    });

    if (!collectionData || collectionData.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: '合集不存在' });
    }

    await prisma.collection.update({
      where: { id: collectionId },
      data: { viewCount: collectionData.viewCount + 1 }
    });

    const zinesData = await prisma.collectionZine.findMany({
      where: { collectionId },
      orderBy: [{ sortOrder: 'asc' }, { addedAt: 'desc' }],
      include: {
        zine: {
          include: {
            author: { select: { id: true, username: true, avatar: true } }
          }
        }
      }
    });

    const zines = zinesData.map(formatCollectionZine);
    const collection = formatCollection({ ...collectionData, viewCount: collectionData.viewCount + 1 });

    return { collection, zines };
  });

  fastify.post('/:id/like', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const collectionId = Number(request.params.id);

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId }
    });

    if (!collection) {
      return reply.code(404).send({ error: '合集不存在' });
    }

    const updated = await prisma.collection.update({
      where: { id: collectionId },
      data: { likeCount: collection.likeCount + 1 }
    });

    return { likeCount: updated.likeCount };
  });
}

module.exports = routes;
