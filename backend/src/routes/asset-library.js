async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/categories', async () => {
    const categories = await prisma.assetCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { resources: { where: { status: 'PUBLISHED' } } } } }
    });
    return { categories };
  });

  fastify.get('/resources', async (request) => {
    const { categoryId, type, keyword, page = 1, limit = 12, sort = 'latest' } = request.query;
    const skip = (page - 1) * limit;
    const where = { status: 'PUBLISHED' };

    if (categoryId) where.categoryId = Number(categoryId);
    if (type) where.type = type;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } }
      ];
    }

    let orderBy;
    switch (sort) {
      case 'popular': orderBy = [{ downloadCount: 'desc' }, { createdAt: 'desc' }]; break;
      case 'featured': where.isFeatured = true; orderBy = [{ sortOrder: 'asc' }, { createdAt: 'desc' }]; break;
      default: orderBy = [{ createdAt: 'desc' }];
    }

    const [resources, total] = await Promise.all([
      prisma.assetResource.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          category: { select: { id: true, name: true, icon: true, slug: true } },
          creator: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.assetResource.count({ where })
    ]);

    return { resources, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/resources/featured', async () => {
    const resources = await prisma.assetResource.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 8,
      include: {
        category: { select: { id: true, name: true, icon: true } },
        creator: { select: { id: true, username: true, avatar: true } }
      }
    });
    return { resources };
  });

  fastify.get('/resources/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const resource = await prisma.assetResource.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, icon: true, slug: true } },
        creator: { select: { id: true, username: true, avatar: true } }
      }
    });

    if (!resource || resource.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: '资源不存在' });
    }

    await prisma.assetResource.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    let canDownload = resource.isFree;
    let denialReason = null;
    let alreadyDownloaded = false;

    if (!canDownload && request.headers.authorization) {
      try {
        const payload = await fastify.jwt.verify(request.headers.authorization.replace('Bearer ', ''));
        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (user) {
          const existingDownload = await prisma.assetDownload.findUnique({
            where: { resourceId_userId: { resourceId: id, userId: user.id } }
          });
          if (existingDownload && existingDownload.status === 'SUCCESS') {
            alreadyDownloaded = true;
            canDownload = true;
          } else {
            if (resource.requirePlan) {
              const membership = await prisma.userMembership.findFirst({
                where: { userId: user.id, status: 'ACTIVE', endDate: { gte: new Date() } }
              });
              if (membership) {
                canDownload = true;
              } else {
                denialReason = '需要会员权限';
              }
            }
            if (!canDownload && resource.minLevel > 0) {
              const growth = await prisma.userGrowth.findUnique({ where: { userId: user.id } });
              if (growth && growth.levelId) {
                const level = await prisma.level.findUnique({ where: { id: growth.levelId } });
                if (level && level.level >= resource.minLevel) {
                  canDownload = true;
                } else {
                  denialReason = `需要达到 Lv.${resource.minLevel} 等级`;
                }
              } else {
                denialReason = `需要达到 Lv.${resource.minLevel} 等级`;
              }
            }
          }
        }
      } catch (e) {
        denialReason = '请先登录';
      }
    } else if (!canDownload && !request.headers.authorization) {
      denialReason = '请先登录';
    }

    return { resource, canDownload, denialReason, alreadyDownloaded };
  });

  fastify.post('/resources/:id/download', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const id = Number(request.params.id);
    const resource = await prisma.assetResource.findUnique({ where: { id } });

    if (!resource || resource.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: '资源不存在' });
    }

    const existing = await prisma.assetDownload.findUnique({
      where: { resourceId_userId: { resourceId: id, userId: request.user.id } }
    });

    if (existing && existing.status === 'SUCCESS') {
      return { download: existing, fileUrl: resource.fileUrl, fileName: resource.fileName, alreadyDownloaded: true };
    }

    let permissionPassed = resource.isFree;
    let failReason = null;

    if (!permissionPassed) {
      if (resource.requirePlan) {
        const membership = await prisma.userMembership.findFirst({
          where: { userId: request.user.id, status: 'ACTIVE', endDate: { gte: new Date() } }
        });
        if (membership) {
          permissionPassed = true;
        } else {
          failReason = '需要会员权限';
        }
      }
      if (!permissionPassed && resource.minLevel > 0) {
        const growth = await prisma.userGrowth.findUnique({ where: { userId: request.user.id } });
        if (!growth || !growth.levelId) {
          failReason = `需要达到 Lv.${resource.minLevel} 等级`;
        } else {
          const level = await prisma.level.findUnique({ where: { id: growth.levelId } });
          if (level && level.level >= resource.minLevel) {
            permissionPassed = true;
          } else {
            failReason = `需要达到 Lv.${resource.minLevel} 等级`;
          }
        }
      }
    }

    if (!permissionPassed) {
      let download;
      if (existing) {
        download = await prisma.assetDownload.update({
          where: { id: existing.id },
          data: { status: 'FAILED', failReason, createdAt: new Date() }
        });
      } else {
        download = await prisma.assetDownload.create({
          data: { resourceId: id, userId: request.user.id, status: 'FAILED', failReason }
        });
      }
      return reply.code(403).send({ error: failReason, download });
    }

    let download;
    let isNewSuccess = false;
    if (existing) {
      download = await prisma.assetDownload.update({
        where: { id: existing.id },
        data: { status: 'SUCCESS', failReason: null, createdAt: new Date() }
      });
      isNewSuccess = existing.status !== 'SUCCESS';
    } else {
      download = await prisma.assetDownload.create({
        data: { resourceId: id, userId: request.user.id, status: 'SUCCESS' }
      });
      isNewSuccess = true;
    }

    if (isNewSuccess) {
      await prisma.assetResource.update({
        where: { id },
        data: { downloadCount: { increment: 1 } }
      });
    }

    return { download, fileUrl: resource.fileUrl, fileName: resource.fileName, alreadyDownloaded: existing && existing.status === 'SUCCESS' };
  });

  fastify.get('/my-downloads', { preHandler: [fastify.authenticate] }, async (request) => {
    const { page = 1, limit = 12 } = request.query;
    const skip = (page - 1) * limit;

    const [downloads, total] = await Promise.all([
      prisma.assetDownload.findMany({
        where: { userId: request.user.id, status: 'SUCCESS' },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          resource: {
            select: { id: true, title: true, coverImage: true, fileType: true, type: true, fileName: true, category: { select: { name: true, icon: true } } }
          }
        }
      }),
      prisma.assetDownload.count({ where: { userId: request.user.id, status: 'SUCCESS' } })
    ]);

    return { downloads, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });
}

module.exports = routes;
