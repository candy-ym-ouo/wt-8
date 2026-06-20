function parseJSONField(value, defaultValue) {
  if (!value) return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

async function routes(fastify, options) {
  const { prisma } = fastify;

  const categories = [
    { id: 'all', name: '全部书评', icon: '📚' },
    { id: 'LITERATURE', name: '文学小说', icon: '📖' },
    { id: 'SCIENCE', name: '科学技术', icon: '🔬' },
    { id: 'HISTORY', name: '历史人文', icon: '🏛️' },
    { id: 'PHILOSOPHY', name: '哲学思想', icon: '🧠' },
    { id: 'ART', name: '艺术设计', icon: '🎨' },
    { id: 'BUSINESS', name: '商业经济', icon: '💼' },
    { id: 'SELF_HELP', name: '自我成长', icon: '🌱' },
    { id: 'ZINE', name: 'ZINE刊物', icon: '📰' },
    { id: 'OTHER', name: '其他', icon: '💬' }
  ];

  const formatReview = (r) => {
    if (!r) return r;
    return { ...r, tags: parseJSONField(r.tags, []) };
  };

  fastify.get('/categories', async () => {
    return { categories };
  });

  fastify.get('/featured', async () => {
    const now = new Date();
    const featured = await prisma.featuredReadingReview.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] }
        ],
        review: { status: 'PUBLISHED' }
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        review: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
            _count: { select: { comments: true } }
          }
        }
      }
    });

    return {
      featured: featured.map(f => ({
        ...f,
        review: {
          ...formatReview(f.review),
          commentCount: f.review._count.comments
        }
      }))
    };
  });

  fastify.get('/', async (request) => {
    const { category, search, page = 1, limit = 12, sort = 'newest', userId } = request.query;
    const skip = (page - 1) * limit;

    const where = { status: 'PUBLISHED' };
    if (category && category !== 'all') where.category = category;
    if (userId) where.userId = Number(userId);
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { bookTitle: { contains: search } },
        { bookAuthor: { contains: search } }
      ];
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'popular') orderBy = { likeCount: 'desc' };
    if (sort === 'viewed') orderBy = { viewCount: 'desc' };
    if (sort === 'rated') orderBy = { rating: 'desc' };
    if (sort === 'featured') orderBy = [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }];

    const [reviewsData, total] = await Promise.all([
      prisma.readingReview.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          _count: { select: { likes: true, comments: true } }
        }
      }),
      prisma.readingReview.count({ where })
    ]);

    const reviews = reviewsData.map(r => ({
      ...formatReview(r),
      likeCount: r._count.likes,
      commentCount: r._count.comments
    }));

    return { reviews, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/mine', { preHandler: [fastify.authenticate] }, async (request) => {
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const userId = request.user.id;

    const where = { userId };
    if (status && status !== 'all') where.status = status;

    const [reviewsData, total] = await Promise.all([
      prisma.readingReview.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { likes: true, comments: true } }
        }
      }),
      prisma.readingReview.count({ where })
    ]);

    const reviews = reviewsData.map(r => ({
      ...formatReview(r),
      likeCount: r._count.likes,
      commentCount: r._count.comments
    }));

    return { reviews, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.get('/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const review = await prisma.readingReview.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatar: true, bio: true } },
        book: true
      }
    });

    if (!review || review.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: '书评不存在' });
    }

    await prisma.readingReview.update({
      where: { id },
      data: { viewCount: review.viewCount + 1 }
    });

    return { review: formatReview({ ...review, viewCount: review.viewCount + 1 }) };
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const {
      bookId,
      bookTitle,
      bookAuthor,
      coverImage,
      title,
      content,
      rating = 5,
      category = 'OTHER',
      tags = []
    } = request.body;

    if (!bookTitle || !bookTitle.trim()) {
      return reply.code(400).send({ error: '请填写书名' });
    }
    if (!title || !title.trim()) {
      return reply.code(400).send({ error: '请填写书评标题' });
    }
    if (!content || !content.trim()) {
      return reply.code(400).send({ error: '请填写书评内容' });
    }
    if (rating < 1 || rating > 5) {
      return reply.code(400).send({ error: '评分必须在1-5之间' });
    }

    let book = null;
    if (bookId) {
      book = await prisma.readingBook.findUnique({ where: { id: Number(bookId) } });
    }

    const review = await prisma.readingReview.create({
      data: {
        userId,
        bookId: book?.id || null,
        bookTitle: book?.title || bookTitle.trim(),
        bookAuthor: book?.author || bookAuthor || null,
        coverImage: coverImage || book?.coverImage || null,
        title: title.trim(),
        content: content.trim(),
        rating: Number(rating),
        category,
        tags: JSON.stringify(tags)
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } }
      }
    });

    try {
      const growth = await prisma.userGrowth.findUnique({ where: { userId } });
      if (growth) {
        await prisma.growthLog.create({
          data: {
            userGrowthId: growth.id,
            type: 'READING_REVIEW',
            amount: 30,
            description: '发布书评',
            sourceType: 'REVIEW',
            sourceId: review.id
          }
        });
        await prisma.userGrowth.update({
          where: { userId },
          data: {
            totalExp: { increment: 30 },
            currentExp: { increment: 30 }
          }
        });
      }
    } catch (e) {}

    return { review: formatReview(review), message: '发布成功！' };
  });

  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const id = Number(request.params.id);
    const userId = request.user.id;
    const {
      bookTitle,
      bookAuthor,
      coverImage,
      title,
      content,
      rating,
      category,
      tags
    } = request.body;

    const existing = await prisma.readingReview.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '书评不存在' });
    }
    if (existing.userId !== userId) {
      return reply.code(403).send({ error: '无权限修改' });
    }

    const updateData = {};
    if (bookTitle !== undefined) updateData.bookTitle = bookTitle.trim();
    if (bookAuthor !== undefined) updateData.bookAuthor = bookAuthor || null;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (rating !== undefined) updateData.rating = Number(rating);
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    updateData.status = 'PUBLISHED';

    const updated = await prisma.readingReview.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, username: true, avatar: true } }
      }
    });

    return { review: formatReview(updated), message: '更新成功' };
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const id = Number(request.params.id);
    const userId = request.user.id;

    const existing = await prisma.readingReview.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '书评不存在' });
    }
    if (existing.userId !== userId) {
      return reply.code(403).send({ error: '无权限删除' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.readingReviewLike.deleteMany({ where: { reviewId: id } });
      await tx.readingReviewComment.deleteMany({ where: { reviewId: id } });
      await tx.featuredReadingReview.deleteMany({ where: { reviewId: id } });
      await tx.readingReview.delete({ where: { id } });
    });

    return { message: '删除成功' };
  });

  fastify.get('/:id/comments', async (request, reply) => {
    const reviewId = Number(request.params.id);
    const { page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;

    const review = await prisma.readingReview.findUnique({ where: { id: reviewId } });
    if (!review || review.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: '书评不存在' });
    }

    const [comments, total] = await Promise.all([
      prisma.readingReviewComment.findMany({
        where: { reviewId, status: 'APPROVED' },
        skip,
        take: Number(limit),
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.readingReviewComment.count({ where: { reviewId, status: 'APPROVED' } })
    ]);

    return { comments, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/:id/comments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const reviewId = Number(request.params.id);
    const { content } = request.body;

    if (!content || !content.trim()) {
      return reply.code(400).send({ error: '评论内容不能为空' });
    }

    const review = await prisma.readingReview.findUnique({ where: { id: reviewId } });
    if (!review || review.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: '书评不存在' });
    }

    const [comment] = await Promise.all([
      prisma.readingReviewComment.create({
        data: {
          reviewId,
          userId: request.user.id,
          content: content.trim()
        },
        include: {
          user: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.readingReview.update({
        where: { id: reviewId },
        data: { commentCount: { increment: 1 } }
      })
    ]);

    if (review.userId !== request.user.id) {
      try {
        await prisma.message.create({
          data: {
            senderId: request.user.id,
            receiverId: review.userId,
            title: '书评评论通知',
            content: `您的书评《${review.title}》获得了新评论`,
            type: 'COMMENT'
          }
        });
      } catch (e) {}
    }

    return { comment, message: '评论成功' };
  });

  fastify.post('/:id/like', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const reviewId = Number(request.params.id);
    const userId = request.user.id;

    const review = await prisma.readingReview.findUnique({ where: { id: reviewId } });
    if (!review || review.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: '书评不存在' });
    }

    const existing = await prisma.readingReviewLike.findUnique({
      where: { reviewId_userId: { reviewId, userId } }
    });

    if (existing) {
      await prisma.readingReviewLike.delete({
        where: { reviewId_userId: { reviewId, userId } }
      });
      const updated = await prisma.readingReview.update({
        where: { id: reviewId },
        data: { likeCount: { decrement: 1 } }
      });
      return { liked: false, likeCount: updated.likeCount };
    }

    await prisma.readingReviewLike.create({
      data: { reviewId, userId }
    });
    const updated = await prisma.readingReview.update({
      where: { id: reviewId },
      data: { likeCount: { increment: 1 } }
    });

    if (review.userId !== userId) {
      try {
        await prisma.message.create({
          data: {
            senderId: userId,
            receiverId: review.userId,
            title: '书评点赞通知',
            content: `您的书评《${review.title}》获得了一个点赞`,
            type: 'LIKE'
          }
        });
      } catch (e) {}
    }

    return { liked: true, likeCount: updated.likeCount };
  });

  fastify.get('/books/search', async (request) => {
    const { search, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { author: { contains: search } },
        { isbn: { contains: search } }
      ];
    }

    const [booksData, total] = await Promise.all([
      prisma.readingBook.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.readingBook.count({ where })
    ]);

    const books = booksData.map(b => ({ ...b, tags: parseJSONField(b.tags, []) }));
    return { books, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });
}

module.exports = routes;
