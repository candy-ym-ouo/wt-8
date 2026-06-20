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

  fastify.addHook('onRequest', fastify.adminOnly);

  const formatReview = (r) => r ? { ...r, tags: parseJSONField(r.tags, []) } : r;
  const formatBook = (b) => b ? { ...b, tags: parseJSONField(b.tags, []) } : b;

  fastify.get('/stats', async () => {
    const [
      totalCheckIns,
      totalReviews,
      publishedReviews,
      draftReviews,
      totalBooks,
      totalCheckInComments,
      totalReviewComments,
      totalFeatured
    ] = await Promise.all([
      prisma.readingCheckIn.count(),
      prisma.readingReview.count(),
      prisma.readingReview.count({ where: { status: 'PUBLISHED' } }),
      prisma.readingReview.count({ where: { status: 'DRAFT' } }),
      prisma.readingBook.count(),
      prisma.readingCheckInComment.count(),
      prisma.readingReviewComment.count(),
      prisma.featuredReadingReview.count({ where: { isActive: true } })
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCheckIns = await prisma.readingCheckIn.count({
      where: { checkInDate: { gte: today } }
    });

    const topUsers = await prisma.readingStreak.findMany({
      take: 10,
      orderBy: [{ currentStreak: 'desc' }, { totalCheckIns: 'desc' }],
      include: {
        user: { select: { id: true, username: true, avatar: true } }
      }
    });

    return {
      stats: {
        totalCheckIns,
        todayCheckIns,
        totalReviews,
        publishedReviews,
        draftReviews,
        totalBooks,
        totalCheckInComments,
        totalReviewComments,
        totalFeatured
      },
      topUsers
    };
  });

  fastify.get('/checkins', async (request) => {
    const { userId, isPublic, page = 1, limit = 20, search } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (userId) where.userId = Number(userId);
    if (isPublic !== undefined && isPublic !== 'all') where.isPublic = isPublic === 'true';
    if (search) {
      where.OR = [
        { bookTitle: { contains: search } },
        { note: { contains: search } }
      ];
    }

    const [checkIns, total] = await Promise.all([
      prisma.readingCheckIn.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { checkInDate: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          _count: { select: { likes: true, comments: true } }
        }
      }),
      prisma.readingCheckIn.count({ where })
    ]);

    return {
      checkIns: checkIns.map(c => ({
        ...c,
        likeCount: c._count.likes,
        commentCount: c._count.comments
      })),
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  });

  fastify.get('/checkins/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const checkIn = await prisma.readingCheckIn.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        book: true
      }
    });
    if (!checkIn) {
      return reply.code(404).send({ error: '打卡记录不存在' });
    }
    return { checkIn };
  });

  fastify.put('/checkins/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const { note, isPublic, bookTitle, pagesRead, minutesRead, mood } = request.body;

    const existing = await prisma.readingCheckIn.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '打卡记录不存在' });
    }

    const updateData = {};
    if (note !== undefined) updateData.note = note?.trim() || null;
    if (isPublic !== undefined) updateData.isPublic = !!isPublic;
    if (bookTitle !== undefined) updateData.bookTitle = bookTitle.trim();
    if (pagesRead !== undefined) updateData.pagesRead = Number(pagesRead) || 0;
    if (minutesRead !== undefined) updateData.minutesRead = Number(minutesRead) || 0;
    if (mood !== undefined) updateData.mood = mood;

    const updated = await prisma.readingCheckIn.update({
      where: { id },
      data: updateData
    });

    return { checkIn: updated, message: '更新成功' };
  });

  fastify.delete('/checkins/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = await prisma.readingCheckIn.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '打卡记录不存在' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.readingCheckInLike.deleteMany({ where: { checkInId: id } });
      await tx.readingCheckInComment.deleteMany({ where: { checkInId: id } });
      await tx.readingCheckIn.delete({ where: { id } });

      await tx.readingStreak.update({
        where: { userId: existing.userId },
        data: {
          totalCheckIns: { decrement: 1 },
          totalPages: { decrement: existing.pagesRead },
          totalMinutes: { decrement: existing.minutesRead }
        }
      });
    });

    return { message: '删除成功' };
  });

  fastify.get('/checkins/:id/comments', async (request) => {
    const checkInId = Number(request.params.id);
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = { checkInId };
    if (status && status !== 'all') where.status = status;

    const [comments, total] = await Promise.all([
      prisma.readingCheckInComment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.readingCheckInComment.count({ where })
    ]);

    return { comments, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.put('/checkins/comments/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const { status, isPinned, content } = request.body;

    const existing = await prisma.readingCheckInComment.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '评论不存在' });
    }

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (content !== undefined) updateData.content = content.trim();

    const updated = await prisma.readingCheckInComment.update({
      where: { id },
      data: updateData
    });

    return { comment: updated, message: '更新成功' };
  });

  fastify.delete('/checkins/comments/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = await prisma.readingCheckInComment.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '评论不存在' });
    }

    await prisma.$transaction([
      prisma.readingCheckInComment.delete({ where: { id } }),
      prisma.readingCheckIn.update({
        where: { id: existing.checkInId },
        data: { commentCount: { decrement: 1 } }
      })
    ]);

    return { message: '删除成功' };
  });

  fastify.get('/reviews', async (request) => {
    const { status, category, userId, search, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all') where.category = category;
    if (userId) where.userId = Number(userId);
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { bookTitle: { contains: search } },
        { content: { contains: search } }
      ];
    }

    const [reviewsData, total] = await Promise.all([
      prisma.readingReview.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          _count: { select: { comments: true, likes: true } }
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

  fastify.get('/reviews/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const review = await prisma.readingReview.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true } },
        featured: true,
        book: true
      }
    });
    if (!review) {
      return reply.code(404).send({ error: '书评不存在' });
    }
    return { review: formatReview(review) };
  });

  fastify.post('/reviews', async (request) => {
    const {
      userId,
      bookId,
      bookTitle,
      bookAuthor,
      coverImage,
      title,
      content,
      rating = 5,
      category = 'OTHER',
      tags = [],
      status = 'DRAFT',
      sortOrder = 0,
      isFeatured = false,
      rejectionReason,
      reviewerId,
      reviewedAt
    } = request.body;

    let book = null;
    if (bookId) {
      book = await prisma.readingBook.findUnique({ where: { id: Number(bookId) } });
    }

    const review = await prisma.readingReview.create({
      data: {
        userId: userId || request.user.id,
        bookId: book?.id || null,
        bookTitle: book?.title || bookTitle,
        bookAuthor: book?.author || bookAuthor || null,
        coverImage: coverImage || book?.coverImage || `https://picsum.photos/seed/review${Date.now()}/400/600`,
        title,
        content,
        rating: Number(rating),
        category,
        tags: JSON.stringify(tags),
        status,
        sortOrder,
        isFeatured,
        rejectionReason: rejectionReason || null,
        reviewerId: reviewerId || request.user.id,
        reviewedAt: reviewedAt ? new Date(reviewedAt) : null
      }
    });

    return { review: formatReview(review), message: '创建成功' };
  });

  fastify.put('/reviews/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = await prisma.readingReview.findUnique({ where: { id } });

    if (!existing) {
      return reply.code(404).send({ error: '书评不存在' });
    }

    const {
      bookTitle,
      bookAuthor,
      coverImage,
      title,
      content,
      rating,
      category,
      tags,
      status,
      sortOrder,
      isFeatured,
      rejectionReason,
      reviewerId,
      reviewedAt
    } = request.body;

    const updateData = {};
    if (bookTitle !== undefined) updateData.bookTitle = bookTitle;
    if (bookAuthor !== undefined) updateData.bookAuthor = bookAuthor || null;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (rating !== undefined) updateData.rating = Number(rating);
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'APPROVED' || status === 'REJECTED' || status === 'PUBLISHED') {
        updateData.reviewerId = reviewerId || request.user.id;
        updateData.reviewedAt = new Date();
      }
    }
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;

    if (status === 'PUBLISHED' && !updateData.reviewedAt) {
      updateData.reviewerId = reviewerId || request.user.id;
      updateData.reviewedAt = new Date();
    }

    const updated = await prisma.readingReview.update({
      where: { id },
      data: updateData
    });

    return { review: formatReview(updated), message: '更新成功' };
  });

  fastify.delete('/reviews/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = await prisma.readingReview.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '书评不存在' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.readingReviewLike.deleteMany({ where: { reviewId: id } });
      await tx.readingReviewComment.deleteMany({ where: { reviewId: id } });
      await tx.featuredReadingReview.deleteMany({ where: { reviewId: id } });
      await tx.readingReview.delete({ where: { id } });
    });

    return { message: '删除成功' };
  });

  fastify.get('/reviews/:id/comments', async (request) => {
    const reviewId = Number(request.params.id);
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = { reviewId };
    if (status && status !== 'all') where.status = status;

    const [comments, total] = await Promise.all([
      prisma.readingReviewComment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, username: true, avatar: true } }
        }
      }),
      prisma.readingReviewComment.count({ where })
    ]);

    return { comments, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.put('/reviews/comments/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const { status, isPinned, content } = request.body;

    const existing = await prisma.readingReviewComment.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '评论不存在' });
    }

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (content !== undefined) updateData.content = content.trim();

    const updated = await prisma.readingReviewComment.update({
      where: { id },
      data: updateData
    });

    return { comment: updated, message: '更新成功' };
  });

  fastify.delete('/reviews/comments/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = await prisma.readingReviewComment.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '评论不存在' });
    }

    await prisma.$transaction([
      prisma.readingReviewComment.delete({ where: { id } }),
      prisma.readingReview.update({
        where: { id: existing.reviewId },
        data: { commentCount: { decrement: 1 } }
      })
    ]);

    return { message: '删除成功' };
  });

  fastify.get('/books', async (request) => {
    const { category, search, page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (category && category !== 'all') where.category = category;
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
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { checkIns: true, reviews: true } }
        }
      }),
      prisma.readingBook.count({ where })
    ]);

    const books = booksData.map(b => ({
      ...formatBook(b),
      checkInCount: b._count.checkIns,
      reviewCount: b._count.reviews
    }));

    return { books, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  });

  fastify.post('/books', async (request) => {
    const {
      title,
      author,
      coverImage,
      isbn,
      publisher,
      publishDate,
      category = 'OTHER',
      tags = [],
      description,
      pageCount = 0
    } = request.body;

    const book = await prisma.readingBook.create({
      data: {
        title,
        author,
        coverImage: coverImage || `https://picsum.photos/seed/book${Date.now()}/400/600`,
        isbn: isbn || null,
        publisher: publisher || null,
        publishDate: publishDate ? new Date(publishDate) : null,
        category,
        tags: JSON.stringify(tags),
        description: description || null,
        pageCount: Number(pageCount) || 0
      }
    });

    return { book: formatBook(book), message: '添加成功' };
  });

  fastify.put('/books/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = await prisma.readingBook.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '书籍不存在' });
    }

    const {
      title,
      author,
      coverImage,
      isbn,
      publisher,
      publishDate,
      category,
      tags,
      description,
      pageCount
    } = request.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (author !== undefined) updateData.author = author;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (isbn !== undefined) updateData.isbn = isbn || null;
    if (publisher !== undefined) updateData.publisher = publisher || null;
    if (publishDate !== undefined) updateData.publishDate = publishDate ? new Date(publishDate) : null;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (description !== undefined) updateData.description = description || null;
    if (pageCount !== undefined) updateData.pageCount = Number(pageCount) || 0;

    const updated = await prisma.readingBook.update({
      where: { id },
      data: updateData
    });

    return { book: formatBook(updated), message: '更新成功' };
  });

  fastify.delete('/books/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = await prisma.readingBook.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '书籍不存在' });
    }

    await prisma.readingBook.delete({ where: { id } });
    return { message: '删除成功' };
  });

  fastify.get('/featured/list', async () => {
    const featured = await prisma.featuredReadingReview.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        review: { select: { id: true, title: true, coverImage: true, bookTitle: true } }
      }
    });
    return { featured };
  });

  fastify.post('/featured', async (request, reply) => {
    const {
      reviewId,
      bannerImage,
      bannerTitle,
      bannerSubtitle,
      sortOrder = 0,
      startDate,
      endDate,
      isActive = true
    } = request.body;

    const existing = await prisma.featuredReadingReview.findUnique({
      where: { reviewId: Number(reviewId) }
    });
    if (existing) {
      return reply.code(400).send({ error: '该书评已在专题推荐中' });
    }

    const review = await prisma.readingReview.findUnique({
      where: { id: Number(reviewId) }
    });
    if (!review) {
      return reply.code(404).send({ error: '书评不存在' });
    }

    const featured = await prisma.featuredReadingReview.create({
      data: {
        reviewId: Number(reviewId),
        bannerImage: bannerImage || review.coverImage,
        bannerTitle: bannerTitle || review.title,
        bannerSubtitle: bannerSubtitle || review.bookTitle,
        sortOrder,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive
      },
      include: {
        review: { select: { id: true, title: true } }
      }
    });

    return { featured, message: '添加专题推荐成功' };
  });

  fastify.put('/featured/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = await prisma.featuredReadingReview.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '专题推荐不存在' });
    }

    const {
      bannerImage,
      bannerTitle,
      bannerSubtitle,
      sortOrder,
      startDate,
      endDate,
      isActive
    } = request.body;

    const updateData = {};
    if (bannerImage !== undefined) updateData.bannerImage = bannerImage;
    if (bannerTitle !== undefined) updateData.bannerTitle = bannerTitle;
    if (bannerSubtitle !== undefined) updateData.bannerSubtitle = bannerSubtitle;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.featuredReadingReview.update({
      where: { id },
      data: updateData
    });

    return { featured: updated, message: '更新成功' };
  });

  fastify.delete('/featured/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = await prisma.featuredReadingReview.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: '专题推荐不存在' });
    }

    await prisma.featuredReadingReview.delete({ where: { id } });
    return { message: '删除成功' };
  });
}

module.exports = routes;
