<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">作者成长中心</h1>
      <p class="page-subtitle">记录你的创作足迹，解锁专属荣誉</p>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="text-lg text-muted">加载中...</div>
    </div>

    <div v-else class="growth-layout">
      <div class="growth-main">
        <div class="level-card card">
          <div class="level-header">
            <div class="level-icon">{{ overview?.currentLevel?.icon || '🌟' }}</div>
            <div class="level-info">
              <div class="level-name">{{ overview?.currentLevel?.name || '新手作者' }}</div>
              <div class="level-num">Lv.{{ overview?.currentLevel?.level || 1 }}</div>
            </div>
            <div class="exp-info">
              <div class="exp-text">
                经验值: <span class="font-semibold">{{ overview?.growth?.totalExp || 0 }}</span>
              </div>
              <div v-if="overview?.nextLevel" class="text-sm text-muted mt-sm">
                距离 {{ overview.nextLevel.name }} 还需 {{ overview.expToNext }} EXP
              </div>
              <div v-else class="text-sm text-accent mt-sm">
                已达最高等级！
              </div>
            </div>
          </div>
          <div class="exp-bar">
            <div class="exp-progress" :style="{ width: (overview?.progressPercent || 0) + '%' }"></div>
          </div>
          <div class="exp-label">
            <span>{{ overview?.progressPercent || 0 }}%</span>
            <span v-if="overview?.nextLevel">
              下一等级: {{ overview.nextLevel.name }}
            </span>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-mini card" @click="$router.push('/badges')">
            <div class="stat-mini-icon">🏅</div>
            <div class="stat-mini-info">
              <div class="stat-mini-num">{{ overview?.stats?.totalBadges || 0 }}</div>
              <div class="stat-mini-label">获得勋章</div>
            </div>
          </div>
          <div class="stat-mini card" @click="$router.push('/achievements')">
            <div class="stat-mini-icon">🏆</div>
            <div class="stat-mini-info">
              <div class="stat-mini-num">
                {{ overview?.stats?.totalAchievements || 0 }} / {{ overview?.stats?.totalAchievementsAvailable || 0 }}
              </div>
              <div class="stat-mini-label">成就解锁</div>
            </div>
          </div>
          <div class="stat-mini card" @click="$router.push('/tasks')">
            <div class="stat-mini-icon">📋</div>
            <div class="stat-mini-info">
              <div class="stat-mini-num">
                {{ overview?.stats?.completedTasksToday || 0 }} / {{ overview?.stats?.totalTasksToday || 0 }}
              </div>
              <div class="stat-mini-label">今日任务</div>
            </div>
          </div>
        </div>

        <div class="quick-actions card">
          <h3 class="card-title">快捷入口</h3>
          <div class="action-grid">
            <button class="action-item" @click="$router.push('/submissions/new')">
              <span class="action-icon">✍️</span>
              <span class="action-label">发布投稿</span>
              <span class="action-bonus">+10 EXP</span>
            </button>
            <button class="action-item" @click="$router.push('/topics')">
              <span class="action-icon">📝</span>
              <span class="action-label">参与征稿</span>
              <span class="action-bonus">+15 EXP</span>
            </button>
            <button class="action-item" @click="$router.push('/tasks')">
              <span class="action-icon">🎯</span>
              <span class="action-label">每日任务</span>
              <span class="action-bonus">领取奖励</span>
            </button>
            <button class="action-item" @click="$router.push('/badges')">
              <span class="action-icon">🎖️</span>
              <span class="action-label">勋章墙</span>
              <span class="action-bonus">查看荣誉</span>
            </button>
          </div>
        </div>

        <div class="section-card card">
          <div class="section-header">
            <h3 class="card-title">近期动态</h3>
            <button class="btn btn-ghost btn-sm" @click="loadLogs">刷新</button>
          </div>
          <div v-if="logsLoading" class="text-center py-8 text-sm text-muted">加载中...</div>
          <div v-else-if="logs.length === 0" class="empty-state py-8">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-text text-sm">暂无动态记录</div>
          </div>
          <div v-else class="log-list">
            <div v-for="log in logs" :key="log.id" class="log-item">
              <div :class="['log-icon', log.type]">
                {{ getLogIcon(log.type) }}
              </div>
              <div class="log-content">
                <div class="log-desc">{{ log.description }}</div>
                <div class="log-meta">
                  <span v-if="log.amount > 0" class="log-exp">+{{ log.amount }} EXP</span>
                  <span class="log-date">{{ formatDate(log.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="growth-side">
        <div class="side-card card">
          <h3 class="card-title">我的权益</h3>
          <div v-if="overview?.benefits?.length === 0" class="text-sm text-muted text-center py-4">
            提升等级解锁更多权益
          </div>
          <div v-else class="benefit-list">
            <div v-for="ub in overview.benefits" :key="ub.id" class="benefit-item active">
              <span class="benefit-icon">✅</span>
              <div class="benefit-info">
                <div class="benefit-name">{{ ub.benefit.name }}</div>
                <div class="benefit-desc text-xs text-muted">{{ ub.benefit.description }}</div>
              </div>
            </div>
          </div>
          <div v-if="overview?.allBenefits" class="mt-lg">
            <div class="text-xs text-muted mb-sm">更多权益（等级达到后自动解锁）</div>
            <div v-for="b in lockedBenefits" :key="b.id" class="benefit-item locked">
              <span class="benefit-icon">🔒</span>
              <div class="benefit-info">
                <div class="benefit-name">{{ b.name }}</div>
                <div class="benefit-desc text-xs text-muted">Lv.{{ b.minLevel }} 解锁</div>
              </div>
            </div>
          </div>
        </div>

        <div class="side-card card">
          <div class="section-header">
            <h3 class="card-title">最新勋章</h3>
            <button class="btn btn-ghost btn-sm" @click="$router.push('/badges')">查看全部</button>
          </div>
          <div v-if="overview?.badges?.length === 0" class="text-sm text-muted text-center py-8">
            暂无勋章，继续努力！
          </div>
          <div v-else class="badge-preview">
            <div v-for="ub in overview.badges.slice(0, 6)" :key="ub.id" class="badge-preview-item">
              <div class="badge-icon">{{ ub.badge.icon }}</div>
              <div class="badge-name text-xs">{{ ub.badge.name }}</div>
            </div>
          </div>
        </div>

        <div class="side-card card">
          <div class="section-header">
            <h3 class="card-title">等级特权</h3>
          </div>
          <div class="level-list">
            <div
              v-for="level in levels"
              :key="level.id"
              :class="['level-item', { active: level.id === overview?.currentLevel?.id, locked: level.level > (overview?.currentLevel?.level || 0) }]"
            >
              <div class="level-item-icon">{{ level.icon || '⭐' }}</div>
              <div class="level-item-info">
                <div class="level-item-name">{{ level.name }}</div>
                <div class="level-item-exp text-xs text-muted">{{ level.minExp }} EXP 解锁</div>
              </div>
              <div v-if="level.id === overview?.currentLevel?.id" class="level-current">当前</div>
              <div v-else-if="level.level > (overview?.currentLevel?.level || 0)" class="level-locked">🔒</div>
              <div v-else class="level-unlocked">✓</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const loading = ref(true)
const logsLoading = ref(false)
const overview = ref(null)
const logs = ref([])
const levels = ref([])

const lockedBenefits = computed(() => {
  if (!overview.value?.allBenefits || !overview.value?.benefits) return []
  const unlockedIds = overview.value.benefits.map(b => b.benefitId)
  return overview.value.allBenefits.filter(b => !unlockedIds.includes(b.id))
})

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const getLogIcon = (type) => {
  const icons = {
    EXP: '⭐',
    BADGE: '🏅',
    ACHIEVEMENT: '🏆',
    TASK: '✅',
    LEVEL_UP: '⬆️',
    ADMIN: '🎁'
  }
  return icons[type] || '📌'
}

const loadOverview = async () => {
  loading.value = true
  try {
    const [resOverview, resLevels] = await Promise.all([
      api.get('/growth/overview'),
      api.get('/growth/levels')
    ])
    overview.value = resOverview.overview
    levels.value = resLevels.levels
    await loadLogs()
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const loadLogs = async () => {
  logsLoading.value = true
  try {
    const res = await api.get('/growth/logs?limit=10')
    logs.value = res.logs || []
  } catch (e) {}
  finally { logsLoading.value = false }
}

onMounted(() => loadOverview())
</script>

<style scoped>
.growth-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  align-items: start;
}
@media (max-width: 960px) {
  .growth-layout { grid-template-columns: 1fr; }
}
.level-card { padding: 28px; }
.level-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}
.level-icon {
  width: 72px;
  height: 72px;
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-radius: 20px;
  flex-shrink: 0;
}
.level-info { flex: 1; }
.level-name {
  font-size: 24px;
  font-weight: 700;
  font-family: var(--font-serif);
  margin-bottom: 4px;
}
.level-num {
  font-size: 14px;
  color: var(--accent);
  font-weight: 600;
}
.exp-info { text-align: right; }
.exp-text { font-size: 14px; }
.exp-bar {
  height: 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}
.exp-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #f97316);
  border-radius: 6px;
  transition: width 0.5s;
}
.exp-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 16px;
}
.stat-mini {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-mini:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
.stat-mini-icon {
  width: 48px;
  height: 48px;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 12px;
}
.stat-mini-num {
  font-size: 22px;
  font-weight: 700;
  font-family: var(--font-serif);
  line-height: 1.2;
}
.stat-mini-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.quick-actions { padding: 24px; margin-top: 16px; }
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
@media (max-width: 640px) {
  .action-grid { grid-template-columns: repeat(2, 1fr); }
}
.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius);
  transition: all 0.2s;
}
.action-item:hover {
  background: var(--accent-light);
  transform: translateY(-2px);
}
.action-icon { font-size: 28px; }
.action-label { font-size: 13px; font-weight: 500; }
.action-bonus {
  font-size: 11px;
  color: var(--accent);
  background: var(--accent-light);
  padding: 2px 8px;
  border-radius: 100px;
}
.section-card { padding: 24px; margin-top: 16px; }
.log-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.log-item {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}
.log-item:hover { background: var(--bg-tertiary); }
.log-icon {
  width: 36px;
  height: 36px;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 10px;
  flex-shrink: 0;
}
.log-icon.EXP { background: #fef3c7; }
.log-icon.BADGE { background: #ede9fe; }
.log-icon.ACHIEVEMENT { background: #ffedd5; }
.log-icon.TASK { background: #dcfce7; }
.log-icon.LEVEL_UP { background: #dbeafe; }
.log-content { flex: 1; min-width: 0; }
.log-desc { font-size: 14px; margin-bottom: 4px; }
.log-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}
.log-exp {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
}
.log-date {
  font-size: 12px;
  color: var(--text-tertiary);
}
.side-card { padding: 24px; margin-bottom: 16px; }
.benefit-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.benefit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
}
.benefit-item.active { background: var(--success-light); }
.benefit-item.locked { opacity: 0.6; }
.benefit-icon { font-size: 18px; }
.benefit-name { font-size: 13px; font-weight: 500; }
.benefit-desc { margin-top: 2px; }
.badge-preview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.badge-preview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  text-align: center;
}
.badge-icon { font-size: 32px; }
.badge-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
.level-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.level-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}
.level-item:hover { background: var(--bg-tertiary); }
.level-item.active {
  background: var(--accent-light);
  border: 1px solid var(--accent);
}
.level-item.locked { opacity: 0.5; }
.level-item-icon {
  font-size: 24px;
  width: 36px;
  text-align: center;
}
.level-item-info { flex: 1; }
.level-item-name { font-size: 14px; font-weight: 500; }
.level-current {
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
  background: var(--bg-primary);
  padding: 2px 8px;
  border-radius: 100px;
}
.level-locked, .level-unlocked { font-size: 14px; }
.level-unlocked { color: var(--success); }
</style>
