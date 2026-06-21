async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.addHook('onRequest', fastify.adminOnly);

  fastify.get('/comments', async (request) => {
    const { status, crowdfundingId, page = 1, limit = 20, keyword } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;
    if (crowdfundingId) where.crowdfundingId = Number(crowdfundingId);
    if (keyword) {
      where.content = { contains: keyword };
    }

    const [comments, total] = await Promise.all([
      prisma.crowdfundingComment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          crowdfunding: { select: { id: true, title: true } },
          parent: { select: { id: true, content: true } },
          _count: { select: { likes: true, replies: true } }
        }
      }),
      prisma.crowdfundingComment.count({ where })
    ]);

    return { comments, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.put('/comments/:id/status', async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body;

    const validStatuses = ['APPROVED', 'HIDDEN', 'PENDING'];
    if (!validStatuses.includes(status)) {
      return reply.code(400).send({ error: '无效的状态' });
    }

    const comment = await prisma.crowdfundingComment.findUnique({
      where: { id: Number(id) },
      include: { crowdfunding: true }
    });
    if (!comment) {
      return reply.code(404).send({ error: '评论不存在' });
    }

    const updated = await prisma.crowdfundingComment.update({
      where: { id: Number(id) },
      data: { status }
    });

    if (status === 'HIDDEN' && comment.status === 'APPROVED') {
      await prisma.crowdfunding.update({
        where: { id: comment.crowdfundingId },
        data: { commentCount: { decrement: 1 } }
      });
    } else if (status === 'APPROVED' && comment.status !== 'APPROVED') {
      await prisma.crowdfunding.update({
        where: { id: comment.crowdfundingId },
        data: { commentCount: { increment: 1 } }
      });
    }

    if (status === 'HIDDEN' && comment.userId) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: comment.userId,
          title: '⚠️ 评论已被隐藏',
          content: `您在众筹项目《${comment.crowdfunding.title}》中的评论因违反社区规范已被管理员隐藏。\n\n评论内容：${comment.content.substring(0, 50)}...\n\n如有疑问，请在举报中心查看详情或提交申诉。`,
          type: 'CROWDFUNDING'
        }
      });
    }

    return { comment: updated, message: '状态已更新' };
  });

  fastify.delete('/comments/:id', async (request, reply) => {
    const comment = await prisma.crowdfundingComment.findUnique({
      where: { id: Number(request.params.id) }
    });
    if (!comment) {
      return reply.code(404).send({ error: '评论不存在' });
    }

    const replyCount = await prisma.crowdfundingComment.count({
      where: { parentId: comment.id }
    });

    await prisma.crowdfundingCommentLike.deleteMany({ where: { commentId: comment.id } });
    if (replyCount > 0) {
      const replyIds = await prisma.crowdfundingComment.findMany({
        where: { parentId: comment.id },
        select: { id: true }
      });
      for (const r of replyIds) {
        await prisma.crowdfundingCommentLike.deleteMany({ where: { commentId: r.id } });
      }
      await prisma.crowdfundingComment.deleteMany({ where: { parentId: comment.id } });
    }
    await prisma.crowdfundingComment.delete({ where: { id: comment.id } });

    if (comment.status === 'APPROVED') {
      await prisma.crowdfunding.update({
        where: { id: comment.crowdfundingId },
        data: { commentCount: { decrement: 1 + replyCount } }
      });
    }

    return { message: '评论已删除' };
  });
}

module.exports = routes;
