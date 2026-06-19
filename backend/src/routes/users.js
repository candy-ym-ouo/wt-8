async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.get('/', async (request) => {
    const { search, page = 1, limit = 50 } = request.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          avatar: true,
          bio: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              zines: true,
              submissions: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    return { users, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: Number(request.params.id) },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            zines: true,
            submissions: true,
            subscriptions: true
          }
        }
      }
    });

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    return { user };
  });
}

module.exports = routes;
