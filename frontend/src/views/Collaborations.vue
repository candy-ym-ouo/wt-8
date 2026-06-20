<template>
  <div class="container">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">创作者合作</h1>
        <p class="page-subtitle">发现优质合作机会，与志同道合的创作者共创精彩</p>
      </div>
      <router-link v-if="authStore?.isAuthenticated" to="/collaborations/new" class="btn btn-primary">
        <span>+</span> 发起合作招募
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
        <span class="filter-label">搜索</span>
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="search"
            type="text"
            class="search-input"
            placeholder="搜索合作项目标题、描述或报酬..."
            @input="debouncedSearch"
          >
        </div>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="collaborations.length === 0" class="empty-state">
      <div class="empty-state-icon">🤝</div>
      <div class="empty-state-text">暂无符合条件的合作项目</div>
      <button @click="resetFilters" class="btn btn-outline">清除筛选</button>
    </div>
    <div v-else class="collab-grid">
      <router-link
        v-for="item in collaborations"
        :key="item.id"
        :to="`/collaborations/${item.id}`"
        class="collab-card card"
      >
        <div class="collab-cover" :style="item.coverImage ? { backgroundImage: `url(${item.coverImage})` } : {}">
          <div v-if="!item.coverImage" class="collab-cover-placeholder">
            <span class="cover-icon">🤝</span>
          </div>
          <div class="collab-category">{{ getCategoryLabel(item.category) }}</div>
          <div v-if="item.isFeatured" class="featured-tag">⭐ 精选</div>
          <div v-if="item.deadline && new Date(item.deadline) < new Date()" class="closed-tag">已截止</div>
        </div>
        <div class="collab-info">
          <h3 class="collab-title font-serif">{{ item.title }}</h3>
          <p class="collab-desc">{{ item.description }}</p>
          <div class="collab-tags">
            <span v-for="tag in item.tags?.slice(0, 3)" :key="tag" class="tag">#{{ tag }}</span>
          </div>
          <div class="collab-highlights">
            <div v-if="item.compensation" class="highlight-item">
              <span class="highlight-icon">💰</span>
              <span class="highlight-value">{{ item.compensation }}</span>
            </div>
            <div v-if="item.deadline" class="highlight-item">
              <span class="highlight-icon">⏰</span>
              <span class="highlight-value">{{ formatDate(item.deadline) }}</span>
            </div>
          </div>
          <div class="collab-meta">
            <div class="collab-creator">
              <img :src="item.creator?.avatar" alt="">
              <span>{{ item.creator?.username }}</span>
            </div>
            <div class="collab-stats">
              <span>👥 {{ item.applicationCount }} 人申请</span>
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
        @click="fetchCollaborations(page - 1)"
      >
        ←
      </button>
      <button
        v-for="p in displayPages"
        :key="p"
        :class="['page-btn', { active: p === page }]"
        @click="p !== '...' && fetchCollaborations(p)"
        :disabled="p === '...'"
      >
        {{ p }}
      </button>
      <button
        class="page-btn"
        :disabled="page === totalPages"
        @click="fetchCollaborations(page + 1)"
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
const collaborations = ref([])
const loading = ref(false)
const currentCategory = ref('all')
const search = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 12

const categories = ref([
  { id: 'all', name: '全部', icon: '📋' },
  { id: 'WRITING', name: '撰稿', icon: '✍️' },
  { id: 'DESIGN', name: '设计', icon: '🎨' },
  { id: 'ILLUSTRATION', name: '插画', icon: '🖼️' },
  { id: 'PHOTOGRAPHY', name: '摄影', icon: '📷' },
  { id: 'TRANSLATION', name: '翻译', icon: '🌐' },
  { id: 'EDITING', name: '编辑', icon: '📝' },
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

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchCollaborations(1), 400)
}

const setCategory = (cat) => {
  currentCategory.value = cat
  fetchCollaborations(1)
}

const resetFilters = () => {
  currentCategory.value = 'all'
  search.value = ''
  fetchCollaborations(1)
}

const fetchCollaborations = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({
      page: newPage,
      limit: pageSize
    })
    if (currentCategory.value !== 'all') params.set('category', currentCategory.value)
    if (search.value) params.set('keyword', search.value)
    const res = await api.get(`/collaborations?${params}`)
    collaborations.value = res.collaborations
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCollaborations()
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

.collab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.collab-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.collab-card:hover { transform: translateY(-4px); }

.collab-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: cover;
  background-position: center;
}

.collab-cover-placeholder {
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

.collab-category {
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

.closed-tag {
  position: absolute;
  bottom: 12px;
  right: 12px;
  padding: 4px 10px;
  background: rgba(220, 53, 69, 0.9);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 100px;
}

.collab-info { padding: 16px 18px 18px; flex: 1; display: flex; flex-direction: column; }

.collab-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.collab-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.collab-tags { margin-bottom: 12px; }

.collab-highlights {
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

.collab-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.collab-creator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collab-creator img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.collab-creator span {
  font-size: 12px;
  color: var(--text-secondary);
}

.collab-stats {
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
