class GrowthService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getUserGrowth(userId) {
    let growth = await this.prisma.userGrowth.findUnique({
      where: { userId },
      include: {
        level: true,
        userBadges: { include: { badge: true } },
        userAchievements: { include: { achievement: true } }
      }
    });

    if (!growth) {
      growth = await this.prisma.userGrowth.create({
        data: { userId },
        include: {
          level: true,
          userBadges: { include: { badge: true } },
          userAchievements: { include: { achievement: true } }
        }
      });
    }

    return growth;
  }

  async addExp(userId, exp, description, sourceType, sourceId) {
    const growth = await this.getUserGrowth(userId);
    const oldLevelId = growth.levelId;

    const updatedGrowth = await this.prisma.userGrowth.update({
      where: { id: growth.id },
      data: {
        totalExp: { increment: exp },
        currentExp: { increment: exp }
      },
      include: { level: true }
    });

    await this.prisma.growthLog.create({
      data: {
        userGrowthId: growth.id,
        type: 'EXP',
        amount: exp,
        description,
        sourceType,
        sourceId
      }
    });

    const levelUpResult = await this.checkLevelUp(userId, updatedGrowth);

    return {
      growth: updatedGrowth,
      expAdded: exp,
      levelUp: levelUpResult
    };
  }

  async checkLevelUp(userId, growth) {
    const levels = await this.prisma.level.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' }
    });

    let newLevel = null;
    for (const level of levels) {
      if (growth.totalExp >= level.minExp) {
        newLevel = level;
      } else {
        break;
      }
    }

    if (newLevel && newLevel.id !== growth.levelId) {
      await this.prisma.userGrowth.update({
        where: { id: growth.id },
        data: {
          levelId: newLevel.id,
          currentExp: newLevel.level > 1 
            ? growth.totalExp - levels[newLevel.level - 2]?.minExp || 0
            : growth.totalExp
        }
      });

      await this.activateBenefits(userId, newLevel.level);

      return {
        oldLevel: growth.level,
        newLevel
      };
    }

    return null;
  }

  async activateBenefits(userId, level) {
    const benefits = await this.prisma.benefit.findMany({
      where: {
        isActive: true,
        minLevel: { lte: level }
      }
    });

    for (const benefit of benefits) {
      const existing = await this.prisma.userBenefit.findUnique({
        where: { userId_benefitId: { userId, benefitId: benefit.id } }
      });

      if (!existing) {
        await this.prisma.userBenefit.create({
          data: {
            userId,
            benefitId: benefit.id
          }
        });
      } else if (!existing.isActive) {
        await this.prisma.userBenefit.update({
          where: { id: existing.id },
          data: { isActive: true }
        });
      }
    }
  }

  async updateAchievementProgress(userId, achievementCode, progress = 1) {
    const growth = await this.getUserGrowth(userId);
    const achievement = await this.prisma.achievement.findFirst({
      where: { code: achievementCode, isActive: true }
    });

    if (!achievement) return null;

    let userAchievement = await this.prisma.userAchievement.findUnique({
      where: {
        userGrowthId_achievementId: {
          userGrowthId: growth.id,
          achievementId: achievement.id
        }
      }
    });

    if (!userAchievement) {
      userAchievement = await this.prisma.userAchievement.create({
        data: {
          userGrowthId: growth.id,
          achievementId: achievement.id,
          progress: 0
        }
      });
    }

    if (userAchievement.isCompleted) return null;

    const newProgress = Math.min(userAchievement.progress + progress, achievement.targetValue);
    const isCompleted = newProgress >= achievement.targetValue;

    const updateData = { progress: newProgress };
    if (isCompleted && !userAchievement.isCompleted) {
      updateData.isCompleted = true;
      updateData.completedAt = new Date();
    }

    userAchievement = await this.prisma.userAchievement.update({
      where: { id: userAchievement.id },
      data: updateData,
      include: { achievement: true }
    });

    if (isCompleted) {
      if (achievement.expReward > 0) {
        await this.addExp(userId, achievement.expReward, `成就解锁: ${achievement.name}`, 'ACHIEVEMENT', achievement.id);
      }

      if (achievement.badgeId) {
        await this.unlockBadge(userId, achievement.badgeId, 'achievement');
      }
    }

    return {
      achievement: userAchievement,
      isNewlyCompleted: isCompleted
    };
  }

  async updateTaskProgress(userId, taskCode, progress = 1) {
    const growth = await this.getUserGrowth(userId);
    const task = await this.prisma.task.findFirst({
      where: { code: taskCode, isActive: true }
    });

    if (!task) return null;

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const week = this.getWeekNumber(now);
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let userTask = await this.prisma.userTask.findUnique({
      where: {
        userGrowthId_taskId_date: {
          userGrowthId: growth.id,
          taskId: task.id,
          date
        }
      }
    });

    if (!userTask) {
      userTask = await this.prisma.userTask.create({
        data: {
          userGrowthId: growth.id,
          taskId: task.id,
          progress: 0,
          date,
          week,
          month
        }
      });
    }

    if (userTask.isCompleted) return null;

    const newProgress = Math.min(userTask.progress + progress, task.targetValue);
    const isCompleted = newProgress >= task.targetValue;

    const updateData = { progress: newProgress };
    if (isCompleted && !userTask.isCompleted) {
      updateData.isCompleted = true;
      updateData.completedAt = new Date();
    }

    userTask = await this.prisma.userTask.update({
      where: { id: userTask.id },
      data: updateData,
      include: { task: true }
    });

    return {
      task: userTask,
      isNewlyCompleted: isCompleted
    };
  }

  async claimTaskReward(userId, userTaskId) {
    const growth = await this.getUserGrowth(userId);
    const userTask = await this.prisma.userTask.findUnique({
      where: { id: userTaskId },
      include: { task: true }
    });

    if (!userTask || userTask.userGrowthId !== growth.id) {
      throw new Error('任务不存在或无权领取');
    }

    if (!userTask.isCompleted) {
      throw new Error('任务未完成');
    }

    if (userTask.claimedAt) {
      throw new Error('奖励已领取');
    }

    await this.prisma.userTask.update({
      where: { id: userTaskId },
      data: { claimedAt: new Date() }
    });

    await this.addExp(
      userId,
      userTask.task.expReward,
      `任务完成: ${userTask.task.name}`,
      'TASK',
      userTask.taskId
    );

    return { exp: userTask.task.expReward };
  }

  async claimAchievementReward(userId, userAchievementId) {
    const growth = await this.getUserGrowth(userId);
    const userAchievement = await this.prisma.userAchievement.findUnique({
      where: { id: userAchievementId },
      include: { achievement: true }
    });

    if (!userAchievement || userAchievement.userGrowthId !== growth.id) {
      throw new Error('成就不存在或无权领取');
    }

    if (!userAchievement.isCompleted) {
      throw new Error('成就未完成');
    }

    if (userAchievement.claimedAt) {
      throw new Error('奖励已领取');
    }

    await this.prisma.userAchievement.update({
      where: { id: userAchievementId },
      data: { claimedAt: new Date() }
    });

    return { success: true };
  }

  async unlockBadge(userId, badgeId, source = 'manual') {
    const growth = await this.getUserGrowth(userId);
    const badge = await this.prisma.badge.findUnique({
      where: { id: badgeId, isActive: true }
    });

    if (!badge) return null;

    const existing = await this.prisma.userBadge.findUnique({
      where: {
        userGrowthId_badgeId: {
          userGrowthId: growth.id,
          badgeId
        }
      }
    });

    if (existing) return null;

    const userBadge = await this.prisma.userBadge.create({
      data: {
        userGrowthId: growth.id,
        badgeId,
        source
      },
      include: { badge: true }
    });

    if (badge.expReward > 0) {
      await this.addExp(userId, badge.expReward, `勋章解锁: ${badge.name}`, 'BADGE', badgeId);
    }

    return userBadge;
  }

  async triggerEvent(userId, eventType, data = {}) {
    const results = {
      exp: null,
      achievements: [],
      tasks: [],
      levelUp: null
    };

    const eventConfig = this.getEventConfig(eventType);
    if (!eventConfig) return results;

    if (eventConfig.exp && eventConfig.exp > 0) {
      const expResult = await this.addExp(
        userId,
        eventConfig.exp,
        eventConfig.description || eventType,
        eventType,
        data.sourceId
      );
      results.exp = expResult.expAdded;
      results.levelUp = expResult.levelUp;
    }

    if (eventConfig.achievements) {
      for (const achievementCode of eventConfig.achievements) {
        const result = await this.updateAchievementProgress(
          userId,
          achievementCode,
          data.progress || 1
        );
        if (result) results.achievements.push(result);
      }
    }

    if (eventConfig.tasks) {
      for (const taskCode of eventConfig.tasks) {
        const result = await this.updateTaskProgress(
          userId,
          taskCode,
          data.progress || 1
        );
        if (result) results.tasks.push(result);
      }
    }

    return results;
  }

  getEventConfig(eventType) {
    const configs = {
      SUBMISSION_CREATED: {
        exp: 10,
        description: '发布投稿',
        achievements: ['FIRST_SUBMISSION', 'SUBMISSION_10', 'SUBMISSION_50'],
        tasks: ['DAILY_SUBMISSION', 'WEEKLY_SUBMISSION_3']
      },
      SUBMISSION_APPROVED: {
        exp: 30,
        description: '投稿通过审核',
        achievements: ['FIRST_PUBLISHED', 'PUBLISHED_5', 'PUBLISHED_20'],
        tasks: []
      },
      ZINE_CREATED: {
        exp: 50,
        description: '创建刊物',
        achievements: ['FIRST_ZINE', 'ZINE_3', 'ZINE_10'],
        tasks: []
      },
      ZINE_LIKED: {
        exp: 2,
        description: '作品获得喜欢',
        achievements: ['LIKE_100', 'LIKE_1000'],
        tasks: []
      },
      SUBSCRIPTION_GAINED: {
        exp: 5,
        description: '获得新订阅',
        achievements: ['SUBSCRIBER_10', 'SUBSCRIBER_100'],
        tasks: []
      },
      TOPIC_CREATED: {
        exp: 30,
        description: '创建征稿专题',
        achievements: ['FIRST_TOPIC', 'TOPIC_5'],
        tasks: []
      },
      TOPIC_SUBMISSION_CREATED: {
        exp: 15,
        description: '参与专题投稿',
        achievements: ['TOPIC_PARTICIPATION_3'],
        tasks: []
      },
      DAILY_LOGIN: {
        exp: 5,
        description: '每日登录',
        achievements: ['LOGIN_7', 'LOGIN_30', 'LOGIN_100'],
        tasks: ['DAILY_LOGIN']
      },
      COMMENT_CREATED: {
        exp: 3,
        description: '发表评论',
        achievements: ['COMMENT_50'],
        tasks: ['DAILY_COMMENT']
      },
      EVENT_REGISTERED: {
        exp: 20,
        description: '报名线下活动',
        achievements: ['FIRST_EVENT_REGISTRATION', 'EVENT_REGISTRATION_5'],
        tasks: []
      },
      EVENT_ATTENDED: {
        exp: 50,
        description: '参加线下活动',
        achievements: ['FIRST_EVENT_ATTENDANCE', 'EVENT_ATTENDANCE_3', 'EVENT_ATTENDANCE_10'],
        tasks: []
      }
    };

    return configs[eventType] || null;
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  async getGrowthOverview(userId) {
    const growth = await this.getUserGrowth(userId);

    const levels = await this.prisma.level.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' }
    });

    const currentLevelIndex = levels.findIndex(l => l.id === growth.levelId);
    const currentLevel = levels[currentLevelIndex] || levels[0];
    const nextLevel = levels[currentLevelIndex + 1];

    const expToNext = nextLevel 
      ? nextLevel.minExp - growth.totalExp
      : 0;

    const currentLevelMinExp = currentLevelIndex > 0 
      ? levels[currentLevelIndex - 1]?.minExp || 0
      : 0;
    const expInCurrentLevel = growth.totalExp - currentLevelMinExp;
    const expForNextLevel = nextLevel ? nextLevel.minExp - currentLevelMinExp : 0;
    const progressPercent = nextLevel 
      ? Math.min(Math.round((expInCurrentLevel / expForNextLevel) * 100), 100)
      : 100;

    const badges = await this.prisma.userBadge.findMany({
      where: { userGrowthId: growth.id },
      include: { badge: true },
      orderBy: { unlockedAt: 'desc' }
    });

    const achievements = await this.prisma.userAchievement.findMany({
      where: { userGrowthId: growth.id },
      include: { achievement: true },
      orderBy: [{ isCompleted: 'desc' }, { updatedAt: 'desc' }]
    });

    const today = new Date().toISOString().split('T')[0];
    const tasks = await this.prisma.userTask.findMany({
      where: {
        userGrowthId: growth.id,
        date: today
      },
      include: { task: true },
      orderBy: { task: { sortOrder: 'asc' } }
    });

    const benefits = await this.prisma.userBenefit.findMany({
      where: { userId, isActive: true },
      include: { benefit: true }
    });

    const recentLogs = await this.prisma.growthLog.findMany({
      where: { userGrowthId: growth.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return {
      growth,
      currentLevel,
      nextLevel,
      expToNext,
      progressPercent,
      badges,
      achievements,
      tasks,
      benefits,
      recentLogs,
      stats: {
        totalBadges: badges.length,
        totalAchievements: achievements.filter(a => a.isCompleted).length,
        totalAchievementsAvailable: await this.prisma.achievement.count({ where: { isActive: true } }),
        completedTasksToday: tasks.filter(t => t.isCompleted).length,
        totalTasksToday: tasks.length
      }
    };
  }
}

module.exports = GrowthService;
