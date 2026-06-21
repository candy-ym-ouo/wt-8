async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.addHook('onRequest', fastify.adminOnly);

  fastify.get('/stats', async () => {
    const [totalResources, publishedResources, totalCategories, totalDownloads, todayDownloads, todayNew] = await Promise.all([
      prisma.assetResource.count(),
      prisma.assetResource.count({ where: { status: 'PUBLISHED' } }),
      prisma.assetCategory.count(),
      prisma.assetDownload.count({ where: { status: 'SUCCESS' } }),
      prisma.assetDownload.count({
        where: { status: 'SUCCESS', createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
      }),
      prisma.assetResource.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
      })
    ]);
    return { stats: { totalResources, publishedResources, totalCategories, totalDownloads, todayDownloads, todayNew } };
  });

  fastify.get('/categories', async () => {
    const categories = await prisma.assetCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { resources: true } } }
    });
    return { categories };
  });

  fastify.post('/categories', async (request, reply) => {
    const { name, slug, icon, description, type, sortOrder, isActive } = request.body;
    if (!name || !slug) {
      return reply.code(400).send({ error: '分类名称和标识不能为空' });
    }
    const existing = await prisma.assetCategory.findUnique({ where: { slug } });
    if (existing) {
      return reply.code(400).send({ error: '分类标识已存在' });
    }
    const category = await prisma.assetCategory.create({
      data: { name, slug, icon: icon || null, description: description || null, type: type || 'GENERAL', sortOrder: sortOrder || 0, isActive: isActive !== false }
    });
    return { category, message: '分类已创建' };
  });

  fastify.put('/categories/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const { name, slug, icon, description, type, sortOrder, isActive } = request.body;
    const category = await prisma.assetCategory.findUnique({ where: { id } });
    if (!category) {
      return reply.code(404).send({ error: '分类不存在' });
    }
    if (slug && slug !== category.slug) {
      const existing = await prisma.assetCategory.findUnique({ where: { slug } });
      if (existing) {
        return reply.code(400).send({ error: '分类标识已存在' });
      }
    }
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (icon !== undefined) updateData.icon = icon;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    if (isActive !== undefined) updateData.isActive = isActive;
    const updated = await prisma.assetCategory.update({ where: { id }, data: updateData });
    return { category: updated, message: '分类已更新' };
  });

  fastify.delete('/categories/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const category = await prisma.assetCategory.findUnique({ where: { id }, include: { _count: { select: { resources: true } } } });
    if (!category) {
      return reply.code(404).send({ error: '分类不存在' });
    }
    if (category._count.resources > 0) {
      return reply.code(400).send({ error: `该分类下还有 ${category._count.resources} 个资源，请先迁移或删除` });
    }
    await prisma.assetCategory.delete({ where: { id } });
    return { message: '分类已删除' };
  });

  fastify.get('/resources', async (request) => {
    const { categoryId, type, status, keyword, page = 1, limit = 15 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (categoryId) where.categoryId = Number(categoryId);
    if (type) where.type = type;
    if (status) where.status = status;
    if (keyword) {
      where.OR = [{ title: { contains: keyword } }, { description: { contains: keyword } }];
    }
    const [resources, total] = await Promise.all([
      prisma.assetResource.findMany({
        where, skip, take: Number(limit),
        orderBy: [{ createdAt: 'desc' }],
        include: {
          category: { select: { id: true, name: true, icon: true } },
          creator: { select: { id: true, username: true, avatar: true } },
          _count: { select: { downloads: true } }
        }
      }),
      prisma.assetResource.count({ where })
    ]);
    return { resources, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/resources', async (request, reply) => {
    const { title, description, coverImage, fileUrl, fileName, fileSize, fileType, categoryId, tags, type, minLevel, requirePlan, isFree, status, isFeatured, sortOrder } = request.body;
    if (!title || !fileUrl || !categoryId) {
      return reply.code(400).send({ error: '标题、文件地址和分类为必填项' });
    }
    const resource = await prisma.assetResource.create({
      data: {
        title, description: description || null, coverImage: coverImage || null,
        fileUrl, fileName: fileName || '', fileSize: fileSize || 0, fileType: fileType || 'IMAGE',
        categoryId: Number(categoryId), tags: tags ? JSON.stringify(tags) : '[]',
        type: type || 'COVER_TEMPLATE', minLevel: minLevel || 0,
        requirePlan: requirePlan || false, isFree: isFree !== false,
        status: status || 'PUBLISHED', isFeatured: isFeatured || false,
        sortOrder: sortOrder || 0, creatorId: request.user.id
      }
    });
    return { resource, message: '资源已创建' };
  });

  fastify.put('/resources/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const resource = await prisma.assetResource.findUnique({ where: { id } });
    if (!resource) {
      return reply.code(404).send({ error: '资源不存在' });
    }
    const { title, description, coverImage, fileUrl, fileName, fileSize, fileType, categoryId, tags, type, minLevel, requirePlan, isFree, status, isFeatured, sortOrder } = request.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
    if (fileName !== undefined) updateData.fileName = fileName;
    if (fileSize !== undefined) updateData.fileSize = Number(fileSize);
    if (fileType !== undefined) updateData.fileType = fileType;
    if (categoryId !== undefined) updateData.categoryId = Number(categoryId);
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (type !== undefined) updateData.type = type;
    if (minLevel !== undefined) updateData.minLevel = Number(minLevel);
    if (requirePlan !== undefined) updateData.requirePlan = requirePlan;
    if (isFree !== undefined) updateData.isFree = isFree;
    if (status !== undefined) updateData.status = status;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    const updated = await prisma.assetResource.update({ where: { id }, data: updateData });
    return { resource: updated, message: '资源已更新' };
  });

  fastify.delete('/resources/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const resource = await prisma.assetResource.findUnique({ where: { id } });
    if (!resource) {
      return reply.code(404).send({ error: '资源不存在' });
    }
    await prisma.assetDownload.deleteMany({ where: { resourceId: id } });
    await prisma.assetResource.delete({ where: { id } });
    return { message: '资源已删除' };
  });

  fastify.get('/downloads', async (request) => {
    const { resourceId, userId, status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (resourceId) where.resourceId = Number(resourceId);
    if (userId) where.userId = Number(userId);
    if (status) where.status = status;
    const [downloads, total] = await Promise.all([
      prisma.assetDownload.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          resource: { select: { id: true, title: true, type: true } },
          user: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.assetDownload.count({ where })
    ]);
    return { downloads, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });
}

module.exports = routes;
