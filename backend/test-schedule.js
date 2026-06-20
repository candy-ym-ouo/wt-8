const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found, exit');
    await prisma.$disconnect();
    return;
  }
  console.log('Using user:', user.id, user.username);

  const now = new Date();

  // Create test interviews
  const futureInterview = await prisma.interview.create({
    data: {
      title: 'Future Interview',
      description: 'publishDate in future',
      content: 'content',
      authorName: 'Test Author',
      status: 'PUBLISHED',
      publishDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      creatorId: user.id
    }
  });

  const pastInterview = await prisma.interview.create({
    data: {
      title: 'Past Interview',
      description: 'publishDate in past',
      content: 'content',
      authorName: 'Test Author',
      status: 'PUBLISHED',
      publishDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      creatorId: user.id
    }
  });

  const noDateInterview = await prisma.interview.create({
    data: {
      title: 'No Date Interview',
      description: 'publishDate is null',
      content: 'content',
      authorName: 'Test Author',
      status: 'PUBLISHED',
      publishDate: null,
      creatorId: user.id
    }
  });

  const draftInterview = await prisma.interview.create({
    data: {
      title: 'Draft Interview',
      description: 'To be published by schedule',
      content: 'content',
      authorName: 'Test Author',
      status: 'DRAFT',
      creatorId: user.id
    }
  });

  console.log('Created test interviews');

  // Test visibility query (same as API logic)
  const visible = await prisma.interview.findMany({
    where: {
      status: 'PUBLISHED',
      AND: [{ OR: [{ publishDate: null }, { publishDate: { lte: now } }] }]
    },
    select: { id: true, title: true, publishDate: true }
  });
  console.log('\nVisible interviews (should be Past and No Date):');
  visible.forEach(i => console.log('  -', i.id, i.title, '| publishDate:', i.publishDate));

  const visibleIds = visible.map(i => i.id);
  if (visibleIds.includes(pastInterview.id) && visibleIds.includes(noDateInterview.id) && !visibleIds.includes(futureInterview.id)) {
    console.log('✅ Visibility logic CORRECT');
  } else {
    console.log('❌ Visibility logic WRONG');
  }

  // Test schedule auto-publish
  console.log('\n--- Testing schedule auto-publish ---');
  console.log('Draft interview before schedule:', draftInterview.status);

  const scheduledDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const schedule = await prisma.interviewSchedule.create({
    data: {
      interviewId: draftInterview.id,
      title: 'Test Schedule',
      scheduledAt: scheduledDate,
      status: 'PUBLISHED',
      creatorId: user.id
    }
  });

  // Simulate what our PUT/POST schedule does
  await prisma.interview.update({
    where: { id: draftInterview.id },
    data: { status: 'PUBLISHED', publishDate: scheduledDate }
  });

  const updated = await prisma.interview.findUnique({ where: { id: draftInterview.id } });
  console.log('Draft interview after schedule published:', updated.status, '| publishDate:', updated.publishDate);

  // Check if future publishDate is hidden
  const visibleScheduled = await prisma.interview.findMany({
    where: {
      id: draftInterview.id,
      status: 'PUBLISHED',
      AND: [{ OR: [{ publishDate: null }, { publishDate: { lte: now } }] }]
    }
  });
  console.log('Is future-scheduled interview visible now?', visibleScheduled.length > 0 ? 'YES (BUG!)' : 'NO (correct)');

  // Cleanup
  const ids = [futureInterview.id, pastInterview.id, noDateInterview.id, draftInterview.id];
  await prisma.interviewSchedule.deleteMany({ where: { interviewId: { in: ids } } });
  await prisma.interview.deleteMany({ where: { id: { in: ids } } });
  console.log('\nTest data cleaned up');

  await prisma.$disconnect();
}

test().catch(e => { console.error(e); process.exit(1); });
