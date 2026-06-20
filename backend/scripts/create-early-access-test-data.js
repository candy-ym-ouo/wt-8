const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestData() {
  console.log('=== 开始创建提前阅读测试数据 ===\n');

  const now = new Date();
  const creatorId = 1;

  const testCases = [
    {
      name: '[边界1] 已发布（publishDate 在过去）',
      publishDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      earlyHours: 24,
      minLevel: 1,
      requirePlan: false,
      status: 'PUBLISHED',
      expectedPhase: 'PUBLISHED',
      access: '所有人可读'
    },
    {
      name: '[边界2] 正式发布前1小时（在提前阅读窗口内）',
      publishDate: new Date(now.getTime() + 1 * 60 * 60 * 1000),
      earlyHours: 24,
      minLevel: 1,
      requirePlan: false,
      status: 'PENDING',
      expectedPhase: 'EARLY_WINDOW',
      access: '满足条件用户可读'
    },
    {
      name: '[边界3] 提前阅读窗口刚开始（publishDate - earlyHours）',
      publishDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      earlyHours: 24,
      minLevel: 2,
      requirePlan: true,
      status: 'PENDING',
      expectedPhase: 'EARLY_WINDOW',
      access: '会员+Lv2可读'
    },
    {
      name: '[边界4] 在提前窗口内，发布前12小时',
      publishDate: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      earlyHours: 24,
      minLevel: 1,
      requirePlan: true,
      status: 'PENDING',
      expectedPhase: 'EARLY_WINDOW',
      access: '会员可读'
    },
    {
      name: '[边界5] 未到提前阅读开放时间（窗口前5天）',
      publishDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      earlyHours: 24,
      minLevel: 1,
      requirePlan: false,
      status: 'PENDING',
      expectedPhase: 'NOT_OPEN',
      access: '所有人不可读'
    },
    {
      name: '[边界6] 刚过提前阅读开放时间1分钟',
      publishDate: new Date(now.getTime() + (24 * 60 - 1) * 60 * 1000),
      earlyHours: 24,
      minLevel: 1,
      requirePlan: false,
      status: 'PENDING',
      expectedPhase: 'EARLY_WINDOW',
      access: '满足条件用户可读'
    },
    {
      name: '[边界7] 距离提前阅读开放还有1小时',
      publishDate: new Date(now.getTime() + (24 * 60 + 60) * 60 * 1000),
      earlyHours: 24,
      minLevel: 3,
      requirePlan: true,
      status: 'PENDING',
      expectedPhase: 'NOT_OPEN',
      access: '所有人不可读'
    },
    {
      name: '[边界8] 提前阅读时间短（2小时窗口），在窗口内',
      publishDate: new Date(now.getTime() + 1 * 60 * 60 * 1000),
      earlyHours: 2,
      minLevel: 1,
      requirePlan: false,
      status: 'PENDING',
      expectedPhase: 'EARLY_WINDOW',
      access: '满足条件用户可读'
    },
    {
      name: '[边界9] 提前阅读时间短（2小时窗口），未到窗口',
      publishDate: new Date(now.getTime() + 5 * 60 * 60 * 1000),
      earlyHours: 2,
      minLevel: 1,
      requirePlan: false,
      status: 'PENDING',
      expectedPhase: 'NOT_OPEN',
      access: '所有人不可读'
    }
  ];

  await prisma.earlyAccess.deleteMany({
    where: { title: { startsWith: '[TEST]' } }
  });

  let createdCount = 0;
  for (const tc of testCases) {
    try {
      const item = await prisma.earlyAccess.create({
        data: {
          title: `[TEST] ${tc.name}`,
          description: tc.access,
          content: `这是测试内容：${tc.name}\n\n预期阶段：${tc.expectedPhase}\n访问权限：${tc.access}`,
          publishDate: tc.publishDate,
          earlyHours: tc.earlyHours,
          minLevel: tc.minLevel,
          requirePlan: tc.requirePlan,
          status: tc.status,
          creatorId
        }
      });
      createdCount++;
      console.log(`✓ ${tc.name}`);
      console.log(`  ID: ${item.id}`);
      console.log(`  publishDate: ${tc.publishDate.toISOString()}`);
      console.log(`  earlyHours: ${tc.earlyHours}`);
      console.log(`  预期阶段: ${tc.expectedPhase} | 访问: ${tc.access}\n`);
    } catch (e) {
      console.log(`✗ ${tc.name}: ${e.message}\n`);
    }
  }

  console.log(`\n=== 创建完成，共 ${createdCount} 条测试数据 ===`);
  console.log('\n测试场景说明：');
  console.log('  NOT_OPEN:    now < publishDate - earlyHours （未到提前阅读开放时间）');
  console.log('  EARLY_WINDOW: publishDate - earlyHours ≤ now < publishDate （提前阅读窗口内）');
  console.log('  PUBLISHED:  now ≥ publishDate （已正式发布，所有人可读）');
}

createTestData()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
