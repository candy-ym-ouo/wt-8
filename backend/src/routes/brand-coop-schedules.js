async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', async (request, reply) => {
    const { id } = request.params;
    const schedules = await prisma.brandCoopSchedule.findMany({
      where: { brandCoopId: Number(id) },
      orderBy: [{ sortOrder: 'asc' }, { plannedDate: 'asc' }]
    });
    return { schedules };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { title, description, plannedDate, actualDate, status, assigneeId, remark, sortOrder } = request.body;

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

    if (!title || !plannedDate) {
      return reply.code(400).send({ error: '请填写标题和计划时间' });
    }

    const schedule = await prisma.brandCoopSchedule.create({
      data: {
        brandCoopId: Number(id),
        title,
        description: description || null,
        plannedDate: new Date(plannedDate),
        actualDate: actualDate ? new Date(actualDate) : null,
        status: status || 'PENDING',
        assigneeId: assigneeId || null,
        remark: remark || null,
        sortOrder: sortOrder || 0,
        creatorId: request.user.id
      }
    });

    return { schedule, message: '排期节点创建成功' };
  });

  fastify.put('/:scheduleId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id, scheduleId } = request.params;
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

    const schedule = await prisma.brandCoopSchedule.findUnique({ where: { id: Number(scheduleId) } });
    if (!schedule || schedule.brandCoopId !== Number(id)) {
      return reply.code(404).send({ error: '排期节点不存在' });
    }

    const data = request.body;
    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.plannedDate !== undefined) updateData.plannedDate = new Date(data.plannedDate);
    if (data.actualDate !== undefined) updateData.actualDate = data.actualDate ? new Date(data.actualDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.remark !== undefined) updateData.remark = data.remark;
    if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);

    const updated = await prisma.brandCoopSchedule.update({
      where: { id: Number(scheduleId) },
      data: updateData
    });

    return { schedule: updated, message: '排期节点更新成功' };
  });

  fastify.delete('/:scheduleId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id, scheduleId } = request.params;
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

    await prisma.brandCoopSchedule.delete({ where: { id: Number(scheduleId) } });
    return { message: '排期节点已删除' };
  });
}

module.exports = routes;
