const bcrypt = require('bcryptjs');

async function routes(fastify, options) {
  const { prisma } = fastify;

  fastify.post('/register', async (request, reply) => {
    const { username, email, password, bio } = request.body;

    if (!username || !email || !password) {
      return reply.code(400).send({ error: '请填写所有必填字段' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] }
    });

    if (existingUser) {
      return reply.code(400).send({ error: '用户名或邮箱已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatarSeed = Math.floor(Math.random() * 8) + 1;

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        bio: bio || '',
        avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}${avatarSeed}`
      }
    });

    const token = fastify.jwt.sign({ id: user.id, username: user.username, role: user.role });

    return {
      message: '注册成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role
      }
    };
  });

  fastify.post('/login', async (request, reply) => {
    const { identifier, password } = request.body;

    if (!identifier || !password) {
      return reply.code(400).send({ error: '请填写账号和密码' });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] }
    });

    if (!user) {
      return reply.code(401).send({ error: '账号或密码错误' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return reply.code(401).send({ error: '账号或密码错误' });
    }

    const token = fastify.jwt.sign({ id: user.id, username: user.username, role: user.role });

    return {
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role
      }
    };
  });

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id }
    });

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        createdAt: user.createdAt
      }
    };
  });

  fastify.put('/profile', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { bio, avatar } = request.body;
    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: request.user.id },
      data: updateData
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role
      }
    };
  });
}

module.exports = routes;
