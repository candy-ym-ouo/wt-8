<template>
  <div class="container">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">Zine 交换市集</h1>
        <p class="page-subtitle">发现志同道合的创作者，交换你心仪的 Zine 刊物</p>
      </div>
      <router-link v-if="authStore?.isAuthenticated" to="/swap/new" class="btn btn-primary">
        <span>+</span> 发布交换需求
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
        <span class="filter-label">交换方式</span>
        <div class="category-tabs">
          <button
            v-for="t in exchangeTypes"
            :key="t.id"
            :class="['cat-tab', { active: currentExchangeType === t.id }]"
            @click="setExchangeType(t.id)"
          >
            {{ t.name }}
          </button>
        </div>
      </div>
      <div class="filter-row">
        <span class="filter-label">品相</span>
        <div class="category-tabs">
          <button
            v-for="c in conditions"
            :key="c.id"
            :class="['cat-tab', { active: currentCondition === c.id }]"
            @click="setCondition(c.id)"
          >
            {{ c.name }}
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
            placeholder="搜索标题、描述、刊物名称或作者..."
            @input="debouncedSearch"
          >
        </div>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="listings.length === 0" class="empty-state">
      <div class="empty-state-icon">🔄</div>
      <div class="empty-state-text">暂无符合条件的交换需求</div>
      <button @click="resetFilters" class="btn btn-outline">清除筛选</button>
    </div>
    <div v-else class="swap-grid">
      <router-link
        v-for="item in listings"
        :key="item.id"
        :to="`/swap/${item.id}`"
        class="swap-card card"
      >
        <div class="swap-cover" :style="item.coverImage ? { backgroundImage: `url(${item.coverImage})` } : {}">
          <div v-if="!item.coverImage" class="swap-cover-placeholder">
            <span class="cover-icon">🔄</span>
          </div>
          <div class="swap-category">{{ getCategoryLabel(item.category) }}</div>
          <div v-if="item.isFeatured" class="featured-tag">⭐ 精选</div>
          <div v-if="item.status === 'CLOSED'" class="closed-tag">已关闭</div>
          <div v-if="item.status === 'COMPLETED'" class="completed-tag">已完成</div>
        </div>
        <div class="swap-info">
          <h3 class="swap-title font-serif">{{ item.title }}</h3>
          <div class="swap-zines">
            <div class="zine-row have">
              <span class="zine-label">📖 有</span>
              <span class="zine-name">{{ item.haveZineTitle || item.haveZine?.title || '未指定' }}</span>
            </div>
            <div class="swap-arrow">↓</div>
            <div class="zine-row want">
              <span class="zine-label">🎯 求</span>
              <span class="zine-name">{{ item.wantZineTitle || item.wantZine?.title || '未指定' }}</span>
            </div>
          </div>
          <div class="swap-tags">
            <span v-for="tag in item.haveTags?.slice(0, 2)" :key="'h-' + tag" class="tag have-tag">#{{ tag }}</span>
            <span v-for="tag in item.wantTags?.slice(0, 2)" :key="'w-' + tag" class="tag want-tag">求#{{ tag }}</span>
          </div>
          <div class="swap-highlights">
            <div v-if="item.location" class="highlight-item">
              <span class="highlight-icon">📍</span>
              <span class="highlight-value">{{ item.location }}</span>
            </div>
            <div class="highlight-item">
              <span class="highlight-icon">{{ getExchangeIcon(item.exchangeType) }}</span>
              <span class="highlight-value">{{ getExchangeLabel(item.exchangeType) }}</span>
            </div>
          </div>
          <div class="swap-meta">
            <div class="swap-creator">
              <img :src="item.creator?.avatar" alt="">
              <span>{{ item.creator?.username }}</span>
            </div>
            <div class="swap-stats">
              <span>🤝 {{ item.matchCount }} 匹配</span>
              <span>👁 {{ formatNum(item.viewCount) }}</span>
            </div>
          </div>
        </div>
      </router-link>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="page === 1"
        @click="fetchListings(page - 1)"
      >
        ←
      </button>
      <button
        v-for="p in displayPages"
        :key="p"
        :class="['page-btn', { active: p === page }]"
        @click="p !== '...' && fetchListings(p)"
        :disabled="p === '...'"
      >
        {{ p }}
      </button>
      <button
        class="page-btn"
        :disabled="page === totalPages"
        @click="fetchListings(page + 1)"
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
const listings = ref([])
const loading = ref(false)
const currentCategory = ref('all')
const currentExchangeType = ref('all')
const currentCondition = ref('all')
const search = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 12

