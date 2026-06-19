<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">任务中心</h1>
      <p class="page-subtitle">完成每日任务，获取经验奖励</p>
    </div>

    <div class="tasks-stats card">
      <div class="task-stat">
        <div class="task-stat-num">{{ completedToday }}</div>
        <div class="task-stat-label">今日已完成</div>
      </div>
      <div class="task-stat">
        <div class="task-stat-num">{{ totalTasks }}</div>
        <div class="task-stat-label">今日任务</div>
      </div>
      <div class="task-stat">
        <div class="task-stat-num">{{ todayExp }}</div>
        <div class="task-stat-label">今日已获 EXP</div>
      </div>
      <div class="task-stat">
        <div class="task-stat-num">{{ totalExpEarned }}</div>
        <div class="task-stat-label">累计已获 EXP</div>
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

    <div v-else>
      <div v-for="category in ['DAILY', 'WEEKLY', 'SPECIAL']" :key="category">
        <div v-if="getTasksByCategory(category).length > 0" class="category-section">
          <h3 class="category-title">{{ categoryLabel(category) }}</h3>
          <div class="tasks-list">
            <div
              v-for="item in getTasksByCategory(category)"
              :key="item.task.id"
              :class="['task-card', { completed: item.isCompleted, claimed: item.claimedAt }]"
            >
              <div class="task-icon">{{ getTaskIcon(item.task.type) }}</div>
              <div class="task-info">
                <div class="task-header">
                  <h4 class="task-name">{{ item.task.name }}</h4>
                  <span class="task-exp">+{{ item.task.expReward }} EXP</span>
                </div>
                <p class="task-desc text-sm text-muted">{{ item.task.description }}</p>
                <div class="task-progress">
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{ width: Math.min((item.progress / item.task.targetValue) * 100, 100) + '%' }"
                    ></div>
                  </div>
                  <div class="progress-text">
                    {{ item.progress }} / {{ item.task.targetValue }}
                    <span v-if="item.isCompleted && !item.claimedAt" class="text-success ml-sm">可领取奖励</span>
                    <span v-else-if="item.claimedAt" class="text-success ml-sm">✓ 已领取</span>
                  </div>
                </div>
              </div>
              <div class="task-action">
                <button
                  v-if="item.isCompleted && !item.claimedAt"
                  class="btn btn-primary btn-sm"
                  @click="claimReward(item)"
                  :disabled="claimingId === item.userTaskId"
                >
                  {{ claimingId === item.userTaskId ? '领取中...' : '领取' }}
                </button>
                <span v-else-if="item.claimedAt" class="text-sm text-success">✓ 已领取</span>
                <span v-else class="text-sm text-muted">进行中</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredTasks.length === 0" class="empty-state card py-16">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">暂无任务</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const loading = ref(true)
const claimingId = ref(null)
const currentFilter = ref('all')
const tasks = ref([])

const filters = [
  { label: '全部', value: 'all' },
  { label: '进行中', value: 'in_progress' },
  { label: '可领取', value: 'claimable' },
  { label: '已领取', value: 'claimed' }
]

const categoryLabel = (c) => ({
  DAILY: '每日任务',
  WEEKLY: '每周任务',
  SPECIAL: '特殊任务'
}[c] || c)

const getTaskIcon = (type) => {
  const icons = {
    SUBMISSION: '✍️',
    LOGIN: '🔐',
    COMMENT: '💬',
    LIKE: '❤️',
    SHARE: '🔄',
    TOPIC: '📝',
    OTHER: '🎯'
  }
  return icons[type] || '📋'
}

const completedToday = computed(() => {
  return tasks.value.filter(t => t.isCompleted).length
})

const totalTasks = computed(() => tasks.value.length)

const todayExp = computed(() => {
  return tasks.value
    .filter(t => t.claimedAt)
    .reduce((sum, t) => sum + (t.task.expReward || 0), 0)
})

const totalExpEarned = computed(() => todayExp.value)

const filteredTasks = computed(() => {
  if (currentFilter.value === 'all') return tasks.value
  if (currentFilter.value === 'in_progress') return tasks.value.filter(t => !t.isCompleted)
  if (currentFilter.value === 'claimable') return tasks.value.filter(t => t.isCompleted && !t.claimedAt)
  if (currentFilter.value === 'claimed') return tasks.value.filter(t => t.claimedAt)
  return tasks.value
})

const getTasksByCategory = (category) => {
  return filteredTasks.value.filter(t => t.task.category === category)
}

const loadTasks = async () => {
  loading.value = true
  try {
    const res = await api.get('/growth/tasks')
    tasks.value = res.tasks.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        if (a.claimedAt && !b.claimedAt) return 1
        if (!a.claimedAt && b.claimedAt) return -1
        return a.isCompleted ? -1 : 1
      }
      const progressA = a.progress / a.task.targetValue
      const progressB = b.progress / b.task.targetValue
      return progressB - progressA
    })
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const claimReward = async (item) => {
  if (!item.userTaskId) return
  claimingId.value = item.userTaskId
  try {
    await api.post(`/growth/tasks/${item.userTaskId}/claim`)
    showToast(`成功领取 ${item.task.expReward} 经验值！`, 'success')
    await loadTasks()
  } catch (e) {
    showToast(e.error || '领取失败', 'error')
  } finally {
    claimingId.value = null
  }
}

onMounted(() => loadTasks())
</script>

<style scoped>
.tasks-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 24px;
  margin-bottom: 24px;
}
@media (max-width: 640px) {
  .tasks-stats { grid-template-columns: repeat(2, 1fr); }
}
.task-stat {
  text-align: center;
}
.task-stat-num {
  font-size: 28px;
  font-weight: 700;
  font-family: var(--font-serif);
  color: var(--accent);
  margin-bottom: 4px;
}
.task-stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}
.category-section {
  margin-bottom: 32px;
}
.category-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 4px solid var(--accent);
}
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.task-card {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 20px 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  border: 2px solid transparent;
  transition: all 0.2s;
}
.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
.task-card.completed {
  border-color: var(--success);
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
}
.task-card.claimed {
  opacity: 0.7;
}
.task-icon {
  width: 56px;
  height: 56px;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 14px;
  flex-shrink: 0;
}
.task-card.completed .task-icon {
  background: linear-gradient(135deg, #bbf7d0, #86efac);
}
.task-info {
  flex: 1;
  min-width: 0;
}
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.task-name {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}
.task-exp {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
  background: var(--accent-light);
  padding: 2px 10px;
  border-radius: 100px;
}
.task-desc {
  margin-bottom: 10px;
}
.task-progress {
  margin-bottom: 0;
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
.task-card.completed .progress-fill {
  background: linear-gradient(90deg, #10b981, #059669);
}
.progress-text {
  font-size: 12px;
  color: var(--text-secondary);
}
.task-action {
  flex-shrink: 0;
}
</style>
