<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">刊物目录</h1>
      <p class="page-subtitle">探索社区中所有已发布的独立刊物</p>
    </div>

    <div class="filters card" style="padding: 20px 24px; margin-bottom: 32px;">
      <div class="filter-row categories-row">
        <span class="filter-label">分类</span>
        <div class="category-tabs">
          <button
            v-for="cat in categories"
            :key="cat.id"
            :class="['cat-tab', { active: filters.category === cat.id }]"
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
            v-model="filters.search"
            type="text"
            class="search-input"
            placeholder="搜索刊物标题或描述..."
            @input="debouncedSearch"
          >
        </div>
        <span class="filter-label" style="margin-left: 24px;">排序</span>
        <select v-model="filters.sort" class="form-select sort-select" @change="fetchZines(1)">
          <option value="newest">最新发布</option>
          <option value="popular">最多浏览</option>
          <option value="liked">最受欢迎</option>
          <option value="recently-updated">最近更新</option>
          <option value="oldest">最早发布</option>
        </select>
        <button class="btn btn-outline advanced-toggle" @click="showAdvanced = !showAdvanced">
          {{ showAdvanced ? '收起筛选' : '高级筛选' }}
          <span :class="{ rotated: showAdvanced }">▼</span>
        </button>
      </div>

      <div v-if="showAdvanced" class="advanced-filters">
        <div class="filter-row">
          <span class="filter-label">标签</span>
          <div class="tag-selector">
            <button
              v-for="tag in allTags"
              :key="tag"
              :class="['tag-chip', { active: filters.tags.includes(tag) }]"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
            <span v-if="allTags.length === 0" class="empty-tip">暂无标签</span>
          </div>
        </div>

        <div class="filter-row">
          <span class="filter-label">作者</span>
          <select v-model="filters.authorId" class="form-select" @change="fetchZines(1)">
            <option value="all">全部作者</option>
            <option v-for="author in allAuthors" :key="author.id" :value="author.id">
              {{ author.username }} ({{ author._count.zines }} 篇)
            </option>
          </select>

          <span class="filter-label" style="margin-left: 24px;">热度</span>
          <div class="heat-filter">
            <div class="heat-input-group">
              <label>最小浏览</label>
              <input
                v-model.number="filters.minViews"
                type="number"
                min="0"
                class="form-input"
                placeholder="0"
                @change="fetchZines(1)"
              >
            </div>
            <div class="heat-input-group">
              <label>最小点赞</label>
              <input
                v-model.number="filters.minLikes"
                type="number"
                min="0"
                class="form-input"
                placeholder="0"
                @change="fetchZines(1)"
              >
            </div>
          </div>
        </div>

        <div class="filter-row">
          <span class="filter-label">更新时间</span>
          <div class="date-filter">
            <select v-model="filters.dateField" class="form-select">
              <option value="updatedAt">更新时间</option>
              <option value="createdAt">发布时间</option>
            </select>
            <input
              v-model="filters.dateFrom"
              type="date"
              class="form-input date-input"
              @change="fetchZines(1)"
            >
            <span class="date-sep">至</span>
            <input
              v-model="filters.dateTo"
              type="date"
              class="form-input date-input"
              @change="fetchZines(1)"
            >
            <button v-if="hasActiveFilters" class="btn btn-outline clear-btn" @click="resetFilters">
              清除所有筛选
            </button>
          </div>
        </div>
      </div>

      <div v-if="hasActiveFilters" class="active-filters">
        <span class="filter-label">已选条件：</span>
        <span v-for="(filter, idx) in activeFilterLabels" :key="idx" class="active-filter-tag">
          {{ filter }}
        </span>
        <span class="filter-count">共 {{ total }} 条结果</span>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="zines.length === 0" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">暂无符合条件的刊物</div>
      <button @click="resetFilters" class="btn btn-outline">清除筛选</button>
    </div>
    <div v-else class="zine-grid">
      <ZineCard v-for="zine in zines" :key="zine.id" :zine="zine" />
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="page === 1"
        @click="fetchZines(page - 1)"
      >
        ←
      </button>
      <button
        v-for="p in displayPages"
        :key="p"
        :class="['page-btn', { active: p === page }]"
        @click="p !== '...' && fetchZines(p)"
        :disabled="p === '...'"
      >
        {{ p }}
      </button>
      <button
        class="page-btn"
        :disabled="page === totalPages"
        @click="fetchZines(page + 1)"
      >
        →
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/utils/api'
import ZineCard from '@/components/ZineCard.vue'

const route = useRoute()
const zines = ref([])
const categories = ref([])
const allTags = ref([])
const allAuthors = ref([])
const loading = ref(false)
const showAdvanced = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 12

const filters = reactive({
  category: 'all',
  search: '',
  sort: 'newest',
  tags: [],
  authorId: 'all',
  minViews: null,
  minLikes: null,
  dateField: 'updatedAt',
  dateFrom: '',
  dateTo: ''
})

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

