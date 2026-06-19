<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">勋章墙</h1>
      <p class="page-subtitle">收集创作路上的每一份荣誉</p>
    </div>

    <div class="badges-stats card">
      <div class="badge-stat">
        <div class="badge-stat-num">{{ unlockedCount }}</div>
        <div class="badge-stat-label">已获得</div>
      </div>
      <div class="badge-stat">
        <div class="badge-stat-num">{{ allBadges.length - unlockedCount }}</div>
        <div class="badge-stat-label">待解锁</div>
      </div>
      <div class="badge-stat">
        <div class="badge-stat-num">{{ allBadges.length }}</div>
        <div class="badge-stat-label">全部勋章</div>
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

    <div v-else class="badges-grid">
      <div
        v-for="badge in filteredBadges"
        :key="badge.id"
        :class="['badge-card', { unlocked: badge.unlocked, locked: !badge.unlocked }]"
      >
        <div class="badge-card-icon">{{ badge.icon }}</div>
        <div class="badge-card-info">
          <div class="badge-card-name">{{ badge.name }}</div>
          <div class="badge-card-desc text-sm text-muted">{{ badge.description }}</div>
          <div class="badge-card-meta">
            <span :class="['badge-rarity', badge.rarity]">{{ rarityLabel(badge.rarity) }}</span>
            <span v-if="badge.expReward > 0" class="badge-exp">+{{ badge.expReward }} EXP</span>
          </div>
          <div v-if="badge.unlocked" class="badge-unlocked">
            <span class="text-sm text-success">✓ 已获得</span>
            <span v-if="badge.unlockedAt" class="text-xs text-muted">{{ formatDate(badge.unlockedAt) }}</span>
          </div>
          <div v-else class="badge-locked">
            <span class="text-sm text-muted">🔒 未解锁</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="filteredBadges.length === 0 && !loading" class="empty-state card py-16">
      <div class="empty-state-icon">🏅</div>
      <div class="empty-state-text">暂无勋章，继续努力创作吧！</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const loading = ref(true)
const currentFilter = ref('all')
const allBadges = ref([])
const myBadges = ref([])

const filters = [
  { label: '全部', value: 'all' },
  { label: '已获得', value: 'unlocked' },
  { label: '未解锁', value: 'locked' }
]

const rarityLabel = (r) => ({
  COMMON: '普通',
  RARE: '稀有',
  EPIC: '史诗',
  LEGENDARY: '传说'
}[r] || r)

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const unlockedCount = computed(() => {
  return allBadges.value.filter(b => b.unlocked).length
})

const filteredBadges = computed(() => {
  if (currentFilter.value === 'all') return allBadges.value
  if (currentFilter.value === 'unlocked') return allBadges.value.filter(b => b.unlocked)
  return allBadges.value.filter(b => !b.unlocked)
})

const loadBadges = async () => {
  loading.value = true
  try {
    const [resAll, resMy] = await Promise.all([
      api.get('/growth/badges'),
      api.get('/growth/my-badges')
    ])

    const myBadgeIds = new Set(resMy.badges.map(b => b.badgeId))
    allBadges.value = resAll.badges.map(badge => {
      const userBadge = resMy.badges.find(ub => ub.badgeId === badge.id)
      return {
        ...badge,
        unlocked: myBadgeIds.has(badge.id),
        unlockedAt: userBadge?.unlockedAt
      }
    })

    const rarityOrder = { LEGENDARY: 0, EPIC: 1, RARE: 2, COMMON: 3 }
    allBadges.value.sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
      return rarityOrder[a.rarity] - rarityOrder[b.rarity]
    })

    myBadges.value = resMy.badges
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadBadges())
</script>

<style scoped>
.badges-stats {
  display: flex;
  justify-content: space-around;
  padding: 24px;
  margin-bottom: 24px;
}
.badge-stat {
  text-align: center;
}
.badge-stat-num {
  font-size: 32px;
  font-weight: 700;
  font-family: var(--font-serif);
  color: var(--accent);
  margin-bottom: 4px;
}
.badge-stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}
.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.badge-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  border: 2px solid transparent;
  transition: all 0.2s;
}
.badge-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
.badge-card.unlocked {
  border-color: var(--accent);
  background: linear-gradient(135deg, #fff7ed, #ffedd5);
}
.badge-card.locked {
  opacity: 0.6;
}
.badge-card-icon {
  width: 64px;
  height: 64px;
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 16px;
  flex-shrink: 0;
}
.badge-card.unlocked .badge-card-icon {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
}
.badge-card-info { flex: 1; min-width: 0; }
.badge-card-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}
.badge-card-desc {
  margin-bottom: 10px;
  line-height: 1.5;
}
.badge-card-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.badge-rarity {
  display: inline-flex;
  padding: 2px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
}
.badge-rarity.COMMON { background: #e5e7eb; color: #374151; }
.badge-rarity.RARE { background: #dbeafe; color: #1d4ed8; }
.badge-rarity.EPIC { background: #ede9fe; color: #7c3aed; }
.badge-rarity.LEGENDARY { background: #fef3c7; color: #d97706; }
.badge-exp {
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
}
.badge-unlocked, .badge-locked {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
