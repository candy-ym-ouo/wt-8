function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const formatCollaboration = (c) => {
  if (!c) return c;
  return { ...c, tags: parseJSONField(c.tags, []) };
};

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', async (request) => {
    const { status, category, page = 1, limit = 20, keyword } = request.query;
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
      where.status = 'PUBLISHED';
    } else if (status && status !== 'all') {
      where.status = status;
    }

    if (category && category !== 'all') where.category = category;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
        { compensation: { contains: keyword } }
      ];
    }

    const [collaborationsData, total] = await Promise.all([
      prisma.collaboration.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          _count: { select: { applications: true } }
        }
      }),
      prisma.collaboration.count({ where })
    ]);

    const collaborations = collaborationsData.map(c => ({
      ...formatCollaboration(c),
      applicationCount: c._count.applications
    }));

    return { collaborations, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/featured', async () => {
    const collaborationsData = await prisma.collaboration.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      take: 5,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        creator: { select: { id: true, username: true, avatar: true } },
        _count: { select: { applications: true } }
      }
    });

    const collaborations = collaborationsData.map(c => ({
      ...formatCollaboration(c),
      applicationCount: c._count.applications
    }));

    return { collaborations };
  });

  fastify.get('/:id', async (request, reply) => {
    const collaborationData = await prisma.collaboration.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true, avatar: true, bio: true } },
        _count: { select: { applications: true } }
      }
    });

    if (!collaborationData) {
      return reply.code(404).send({ error: '合作项目不存在' });
    }

    const collaboration = {
      ...formatCollaboration(collaborationData),
      applicationCount: collaborationData._count.applications
    };

    let user = null;
    try {
      const decoded = await request.jwtVerify();
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      }
    } catch (e) {}

    if (collaboration.status !== 'PUBLISHED' && (!user || user.role === 'USER')) {
      return reply.code(403).send({ error: '无权查看此合作项目' });
    }

    if (user && user.role === 'USER') {
      await prisma.collaboration.update({
        where: { id: collaboration.id },
        data: { viewCount: { increment: 1 } }
      });
      collaboration.viewCount += 1;
    }

    let userApplication = null;
    if (user) {
      userApplication = await prisma.collaborationApplication.findFirst({
        where: { collaborationId: collaboration.id, userId: user.id }
      });
    }

    return { collaboration, userApplication };
  });

  fastify.post('/', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const {
      title, description, coverImage, category, tags,
      requirements, deliverables, compensation, deadline,
      status, isFeatured, sortOrder
    } = request.body;

    if (!title || !description) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const collaboration = await prisma.collaboration.create({
      data: {
        title,
        description,
        coverImage: coverImage || null,
        category: category || 'OTHER',
        tags: tags ? JSON.stringify(tags) : '[]',
        requirements: requirements || null,
        deliverables: deliverables || null,
        compensation: compensation || null,
        deadline: deadline ? new Date(deadline) : null,
        status: status || 'DRAFT',
        isFeatured: isFeatured || false,
        sortOrder: sortOrder || 0,
        creatorId: request.user.id
      }
    });

    return { collaboration: formatCollaboration(collaboration), message: '合作项目创建成功' };
  });

  fastify.put('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const collaboration = await prisma.collaboration.findUnique({ where: { id: Number(id) } });

    if (!collaboration) {
      return reply.code(404).send({ error: '合作项目不存在' });
    }

    const data = request.body;
    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.requirements !== undefined) updateData.requirements = data.requirements;
    if (data.deliverables !== undefined) updateData.deliverables = data.deliverables;
    if (data.compensation !== undefined) updateData.compensation = data.compensation;
    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
    if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);

    const updated = await prisma.collaboration.update({
      where: { id: Number(id) },
      data: updateData
    });

    return { collaboration: formatCollaboration(updated), message: '合作项目更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const collaboration = await prisma.collaboration.findUnique({ where: { id: Number(id) } });

    if (!collaboration) {
      return reply.code(404).send({ error: '合作项目不存在' });
    }

    await prisma.collaborationApplication.deleteMany({ where: { collaborationId: Number(id) } });
    await prisma.collaboration.delete({ where: { id: Number(id) } });

    return { message: '合作项目删除成功' };
  });

  fastify.post('/:id/publish', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const collaboration = await prisma.collaboration.findUnique({ where: { id: Number(id) } });

    if (!collaboration) {
      return reply.code(404).send({ error: '合作项目不存在' });
    }

    if (collaboration.status === 'PUBLISHED') {
      return reply.code(400).send({ error: '合作项目已发布' });
    }

    const updated = await prisma.collaboration.update({
      where: { id: Number(id) },
      data: { status: 'PUBLISHED' }
    });

    return { collaboration: formatCollaboration(updated), message: '合作项目发布成功' };
  });

  fastify.post('/:id/unpublish', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const collaboration = await prisma.collaboration.findUnique({ where: { id: Number(id) } });

    if (!collaboration) {
      return reply.code(404).send({ error: '合作项目不存在' });
    }

    if (collaboration.status !== 'PUBLISHED') {
      return reply.code(400).send({ error: '合作项目当前不是发布状态' });
    }

    const updated = await prisma.collaboration.update({
      where: { id: Number(id) },
      data: { status: 'DRAFT' }
    });

    return { collaboration: formatCollaboration(updated), message: '合作项目已下架' };
  });
}

module.exports = routes;
