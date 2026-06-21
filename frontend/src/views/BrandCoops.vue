<template>
  <div class="container">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">品牌联名合作</h1>
        <p class="page-subtitle">发现品牌联名机会，共创独特刊物体验</p>
      </div>
      <router-link v-if="authStore?.isAuthenticated" to="/brand-coops/new" class="btn btn-primary">
        <span>+</span> 发起联名提案
      </router-link>
    </div>

    <div class="filters card" style="padding: 20px 24px; margin-bottom: 32px;">
      <div class="filter-row categories-row">
        <span class="filter-label">类型</span>
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
        <span class="filter-label">搜索</span>
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="search"
            type="text"
            class="search-input"
            placeholder="搜索品牌联名标题、品牌名称..."
            @input="debouncedSearch"
          >
        </div>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="brandCoops.length === 0" class="empty-state">
      <div class="empty-state-icon">🏷️</div>
      <div class="empty-state-text">暂无符合条件的品牌联名合作</div>
      <button @click="resetFilters" class="btn btn-outline">清除筛选</button>
    </div>
    <div v-else class="coop-grid">
      <router-link
        v-for="item in brandCoops"
        :key="item.id"
        :to="`/brand-coops/${item.id}`"
        class="coop-card card"
      >
        <div class="coop-cover" :style="item.coverImage ? { backgroundImage: `url(${item.coverImage})` } : {}">
          <div v-if="!item.coverImage" class="coop-cover-placeholder">
            <span class="cover-icon">🏷️</span>
          </div>
          <div class="coop-category">{{ getCategoryLabel(item.category) }}</div>
          <div v-if="item.isFeatured" class="featured-tag">⭐ 精选</div>
          <div class="kanban-tag">{{ getColumnLabel(item.kanbanColumn) }}</div>
        </div>
        <div class="coop-info">
          <div class="coop-brand">
            <img v-if="item.brandLogo" :src="item.brandLogo" class="brand-logo" alt="">
            <span v-else class="brand-logo-placeholder">🏷️</span>
            <span class="brand-name">{{ item.brandName }}</span>
          </div>
          <h3 class="coop-title font-serif">{{ item.title }}</h3>
          <p class="coop-desc">{{ item.description }}</p>
          <div class="coop-tags">
            <span v-for="tag in item.tags?.slice(0, 3)" :key="tag" class="tag">#{{ tag }}</span>
          </div>
          <div class="coop-highlights">
            <div v-if="item.budget" class="highlight-item">
              <span class="highlight-icon">💰</span>
              <span class="highlight-value">{{ item.budget }}</span>
            </div>
            <div v-if="item.startDate" class="highlight-item">
              <span class="highlight-icon">📅</span>
              <span class="highlight-value">{{ formatDate(item.startDate) }}</span>
            </div>
          </div>
          <div class="coop-meta">
            <div class="coop-creator">
              <img :src="item.creator?.avatar" alt="">
              <span>{{ item.creator?.username }}</span>
            </div>
            <div class="coop-stats">
              <span>📖 {{ item.zineCount }} 刊物</span>
              <span>📋 {{ item.scheduleCount }} 排期</span>
              <span>👁 {{ formatNum(item.viewCount) }}</span>
            </div>
          </div>
        </div>
      </router-link>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="fetchBrandCoops(page - 1)">←</button>
      <button
        v-for="p in displayPages"
        :key="p"
        :class="['page-btn', { active: p === page }]"
        @click="p !== '...' && fetchBrandCoops(p)"
        :disabled="p === '...'"
      >
        {{ p }}
      </button>
      <button class="page-btn" :disabled="page === totalPages" @click="fetchBrandCoops(page + 1)">→</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const authStore = useAuthStore()
const brandCoops = ref([])
const loading = ref(false)
const currentCategory = ref('all')
const search = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 12

const categories = ref([
  { id: 'all', name: '全部', icon: '📋' },
  { id: 'COBRANDING', name: '联名共创', icon: '🏷️' },
  { id: 'SPONSORSHIP', name: '品牌赞助', icon: '💰' },
  { id: 'CONTENT_COLLAB', name: '内容合作', icon: '📝' },
  { id: 'CROSSOVER', name: '跨界联动', icon: '🔀' },
  { id: 'OTHER', name: '其他', icon: '✨' }
])

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

const formatNum = (n) => {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n
}

const formatDate = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

const getCategoryLabel = (cat) => {
  const found = categories.value.find(c => c.id === cat)
  return found ? `${found.icon} ${found.name}` : cat
}

const getColumnLabel = (col) => {
  const map = {
    PROPOSAL: '提案', NEGOTIATING: '协商中', CONFIRMED: '已确认',
    EXECUTING: '执行中', COMPLETED: '已完成', ARCHIVED: '已归档'
  }
  return map[col] || col
}

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchBrandCoops(1), 400)
}

const setCategory = (cat) => {
  currentCategory.value = cat
  fetchBrandCoops(1)
}

const resetFilters = () => {
  currentCategory.value = 'all'
  search.value = ''
  fetchBrandCoops(1)
}

const fetchBrandCoops = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: pageSize })
    if (currentCategory.value !== 'all') params.set('category', currentCategory.value)
    if (search.value) params.set('keyword', search.value)
    const res = await api.get(`/brand-coops?${params}`)
    brandCoops.value = res.brandCoops
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchBrandCoops()
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
.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}
.cat-tab {
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
.cat-tab:hover { color: var(--text-primary); }
.cat-tab.active { background: var(--accent); color: #fff; }
.search-box {
  position: relative;
  flex: 1;
  min-width: 240px;
  max-width: 400px;
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
.search-input:focus { outline: none; border-color: var(--accent); background: #fff; }

.coop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.coop-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease;
}
.coop-card:hover { transform: translateY(-4px); }

.coop-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  background-size: cover;
  background-position: center;
}
.coop-cover-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-icon { font-size: 48px; opacity: 0.3; }

.coop-category {
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

.kanban-tag {
  position: absolute;
  bottom: 12px;
  right: 12px;
  padding: 4px 10px;
  background: rgba(82, 196, 26, 0.9);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  border-radius: 100px;
  backdrop-filter: blur(4px);
}

.coop-info { padding: 16px 18px 18px; flex: 1; display: flex; flex-direction: column; }

.coop-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.brand-logo {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: cover;
  background: var(--bg-tertiary);
}
.brand-logo-placeholder { font-size: 18px; }
.brand-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.coop-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.coop-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.coop-tags { margin-bottom: 12px; }

.coop-highlights {
  display: flex;
  gap: 16px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-light);
}
.highlight-item { display: flex; align-items: center; gap: 6px; }
.highlight-icon { font-size: 14px; }
.highlight-value { font-size: 13px; font-weight: 500; color: var(--text-primary); }

.coop-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}
.coop-creator { display: flex; align-items: center; gap: 8px; }
.coop-creator img { width: 24px; height: 24px; border-radius: 50%; background: var(--bg-tertiary); }
.coop-creator span { font-size: 12px; color: var(--text-secondary); }
.coop-stats { display: flex; gap: 10px; font-size: 12px; color: var(--text-tertiary); }

.tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 11px;
  border-radius: 4px;
  margin-right: 6px;
  margin-bottom: 4px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
}
.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-primary);
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.page-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
