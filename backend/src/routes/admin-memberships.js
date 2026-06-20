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

  fastify.get('/plans', { preHandler: [fastify.adminOnly] }, async () => {
    const plans = await prisma.membershipPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { level: 'asc' }]
    });
    return { plans };
  });

  fastify.post('/plans', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const {
        name, code, description, price, originalPrice, durationDays,
        level, color, icon, benefits, sortOrder, isActive, isRecommended
      } = request.body;

      if (!name || !code) {
        return reply.code(400).send({ error: '名称和编码不能为空' });
      }

      const existing = await prisma.membershipPlan.findUnique({ where: { code } });
      if (existing) {
        return reply.code(400).send({ error: '方案编码已存在' });
      }

      const plan = await prisma.membershipPlan.create({
        data: {
          name,
          code,
          description: description || '',
          price: price || 0,
          originalPrice: originalPrice || 0,
          durationDays: durationDays || 30,
          level: level || 1,
          color: color || '#d4624a',
          icon,
          benefits: JSON.stringify(benefits || []),
          sortOrder: sortOrder || 0,
          isActive: isActive !== undefined ? isActive : true,
          isRecommended: isRecommended || false
        }
      });

      return { message: '创建成功', plan };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '创建失败' });
    }
  });

  fastify.put('/plans/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const id = Number(request.params.id);
      const existing = await prisma.membershipPlan.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ error: '方案不存在' });
      }

      const {
        name, code, description, price, originalPrice, durationDays,
        level, color, icon, benefits, sortOrder, isActive, isRecommended
      } = request.body;

      if (code && code !== existing.code) {
        const codeExists = await prisma.membershipPlan.findUnique({ where: { code } });
        if (codeExists) {
          return reply.code(400).send({ error: '方案编码已存在' });
        }
      }

      const plan = await prisma.membershipPlan.update({
        where: { id },
        data: {
          name: name !== undefined ? name : existing.name,
          code: code !== undefined ? code : existing.code,
          description: description !== undefined ? description : existing.description,
          price: price !== undefined ? price : existing.price,
          originalPrice: originalPrice !== undefined ? originalPrice : existing.originalPrice,
          durationDays: durationDays !== undefined ? durationDays : existing.durationDays,
          level: level !== undefined ? level : existing.level,
          color: color !== undefined ? color : existing.color,
          icon: icon !== undefined ? icon : existing.icon,
          benefits: benefits !== undefined ? JSON.stringify(benefits) : existing.benefits,
          sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
          isActive: isActive !== undefined ? isActive : existing.isActive,
          isRecommended: isRecommended !== undefined ? isRecommended : existing.isRecommended
        }
      });

      return { message: '更新成功', plan };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '更新失败' });
    }
  });

  fastify.delete('/plans/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const id = Number(request.params.id);
      const memberships = await prisma.userMembership.count({
        where: { planId: id, status: 'ACTIVE' }
      });
      if (memberships > 0) {
        return reply.code(400).send({ error: '该方案下还有活跃会员，无法删除' });
      }

      await prisma.membershipPlan.delete({ where: { id } });
      return { message: '删除成功' };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '删除失败' });
    }
  });

  fastify.get('/exclusive-zines', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { page = 1, limit = 20, status } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;

    const [zines, total] = await Promise.all([
      prisma.exclusiveZine.findMany({
        where,
        skip,
        take: Number(limit),
        include: { creator: { select: { id: true, username: true } } },
        orderBy: [{ createdAt: 'desc' }]
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

  fastify.post('/exclusive-zines', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const {
        title, description, coverImage, content, category, tags,
        minLevel, requirePlan, status, sortOrder, isFeatured
      } = request.body;

      if (!title || !content) {
        return reply.code(400).send({ error: '标题和内容不能为空' });
      }

      const zine = await prisma.exclusiveZine.create({
        data: {
          title,
          description: description || '',
          coverImage,
          content,
          category: category || 'MEMBER',
          tags: JSON.stringify(tags || []),
          minLevel: minLevel || 1,
          requirePlan: requirePlan || false,
          status: status || 'PUBLISHED',
          sortOrder: sortOrder || 0,
          isFeatured: isFeatured || false,
          creatorId: request.user.id
        }
      });

      return { message: '创建成功', zine };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '创建失败' });
    }
  });

  fastify.put('/exclusive-zines/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const id = Number(request.params.id);
      const existing = await prisma.exclusiveZine.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ error: '内容不存在' });
      }

      const {
        title, description, coverImage, content, category, tags,
        minLevel, requirePlan, status, sortOrder, isFeatured
      } = request.body;

      const zine = await prisma.exclusiveZine.update({
        where: { id },
        data: {
          title: title !== undefined ? title : existing.title,
          description: description !== undefined ? description : existing.description,
          coverImage: coverImage !== undefined ? coverImage : existing.coverImage,
          content: content !== undefined ? content : existing.content,
          category: category !== undefined ? category : existing.category,
          tags: tags !== undefined ? JSON.stringify(tags) : existing.tags,
          minLevel: minLevel !== undefined ? minLevel : existing.minLevel,
          requirePlan: requirePlan !== undefined ? requirePlan : existing.requirePlan,
          status: status !== undefined ? status : existing.status,
          sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
          isFeatured: isFeatured !== undefined ? isFeatured : existing.isFeatured
        }
      });

      return { message: '更新成功', zine };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '更新失败' });
    }
  });

  fastify.delete('/exclusive-zines/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const id = Number(request.params.id);
      await prisma.exclusiveZine.delete({ where: { id } });
      return { message: '删除成功' };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '删除失败' });
    }
  });

  fastify.get('/early-access', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { page = 1, limit = 20, status } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.earlyAccess.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          creator: { select: { id: true, username: true } },
          zine: { select: { id: true, title: true } }
        },
        orderBy: [{ publishDate: 'desc' }]
      }),
      prisma.earlyAccess.count({ where })
    ]);

    return {
      items,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.post('/early-access', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const {
        title, description, coverImage, content, zineId, publishDate,
        minLevel, requirePlan, earlyHours, status, sortOrder
      } = request.body;

      if (!title || !content || !publishDate) {
        return reply.code(400).send({ error: '标题、内容和发布时间不能为空' });
      }

      const item = await prisma.earlyAccess.create({
        data: {
          title,
          description: description || '',
          coverImage,
          content,
          zineId: zineId ? Number(zineId) : null,
          publishDate: new Date(publishDate),
          minLevel: minLevel || 1,
          requirePlan: requirePlan || false,
          earlyHours: earlyHours || 24,
          status: status || 'PENDING',
          sortOrder: sortOrder || 0,
          creatorId: request.user.id
        }
      });

      return { message: '创建成功', item };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '创建失败' });
    }
  });

  fastify.put('/early-access/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const id = Number(request.params.id);
      const existing = await prisma.earlyAccess.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ error: '内容不存在' });
      }

      const {
        title, description, coverImage, content, zineId, publishDate,
        minLevel, requirePlan, earlyHours, status, sortOrder
      } = request.body;

      const item = await prisma.earlyAccess.update({
        where: { id },
        data: {
          title: title !== undefined ? title : existing.title,
          description: description !== undefined ? description : existing.description,
          coverImage: coverImage !== undefined ? coverImage : existing.coverImage,
          content: content !== undefined ? content : existing.content,
          zineId: zineId !== undefined ? (zineId ? Number(zineId) : null) : existing.zineId,
          publishDate: publishDate !== undefined ? new Date(publishDate) : existing.publishDate,
          minLevel: minLevel !== undefined ? minLevel : existing.minLevel,
          requirePlan: requirePlan !== undefined ? requirePlan : existing.requirePlan,
          earlyHours: earlyHours !== undefined ? earlyHours : existing.earlyHours,
          status: status !== undefined ? status : existing.status,
          sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder
        }
      });

      return { message: '更新成功', item };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '更新失败' });
    }
  });

  fastify.delete('/early-access/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const id = Number(request.params.id);
      await prisma.earlyAccess.delete({ where: { id } });
      return { message: '删除成功' };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '删除失败' });
    }
  });

  fastify.get('/members', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { page = 1, limit = 20, status, planId } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;
    if (planId) where.planId = Number(planId);

    const [memberships, total] = await Promise.all([
      prisma.userMembership.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          user: { select: { id: true, username: true, email: true, avatar: true } },
          plan: true
        },
        orderBy: [{ createdAt: 'desc' }]
      }),
      prisma.userMembership.count({ where })
    ]);

    return {
      memberships,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.post('/members/:userId/grant', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const userId = Number(request.params.userId);
      const { planId, durationDays, reason } = request.body;

      if (!planId || !durationDays) {
        return reply.code(400).send({ error: '方案和时长不能为空' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.code(404).send({ error: '用户不存在' });
      }

      const plan = await prisma.membershipPlan.findUnique({ where: { id: Number(planId) } });
      if (!plan) {
        return reply.code(404).send({ error: '方案不存在' });
      }

      const existing = await prisma.userMembership.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          endDate: { gt: new Date() }
        }
      });

      let startDate = new Date();
      if (existing) {
        startDate = existing.endDate;
      }

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Number(durationDays));

      let membership;
      if (existing) {
        membership = await prisma.userMembership.update({
          where: { id: existing.id },
          data: { endDate }
        });
      } else {
        membership = await prisma.userMembership.create({
          data: {
            userId,
            planId: Number(planId),
            status: 'ACTIVE',
            startDate,
            endDate,
            orderNo: `ADMIN${Date.now()}`,
            amount: 0,
            paidAt: new Date()
          }
        });
      }

      await sendSystemMessage(
        userId,
        '🎁 会员已开通',
        reason ? `管理员已为您开通「${plan.name}」会员：${reason}` : `管理员已为您开通「${plan.name}」会员，有效期至 ${endDate.toLocaleDateString()}`
      );

      return { message: '会员已开通', membership };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '操作失败' });
    }
  });

  fastify.post('/members/:userId/revoke', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const userId = Number(request.params.userId);
      const { reason } = request.body;

      const membership = await prisma.userMembership.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          endDate: { gt: new Date() }
        },
        include: { plan: true }
      });

      if (!membership) {
        return reply.code(400).send({ error: '该用户没有活跃会员' });
      }

      await prisma.userMembership.update({
        where: { id: membership.id },
        data: {
          status: 'REVOKED',
          cancelledAt: new Date(),
          cancelReason: reason || '管理员操作'
        }
      });

      await sendSystemMessage(
        userId,
        '会员已取消',
        reason ? `您的「${membership.plan.name}」会员已被取消：${reason}` : `您的「${membership.plan.name}」会员已被管理员取消`
      );

      return { message: '会员已取消' };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '操作失败' });
    }
  });

  fastify.get('/config', { preHandler: [fastify.adminOnly] }, async () => {
    const configs = await prisma.membershipConfig.findMany({
      orderBy: { key: 'asc' }
    });
    return { configs };
  });

  fastify.put('/config', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    try {
      const { configs } = request.body;
      if (!Array.isArray(configs)) {
        return reply.code(400).send({ error: '数据格式错误' });
      }

      const results = [];
      for (const cfg of configs) {
        const existing = await prisma.membershipConfig.findUnique({ where: { key: cfg.key } });
        if (existing) {
          const updated = await prisma.membershipConfig.update({
            where: { key: cfg.key },
            data: { value: cfg.value, description: cfg.description || existing.description }
          });
          results.push(updated);
        } else {
          const created = await prisma.membershipConfig.create({
            data: { key: cfg.key, value: cfg.value, description: cfg.description }
          });
          results.push(created);
        }
      }

      return { message: '配置已更新', configs: results };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: '保存失败' });
    }
  });

  fastify.get('/benefit-check-logs', { preHandler: [fastify.adminOnly] }, async (request) => {
    const { page = 1, limit = 20, userId, benefitCode } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (userId) where.userId = Number(userId);
    if (benefitCode) where.benefitCode = benefitCode;

    const [logs, total] = await Promise.all([
      prisma.benefitCheckLog.findMany({
        where,
        skip,
        take: Number(limit),
        include: { user: { select: { id: true, username: true } } },
        orderBy: { checkAt: 'desc' }
      }),
      prisma.benefitCheckLog.count({ where })
    ]);

    return {
      logs,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });
}

module.exports = routes;
