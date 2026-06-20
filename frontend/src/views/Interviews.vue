<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">作者访谈</h1>
      <p class="page-subtitle">走近创作者，聆听独立文化的声音</p>
    </div>

    <div v-if="featuredInterviews.length > 0" class="featured-section">
      <h2 class="section-title">
        <span class="title-icon">⭐</span> 专题推荐
      </h2>
      <div class="featured-slider">
        <router-link
          v-for="item in featuredInterviews"
          :key="item.id"
          :to="`/interviews/${item.interview.id}`"
          class="featured-card card"
          :style="{ backgroundImage: `url(${item.bannerImage || item.interview.coverImage})` }"
        >
          <div class="featured-overlay">
            <div class="featured-content">
              <span class="featured-badge">专题推荐</span>
              <h3 class="featured-title">{{ item.bannerTitle || item.interview.title }}</h3>
              <p class="featured-subtitle">{{ item.bannerSubtitle || item.interview.description }}</p>
              <div class="featured-meta">
                <span>✍️ {{ item.interview.authorName }}</span>
                <span>👁 {{ formatNum(item.interview.viewCount) }} 浏览</span>
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
            placeholder="搜索访谈标题、描述或作者..."
            @input="debouncedSearch"
          >
        </div>
        <span class="filter-label" style="margin-left: 24px;">排序</span>
        <select v-model="sort" class="form-select sort-select" @change="fetchInterviews(1)">
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
    <div v-else-if="interviews.length === 0" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">暂无符合条件的访谈</div>
      <button @click="resetFilters" class="btn btn-outline">清除筛选</button>
    </div>
    <div v-else class="interview-grid">
      <router-link
        v-for="interview in interviews"
        :key="interview.id"
        :to="`/interviews/${interview.id}`"
        class="interview-card card"
      >
        <div class="interview-cover">
          <img :src="interview.coverImage" :alt="interview.title" loading="lazy">
          <div class="interview-category">{{ categoryLabel(interview.category) }}</div>
          <div v-if="interview.isFeatured" class="featured-tag">⭐ 精选</div>
        </div>
        <div class="interview-info">
          <div class="author-row">
            <img :src="interview.authorAvatar || interview.creator?.avatar" class="author-avatar-sm" alt="">
            <span class="author-name">{{ interview.authorName }}</span>
          </div>
          <h3 class="interview-title font-serif">{{ interview.title }}</h3>
          <p class="interview-desc">{{ interview.description }}</p>
          <div class="interview-tags">
            <span v-for="tag in interview.tags?.slice(0, 3)" :key="tag" class="tag">#{{ tag }}</span>
          </div>
          <div class="interview-meta">
            <span>📚 {{ interview.zineCount }} 本关联</span>
            <span>👁 {{ formatNum(interview.viewCount) }}</span>
            <span>💬 {{ interview.commentCount }}</span>
          </div>
        </div>
      </router-link>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="page === 1"
        @click="fetchInterviews(page - 1)"
      >
        ←
      </button>
      <button
        v-for="p in displayPages"
        :key="p"
        :class="['page-btn', { active: p === page }]"
        @click="p !== '...' && fetchInterviews(p)"
        :disabled="p === '...'"
      >
        {{ p }}
      </button>
      <button
        class="page-btn"
        :disabled="page === totalPages"
        @click="fetchInterviews(page + 1)"
      >
        →
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/api'

const interviews = ref([])
const featuredInterviews = ref([])
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

const categoryMap = {
  CREATOR: '创作者专访',
  DESIGNER: '设计师访谈',
  PHOTOGRAPHER: '摄影师对话',
  WRITER: '作家笔谈',
  ARTIST: '艺术家专访',
  PUBLISHER: '出版人访谈',
  OTHER: '其他'
}

const categoryLabel = (cat) => categoryMap[cat] || cat

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchInterviews(1), 400)
}

const setCategory = (cat) => {
  currentCategory.value = cat
  fetchInterviews(1)
}

const resetFilters = () => {
  currentCategory.value = 'all'
  search.value = ''
  sort.value = 'newest'
  fetchInterviews(1)
}

const fetchInterviews = async (newPage = 1) => {
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
    const res = await api.get(`/interviews?${params}`)
    interviews.value = res.interviews
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchFeatured = async () => {
  try {
    const res = await api.get('/interviews/featured')
    featuredInterviews.value = res.featured
  } catch (e) {
    console.error(e)
  }
}

onMounted(async () => {
  const [, catRes] = await Promise.all([
    fetchInterviews(),
    api.get('/interviews/categories'),
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

.interview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.interview-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
}

.interview-card:hover { transform: translateY(-4px); }

.interview-cover {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--bg-tertiary);
}

.interview-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.interview-card:hover .interview-cover img { transform: scale(1.05); }

.interview-category {
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

.interview-info { padding: 16px 18px 18px; flex: 1; display: flex; flex-direction: column; }

.author-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.author-avatar-sm {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.author-name {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.interview-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.interview-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.interview-tags { margin-bottom: 14px; }

.interview-meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
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
