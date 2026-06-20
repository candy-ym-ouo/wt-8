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

  fastify.get('/mine', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = { creatorId: request.user.id };

    if (status && status !== 'all') where.status = status;

    const [collaborationsData, total] = await Promise.all([
      prisma.collaboration.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { applications: true } },
          reviewer: { select: { id: true, username: true } }
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

  fastify.get('/:id', async (request, reply) => {
    const collaborationData = await prisma.collaboration.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true, avatar: true, bio: true } },
        reviewer: { select: { id: true, username: true } },
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

    const isOwner = user && collaboration.creatorId === user.id;
    const isAdmin = user && user.role === 'ADMIN';

    if (!['PUBLISHED', 'CLOSED'].includes(collaboration.status) && !isOwner && !isAdmin) {
      return reply.code(403).send({ error: '无权查看此合作项目' });
    }

    if (user && collaboration.status === 'PUBLISHED' && !isOwner && !isAdmin) {
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

    return { collaboration, userApplication, isOwner, isAdmin };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const {
      title, description, coverImage, category, tags,
      requirements, deliverables, compensation, deadline
    } = request.body;

    if (!title || !description) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const initialStatus = isAdmin ? 'DRAFT' : 'PENDING_REVIEW';

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
        status: initialStatus,
        creatorId: request.user.id
      }
    });

    if (!isAdmin) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: request.user.id,
          title: '合作招募已提交审核',
          content: `您的合作招募《${collaboration.title}》已成功提交，等待管理员审核。\n\n审核通过后将自动发布，审核结果将通过站内消息通知您，请耐心等待。`,
          type: 'COLLABORATION'
        }
      });

      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await prisma.message.create({
          data: {
            senderId: request.user.id,
            receiverId: admin.id,
            title: '新的合作招募待审核',
            content: `用户 ${user.username}（ID: ${request.user.id}）提交了新的合作招募《${collaboration.title}》，请及时审核。\n\n请前往【后台管理 - 合作管理】查看详情并进行审核。`,
            type: 'COLLABORATION'
          }
        });
      }
    }

    return {
      collaboration: formatCollaboration(collaboration),
      message: isAdmin ? '合作项目创建成功' : '合作招募已提交，等待审核'
    };
  });

  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const collaboration = await prisma.collaboration.findUnique({ where: { id: Number(id) } });

    if (!collaboration) {
      return reply.code(404).send({ error: '合作项目不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = collaboration.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权编辑此合作项目' });
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
    if (isAdmin) {
      if (data.status !== undefined) updateData.status = data.status;
      if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
      if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);
    }

    if (isOwner && !isAdmin && ['PUBLISHED', 'PENDING_REVIEW', 'REJECTED'].includes(collaboration.status)) {
      if (['PUBLISHED', 'PENDING_REVIEW'].includes(collaboration.status)) {
        updateData.status = 'PENDING_REVIEW';
      }
    }

    const updated = await prisma.collaboration.update({
      where: { id: Number(id) },
      data: updateData
    });

    return { collaboration: formatCollaboration(updated), message: '更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const collaboration = await prisma.collaboration.findUnique({ where: { id: Number(id) } });

    if (!collaboration) {
      return reply.code(404).send({ error: '合作项目不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = collaboration.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权删除此合作项目' });
    }

    await prisma.collaborationApplication.deleteMany({ where: { collaborationId: Number(id) } });
    await prisma.collaboration.delete({ where: { id: Number(id) } });

    return { message: '删除成功' };
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
      data: {
        status: 'PUBLISHED',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    if (collaboration.status === 'PENDING_REVIEW') {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: collaboration.creatorId,
          title: '🎉 合作招募已审核通过',
          content: `恭喜！您的合作招募《${collaboration.title}》已通过审核并成功发布！\n\n合作报酬：${collaboration.compensation || '面议'}\n\n创作者们现在可以浏览并申请您的合作项目了，请及时关注报名申请情况。`,
          type: 'COLLABORATION'
        }
      });
    }

    return { collaboration: formatCollaboration(updated), message: '合作项目发布成功' };
  });

  fastify.post('/:id/reject', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const { reason } = request.body;
    const collaboration = await prisma.collaboration.findUnique({ where: { id: Number(id) } });

    if (!collaboration) {
      return reply.code(404).send({ error: '合作项目不存在' });
    }

    if (collaboration.status !== 'PENDING_REVIEW') {
      return reply.code(400).send({ error: '当前状态不可驳回' });
    }

    const updated = await prisma.collaboration.update({
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
        receiverId: collaboration.creatorId,
        title: '合作招募未通过审核',
        content: `很遗憾，您的合作招募《${collaboration.title}》未通过审核。\n\n${reason ? '原因：' + reason + '\n\n' : ''}您可以根据审核意见修改后重新提交，如有疑问可联系管理员。`,
        type: 'COLLABORATION'
      }
    });

    return { collaboration: formatCollaboration(updated), message: '已驳回' };
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
      data: { status: 'CLOSED' }
    });

    return { collaboration: formatCollaboration(updated), message: '合作项目已下架' };
  });

  fastify.post('/:id/resubmit', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const collaboration = await prisma.collaboration.findUnique({ where: { id: Number(id) } });

    if (!collaboration) {
      return reply.code(404).send({ error: '合作项目不存在' });
    }

    if (collaboration.creatorId !== request.user.id) {
      return reply.code(403).send({ error: '无权操作此合作项目' });
    }

    if (!['DRAFT', 'REJECTED'].includes(collaboration.status)) {
      return reply.code(400).send({ error: '当前状态不可重新提交' });
    }

    const updated = await prisma.collaboration.update({
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
        title: '合作招募已重新提交',
        content: `您的合作招募《${collaboration.title}》已重新提交审核，等待管理员处理。\n\n审核结果将通过站内消息通知您。`,
        type: 'COLLABORATION'
      }
    });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: admin.id,
          title: '合作招募重新提交审核',
          content: `用户重新提交了合作招募《${collaboration.title}》，请及时审核。`,
          type: 'COLLABORATION'
        }
      });
    }

    return { collaboration: formatCollaboration(updated), message: '已重新提交审核' };
  });
}

module.exports = routes;
