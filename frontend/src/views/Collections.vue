<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">主题合集</h1>
      <p class="page-subtitle">精选编辑策展，发现优质独立刊物</p>
    </div>

    <div v-if="featuredCollections.length > 0" class="featured-section">
      <h2 class="section-title">
        <span class="title-icon">⭐</span> 编辑推荐
      </h2>
      <div class="featured-slider">
        <router-link
          v-for="item in featuredCollections"
          :key="item.id"
          :to="`/collections/${item.collection.id}`"
          class="featured-card card"
          :style="{ backgroundImage: `url(${item.bannerImage || item.collection.coverImage})` }"
        >
          <div class="featured-overlay">
            <div class="featured-content">
              <span class="featured-badge">精选推荐</span>
              <h3 class="featured-title">{{ item.bannerTitle || item.collection.title }}</h3>
              <p class="featured-subtitle">{{ item.bannerSubtitle || item.collection.description }}</p>
              <div class="featured-meta">
                <span>📚 {{ item.collection.zineCount }} 本刊物</span>
                <span>👁 {{ formatNum(item.collection.viewCount) }} 浏览</span>
              </div>
            </div>
          </div>
        </router-link>
      </div>
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
        <span class="filter-label">搜索</span>
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="search"
            type="text"
            class="search-input"
            placeholder="搜索合集标题或描述..."
            @input="debouncedSearch"
          >
        </div>
        <span class="filter-label" style="margin-left: 24px;">排序</span>
        <select v-model="sort" class="form-select sort-select" @change="fetchCollections(1)">
          <option value="newest">最新发布</option>
          <option value="popular">最多浏览</option>
          <option value="liked">最受欢迎</option>
          <option value="featured">编辑推荐</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="collections.length === 0" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">暂无符合条件的合集</div>
      <button @click="resetFilters" class="btn btn-outline">清除筛选</button>
    </div>
    <div v-else class="collection-grid">
      <router-link
        v-for="collection in collections"
        :key="collection.id"
        :to="`/collections/${collection.id}`"
        class="collection-card card"
      >
        <div class="collection-cover">
          <img :src="collection.coverImage" :alt="collection.title" loading="lazy">
          <div class="collection-category">{{ collection.category }}</div>
          <div v-if="collection.isFeatured" class="featured-tag">⭐ 精选</div>
        </div>
        <div class="collection-info">
          <h3 class="collection-title font-serif">{{ collection.title }}</h3>
          <p class="collection-desc">{{ collection.description }}</p>
          <div class="collection-tags">
            <span v-for="tag in collection.tags?.slice(0, 3)" :key="tag" class="tag">#{{ tag }}</span>
          </div>
          <div class="collection-meta">
            <div class="collection-creator">
              <img :src="collection.creator?.avatar" alt="">
              <span>{{ collection.creator?.username }}</span>
            </div>
            <div class="collection-stats">
              <span>📚 {{ collection.zineCount }}</span>
              <span>👁 {{ formatNum(collection.viewCount) }}</span>
              <span>❤ {{ formatNum(collection.likeCount) }}</span>
            </div>
          </div>
        </div>
      </router-link>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="page === 1"
        @click="fetchCollections(page - 1)"
      >
        ←
      </button>
      <button
        v-for="p in displayPages"
        :key="p"
        :class="['page-btn', { active: p === page }]"
        @click="p !== '...' && fetchCollections(p)"
        :disabled="p === '...'"
      >
        {{ p }}
      </button>
      <button
        class="page-btn"
        :disabled="page === totalPages"
        @click="fetchCollections(page + 1)"
      >
        →
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/api'

const collections = ref([])
const featuredCollections = ref([])
const categories = ref([])
const loading = ref(false)
const currentCategory = ref('all')
const search = ref('')
const sort = ref('newest')
const page = ref(1)
const total = ref(0)
const pageSize = 12

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

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchCollections(1), 400)
}

const setCategory = (cat) => {
  currentCategory.value = cat
  fetchCollections(1)
}

const resetFilters = () => {
  currentCategory.value = 'all'
  search.value = ''
  sort.value = 'newest'
  fetchCollections(1)
}

const fetchCollections = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({
      page: newPage,
      limit: pageSize,
      sort: sort.value
    })
    if (currentCategory.value !== 'all') params.set('category', currentCategory.value)
    if (search.value) params.set('search', search.value)
    const res = await api.get(`/collections?${params}`)
    collections.value = res.collections
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchFeatured = async () => {
  try {
    const res = await api.get('/collections/featured')
    featuredCollections.value = res.featured
  } catch (e) {
    console.error(e)
  }
}

onMounted(async () => {
  const [, catRes] = await Promise.all([
    fetchCollections(),
    api.get('/collections/categories'),
    fetchFeatured()
  ])
  categories.value = catRes.categories
})
</script>

<style scoped>
.section-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.title-icon { font-size: 22px; }

.featured-section { margin-bottom: 40px; }

.featured-slider {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.featured-card {
  position: relative;
  height: 220px;
  border-radius: 16px;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  transition: transform 0.3s ease;
}

.featured-card:hover { transform: translateY(-4px); }

.featured-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 100%);
  display: flex;
  align-items: flex-end;
  padding: 24px;
}

.featured-content { color: #fff; }

.featured-badge {
  display: inline-block;
  padding: 4px 10px;
  background: var(--accent);
  border-radius: 100px;
  font-size: 11px;
  margin-bottom: 10px;
}

.featured-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 6px;
  line-height: 1.4;
}

.featured-subtitle {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.featured-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  opacity: 0.85;
}

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
.cat-tab.active {
  background: var(--accent);
  color: #fff;
}
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
.search-input:focus {
  outline: none;
  border-color: var(--accent);
  background: #fff;
}
.sort-select {
  width: auto;
  min-width: 140px;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.collection-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
}

.collection-card:hover { transform: translateY(-4px); }

.collection-cover {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--bg-tertiary);
}

.collection-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.collection-card:hover .collection-cover img { transform: scale(1.05); }

.collection-category {
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

.collection-info { padding: 16px 18px 18px; flex: 1; display: flex; flex-direction: column; }

.collection-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.collection-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.collection-tags { margin-bottom: 14px; }

.collection-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.collection-creator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collection-creator img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.collection-creator span {
  font-size: 12px;
  color: var(--text-secondary);
}

.collection-stats {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--text-tertiary);
}

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
</style>
