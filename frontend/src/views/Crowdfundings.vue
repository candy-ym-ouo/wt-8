<template>
  <div class="container">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">众筹预售</h1>
        <p class="page-subtitle">发现精彩刊物，支持创作者，一起让好内容诞生</p>
      </div>
      <router-link v-if="authStore?.isAuthenticated" to="/crowdfundings/new" class="btn btn-primary">
        <span>+</span> 发起众筹
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
            placeholder="搜索众筹项目..."
            @input="debouncedSearch"
          >
        </div>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="crowdfundings.length === 0" class="empty-state">
      <div class="empty-state-icon">🎯</div>
      <div class="empty-state-text">暂无符合条件的众筹项目</div>
      <button @click="resetFilters" class="btn btn-outline">清除筛选</button>
    </div>
    <div v-else class="cf-grid">
      <router-link
        v-for="item in crowdfundings"
        :key="item.id"
        :to="`/crowdfundings/${item.id}`"
        class="cf-card card"
      >
        <div class="cf-cover" :style="item.coverImage ? { backgroundImage: `url(${item.coverImage})` } : {}">
          <div v-if="!item.coverImage" class="cf-cover-placeholder">
            <span class="cover-icon">📖</span>
          </div>
          <div class="cf-category">{{ getCategoryLabel(item.category) }}</div>
          <div v-if="item.isFeatured" class="featured-tag">⭐ 精选</div>
          <div v-if="item.status === 'SUCCESSFUL'" class="success-tag">🎉 已达成</div>
          <div v-else-if="item.deadline && new Date(item.deadline) < new Date()" class="ended-tag">已结束</div>
        </div>
        <div class="cf-info">
          <h3 class="cf-title font-serif">{{ item.title }}</h3>
          <p class="cf-desc">{{ item.description }}</p>
          
          <div class="progress-section">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: item.progress + '%' }"></div>
            </div>
            <div class="progress-stats">
              <div class="stat">
                <span class="stat-value">¥{{ formatMoney(item.currentAmount) }}</span>
                <span class="stat-label">已筹</span>
              </div>
              <div class="stat">
                <span class="stat-value accent">{{ item.progress }}%</span>
                <span class="stat-label">进度</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ item.backerCount }}</span>
                <span class="stat-label">支持者</span>
              </div>
            </div>
          </div>

          <div v-if="item.tiers?.length > 0" class="tiers-preview">
            <span class="tiers-label">{{ item.tiers.length }} 个档位</span>
            <span class="price-range">
              ¥{{ formatMoney(getMinPrice(item.tiers)) }} 起
            </span>
          </div>

          <div class="cf-meta">
            <div class="cf-creator">
              <img :src="item.creator?.avatar" alt="">
              <span>{{ item.creator?.username }}</span>
            </div>
            <div v-if="item.deadline" class="deadline">
              <span v-if="new Date(item.deadline) > new Date()">⏰ {{ getDaysLeft(item.deadline) }} 天</span>
              <span v-else>已结束</span>
            </div>
          </div>
        </div>
      </router-link>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="page === 1"
        @click="fetchCrowdfundings(page - 1)"
      >
        ←
      </button>
      <button
        v-for="p in displayPages"
        :key="p"
        :class="['page-btn', { active: p === page }]"
        @click="p !== '...' && fetchCrowdfundings(p)"
        :disabled="p === '...'"
      >
        {{ p }}
      </button>
      <button
        class="page-btn"
        :disabled="page === totalPages"
        @click="fetchCrowdfundings(page + 1)"
      >
        →
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const authStore = useAuthStore()
const crowdfundings = ref([])
const loading = ref(false)
const currentCategory = ref('all')
const currentSort = ref('newest')
const search = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 12

const categories = ref([
  { id: 'all', name: '全部', icon: '📋' },
  { id: 'ZINE', name: '刊物', icon: '📖' },
  { id: 'ART', name: '艺术', icon: '🎨' },
  { id: 'BOOK', name: '书籍', icon: '📚' },
  { id: 'MUSIC', name: '音乐', icon: '🎵' },
  { id: 'GAME', name: '游戏', icon: '🎮' },
  { id: 'TECH', name: '科技', icon: '💻' },
  { id: 'OTHER', name: '其他', icon: '✨' }
])

const sortOptions = [
  { id: 'newest', name: '最新发布' },
  { id: 'most-funded', name: '筹款最多' },
  { id: 'most-backers', name: '支持最多' },
  { id: 'ending-soon', name: '即将结束' }
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

const formatMoney = (amount) => {
  if (!amount) return '0'
  if (amount >= 10000) return (amount / 10000).toFixed(1) + '万'
  return Math.floor(amount).toLocaleString()
}

const getMinPrice = (tiers) => {
  if (!tiers || tiers.length === 0) return 0
  return Math.min(...tiers.map(t => t.price))
}

const getDaysLeft = (deadline) => {
  const now = new Date()
  const end = new Date(deadline)
  const diff = end - now
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

const getCategoryLabel = (cat) => {
  const found = categories.value.find(c => c.id === cat)
  return found ? `${found.icon} ${found.name}` : cat
}

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchCrowdfundings(1), 400)
}

const setCategory = (cat) => {
  currentCategory.value = cat
  fetchCrowdfundings(1)
}

const setSort = (sort) => {
  currentSort.value = sort
  fetchCrowdfundings(1)
}

const resetFilters = () => {
  currentCategory.value = 'all'
  currentSort.value = 'newest'
  search.value = ''
  fetchCrowdfundings(1)
}

const fetchCrowdfundings = async (newPage = 1) => {
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
    const res = await api.get(`/crowdfundings?${params}`)
    crowdfundings.value = res.crowdfundings
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCrowdfundings()
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

.cf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.cf-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.cf-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

.cf-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: cover;
  background-position: center;
}

.cf-cover-placeholder {
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

.cf-category {
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

.success-tag {
  position: absolute;
  bottom: 12px;
  left: 12px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #52c41a, #389e0d);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 100px;
}

.ended-tag {
  position: absolute;
  bottom: 12px;
  right: 12px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  border-radius: 100px;
}

.cf-info { padding: 16px 18px 18px; flex: 1; display: flex; flex-direction: column; }

.cf-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cf-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.progress-section { margin-bottom: 14px; }

.progress-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 100px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #ff85c0);
  border-radius: 100px;
  transition: width 0.5s ease;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.stat {
  text-align: center;
  flex: 1;
}

.stat-value {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.stat-value.accent { color: var(--accent); }

.stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.tiers-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  margin-bottom: 14px;
}

.tiers-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.price-range {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}

.cf-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.cf-creator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cf-creator img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.cf-creator span {
  font-size: 12px;
  color: var(--text-secondary);
}

.deadline {
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
