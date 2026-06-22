<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">众筹预售管理</h1>
      <p class="page-subtitle">管理众筹项目、订单审核与数据统计</p>
    </div>

    <div class="admin-tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="['admin-tab', { active: currentTab === t.value }]"
        @click="switchTab(t.value)"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
        <span v-if="t.value === 'crowdfundings' && stats.pending > 0" class="tab-badge">
          {{ stats.pending }}
        </span>
        <span v-if="t.value === 'orders' && stats.pendingOrders > 0" class="tab-badge">
          {{ stats.pendingOrders }}
        </span>
      </button>
    </div>

    <div v-if="currentTab === 'overview'" class="section">
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">众筹项目总数</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #d48806;">{{ stats.pending }}</div>
            <div class="stat-label">待审核项目</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.published }}</div>
            <div class="stat-label">众筹中项目</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">🎉</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #52c41a;">{{ stats.funded }}</div>
            <div class="stat-label">已达成项目</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-value">¥{{ formatMoney(stats.totalAmount) }}</div>
            <div class="stat-label">总筹款金额</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalBackers }}</div>
            <div class="stat-label">总支持人数</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">❤️</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #e84393;">{{ stats.totalLikes }}</div>
            <div class="stat-label">总点赞数</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">🔥</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #e17055;">{{ stats.avgHotScore }}</div>
            <div class="stat-label">平均热度</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'crowdfundings'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            :class="['btn', statusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="statusFilter = f.value; loadCrowdfundings(1)"
          >
            {{ f.label }}
            <span v-if="f.value === 'PENDING_REVIEW' && stats.pending > 0" class="tab-badge-sm">
              {{ stats.pending }}
            </span>
          </button>
        </div>
        <router-link to="/crowdfundings/new" class="btn btn-primary btn-sm">+ 新建众筹</router-link>
      </div>

      <div class="search-box" style="margin-bottom: 16px;">
        <input
          v-model="searchKeyword"
          type="text"
          class="form-input"
          placeholder="搜索众筹项目标题..."
          @input="debouncedSearch"
        >
      </div>

      <div v-if="loadingCrowdfundings" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="crowdfundings.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📖</div>
        <div class="empty-state-text">暂无众筹项目</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>封面</th>
              <th>标题</th>
              <th>分类</th>
              <th>目标金额</th>
              <th>已筹金额</th>
              <th>进度</th>
              <th>支持者</th>
              <th>❤️ 点赞</th>
              <th>🔥 热度</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in crowdfundings" :key="c.id">
              <td>
                <div v-if="c.coverImage" class="thumb-cover" :style="{ backgroundImage: `url(${c.coverImage})` }"></div>
                <div v-else class="thumb-cover thumb-placeholder">📖</div>
              </td>
              <td class="font-medium">{{ c.title }}</td>
              <td><span class="tag">{{ getCategoryLabel(c.category) }}</span></td>
              <td class="text-sm">¥{{ formatMoney(c.targetAmount) }}</td>
              <td class="text-sm accent">¥{{ formatMoney(c.currentAmount) }}</td>
              <td>
                <div class="table-progress">
                  <div class="table-progress-bar">
                    <div class="table-progress-fill" :style="{ width: c.progress + '%' }"></div>
                  </div>
                  <span class="progress-text">{{ c.progress }}%</span>
                </div>
              </td>
              <td class="text-sm">{{ c.backerCount }}</td>
              <td class="text-sm">{{ c.likeCount || 0 }}</td>
              <td class="text-sm">{{ Math.round((c.hotScore || 0) * 100) / 100 }}</td>
              <td>
                <span :class="['badge', getStatusBadgeClass(c.status)]">
                  {{ statusLabel(c.status) }}
                </span>
              </td>
              <td>
                <router-link :to="`/crowdfundings/${c.id}`" class="btn btn-ghost btn-sm">查看</router-link>
                <button v-if="c.status === 'PENDING_REVIEW'" class="btn btn-primary btn-sm" @click="approveCrowdfunding(c)">✅ 通过</button>
                <button v-if="c.status === 'PENDING_REVIEW'" class="btn btn-secondary btn-sm" @click="rejectCrowdfunding(c)">❌ 驳回</button>
                <button v-if="['DRAFT', 'REJECTED'].includes(c.status)" class="btn btn-ghost btn-sm" @click="publishCrowdfunding(c)">发布</button>
                <button v-if="c.status === 'PUBLISHED'" class="btn btn-ghost btn-sm" @click="toggleFeature(c)">
                  {{ c.isFeatured ? '取消精选' : '设为精选' }}
                </button>
                <button v-if="c.status === 'PUBLISHED'" class="btn btn-ghost btn-sm" @click="unpublishCrowdfunding(c)">结束</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteCrowdfunding(c)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page === 1" @click="loadCrowdfundings(page - 1)">←</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="page === totalPages" @click="loadCrowdfundings(page + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'orders'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in orderStatusFilters"
            :key="f.value"
            :class="['btn', orderStatusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="orderStatusFilter = f.value; loadOrders(1)"
          >
            {{ f.label }}
          </button>
        </div>
        <div class="search-box" style="width: 240px;">
          <input
            v-model="orderSearch"
            type="text"
            class="form-input"
            placeholder="搜索订单号/收货人..."
            @input="debouncedOrderSearch"
          >
        </div>
      </div>

      <div v-if="loadingOrders" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="orders.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📦</div>
        <div class="empty-state-text">暂无订单记录</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>订单号</th>
              <th>众筹项目</th>
              <th>档位</th>
              <th>支持者</th>
              <th>金额</th>
              <th>状态</th>
              <th>下单时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id">
              <td class="font-mono text-sm">{{ order.orderNo }}</td>
              <td class="font-medium">{{ order.crowdfunding?.title }}</td>
              <td class="text-sm">{{ order.tier?.name }}</td>
              <td>
                <div class="user-cell">
                  <img :src="order.user?.avatar" alt="">
                  <span>{{ order.user?.username }}</span>
                </div>
              </td>
              <td class="accent font-medium">¥{{ order.amount }}</td>
              <td>
                <span :class="['badge', getOrderStatusBadgeClass(order.status)]">
                  {{ order.statusText }}
                </span>
              </td>
              <td class="text-sm">{{ formatDateTime(order.createdAt) }}</td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="viewOrder(order)">详情</button>
                <button v-if="order.status === 'PAID'" class="btn btn-primary btn-sm" @click="shipOrder(order)">发货</button>
                <button v-if="['PAID', 'SHIPPED'].includes(order.status)" class="btn btn-danger btn-sm" @click="refundOrder(order)">退款</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="orderTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="orderPage === 1" @click="loadOrders(orderPage - 1)">←</button>
        <span class="page-info">第 {{ orderPage }} / {{ orderTotalPages }} 页</span>
        <button class="page-btn" :disabled="orderPage === orderTotalPages" @click="loadOrders(orderPage + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'comments'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in commentStatusFilters"
            :key="f.value"
            :class="['btn', commentStatusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="commentStatusFilter = f.value; loadComments(1)"
          >
            {{ f.label }}
          </button>
        </div>
        <div class="search-box" style="width: 240px;">
          <input
            v-model="commentSearch"
            type="text"
            class="form-input"
            placeholder="搜索评论内容..."
            @input="debouncedCommentSearch"
          >
        </div>
      </div>

      <div v-if="loadingComments" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="adminComments.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">💬</div>
        <div class="empty-state-text">暂无评论</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>评论者</th>
              <th>众筹项目</th>
              <th>内容</th>
              <th>类型</th>
              <th>点赞</th>
              <th>状态</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in adminComments" :key="c.id">
              <td class="text-sm">#{{ c.id }}</td>
              <td>
                <div class="user-cell">
                  <img :src="c.user?.avatar" alt="">
                  <span>{{ c.user?.username }}</span>
                </div>
              </td>
              <td class="text-sm">{{ c.crowdfunding?.title }}</td>
              <td class="comment-cell">{{ c.content }}</td>
              <td>
                <span :class="['tag', c.parentId ? 'tag-reply' : 'tag-root']">
                  {{ c.parentId ? '回复' : '评论' }}
                </span>
              </td>
              <td class="text-sm">{{ c.likeCount || 0 }}</td>
              <td>
                <span :class="['badge', getCommentStatusBadge(c.status)]">
                  {{ commentStatusLabel(c.status) }}
                </span>
              </td>
              <td class="text-sm">{{ formatDateTime(c.createdAt) }}</td>
              <td>
                <button v-if="c.status !== 'APPROVED'" class="btn btn-primary btn-sm" @click="approveComment(c)">通过</button>
                <button v-if="c.status !== 'HIDDEN'" class="btn btn-secondary btn-sm" @click="hideComment(c)">隐藏</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="adminDeleteComment(c)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="commentTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="commentPage === 1" @click="loadComments(commentPage - 1)">←</button>
        <span class="page-info">第 {{ commentPage }} / {{ commentTotalPages }} 页</span>
        <button class="page-btn" :disabled="commentPage === commentTotalPages" @click="loadComments(commentPage + 1)">→</button>
      </div>
    </div>

    <div v-if="showOrderModal" class="modal-overlay" @click.self="showOrderModal = false">
      <div class="modal card" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="font-semibold">订单详情</h3>
          <button class="btn btn-ghost btn-sm" @click="showOrderModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="currentOrder" class="order-detail">
            <div class="detail-row">
              <span class="detail-label">订单号</span>
              <span class="detail-value font-mono">{{ currentOrder.orderNo }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">众筹项目</span>
              <span class="detail-value">{{ currentOrder.crowdfunding?.title }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">档位</span>
              <span class="detail-value">{{ currentOrder.tier?.name }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">支持者</span>
              <span class="detail-value">{{ currentOrder.user?.username }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">金额</span>
              <span class="detail-value accent">¥{{ currentOrder.amount }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">状态</span>
              <span :class="['badge', getOrderStatusBadgeClass(currentOrder.status)]">{{ currentOrder.statusText }}</span>
            </div>
            <div v-if="currentOrder.receiverName" class="detail-row">
              <span class="detail-label">收货人</span>
              <span class="detail-value">{{ currentOrder.receiverName }} {{ currentOrder.receiverPhone }}</span>
            </div>
            <div v-if="currentOrder.receiverAddress" class="detail-row">
              <span class="detail-label">收货地址</span>
              <span class="detail-value">{{ currentOrder.receiverAddress }}</span>
            </div>
            <div v-if="currentOrder.trackingNumber" class="detail-row">
              <span class="detail-label">物流单号</span>
              <span class="detail-value font-mono">{{ currentOrder.trackingNumber }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">下单时间</span>
              <span class="detail-value">{{ formatDateTime(currentOrder.createdAt) }}</span>
            </div>
            <div v-if="currentOrder.paidAt" class="detail-row">
              <span class="detail-label">支付时间</span>
              <span class="detail-value">{{ formatDateTime(currentOrder.paidAt) }}</span>
            </div>
            <div v-if="currentOrder.remark" class="detail-row">
              <span class="detail-label">备注</span>
              <span class="detail-value">{{ currentOrder.remark }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showShipModal" class="modal-overlay" @click.self="showShipModal = false">
      <div class="modal card" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="font-semibold">订单发货</h3>
          <button class="btn btn-ghost btn-sm" @click="showShipModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">物流单号 <span class="optional">可选</span></label>
            <input v-model="shipTracking" class="form-input" placeholder="请输入物流单号">
          </div>
          <div class="modal-footer" style="padding: 0;">
            <button type="button" class="btn btn-secondary" @click="showShipModal = false">取消</button>
            <button type="button" class="btn btn-primary" @click="confirmShip" :disabled="shipping">
              {{ shipping ? '处理中...' : '确认发货' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const showToast = inject('showToast')

const tabs = [
  { value: 'overview', label: '数据概览', icon: '📊' },
  { value: 'crowdfundings', label: '众筹项目', icon: '📖' },
  { value: 'orders', label: '订单管理', icon: '📦' },
  { value: 'comments', label: '评论审核', icon: '💬' }
]

const currentTab = ref('overview')

const stats = ref({
  total: 0,
  pending: 0,
  published: 0,
  funded: 0,
  totalAmount: 0,
  totalBackers: 0,
  totalLikes: 0,
  avgHotScore: 0,
  maxHotScore: 0,
  pendingOrders: 0
})

const statusFilters = [
  { value: 'all', label: '全部' },
  { value: 'PENDING_REVIEW', label: '待审核' },
  { value: 'PUBLISHED', label: '众筹中' },
  { value: 'SUCCESSFUL', label: '已达成' },
  { value: 'ENDED', label: '已结束' },
  { value: 'REJECTED', label: '已驳回' }
]

const orderStatusFilters = [
  { value: 'all', label: '全部' },
  { value: 'PENDING', label: '待支付' },
  { value: 'PAID', label: '已支付' },
  { value: 'SHIPPED', label: '已发货' },
  { value: 'DELIVERED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'REFUNDED', label: '已退款' }
]

const categories = [
  { id: 'ZINE', name: '刊物', icon: '📖' },
  { id: 'ART', name: '艺术', icon: '🎨' },
  { id: 'BOOK', name: '书籍', icon: '📚' },
  { id: 'MUSIC', name: '音乐', icon: '🎵' },
  { id: 'GAME', name: '游戏', icon: '🎮' },
  { id: 'TECH', name: '科技', icon: '💻' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const crowdfundings = ref([])
const loadingCrowdfundings = ref(false)
const statusFilter = ref('all')
const searchKeyword = ref('')
const page = ref(1)
const totalPages = ref(0)
const pageSize = 10

const orders = ref([])
const loadingOrders = ref(false)
const orderStatusFilter = ref('all')
const orderSearch = ref('')
const orderPage = ref(1)
const orderTotalPages = ref(0)

const showOrderModal = ref(false)
const currentOrder = ref(null)
const showShipModal = ref(false)
const shipping = ref(false)
const shipTracking = ref('')
let shippingOrder = null

const adminComments = ref([])
const loadingComments = ref(false)
const commentStatusFilter = ref('all')
const commentSearch = ref('')
const commentPage = ref(1)
const commentTotalPages = ref(0)

const commentStatusFilters = [
  { value: 'all', label: '全部' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'HIDDEN', label: '已隐藏' },
  { value: 'PENDING', label: '待审核' }
]

const formatMoney = (amount) => {
  if (!amount) return '0'
  return Number(amount).toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

const formatDateTime = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getCategoryLabel = (cat) => {
  const found = categories.find(c => c.id === cat)
  return found ? `${found.icon} ${found.name}` : cat
}

const statusLabel = (status) => {
  const map = {
    DRAFT: '草稿',
    PENDING_REVIEW: '待审核',
    PUBLISHED: '众筹中',
    REJECTED: '已驳回',
    SUCCESSFUL: '已达成',
    ENDED: '已结束'
  }
  return map[status] || status
}

const getStatusBadgeClass = (status) => {
  const map = {
    DRAFT: 'badge-gray',
    PENDING_REVIEW: 'badge-orange',
    PUBLISHED: 'badge-blue',
    REJECTED: 'badge-red',
    SUCCESSFUL: 'badge-green',
    ENDED: 'badge-gray'
  }
  return map[status] || 'badge-gray'
}

const getOrderStatusBadgeClass = (status) => {
  const map = {
    PENDING: 'badge-orange',
    PAID: 'badge-blue',
    SHIPPED: 'badge-cyan',
    DELIVERED: 'badge-green',
    CANCELLED: 'badge-gray',
    REFUNDED: 'badge-red'
  }
  return map[status] || 'badge-gray'
}

const switchTab = (tab) => {
  currentTab.value = tab
  if (tab === 'crowdfundings') loadCrowdfundings(1)
  if (tab === 'orders') loadOrders(1)
  if (tab === 'overview') loadStats()
  if (tab === 'comments') loadComments(1)
}

const loadStats = async () => {
  try {
    const res = await api.get('/admin/crowdfundings/stats')
    stats.value = res
  } catch (e) {
    console.error(e)
  }
}

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadCrowdfundings(1), 400)
}

let orderSearchTimer = null
const debouncedOrderSearch = () => {
  clearTimeout(orderSearchTimer)
  orderSearchTimer = setTimeout(() => loadOrders(1), 400)
}

const loadCrowdfundings = async (newPage = 1) => {
  loadingCrowdfundings.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({
      page: newPage,
      limit: pageSize
    })
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value)
    if (searchKeyword.value) params.set('keyword', searchKeyword.value)
    const res = await api.get(`/admin/crowdfundings?${params}`)
    crowdfundings.value = res.crowdfundings
    totalPages.value = res.totalPages
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loadingCrowdfundings.value = false
  }
}

const loadOrders = async (newPage = 1) => {
  loadingOrders.value = true
  orderPage.value = newPage
  try {
    const params = new URLSearchParams({
      page: newPage,
      limit: pageSize
    })
    if (orderStatusFilter.value !== 'all') params.set('status', orderStatusFilter.value)
    if (orderSearch.value) params.set('keyword', orderSearch.value)
    if (route.query.crowdfundingId) params.set('crowdfundingId', route.query.crowdfundingId)
    const res = await api.get(`/admin/crowdfundings/orders?${params}`)
    orders.value = res.orders
    orderTotalPages.value = res.totalPages
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loadingOrders.value = false
  }
}

const approveCrowdfunding = async (c) => {
  if (!confirm(`确定审核通过并发布《${c.title}》吗？`)) return
  try {
    await api.post(`/admin/crowdfundings/${c.id}/publish`)
    showToast('已通过并发布', 'success')
    loadCrowdfundings(page.value)
    loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const rejectCrowdfunding = async (c) => {
  const reason = prompt('请输入驳回原因')
  if (reason === null) return
  try {
    await api.post(`/admin/crowdfundings/${c.id}/reject`, { reason })
    showToast('已驳回', 'success')
    loadCrowdfundings(page.value)
    loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const publishCrowdfunding = async (c) => {
  if (!confirm(`确定发布《${c.title}》吗？`)) return
  try {
    await api.post(`/admin/crowdfundings/${c.id}/publish`)
    showToast('发布成功', 'success')
    loadCrowdfundings(page.value)
    loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const unpublishCrowdfunding = async (c) => {
  if (!confirm(`确定结束众筹《${c.title}》吗？`)) return
  try {
    await api.post(`/admin/crowdfundings/${c.id}/unpublish`)
    showToast('已结束', 'success')
    loadCrowdfundings(page.value)
    loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const toggleFeature = async (c) => {
  try {
    await api.post(`/admin/crowdfundings/${c.id}/feature`)
    showToast(c.isFeatured ? '已取消精选' : '已设为精选', 'success')
    loadCrowdfundings(page.value)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const deleteCrowdfunding = async (c) => {
  if (!confirm(`确定删除《${c.title}》吗？此操作不可恢复。`)) return
  try {
    await api.delete(`/admin/crowdfundings/${c.id}`)
    showToast('删除成功', 'success')
    loadCrowdfundings(page.value)
    loadStats()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const viewOrder = (order) => {
  currentOrder.value = order
  showOrderModal.value = true
}

const shipOrder = (order) => {
  shippingOrder = order
  shipTracking.value = ''
  showShipModal.value = true
}

const confirmShip = async () => {
  if (!shippingOrder) return
  shipping.value = true
  try {
    await api.put(`/admin/crowdfundings/orders/${shippingOrder.id}/ship`, {
      trackingNumber: shipTracking.value
    })
    showShipModal.value = false
    showToast('已发货', 'success')
    loadOrders(orderPage.value)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    shipping.value = false
  }
}

const refundOrder = async (order) => {
  const reason = prompt('请输入退款原因')
  if (reason === null) return
  if (!confirm(`确定为订单 ${order.orderNo} 办理退款吗？`)) return
  try {
    await api.put(`/admin/crowdfundings/orders/${order.id}/refund`, { reason })
    showToast('已退款', 'success')
    loadOrders(orderPage.value)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

let commentSearchTimer = null
const debouncedCommentSearch = () => {
  clearTimeout(commentSearchTimer)
  commentSearchTimer = setTimeout(() => loadComments(1), 400)
}

const loadComments = async (newPage = 1) => {
  loadingComments.value = true
  commentPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 20 })
    if (commentStatusFilter.value !== 'all') params.set('status', commentStatusFilter.value)
    if (commentSearch.value) params.set('keyword', commentSearch.value)
    const res = await api.get(`/admin/crowdfunding-comments/comments?${params}`)
    adminComments.value = res.comments
    commentTotalPages.value = res.totalPages
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loadingComments.value = false
  }
}

const commentStatusLabel = (status) => {
  const map = { APPROVED: '已通过', HIDDEN: '已隐藏', PENDING: '待审核' }
  return map[status] || status
}

const getCommentStatusBadge = (status) => {
  const map = { APPROVED: 'badge-green', HIDDEN: 'badge-red', PENDING: 'badge-orange' }
  return map[status] || 'badge-gray'
}

const approveComment = async (c) => {
  try {
    await api.put(`/admin/crowdfunding-comments/comments/${c.id}/status`, { status: 'APPROVED' })
    showToast('已通过', 'success')
    loadComments(commentPage.value)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const hideComment = async (c) => {
  try {
    await api.put(`/admin/crowdfunding-comments/comments/${c.id}/status`, { status: 'HIDDEN' })
    showToast('已隐藏', 'success')
    loadComments(commentPage.value)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const adminDeleteComment = async (c) => {
  if (!confirm('确定删除此评论吗？')) return
  try {
    await api.delete(`/admin/crowdfunding-comments/comments/${c.id}`)
    showToast('已删除', 'success')
    loadComments(commentPage.value)
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

onMounted(() => {
  loadStats()
  if (route.query.tab === 'orders') {
    currentTab.value = 'orders'
    loadOrders(1)
  }
})
</script>

<style scoped>
.admin-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: var(--bg-secondary);
  padding: 8px;
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.admin-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.admin-tab:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.admin-tab.active {
  background: var(--accent);
  color: #fff;
  font-weight: 500;
}

.tab-icon {
  font-size: 18px;
}

.tab-badge {
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 100px;
  font-weight: 600;
}

.tab-badge-sm {
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 100px;
  margin-left: 4px;
}

.section { margin-bottom: 32px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  padding: 20px;
  display: flex;
  gap: 16px;
  align-items: center;
}

.stat-icon {
  font-size: 36px;
}

.stat-info { flex: 1; }

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.gap-sm { gap: 8px; }
.mb { margin-bottom: 16px; }

.search-box {
  position: relative;
}

.admin-list {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table th,
.admin-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.admin-table th {
  background: var(--bg-tertiary);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.admin-table td {
  font-size: 14px;
}

.thumb-cover {
  width: 48px;
  height: 36px;
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 4px;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-gray { background: #f5f5f5; color: #8c8c8c; }
.badge-orange { background: #fff7e6; color: #d48806; }
.badge-blue { background: #e6f7ff; color: #1890ff; }
.badge-green { background: #f6ffed; color: #52c41a; }
.badge-red { background: #fff1f0; color: #cf1322; }
.badge-cyan { background: #e6fffb; color: #13c2c2; }

.text-sm { font-size: 12px; }
.text-sm { font-size: 12px; }
.accent { color: var(--accent); }
.font-medium { font-weight: 500; }
.font-mono { font-family: monospace; }

.table-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-progress-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 100px;
  overflow: hidden;
  min-width: 60px;
}

.table-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 100px;
}

.progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 36px;
  text-align: right;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-cell img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.btn-danger {
  background: var(--danger);
  color: #fff;
}

.danger-btn {
  color: var(--danger) !important;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.page-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal {
  width: 100%;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-light);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  margin-top: 8px;
}

.order-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  font-size: 14px;
}

.detail-label {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.detail-value {
  color: var(--text-primary);
  text-align: right;
  flex: 1;
  word-break: break-all;
}

.optional {
  font-weight: 400;
  color: var(--text-tertiary);
  font-size: 12px;
}

.comment-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-reply {
  background: #f9f0ff;
  color: #722ed1;
}

.tag-root {
  background: #e6f7ff;
  color: #1890ff;
}
</style>
