async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.addHook('onRequest', fastify.adminOnly);

  fastify.get('/stats', async () => {
    const [
      totalListings,
      publishedListings,
      draftListings,
      pendingReviewListings,
      rejectedListings,
      closedListings,
      completedListings,
      totalMatches,
      pendingMatches,
      confirmedMatches,
      completedMatches,
      rejectedMatches,
      cancelledMatches
    ] = await Promise.all([
      prisma.swapListing.count(),
      prisma.swapListing.count({ where: { status: 'PUBLISHED' } }),
      prisma.swapListing.count({ where: { status: 'DRAFT' } }),
      prisma.swapListing.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.swapListing.count({ where: { status: 'REJECTED' } }),
      prisma.swapListing.count({ where: { status: 'CLOSED' } }),
      prisma.swapListing.count({ where: { status: 'COMPLETED' } }),
      prisma.swapMatch.count(),
      prisma.swapMatch.count({ where: { status: 'PENDING' } }),
      prisma.swapMatch.count({ where: { status: 'CONFIRMED' } }),
      prisma.swapMatch.count({ where: { status: 'COMPLETED' } }),
      prisma.swapMatch.count({ where: { status: 'REJECTED' } }),
      prisma.swapMatch.count({ where: { status: 'CANCELLED' } })
    ]);

    return {
      stats: {
        totalListings,
        publishedListings,
        draftListings,
        pendingReviewListings,
        rejectedListings,
        closedListings,
        completedListings,
        totalMatches,
        pendingMatches,
        confirmedMatches,
        completedMatches,
        rejectedMatches,
        cancelledMatches,
        listingApprovalRate: (pendingReviewListings + publishedListings + rejectedListings) > 0 ?
          Math.round((publishedListings / (pendingReviewListings + publishedListings + rejectedListings)) * 100) : 0,
        matchSuccessRate: totalMatches > 0 ?
          Math.round((completedMatches / totalMatches) * 100) : 0
      }
    };
  });

  fastify.get('/overview', async (request) => {
    const { startDate, endDate, category, status, exchangeType } = request.query;
    const where = {};

    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    if (category && category !== 'all') where.category = category;
    if (status && status !== 'all') where.status = status;
    if (exchangeType && exchangeType !== 'all') where.exchangeType = exchangeType;

    const listings = await prisma.swapListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, username: true } },
        reviewer: { select: { id: true, username: true } },
        _count: { select: { matchesAsA: true, matchesAsB: true } }
      }
    });

    const listingStats = listings.map(l => ({
      id: l.id,
      title: l.title,
      category: l.category,
      exchangeType: l.exchangeType,
      status: l.status,
      haveZineTitle: l.haveZineTitle,
      wantZineTitle: l.wantZineTitle,
      viewCount: l.viewCount,
      matchCount: l._count.matchesAsA + l._count.matchesAsB,
      creator: l.creator,
      reviewer: l.reviewer,
      reviewedAt: l.reviewedAt,
      rejectionReason: l.rejectionReason,
      createdAt: l.createdAt
    }));

    const categoryStats = {};
    listings.forEach(l => {
      if (!categoryStats[l.category]) {
        categoryStats[l.category] = {
          count: 0,
          totalMatches: 0,
          totalViews: 0
        };
      }
      categoryStats[l.category].count++;
      categoryStats[l.category].totalMatches += l._count.matchesAsA + l._count.matchesAsB;
      categoryStats[l.category].totalViews += l.viewCount;
    });

    const statusStats = {};
    listings.forEach(l => {
      if (!statusStats[l.status]) {
        statusStats[l.status] = 0;
      }
      statusStats[l.status]++;
    });

    return {
      listings: listingStats,
      categoryStats,
      statusStats,
      summary: {
        totalListings: listings.length,
        totalMatches: listingStats.reduce((s, l) => s + l.matchCount, 0),
        totalViews: listings.reduce((s, l) => s + l.viewCount, 0)
      }
    };
  });

  fastify.get('/matches', async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (status && status !== 'all') where.status = status;

    const [matches, total] = await Promise.all([
      prisma.swapMatch.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          listingA: { select: { id: true, title: true } },
          listingB: { select: { id: true, title: true } },
          initiator: { select: { id: true, username: true, avatar: true } },
          responder: { select: { id: true, username: true, avatar: true } },
          _count: { select: { messages: true } }
        }
      }),
      prisma.swapMatch.count({ where })
    ]);

    return { matches, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/listings/:id/publish', async (request, reply) => {
    const { id } = request.params;
    const listing = await prisma.swapListing.findUnique({ where: { id: Number(id) } });

    if (!listing) {
      return reply.code(404).send({ error: '交换需求不存在' });
    }

    if (listing.status === 'PUBLISHED') {
      return reply.code(400).send({ error: '交换需求已发布' });
    }

    const updated = await prisma.swapListing.update({
      where: { id: Number(id) },
      data: {
        status: 'PUBLISHED',
        reviewerId: request.user.id,
        reviewedAt: new Date()
      }
    });

    if (listing.status === 'PENDING_REVIEW') {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: listing.creatorId,
          title: '🎉 交换需求已审核通过',
          content: `恭喜！您的交换需求《${listing.title}》已通过审核并成功发布！\n\n其他创作者现在可以浏览并与您发起匹配了。`,
          type: 'SWAP'
        }
      });
    }

    return { listing: updated, message: '交换需求发布成功' };
  });

  fastify.post('/listings/:id/reject', async (request, reply) => {
    const { id } = request.params;
    const { reason } = request.body;
    const listing = await prisma.swapListing.findUnique({ where: { id: Number(id) } });

    if (!listing) {
      return reply.code(404).send({ error: '交换需求不存在' });
    }

    if (listing.status !== 'PENDING_REVIEW') {
      return reply.code(400).send({ error: '当前状态不可驳回' });
    }

    const updated = await prisma.swapListing.update({
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
        receiverId: listing.creatorId,
        title: '交换需求未通过审核',
        content: `很遗憾，您的交换需求《${listing.title}》未通过审核。\n\n${reason ? '原因：' + reason + '\n\n' : ''}您可以根据审核意见修改后重新提交，如有疑问可联系管理员。`,
        type: 'SWAP'
      }
    });

    return { listing: updated, message: '已驳回' };
  });

  fastify.post('/listings/:id/unpublish', async (request, reply) => {
    const { id } = request.params;
    const listing = await prisma.swapListing.findUnique({ where: { id: Number(id) } });

    if (!listing) {
      return reply.code(404).send({ error: '交换需求不存在' });
    }

    if (listing.status !== 'PUBLISHED') {
      return reply.code(400).send({ error: '交换需求当前不是发布状态' });
    }

    const updated = await prisma.swapListing.update({
      where: { id: Number(id) },
      data: { status: 'CLOSED' }
    });

    return { listing: updated, message: '交换需求已下架' };
  });

  fastify.put('/listings/:id', async (request, reply) => {
    const { id } = request.params;
    const listing = await prisma.swapListing.findUnique({ where: { id: Number(id) } });

    if (!listing) {
      return reply.code(404).send({ error: '交换需求不存在' });
    }

    const data = request.body;
    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
    if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);
    if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;

    const updated = await prisma.swapListing.update({
      where: { id: Number(id) },
      data: updateData
    });

    return { listing: updated, message: '更新成功' };
  });

  fastify.delete('/listings/:id', async (request, reply) => {
    const { id } = request.params;
    const listing = await prisma.swapListing.findUnique({ where: { id: Number(id) } });

    if (!listing) {
      return reply.code(404).send({ error: '交换需求不存在' });
    }

    await prisma.swapMatch.deleteMany({
      where: { OR: [{ listingAId: Number(id) }, { listingBId: Number(id) }] }
    });
    await prisma.swapListing.delete({ where: { id: Number(id) } });

    return { message: '删除成功' };
  });

  fastify.delete('/matches/:id', async (request, reply) => {
    const { id } = request.params;
    const match = await prisma.swapMatch.findUnique({ where: { id: Number(id) } });

    if (!match) {
      return reply.code(404).send({ error: '匹配不存在' });
    }

    await prisma.swapMessage.deleteMany({ where: { matchId: Number(id) } });
    await prisma.swapMatch.delete({ where: { id: Number(id) } });

    return { message: '删除成功' };
  });

  fastify.get('/listings/:id/report', async (request, reply) => {
    const listingId = Number(request.params.id);
    const listing = await prisma.swapListing.findUnique({
      where: { id: listingId },
      include: {
        creator: { select: { id: true, username: true, email: true } }
      }
    });

    if (!listing) {
      return reply.code(404).send({ error: '交换需求不存在' });
    }

    const matches = await prisma.swapMatch.findMany({
      where: { OR: [{ listingAId: listingId }, { listingBId: listingId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        initiator: { select: { id: true, username: true, avatar: true } },
        responder: { select: { id: true, username: true, avatar: true } },
        _count: { select: { messages: true } }
      }
    });

    const statusCounts = {
      PENDING: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      REJECTED: 0,
      CANCELLED: 0
    };
    matches.forEach(m => {
      statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
    });

    return {
      listing,
      matches,
      statusCounts,
      summary: {
        totalMatches: matches.length,
        pendingCount: statusCounts.PENDING,
        confirmedCount: statusCounts.CONFIRMED,
        completedCount: statusCounts.COMPLETED,
        rejectedCount: statusCounts.REJECTED,
        cancelledCount: statusCounts.CANCELLED,
        successRate: matches.length > 0 ?
          Math.round((statusCounts.COMPLETED / matches.length) * 100) : 0
      }
    };
  });
}

module.exports = routes;
