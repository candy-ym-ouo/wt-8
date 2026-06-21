const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const jwt = require('@fastify/jwt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authRoutes = require('./routes/auth');
const zineRoutes = require('./routes/zines');
const submissionRoutes = require('./routes/submissions');
const subscriptionRoutes = require('./routes/subscriptions');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const topicRoutes = require('./routes/topics');
const topicSubmissionRoutes = require('./routes/topic-submissions');
const scheduleRoutes = require('./routes/schedules');
const featuredRoutes = require('./routes/featured');
const growthRoutes = require('./routes/growth');
const adminGrowthRoutes = require('./routes/admin-growth');
const eventRoutes = require('./routes/events');
const eventRegistrationRoutes = require('./routes/event-registrations');
const eventCheckInRoutes = require('./routes/event-checkins');
const adminEventRoutes = require('./routes/admin-events');
const collectionRoutes = require('./routes/collections');
const adminCollectionRoutes = require('./routes/admin-collections');
const collaborationRoutes = require('./routes/collaborations');
const collaborationApplicationRoutes = require('./routes/collaboration-applications');
const adminCollaborationRoutes = require('./routes/admin-collaborations');
const crowdfundingRoutes = require('./routes/crowdfundings');
const crowdfundingTierRoutes = require('./routes/crowdfunding-tiers');
const crowdfundingOrderRoutes = require('./routes/crowdfunding-orders');
const adminCrowdfundingRoutes = require('./routes/admin-crowdfundings');
const reportRoutes = require('./routes/reports');
const adminReportRoutes = require('./routes/admin-reports');
const calendarRoutes = require('./routes/calendar');
const adminCalendarRoutes = require('./routes/admin-calendar');
const editorWorkbenchRoutes = require('./routes/editor-workbench');
const swapListingRoutes = require('./routes/swap-listings');
const swapMatchRoutes = require('./routes/swap-matches');
const adminSwapRoutes = require('./routes/admin-swaps');
const membershipRoutes = require('./routes/memberships');
const adminMembershipRoutes = require('./routes/admin-memberships');
const interviewRoutes = require('./routes/interviews');
const adminInterviewRoutes = require('./routes/admin-interviews');
const printOrderRoutes = require('./routes/print-orders');
const adminPrintOrderRoutes = require('./routes/admin-print-orders');
const readingCheckInRoutes = require('./routes/reading-checkins');
const readingReviewRoutes = require('./routes/reading-reviews');
const adminReadingRoutes = require('./routes/admin-reading');
const competitionRoutes = require('./routes/competitions');
const adminCompetitionRoutes = require('./routes/admin-competitions');
const copyrightLicenseRoutes = require('./routes/copyright-licenses');
const adminCopyrightLicenseRoutes = require('./routes/admin-copyright-licenses');
const assetLibraryRoutes = require('./routes/asset-library');
const adminAssetLibraryRoutes = require('./routes/admin-asset-library');
const revenueRoutes = require('./routes/revenue');
const withdrawalRoutes = require('./routes/withdrawals');
const adminFinanceRoutes = require('./routes/admin-finance');

fastify.register(cors, {
  origin: true,
  credentials: true
});

fastify.register(jwt, {
  secret: 'zine-platform-secret-key-2024'
});

fastify.decorate('prisma', prisma);

fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: '未授权，请先登录' });
  }
});

fastify.decorate('adminOnly', async function (request, reply) {
  try {
    await request.jwtVerify();
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (!user || user.role !== 'ADMIN') {
      reply.code(403).send({ error: '需要管理员权限' });
    }
  } catch (err) {
    reply.code(401).send({ error: '未授权' });
  }
});

fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(zineRoutes, { prefix: '/api/zines' });
fastify.register(submissionRoutes, { prefix: '/api/submissions' });
fastify.register(subscriptionRoutes, { prefix: '/api/subscriptions' });
fastify.register(messageRoutes, { prefix: '/api/messages' });
fastify.register(adminRoutes, { prefix: '/api/admin' });
fastify.register(userRoutes, { prefix: '/api/users' });
fastify.register(topicRoutes, { prefix: '/api/topics' });
fastify.register(topicSubmissionRoutes, { prefix: '/api/topic-submissions' });
fastify.register(scheduleRoutes, { prefix: '/api/schedules' });
fastify.register(featuredRoutes, { prefix: '/api/featured' });
fastify.register(growthRoutes, { prefix: '/api/growth' });
fastify.register(adminGrowthRoutes, { prefix: '/api/admin/growth' });
fastify.register(eventRoutes, { prefix: '/api/events' });
fastify.register(eventRegistrationRoutes, { prefix: '/api/event-registrations' });
fastify.register(eventCheckInRoutes, { prefix: '/api/event-checkins' });
fastify.register(adminEventRoutes, { prefix: '/api/admin/events' });
fastify.register(collectionRoutes, { prefix: '/api/collections' });
fastify.register(adminCollectionRoutes, { prefix: '/api/admin/collections' });
fastify.register(collaborationRoutes, { prefix: '/api/collaborations' });
fastify.register(collaborationApplicationRoutes, { prefix: '/api/collaboration-applications' });
fastify.register(adminCollaborationRoutes, { prefix: '/api/admin/collaborations' });
fastify.register(crowdfundingRoutes, { prefix: '/api/crowdfundings' });
fastify.register(crowdfundingTierRoutes, { prefix: '/api/crowdfunding' });
fastify.register(crowdfundingOrderRoutes, { prefix: '/api/crowdfunding-orders' });
fastify.register(adminCrowdfundingRoutes, { prefix: '/api/admin/crowdfundings' });
fastify.register(reportRoutes, { prefix: '/api/reports' });
fastify.register(adminReportRoutes, { prefix: '/api/admin/reports' });
fastify.register(calendarRoutes, { prefix: '/api/calendar' });
fastify.register(adminCalendarRoutes, { prefix: '/api/admin/calendar' });
fastify.register(editorWorkbenchRoutes, { prefix: '/api/editor-workbench' });
fastify.register(swapListingRoutes, { prefix: '/api/swap-listings' });
fastify.register(swapMatchRoutes, { prefix: '/api/swap-matches' });
fastify.register(adminSwapRoutes, { prefix: '/api/admin/swaps' });
fastify.register(membershipRoutes, { prefix: '/api/memberships' });
fastify.register(adminMembershipRoutes, { prefix: '/api/admin/memberships' });
fastify.register(interviewRoutes, { prefix: '/api/interviews' });
fastify.register(adminInterviewRoutes, { prefix: '/api/admin/interviews' });
fastify.register(printOrderRoutes, { prefix: '/api/print-orders' });
fastify.register(adminPrintOrderRoutes, { prefix: '/api/admin/print-orders' });
fastify.register(readingCheckInRoutes, { prefix: '/api/reading-checkins' });
fastify.register(readingReviewRoutes, { prefix: '/api/reading-reviews' });
fastify.register(adminReadingRoutes, { prefix: '/api/admin/reading' });
fastify.register(competitionRoutes, { prefix: '/api/competitions' });
fastify.register(adminCompetitionRoutes, { prefix: '/api/admin/competitions' });
fastify.register(copyrightLicenseRoutes, { prefix: '/api/copyright-licenses' });
fastify.register(adminCopyrightLicenseRoutes, { prefix: '/api/admin/copyright-licenses' });
fastify.register(assetLibraryRoutes, { prefix: '/api/asset-library' });
fastify.register(adminAssetLibraryRoutes, { prefix: '/api/admin/asset-library' });
fastify.register(revenueRoutes, { prefix: '/api/revenue' });
fastify.register(withdrawalRoutes, { prefix: '/api/withdrawals' });
fastify.register(adminFinanceRoutes, { prefix: '/api/admin/finance' });

fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('🚀 后端服务已启动: http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
