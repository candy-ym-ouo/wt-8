const GrowthService = require('../services/growthService');

async function triggerGrowthEvent(prisma, userId, eventType, data = {}) {
  if (!userId || !eventType) return null;

  const growthService = new GrowthService(prisma);
  const results = await growthService.triggerEvent(userId, eventType, data);

  await sendGrowthNotifications(prisma, userId, results);

  return results;
}

async function sendGrowthNotifications(prisma, userId, results) {
  if (!results) return;

  const messages = [];

  if (results.levelUp) {
    messages.push({
      senderId: 1,
      receiverId: userId,
      title: '🎉 等级提升！',
      content: `恭喜你从 ${results.levelUp.oldLevel?.name || '新手'} 升级到 ${results.levelUp.newLevel.name}！新的权益已解锁，快去查看吧！`,
      type: 'SYSTEM'
    });
  }

  for (const ach of results.achievements || []) {
    if (ach.isNewlyCompleted) {
      const achName = ach.achievement?.achievement?.name || ach.achievement?.name;
      const expReward = ach.achievement?.achievement?.expReward || ach.achievement?.expReward || 0;
      messages.push({
        senderId: 1,
        receiverId: userId,
        title: '🏆 成就解锁！',
        content: `恭喜你解锁成就「${achName}」！${expReward > 0 ? `获得 ${expReward} 经验值奖励！` : ''}`,
        type: 'SYSTEM'
      });
    }
  }

  for (const task of results.tasks || []) {
    if (task.isNewlyCompleted) {
      const taskName = task.task?.task?.name || task.task?.name;
      const expReward = task.task?.task?.expReward || task.task?.expReward || 0;
      messages.push({
        senderId: 1,
        receiverId: userId,
        title: '✅ 任务完成！',
        content: `任务「${taskName}」已完成，快去领取 ${expReward} 经验值奖励！`,
        type: 'SYSTEM'
      });
    }
  }

  if (messages.length > 0) {
    try {
      await prisma.message.createMany({ data: messages });
    } catch (e) {
      console.error('发送成长通知失败:', e);
    }
  }
}

module.exports = { triggerGrowthEvent, sendGrowthNotifications };
