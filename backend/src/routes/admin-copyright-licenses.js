async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.addHook('onRequest', fastify.adminOnly);

  const addLog = async (licenseId, action, operatorId, { detail, fromStatus, toStatus, metadata } = {}) => {
    await prisma.copyrightLicenseLog.create({
      data: {
        licenseId,
        action,
        fromStatus,
        toStatus,
        detail,
        metadata: metadata ? JSON.stringify(metadata) : '{}',
        operatorId
      }
    });
  };

  fastify.get('/stats', async () => {
    const [
      total,
      draft,
      authorPending,
      pending,
      approved,
      rejected,
      authorRejected,
      active,
      cancelled,
      expired,
      todayNew,
      needReview
    ] = await Promise.all([
      prisma.copyrightLicense.count(),
      prisma.copyrightLicense.count({ where: { status: 'DRAFT' } }),
      prisma.copyrightLicense.count({ where: { status: 'AUTHOR_PENDING' } }),
      prisma.copyrightLicense.count({ where: { status: 'PENDING' } }),
      prisma.copyrightLicense.count({ where: { status: 'APPROVED' } }),
      prisma.copyrightLicense.count({ where: { status: 'REJECTED' } }),
      prisma.copyrightLicense.count({ where: { status: 'AUTHOR_REJECTED' } }),
      prisma.copyrightLicense.count({ where: { status: 'ACTIVE' } }),
      prisma.copyrightLicense.count({ where: { status: 'CANCELLED' } }),
      prisma.copyrightLicense.count({ where: { status: 'EXPIRED' } }),
      prisma.copyrightLicense.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.copyrightLicense.count({
        where: { status: { in: ['AUTHOR_PENDING', 'PENDING'] } }
      })
    ]);

    return {
      stats: {
        total,
        draft,
        authorPending,
        pending,
        approved,
        rejected,
        authorRejected,
        active,
        cancelled,
        expired,
        todayNew,
        needReview
      }
    };
  });

  fastify.get('/licenses', async (request) => {
    const { status, workType, licenseType, page = 1, limit = 15, keyword } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;
    if (workType && workType !== 'all') where.workType = workType;
    if (licenseType && licenseType !== 'all') where.licenseType = licenseType;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { workTitle: { contains: keyword } },
        { purposeDetail: { contains: keyword } },
        { licenseNo: { contains: keyword } }
      ];
    }

    const [licenses, total] = await Promise.all([
      prisma.copyrightLicense.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [
          { createdAt: 'desc' }
        ],
        include: {
          applicant: { select: { id: true, username: true, avatar: true, email: true } },
          author: { select: { id: true, username: true, avatar: true, email: true } },
          reviewer: { select: { id: true, username: true, avatar: true } },
          _count: { select: { logs: true } }
        }
      }),
      prisma.copyrightLicense.count({ where })
    ]);

    return { licenses, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/licenses/:id', async (request, reply) => {
    const license = await prisma.copyrightLicense.findUnique({
      where: { id: Number(request.params.id) },
      include: {
        applicant: { select: { id: true, username: true, avatar: true, email: true } },
        author: { select: { id: true, username: true, avatar: true, email: true } },
        reviewer: { select: { id: true, username: true, avatar: true } },
        logs: {
          orderBy: { createdAt: 'asc' },
          include: {
            operator: { select: { id: true, username: true, avatar: true } }
          }
        }
      }
    });

    if (!license) {
      return reply.code(404).send({ error: '授权申请不存在' });
    }

    return { license };
  });

  fastify.put('/licenses/:id/approve', async (request, reply) => {
    const id = Number(request.params.id);
    const { remark, contractContent, contractFile, licenseFee } = request.body;

    const license = await prisma.copyrightLicense.findUnique({ where: { id } });
    if (!license) {
      return reply.code(404).send({ error: '授权申请不存在' });
    }

    if (license.status !== 'PENDING') {
      return reply.code(400).send({ error: '只有待审批状态的申请可以通过' });
    }

    const fromStatus = license.status;
    const toStatus = 'APPROVED';

    const updateData = {
      status: toStatus,
      reviewerId: request.user.id,
      reviewedAt: new Date(),
      reviewRemark: remark || null
    };

    if (contractContent) updateData.contractContent = contractContent;
    if (contractFile) updateData.contractFile = contractFile;
    if (licenseFee !== undefined) updateData.licenseFee = Number(licenseFee);

    const updated = await prisma.copyrightLicense.update({
      where: { id },
      data: updateData
    });

    await addLog(id, 'APPROVE', request.user.id, {
      detail: remark ? `平台审批通过：${remark}` : '平台审批通过',
      fromStatus,
      toStatus,
      metadata: { contractContent, contractFile, licenseFee }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: license.applicantId,
        title: '版权授权申请已通过',
        content: `您申请的作品「${license.workTitle}」版权授权已通过平台审批，请签署合同确认。${remark ? `审批备注：${remark}` : ''}[license:${id}]`,
        type: 'SYSTEM'
      }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: license.authorId,
        title: '版权授权申请已通过',
        content: `您的作品「${license.workTitle}」版权授权申请已通过平台审批，请与申请人完成合同签署。${remark ? `审批备注：${remark}` : ''}[license:${id}]`,
        type: 'SYSTEM'
      }
    });

    return { license: updated, message: '审批通过' };
  });

  fastify.put('/licenses/:id/reject', async (request, reply) => {
    const id = Number(request.params.id);
    const { reason } = request.body;

    const license = await prisma.copyrightLicense.findUnique({ where: { id } });
    if (!license) {
      return reply.code(404).send({ error: '授权申请不存在' });
    }

    if (license.status !== 'PENDING') {
      return reply.code(400).send({ error: '只有待审批状态的申请可以拒绝' });
    }

    if (!reason) {
      return reply.code(400).send({ error: '请填写拒绝原因' });
    }

    const fromStatus = license.status;
    const toStatus = 'REJECTED';
    const updated = await prisma.copyrightLicense.update({
      where: { id },
      data: {
        status: toStatus,
        reviewerId: request.user.id,
        reviewedAt: new Date(),
        rejectionReason: reason
      }
    });

    await addLog(id, 'REJECT', request.user.id, {
      detail: `平台拒绝：${reason}`,
      fromStatus,
      toStatus
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: license.applicantId,
        title: '版权授权申请被拒绝',
        content: `您申请的作品「${license.workTitle}」版权授权被平台拒绝。拒绝原因：${reason}[license:${id}]`,
        type: 'SYSTEM'
      }
    });

    return { license: updated, message: '已拒绝申请' };
  });

  fastify.put('/licenses/:id/review', async (request, reply) => {
    const id = Number(request.params.id);
    const { action, remark, contractContent, contractFile, licenseFee } = request.body;

    if (action === 'APPROVE') {
      const req = { params: request.params, body: { remark, contractContent, contractFile, licenseFee }, user: request.user };
      const replyObj = {};
      return await (await fastify.routes['/licenses/:id/approve']).handler(req, reply);
    } else if (action === 'REJECT') {
      const req = { params: request.params, body: { reason: remark }, user: request.user };
      return await (await fastify.routes['/licenses/:id/reject']).handler(req, reply);
    } else {
      return reply.code(400).send({ error: '无效的审批操作' });
    }
  });

  fastify.put('/licenses/:id/expire', async (request, reply) => {
    const id = Number(request.params.id);
    const { remark } = request.body;

    const license = await prisma.copyrightLicense.findUnique({ where: { id } });
    if (!license) {
      return reply.code(404).send({ error: '授权申请不存在' });
    }

    if (!['ACTIVE', 'APPROVED'].includes(license.status)) {
      return reply.code(400).send({ error: '只有生效或已通过的授权可以标记过期' });
    }

    const fromStatus = license.status;
    const toStatus = 'EXPIRED';
    const updated = await prisma.copyrightLicense.update({
      where: { id },
      data: {
        status: toStatus,
        reviewRemark: remark || license.reviewRemark
      }
    });

    await addLog(id, 'EXPIRE', request.user.id, {
      detail: remark ? `授权已过期：${remark}` : '授权已过期',
      fromStatus,
      toStatus
    });

    return { license: updated, message: '已标记过期' };
  });

  fastify.put('/licenses/:id/note', async (request, reply) => {
    const id = Number(request.params.id);
    const { note } = request.body;

    const license = await prisma.copyrightLicense.findUnique({ where: { id } });
    if (!license) {
      return reply.code(404).send({ error: '授权申请不存在' });
    }

    await addLog(id, 'ADMIN_NOTE', request.user.id, {
      detail: note,
      metadata: { type: 'internal_note' }
    });

    return { message: '备注已添加' };
  });

  fastify.get('/logs', async (request) => {
    const { licenseId, action, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (licenseId) where.licenseId = Number(licenseId);
    if (action && action !== 'all') where.action = action;

    const [logs, total] = await Promise.all([
      prisma.copyrightLicenseLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          operator: { select: { id: true, username: true, avatar: true } },
          license: { select: { id: true, licenseNo: true, title: true, workTitle: true, status: true } }
        }
      }),
      prisma.copyrightLicenseLog.count({ where })
    ]);

    return { logs, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.delete('/licenses/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const license = await prisma.copyrightLicense.findUnique({ where: { id } });

    if (!license) {
      return reply.code(404).send({ error: '授权申请不存在' });
    }

    await prisma.copyrightLicense.delete({ where: { id } });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: license.applicantId,
        title: '版权授权申请已删除',
        content: `您申请的作品「${license.workTitle}」版权授权申请已被管理员删除。[license:${id}]`,
        type: 'SYSTEM'
      }
    });

    return { message: '授权申请已删除' };
  });
}

module.exports = routes;
