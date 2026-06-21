function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const formatBrandCoop = (c) => {
  if (!c) return c;
  return { ...c, tags: parseJSONField(c.tags, []) };
};

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', async (request) => {
    const { status, category, kanbanColumn, page = 1, limit = 20, keyword } = request.query;
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
    if (kanbanColumn) where.kanbanColumn = kanbanColumn;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { brandName: { contains: keyword } },
        { description: { contains: keyword } }
      ];
    }

    const [brandCoopsData, total] = await Promise.all([
      prisma.brandCoop.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          _count: { select: { zines: true, schedules: true, messages: true } }
        }
      }),
      prisma.brandCoop.count({ where })
    ]);

    const brandCoops = brandCoopsData.map(c => ({
      ...formatBrandCoop(c),
      zineCount: c._count.zines,
      scheduleCount: c._count.schedules,
      messageCount: c._count.messages
    }));

    return { brandCoops, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/mine', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = { creatorId: request.user.id };

    if (status && status !== 'all') where.status = status;

    const [brandCoopsData, total] = await Promise.all([
      prisma.brandCoop.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { zines: true, schedules: true, messages: true } },
          reviewer: { select: { id: true, username: true } }
        }
      }),
      prisma.brandCoop.count({ where })
    ]);

    const brandCoops = brandCoopsData.map(c => ({
      ...formatBrandCoop(c),
      zineCount: c._count.zines,
      scheduleCount: c._count.schedules,
      messageCount: c._count.messages
    }));

    return { brandCoops, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', async (request, reply) => {
    const brandCoopData = await prisma.brandCoop.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true, avatar: true, bio: true } },
        reviewer: { select: { id: true, username: true } },
        zines: {
          orderBy: { sortOrder: 'asc' },
          include: { zine: { select: { id: true, title: true, coverImage: true, category: true, author: { select: { id: true, username: true } } } } }
        },
        schedules: { orderBy: [{ sortOrder: 'asc' }, { plannedDate: 'asc' }] },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, username: true, avatar: true } } }
        }
      }
    });

    if (!brandCoopData) {
      return reply.code(404).send({ error: '品牌联名合作不存在' });
    }

    const brandCoop = {
      ...formatBrandCoop(brandCoopData),
      zineCount: brandCoopData.zines.length,
      scheduleCount: brandCoopData.schedules.length,
      messageCount: brandCoopData.messages.length
    };

    let user = null;
    try {
      const decoded = await request.jwtVerify();
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      }
    } catch (e) {}

    const isOwner = user && brandCoop.creatorId === user.id;
    const isAdmin = user && user.role === 'ADMIN';

    if (!['PUBLISHED', 'IN_PROGRESS', 'COMPLETED'].includes(brandCoop.status) && !isOwner && !isAdmin) {
      return reply.code(403).send({ error: '无权查看此品牌联名合作' });
    }

    if (user && brandCoop.status === 'PUBLISHED' && !isOwner && !isAdmin) {
      await prisma.brandCoop.update({
        where: { id: brandCoop.id },
        data: { viewCount: { increment: 1 } }
      });
      brandCoop.viewCount += 1;
    }

    return { brandCoop, isOwner, isAdmin };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const {
      title, brandName, brandLogo, description, coverImage,
      category, tags, cooperationType,
      contactPerson, contactPhone, contactEmail,
      budget, startDate, endDate,
      requirements, deliverables, notes
    } = request.body;

    if (!title || !brandName || !description) {
      return reply.code(400).send({ error: '请填写所有必填项（标题、品牌名称、项目描述）' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const initialStatus = isAdmin ? 'DRAFT' : 'PENDING_REVIEW';

    const brandCoop = await prisma.brandCoop.create({
      data: {
        title,
        brandName,
        brandLogo: brandLogo || null,
        description,
        coverImage: coverImage || null,
        category: category || 'COBRANDING',
        tags: tags ? JSON.stringify(tags) : '[]',
        cooperationType: cooperationType || 'COBRANDING',
        contactPerson: contactPerson || null,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        budget: budget || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        requirements: requirements || null,
        deliverables: deliverables || null,
        notes: notes || null,
        status: initialStatus,
        kanbanColumn: 'PROPOSAL',
        creatorId: request.user.id
      }
    });

    if (!isAdmin) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: request.user.id,
          title: '品牌联名提案已提交审核',
          content: `您的品牌联名合作《${brandCoop.title}》（品牌：${brandName}）已成功提交，等待管理员审核。\n\n审核通过后将自动发布，审核结果将通过站内消息通知您。`,
          type: 'BRAND_COOP'
        }
      });

      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await prisma.message.create({
          data: {
            senderId: request.user.id,
            receiverId: admin.id,
            title: '新的品牌联名提案待审核',
            content: `用户 ${user.username}（ID: ${request.user.id}）提交了品牌联名合作《${brandCoop.title}》（品牌：${brandName}），请及时审核。`,
            type: 'BRAND_COOP'
          }
        });
      }
    }

    return {
      brandCoop: formatBrandCoop(brandCoop),
      message: isAdmin ? '品牌联名合作创建成功' : '品牌联名提案已提交，等待审核'
    };
  });

  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const brandCoop = await prisma.brandCoop.findUnique({ where: { id: Number(id) } });

    if (!brandCoop) {
      return reply.code(404).send({ error: '品牌联名合作不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = brandCoop.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权编辑此品牌联名合作' });
    }

    const data = request.body;
    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.brandName !== undefined) updateData.brandName = data.brandName;
    if (data.brandLogo !== undefined) updateData.brandLogo = data.brandLogo;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.cooperationType !== undefined) updateData.cooperationType = data.cooperationType;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    }
    if (data.requirements !== undefined) updateData.requirements = data.requirements;
    if (data.deliverables !== undefined) updateData.deliverables = data.deliverables;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (isAdmin) {
      if (data.status !== undefined) updateData.status = data.status;
      if (data.kanbanColumn !== undefined) updateData.kanbanColumn = data.kanbanColumn;
      if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
      if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);
    }

    if (isOwner && !isAdmin && ['PUBLISHED', 'PENDING_REVIEW', 'REJECTED'].includes(brandCoop.status)) {
      if (['PUBLISHED', 'PENDING_REVIEW'].includes(brandCoop.status)) {
        updateData.status = 'PENDING_REVIEW';
      }
    }

    const updated = await prisma.brandCoop.update({
      where: { id: Number(id) },
      data: updateData
    });

    return { brandCoop: formatBrandCoop(updated), message: '更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const brandCoop = await prisma.brandCoop.findUnique({ where: { id: Number(id) } });

    if (!brandCoop) {
      return reply.code(404).send({ error: '品牌联名合作不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = brandCoop.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权删除此品牌联名合作' });
    }

    await prisma.brandCoopZine.deleteMany({ where: { brandCoopId: Number(id) } });
    await prisma.brandCoopSchedule.deleteMany({ where: { brandCoopId: Number(id) } });
    await prisma.brandCoopMessage.deleteMany({ where: { brandCoopId: Number(id) } });
    await prisma.brandCoop.delete({ where: { id: Number(id) } });

    return { message: '删除成功' };
  });

  fastify.post('/:id/publish', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const brandCoop = await prisma.brandCoop.findUnique({ where: { id: Number(id) } });

    if (!brandCoop) {
      return reply.code(404).send({ error: '品牌联名合作不存在' });
    }

    if (brandCoop.status === 'PUBLISHED') {
      return reply.code(400).send({ error: '品牌联名合作已发布' });
    }

    const updated = await prisma.brandCoop.update({
      where: { id: Number(id) },
      data: {
        status: 'PUBLISHED',
        kanbanColumn: 'NEGOTIATING',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    if (brandCoop.status === 'PENDING_REVIEW') {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: brandCoop.creatorId,
          title: '🎉 品牌联名提案已审核通过',
          content: `恭喜！您的品牌联名合作《${brandCoop.title}》（品牌：${brandCoop.brandName}）已通过审核并成功发布！\n\n项目已进入协商阶段，请及时关注排期和消息协同。`,
          type: 'BRAND_COOP'
        }
      });
    }

    return { brandCoop: formatBrandCoop(updated), message: '品牌联名合作发布成功' };
  });

  fastify.post('/:id/reject', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const { reason } = request.body;
    const brandCoop = await prisma.brandCoop.findUnique({ where: { id: Number(id) } });

    if (!brandCoop) {
      return reply.code(404).send({ error: '品牌联名合作不存在' });
    }

    if (brandCoop.status !== 'PENDING_REVIEW') {
      return reply.code(400).send({ error: '当前状态不可驳回' });
    }

    const updated = await prisma.brandCoop.update({
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
        receiverId: brandCoop.creatorId,
        title: '品牌联名提案未通过审核',
        content: `很遗憾，您的品牌联名合作《${brandCoop.title}》（品牌：${brandCoop.brandName}）未通过审核。\n\n${reason ? '原因：' + reason + '\n\n' : ''}您可以根据审核意见修改后重新提交。`,
        type: 'BRAND_COOP'
      }
    });

    return { brandCoop: formatBrandCoop(updated), message: '已驳回' };
  });

  fastify.post('/:id/resubmit', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const brandCoop = await prisma.brandCoop.findUnique({ where: { id: Number(id) } });

    if (!brandCoop) {
      return reply.code(404).send({ error: '品牌联名合作不存在' });
    }

    if (brandCoop.creatorId !== request.user.id) {
      return reply.code(403).send({ error: '无权操作此品牌联名合作' });
    }

    if (!['DRAFT', 'REJECTED'].includes(brandCoop.status)) {
      return reply.code(400).send({ error: '当前状态不可重新提交' });
    }

    const updated = await prisma.brandCoop.update({
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
        title: '品牌联名提案已重新提交',
        content: `您的品牌联名合作《${brandCoop.title}》已重新提交审核，等待管理员处理。`,
        type: 'BRAND_COOP'
      }
    });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: admin.id,
          title: '品牌联名提案重新提交审核',
          content: `用户重新提交了品牌联名合作《${brandCoop.title}》，请及时审核。`,
          type: 'BRAND_COOP'
        }
      });
    }

    return { brandCoop: formatBrandCoop(updated), message: '已重新提交审核' };
  });

  fastify.post('/:id/zines', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { zineId, role, recommendNote } = request.body;

    const brandCoop = await prisma.brandCoop.findUnique({ where: { id: Number(id) } });
    if (!brandCoop) {
      return reply.code(404).send({ error: '品牌联名合作不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = brandCoop.creatorId === request.user.id;
    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权操作' });
    }

    const zine = await prisma.zine.findUnique({ where: { id: Number(zineId) } });
    if (!zine) {
      return reply.code(404).send({ error: '刊物不存在' });
    }

    const existing = await prisma.brandCoopZine.findUnique({
      where: { brandCoopId_zineId: { brandCoopId: Number(id), zineId: Number(zineId) } }
    });
    if (existing) {
      return reply.code(400).send({ error: '该刊物已关联' });
    }

    const link = await prisma.brandCoopZine.create({
      data: {
        brandCoopId: Number(id),
        zineId: Number(zineId),
        role: role || 'RELATED',
        recommendNote: recommendNote || null
      },
      include: {
        zine: { select: { id: true, title: true, coverImage: true, category: true, author: { select: { id: true, username: true } } } }
      }
    });

    return { zineLink: link, message: '刊物关联成功' };
  });

  fastify.delete('/:id/zines/:zineId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id, zineId } = request.params;
    const brandCoop = await prisma.brandCoop.findUnique({ where: { id: Number(id) } });
    if (!brandCoop) {
      return reply.code(404).send({ error: '品牌联名合作不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = brandCoop.creatorId === request.user.id;
    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权操作' });
    }

    await prisma.brandCoopZine.deleteMany({
      where: { brandCoopId: Number(id), zineId: Number(zineId) }
    });

    return { message: '刊物关联已移除' };
  });

  fastify.post('/:id/advance', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const { kanbanColumn } = request.body;

    const validColumns = ['PROPOSAL', 'NEGOTIATING', 'CONFIRMED', 'EXECUTING', 'COMPLETED', 'ARCHIVED'];
    if (!validColumns.includes(kanbanColumn)) {
      return reply.code(400).send({ error: '无效的看板列' });
    }

    const brandCoop = await prisma.brandCoop.findUnique({ where: { id: Number(id) } });
    if (!brandCoop) {
      return reply.code(404).send({ error: '品牌联名合作不存在' });
    }

    let newStatus = brandCoop.status;
    if (kanbanColumn === 'EXECUTING') newStatus = 'IN_PROGRESS';
    if (kanbanColumn === 'COMPLETED') newStatus = 'COMPLETED';

    const updated = await prisma.brandCoop.update({
      where: { id: Number(id) },
      data: { kanbanColumn, status: newStatus }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: brandCoop.creatorId,
        title: '品牌联名合作状态更新',
        content: `您的品牌联名合作《${brandCoop.title}》已推进至「${getColumnLabel(kanbanColumn)}」阶段。`,
        type: 'BRAND_COOP'
      }
    });

    return { brandCoop: formatBrandCoop(updated), message: '状态已更新' };
  });
}

function getColumnLabel(col) {
  const map = {
    PROPOSAL: '提案',
    NEGOTIATING: '协商中',
    CONFIRMED: '已确认',
    EXECUTING: '执行中',
    COMPLETED: '已完成',
    ARCHIVED: '已归档'
  };
  return map[col] || col;
}

module.exports = routes;
