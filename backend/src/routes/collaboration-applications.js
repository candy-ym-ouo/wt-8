async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, collaborationId, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });

    const where = {};
    if (user.role === 'USER') {
      where.userId = request.user.id;
    }
    if (status && status !== 'all') where.status = status;
    if (collaborationId) where.collaborationId = Number(collaborationId);

    const [applications, total] = await Promise.all([
      prisma.collaborationApplication.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatar: true, email: true } },
          collaboration: { select: { id: true, title: true, status: true, compensation: true } },
          reviewer: { select: { id: true, username: true } }
        }
      }),
      prisma.collaborationApplication.count({ where })
    ]);

    return { applications, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const application = await prisma.collaborationApplication.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        user: { select: { id: true, username: true, avatar: true, email: true, bio: true } },
        collaboration: {
          select: {
            id: true, title: true, description: true, requirements: true,
            deliverables: true, compensation: true, deadline: true, status: true,
            creator: { select: { id: true, username: true, avatar: true } }
          }
        },
        reviewer: { select: { id: true, username: true } }
      }
    });

    if (!application) {
      return reply.code(404).send({ error: '申请记录不存在' });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (application.userId !== request.user.id && user.role === 'USER') {
      return reply.code(403).send({ error: '无权查看此申请记录' });
    }

    return { application };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { collaborationId, portfolio, skills, motivation, contactInfo } = request.body;

    if (!collaborationId) {
      return reply.code(400).send({ error: '请选择合作项目' });
    }

    const collaboration = await prisma.collaboration.findUnique({ where: { id: Number(collaborationId) } });
    if (!collaboration) {
      return reply.code(404).send({ error: '合作项目不存在' });
    }

    if (collaboration.status !== 'PUBLISHED') {
      return reply.code(400).send({ error: '该合作项目当前不可申请' });
    }

    if (collaboration.deadline && new Date(collaboration.deadline) < new Date()) {
      return reply.code(400).send({ error: '申请截止时间已过' });
    }

    const existing = await prisma.collaborationApplication.findFirst({
      where: { collaborationId: Number(collaborationId), userId: request.user.id }
    });
    if (existing) {
      return reply.code(400).send({ error: '您已申请此合作项目' });
    }

    const application = await prisma.collaborationApplication.create({
      data: {
        collaborationId: Number(collaborationId),
        userId: request.user.id,
        portfolio: portfolio || null,
        skills: skills || null,
        motivation: motivation || null,
        contactInfo: contactInfo || null
      }
    });

    await prisma.message.create({
      data: {
        senderId: 1,
        receiverId: request.user.id,
        title: '合作申请已提交',
        content: `您已成功提交《${collaboration.title}》的合作申请，等待管理员审核。我们会尽快处理并通知您审核结果。\n\n合作报酬：${collaboration.compensation || '面议'}\n${collaboration.deadline ? '截止时间：' + new Date(collaboration.deadline).toLocaleString('zh-CN') : ''}`,
        type: 'COLLABORATION'
      }
    });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: admin.id,
          title: '新的合作申请待审核',
          content: `用户提交了《${collaboration.title}》的合作申请，请及时审核。\n\n申请人ID：${request.user.id}\n请前往管理后台查看详情并进行审核。`,
          type: 'COLLABORATION'
        }
      });
    }

    return { application, message: '申请提交成功，等待审核' };
  });

  fastify.put('/:id/cancel', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const application = await prisma.collaborationApplication.findUnique({
      where: { id: Number(request.params.id) },
      include: { collaboration: true }
    });

    if (!application) {
      return reply.code(404).send({ error: '申请记录不存在' });
    }

    if (application.userId !== request.user.id) {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (user.role === 'USER') {
        return reply.code(403).send({ error: '无权取消此申请' });
      }
    }

    if (application.status === 'CANCELLED') {
      return reply.code(400).send({ error: '申请已取消' });
    }

    if (application.status === 'APPROVED') {
      return reply.code(400).send({ error: '申请已通过，无法取消，请联系管理员' });
    }

    const updated = await prisma.collaborationApplication.update({
      where: { id: application.id },
      data: { status: 'CANCELLED' }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: application.userId,
        title: '合作申请已取消',
        content: `您已取消《${application.collaboration.title}》的合作申请。如有疑问可联系管理员。`,
        type: 'COLLABORATION'
      }
    });

    return { application: updated, message: '申请已取消' };
  });

  fastify.post('/:id/review', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const application = await prisma.collaborationApplication.findUnique({
      where: { id: Number(request.params.id) },
      include: { collaboration: true, user: true }
    });

    if (!application) {
      return reply.code(404).send({ error: '申请记录不存在' });
    }

    if (application.status !== 'PENDING') {
      return reply.code(400).send({ error: '该申请当前状态不可审核' });
    }

    const { action, reason, feedback } = request.body;

    if (action === 'APPROVE') {
      const updated = await prisma.collaborationApplication.update({
        where: { id: application.id },
        data: {
          status: 'APPROVED',
          reviewerId: request.user.id,
          reviewedAt: new Date()
        }
      });

      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: application.userId,
          title: '合作申请已通过审核',
          content: `恭喜！您申请的《${application.collaboration.title}》已通过审核。\n\n合作报酬：${application.collaboration.compensation || '面议'}\n${application.collaboration.deadline ? '截止时间：' + new Date(application.collaboration.deadline).toLocaleString('zh-CN') : ''}\n\n${feedback ? '审核备注：' + feedback + '\n\n' : ''}请尽快与项目方联系，开启合作之旅！`,
          type: 'COLLABORATION'
        }
      });

      return { application: updated, message: '审核通过' };
    } else if (action === 'REJECT') {
      const updated = await prisma.collaborationApplication.update({
        where: { id: application.id },
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
          receiverId: application.userId,
          title: '合作申请未通过审核',
          content: `很遗憾，您申请的《${application.collaboration.title}》未通过审核。${reason ? '原因：' + reason : '如有疑问可联系管理员。'}${feedback ? '\n\n审核备注：' + feedback : ''}`,
          type: 'COLLABORATION'
        }
      });

      return { application: updated, message: '已驳回' };
    } else {
      return reply.code(400).send({ error: '无效的审核操作' });
    }
  });

  fastify.delete('/:id', { preHandler: [fastify.adminOnly] }, async (request, reply) => {
    const application = await prisma.collaborationApplication.findUnique({
      where: { id: Number(request.params.id) }
    });

    if (!application) {
      return reply.code(404).send({ error: '申请记录不存在' });
    }

    await prisma.collaborationApplication.delete({ where: { id: application.id } });
    return { message: '删除成功' };
  });
}

module.exports = routes;