const hasActiveFilters = computed(() => {
  return filters.category !== 'all' ||
    filters.search ||
    filters.tags.length > 0 ||
    filters.authorId !== 'all' ||
    filters.minViews ||
    filters.minLikes ||
    filters.dateFrom ||
    filters.dateTo
})

const activeFilterLabels = computed(() => {
  const labels = []
  if (filters.category !== 'all') {
    const cat = categories.value.find(c => c.id === filters.category)
    if (cat) labels.push(`分类: ${cat.name}`)
  }
  if (filters.search) labels.push(`搜索: ${filters.search}`)
  if (filters.tags.length > 0) labels.push(`标签: ${filters.tags.join(', ')}`)
  if (filters.authorId !== 'all') {
    const author = allAuthors.value.find(a => a.id === Number(filters.authorId))
    if (author) labels.push(`作者: ${author.username}`)
  }
  if (filters.minViews) labels.push(`浏览 ≥ ${filters.minViews}`)
  if (filters.minLikes) labels.push(`点赞 ≥ ${filters.minLikes}`)
  if (filters.dateFrom || filters.dateTo) {
    const field = filters.dateField === 'updatedAt' ? '更新' : '发布'
    if (filters.dateFrom && filters.dateTo) {
      labels.push(`${field}: ${filters.dateFrom} 至 ${filters.dateTo}`)
    } else if (filters.dateFrom) {
      labels.push(`${field} ≥ ${filters.dateFrom}`)
    } else {
      labels.push(`${field} ≤ ${filters.dateTo}`)
    }
  }
  return labels
})

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchZines(1), 400)
}

const setCategory = (cat) => {
  filters.category = cat
  fetchZines(1)
}

const toggleTag = (tag) => {
  const idx = filters.tags.indexOf(tag)
  if (idx === -1) {
    filters.tags.push(tag)
  } else {
    filters.tags.splice(idx, 1)
  }
  fetchZines(1)
}

const resetFilters = () => {
  filters.category = 'all'
  filters.search = ''
  filters.sort = 'newest'
  filters.tags = []
  filters.authorId = 'all'
  filters.minViews = null
  filters.minLikes = null
  filters.dateField = 'updatedAt'
  filters.dateFrom = ''
  filters.dateTo = ''
  fetchZines(1)
}

const fetchZines = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({
      page: newPage,
      limit: pageSize,
      sort: filters.sort,
      dateField: filters.dateField
    })
    if (filters.category !== 'all') params.set('category', filters.category)
    if (filters.search) params.set('search', filters.search)
    if (filters.tags.length > 0) params.set('tags', filters.tags.join(','))
    if (filters.authorId !== 'all') params.set('authorId', filters.authorId)
    if (filters.minViews) params.set('minViews', filters.minViews)
    if (filters.minLikes) params.set('minLikes', filters.minLikes)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    const res = await api.get(`/zines?${params}`)
    zines.value = res.zines
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchMeta = async () => {
  try {
    const [tagRes, authorRes] = await Promise.all([
      api.get('/zines/tags'),
      api.get('/zines/authors')
    ])
    allTags.value = tagRes.tags
    allAuthors.value = authorRes.authors
  } catch (e) {
    console.error(e)
  }
}

onMounted(async () => {
  const [, catRes] = await Promise.all([
    fetchZines(),
    api.get('/zines/categories'),
    fetchMeta()
  ])
  categories.value = catRes.categories
  const catParam = route.query.category
  if (catParam) {
    filters.category = catParam
    fetchZines(1)
  }
})

watch(() => route.query.category, (newCat) => {
  if (newCat) {
    filters.category = newCat
    fetchZines(1)
  }
})
</script>

<style scoped>
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
.zine-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}

.advanced-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.advanced-toggle span {
  transition: transform 0.3s;
  font-size: 10px;
}
.advanced-toggle span.rotated {
  transform: rotate(180deg);
}

.advanced-filters {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
  animation: slideDown 0.3s ease;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}
.tag-chip {
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 100px;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.tag-chip:hover {
  color: var(--text-primary);
  border-color: var(--accent);
}
.tag-chip.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.empty-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 6px 0;
}

.heat-filter {
  display: flex;
  gap: 16px;
  align-items: center;
}
.heat-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.heat-input-group label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.heat-input-group .form-input {
  width: 100px;
}

.date-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  flex-wrap: wrap;
}
.date-sep {
  color: var(--text-tertiary);
  font-size: 13px;
}
.date-input {
  width: 140px;
}
.clear-btn {
  margin-left: auto;
}

.active-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}
.active-filter-tag {
  padding: 4px 10px;
  background: rgba(212, 98, 74, 0.1);
  color: var(--accent);
  border-radius: 6px;
  font-size: 12px;
}
.filter-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-tertiary);
}

.form-input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 13px;
  transition: all 0.2s;
}
.form-input:focus {
  outline: none;
  border-color: var(--accent);
}
.form-select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.form-select:focus {
  outline: none;
  border-color: var(--accent);
}
</style>