const categories = ref([
  { id: 'all', name: '全部', icon: '📋' },
  { id: 'ZINE', name: 'Zine 刊物', icon: '📖' },
  { id: 'COMIC', name: '漫画', icon: '🎨' },
  { id: 'PHOTO', name: '摄影集', icon: '📷' },
  { id: 'POETRY', name: '诗集', icon: '📝' },
  { id: 'ART', name: '艺术画册', icon: '🖼️' },
  { id: 'OTHER', name: '其他', icon: '✨' }
])

const exchangeTypes = ref([
  { id: 'all', name: '全部' },
  { id: 'SWAP', name: '互换' },
  { id: 'SELL', name: '出售' },
  { id: 'GIFT', name: '赠送' },
  { id: 'TRADE', name: '物物交换' }
])

const conditions = ref([
  { id: 'all', name: '全部' },
  { id: 'LIKE_NEW', name: '全新' },
  { id: 'GOOD', name: '良好' },
  { id: 'FAIR', name: '一般' }
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

const getCategoryLabel = (cat) => {
  const found = categories.value.find(c => c.id === cat)
  return found ? `${found.icon} ${found.name}` : cat
}

const getExchangeLabel = (t) => {
  const found = exchangeTypes.value.find(e => e.id === t)
  return found ? found.name : t
}

const getExchangeIcon = (t) => {
  const icons = { SWAP: '🔄', SELL: '💰', GIFT: '🎁', TRADE: '🤝' }
  return icons[t] || '🔄'
}

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchListings(1), 400)
}

const setCategory = (cat) => {
  currentCategory.value = cat
  fetchListings(1)
}

const setExchangeType = (t) => {
  currentExchangeType.value = t
  fetchListings(1)
}

const setCondition = (c) => {
  currentCondition.value = c
  fetchListings(1)
}

const resetFilters = () => {
  currentCategory.value = 'all'
  currentExchangeType.value = 'all'
  currentCondition.value = 'all'
  search.value = ''
  fetchListings(1)
}

const fetchListings = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({
      page: newPage,
      limit: pageSize
    })
    if (currentCategory.value !== 'all') params.set('category', currentCategory.value)
    if (currentExchangeType.value !== 'all') params.set('exchangeType', currentExchangeType.value)
    if (currentCondition.value !== 'all') params.set('haveCondition', currentCondition.value)
    if (search.value) params.set('keyword', search.value)
    const res = await api.get(`/swap-listings?${params}`)
    listings.value = res.listings
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchListings()
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
  min-width: 64px;
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
.cat-tab.active {
  background: var(--accent);
  color: #fff;
}
.search-box {
  position: relative;
  flex: 1;
  min-width: 240px;
  max-width: 500px;
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

.swap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.swap-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.swap-card:hover { transform: translateY(-4px); }

.swap-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  background-size: cover;
  background-position: center;
}

.swap-cover-placeholder {
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

.swap-category {
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

.closed-tag, .completed-tag {
  position: absolute;
  bottom: 12px;
  right: 12px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 100px;
  color: #fff;
}
.closed-tag { background: rgba(108, 117, 125, 0.9); }
.completed-tag { background: rgba(40, 167, 69, 0.9); }

.swap-info { padding: 16px 18px 18px; flex: 1; display: flex; flex-direction: column; }

.swap-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.swap-zines {
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  margin-bottom: 12px;
}
.zine-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.zine-row + .zine-row { margin-top: 4px; }
.zine-label {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.zine-row.have .zine-label { background: #e3f2fd; color: #1565c0; }
.zine-row.want .zine-label { background: #fce4ec; color: #c2185b; }
.zine-name {
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
.swap-arrow {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 2px 0;
}

.swap-tags { margin-bottom: 12px; }
.tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 4px;
  margin-right: 6px;
  margin-bottom: 4px;
}
.have-tag { background: #e3f2fd; color: #1565c0; }
.want-tag { background: #fce4ec; color: #c2185b; }

.swap-highlights {
  display: flex;
  gap: 16px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-light);
}

.highlight-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.highlight-icon { font-size: 14px; }

.highlight-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.swap-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.swap-creator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.swap-creator img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.swap-creator span {
  font-size: 12px;
  color: var(--text-secondary);
}

.swap-stats {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
