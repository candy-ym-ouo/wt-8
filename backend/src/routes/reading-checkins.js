function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function getStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function updateStreak(prisma, userId, checkInDate) {
  const today = getStartOfDay(checkInDate);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let streak = await prisma.readingStreak.findUnique({ where: { userId } });

  if (!streak) {
    streak = await prisma.readingStreak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        totalCheckIns: 1,
        lastCheckInDate: today
      }
    });
    return streak;
  }

  const lastDate = streak.lastCheckInDate ? getStartOfDay(streak.lastCheckInDate) : null;
  let newCurrentStreak = streak.currentStreak;

  if (!lastDate || lastDate < yesterday) {
    newCurrentStreak = 1;
  } else if (lastDate.getTime() === yesterday.getTime()) {
    newCurrentStreak = streak.currentStreak + 1;
  }

  const newLongest = Math.max(streak.longestStreak, newCurrentStreak);

  return await prisma.readingStreak.update({
    where: { userId },
    data: {
      currentStreak: newCurrentStreak,
      longestStreak: newLongest,
      totalCheckIns: { increment: 1 },
      lastCheckInDate: today
    }
  });
}

async function routes(fastify, options) {
  const { prisma } = fastify;

  const moods = [
    { id: 'HAPPY', name: '开心', icon: '😊' },
    { id: 'INSPIRED', name: '受启发', icon: '💡' },
    { id: 'MOVED', name: '感动', icon: '🥹' },
    { id: 'THOUGHTFUL', name: '深思', icon: '🤔' },
    { id: 'RELAXED', name: '放松', icon: '😌' },
    { id: 'EXCITED', name: '兴奋', icon: '🤩' },
    { id: 'CHALLENGED', name: '烧脑', icon: '🧠' }
  ];

  const formatCheckIn = (ci) => {
    if (!ci) return ci;
    return { ...ci, bookTags: parseJSONField(ci.book?.tags, []) };
  };

  fastify.get('/moods', async () => {
    return { moods };
  });

  fastify.get('/streak', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const streak = await prisma.readingStreak.findUnique({ where: { userId } });

    const today = getStartOfDay(new Date());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const monthlyCheckIns = await prisma.readingCheckIn.count({
      where: {
        userId,
        checkInDate: { gte: monthStart, lte: today }
      }
    });

    const calendarData = await prisma.readingCheckIn.findMany({
      where: {
        userId,
        checkInDate: { gte: monthStart, lte: today }
      },
      select: { checkInDate: true, pagesRead: true, minutesRead: true }
    });

    return {
      streak: streak || {
        currentStreak: 0,
        longestStreak: 0,
        totalCheckIns: 0,
        totalMinutes: 0,
        totalPages: 0
      },
      monthlyCount: monthlyCheckIns,
      calendar: calendarData.map(c => ({
        date: new Date(c.checkInDate).getDate(),
        pages: c.pagesRead,
        minutes: c.minutesRead
      }))
    };
  });

  fastify.get('/mine', { preHandler: [fastify.authenticate] }, async (request) => {
    const { page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const userId = request.user.id;

    const [checkInsData, total] = await Promise.all([
      prisma.readingCheckIn.findMany({
        where: { userId },
        skip,
        take: Number(limit),
        orderBy: { checkInDate: 'desc' },
        include: {
          book: true,
          _count: { select: { likes: true, comments: true } }
        }
      }),
      prisma.readingCheckIn.count({ where: { userId } })
    ]);

    const checkIns = checkInsData.map(c => ({
      ...formatCheckIn(c),
      likeCount: c._count.likes,
      commentCount: c._count.comments
    }));

    return { checkIns, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/', async (request) => {
    const { userId, page = 1, limit = 20, sort = 'newest' } = request.query;
    const skip = (page - 1) * limit;

    const where = { isPublic: true };
    if (userId) where.userId = Number(userId);

    let orderBy = { checkInDate: 'desc' };
    if (sort === 'popular') orderBy = { likeCount: 'desc' };

    const [checkInsData, total] = await Promise.all([
      prisma.readingCheckIn.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          book: true,
          _count: { select: { likes: true, comments: true } }
        }
      }),
      prisma.readingCheckIn.count({ where })
    ]);

    const checkIns = checkInsData.map(c => ({
      ...formatCheckIn(c),
      likeCount: c._count.likes,
      commentCount: c._count.comments
    }));

    return { checkIns, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const checkIn = await prisma.readingCheckIn.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatar: true, bio: true } },
        book: true,
        _count: { select: { likes: true, comments: true } }
      }
    });

    if (!checkIn) {
      return reply.code(404).send({ error: '打卡记录不存在' });
    }

    return {
      checkIn: {
        ...formatCheckIn(checkIn),
        likeCount: checkIn._count.likes,
        commentCount: checkIn._count.comments
      }
    };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const {
      bookId,
      bookTitle,
      bookAuthor,
      pagesRead = 0,
      minutesRead = 0,
      mood = 'HAPPY',
      note,
      isPublic = true
    } = request.body;

    if (!bookTitle || !bookTitle.trim()) {
      return reply.code(400).send({ error: '请填写书名' });
    }

    const today = getStartOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await prisma.readingCheckIn.findFirst({
      where: {
        userId,
        checkInDate: { gte: today, lt: tomorrow }
      }
    });

    if (existing) {
      return reply.code(400).send({ error: '今日已打卡，请勿重复打卡' });
    }

    let book = null;
    if (bookId) {
      book = await prisma.readingBook.findUnique({ where: { id: Number(bookId) } });
    }

    const checkIn = await prisma.$transaction(async (tx) => {
      const ci = await tx.readingCheckIn.create({
        data: {
          userId,
          bookId: book?.id || null,
          bookTitle: book?.title || bookTitle.trim(),
          bookAuthor: book?.author || bookAuthor || null,
          pagesRead: Number(pagesRead) || 0,
          minutesRead: Number(minutesRead) || 0,
          mood,
          note: note?.trim() || null,
          isPublic: !!isPublic,
          checkInDate: today
        },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          book: true
        }
      });

      if (ci.minutesRead > 0 || ci.pagesRead > 0) {
        await tx.readingStreak.upsert({
          where: { userId },
          create: {
            userId,
            totalMinutes: ci.minutesRead,
            totalPages: ci.pagesRead,
            currentStreak: 0,
            longestStreak: 0,
            totalCheckIns: 0
          },
          update: {
            totalMinutes: { increment: ci.minutesRead },
            totalPages: { increment: ci.pagesRead }
          }
        });
      }

      const streak = await updateStreak(tx, userId, today);

      try {
        const growth = await tx.userGrowth.findUnique({ where: { userId } });
        if (growth) {
          await tx.growthLog.create({
            data: {
              userGrowthId: growth.id,
              type: 'READING_CHECKIN',
              amount: 10,
              description: '阅读打卡',
              sourceType: 'CHECKIN',
              sourceId: ci.id
            }
          });
          await tx.userGrowth.update({
            where: { userId },
            data: {
              totalExp: { increment: 10 },
              currentExp: { increment: 10 }
            }
          });
        }
      } catch (e) {}

      return ci;
    });

    return { checkIn, message: '打卡成功！' };
  });

  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const id = Number(request.params.id);
    const userId = request.user.id;
    const { pagesRead, minutesRead, mood, note, isPublic } = request.body;

    const existing = await prisma.readingCheckIn.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '打卡记录不存在' });
    }
    if (existing.userId !== userId) {
      return reply.code(403).send({ error: '无权限修改' });
    }

    const updateData = {};
    if (pagesRead !== undefined) updateData.pagesRead = Number(pagesRead) || 0;
    if (minutesRead !== undefined) updateData.minutesRead = Number(minutesRead) || 0;
    if (mood !== undefined) updateData.mood = mood;
    if (note !== undefined) updateData.note = note?.trim() || null;
    if (isPublic !== undefined) updateData.isPublic = !!isPublic;

    const oldPages = existing.pagesRead;
    const oldMinutes = existing.minutesRead;

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.readingCheckIn.update({
        where: { id },
        data: updateData,
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          book: true
        }
      });

      const pageDiff = (updateData.pagesRead ?? oldPages) - oldPages;
      const minuteDiff = (updateData.minutesRead ?? oldMinutes) - oldMinutes;
      if (pageDiff !== 0 || minuteDiff !== 0) {
        const streakUpdate = {};
        if (pageDiff !== 0) streakUpdate.totalPages = { increment: pageDiff };
        if (minuteDiff !== 0) streakUpdate.totalMinutes = { increment: minuteDiff };
        if (Object.keys(streakUpdate).length > 0) {
          await tx.readingStreak.update({
            where: { userId },
            data: streakUpdate
          });
        }
      }

      return u;
    });

    return { checkIn: updated, message: '更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const id = Number(request.params.id);
    const userId = request.user.id;

    const existing = await prisma.readingCheckIn.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '打卡记录不存在' });
    }
    if (existing.userId !== userId) {
      return reply.code(403).send({ error: '无权限删除' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.readingCheckInLike.deleteMany({ where: { checkInId: id } });
      await tx.readingCheckInComment.deleteMany({ where: { checkInId: id } });
      await tx.readingCheckIn.delete({ where: { id } });

      await tx.readingStreak.update({
        where: { userId },
        data: {
          totalCheckIns: { decrement: 1 },
          totalPages: { decrement: existing.pagesRead },
          totalMinutes: { decrement: existing.minutesRead }
        }
      });
    });

    return { message: '删除成功' };
  });

  fastify.get('/:id/comments', async (request, reply) => {
    const checkInId = Number(request.params.id);
    const { page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;

    const checkIn = await prisma.readingCheckIn.findUnique({ where: { id: checkInId } });
    if (!checkIn) {
      return reply.code(404).send({ error: '打卡记录不存在' });
    }

    const [comments, total] = await Promise.all([
      prisma.readingCheckInComment.findMany({
        where: { checkInId, status: 'APPROVED' },
        skip,
        take: Number(limit),
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.readingCheckInComment.count({ where: { checkInId, status: 'APPROVED' } })
    ]);

    return { comments, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/:id/comments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const checkInId = Number(request.params.id);
    const { content } = request.body;

    if (!content || !content.trim()) {
      return reply.code(400).send({ error: '评论内容不能为空' });
    }

    const checkIn = await prisma.readingCheckIn.findUnique({ where: { id: checkInId } });
    if (!checkIn) {
      return reply.code(404).send({ error: '打卡记录不存在' });
    }

    const [comment] = await Promise.all([
      prisma.readingCheckInComment.create({
        data: {
          checkInId,
          userId: request.user.id,
          content: content.trim()
        },
        include: {
          user: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.readingCheckIn.update({
        where: { id: checkInId },
        data: { commentCount: { increment: 1 } }
      })
    ]);

    if (checkIn.userId !== request.user.id) {
      try {
        await prisma.message.create({
          data: {
            senderId: request.user.id,
            receiverId: checkIn.userId,
            title: '打卡评论通知',
            content: `您的打卡获得了新评论：${content.slice(0, 50)}`,
            type: 'COMMENT'
          }
        });
      } catch (e) {}
    }

    return { comment, message: '评论成功' };
  });

  fastify.post('/:id/like', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const checkInId = Number(request.params.id);
    const userId = request.user.id;

    const checkIn = await prisma.readingCheckIn.findUnique({ where: { id: checkInId } });
    if (!checkIn) {
      return reply.code(404).send({ error: '打卡记录不存在' });
    }

    const existing = await prisma.readingCheckInLike.findUnique({
      where: { checkInId_userId: { checkInId, userId } }
    });

    if (existing) {
      await prisma.readingCheckInLike.delete({
        where: { checkInId_userId: { checkInId, userId } }
      });
      const updated = await prisma.readingCheckIn.update({
        where: { id: checkInId },
        data: { likeCount: { decrement: 1 } }
      });
      return { liked: false, likeCount: updated.likeCount };
    }

    await prisma.readingCheckInLike.create({
      data: { checkInId, userId }
    });
    const updated = await prisma.readingCheckIn.update({
      where: { id: checkInId },
      data: { likeCount: { increment: 1 } }
    });

    if (checkIn.userId !== userId) {
      try {
        await prisma.message.create({
          data: {
            senderId: userId,
            receiverId: checkIn.userId,
            title: '打卡点赞通知',
            content: '您的打卡获得了一个点赞',
            type: 'LIKE'
          }
        });
      } catch (e) {}
    }

    return { liked: true, likeCount: updated.likeCount };
  });
}

module.exports = routes;
