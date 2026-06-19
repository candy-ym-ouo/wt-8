async function routes(fastify, options) {
  const { prisma } = fastify;
  const GrowthService = require('../services/growthService');
  const growthService = new GrowthService(prisma);

  const sendSystemMessage = async (receiverId, title, content, type = 'SYSTEM') => {
    try {
      await prisma.message.create({
        data: {
          senderId: 1,
          receiverId,
          title,
          content,
          type
        }
      });
    } catch (e) {
      fastify.log.error('发送系统消息失败:', e);
    }
  };

  const handleGrowthResults = async (userId, results) => {
    if (results.levelUp) {
      await sendSystemMessage(
        userId,
        '🎉 等级提升！',
        `恭喜你从 ${results.levelUp.oldLevel?.name || '新手'} 升级到 ${results.levelUp.newLevel.name}！新的权益已解锁，快去查看吧！`
      );
    }

    for (const ach of results.achievements) {
      if (ach.isNewlyCompleted) {
        await sendSystemMessage(
          userId,
          '🏆 成就解锁！',
          `恭喜你解锁成就「${ach.achievement.achievement.name}」！${ach.achievement.achievement.expReward > 0 ? `获得 ${ach.achievement.achievement.expReward} 经验值奖励！` : ''}`
        );
      }
    }

    for (const task of results.tasks) {
      if (task.isNewlyCompleted) {
        await sendSystemMessage(
          userId,
          '✅ 任务完成！',
          `任务「${task.task.task.name}」已完成，快去领取 ${task.task.task.expReward} 经验值奖励！`
        );
      }
    }
  };

  fastify.decorate('growthService', growthService);
  fastify.decorate('handleGrowthResults', handleGrowthResults);

  fastify.get('/overview', { preHandler: [fastify.authenticate] }, async (request) => {
    const overview = await growthService.getGrowthOverview(request.user.id);
    return { overview };
  });

  fastify.get('/levels', async () => {
    const levels = await prisma.level.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' }
    });
    return { levels };
  });

  fastify.get('/badges', async () => {
    const badges = await prisma.badge.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
    return { badges };
  });

  fastify.get('/achievements', async () => {
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
      include: { badge: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
    return { achievements };
  });

  fastify.get('/tasks', { preHandler: [fastify.authenticate] }, async (request) => {
    const today = new Date().toISOString().split('T')[0];
    const activeTasks = await prisma.task.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });

    const growth = await growthService.getUserGrowth(request.user.id);
    const userTasks = await prisma.userTask.findMany({
      where: {
        userGrowthId: growth.id,
        date: today
      },
      include: { task: true }
    });

    const tasksWithProgress = activeTasks.map(task => {
      const userTask = userTasks.find(ut => ut.taskId === task.id);
      return {
        task,
        progress: userTask?.progress || 0,
        isCompleted: userTask?.isCompleted || false,
        claimedAt: userTask?.claimedAt || null,
        userTaskId: userTask?.id || null
      };
    });

    return { tasks: tasksWithProgress };
  });

  fastify.get('/my-badges', { preHandler: [fastify.authenticate] }, async (request) => {
    const growth = await growthService.getUserGrowth(request.user.id);
    const userBadges = await prisma.userBadge.findMany({
      where: { userGrowthId: growth.id },
      include: { badge: true },
      orderBy: { unlockedAt: 'desc' }
    });
    return { badges: userBadges };
  });

  fastify.get('/my-achievements', { preHandler: [fastify.authenticate] }, async (request) => {
    const growth = await growthService.getUserGrowth(request.user.id);
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
      include: { badge: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userGrowthId: growth.id },
      include: { achievement: true }
    });

    const result = achievements.map(ach => {
      const userAch = userAchievements.find(ua => ua.achievementId === ach.id);
      return {
        achievement: ach,
        progress: userAch?.progress || 0,
        isCompleted: userAch?.isCompleted || false,
        completedAt: userAch?.completedAt || null,
        claimedAt: userAch?.claimedAt || null,
        userAchievementId: userAch?.id || null
      };
    });

    return { achievements: result };
  });

  fastify.get('/my-benefits', { preHandler: [fastify.authenticate] }, async (request) => {
    const benefits = await prisma.userBenefit.findMany({
      where: { userId: request.user.id, isActive: true },
      include: { benefit: true },
      orderBy: { benefit: { minLevel: 'asc' } }
    });

    const allBenefits = await prisma.benefit.findMany({
      where: { isActive: true },
      orderBy: { minLevel: 'asc' }
    });

    return { benefits, allBenefits };
  });

  fastify.post('/tasks/:id/claim', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const result = await growthService.claimTaskReward(
        request.user.id,
        Number(request.params.id)
      );
      return { message: '奖励领取成功', exp: result.exp };
    } catch (e) {
      return reply.code(400).send({ error: e.message });
    }
  });

  fastify.post('/achievements/:id/claim', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      await growthService.claimAchievementReward(
        request.user.id,
        Number(request.params.id)
      );
      return { message: '奖励领取成功' };
    } catch (e) {
      return reply.code(400).send({ error: e.message });
    }
  });

  fastify.get('/logs', { preHandler: [fastify.authenticate] }, async (request) => {
    const { page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;

    const growth = await growthService.getUserGrowth(request.user.id);
    const [logs, total] = await Promise.all([
      prisma.growthLog.findMany({
        where: { userGrowthId: growth.id },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.growthLog.count({ where: { userGrowthId: growth.id } })
    ]);

    return {
      logs,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.post('/trigger-event', { preHandler: [fastify.authenticate] }, async (request) => {
    const { eventType, data } = request.body;
    const results = await growthService.triggerEvent(
      request.user.id,
      eventType,
      data || {}
    );
    await handleGrowthResults(request.user.id, results);
    return { results };
  });
}

module.exports = routes;
