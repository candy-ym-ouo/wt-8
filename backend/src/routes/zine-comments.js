async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/:zineId/comments', async (request, reply) => {
    const { zineId } = request.params;
    const { page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;

    const zine = await prisma.zine.findUnique({
      where: { id: Number(zineId) }
    });
    if (!zine) {
      return reply.code(404).send({ error: '刊物不存在' });
    }

    let user = null;
    try {
      const decoded = await request.jwtVerify();
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      }
    } catch (e) {}

    const where = {
      zineId: Number(zineId),
      parentId: null
    };
    if (!user || user.role !== 'ADMIN') {
      where.status = 'APPROVED';
    }

    const [comments, total] = await Promise.all([
      prisma.zineComment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          replies: {
            where: user && user.role === 'ADMIN' ? {} : { status: 'APPROVED' },
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { id: true, username: true, avatar: true } },
              replyToUser: { select: { id: true, username: true, avatar: true } },
              likes: user ? { where: { userId: user?.id }, select: { id: true } } : false,
              _count: { select: { likes: true } }
            }
          },
          likes: user ? { where: { userId: user?.id }, select: { id: true } } : false,
          _count: { select: { likes: true, replies: true } }
        }
      }),
      prisma.zineComment.count({ where })
    ]);

    const formatComment = (c) => ({
      ...c,
      isLiked: c.likes ? c.likes.length > 0 : false,
      likeCount: c._count ? c._count.likes : c.likeCount,
      replyCount: c._count ? c._count.replies : (c.replies ? c.replies.length : 0)
    });

    const formattedComments = comments.map(c => ({
      ...formatComment(c),
      replies: c.replies ? c.replies.map(formatComment) : []
    }));

    return {
      comments: formattedComments,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.post('/:zineId/comments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { zineId } = request.params;
    const { content, parentId, replyToUserId } = request.body;

    if (!content || !content.trim()) {
      return reply.code(400).send({ error: '评论内容不能为空' });
    }
    if (content.length > 2000) {
      return reply.code(400).send({ error: '评论内容不能超过2000字' });
    }

    const zine = await prisma.zine.findUnique({
      where: { id: Number(zineId) }
    });
    if (!zine) {
      return reply.code(404).send({ error: '刊物不存在' });
    }
    if (zine.status !== 'PUBLISHED') {
      return reply.code(400).send({ error: '该刊物当前不可评论' });
    }

    if (parentId) {
      const parentComment = await prisma.zineComment.findUnique({
        where: { id: Number(parentId) }
      });
      if (!parentComment || parentComment.zineId !== Number(zineId)) {
        return reply.code(400).send({ error: '回复的评论不存在' });
      }
      if (parentComment.parentId) {
        return reply.code(400).send({ error: '不支持三级回复' });
      }
    }

    const comment = await prisma.zineComment.create({
      data: {
        zineId: Number(zineId),
        userId: request.user.id,
        content: content.trim(),
        parentId: parentId ? Number(parentId) : null,
        replyToUserId: replyToUserId ? Number(replyToUserId) : null
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        replyToUser: { select: { id: true, username: true, avatar: true } },
        likes: { where: { userId: request.user.id }, select: { id: true } },
        _count: { select: { likes: true, replies: true } }
      }
    });

    await prisma.zine.update({
      where: { id: Number(zineId) },
      data: { commentCount: { increment: 1 } }
    });

    if (parentId) {
      const parentComment = await prisma.zineComment.findUnique({
        where: { id: Number(parentId) }
      });
      if (parentComment && parentComment.userId !== request.user.id) {
        const user = await prisma.user.findUnique({ where: { id: request.user.id } });
        await prisma.message.create({
          data: {
            senderId: request.user.id,
            receiverId: parentComment.userId,
            title: '💬 您的评论收到了回复',
            content: `${user.username} 回复了您在刊物《${zine.title}》中的评论：\n\n${content.trim().substring(0, 100)}${content.trim().length > 100 ? '...' : ''}`,
            type: 'ZINE'
          }
        });
      }
    } else if (zine.authorId !== request.user.id) {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: zine.authorId,
          title: '💬 刊物收到新评论',
          content: `${user.username} 评论了您的刊物《${zine.title}》：\n\n${content.trim().substring(0, 100)}${content.trim().length > 100 ? '...' : ''}`,
          type: 'ZINE'
        }
      });
    }

    if (replyToUserId && Number(replyToUserId) !== request.user.id) {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: Number(replyToUserId),
          title: '💬 评论中有人回复了您',
          content: `${user.username} 在刊物《${zine.title}》的评论中回复了您：\n\n${content.trim().substring(0, 100)}${content.trim().length > 100 ? '...' : ''}`,
          type: 'ZINE'
        }
      });
    }

    return {
      comment: {
        ...comment,
        isLiked: comment.likes.length > 0,
        likeCount: comment._count.likes,
        replyCount: comment._count.replies
      },
      message: '评论成功'
    };
  });

  fastify.delete('/:zineId/comments/:commentId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { commentId, zineId } = request.params;
    const comment = await prisma.zineComment.findUnique({
      where: { id: Number(commentId) }
    });

    if (!comment) {
      return reply.code(404).send({ error: '评论不存在' });
    }
    if (comment.zineId !== Number(zineId)) {
      return reply.code(400).send({ error: '评论不属于该刊物' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isOwner = comment.userId === request.user.id;
    const isAdmin = user.role === 'ADMIN';
    const isZineAuthor = await prisma.zine.findFirst({
      where: { id: Number(zineId), authorId: request.user.id }
    });

    if (!isOwner && !isAdmin && !isZineAuthor) {
      return reply.code(403).send({ error: '无权删除此评论' });
    }

    const replyCount = await prisma.zineComment.count({
      where: { parentId: Number(commentId) }
    });

    await prisma.zineCommentLike.deleteMany({
      where: { commentId: Number(commentId) }
    });
    if (replyCount > 0) {
      const replyIds = await prisma.zineComment.findMany({
        where: { parentId: Number(commentId) },
        select: { id: true }
      });
      for (const r of replyIds) {
        await prisma.zineCommentLike.deleteMany({ where: { commentId: r.id } });
      }
      await prisma.zineComment.deleteMany({
        where: { parentId: Number(commentId) }
      });
    }
    await prisma.zineComment.delete({
      where: { id: Number(commentId) }
    });

    await prisma.zine.update({
      where: { id: Number(zineId) },
      data: { commentCount: { decrement: 1 + replyCount } }
    });

    return { message: '评论已删除' };
  });

  fastify.post('/:zineId/comments/:commentId/like', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { commentId, zineId } = request.params;
    const comment = await prisma.zineComment.findUnique({
      where: { id: Number(commentId) }
    });

    if (!comment || comment.zineId !== Number(zineId)) {
      return reply.code(404).send({ error: '评论不存在' });
    }

    const existing = await prisma.zineCommentLike.findUnique({
      where: {
        commentId_userId: {
          commentId: Number(commentId),
          userId: request.user.id
        }
      }
    });

    if (existing) {
      await prisma.zineCommentLike.delete({ where: { id: existing.id } });
      await prisma.zineComment.update({
        where: { id: Number(commentId) },
        data: { likeCount: { decrement: 1 } }
      });
      return { liked: false, message: '已取消点赞' };
    } else {
      await prisma.zineCommentLike.create({
        data: {
          commentId: Number(commentId),
          userId: request.user.id
        }
      });
      await prisma.zineComment.update({
        where: { id: Number(commentId) },
        data: { likeCount: { increment: 1 } }
      });
      return { liked: true, message: '已点赞' };
    }
  });

  fastify.put('/:zineId/comments/:commentId/pin', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { commentId, zineId } = request.params;
    const comment = await prisma.zineComment.findUnique({
      where: { id: Number(commentId) }
    });

    if (!comment || comment.zineId !== Number(zineId)) {
      return reply.code(404).send({ error: '评论不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const isZineAuthor = await prisma.zine.findFirst({
      where: { id: Number(zineId), authorId: request.user.id }
    });

    if (user.role !== 'ADMIN' && !isZineAuthor) {
      return reply.code(403).send({ error: '无权置顶评论' });
    }

    const updated = await prisma.zineComment.update({
      where: { id: Number(commentId) },
      data: { isPinned: !comment.isPinned }
    });

    return {
      comment: updated,
      message: updated.isPinned ? '已置顶' : '已取消置顶'
    };
  });
}

module.exports = routes;
