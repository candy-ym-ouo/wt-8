function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const formatCrowdfunding = (c) => {
  if (!c) return c;
  return {
    ...c,
    tags: parseJSONField(c.tags, []),
    progress: c.targetAmount > 0 ? Math.min(100, Math.round((c.currentAmount / c.targetAmount) * 100)) : 0
  };
};

const formatTier = (t) => {
  if (!t) return t;
  return {
    ...t,
    perks: parseJSONField(t.perks, []),
    remainingStock: t.isUnlimited ? -1 : Math.max(0, t.stock - t.soldCount),
    isLowStock: !t.isUnlimited && t.stock > 0 && (t.stock - t.soldCount) > 0 && (t.stock - t.soldCount) <= 5
  };
};

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', async (request) => {
    const { status, category, page = 1, limit = 20, keyword, sort = 'newest' } = request.query;
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
        { description: { contains: keyword } }
      ];
    }

    let orderBy;
    switch (sort) {
      case 'most-funded':
        orderBy = { currentAmount: 'desc' };
        break;
      case 'most-backers':
        orderBy = { backerCount: 'desc' };
        break;
      case 'ending-soon':
        orderBy = { deadline: 'asc' };
        break;
      default:
        orderBy = [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }];
    }

    const [crowdfundingsData, total] = await Promise.all([
      prisma.crowdfunding.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          tiers: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { orders: true } }
        }
      }),
      prisma.crowdfunding.count({ where })
    ]);

    const crowdfundings = crowdfundingsData.map(c => {
      const formatted = formatCrowdfunding(c);
      return {
        ...formatted,
        tiers: c.tiers.map(formatTier),
        orderCount: c._count.orders
      };
    });

    return { crowdfundings, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/featured', async () => {
    const crowdfundingsData = await prisma.crowdfunding.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      take: 5,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        creator: { select: { id: true, username: true, avatar: true } },
        tiers: { orderBy: { sortOrder: 'asc' } }
      }
    });

    const crowdfundings = crowdfundingsData.map(c => {
      const formatted = formatCrowdfunding(c);
      return {
        ...formatted,
        tiers: c.tiers.map(formatTier)
      };
    });

    return { crowdfundings };
  });

  fastify.get('/mine', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = { creatorId: request.user.id };

    if (status && status !== 'all') where.status = status;

    const [crowdfundingsData, total] = await Promise.all([
      prisma.crowdfunding.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          tiers: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { orders: true } },
          reviewer: { select: { id: true, username: true } }
        }
      }),
      prisma.crowdfunding.count({ where })
    ]);

    const crowdfundings = crowdfundingsData.map(c => {
      const formatted = formatCrowdfunding(c);
      return {
        ...formatted,
        tiers: c.tiers.map(formatTier),
        orderCount: c._count.orders
      };
    });

    return { crowdfundings, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', async (request, reply) => {
    const crowdfundingData = await prisma.crowdfunding.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true, avatar: true, bio: true } },
        tiers: { orderBy: { sortOrder: 'asc' } },
        reviewer: { select: { id: true, username: true } },
        _count: { select: { orders: true } }
      }
    });

    if (!crowdfundingData) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    let user = null;
    try {
      const decoded = await request.jwtVerify();
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      }
    } catch (e) {}

    const isOwner = user && crowdfundingData.creatorId === user.id;
    const isAdmin = user && user.role === 'ADMIN';

    if (!['PUBLISHED', 'ENDED', 'SUCCESSFUL'].includes(crowdfundingData.status) && !isOwner && !isAdmin) {
      return reply.code(403).send({ error: '无权查看此众筹项目' });
    }

    const crowdfunding = {
      ...formatCrowdfunding(crowdfundingData),
      tiers: crowdfundingData.tiers.map(formatTier),
      orderCount: crowdfundingData._count.orders
    };

    if (user && crowdfunding.status === 'PUBLISHED' && !isOwner && !isAdmin) {
      await prisma.crowdfunding.update({
        where: { id: crowdfunding.id },
        data: { viewCount: { increment: 1 } }
      });
      crowdfunding.viewCount += 1;
    }

    let userOrder = null;
    if (user) {
      userOrder = await prisma.crowdfundingOrder.findFirst({
        where: {
          crowdfundingId: crowdfunding.id,
          userId: user.id,
          status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] }
        },
        include: { tier: true }
      });
      if (userOrder) {
        userOrder.tier = formatTier(userOrder.tier);
      }
    }

    return { crowdfunding, userOrder, isOwner, isAdmin };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const {
      title, description, coverImage, category, tags,
      targetAmount, deadline, startTime, stockThreshold,
      tiers, status
    } = request.body;

    if (!title || !description) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    let initialStatus;
    if (status && isAdmin) {
      initialStatus = status;
    } else {
      initialStatus = isAdmin ? 'DRAFT' : 'PENDING_REVIEW';
    }

    const crowdfunding = await prisma.crowdfunding.create({
      data: {
        title,
        description,
        coverImage: coverImage || null,
        category: category || 'ZINE',
        tags: tags ? JSON.stringify(tags) : '[]',
        targetAmount: Number(targetAmount) || 0,
        deadline: deadline ? new Date(deadline) : null,
        startTime: startTime ? new Date(startTime) : null,
        stockThreshold: Number(stockThreshold) || 0,
        status: initialStatus,
        creatorId: request.user.id
      }
    });

    if (tiers && Array.isArray(tiers) && tiers.length > 0) {
      for (const tier of tiers) {
        await prisma.crowdfundingTier.create({
          data: {
            crowdfundingId: crowdfunding.id,
            name: tier.name,
            description: tier.description || null,
            price: Number(tier.price) || 0,
            stock: Number(tier.stock) || 0,
            sortOrder: Number(tier.sortOrder) || 0,
            deliveryDate: tier.deliveryDate ? new Date(tier.deliveryDate) : null,
            perks: tier.perks ? JSON.stringify(tier.perks) : '[]',
            isUnlimited: Boolean(tier.isUnlimited)
          }
        });
      }
    }

    if (!isAdmin && initialStatus === 'PENDING_REVIEW') {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: request.user.id,
          title: '众筹项目已提交审核',
          content: `您的众筹项目《${crowdfunding.title}》已成功提交，等待管理员审核。\n\n审核通过后将自动发布，审核结果将通过站内消息通知您，请耐心等待。`,
          type: 'CROWDFUNDING'
        }
      });

      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await prisma.message.create({
          data: {
            senderId: request.user.id,
            receiverId: admin.id,
            title: '新的众筹项目待审核',
            content: `用户 ${user.username}（ID: ${request.user.id}）提交了新的众筹项目《${crowdfunding.title}》，请及时审核。\n\n请前往【后台管理 - 众筹管理】查看详情并进行审核。`,
            type: 'CROWDFUNDING'
          }
        });
      }
    }

    return {
      crowdfunding: formatCrowdfunding(crowdfunding),
      message: isAdmin ? '众筹项目创建成功' : '众筹项目已提交，等待审核'
    };
  });

  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const crowdfunding = await prisma.crowdfunding.findUnique({ where: { id: Number(id) } });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = crowdfunding.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权编辑此众筹项目' });
    }

    const data = request.body;
    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.targetAmount !== undefined) updateData.targetAmount = Number(data.targetAmount);
    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }
    if (data.startTime !== undefined) {
      updateData.startTime = data.startTime ? new Date(data.startTime) : null;
    }
    if (data.stockThreshold !== undefined) updateData.stockThreshold = Number(data.stockThreshold);

    if (isAdmin) {
      if (data.status !== undefined) updateData.status = data.status;
      if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
      if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);
    }

    if (isOwner && !isAdmin && ['PUBLISHED', 'PENDING_REVIEW', 'REJECTED'].includes(crowdfunding.status)) {
      if (['PUBLISHED', 'PENDING_REVIEW'].includes(crowdfunding.status)) {
        updateData.status = 'PENDING_REVIEW';
      }
    }

    const updated = await prisma.crowdfunding.update({
      where: { id: Number(id) },
      data: updateData
    });

    if (data.tiers && Array.isArray(data.tiers)) {
      const existingTiers = await prisma.crowdfundingTier.findMany({
        where: { crowdfundingId: Number(id) }
      });
      const existingTierIds = existingTiers.map(t => t.id);
      const newTierIds = data.tiers.filter(t => t.id).map(t => t.id);
      const tiersToDelete = existingTierIds.filter(id => !newTierIds.includes(id));
      
      for (const tierId of tiersToDelete) {
        const hasOrders = await prisma.crowdfundingOrder.count({
          where: { tierId, status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } }
        });
        if (hasOrders === 0) {
          await prisma.crowdfundingTier.delete({ where: { id: tierId } });
        }
      }

      for (const tier of data.tiers) {
        if (tier.id) {
          await prisma.crowdfundingTier.update({
            where: { id: tier.id },
            data: {
              name: tier.name,
              description: tier.description || null,
              price: Number(tier.price) || 0,
              stock: Number(tier.stock) || 0,
              sortOrder: Number(tier.sortOrder) || 0,
              deliveryDate: tier.deliveryDate ? new Date(tier.deliveryDate) : null,
              perks: tier.perks ? JSON.stringify(tier.perks) : '[]',
              isUnlimited: Boolean(tier.isUnlimited)
            }
          });
        } else {
          await prisma.crowdfundingTier.create({
            data: {
              crowdfundingId: Number(id),
              name: tier.name,
              description: tier.description || null,
              price: Number(tier.price) || 0,
              stock: Number(tier.stock) || 0,
              sortOrder: Number(tier.sortOrder) || 0,
              deliveryDate: tier.deliveryDate ? new Date(tier.deliveryDate) : null,
              perks: tier.perks ? JSON.stringify(tier.perks) : '[]',
              isUnlimited: Boolean(tier.isUnlimited)
            }
          });
        }
      }
    }

    return { crowdfunding: formatCrowdfunding(updated), message: '更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const crowdfunding = await prisma.crowdfunding.findUnique({ where: { id: Number(id) } });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = crowdfunding.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权删除此众筹项目' });
    }

    const hasPaidOrders = await prisma.crowdfundingOrder.count({
      where: {
        crowdfundingId: Number(id),
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] }
      }
    });

    if (hasPaidOrders > 0 && !isAdmin) {
      return reply.code(400).send({ error: '存在已支付订单，无法删除' });
    }

    await prisma.crowdfundingOrder.deleteMany({ where: { crowdfundingId: Number(id) } });
    await prisma.crowdfundingTier.deleteMany({ where: { crowdfundingId: Number(id) } });
    await prisma.crowdfunding.delete({ where: { id: Number(id) } });

    return { message: '删除成功' };
  });

  fastify.post('/:id/publish', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const crowdfunding = await prisma.crowdfunding.findUnique({ where: { id: Number(id) } });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    if (crowdfunding.status === 'PUBLISHED') {
      return reply.code(400).send({ error: '众筹项目已发布' });
    }

    const updated = await prisma.crowdfunding.update({
      where: { id: Number(id) },
      data: {
        status: 'PUBLISHED',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    if (crowdfunding.status === 'PENDING_REVIEW') {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: crowdfunding.creatorId,
          title: '🎉 众筹项目已审核通过',
          content: `恭喜！您的众筹项目《${crowdfunding.title}》已通过审核并成功发布！\n\n目标金额：¥${crowdfunding.targetAmount}\n\n现在支持者可以浏览并支持您的项目了，请及时关注众筹进度。`,
          type: 'CROWDFUNDING'
        }
      });
    }

    return { crowdfunding: formatCrowdfunding(updated), message: '众筹项目发布成功' };
  });

  fastify.post('/:id/reject', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const { reason } = request.body;
    const crowdfunding = await prisma.crowdfunding.findUnique({ where: { id: Number(id) } });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    if (crowdfunding.status !== 'PENDING_REVIEW') {
      return reply.code(400).send({ error: '当前状态不可驳回' });
    }

    const updated = await prisma.crowdfunding.update({
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
        receiverId: crowdfunding.creatorId,
        title: '众筹项目未通过审核',
        content: `很遗憾，您的众筹项目《${crowdfunding.title}》未通过审核。\n\n${reason ? '原因：' + reason + '\n\n' : ''}您可以根据审核意见修改后重新提交，如有疑问可联系管理员。`,
        type: 'CROWDFUNDING'
      }
    });

    return { crowdfunding: formatCrowdfunding(updated), message: '已驳回' };
  });

  fastify.post('/:id/unpublish', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const { id } = request.params;
    const crowdfunding = await prisma.crowdfunding.findUnique({ where: { id: Number(id) } });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    if (crowdfunding.status !== 'PUBLISHED') {
      return reply.code(400).send({ error: '众筹项目当前不是发布状态' });
    }

    const updated = await prisma.crowdfunding.update({
      where: { id: Number(id) },
      data: { status: 'ENDED' }
    });

    return { crowdfunding: formatCrowdfunding(updated), message: '众筹项目已结束' };
  });

  fastify.post('/:id/resubmit', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const crowdfunding = await prisma.crowdfunding.findUnique({ where: { id: Number(id) } });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    if (crowdfunding.creatorId !== request.user.id) {
      return reply.code(403).send({ error: '无权操作此众筹项目' });
    }

    if (!['DRAFT', 'REJECTED'].includes(crowdfunding.status)) {
      return reply.code(400).send({ error: '当前状态不可重新提交' });
    }

    const updated = await prisma.crowdfunding.update({
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
        title: '众筹项目已重新提交',
        content: `您的众筹项目《${crowdfunding.title}》已重新提交审核，等待管理员处理。\n\n审核结果将通过站内消息通知您。`,
        type: 'CROWDFUNDING'
      }
    });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: admin.id,
          title: '众筹项目重新提交审核',
          content: `用户重新提交了众筹项目《${crowdfunding.title}》，请及时审核。`,
          type: 'CROWDFUNDING'
        }
      });
    }

    return { crowdfunding: formatCrowdfunding(updated), message: '已重新提交审核' };
  });
}

module.exports = routes;
