async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/levels', { preHandler: [fastify.adminOnly] }, async () => {
    const levels = await prisma.level.findMany({
      orderBy: { level: 'asc' }
    });
    return { levels };
  });

  fastify.post('/levels', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { name, level, minExp, icon, description, benefits } = request.body;

    if (!name || !level || minExp === undefined) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const existing = await prisma.level.findFirst({
      where: { OR: [{ level: Number(level) }, { minExp: Number(minExp) }] }
    });

    if (existing) {
      return reply.code(400).send({ error: '等级或经验值已存在' });
    }

    const newLevel = await prisma.level.create({
      data: {
        name,
        level: Number(level),
        minExp: Number(minExp),
        icon,
        description,
        benefits: benefits ? JSON.stringify(benefits) : '[]'
      }
    });

    return { level: newLevel, message: '等级创建成功' };
  });

  fastify.put('/levels/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const { name, level, minExp, icon, description, benefits, isActive } = request.body;

    const existing = await prisma.level.findUnique({
      where: { id: Number(id) }
    });

    if (!existing) {
      return reply.code(404).send({ error: '等级不存在' });
    }

    const conflict = await prisma.level.findFirst({
      where: {
        OR: [{ level: Number(level) }, { minExp: Number(minExp) }],
        NOT: { id: Number(id) }
      }
    });

    if (conflict) {
      return reply.code(400).send({ error: '等级或经验值已被占用' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (level !== undefined) updateData.level = Number(level);
    if (minExp !== undefined) updateData.minExp = Number(minExp);
    if (icon !== undefined) updateData.icon = icon;
    if (description !== undefined) updateData.description = description;
    if (benefits !== undefined) updateData.benefits = JSON.stringify(benefits);
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedLevel = await prisma.level.update({
      where: { id: Number(id) },
      data: updateData
    });

    return { level: updatedLevel, message: '等级更新成功' };
  });

  fastify.delete('/levels/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;

    const level = await prisma.level.findUnique({
      where: { id: Number(id) }
    });

    if (!level) {
      return reply.code(404).send({ error: '等级不存在' });
    }

    await prisma.level.delete({
      where: { id: Number(id) }
    });

    return { message: '等级删除成功' };
  });

  fastify.get('/badges', { preHandler: [fastify.adminOnly] }, async () => {
    const badges = await prisma.badge.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    });
    return { badges };
  });

  fastify.post('/badges', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { name, code, icon, description, category, rarity, expReward, sortOrder, isActive } = request.body;

    if (!name || !code || !icon || !description) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const existing = await prisma.badge.findFirst({
      where: { OR: [{ name }, { code }] }
    });

    if (existing) {
      return reply.code(400).send({ error: '勋章名称或编码已存在' });
    }

    const badge = await prisma.badge.create({
      data: {
        name,
        code,
        icon,
        description,
        category: category || 'GENERAL',
        rarity: rarity || 'COMMON',
        expReward: expReward || 0,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return { badge, message: '勋章创建成功' };
  });

  fastify.put('/badges/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const data = request.body;

    const existing = await prisma.badge.findUnique({
      where: { id: Number(id) }
    });

    if (!existing) {
      return reply.code(404).send({ error: '勋章不存在' });
    }

    if (data.name || data.code) {
      const orConditions = [];
      if (data.name) orConditions.push({ name: data.name });
      if (data.code) orConditions.push({ code: data.code });
      const conflict = await prisma.badge.findFirst({
        where: {
          OR: orConditions,
          NOT: { id: Number(id) }
        }
      });

      if (conflict) {
        return reply.code(400).send({ error: '勋章名称或编码已被占用' });
      }
    }

    const updatedBadge = await prisma.badge.update({
      where: { id: Number(id) },
      data
    });

    return { badge: updatedBadge, message: '勋章更新成功' };
  });

  fastify.delete('/badges/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;

    const badge = await prisma.badge.findUnique({
      where: { id: Number(id) }
    });

    if (!badge) {
      return reply.code(404).send({ error: '勋章不存在' });
    }

    await prisma.badge.delete({
      where: { id: Number(id) }
    });

    return { message: '勋章删除成功' };
  });

  fastify.get('/achievements', { preHandler: [fastify.adminOnly] }, async () => {
    const achievements = await prisma.achievement.findMany({
      include: { badge: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    });
    return { achievements };
  });

  fastify.post('/achievements', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { name, code, description, category, condition, targetValue, expReward, badgeId, sortOrder, isActive } = request.body;

    if (!name || !code || !description || !condition) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const existing = await prisma.achievement.findFirst({
      where: { OR: [{ name }, { code }] }
    });

    if (existing) {
      return reply.code(400).send({ error: '成就名称或编码已存在' });
    }

    const achievement = await prisma.achievement.create({
      data: {
        name,
        code,
        description,
        category: category || 'CREATION',
        condition,
        targetValue: targetValue || 1,
        expReward: expReward || 0,
        badgeId: badgeId || null,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return { achievement, message: '成就创建成功' };
  });

  fastify.put('/achievements/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const data = request.body;

    const existing = await prisma.achievement.findUnique({
      where: { id: Number(id) }
    });

    if (!existing) {
      return reply.code(404).send({ error: '成就不存在' });
    }

    if (data.name || data.code) {
      const orConditions = [];
      if (data.name) orConditions.push({ name: data.name });
      if (data.code) orConditions.push({ code: data.code });
      const conflict = await prisma.achievement.findFirst({
        where: {
          OR: orConditions,
          NOT: { id: Number(id) }
        }
      });

      if (conflict) {
        return reply.code(400).send({ error: '成就名称或编码已被占用' });
      }
    }

    const updatedAchievement = await prisma.achievement.update({
      where: { id: Number(id) },
      data
    });

    return { achievement: updatedAchievement, message: '成就更新成功' };
  });

  fastify.delete('/achievements/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;

    const achievement = await prisma.achievement.findUnique({
      where: { id: Number(id) }
    });

    if (!achievement) {
      return reply.code(404).send({ error: '成就不存在' });
    }

    await prisma.achievement.delete({
      where: { id: Number(id) }
    });

    return { message: '成就删除成功' };
  });

  fastify.get('/tasks', { preHandler: [fastify.adminOnly] }, async () => {
    const tasks = await prisma.task.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    });
    return { tasks };
  });

  fastify.post('/tasks', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { name, code, description, category, type, condition, targetValue, expReward, sortOrder, isActive } = request.body;

    if (!name || !code || !description || !condition) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const existing = await prisma.task.findUnique({
      where: { code }
    });

    if (existing) {
      return reply.code(400).send({ error: '任务编码已存在' });
    }

    const task = await prisma.task.create({
      data: {
        name,
        code,
        description,
        category: category || 'DAILY',
        type: type || 'SUBMISSION',
        condition,
        targetValue: targetValue || 1,
        expReward: expReward || 10,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return { task, message: '任务创建成功' };
  });

  fastify.put('/tasks/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const data = request.body;

    const existing = await prisma.task.findUnique({
      where: { id: Number(id) }
    });

    if (!existing) {
      return reply.code(404).send({ error: '任务不存在' });
    }

    if (data.code) {
      const conflict = await prisma.task.findUnique({
        where: { code: data.code }
      });

      if (conflict && conflict.id !== Number(id)) {
        return reply.code(400).send({ error: '任务编码已被占用' });
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: Number(id) },
      data
    });

    return { task: updatedTask, message: '任务更新成功' };
  });

  fastify.delete('/tasks/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;

    const task = await prisma.task.findUnique({
      where: { id: Number(id) }
    });

    if (!task) {
      return reply.code(404).send({ error: '任务不存在' });
    }

    await prisma.task.delete({
      where: { id: Number(id) }
    });

    return { message: '任务删除成功' };
  });

  fastify.get('/benefits', { preHandler: [fastify.adminOnly] }, async () => {
    const benefits = await prisma.benefit.findMany({
      orderBy: [{ minLevel: 'asc' }, { createdAt: 'desc' }]
    });
    return { benefits };
  });

  fastify.post('/benefits', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { name, code, description, type, value, minLevel, isActive } = request.body;

    if (!name || !code || !description) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const existing = await prisma.benefit.findUnique({
      where: { code }
    });

    if (existing) {
      return reply.code(400).send({ error: '权益编码已存在' });
    }

    const benefit = await prisma.benefit.create({
      data: {
        name,
        code,
        description,
        type: type || 'PRIVILEGE',
        value: value || null,
        minLevel: minLevel || 1,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return { benefit, message: '权益创建成功' };
  });

  fastify.put('/benefits/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const data = request.body;

    const existing = await prisma.benefit.findUnique({
      where: { id: Number(id) }
    });

    if (!existing) {
      return reply.code(404).send({ error: '权益不存在' });
    }

    if (data.code) {
      const conflict = await prisma.benefit.findUnique({
        where: { code: data.code }
      });

      if (conflict && conflict.id !== Number(id)) {
        return reply.code(400).send({ error: '权益编码已被占用' });
      }
    }

    const updatedBenefit = await prisma.benefit.update({
      where: { id: Number(id) },
      data
    });

    return { benefit: updatedBenefit, message: '权益更新成功' };
  });

  fastify.delete('/benefits/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;

    const benefit = await prisma.benefit.findUnique({
      where: { id: Number(id) }
    });

    if (!benefit) {
      return reply.code(404).send({ error: '权益不存在' });
    }

    await prisma.benefit.delete({
      where: { id: Number(id) }
    });

    return { message: '权益删除成功' };
  });

  fastify.post('/users/:userId/badge', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { userId } = request.params;
    const { badgeId, source } = request.body;

    const GrowthService = require('../services/growthService');
    const growthService = new GrowthService(prisma);

    const result = await growthService.unlockBadge(
      Number(userId),
      Number(badgeId),
      source || 'admin'
    );

    if (!result) {
      return reply.code(400).send({ error: '勋章已解锁或不存在' });
    }

    return { userBadge: result, message: '勋章发放成功' };
  });

  fastify.post('/users/:userId/exp', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { userId } = request.params;
    const { exp, description } = request.body;

    if (!exp || exp <= 0) {
      return reply.code(400).send({ error: '请输入有效的经验值' });
    }

    const GrowthService = require('../services/growthService');
    const growthService = new GrowthService(prisma);

    const result = await growthService.addExp(
      Number(userId),
      Number(exp),
      description || '管理员发放',
      'ADMIN'
    );

    return {
      expAdded: result.expAdded,
      levelUp: result.levelUp,
      message: '经验值发放成功'
    };
  });

  fastify.get('/stats', { preHandler: [fastify.adminOnly] }, async () => {
    const [
      totalUsers,
      totalLevels,
      totalBadges,
      totalAchievements,
      totalTasks,
      totalBenefits,
      usersWithGrowth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.level.count(),
      prisma.badge.count(),
      prisma.achievement.count(),
      prisma.task.count(),
      prisma.benefit.count(),
      prisma.userGrowth.count()
    ]);

    const topUsers = await prisma.userGrowth.findMany({
      take: 10,
      orderBy: { totalExp: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        level: true
      }
    });

    return {
      stats: {
        totalUsers,
        totalLevels,
        totalBadges,
        totalAchievements,
        totalTasks,
        totalBenefits,
        usersWithGrowth
      },
      topUsers
    };
  });
}

module.exports = routes;
