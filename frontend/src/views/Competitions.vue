<template>
  <div class="container">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">创作比赛</h1>
        <p class="page-subtitle">参与创作赛事，展示才华，赢取荣誉</p>
      </div>
      <router-link v-if="authStore?.isAuthenticated" to="/competitions/new" class="btn btn-primary">
        <span>+</span> 发起比赛
      </router-link>
    </div>

    <div class="filters card" style="padding: 20px 24px; margin-bottom: 32px;">
      <div class="filter-row categories-row">
        <span class="filter-label">分类</span>
        <div class="category-tabs">
          <button
            v-for="cat in categories"
            :key="cat.id"
            :class="['cat-tab', { active: currentCategory === cat.id }]"
            @click="setCategory(cat.id)"
          >
            <span>{{ cat.icon }}</span> {{ cat.name }}
          </button>
        </div>
      </div>
      <div class="filter-row">
        <span class="filter-label">排序</span>
        <div class="sort-tabs">
          <button
            v-for="sort in sortOptions"
            :key="sort.id"
            :class="['sort-tab', { active: currentSort === sort.id }]"
            @click="setSort(sort.id)"
          >
            {{ sort.name }}
          </button>
        </div>
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="search"
            type="text"
            class="search-input"
            placeholder="搜索比赛..."
            @input="debouncedSearch"
          >
        </div>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="competitions.length === 0" class="empty-state">
      <div class="empty-state-icon">🏆</div>
      <div class="empty-state-text">暂无符合条件的比赛</div>
      <button @click="resetFilters" class="btn btn-outline">清除筛选</button>
    </div>
    <div v-else class="comp-grid">
      <router-link
        v-for="item in competitions"
        :key="item.id"
        :to="`/competitions/${item.id}`"
        class="comp-card card"
      >
        <div class="comp-cover" :style="item.coverImage ? { backgroundImage: `url(${item.coverImage})` } : {}">
          <div v-if="!item.coverImage" class="comp-cover-placeholder">
            <span class="cover-icon">🏆</span>
          </div>
          <div class="comp-category">{{ getCategoryLabel(item.category) }}</div>
          <div v-if="item.isFeatured" class="featured-tag">⭐ 精选</div>
          <div :class="['phase-tag', `phase-${item.phase.toLowerCase()}`]">{{ phaseLabel(item.phase) }}</div>
        </div>
        <div class="comp-info">
          <h3 class="comp-title font-serif">{{ item.title }}</h3>
          <p class="comp-desc">{{ item.description }}</p>

          <div v-if="item.prizes" class="prizes-section">
            <span class="prizes-icon">🎁</span>
            <span class="prizes-text">{{ item.prizes }}</span>
          </div>

          <div class="comp-stats">
            <div class="stat">
              <span class="stat-value">{{ item.entryCount || 0 }}</span>
              <span class="stat-label">投稿</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ formatDateShort(item.startDate) }}</span>
              <span class="stat-label">开始</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ formatDateShort(item.endDate) }}</span>
              <span class="stat-label">截止</span>
            </div>
          </div>

          <div class="comp-meta">
            <div class="comp-creator">
              <img :src="item.creator?.avatar" alt="">
              <span>{{ item.creator?.username }}</span>
            </div>
            <div class="comp-views">{{ item.viewCount }} 浏览</div>
          </div>
        </div>
      </router-link>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="fetchCompetitions(page - 1)">←</button>
      <button
        v-for="p in displayPages"
        :key="p"
        :class="['page-btn', { active: p === page }]"
        @click="p !== '...' && fetchCompetitions(p)"
        :disabled="p === '...'"
      >
        {{ p }}
      </button>
      <button class="page-btn" :disabled="page === totalPages" @click="fetchCompetitions(page + 1)">→</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const authStore = useAuthStore()
const competitions = ref([])
const loading = ref(false)
const currentCategory = ref('all')
const currentSort = ref('newest')
const search = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 12

const categories = ref([
  { id: 'all', name: '全部', icon: '📋' },
  { id: 'CREATION', name: '创作', icon: '✍️' },
  { id: 'ILLUSTRATION', name: '插画', icon: '🎨' },
  { id: 'PHOTOGRAPHY', name: '摄影', icon: '📷' },
  { id: 'WRITING', name: '文学', icon: '📝' },
  { id: 'DESIGN', name: '设计', icon: '🖌️' },
  { id: 'OTHER', name: '其他', icon: '✨' }
])

