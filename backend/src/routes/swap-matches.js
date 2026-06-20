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

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const userId = request.user.id;

    const where = {
      OR: [{ initiatorId: userId }, { responderId: userId }]
    };
    if (status && status !== 'all') where.status = status;

    const [matches, total, unreadCount] = await Promise.all([
      prisma.swapMatch.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          listingA: {
            include: {
              creator: { select: { id: true, username: true, avatar: true } }
            }
          },
          listingB: {
            include: {
              creator: { select: { id: true, username: true, avatar: true } }
            }
          },
          initiator: { select: { id: true, username: true, avatar: true } },
          responder: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.swapMatch.count({ where }),
      prisma.swapMessage.count({
        where: {
          match: {
            OR: [{ initiatorId: userId }, { responderId: userId }]
          },
          senderId: { not: userId },
          isRead: false
        }
      })
    ]);

    const formattedMatches = matches.map(m => ({
      ...m,
      listingA: formatListing(m.listingA),
      listingB: formatListing(m.listingB)
    }));

    return { matches: formattedMatches, total, unreadCount, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const matchId = Number(request.params.id);
    const userId = request.user.id;

    const match = await prisma.swapMatch.findUnique({
      where: { id: matchId },
      include: {
        listingA: {
          include: {
            creator: { select: { id: true, username: true, avatar: true } }
          }
        },
        listingB: {
          include: {
            creator: { select: { id: true, username: true, avatar: true } }
          }
        },
        initiator: { select: { id: true, username: true, avatar: true } },
        responder: { select: { id: true, username: true, avatar: true } }
      }
    });

    if (!match) {
      return reply.code(404).send({ error: '匹配不存在' });
    }

    if (match.initiatorId !== userId && match.responderId !== userId) {
      return reply.code(403).send({ error: '无权查看此匹配' });
    }

    const messages = await prisma.swapMessage.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, username: true, avatar: true } }
      }
    });

    await prisma.swapMessage.updateMany({
      where: {
        matchId,
        senderId: { not: userId },
        isRead: false
      },
      data: { isRead: true }
    });

    const isInitiator = match.initiatorId === userId;
    const myListing = isInitiator ? formatListing(match.listingA) : formatListing(match.listingB);
    const otherListing = isInitiator ? formatListing(match.listingB) : formatListing(match.listingA);
    const otherUser = isInitiator ? match.responder : match.initiator;

    return {
      match: {
        ...match,
        listingA: formatListing(match.listingA),
        listingB: formatListing(match.listingB)
      },
      messages,
      myListing,
      otherListing,
      otherUser,
      isInitiator
    };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { listingAId, listingBId } = request.body;
    const initiatorId = request.user.id;

    if (!listingAId || !listingBId) {
      return reply.code(400).send({ error: '请选择交换需求' });
    }

    const [listingA, listingB] = await Promise.all([
      prisma.swapListing.findUnique({ where: { id: Number(listingAId) } }),
      prisma.swapListing.findUnique({ where: { id: Number(listingBId) } })
    ]);

    if (!listingA || !listingB) {
      return reply.code(404).send({ error: '交换需求不存在' });
    }

    if (listingA.creatorId !== initiatorId && listingB.creatorId !== initiatorId) {
      return reply.code(403).send({ error: '您只能发起自己的交换需求匹配' });
    }

    if (listingA.creatorId === listingB.creatorId) {
      return reply.code(400).send({ error: '不能与自己的交换需求匹配' });
    }

    if (listingA.status !== 'PUBLISHED' || listingB.status !== 'PUBLISHED') {
      return reply.code(400).send({ error: '只能匹配已发布的交换需求' });
    }

    const responderId = listingA.creatorId === initiatorId ? listingB.creatorId : listingA.creatorId;

    const { calculateMatchScore } = require('./swap-listings');
    const matchScore = calculateMatchScore(listingA, listingB);

    try {
      const match = await prisma.swapMatch.create({
        data: {
          listingAId: Number(listingAId),
          listingBId: Number(listingBId),
          matchScore,
          initiatorId,
          responderId,
          initiatorConfirmed: true
        }
      });

      await prisma.swapListing.update({
        where: { id: Number(listingAId) },
        data: { matchCount: { increment: 1 } }
      });
      await prisma.swapListing.update({
        where: { id: Number(listingBId) },
        data: { matchCount: { increment: 1 } }
      });

      const initiator = await prisma.user.findUnique({ where: { id: initiatorId } });

      await prisma.message.create({
        data: {
          senderId: initiatorId,
          receiverId: responderId,
          title: '收到新的交换匹配请求',
          content: `用户 ${initiator.username} 向您发起了交换匹配请求！\n\n对方需求：${listingA.title}\n您的需求：${listingB.title}\n\n请前往【交换市集 - 我的匹配】查看详情并回复。`,
          type: 'SWAP'
        }
      });

      return { match, message: '匹配请求已发送' };
    } catch (e) {
      if (e.code === 'P2002') {
        return reply.code(400).send({ error: '已存在匹配请求' });
      }
      throw e;
    }
  });

  fastify.post('/:id/confirm', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const matchId = Number(request.params.id);
    const userId = request.user.id;

    const match = await prisma.swapMatch.findUnique({ where: { id: matchId } });

    if (!match) {
      return reply.code(404).send({ error: '匹配不存在' });
    }

    if (match.initiatorId !== userId && match.responderId !== userId) {
      return reply.code(403).send({ error: '无权操作此匹配' });
    }

    if (match.status !== 'PENDING') {
      return reply.code(400).send({ error: '当前状态不可确认' });
    }

    const updateData = {};
    if (match.initiatorId === userId) {
      updateData.initiatorConfirmed = true;
    } else {
      updateData.responderConfirmed = true;
    }

    const updated = await prisma.swapMatch.update({
      where: { id: matchId },
      data: updateData
    });

    const bothConfirmed = updated.initiatorConfirmed && updated.responderConfirmed;

    let finalMatch = updated;
    if (bothConfirmed) {
      finalMatch = await prisma.swapMatch.update({
        where: { id: matchId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date()
        }
      });

      const otherUserId = match.initiatorId === userId ? match.responderId : match.initiatorId;
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });

      await prisma.message.create({
        data: {
          senderId: userId,
          receiverId: otherUserId,
          title: '🎉 交换匹配成功！',
          content: `${currentUser.username} 已确认交换！双方均已确认匹配成功。\n\n请使用匹配内的私信功能进一步沟通交换细节。`,
          type: 'SWAP'
        }
      });
    }

    return { match: finalMatch, message: bothConfirmed ? '匹配成功！' : '已确认，请等待对方确认' };
  });

  fastify.post('/:id/reject', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const matchId = Number(request.params.id);
    const userId = request.user.id;

    const match = await prisma.swapMatch.findUnique({ where: { id: matchId } });

    if (!match) {
      return reply.code(404).send({ error: '匹配不存在' });
    }

    if (match.responderId !== userId) {
      return reply.code(403).send({ error: '只有被请求方可以拒绝' });
    }

    if (match.status !== 'PENDING') {
      return reply.code(400).send({ error: '当前状态不可拒绝' });
    }

    const updated = await prisma.swapMatch.update({
      where: { id: matchId },
      data: { status: 'REJECTED' }
    });

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.message.create({
      data: {
        senderId: userId,
        receiverId: match.initiatorId,
        title: '交换匹配被拒绝',
        content: `${currentUser.username} 拒绝了您的交换匹配请求。`,
        type: 'SWAP'
      }
    });

    return { match: updated, message: '已拒绝匹配' };
  });

  fastify.post('/:id/complete', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const matchId = Number(request.params.id);
    const userId = request.user.id;

    const match = await prisma.swapMatch.findUnique({ where: { id: matchId } });

    if (!match) {
      return reply.code(404).send({ error: '匹配不存在' });
    }

    if (match.initiatorId !== userId && match.responderId !== userId) {
      return reply.code(403).send({ error: '无权操作此匹配' });
    }

    if (match.status !== 'CONFIRMED') {
      return reply.code(400).send({ error: '只有已确认的匹配可以完成' });
    }

    const updated = await prisma.swapMatch.update({
      where: { id: matchId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    await prisma.swapListing.update({
      where: { id: match.listingAId },
      data: { status: 'COMPLETED' }
    });
    await prisma.swapListing.update({
      where: { id: match.listingBId },
      data: { status: 'COMPLETED' }
    });

    return { match: updated, message: '交换已完成' };
  });

  fastify.post('/:id/cancel', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const matchId = Number(request.params.id);
    const userId = request.user.id;

    const match = await prisma.swapMatch.findUnique({ where: { id: matchId } });

    if (!match) {
      return reply.code(404).send({ error: '匹配不存在' });
    }

    if (match.initiatorId !== userId && match.responderId !== userId) {
      return reply.code(403).send({ error: '无权操作此匹配' });
    }

    if (!['PENDING', 'CONFIRMED'].includes(match.status)) {
      return reply.code(400).send({ error: '当前状态不可取消' });
    }

    const updated = await prisma.swapMatch.update({
      where: { id: matchId },
      data: { status: 'CANCELLED' }
    });

    const otherUserId = match.initiatorId === userId ? match.responderId : match.initiatorId;
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.message.create({
      data: {
        senderId: userId,
        receiverId: otherUserId,
        title: '交换匹配已取消',
        content: `${currentUser.username} 取消了交换匹配。`,
        type: 'SWAP'
      }
    });

    return { match: updated, message: '匹配已取消' };
  });

  fastify.post('/:id/messages', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const matchId = Number(request.params.id);
    const { content, type = 'TEXT' } = request.body;
    const userId = request.user.id;

    if (!content) {
      return reply.code(400).send({ error: '请输入消息内容' });
    }

    const match = await prisma.swapMatch.findUnique({ where: { id: matchId } });

    if (!match) {
      return reply.code(404).send({ error: '匹配不存在' });
    }

    if (match.initiatorId !== userId && match.responderId !== userId) {
      return reply.code(403).send({ error: '无权发送消息' });
    }

    if (match.status === 'REJECTED' || match.status === 'CANCELLED') {
      return reply.code(400).send({ error: '此匹配已关闭，无法发送消息' });
    }

    const message = await prisma.swapMessage.create({
      data: {
        matchId,
        senderId: userId,
        content,
        type
      },
      include: {
        sender: { select: { id: true, username: true, avatar: true } }
      }
    });

    const otherUserId = match.initiatorId === userId ? match.responderId : match.initiatorId;
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.message.create({
      data: {
        senderId: userId,
        receiverId: otherUserId,
        title: `来自 ${currentUser.username} 的交换私信`,
        content: content.length > 100 ? content.substring(0, 100) + '...' : content,
        type: 'SWAP'
      }
    });

    return { message, messageText: '发送成功' };
  });

  fastify.get('/:id/messages/unread-count', { preHandler: [fastify.authenticate] }, async (request) => {
    const matchId = Number(request.params.id);
    const userId = request.user.id;

    const count = await prisma.swapMessage.count({
      where: {
        matchId,
        senderId: { not: userId },
        isRead: false
      }
    });

    return { unreadCount: count };
  });
}

module.exports = routes;
