async function routes(fastify, options) {
  const { prisma } = fastify;

  const generateLicenseNo = () => {
    const date = new Date();
    const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `CR${ymd}${rand}`;
  };

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

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const {
      title, workId, workType, workTitle, workCoverImage,
      purposeCategory, purposeDetail, usageScope, useRegions,
      commercialUse, derivativeAllowed, distributeAllowed, attributionRequired,
      licenseType, licenseFee, startDate, endDate, durationDays,
      applicantContact, applicantCompany, authorId,
      contractContent, attachments
    } = request.body;

    if (!workId || !workType || !purposeDetail || !authorId) {
      return reply.code(400).send({ error: '请填写必填项：作品ID、作品类型、用途说明、作者ID' });
    }

    const validWorkTypes = ['ZINE', 'SUBMISSION', 'COLLECTION', 'COLLABORATION', 'COMPETITION', 'OTHER'];
    if (!validWorkTypes.includes(workType)) {
      return reply.code(400).send({ error: '无效的作品类型' });
    }

    const validPurposes = ['ACADEMIC', 'COMMERCIAL', 'PROMOTION', 'EXHIBITION', 'PUBLICATION', 'OTHER'];
    if (purposeCategory && !validPurposes.includes(purposeCategory)) {
      return reply.code(400).send({ error: '无效的用途分类' });
    }

    const validScopes = ['PERSONAL', 'ORGANIZATION', 'ENTERPRISE', 'PUBLIC'];
    if (usageScope && !validScopes.includes(usageScope)) {
      return reply.code(400).send({ error: '无效的使用范围' });
    }

    const validLicenseTypes = ['STANDARD', 'EXTENDED', 'EXCLUSIVE', 'CUSTOM'];
    if (licenseType && !validLicenseTypes.includes(licenseType)) {
      return reply.code(400).send({ error: '无效的授权类型' });
    }

    if (Number(authorId) === request.user.id) {
      return reply.code(400).send({ error: '不能对自己的作品申请授权' });
    }

    const license = await prisma.copyrightLicense.create({
      data: {
        licenseNo: generateLicenseNo(),
        title: title || `${workTitle || '作品'} - 版权授权申请`,
        workId: Number(workId),
        workType,
        workTitle: workTitle || '未命名作品',
        workCoverImage: workCoverImage || null,
        purposeCategory: purposeCategory || 'OTHER',
        purposeDetail,
        usageScope: usageScope || 'PERSONAL',
        useRegions: useRegions ? JSON.stringify(useRegions) : '[]',
        commercialUse: commercialUse || false,
        derivativeAllowed: derivativeAllowed || false,
        distributeAllowed: distributeAllowed || false,
        attributionRequired: attributionRequired !== false,
        licenseType: licenseType || 'STANDARD',
        licenseFee: Number(licenseFee) || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        durationDays: Number(durationDays) || 0,
        applicantId: request.user.id,
        applicantContact: applicantContact || null,
        applicantCompany: applicantCompany || null,
        authorId: Number(authorId),
        contractContent: contractContent || null,
        attachments: attachments ? JSON.stringify(attachments) : '[]'
      }
    });

    await addLog(license.id, 'CREATE', request.user.id, {
      detail: `创建版权授权申请：${license.title}`,
      toStatus: 'DRAFT'
    });

    return { license, message: '授权申请已创建' };
  });

  fastify.get('/my-applications', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 10 } = request.query;
    const skip = (page - 1) * limit;
    const where = { applicantId: request.user.id };

    if (status && status !== 'all') where.status = status;

    const [licenses, total] = await Promise.all([
      prisma.copyrightLicense.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          reviewer: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.copyrightLicense.count({ where })
    ]);

    return { licenses, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/my-authored', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 10 } = request.query;
    const skip = (page - 1) * limit;
    const where = { authorId: request.user.id };

    if (status && status !== 'all') where.status = status;

    const [licenses, total] = await Promise.all([
      prisma.copyrightLicense.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          applicant: { select: { id: true, username: true, avatar: true } },
          reviewer: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.copyrightLicense.count({ where })
    ]);

    return { licenses, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const id = Number(request.params.id);
    const license = await prisma.copyrightLicense.findUnique({
      where: { id },
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

    if (license.applicantId !== request.user.id && license.authorId !== request.user.id && request.user.role !== 'ADMIN') {
      return reply.code(403).send({ error: '无权查看此授权申请' });
    }

    let role = 'viewer';
    if (license.applicantId === request.user.id) role = 'applicant';
    if (license.authorId === request.user.id) role = 'author';
    if (request.user.role === 'ADMIN') role = 'admin';

    await prisma.copyrightLicense.update({
      where: { id },
      data: { viewedCount: { increment: 1 } }
    });

    return { license, role };
  });

  fastify.put('/:id/submit', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const id = Number(request.params.id);
    const license = await prisma.copyrightLicense.findUnique({ where: { id } });

    if (!license) {
      return reply.code(404).send({ error: '授权申请不存在' });
    }

    if (license.applicantId !== request.user.id) {
      return reply.code(403).send({ error: '只能提交自己的授权申请' });
    }

    if (license.status !== 'DRAFT') {
      return reply.code(400).send({ error: '只能提交草稿状态的申请' });
    }

    const fromStatus = license.status;
    const toStatus = 'AUTHOR_PENDING';
    const updated = await prisma.copyrightLicense.update({
      where: { id },
      data: { status: toStatus }
    });

    await addLog(id, 'SUBMIT', request.user.id, {
      detail: '提交授权申请，等待作者确认',
      fromStatus,
      toStatus
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: license.authorId,
        title: '版权授权申请待确认',
        content: `您的作品「${license.workTitle}」收到新的版权授权申请，请及时查看并处理。[license:${id}]`,
        type: 'SYSTEM'
      }
    });

    return { license: updated, message: '已提交申请，等待作者确认' };
  });

  fastify.put('/:id/author-confirm', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const id = Number(request.params.id);
    const { remark, askedPrice, contractTerms } = request.body;

    const license = await prisma.copyrightLicense.findUnique({ where: { id } });

    if (!license) {
      return reply.code(404).send({ error: '授权申请不存在' });
    }

    if (license.authorId !== request.user.id) {
      return reply.code(403).send({ error: '只有作者可以确认此申请' });
    }

    if (license.status !== 'AUTHOR_PENDING') {
      return reply.code(400).send({ error: '该申请不在待作者确认状态' });
    }

    const fromStatus = license.status;
    const toStatus = 'PENDING';
    const updated = await prisma.copyrightLicense.update({
      where: { id },
      data: {
        status: toStatus,
        authorConfirmed: true,
        authorConfirmedAt: new Date(),
        authorConfirmRemark: remark || null,
        authorAskedPrice: askedPrice ? Number(askedPrice) : null,
        authorContractTerms: contractTerms || null
      }
    });

    await addLog(id, 'AUTHOR_CONFIRM', request.user.id, {
      detail: remark ? `作者已确认：${remark}` : '作者已确认，等待平台审批',
      fromStatus,
      toStatus,
      metadata: { askedPrice, contractTerms }
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: license.applicantId,
        title: '版权授权作者已确认',
        content: `您申请的作品「${license.workTitle}」版权授权，作者已确认，等待平台最终审批。${remark ? `作者备注：${remark}` : ''}[license:${id}]`,
        type: 'SYSTEM'
      }
    });

    return { license: updated, message: '已确认申请，等待平台审批' };
  });

  fastify.put('/:id/author-reject', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const id = Number(request.params.id);
    const { reason } = request.body;

    const license = await prisma.copyrightLicense.findUnique({ where: { id } });

    if (!license) {
      return reply.code(404).send({ error: '授权申请不存在' });
    }

    if (license.authorId !== request.user.id) {
      return reply.code(403).send({ error: '只有作者可以拒绝此申请' });
    }

    if (license.status !== 'AUTHOR_PENDING') {
      return reply.code(400).send({ error: '该申请不在待作者确认状态' });
    }

    if (!reason) {
      return reply.code(400).send({ error: '请填写拒绝原因' });
    }

    const fromStatus = license.status;
    const toStatus = 'AUTHOR_REJECTED';
    const updated = await prisma.copyrightLicense.update({
      where: { id },
      data: {
        status: toStatus,
        rejectionReason: reason
      }
    });

    await addLog(id, 'AUTHOR_REJECT', request.user.id, {
      detail: `作者拒绝：${reason}`,
      fromStatus,
      toStatus
    });

    await prisma.message.create({
      data: {
        senderId: request.user.id,
        receiverId: license.applicantId,
        title: '版权授权申请被作者拒绝',
        content: `您申请的作品「${license.workTitle}」版权授权被作者拒绝。拒绝原因：${reason}[license:${id}]`,
        type: 'SYSTEM'
      }
    });

    return { license: updated, message: '已拒绝申请' };
  });

  fastify.put('/:id/cancel', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const id = Number(request.params.id);
    const license = await prisma.copyrightLicense.findUnique({ where: { id } });

    if (!license) {
      return reply.code(404).send({ error: '授权申请不存在' });
    }

    if (license.applicantId !== request.user.id) {
      return reply.code(403).send({ error: '只能撤回自己的申请' });
    }

    if (!['DRAFT', 'AUTHOR_PENDING', 'PENDING'].includes(license.status)) {
      return reply.code(400).send({ error: '当前状态无法撤回' });
    }

    const fromStatus = license.status;
    const toStatus = 'CANCELLED';
    const updated = await prisma.copyrightLicense.update({
      where: { id },
      data: { status: toStatus }
    });

    await addLog(id, 'CANCEL', request.user.id, {
      detail: '申请人撤回授权申请',
      fromStatus,
      toStatus
    });

    return { license: updated, message: '申请已撤回' };
  });

  fastify.put('/:id/update', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const id = Number(request.params.id);
    const {
      title, purposeCategory, purposeDetail, usageScope, useRegions,
      commercialUse, derivativeAllowed, distributeAllowed, attributionRequired,
      licenseType, licenseFee, startDate, endDate, durationDays,
      applicantContact, applicantCompany, contractContent, attachments
    } = request.body;

    const license = await prisma.copyrightLicense.findUnique({ where: { id } });

    if (!license) {
      return reply.code(404).send({ error: '授权申请不存在' });
    }

    if (license.applicantId !== request.user.id) {
      return reply.code(403).send({ error: '只能编辑自己的申请' });
    }

    if (license.status !== 'DRAFT') {
      return reply.code(400).send({ error: '只能编辑草稿状态的申请' });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (purposeCategory) updateData.purposeCategory = purposeCategory;
    if (purposeDetail) updateData.purposeDetail = purposeDetail;
    if (usageScope) updateData.usageScope = usageScope;
    if (useRegions) updateData.useRegions = JSON.stringify(useRegions);
    if (commercialUse !== undefined) updateData.commercialUse = commercialUse;
    if (derivativeAllowed !== undefined) updateData.derivativeAllowed = derivativeAllowed;
    if (distributeAllowed !== undefined) updateData.distributeAllowed = distributeAllowed;
    if (attributionRequired !== undefined) updateData.attributionRequired = attributionRequired;
    if (licenseType) updateData.licenseType = licenseType;
    if (licenseFee !== undefined) updateData.licenseFee = Number(licenseFee);
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (durationDays !== undefined) updateData.durationDays = Number(durationDays);
    if (applicantContact) updateData.applicantContact = applicantContact;
    if (applicantCompany) updateData.applicantCompany = applicantCompany;
    if (contractContent) updateData.contractContent = contractContent;
    if (attachments) updateData.attachments = JSON.stringify(attachments);

    const updated = await prisma.copyrightLicense.update({
      where: { id },
      data: updateData
    });

    await addLog(id, 'UPDATE', request.user.id, {
      detail: '申请人更新授权申请信息',
      metadata: Object.keys(updateData)
    });

    return { license: updated, message: '申请已更新' };
  });

  fastify.put('/:id/sign-contract', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const id = Number(request.params.id);
    const license = await prisma.copyrightLicense.findUnique({ where: { id } });

    if (!license) {
      return reply.code(404).send({ error: '授权申请不存在' });
    }

    if (license.applicantId !== request.user.id && license.authorId !== request.user.id) {
      return reply.code(403).send({ error: '无权操作此合同' });
    }

    if (license.status !== 'APPROVED') {
      return reply.code(400).send({ error: '只有审批通过的申请可以签署合同' });
    }

    const updated = await prisma.copyrightLicense.update({
      where: { id },
      data: {
        contractSigned: true,
        contractSignedAt: new Date()
      }
    });

    await addLog(id, 'SIGN_CONTRACT', request.user.id, {
      detail: `${license.applicantId === request.user.id ? '申请人' : '作者'}已签署合同`,
      fromStatus: 'APPROVED',
      toStatus: 'ACTIVE'
    });

    if (updated.contractSigned) {
      await prisma.copyrightLicense.update({
        where: { id },
        data: { status: 'ACTIVE' }
      });

      await prisma.message.create({
        data: {
          senderId: request.user.id,
          receiverId: license.applicantId === request.user.id ? license.authorId : license.applicantId,
          title: '版权授权合同已签署',
          content: `作品「${license.workTitle}」的版权授权合同已完成签署，授权正式生效。[license:${id}]`,
          type: 'SYSTEM'
        }
      });
    }

    return { license: updated, message: '合同已签署' };
  });
}

module.exports = routes;