const sortOptions = [
  { id: 'newest', name: '最新发布' },
  { id: 'most-entries', name: '投稿最多' },
  { id: 'ending-soon', name: '即将截止' }
]

const totalPages = computed(() => Math.ceil(total.value / pageSize))

const displayPages = computed(() => {
  const totalP = totalPages.value
  const p = page.value
  if (totalP <= 7) return Array.from({ length: totalP }, (_, i) => i + 1)
  const pages = [1]
  if (p > 3) pages.push('...')
  for (let i = Math.max(2, p - 1); i <= Math.min(totalP - 1, p + 1); i++) pages.push(i)
  if (p < totalP - 2) pages.push('...')
  pages.push(totalP)
  return pages
})

const formatDateShort = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const getCategoryLabel = (cat) => {
  const found = categories.value.find(c => c.id === cat)
  return found ? `${found.icon} ${found.name}` : cat
}

const phaseLabel = (phase) => {
  const map = { UPCOMING: '即将开始', ONGOING: '进行中', ENDED: '已结束', COMPLETED: '已完赛' }
  return map[phase] || phase
}

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchCompetitions(1), 400)
}

const setCategory = (cat) => {
  currentCategory.value = cat
  fetchCompetitions(1)
}

const setSort = (sort) => {
  currentSort.value = sort
  fetchCompetitions(1)
}

const resetFilters = () => {
  currentCategory.value = 'all'
  currentSort.value = 'newest'
  search.value = ''
  fetchCompetitions(1)
}

const fetchCompetitions = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({
      page: newPage,
      limit: pageSize,
      sort: currentSort.value
    })
    if (currentCategory.value !== 'all') params.set('category', currentCategory.value)
    if (search.value) params.set('keyword', search.value)
    const res = await api.get(`/competitions?${params}`)
    competitions.value = res.competitions
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCompetitions()
})
</script>

<style scoped>
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.filter-row + .filter-row { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-light); }
.filter-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 48px;
}
.category-tabs, .sort-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}
.cat-tab, .sort-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-tertiary);
  border-radius: 100px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.cat-tab:hover, .sort-tab:hover { color: var(--text-primary); }
.cat-tab.active, .sort-tab.active {
  background: var(--accent);
  color: #fff;
}
.search-box {
  position: relative;
  width: 280px;
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.5;
}
.search-input {
  width: 100%;
  padding: 10px 14px 10px 40px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  transition: all 0.2s;
}
.search-input:focus {
  outline: none;
  border-color: var(--accent);
  background: #fff;
}

.comp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.comp-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.comp-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

.comp-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  background-size: cover;
  background-position: center;
}

.comp-cover-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-icon {
  font-size: 48px;
  opacity: 0.3;
}

.comp-category {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  background: rgba(45, 42, 38, 0.8);
  color: #fff;
  font-size: 11px;
  border-radius: 100px;
  backdrop-filter: blur(4px);
}

.featured-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #5c4a00;
  font-size: 11px;
  font-weight: 600;
  border-radius: 100px;
}

.phase-tag {
  position: absolute;
  bottom: 12px;
  left: 12px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 100px;
  backdrop-filter: blur(4px);
}

.phase-upcoming { background: rgba(24, 144, 255, 0.85); color: #fff; }
.phase-ongoing { background: rgba(82, 196, 26, 0.85); color: #fff; }
.phase-ended { background: rgba(0, 0, 0, 0.5); color: #fff; }
.phase-completed { background: rgba(114, 46, 209, 0.85); color: #fff; }

.comp-info { padding: 16px 18px 18px; flex: 1; display: flex; flex-direction: column; }

.comp-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.comp-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.prizes-section {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #fff7e6, #ffe7ba);
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
  font-size: 13px;
}

.prizes-icon { font-size: 14px; }
.prizes-text { color: #ad6800; font-weight: 500; }

.comp-stats {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.stat { text-align: center; flex: 1; }
.stat-value { display: block; font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px; }
.stat-label { font-size: 11px; color: var(--text-tertiary); }

.comp-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.comp-creator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comp-creator img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.comp-creator span {
  font-size: 12px;
  color: var(--text-secondary);
}

.comp-views {
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
