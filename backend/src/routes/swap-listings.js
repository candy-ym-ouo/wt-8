function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const formatListing = (l) => {
  if (!l) return l;
  return {
    ...l,
    haveTags: parseJSONField(l.haveTags, []),
    wantTags: parseJSONField(l.wantTags, [])
  };
};

const calculateMatchScore = (listingA, listingB) => {
  let score = 0;
  const haveTagsA = parseJSONField(listingA.haveTags, []);
  const wantTagsA = parseJSONField(listingA.wantTags, []);
  const haveTagsB = parseJSONField(listingB.haveTags, []);
  const wantTagsB = parseJSONField(listingB.wantTags, []);

  haveTagsA.forEach(tag => {
    if (wantTagsB.includes(tag)) score += 20;
  });
  haveTagsB.forEach(tag => {
    if (wantTagsA.includes(tag)) score += 20;
  });

  if (listingA.wantZineCategory && listingB.haveZineCategory === listingA.wantZineCategory) score += 15;
  if (listingB.wantZineCategory && listingA.haveZineCategory === listingB.wantZineCategory) score += 15;

  if (listingA.wantZineTitle && listingB.haveZineTitle &&
      listingB.haveZineTitle.toLowerCase().includes(listingA.wantZineTitle.toLowerCase())) score += 30;
  if (listingB.wantZineTitle && listingA.haveZineTitle &&
      listingA.haveZineTitle.toLowerCase().includes(listingB.wantZineTitle.toLowerCase())) score += 30;

  if (listingA.location && listingB.location && listingA.location === listingB.location) score += 10;

  return Math.min(score, 100);
};

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', async (request) => {
    const { status, category, exchangeType, page = 1, limit = 20, keyword, haveCondition } = request.query;
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
    if (exchangeType && exchangeType !== 'all') where.exchangeType = exchangeType;
    if (haveCondition && haveCondition !== 'all') where.haveZineCondition = haveCondition;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
        { haveZineTitle: { contains: keyword } },
        { wantZineTitle: { contains: keyword } },
        { haveZineAuthor: { contains: keyword } },
        { wantZineAuthor: { contains: keyword } }
      ];
    }

    const [listingsData, total] = await Promise.all([
      prisma.swapListing.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          haveZine: { select: { id: true, title: true, coverImage: true } },
          wantZine: { select: { id: true, title: true, coverImage: true } }
        }
      }),
      prisma.swapListing.count({ where })
    ]);

    const listings = listingsData.map(l => formatListing(l));

    return { listings, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/featured', async () => {
    const listingsData = await prisma.swapListing.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      take: 6,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        creator: { select: { id: true, username: true, avatar: true } },
        haveZine: { select: { id: true, title: true, coverImage: true } },
        wantZine: { select: { id: true, title: true, coverImage: true } }
      }
    });

    return { listings: listingsData.map(l => formatListing(l)) };
  });

  fastify.get('/mine', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = { creatorId: request.user.id };

    if (status && status !== 'all') where.status = status;

    const [listingsData, total] = await Promise.all([
      prisma.swapListing.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: { id: true, username: true } },
          _count: { select: { matchesAsA: true, matchesAsB: true } }
        }
      }),
      prisma.swapListing.count({ where })
    ]);

    const listings = listingsData.map(l => ({
      ...formatListing(l),
      matchCount: l._count.matchesAsA + l._count.matchesAsB
    }));

    return { listings, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', async (request, reply) => {
    const listingData = await prisma.swapListing.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        creator: { select: { id: true, username: true, avatar: true, bio: true } },
        reviewer: { select: { id: true, username: true } },
        haveZine: true,
        wantZine: true,
        _count: { select: { matchesAsA: true, matchesAsB: true } }
      }
    });

    if (!listingData) {
      return reply.code(404).send({ error: '交换需求不存在' });
    }

    const listing = {
      ...formatListing(listingData),
      matchCount: listingData._count.matchesAsA + listingData._count.matchesAsB
    };

    let user = null;
    try {
      const decoded = await request.jwtVerify();
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      }
    } catch (e) {}

    const isOwner = user && listing.creatorId === user.id;
    const isAdmin = user && user.role === 'ADMIN';

    if (!['PUBLISHED', 'CLOSED', 'COMPLETED'].includes(listing.status) && !isOwner && !isAdmin) {
      return reply.code(403).send({ error: '无权查看此交换需求' });
    }

    if (user && listing.status === 'PUBLISHED' && !isOwner && !isAdmin) {
      await prisma.swapListing.update({
        where: { id: listing.id },
        data: { viewCount: { increment: 1 } }
      });
      listing.viewCount += 1;
    }

    let userMatch = null;
    if (user && !isOwner) {
      userMatch = await prisma.swapMatch.findFirst({
        where: {
          OR: [
            { listingAId: listing.id, initiatorId: user.id },
            { listingBId: listing.id, initiatorId: user.id },
            { listingAId: listing.id, responderId: user.id },
            { listingBId: listing.id, responderId: user.id }
          ]
        }
      });
    }

    return { listing, userMatch, isOwner, isAdmin };
  });

  fastify.get('/:id/matches', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const listingId = Number(request.params.id);
    const listing = await prisma.swapListing.findUnique({ where: { id: listingId } });

    if (!listing) {
      return reply.code(404).send({ error: '交换需求不存在' });
    }

    if (listing.creatorId !== request.user.id) {
      return reply.code(403).send({ error: '无权查看匹配' });
    }

    const otherListings = await prisma.swapListing.findMany({
      where: {
        id: { not: listingId },
        status: 'PUBLISHED',
        creatorId: { not: listing.creatorId }
      },
      include: {
        creator: { select: { id: true, username: true, avatar: true } }
      }
    });

    const matches = otherListings
      .map(other => ({
        listing: formatListing(other),
        score: calculateMatchScore(listing, other)
      }))
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return { matches };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const {
      title, description, coverImage,
      haveZineId, haveZineTitle, haveZineAuthor, haveZineCategory, haveZineCondition,
      wantZineId, wantZineTitle, wantZineAuthor, wantZineCategory,
      haveTags, wantTags, category, exchangeType, location, shippingMethod
    } = request.body;

    if (!title || !description) {
      return reply.code(400).send({ error: '请填写所有必填项' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const initialStatus = isAdmin ? 'DRAFT' : 'PENDING_REVIEW';

    const listing = await prisma.swapListing.create({
      data: {
        title,
        description,
        coverImage: coverImage || null,
        haveZineId: haveZineId || null,
        haveZineTitle: haveZineTitle || null,
        haveZineAuthor: haveZineAuthor || null,
        haveZineCategory: haveZineCategory || null,
        haveZineCondition: haveZineCondition || 'GOOD',
        wantZineId: wantZineId || null,
        wantZineTitle: wantZineTitle || null,
        wantZineAuthor: wantZineAuthor || null,
        wantZineCategory: wantZineCategory || null,
        haveTags: haveTags ? JSON.stringify(haveTags) : '[]',
        wantTags: wantTags ? JSON.stringify(wantTags) : '[]',
        category: category || 'ZINE',
        exchangeType: exchangeType || 'SWAP',
        location: location || null,
        shippingMethod: shippingMethod || null,
        status: initialStatus,
        creatorId: request.user.id
      }
    });

    if (!isAdmin) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: request.user.id,
          title: '交换需求已提交审核',
          content: `您的交换需求《${listing.title}》已成功提交，等待管理员审核。\n\n审核通过后将自动发布，审核结果将通过站内消息通知您。`,
          type: 'SWAP'
        }
      });

      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await prisma.message.create({
          data: {
            senderId: request.user.id,
            receiverId: admin.id,
            title: '新的交换需求待审核',
            content: `用户 ${user.username}（ID: ${request.user.id}）提交了新的交换需求《${listing.title}》，请及时审核。`,
            type: 'SWAP'
          }
        });
      }
    }

    return {
      listing: formatListing(listing),
      message: isAdmin ? '交换需求创建成功' : '交换需求已提交，等待审核'
    };
  });

  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const listing = await prisma.swapListing.findUnique({ where: { id: Number(id) } });

    if (!listing) {
      return reply.code(404).send({ error: '交换需求不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = listing.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权编辑此交换需求' });
    }

    const data = request.body;
    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.haveZineId !== undefined) updateData.haveZineId = data.haveZineId;
    if (data.haveZineTitle !== undefined) updateData.haveZineTitle = data.haveZineTitle;
    if (data.haveZineAuthor !== undefined) updateData.haveZineAuthor = data.haveZineAuthor;
    if (data.haveZineCategory !== undefined) updateData.haveZineCategory = data.haveZineCategory;
    if (data.haveZineCondition !== undefined) updateData.haveZineCondition = data.haveZineCondition;
    if (data.wantZineId !== undefined) updateData.wantZineId = data.wantZineId;
    if (data.wantZineTitle !== undefined) updateData.wantZineTitle = data.wantZineTitle;
    if (data.wantZineAuthor !== undefined) updateData.wantZineAuthor = data.wantZineAuthor;
    if (data.wantZineCategory !== undefined) updateData.wantZineCategory = data.wantZineCategory;
    if (data.haveTags !== undefined) updateData.haveTags = JSON.stringify(data.haveTags);
    if (data.wantTags !== undefined) updateData.wantTags = JSON.stringify(data.wantTags);
    if (data.category !== undefined) updateData.category = data.category;
    if (data.exchangeType !== undefined) updateData.exchangeType = data.exchangeType;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.shippingMethod !== undefined) updateData.shippingMethod = data.shippingMethod;

    if (isAdmin) {
      if (data.status !== undefined) updateData.status = data.status;
      if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
      if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);
    }

    if (isOwner && !isAdmin && ['PUBLISHED', 'PENDING_REVIEW', 'REJECTED'].includes(listing.status)) {
      if (['PUBLISHED', 'PENDING_REVIEW'].includes(listing.status)) {
        updateData.status = 'PENDING_REVIEW';
      }
    }

    const updated = await prisma.swapListing.update({
      where: { id: Number(id) },
      data: updateData
    });

    return { listing: formatListing(updated), message: '更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const listing = await prisma.swapListing.findUnique({ where: { id: Number(id) } });

    if (!listing) {
      return reply.code(404).send({ error: '交换需求不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = listing.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权删除此交换需求' });
    }

    await prisma.swapMatch.deleteMany({
      where: { OR: [{ listingAId: Number(id) }, { listingBId: Number(id) }] }
    });
    await prisma.swapListing.delete({ where: { id: Number(id) } });

    return { message: '删除成功' };
  });

  fastify.post('/:id/resubmit', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const listing = await prisma.swapListing.findUnique({ where: { id: Number(id) } });

    if (!listing) {
      return reply.code(404).send({ error: '交换需求不存在' });
    }

    if (listing.creatorId !== request.user.id) {
      return reply.code(403).send({ error: '无权操作此交换需求' });
    }

    if (!['DRAFT', 'REJECTED'].includes(listing.status)) {
      return reply.code(400).send({ error: '当前状态不可重新提交' });
    }

    const updated = await prisma.swapListing.update({
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
        title: '交换需求已重新提交',
        content: `您的交换需求《${listing.title}》已重新提交审核，等待管理员处理。`,
        type: 'SWAP'
      }
    });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: admin.id,
          title: '交换需求重新提交审核',
          content: `用户重新提交了交换需求《${listing.title}》，请及时审核。`,
          type: 'SWAP'
        }
      });
    }

    return { listing: formatListing(updated), message: '已重新提交审核' };
  });

  fastify.post('/:id/close', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const listing = await prisma.swapListing.findUnique({ where: { id: Number(id) } });

    if (!listing) {
      return reply.code(404).send({ error: '交换需求不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isAdmin = user.role === 'ADMIN';
    const isOwner = listing.creatorId === request.user.id;

    if (!isAdmin && !isOwner) {
      return reply.code(403).send({ error: '无权操作此交换需求' });
    }

    if (!['PUBLISHED'].includes(listing.status)) {
      return reply.code(400).send({ error: '当前状态不可关闭' });
    }

    const updated = await prisma.swapListing.update({
      where: { id: Number(id) },
      data: { status: 'CLOSED' }
    });

    return { listing: formatListing(updated), message: '交换需求已关闭' };
  });
}

module.exports = routes;
module.exports.calculateMatchScore = calculateMatchScore;
