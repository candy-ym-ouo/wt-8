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
