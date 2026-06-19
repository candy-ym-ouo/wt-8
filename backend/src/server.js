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
