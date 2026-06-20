async function routes(fastify, options) {
  const { prisma } = fastify;

  const sendSystemMessage = async (receiverId, title, content, type = 'MEMBERSHIP') => {
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

  const getUserLevel = async (userId) => {
    const growth = await prisma.userGrowth.findUnique({
      where: { userId },
      include: { level: true }
    });
    return growth?.level?.level || 1;
  };

  const hasActiveMembership = async (userId) => {
    const membership = await prisma.userMembership.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gt: new Date() }
      },
      include: { plan: true }
    });
    return membership;
  };

  const generateOrderNo = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `MB${timestamp}${random}`;
  };

  const formatDateTime = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  fastify.get('/plans', async () => {
    const plans = await prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { level: 'asc' }]
    });
    return { plans };
  });

  fastify.get('/plans/:id', async (request, reply) => {
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: Number(request.params.id) }
    });
    if (!plan) {
      return reply.code(404).send({ error: '会员方案不存在' });
    }
    return { plan };
  });

  fastify.get('/my-membership', { preHandler: [fastify.authenticate] }, async (request) => {
    const membership = await prisma.userMembership.findFirst({
      where: {
        userId: request.user.id,
        status: 'ACTIVE',
        endDate: { gt: new Date() }
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' }
    });

    const history = await prisma.userMembership.findMany({
      where: { userId: request.user.id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const userLevel = await getUserLevel(request.user.id);

    return {
      currentMembership: membership,
      history,
      userLevel
    };
  });

  fastify.post('/plans/:id/subscribe', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const planId = Number(request.params.id);
      const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
      if (!plan || !plan.isActive) {
        return reply.code(400).send({ error: '会员方案不可用' });
      }

      const userLevel = await getUserLevel(request.user.id);
      if (userLevel < plan.level) {
        return reply.code(400).send({ error: `需要等级 Lv.${plan.level} 才能购买此方案` });
      }

      const existing = await prisma.userMembership.findFirst({
        where: {
          userId: request.user.id,
          status: 'ACTIVE',
          endDate: { gt: new Date() }
        },
        include: { plan: true }
      });

      let startDate = new Date();
      if (existing) {
        startDate = existing.endDate;
      }

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + plan.durationDays);

      if (existing) {
        await prisma.userMembership.update({
          where: { id: existing.id },
          data: { endDate }
        });

        await sendSystemMessage(
          request.user.id,
          '🎉 会员续费成功！',
          `您的「${plan.name}」会员已续费，有效期延长至 ${endDate.toLocaleDateString()}`
        );

        return { message: '续费成功', membership: existing };
      }

      const membership = await prisma.userMembership.create({
        data: {
          userId: request.user.id,
          planId,
          status: 'ACTIVE',
          startDate,
          endDate,
          orderNo: generateOrderNo(),
          amount: plan.price,
          paidAt: new Date()
        },
        include: { plan: true }
      });

      await sendSystemMessage(
        request.user.id,
        '🎊 会员开通成功！',
        `欢迎成为「${plan.name}」会员，享受专属权益！有效期至 ${endDate.toLocaleDateString()}`
      );

      return { message: '开通成功', membership };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '操作失败' });
    }
  });

  fastify.post('/my-membership/cancel', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { reason } = request.body;
      const membership = await prisma.userMembership.findFirst({
        where: {
          userId: request.user.id,
          status: 'ACTIVE',
          endDate: { gt: new Date() }
        },
        include: { plan: true }
      });

      if (!membership) {
        return reply.code(400).send({ error: '没有活跃的会员' });
      }

      const updated = await prisma.userMembership.update({
        where: { id: membership.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason || '用户主动取消',
          autoRenew: false
        }
      });

      await sendSystemMessage(
        request.user.id,
        '会员已取消',
        `您的「${membership.plan.name}」会员已取消，感谢您的支持！`
      );

      return { message: '取消成功', membership: updated };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '操作失败' });
    }
  });

  fastify.get('/exclusive-zines', async (request, reply) => {
    const { page = 1, limit = 10, category } = request.query;
    const skip = (page - 1) * limit;
    const where = { status: 'PUBLISHED' };
    if (category) where.category = category;

    const [zines, total] = await Promise.all([
      prisma.exclusiveZine.findMany({
        where,
        skip,
        take: Number(limit),
        include: { creator: { select: { id: true, username: true, avatar: true } } },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }]
      }),
      prisma.exclusiveZine.count({ where })
    ]);

    return {
      zines,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.get('/exclusive-zines/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const zine = await prisma.exclusiveZine.findUnique({
      where: { id: Number(request.params.id) },
      include: { creator: { select: { id: true, username: true, avatar: true } } }
    });

    if (!zine) {
      return reply.code(404).send({ error: '内容不存在' });
    }

    const userLevel = await getUserLevel(request.user.id);
    const membership = await hasActiveMembership(request.user.id);

    let hasAccess = true;
    let denialReason = null;

    if (zine.minLevel > userLevel) {
      hasAccess = false;
      denialReason = `需要等级 Lv.${zine.minLevel} 才能阅读`;
    }

    if (zine.requirePlan && !membership) {
      hasAccess = false;
      denialReason = '需要开通会员才能阅读此专属内容';
    }

    await prisma.benefitCheckLog.create({
      data: {
        userId: request.user.id,
        benefitCode: 'EXCLUSIVE_READ',
        resourceType: 'EXCLUSIVE_ZINE',
        resourceId: zine.id,
        hasAccess,
        denialReason
      }
    });

    if (!hasAccess) {
      return reply.code(403).send({
        error: denialReason,
        requiresLevel: zine.minLevel,
        requiresMembership: zine.requirePlan
      });
    }

    await prisma.exclusiveZine.update({
      where: { id: zine.id },
      data: { views: { increment: 1 } }
    });

    return { zine };
  });

  fastify.get('/early-access', async (request, reply) => {
    const { page = 1, limit = 10 } = request.query;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.earlyAccess.findMany({
        where: { status: { in: ['PENDING', 'PUBLISHED'] } },
        skip,
        take: Number(limit),
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          zine: { select: { id: true, title: true } }
        },
        orderBy: [{ publishDate: 'asc' }, { sortOrder: 'asc' }]
      }),
      prisma.earlyAccess.count({ where: { status: { in: ['PENDING', 'PUBLISHED'] } } })
    ]);

    const now = new Date();
    const itemsWithStatus = items.map(item => {
      const publishDate = new Date(item.publishDate);
      const earlyWindowStart = new Date(publishDate.getTime() - item.earlyHours * 60 * 60 * 1000);
      let accessPhase = 'NOT_OPEN';
      if (now >= publishDate) {
        accessPhase = 'PUBLISHED';
      } else if (now >= earlyWindowStart) {
        accessPhase = 'EARLY_WINDOW';
      }
      return {
        ...item,
        earlyWindowStart,
        accessPhase
      };
    });

    return {
      items: itemsWithStatus,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.get('/early-access/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const item = await prisma.earlyAccess.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true, avatar: true } },
        zine: true
      }
    });

    if (!item) {
      return reply.code(404).send({ error: '内容不存在' });
    }

    const now = new Date();
    const publishDate = new Date(item.publishDate);
    const earlyWindowStart = new Date(publishDate.getTime() - item.earlyHours * 60 * 60 * 1000);

    let accessPhase;
    if (now >= publishDate) {
      accessPhase = 'PUBLISHED';
    } else if (now >= earlyWindowStart) {
      accessPhase = 'EARLY_WINDOW';
    } else {
      accessPhase = 'NOT_OPEN';
    }

    const userLevel = await getUserLevel(request.user.id);
    const membership = await hasActiveMembership(request.user.id);

    let hasAccess = false;
    let denialReason = null;
    let denialCode = null;

    if (accessPhase === 'PUBLISHED') {
      hasAccess = true;
    } else if (accessPhase === 'EARLY_WINDOW') {
      if (item.minLevel <= userLevel && (!item.requirePlan || membership)) {
        hasAccess = true;
      } else if (item.minLevel > userLevel) {
        denialReason = `提前阅读需要等级 Lv.${item.minLevel}，当前等级 Lv.${userLevel}`;
        denialCode = 'INSUFFICIENT_LEVEL';
      } else if (item.requirePlan && !membership) {
        denialReason = '提前阅读需要开通会员';
        denialCode = 'MEMBERSHIP_REQUIRED';
      }
    } else {
      const hoursToWindow = Math.ceil((earlyWindowStart - now) / (1000 * 60 * 60));
      if (hoursToWindow > 24) {
        const daysToWindow = Math.ceil(hoursToWindow / 24);
        denialReason = `提前阅读尚未开放，距离开放还有约 ${daysToWindow} 天（${formatDateTime(earlyWindowStart)} 开始）`;
      } else if (hoursToWindow > 1) {
        denialReason = `提前阅读尚未开放，距离开放还有约 ${hoursToWindow} 小时（${formatDateTime(earlyWindowStart)} 开始）`;
      } else {
        const minutesToWindow = Math.ceil((earlyWindowStart - now) / (1000 * 60));
        denialReason = `提前阅读尚未开放，距离开放还有约 ${minutesToWindow} 分钟（${formatDateTime(earlyWindowStart)} 开始）`;
      }
      denialCode = 'WINDOW_NOT_OPEN';
    }

    await prisma.benefitCheckLog.create({
      data: {
        userId: request.user.id,
        benefitCode: 'EARLY_ACCESS',
        resourceType: 'EARLY_ACCESS',
        resourceId: item.id,
        hasAccess,
        denialReason
      }
    });

    if (!hasAccess) {
      return reply.code(403).send({
        error: denialReason,
        denialCode,
        publishDate: item.publishDate,
        earlyWindowStart: earlyWindowStart.toISOString(),
        earlyHours: item.earlyHours,
        requiresLevel: item.minLevel,
        userLevel,
        requiresMembership: item.requirePlan,
        hasMembership: !!membership,
        accessPhase,
        isPublished: accessPhase === 'PUBLISHED'
      });
    }

    await prisma.earlyAccess.update({
      where: { id: item.id },
      data: { views: { increment: 1 } }
    });

    return {
      item,
      accessPhase,
      isPublished: accessPhase === 'PUBLISHED',
      publishDate: item.publishDate,
      earlyWindowStart: earlyWindowStart.toISOString()
    };
  });

  fastify.get('/benefits/check', { preHandler: [fastify.authenticate] }, async (request) => {
    const { benefitCode, resourceType, resourceId } = request.query;
    const now = new Date();
    const userLevel = await getUserLevel(request.user.id);
    const membership = await hasActiveMembership(request.user.id);

    let hasAccess = true;
    let denialReason = null;
    let accessPhase = null;
    let earlyWindowStart = null;
    let publishDate = null;

    if (benefitCode === 'EARLY_ACCESS' || benefitCode === 'EXCLUSIVE_READ') {
      if (resourceType === 'EARLY_ACCESS' && resourceId) {
        const item = await prisma.earlyAccess.findUnique({ where: { id: Number(resourceId) } });
        if (item) {
          publishDate = new Date(item.publishDate);
          earlyWindowStart = new Date(publishDate.getTime() - item.earlyHours * 60 * 60 * 1000);

          if (now >= publishDate) {
            accessPhase = 'PUBLISHED';
            hasAccess = true;
          } else if (now >= earlyWindowStart) {
            accessPhase = 'EARLY_WINDOW';
            if (item.minLevel > userLevel) {
              hasAccess = false;
              denialReason = `提前阅读需要等级 Lv.${item.minLevel}`;
            } else if (item.requirePlan && !membership) {
              hasAccess = false;
              denialReason = '提前阅读需要开通会员';
            }
          } else {
            accessPhase = 'NOT_OPEN';
            hasAccess = false;
            denialReason = `提前阅读尚未开放，${formatDateTime(earlyWindowStart)} 开始`;
          }
        }
      }
      if (resourceType === 'EXCLUSIVE_ZINE' && resourceId) {
        const zine = await prisma.exclusiveZine.findUnique({ where: { id: Number(resourceId) } });
        if (zine) {
          if (zine.minLevel > userLevel) {
            hasAccess = false;
            denialReason = `需要等级 Lv.${zine.minLevel}`;
          } else if (zine.requirePlan && !membership) {
            hasAccess = false;
            denialReason = '需要开通会员';
          }
        }
      }
    }

    await prisma.benefitCheckLog.create({
      data: {
        userId: request.user.id,
        benefitCode: benefitCode || 'GENERAL',
        resourceType: resourceType || 'GENERAL',
        resourceId: Number(resourceId) || 0,
        hasAccess,
        denialReason
      }
    });

    return {
      hasAccess,
      denialReason,
      accessPhase,
      earlyWindowStart: earlyWindowStart ? earlyWindowStart.toISOString() : null,
      publishDate: publishDate ? publishDate.toISOString() : null,
      userLevel,
      hasMembership: !!membership
    };
  });

  fastify.get('/benefits/logs', { preHandler: [fastify.authenticate] }, async (request) => {
    const { page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.benefitCheckLog.findMany({
        where: { userId: request.user.id },
        skip,
        take: Number(limit),
        orderBy: { checkAt: 'desc' }
      }),
      prisma.benefitCheckLog.count({ where: { userId: request.user.id } })
    ]);

    return {
      logs,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.post('/messages/send-to-members', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const { title, content, planId, minLevel } = request.body;

      if (!title || !content) {
        return reply.code(400).send({ error: '标题和内容不能为空' });
      }

      const where = { status: 'ACTIVE', endDate: { gt: new Date() } };
      if (planId) where.planId = Number(planId);

      const activeMemberships = await prisma.userMembership.findMany({
        where,
        include: { plan: true }
      });

      let userIds = activeMemberships.map(m => m.userId);

      if (minLevel) {
        const growthRecords = await prisma.userGrowth.findMany({
          where: { userId: { in: userIds }, level: { level: { gte: Number(minLevel) } } },
          include: { level: true }
        });
        userIds = growthRecords.map(g => g.userId);
      }

      userIds = [...new Set(userIds)];

      const messages = userIds.map(userId => ({
        senderId: 1,
        receiverId: userId,
        title,
        content,
        type: 'MEMBERSHIP'
      }));

      if (messages.length > 0) {
        await prisma.message.createMany({ data: messages });
      }

      return {
        message: `消息已发送给 ${messages.length} 位会员`,
        sentCount: messages.length
      };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '发送失败' });
    }
  });

  fastify.get('/messages/templates', { preHandler: [fastify.adminOnly] }, async () => {
    const templates = await prisma.membershipMessage.findMany({
      where: { isActive: true },
      include: { targetPlan: true },
      orderBy: { createdAt: 'desc' }
    });
    return { templates };
  });

  fastify.get('/stats', { preHandler: [fastify.adminOnly] }, async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalMembers,
      activeMembers,
      totalPlans,
      newMembersThisMonth,
      exclusiveZineCount,
      earlyAccessCount,
      benefitCheckCount
    ] = await Promise.all([
      prisma.userMembership.count({ distinct: ['userId'] }),
      prisma.userMembership.count({
        where: { status: 'ACTIVE', endDate: { gt: now } },
        distinct: ['userId']
      }),
      prisma.membershipPlan.count({ where: { isActive: true } }),
      prisma.userMembership.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
        distinct: ['userId']
      }),
      prisma.exclusiveZine.count(),
      prisma.earlyAccess.count(),
      prisma.benefitCheckLog.count({ where: { checkAt: { gte: thirtyDaysAgo } } })
    ]);

    const planStats = await prisma.membershipPlan.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { userMemberships: { where: { status: 'ACTIVE', endDate: { gt: now } } } }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return {
      stats: {
        totalMembers,
        activeMembers,
        totalPlans,
        newMembersThisMonth,
        exclusiveZineCount,
        earlyAccessCount,
        benefitCheckCount
      },
      planStats
    };
  });
}

module.exports = routes;
