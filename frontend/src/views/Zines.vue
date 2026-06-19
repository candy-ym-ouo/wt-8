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
            placeholder="搜索刊物标题或描述..."
            @input="debouncedSearch"
          >
        </div>
        <span class="filter-label" style="margin-left: 24px;">排序</span>
        <select v-model="sort" class="form-select sort-select" @change="fetchZines(1)">
          <option value="newest">最新发布</option>
          <option value="popular">最多浏览</option>
          <option value="liked">最受欢迎</option>
        </select>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/utils/api'
import ZineCard from '@/components/ZineCard.vue'

const route = useRoute()
const zines = ref([])
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

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchZines(1), 400)
}

const setCategory = (cat) => {
  currentCategory.value = cat
  fetchZines(1)
}

const resetFilters = () => {
  currentCategory.value = 'all'
  search.value = ''
  sort.value = 'newest'
  fetchZines(1)
}

const fetchZines = async (newPage = 1) => {
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
    const res = await api.get(`/zines?${params}`)
    zines.value = res.zines
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const [, catRes] = await Promise.all([
    fetchZines(),
    api.get('/zines/categories')
  ])
  categories.value = catRes.categories
  const catParam = route.query.category
  if (catParam) {
    currentCategory.value = catParam
    fetchZines(1)
  }
})

watch(() => route.query.category, (newCat) => {
  if (newCat) {
    currentCategory.value = newCat
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
</style>
