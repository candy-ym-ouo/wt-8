<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">成就中心</h1>
      <p class="page-subtitle">完成挑战，解锁专属荣誉</p>
    </div>

    <div class="achievements-stats card">
      <div class="achievement-stat">
        <div class="achievement-stat-num">{{ completedCount }}</div>
        <div class="achievement-stat-label">已完成</div>
      </div>
      <div class="achievement-stat">
        <div class="achievement-stat-num">{{ allAchievements.length - completedCount }}</div>
        <div class="achievement-stat-label">进行中</div>
      </div>
      <div class="achievement-stat">
        <div class="achievement-stat-num">{{ totalExpEarned }}</div>
        <div class="achievement-stat-label">已获经验</div>
      </div>
    </div>

    <div class="filter-tabs">
      <button
        v-for="f in filters"
        :key="f.value"
        :class="['btn', currentFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
        @click="currentFilter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-16">
      <div class="text-lg text-muted">加载中...</div>
    </div>

    <div v-else class="achievements-list">
      <div
        v-for="item in filteredAchievements"
        :key="item.achievement.id"
        :class="['achievement-card', { completed: item.isCompleted }]"
      >
        <div class="achievement-icon">
          {{ item.achievement.badge?.icon || '🏆' }}
        </div>
        <div class="achievement-info">
          <div class="achievement-header">
            <h3 class="achievement-name">{{ item.achievement.name }}</h3>
            <span v-if="item.achievement.expReward > 0" class="achievement-exp">
              +{{ item.achievement.expReward }} EXP
            </span>
          </div>
          <p class="achievement-desc text-sm text-muted">{{ item.achievement.description }}</p>
          <div class="achievement-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: Math.min((item.progress / item.achievement.targetValue) * 100, 100) + '%' }"
              ></div>
            </div>
            <div class="progress-text">
              {{ item.progress }} / {{ item.achievement.targetValue }}
              <span v-if="item.isCompleted" class="text-success ml-sm">✓ 已完成</span>
            </div>
          </div>
          <div class="achievement-meta">
            <span class="achievement-category">{{ categoryLabel(item.achievement.category) }}</span>
            <span v-if="item.achievement.badge" class="achievement-badge">
              关联勋章: {{ item.achievement.badge.name }}
            </span>
          </div>
        </div>
        <div class="achievement-action">
          <button
            v-if="item.isCompleted && !item.claimedAt"
            class="btn btn-primary btn-sm"
            @click="claimReward(item)"
            :disabled="claiming"
          >
            {{ claiming ? '领取中...' : '领取奖励' }}
          </button>
          <span v-else-if="item.claimedAt" class="text-sm text-success">✓ 已领取</span>
          <span v-else class="text-sm text-muted">未完成</span>
        </div>
      </div>
    </div>

    <div v-if="filteredAchievements.length === 0 && !loading" class="empty-state card py-16">
      <div class="empty-state-icon">🏆</div>
      <div class="empty-state-text">暂无成就记录</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const loading = ref(true)
const claiming = ref(false)
const currentFilter = ref('all')
const allAchievements = ref([])

const filters = [
  { label: '全部', value: 'all' },
  { label: '已完成', value: 'completed' },
  { label: '进行中', value: 'in_progress' }
]

const categoryLabel = (c) => ({
  CREATION: '创作',
  ENGAGEMENT: '互动',
  SOCIAL: '社交',
  MILESTONE: '里程碑',
  SPECIAL: '特殊'
}[c] || c)

const completedCount = computed(() => {
  return allAchievements.value.filter(a => a.isCompleted).length
})

const totalExpEarned = computed(() => {
  return allAchievements.value
    .filter(a => a.claimedAt)
    .reduce((sum, a) => sum + (a.achievement.expReward || 0), 0)
})

const filteredAchievements = computed(() => {
  if (currentFilter.value === 'all') return allAchievements.value
  if (currentFilter.value === 'completed') return allAchievements.value.filter(a => a.isCompleted)
  return allAchievements.value.filter(a => !a.isCompleted)
})

const loadAchievements = async () => {
  loading.value = true
  try {
    const res = await api.get('/growth/my-achievements')
    allAchievements.value = res.achievements.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? -1 : 1
      if (a.claimedAt !== b.claimedAt) return a.claimedAt ? 1 : -1
      const progressA = a.progress / a.achievement.targetValue
      const progressB = b.progress / b.achievement.targetValue
      return progressB - progressA
    })
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const claimReward = async (item) => {
  if (!item.userAchievementId) return
  claiming.value = true
  try {
    await api.post(`/growth/achievements/${item.userAchievementId}/claim`)
    showToast('奖励领取成功！', 'success')
    await loadAchievements()
  } catch (e) {
    showToast(e.error || '领取失败', 'error')
  } finally {
    claiming.value = false
  }
}

onMounted(() => loadAchievements())
</script>

<style scoped>
.achievements-stats {
  display: flex;
  justify-content: space-around;
  padding: 24px;
  margin-bottom: 24px;
}
.achievement-stat {
  text-align: center;
}
.achievement-stat-num {
  font-size: 32px;
  font-weight: 700;
  font-family: var(--font-serif);
  color: var(--accent);
  margin-bottom: 4px;
}
.achievement-stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}
.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.achievement-card {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 20px 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  border: 2px solid transparent;
  transition: all 0.2s;
}
.achievement-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
.achievement-card.completed {
  border-color: var(--success);
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
}
.achievement-icon {
  width: 64px;
  height: 64px;
  font-size: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 16px;
  flex-shrink: 0;
}
.achievement-card.completed .achievement-icon {
  background: linear-gradient(135deg, #bbf7d0, #86efac);
}
.achievement-info {
  flex: 1;
  min-width: 0;
}
.achievement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.achievement-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}
.achievement-exp {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
  background: var(--accent-light);
  padding: 2px 10px;
  border-radius: 100px;
}
.achievement-desc {
  margin-bottom: 12px;
}
.achievement-progress {
  margin-bottom: 10px;
}
.progress-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #f97316);
  border-radius: 4px;
  transition: width 0.5s;
}
.achievement-card.completed .progress-fill {
  background: linear-gradient(90deg, #10b981, #059669);
}
.progress-text {
  font-size: 12px;
  color: var(--text-secondary);
}
.achievement-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}
.achievement-category {
  display: inline-flex;
  padding: 2px 10px;
  background: var(--bg-tertiary);
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
}
.achievement-badge {
  font-size: 11px;
  color: var(--text-tertiary);
}
.achievement-action {
  flex-shrink: 0;
}
</style>
