const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始填充示例数据...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@zine.com',
      password: hashedPassword,
      role: 'ADMIN',
      bio: '平台管理员，热爱独立出版文化的推动者。',
      avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=admin001'
    }
  });
  console.log('✅ 管理员账号已创建');

  const userData = [
    { username: '墨香', email: 'moxiang@zine.com', bio: '自由撰稿人，独立文学爱好者。', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=moxiang', role: 'USER' },
    { username: '画意', email: 'huayi@zine.com', bio: '插画师，作品散见于各独立刊物。', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=huayi', role: 'USER' },
    { username: '快门手', email: 'kuaimen@zine.com', bio: '街头摄影师，胶片死忠。', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=kuaimen', role: 'USER' },
    { username: '黑胶骑士', email: 'heijiao@zine.com', bio: '独立音乐收集者，地下演出组织者。', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=heijiao', role: 'USER' },
    { username: '城市漫游者', email: 'chengshi@zine.com', bio: '喜欢探索城市的每个角落，记录生活的人。', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=chengshi', role: 'USER' }
  ];

  const users = [];
  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hashedPassword }
    });
    users.push(user);
  }
  console.log(`✅ ${users.length} 个用户已创建`);

  const zineData = [
    {
      title: '纸间低语 Issue 01',
      description: '一本关于手写书信与慢生活的独立刊物，收录了六位作者的随笔与摄影作品，探讨在数字时代中纸质媒介的温度。',
      content: '卷首语：\n\n当我们谈论纸的温度时，我们在谈论什么？\n\n也许是笔尖划过纸面时留下的墨痕，是折角的弧度，是翻阅时纸张的沙沙声。这些在数字时代里逐渐被遗忘的触感，构成了我们对"真实"的朴素渴望。\n\n本辑收录：\n• 《给未来的自己写一封信》— 墨香\n• 《那些被遗忘的明信片》— 城市漫游者\n• 《钢笔与墨水的故事》— 画意',
      category: '文学',
      tags: JSON.stringify(['书信', '慢生活', '手写']),
      views: 1280,
      likes: 86,
      coverImage: 'https://picsum.photos/seed/zine001/400/560'
    },
    {
      title: '暗房手记',
      description: '胶片摄影爱好者的独立出版物，记录黑白影像背后的故事与暗房工艺详解。',
      content: '暗房，是一个充满魔法的空间。\n\n当相纸在显影液中缓缓浮现出影像的那一刻，时间仿佛静止了。\n\n本辑内容：\n• 胶片冲洗全流程指南\n• 五位摄影师的暗房工作区探访\n• 关于"错误"的美学\n• 黑白摄影的情绪表达',
      category: '摄影',
      tags: JSON.stringify(['胶片', '黑白', '暗房']),
      views: 956,
      likes: 124,
      coverImage: 'https://picsum.photos/seed/zine002/400/560'
    },
    {
      title: '地下声场 Vol.3',
      description: '聚焦独立音乐场景的实体刊物，收录乐队专访、演出回顾和小众唱片推荐。',
      content: '欢迎来到地下声场。\n\n本期我们采访了三支新晋后朋克乐队，他们用棱角分明的吉他riff和冷峻的歌词，构建着属于这个时代的青年之声。\n\n特别企划：\n• 专访：午夜编织者乐队\n• 现场：噪眠之夜回顾\n• 推荐：十张被低估的独立唱片',
      category: '音乐',
      tags: JSON.stringify(['独立音乐', '后朋克', '现场']),
      views: 2100,
      likes: 203,
      coverImage: 'https://picsum.photos/seed/zine003/400/560'
    },
    {
      title: '城中村志异',
      description: '城市角落的人文观察志，记录那些即将消逝的市井生活片段。',
      content: '每一座城市都有它的背面。\n\n在光鲜亮丽的高楼背后，是纵横交错的巷道，是热气腾腾的早餐摊，是晾晒在竹竿上的彩色衣物。\n\n本期专题：\n• 老巷子里的修表匠\n• 即将消失的报刊亭\n• 菜市场里的人生百态',
      category: '生活',
      tags: JSON.stringify(['城市', '人文', '纪实']),
      views: 1567,
      likes: 178,
      coverImage: 'https://picsum.photos/seed/zine004/400/560'
    },
    {
      title: '像素少女',
      description: '独立插画合集，八位青年插画师的作品集。',
      content: '像素艺术不仅仅是一种风格，更是一种态度。\n\n本辑收录八位插画师的作品，他们用有限的色块，构建着无限的想象空间。',
      category: '艺术',
      tags: JSON.stringify(['插画', '像素', '合集']),
      views: 890,
      likes: 145,
      coverImage: 'https://picsum.photos/seed/zine005/400/560'
    },
    {
      title: '荒诞世界漫游指南',
      description: '亚文化探索刊物，带你进入那些主流视野之外的奇妙世界。',
      content: '世界很大，荒诞无处不在。\n\n从蒸汽朋克到赛博朋克，从废墟探险到城市传说，本期我们一起探索那些被忽视的亚文化角落。',
      category: '亚文化',
      tags: JSON.stringify(['亚文化', '探索', '朋克']),
      views: 1720,
      likes: 190,
      coverImage: 'https://picsum.photos/seed/zine006/400/560'
    },
    {
      title: '批判之眼',
      description: '独立思想评论刊物，关注当代青年的思考与发声。',
      content: '思想需要批判的眼光看待这个时代。\n\n本辑收录五篇评论文章，从消费主义、数字异化、技术伦理等话题展开讨论。',
      category: '学术',
      tags: JSON.stringify(['评论', '思想', '当代']),
      views: 645,
      likes: 67,
      coverImage: 'https://picsum.photos/seed/zine007/400/560'
    },
    {
      title: '梦境连载',
      description: '独立漫画连载刊物，黑白手绘风格的短篇故事合集。',
      content: '梦境是通往另一个世界的入口。\n\n本期收录三个短篇故事：《雨夜便利店》《猫的记忆》《最后一班地铁》。',
      category: '漫画',
      tags: JSON.stringify(['漫画', '短篇', '黑白']),
      views: 1180,
      likes: 210,
      coverImage: 'https://picsum.photos/seed/zine008/400/560'
    },
    {
      title: '野草诗抄',
      description: '当代青年诗歌合集，收录二十位诗人的作品。',
      content: '我们都是野草，在城市的缝隙中生长。\n\n本辑收录二十位当代青年诗人的作品，关于爱情、理想、城市、乡愁。',
      category: '文学',
      tags: JSON.stringify(['诗歌', '青年', '合集']),
      views: 534,
      likes: 89,
      coverImage: 'https://picsum.photos/seed/zine009/400/560'
    },
    {
      title: '旧物新用',
      description: '生活美学刊物，关于复古物件与可持续生活方式。',
      content: '每一件旧物都有它的故事。\n\n本期教你如何改造旧物，让它们在现代生活中焕发新生。',
      category: '生活',
      tags: JSON.stringify(['复古', '可持续', 'DIY']),
      views: 1098,
      likes: 156,
      coverImage: 'https://picsum.photos/seed/zine010/400/560'
    }
  ];

  const zines = [];
  for (let i = 0; i < zineData.length; i++) {
    const zineInfo = zineData[i];
    const author = users[i % users.length];
    const zine = await prisma.zine.create({
      data: {
        ...zineInfo,
        authorId: author.id,
        status: 'PUBLISHED'
      }
    });
    zines.push(zine);
  }
  console.log(`✅ ${zines.length} 本刊物已创建`);

  const submissionData = [
    {
      title: '我的第一首诗',
      content: '这是我写的第一首诗，关于春天的傍晚和窗外的雨。\n\n春天的傍晚\n雨丝斜斜地落下\n打在窗玻璃上\n像一首无声的歌\n\n我坐在窗前\n看着雨滴汇聚成河\n流向我不知道的远方\n也许那里有\n我从未见过的海洋',
      images: JSON.stringify([]),
      status: 'PENDING',
      userIndex: 0
    },
    {
      title: '城市街拍 - 凌晨三点',
      content: '凌晨三点的城市，褪去了白天的喧嚣。\n\n便利店的灯光是温暖的港湾，环卫工人开始了一天的工作，代驾司机在路边等待着最后一单。\n\n这组照片记录了这个城市最安静也最真实的时刻。',
      images: JSON.stringify(['https://picsum.photos/seed/sub002/800/600', 'https://picsum.photos/seed/sub002b/800/600']),
      status: 'PENDING',
      userIndex: 2
    },
    {
      title: '关于存在主义的读书笔记',
      content: '读萨特《存在与虚无》的一些思考：\n\n存在先于本质。\n\n这意味着我们首先存在着，遭遇着，活动着，然后才规定自己。\n\n人，不外是由自己造成的东西。这是一种主观主义的第一个结果。',
      images: JSON.stringify([]),
      status: 'APPROVED',
      userIndex: 0,
      reviewerId: admin.id,
      reviewedAt: new Date(Date.now() - 86400000 * 2)
    },
    {
      title: '地下室乐队的初次演出',
      content: '上周六，我们乐队在地下室livehouse完成了第一次演出。\n\n虽然观众只有二十多个人，但那种热血沸腾的感觉，是我这辈子都不会忘记的。\n\n这篇文章记录了演出前后的心路历程。',
      images: JSON.stringify(['https://picsum.photos/seed/sub004/800/600']),
      status: 'REJECTED',
      userIndex: 3,
      rejectionReason: '内容质量较好，但排版需要进一步整理，建议补充更多现场照片和演出曲目介绍。',
      reviewerId: admin.id,
      reviewedAt: new Date(Date.now() - 86400000 * 5)
    },
    {
      title: '手绘插画 - 四季',
      content: '春夏秋冬，四季轮回。\n\n这组插画以四季为主题，每个季节选择一种代表性的花卉和动物来表现。\n\n春樱，夏荷，秋桂，冬梅。\n\n希望通过画笔传递出季节流转的美感。',
      images: JSON.stringify(['https://picsum.photos/seed/sub005a/600/800', 'https://picsum.photos/seed/sub005b/600/800', 'https://picsum.photos/seed/sub005c/600/800', 'https://picsum.photos/seed/sub005d/600/800']),
      status: 'PENDING',
      userIndex: 1
    }
  ];

  for (const s of submissionData) {
    const user = users[s.userIndex];
    const submissionCreate = {
      userId: user.id,
      title: s.title,
      content: s.content,
      images: s.images,
      status: s.status
    };
    if (s.reviewerId) submissionCreate.reviewerId = s.reviewerId;
    if (s.reviewedAt) submissionCreate.reviewedAt = s.reviewedAt;
    if (s.rejectionReason) submissionCreate.rejectionReason = s.rejectionReason;
    
    await prisma.submission.create({ data: submissionCreate });
  }
  console.log(`✅ ${submissionData.length} 条投稿已创建`);

  const subscriptions = [];
  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < 3; j++) {
      const zineIndex = (i + j) % zines.length;
      try {
        const sub = await prisma.subscription.create({
          data: {
            userId: users[i].id,
            zineId: zines[zineIndex].id
          }
        });
        subscriptions.push(sub);
      } catch (e) {
      }
    }
  }
  console.log(`✅ ${subscriptions.length} 条订阅记录已创建`);

  const messageData = [
    { senderId: admin.id, receiverId: users[0].id, title: '欢迎来到 ZineSpace', content: '欢迎加入 ZineSpace！这里是独立创作者的家园。您可以浏览已发布的刊物，也可以投稿您的作品。期待您的创作！', type: 'SYSTEM' },
    { senderId: admin.id, receiverId: users[1].id, title: '欢迎来到 ZineSpace', content: '欢迎加入 ZineSpace！这里是独立创作者的家园。您可以浏览已发布的刊物，也可以投稿您的作品。期待您的创作！', type: 'SYSTEM' },
    { senderId: admin.id, receiverId: users[2].id, title: '欢迎来到 ZineSpace', content: '欢迎加入 ZineSpace！这里是独立创作者的家园。您可以浏览已发布的刊物，也可以投稿您的作品。期待您的创作！', type: 'SYSTEM' },
    { senderId: users[0].id, receiverId: users[1].id, title: '喜欢你的作品', content: '看了你的《像素少女》，画风真的太棒了！期待更多作品～', type: 'USER', isRead: false },
    { senderId: users[2].id, receiverId: users[3].id, title: '关于演出', content: '听说你们乐队下次演出是什么时候？我一定会去支持！', type: 'USER', isRead: false }
  ];

  for (const m of messageData) {
    await prisma.message.create({ data: m });
  }
  console.log(`✅ ${messageData.length} 条消息已创建`);

  const levelData = [
    { level: 1, name: '萌芽作者', minExp: 0, icon: '🌱', description: '刚刚踏入创作世界的新人', benefits: JSON.stringify(['基础投稿权限', '社区互动权限']) },
    { level: 2, name: '成长作者', minExp: 100, icon: '🌿', description: '开始崭露头角的创作者', benefits: JSON.stringify(['基础投稿权限', '社区互动权限', '优先审核（12小时内）']) },
    { level: 3, name: '新锐作者', minExp: 300, icon: '🌳', description: '拥有一定读者群的创作者', benefits: JSON.stringify(['基础投稿权限', '社区互动权限', '优先审核（12小时内）', '首页推荐机会', '专属身份标识']) },
    { level: 4, name: '优秀作者', minExp: 800, icon: '⭐', description: '持续输出优质内容的创作者', benefits: JSON.stringify(['基础投稿权限', '社区互动权限', '优先审核（6小时内）', '首页推荐机会', '专属身份标识', '专题申请绿色通道']) },
    { level: 5, name: '资深作者', minExp: 2000, icon: '🌟', description: '平台核心创作者', benefits: JSON.stringify(['基础投稿权限', '社区互动权限', '优先审核（6小时内）', '首页推荐机会', '专属身份标识', '专题申请绿色通道', '专属运营对接', '线下活动邀请']) },
    { level: 6, name: '明星作者', minExp: 5000, icon: '💫', description: '拥有广泛影响力的创作者', benefits: JSON.stringify(['基础投稿权限', '社区互动权限', '优先审核（2小时内）', '首页推荐机会', '专属身份标识', '专题申请绿色通道', '专属运营对接', '线下活动邀请', '合作品牌对接', '收益分成提升']) },
    { level: 7, name: '传奇作者', minExp: 15000, icon: '👑', description: '平台顶级创作者，传奇般的存在', benefits: JSON.stringify(['全部权限', '优先审核（2小时内）', '首页固定推荐位', '专属身份标识', '专题申请绿色通道', '专属运营对接', '线下活动邀请', '合作品牌对接', '收益分成提升', '定制化权益']) }
  ];

  for (const l of levelData) {
    await prisma.level.upsert({
      where: { level: l.level },
      update: l,
      create: l
    });
  }
  console.log(`✅ ${levelData.length} 个等级已创建`);

  const badgeData = [
    { name: '初心作者', code: 'FIRST_SUBMISSION', icon: '🌟', description: '完成第一次投稿', category: 'CREATION', rarity: 'COMMON', expReward: 10, sortOrder: 1 },
    { name: '笔耕不辍', code: 'TEN_SUBMISSIONS', icon: '📝', description: '累计发布 10 篇作品', category: 'CREATION', rarity: 'UNCOMMON', expReward: 50, sortOrder: 2 },
    { name: '高产作家', code: 'FIFTY_SUBMISSIONS', icon: '✍️', description: '累计发布 50 篇作品', category: 'CREATION', rarity: 'RARE', expReward: 200, sortOrder: 3 },
    { name: '著作等身', code: 'HUNDRED_SUBMISSIONS', icon: '📚', description: '累计发布 100 篇作品', category: 'CREATION', rarity: 'EPIC', expReward: 500, sortOrder: 4 },
    { name: '初露锋芒', code: 'FIRST_PUBLISHED', icon: '✨', description: '第一篇作品通过审核发布', category: 'ACHIEVEMENT', rarity: 'COMMON', expReward: 20, sortOrder: 5 },
    { name: '万人瞩目', code: 'TEN_THOUSAND_VIEWS', icon: '👁️', description: '作品累计获得 10000 次浏览', category: 'ENGAGEMENT', rarity: 'UNCOMMON', expReward: 100, sortOrder: 6 },
    { name: '收获满仓', code: 'HUNDRED_LIKES', icon: '❤️', description: '作品累计获得 100 个点赞', category: 'ENGAGEMENT', rarity: 'COMMON', expReward: 30, sortOrder: 7 },
    { name: '忠实读者', code: 'THIRTY_DAYS_LOGIN', icon: '📅', description: '连续登录 30 天', category: 'GENERAL', rarity: 'RARE', expReward: 150, sortOrder: 8 },
    { name: '社区活跃者', code: 'FIFTY_COMMENTS', icon: '💬', description: '累计发布 50 条评论', category: 'ENGAGEMENT', rarity: 'UNCOMMON', expReward: 50, sortOrder: 9 },
    { name: '伯乐之眼', code: 'HUNDRED_SUBSCRIPTIONS', icon: '🔔', description: '累计订阅 100 本刊物', category: 'SOCIAL', rarity: 'RARE', expReward: 100, sortOrder: 10 },
    { name: '周年纪念', code: 'ONE_YEAR_ANNIVERSARY', icon: '🎂', description: '注册满一周年', category: 'EVENT', rarity: 'EPIC', expReward: 365, sortOrder: 11 },
    { name: '传奇创作者', code: 'LEGEND_CREATOR', icon: '🏆', description: '达到传奇作者等级', category: 'ACHIEVEMENT', rarity: 'LEGENDARY', expReward: 1000, sortOrder: 12 }
  ];

  for (const b of badgeData) {
    await prisma.badge.upsert({
      where: { code: b.code },
      update: b,
      create: b
    });
  }
  console.log(`✅ ${badgeData.length} 个勋章已创建`);

  const achievementData = [
    { name: '迈出第一步', code: 'FIRST_STEP', description: '完成第一次投稿', category: 'CREATION', condition: '累计发布 1 篇作品', targetValue: 1, expReward: 20, sortOrder: 1 },
    { name: '小试牛刀', code: 'FIVE_WORKS', description: '累计发布 5 篇作品', category: 'CREATION', condition: '累计发布 5 篇作品', targetValue: 5, expReward: 50, sortOrder: 2 },
    { name: '渐入佳境', code: 'TWENTY_WORKS', description: '累计发布 20 篇作品', category: 'CREATION', condition: '累计发布 20 篇作品', targetValue: 20, expReward: 150, sortOrder: 3 },
    { name: '创作达人', code: 'CREATION_MASTER', description: '累计发布 100 篇作品', category: 'CREATION', condition: '累计发布 100 篇作品', targetValue: 100, expReward: 500, sortOrder: 4 },
    { name: '人气新星', code: 'POPULAR_NEWSTAR', description: '作品累计获得 1000 次浏览', category: 'ENGAGEMENT', condition: '作品累计浏览量达到 1000', targetValue: 1000, expReward: 100, sortOrder: 5 },
    { name: '深受喜爱', code: 'WELL_LOVED', description: '作品累计获得 500 个点赞', category: 'ENGAGEMENT', condition: '作品累计点赞数达到 500', targetValue: 500, expReward: 200, sortOrder: 6 },
    { name: '社交达人', code: 'SOCIAL_DARLING', description: '关注用户达到 50 人', category: 'SOCIAL', condition: '关注数达到 50', targetValue: 50, expReward: 80, sortOrder: 7 },
    { name: '坚持不懈', code: 'PERSISTENCE', description: '连续 7 天发布作品', category: 'CREATION', condition: '连续 7 天发布作品', targetValue: 7, expReward: 100, sortOrder: 8 }
  ];

  for (const a of achievementData) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      update: a,
      create: a
    });
  }
  console.log(`✅ ${achievementData.length} 个成就已创建`);

  const taskData = [
    { name: '每日签到', code: 'DAILY_LOGIN', description: '每日登录获得奖励', category: 'DAILY', type: 'LOGIN', condition: '每日登录 1 次', targetValue: 1, expReward: 5, sortOrder: 1 },
    { name: '每日投稿', code: 'DAILY_SUBMISSION', description: '每日发布 1 篇作品', category: 'DAILY', type: 'SUBMISSION', condition: '每日发布 1 篇作品', targetValue: 1, expReward: 20, sortOrder: 2 },
    { name: '每日浏览', code: 'DAILY_VIEW', description: '每日浏览 5 篇作品', category: 'DAILY', type: 'VIEW', condition: '每日浏览 5 篇作品', targetValue: 5, expReward: 10, sortOrder: 3 },
    { name: '每日互动', code: 'DAILY_LIKE', description: '每日点赞 3 篇作品', category: 'DAILY', type: 'LIKE', condition: '每日点赞 3 篇作品', targetValue: 3, expReward: 8, sortOrder: 4 },
    { name: '每周创作', code: 'WEEKLY_CREATION', description: '每周发布 3 篇作品', category: 'WEEKLY', type: 'SUBMISSION', condition: '每周发布 3 篇作品', targetValue: 3, expReward: 80, sortOrder: 5 },
    { name: '每周阅读', code: 'WEEKLY_READING', description: '每周浏览 20 篇作品', category: 'WEEKLY', type: 'VIEW', condition: '每周浏览 20 篇作品', targetValue: 20, expReward: 50, sortOrder: 6 },
    { name: '每月佳作', code: 'MONTHLY_MASTERPIECE', description: '每月有 1 篇作品通过审核', category: 'MONTHLY', type: 'SUBMISSION', condition: '每月有 1 篇作品通过审核', targetValue: 1, expReward: 150, sortOrder: 7 }
  ];

  for (const t of taskData) {
    await prisma.task.upsert({
      where: { code: t.code },
      update: t,
      create: t
    });
  }
  console.log(`✅ ${taskData.length} 个任务已创建`);

  const benefitData = [
    { name: '基础投稿权限', code: 'BASIC_SUBMISSION', description: '可以向平台投稿作品', type: 'PRIVILEGE', minLevel: 1, sortOrder: 1 },
    { name: '社区互动权限', code: 'COMMUNITY_INTERACTION', description: '可以点赞、评论、分享作品', type: 'PRIVILEGE', minLevel: 1, sortOrder: 2 },
    { name: '优先审核', code: 'PRIORITY_REVIEW_12H', description: '投稿作品 12 小时内审核', type: 'PRIVILEGE', minLevel: 2, sortOrder: 3 },
    { name: '首页推荐机会', code: 'HOME_FEATURE', description: '作品有机会获得首页推荐', type: 'FEATURE', minLevel: 3, sortOrder: 4 },
    { name: '专属身份标识', code: 'EXCLUSIVE_BADGE', description: '个人主页显示专属等级标识', type: 'FEATURE', minLevel: 3, sortOrder: 5 },
    { name: '专题申请绿色通道', code: 'TOPIC_FAST_TRACK', description: '申请专题可获得快速审核', type: 'PRIVILEGE', minLevel: 4, sortOrder: 6 },
    { name: '专属运营对接', code: 'DEDICATED_OPERATOR', description: '获得专属运营人员对接服务', type: 'PRIVILEGE', minLevel: 5, sortOrder: 7 },
    { name: '线下活动邀请', code: 'OFFLINE_EVENT', description: '优先获得平台线下活动邀请', type: 'REWARD', minLevel: 5, sortOrder: 8 },
    { name: '合作品牌对接', code: 'BRAND_PARTNERSHIP', description: '有机会获得品牌合作机会', type: 'REWARD', minLevel: 6, sortOrder: 9 },
    { name: '收益分成提升', code: 'REVENUE_BOOST', description: '作品收益分成比例提升 10%', type: 'REWARD', value: '10%', minLevel: 6, sortOrder: 10 },
    { name: '定制化权益', code: 'CUSTOM_BENEFIT', description: '可申请定制化专属权益', type: 'PRIVILEGE', minLevel: 7, sortOrder: 11 }
  ];

  for (const b of benefitData) {
    await prisma.benefit.upsert({
      where: { code: b.code },
      update: b,
      create: b
    });
  }
  console.log(`✅ ${benefitData.length} 项权益已创建`);

  for (const user of [admin, ...users]) {
    await prisma.userGrowth.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        totalExp: Math.floor(Math.random() * 500),
        currentExp: Math.floor(Math.random() * 100),
        levelId: 1
      }
    });
  }
  console.log(`✅ ${users.length + 1} 个用户成长记录已初始化`);

  const collectionData = [
    {
      title: '夏日独立文学特辑',
      description: '精选十本夏日主题的独立文学刊物，带你在文字中感受夏日的热烈与温柔。',
      content: '夏天，是一个充满故事的季节。\n\n炎热的午后，蝉鸣声中，一本好书，一杯冰饮，就是最美好的时光。\n\n本辑精选了十本以夏日为主题的独立刊物，涵盖散文、诗歌、小说等多种体裁，希望能给你带来不一样的夏日阅读体验。',
      category: '主题特辑',
      tags: JSON.stringify(['夏日', '文学', '精选']),
      status: 'PUBLISHED',
      sortOrder: 1,
      isFeatured: true,
      viewCount: 890,
      likeCount: 125,
      coverImage: 'https://picsum.photos/seed/collection001/800/500',
      zineIndices: [0, 1, 5, 8]
    },
    {
      title: '胶片摄影入门指南',
      description: '从零开始学习胶片摄影，收录最值得阅读的胶片主题刊物。',
      content: '胶片摄影，是一种态度。\n\n在这个数码时代，为什么还有人坚持使用胶片？\n\n也许是因为胶片的色彩，也许是因为等待的仪式感，也许是因为不完美才更真实。\n\n本合集收录了多本胶片摄影相关的独立刊物，从入门到进阶，带你走进胶片的世界。',
      category: '创作灵感',
      tags: JSON.stringify(['胶片', '摄影', '入门']),
      status: 'PUBLISHED',
      sortOrder: 2,
      isFeatured: true,
      viewCount: 650,
      likeCount: 98,
      coverImage: 'https://picsum.photos/seed/collection002/800/500',
      zineIndices: [1, 3]
    },
    {
      title: '城市观察 · 都市生活实录',
      description: '聚焦城市生活的独立刊物合集，记录当代都市人的真实生活。',
      content: '城市，是几百万人生存的容器。\n\n每个人都在这座城市里扮演着自己的角色，编织着属于自己的故事。\n\n本合集收录了多本关注城市生活的独立刊物，带你从不同角度观察这座城市。',
      category: '生活方式',
      tags: JSON.stringify(['城市', '生活', '人文']),
      status: 'PUBLISHED',
      sortOrder: 3,
      isFeatured: false,
      viewCount: 420,
      likeCount: 67,
      coverImage: 'https://picsum.photos/seed/collection003/800/500',
      zineIndices: [3, 6, 9]
    },
    {
      title: '地下音乐场景',
      description: '探索独立音乐世界，收录最具代表性的地下音乐刊物。',
      content: '地下音乐，是主流之外的另一片天空。\n\n这里有最真实的表达，最纯粹的热爱，最热血的现场。\n\n本合集带你走进地下音乐的世界，感受独立音乐的魅力。',
      category: '独立文化',
      tags: JSON.stringify(['独立音乐', '地下', '现场']),
      status: 'PUBLISHED',
      sortOrder: 4,
      isFeatured: false,
      viewCount: 780,
      likeCount: 156,
      coverImage: 'https://picsum.photos/seed/collection004/800/500',
      zineIndices: [2, 5]
    },
    {
      title: '插画师的灵感手册',
      description: '多位插画师的作品集与创作心得分享，激发你的创作灵感。',
      content: '每一幅插画的背后，都有一个故事。\n\n本合集收录了多位独立插画师的作品和创作心得，希望能给热爱创作的你带来灵感。',
      category: '艺术设计',
      tags: JSON.stringify(['插画', '创作', '灵感']),
      status: 'PUBLISHED',
      sortOrder: 5,
      isFeatured: false,
      viewCount: 540,
      likeCount: 89,
      coverImage: 'https://picsum.photos/seed/collection005/800/500',
      zineIndices: [4, 7]
    },
    {
      title: '诗歌爱好者私藏',
      description: '当代青年诗歌合集，收录最值得一读的独立诗歌刊物。',
      content: '诗歌，是语言的钻石。\n\n在这个快节奏的时代，还有人在坚持写诗，还有人在认真读诗。\n\n本合集收录了多本独立诗歌刊物，愿你在文字中找到共鸣。',
      category: '文学诗歌',
      tags: JSON.stringify(['诗歌', '青年', '文学']),
      status: 'PUBLISHED',
      sortOrder: 6,
      isFeatured: false,
      viewCount: 310,
      likeCount: 52,
      coverImage: 'https://picsum.photos/seed/collection006/800/500',
      zineIndices: [0, 8]
    }
  ];

  const collections = [];
  for (const cData of collectionData) {
    const { zineIndices, ...collectionInfo } = cData;
    const collection = await prisma.collection.create({
      data: {
        ...collectionInfo,
        creatorId: admin.id
      }
    });
    collections.push(collection);

    for (let i = 0; i < zineIndices.length; i++) {
      const zineIndex = zineIndices[i];
      if (zines[zineIndex]) {
        await prisma.collectionZine.create({
          data: {
            collectionId: collection.id,
            zineId: zines[zineIndex].id,
            sortOrder: i,
            recommendNote: i === 0 ? '本期首推，不容错过的精彩作品' : null
          }
        });
      }
    }
  }
  console.log(`✅ ${collections.length} 个合集已创建`);

  const featuredCollectionData = [
    {
      collectionIndex: 0,
      bannerTitle: '夏日阅读特辑',
      bannerSubtitle: '十本夏日主题独立刊物，陪你度过漫长假期',
      bannerImage: 'https://picsum.photos/seed/featured001/1200/400',
      sortOrder: 1,
      isActive: true
    },
    {
      collectionIndex: 1,
      bannerTitle: '胶片摄影入门',
      bannerSubtitle: '从零开始，走进胶片的光影世界',
      bannerImage: 'https://picsum.photos/seed/featured002/1200/400',
      sortOrder: 2,
      isActive: true
    }
  ];

  for (const fData of featuredCollectionData) {
    const { collectionIndex, ...featuredInfo } = fData;
    const collection = collections[collectionIndex];
    if (collection) {
      await prisma.featuredCollection.create({
        data: {
          collectionId: collection.id,
          ...featuredInfo
        }
      });
    }
  }
  console.log(`✅ ${featuredCollectionData.length} 个精选推荐已创建`);

  console.log('\n🎉 示例数据填充完成！');
  console.log('\n📋 测试账号：');
  console.log('  管理员: admin / 123456');
  console.log('  普通用户:');
  for (const u of userData) {
    console.log(`    ${u.username} / 123456 (${u.email})`);
  }
}

main()
  .catch((e) => {
    console.error('❌ 填充数据时出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
