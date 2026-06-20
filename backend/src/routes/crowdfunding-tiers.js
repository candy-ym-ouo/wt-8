function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

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

  fastify.get('/crowdfunding/:crowdfundingId/tiers', async (request, reply) => {
    const { crowdfundingId } = request.params;

    const crowdfunding = await prisma.crowdfunding.findUnique({
      where: { id: Number(crowdfundingId) }
    });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    const tiers = await prisma.crowdfundingTier.findMany({
      where: { crowdfundingId: Number(crowdfundingId) },
      orderBy: { sortOrder: 'asc' }
    });

    return { tiers: tiers.map(formatTier) };
  });

  fastify.post('/crowdfunding/:crowdfundingId/tiers', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { crowdfundingId } = request.params;
    const { name, description, price, stock, sortOrder, deliveryDate, perks, isUnlimited } = request.body;

    const crowdfunding = await prisma.crowdfunding.findUnique({
      where: { id: Number(crowdfundingId) }
    });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = crowdfunding.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权操作此众筹项目' });
    }

    if (!name || price === undefined) {
      return reply.code(400).send({ error: '请填写档位名称和价格' });
    }

    const tier = await prisma.crowdfundingTier.create({
      data: {
        crowdfundingId: Number(crowdfundingId),
        name,
        description: description || null,
        price: Number(price),
        stock: Number(stock) || 0,
        sortOrder: Number(sortOrder) || 0,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        perks: perks ? JSON.stringify(perks) : '[]',
        isUnlimited: Boolean(isUnlimited)
      }
    });

    return { tier: formatTier(tier), message: '档位创建成功' };
  });

  fastify.put('/tiers/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;

    const tier = await prisma.crowdfundingTier.findUnique({
      where: { id: Number(id) },
      include: { crowdfunding: true }
    });

    if (!tier) {
      return reply.code(404).send({ error: '档位不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = tier.crowdfunding.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权操作此档位' });
    }

    const data = request.body;
    const updateData = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.stock !== undefined) updateData.stock = Number(data.stock);
    if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);
    if (data.deliveryDate !== undefined) {
      updateData.deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : null;
    }
    if (data.perks !== undefined) updateData.perks = JSON.stringify(data.perks);
    if (data.isUnlimited !== undefined) updateData.isUnlimited = Boolean(data.isUnlimited);

    const updated = await prisma.crowdfundingTier.update({
      where: { id: Number(id) },
      data: updateData
    });

    return { tier: formatTier(updated), message: '更新成功' };
  });

  fastify.delete('/tiers/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;

    const tier = await prisma.crowdfundingTier.findUnique({
      where: { id: Number(id) },
      include: { crowdfunding: true }
    });

    if (!tier) {
      return reply.code(404).send({ error: '档位不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = tier.crowdfunding.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权操作此档位' });
    }

    const hasOrders = await prisma.crowdfundingOrder.count({
      where: {
        tierId: Number(id),
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] }
      }
    });

    if (hasOrders > 0) {
      return reply.code(400).send({ error: '该档位已有支付订单，无法删除' });
    }

    await prisma.crowdfundingTier.delete({ where: { id: Number(id) } });

    return { message: '删除成功' };
  });

  fastify.post('/tiers/batch', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { crowdfundingId, tiers } = request.body;

    const crowdfunding = await prisma.crowdfunding.findUnique({
      where: { id: Number(crowdfundingId) }
    });

    if (!crowdfunding) {
      return reply.code(404).send({ error: '众筹项目不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = crowdfunding.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权操作此众筹项目' });
    }

    if (!Array.isArray(tiers) || tiers.length === 0) {
      return reply.code(400).send({ error: '请提供档位数据' });
    }

    const createdTiers = [];
    for (const tierData of tiers) {
      const tier = await prisma.crowdfundingTier.create({
        data: {
          crowdfundingId: Number(crowdfundingId),
          name: tierData.name,
          description: tierData.description || null,
          price: Number(tierData.price) || 0,
          stock: Number(tierData.stock) || 0,
          sortOrder: Number(tierData.sortOrder) || 0,
          deliveryDate: tierData.deliveryDate ? new Date(tierData.deliveryDate) : null,
          perks: tierData.perks ? JSON.stringify(tierData.perks) : '[]',
          isUnlimited: Boolean(tierData.isUnlimited)
        }
      });
      createdTiers.push(formatTier(tier));
    }

    return { tiers: createdTiers, message: '批量创建成功' };
  });
}

module.exports = routes;
