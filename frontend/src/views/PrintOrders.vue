<template>
  <div class="container">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">{{ isMine ? '我的印刷预约' : '印刷预约' }}</h1>
        <p class="page-subtitle">{{ isMine ? '查看和管理您的送印申请' : '提交刊物送印申请，选择规格，获取报价' }}</p>
      </div>
      <div class="flex gap-sm">
        <router-link v-if="authStore?.isAuthenticated && !isMine" to="/print-orders/mine" class="btn btn-secondary">
          我的预约
        </router-link>
        <router-link v-if="authStore?.isAuthenticated && isMine" to="/print-orders" class="btn btn-secondary">
          全部预约
        </router-link>
        <router-link v-if="authStore?.isAuthenticated" to="/print-orders/new" class="btn btn-primary">
          <span>+</span> 送印申请
        </router-link>
      </div>
    </div>

    <div class="filters card" style="padding: 20px 24px; margin-bottom: 32px;">
      <div v-if="isMine" class="filter-row" style="margin-bottom: 16px;">
        <span class="filter-label">状态</span>
        <div class="category-tabs">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            :class="['cat-tab', { active: currentStatus === f.value }]"
            @click="setStatus(f.value)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>
      <div v-else class="filter-row">
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
      <div class="filter-row" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-light);">
        <span class="filter-label">搜索</span>
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="search"
            type="text"
            class="search-input"
            placeholder="搜索印刷预约..."
            @input="debouncedSearch"
          >
        </div>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="orders.length === 0" class="empty-state">
      <div class="empty-state-icon">🖨</div>
      <div class="empty-state-text">暂无印刷预约</div>
      <router-link v-if="authStore?.isAuthenticated" to="/print-orders/new" class="btn btn-outline">提交送印申请</router-link>
    </div>
    <div v-else class="print-grid">
      <router-link
        v-for="item in orders"
        :key="item.id"
        :to="`/print-orders/${item.id}`"
        class="print-card card"
      >
        <div class="print-status-bar" :class="getStatusClass(item.status)">
          {{ getStatusLabel(item.status) }}
        </div>
        <div class="print-info">
          <h3 class="print-title font-serif">{{ item.title }}</h3>
          <p class="print-desc">{{ item.description }}</p>

          <div class="spec-grid">
            <div class="spec-item">
              <span class="spec-label">规格</span>
              <span class="spec-value">{{ getPaperSizeLabel(item.paperSize) }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">页数</span>
              <span class="spec-value">{{ item.pageCount }}P</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">数量</span>
              <span class="spec-value">{{ item.printQuantity }}册</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">装订</span>
              <span class="spec-value">{{ getBindingLabel(item.binding) }}</span>
            </div>
          </div>

          <div v-if="item.totalPrice" class="price-section">
            <span class="price-label">报价</span>
            <span class="price-value">¥{{ formatMoney(item.totalPrice) }}</span>
            <span class="price-unit">/ {{ item.printQuantity }}册</span>
          </div>

          <div class="print-meta">
            <div class="print-creator">
              <img :src="item.creator?.avatar" alt="">
              <span>{{ item.creator?.username }}</span>
            </div>
            <div class="print-date">{{ formatDate(item.createdAt) }}</div>
          </div>
        </div>
      </router-link>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="fetchOrders(page - 1)">←</button>
      <button
        v-for="p in displayPages"
        :key="p"
        :class="['page-btn', { active: p === page }]"
        @click="p !== '...' && fetchOrders(p)"
        :disabled="p === '...'"
      >
        {{ p }}
      </button>
      <button class="page-btn" :disabled="page === totalPages" @click="fetchOrders(page + 1)">→</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const authStore = useAuthStore()
const isMine = computed(() => route.path === '/print-orders/mine')
const orders = ref([])
const loading = ref(false)
const currentCategory = ref('all')
const currentStatus = ref('all')
const search = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 12

const categories = [
  { id: 'all', name: '全部', icon: '📋' },
  { id: 'ZINE', name: '刊物', icon: '📖' },
  { id: 'ART', name: '艺术', icon: '🎨' },
  { id: 'BOOK', name: '书籍', icon: '📚' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const statusFilters = [
  { value: 'all', label: '全部' },
  { value: 'PENDING_REVIEW', label: '待审核' },
  { value: 'QUOTED', label: '已报价' },
  { value: 'CONFIRMED', label: '已确认' },
  { value: 'PRINTING', label: '印刷中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'REJECTED', label: '已驳回' },
  { value: 'CANCELLED', label: '已取消' }
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
  return Number(amount).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

const formatDate = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const getStatusLabel = (status) => {
  const map = {
    DRAFT: '草稿',
    PENDING_REVIEW: '待审核',
    APPROVED: '已审核',
    REJECTED: '已驳回',
    QUOTED: '已报价',
    CONFIRMED: '已确认',
    PRINTING: '印刷中',
    COMPLETED: '已完成',
    CANCELLED: '已取消'
  }
  return map[status] || status
}

const getStatusClass = (status) => {
  const map = {
    DRAFT: 'status-gray',
    PENDING_REVIEW: 'status-orange',
    APPROVED: 'status-blue',
    REJECTED: 'status-red',
    QUOTED: 'status-cyan',
    CONFIRMED: 'status-green',
    PRINTING: 'status-purple',
    COMPLETED: 'status-green',
    CANCELLED: 'status-gray'
  }
  return map[status] || 'status-gray'
}

const getPaperSizeLabel = (size) => {
  const map = { A3: 'A3', A4: 'A4', A5: 'A5', B5: 'B5', A6: 'A6', CUSTOM: '自定义' }
  return map[size] || size
}

const getBindingLabel = (binding) => {
  const map = {
    SADDLE_STITCH: '骑马钉',
    PERFECT_BIND: '胶装',
    HARD_BIND: '精装',
    WIRE_BIND: '线圈装',
    FOLD: '折页'
  }
  return map[binding] || binding
}

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchOrders(1), 400)
}

const setCategory = (cat) => {
  currentCategory.value = cat
  fetchOrders(1)
}

const setStatus = (status) => {
  currentStatus.value = status
  fetchOrders(1)
}

const fetchOrders = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: pageSize })
    if (isMine.value) {
      if (currentStatus.value !== 'all') params.set('status', currentStatus.value)
      const res = await api.get(`/print-orders/mine?${params}`)
      orders.value = res.orders
      total.value = res.total
    } else {
      if (currentCategory.value !== 'all') params.set('category', currentCategory.value)
      if (search.value) params.set('keyword', search.value)
      const res = await api.get(`/print-orders?${params}`)
      orders.value = res.orders
      total.value = res.total
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center;; }
.gap-sm { gap: 8px; }

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

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

.print-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.print-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.print-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

.print-status-bar {
  padding: 8px 18px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.status-gray { background: #8c8c8c; }
.status-orange { background: #d48806; }
.status-blue { background: #1890ff; }
.status-red { background: #cf1322; }
.status-cyan { background: #13c2c2; }
.status-green { background: #52c41a; }
.status-purple { background: #722ed1; }

.print-info { padding: 18px; flex: 1; display: flex; flex-direction: column; }

.print-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.print-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.spec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}

.spec-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
}

.spec-label { color: var(--text-tertiary); }
.spec-value { color: var(--text-primary); font-weight: 500; }

.price-section {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #fff7e6, #fffbe6);
  border-radius: var(--radius-sm);
  margin-bottom: 14px;
}

.price-label { font-size: 12px; color: var(--text-secondary); }
.price-value { font-size: 18px; font-weight: 700; color: var(--accent); }
.price-unit { font-size: 11px; color: var(--text-tertiary); }

.print-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.print-creator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.print-creator img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.print-creator span { font-size: 12px; color: var(--text-secondary); }
.print-date { font-size: 12px; color: var(--text-tertiary); }
</style>
