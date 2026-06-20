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

  const formatCollection = (c) => c ? { ...c, tags: parseJSONField(c.tags, []) } : c;
  const formatZine = (z) => z ? { ...z, tags: parseJSONField(z.tags, []) } : z;

  fastify.get('/stats', async () => {
    const [
      totalCollections,
      publishedCollections,
      draftCollections,
      totalCollectionZines,
      totalFeatured
    ] = await Promise.all([
      prisma.collection.count(),
      prisma.collection.count({ where: { status: 'PUBLISHED' } }),
      prisma.collection.count({ where: { status: 'DRAFT' } }),
      prisma.collectionZine.count(),
      prisma.featuredCollection.count({ where: { isActive: true } })
    ]);

    return {
      stats: {
        totalCollections,
        publishedCollections,
        draftCollections,
        totalCollectionZines,
        totalFeatured
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
        { description: { contains: search } }
      ];
    }

    const [collectionsData, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          creator: { select: { id: true, username: true } },
          _count: { select: { zines: true } }
        }
      }),
      prisma.collection.count({ where })
    ]);

    const collections = collectionsData.map(c => ({
      ...formatCollection(c),
      zineCount: c._count.zines
    }));

    return { collections, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', async (request, reply) => {
    const collection = await prisma.collection.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true } },
        featured: true
      }
    });

    if (!collection) {
      return reply.code(404).send({ error: '合集不存在' });
    }

    return { collection: formatCollection(collection) };
  });

  fastify.post('/', async (request) => {
    const {
      title,
      description,
      coverImage,
      content,
      category,
      tags = [],
      status = 'DRAFT',
      sortOrder = 0
    } = request.body;

    const collection = await prisma.collection.create({
      data: {
        title,
        description,
        coverImage: coverImage || `https://picsum.photos/seed/collection${Date.now()}/800/600`,
        content: content || description,
        category: category || '精选推荐',
        tags: JSON.stringify(tags),
        status,
        sortOrder,
        creatorId: request.user.id
      }
    });

    return { collection: formatCollection(collection), message: '创建成功' };
  });

  fastify.put('/:id', async (request, reply) => {
    const collectionId = Number(request.params.id);
    const existing = await prisma.collection.findUnique({ where: { id: collectionId } });

    if (!existing) {
      return reply.code(404).send({ error: '合集不存在' });
    }

    const {
      title,
      description,
      coverImage,
      content,
      category,
      tags,
      status,
      sortOrder,
      isFeatured
    } = request.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (status !== undefined) updateData.status = status;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;

    const updated = await prisma.collection.update({
      where: { id: collectionId },
      data: updateData
    });

    return { collection: formatCollection(updated), message: '更新成功' };
  });

  fastify.delete('/:id', async (request, reply) => {
    const collectionId = Number(request.params.id);
    const existing = await prisma.collection.findUnique({ where: { id: collectionId } });

    if (!existing) {
      return reply.code(404).send({ error: '合集不存在' });
    }

    await prisma.collectionZine.deleteMany({ where: { collectionId } });
    await prisma.featuredCollection.deleteMany({ where: { collectionId } });
    await prisma.collection.delete({ where: { id: collectionId } });

    return { message: '删除成功' };
  });

  fastify.get('/:id/zines', async (request, reply) => {
    const collectionId = Number(request.params.id);
    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });

    if (!collection) {
      return reply.code(404).send({ error: '合集不存在' });
    }

    const zinesData = await prisma.collectionZine.findMany({
      where: { collectionId },
      orderBy: [{ sortOrder: 'asc' }, { addedAt: 'desc' }],
      include: {
        zine: {
          include: {
            author: { select: { id: true, username: true } }
          }
        }
      }
    });

    const zines = zinesData.map(cz => ({
      ...cz,
      zine: formatZine(cz.zine)
    }));

    return { zines };
  });

  fastify.post('/:id/zines', async (request, reply) => {
    const collectionId = Number(request.params.id);
    const { zineId, recommendNote, sortOrder = 0 } = request.body;

    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) {
      return reply.code(404).send({ error: '合集不存在' });
    }

    const zine = await prisma.zine.findUnique({ where: { id: Number(zineId) } });
    if (!zine) {
      return reply.code(404).send({ error: '刊物不存在' });
    }

    const existing = await prisma.collectionZine.findUnique({
      where: {
        collectionId_zineId: {
          collectionId,
          zineId: Number(zineId)
        }
      }
    });

    if (existing) {
      return reply.code(400).send({ error: '该刊物已在合集中' });
    }

    const collectionZine = await prisma.collectionZine.create({
      data: {
        collectionId,
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

    return { collectionZine: { ...collectionZine, zine: formatZine(collectionZine.zine) }, message: '添加成功' };
  });

  fastify.put('/:id/zines/:zineId', async (request, reply) => {
    const collectionId = Number(request.params.id);
    const zineId = Number(request.params.zineId);
    const { recommendNote, sortOrder } = request.body;

    const existing = await prisma.collectionZine.findUnique({
      where: {
        collectionId_zineId: { collectionId, zineId }
      }
    });

    if (!existing) {
      return reply.code(404).send({ error: '该刊物不在合集中' });
    }

    const updateData = {};
    if (recommendNote !== undefined) updateData.recommendNote = recommendNote;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updated = await prisma.collectionZine.update({
      where: {
        collectionId_zineId: { collectionId, zineId }
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

    return { collectionZine: { ...updated, zine: formatZine(updated.zine) }, message: '更新成功' };
  });

  fastify.delete('/:id/zines/:zineId', async (request, reply) => {
    const collectionId = Number(request.params.id);
    const zineId = Number(request.params.zineId);

    const existing = await prisma.collectionZine.findUnique({
      where: {
        collectionId_zineId: { collectionId, zineId }
      }
    });

    if (!existing) {
      return reply.code(404).send({ error: '该刊物不在合集中' });
    }

    await prisma.collectionZine.delete({
      where: {
        collectionId_zineId: { collectionId, zineId }
      }
    });

    return { message: '移除成功' };
  });

  fastify.post('/:id/zines/batch', async (request, reply) => {
    const collectionId = Number(request.params.id);
    const { zineIds = [] } = request.body;

    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) {
      return reply.code(404).send({ error: '合集不存在' });
    }

    let addedCount = 0;
    for (const zineId of zineIds) {
      const existing = await prisma.collectionZine.findUnique({
        where: {
          collectionId_zineId: { collectionId, zineId: Number(zineId) }
        }
      });

      if (!existing) {
        const maxSort = await prisma.collectionZine.aggregate({
          where: { collectionId },
          _max: { sortOrder: true }
        });
        const nextSort = (maxSort._max.sortOrder || 0) + 1;

        await prisma.collectionZine.create({
          data: {
            collectionId,
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
    const featured = await prisma.featuredCollection.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        collection: {
          select: { id: true, title: true, coverImage: true }
        }
      }
    });

    return { featured };
  });

  fastify.post('/featured', async (request) => {
    const {
      collectionId,
      bannerImage,
      bannerTitle,
      bannerSubtitle,
      sortOrder = 0,
      startDate,
      endDate,
      isActive = true
    } = request.body;

    const existing = await prisma.featuredCollection.findUnique({
      where: { collectionId: Number(collectionId) }
    });

    if (existing) {
      return { error: '该合集已在精选推荐中' };
    }

    const featured = await prisma.featuredCollection.create({
      data: {
        collectionId: Number(collectionId),
        bannerImage,
        bannerTitle,
        bannerSubtitle,
        sortOrder,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive
      },
      include: {
        collection: { select: { id: true, title: true } }
      }
    });

    return { featured, message: '添加精选成功' };
  });

  fastify.put('/featured/:id', async (request, reply) => {
    const featuredId = Number(request.params.id);
    const existing = await prisma.featuredCollection.findUnique({ where: { id: featuredId } });

    if (!existing) {
      return reply.code(404).send({ error: '精选推荐不存在' });
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

    const updated = await prisma.featuredCollection.update({
      where: { id: featuredId },
      data: updateData
    });

    return { featured: updated, message: '更新成功' };
  });

  fastify.delete('/featured/:id', async (request, reply) => {
    const featuredId = Number(request.params.id);
    const existing = await prisma.featuredCollection.findUnique({ where: { id: featuredId } });

    if (!existing) {
      return reply.code(404).send({ error: '精选推荐不存在' });
    }

    await prisma.featuredCollection.delete({ where: { id: featuredId } });
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
}

module.exports = routes;
