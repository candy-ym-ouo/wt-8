<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">印刷预约管理</h1>
      <p class="page-subtitle">审核送印申请、提供报价、管理印刷进度</p>
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
        <span v-if="t.value === 'pending' && stats.pending > 0" class="tab-badge">{{ stats.pending }}</span>
        <span v-if="t.value === 'quoted' && stats.quoted > 0" class="tab-badge">{{ stats.quoted }}</span>
      </button>
    </div>

    <div v-if="currentTab === 'overview'" class="section">
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">预约总数</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #d48806;">{{ stats.pending }}</div>
            <div class="stat-label">待审核</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #13c2c2;">{{ stats.quoted }}</div>
            <div class="stat-label">待确认报价</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #1890ff;">{{ stats.confirmed }}</div>
            <div class="stat-label">待印刷</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">🖨</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #722ed1;">{{ stats.printing }}</div>
            <div class="stat-label">印刷中</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #52c41a;">{{ stats.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">💵</div>
          <div class="stat-info">
            <div class="stat-value">¥{{ formatMoney(stats.totalRevenue) }}</div>
            <div class="stat-label">累计营收</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'pending'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">待审核申请</h3>
      </div>
      <div v-if="loading" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="pendingOrders.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">暂无待审核申请</div>
      </div>
      <div v-else class="submissions-list">
        <div v-for="o in pendingOrders" :key="o.id" class="sub-admin-card card">
          <div class="sub-admin-header">
            <div class="user-info">
              <img :src="o.creator?.avatar" class="sub-user-avatar">
              <div>
                <div class="font-medium">{{ o.creator?.username }}</div>
                <div class="text-xs text-tertiary">{{ formatDateTime(o.createdAt) }}</div>
              </div>
            </div>
            <span class="badge badge-orange">待审核</span>
          </div>
          <h3 class="sub-admin-title font-serif">{{ o.title }}</h3>
          <div class="sub-admin-content text-sm text-muted">
            {{ o.description.substring(0, 200) }}{{ o.description.length > 200 ? '...' : '' }}
          </div>
          <div class="spec-inline">
            <span class="spec-chip">{{ getPaperSizeLabel(o.paperSize) }}</span>
            <span class="spec-chip">{{ o.pageCount }}P</span>
            <span class="spec-chip">{{ o.printQuantity }}册</span>
            <span class="spec-chip">{{ getBindingLabel(o.binding) }}</span>
            <span class="spec-chip">{{ getCoverTypeLabel(o.coverType) }}</span>
          </div>
          <div class="sub-admin-actions">
            <button class="btn btn-primary btn-sm" @click="approveOrder(o)">✅ 通过并报价</button>
            <button class="btn btn-secondary btn-sm" @click="rejectOrder(o)">❌ 驳回</button>
            <router-link :to="`/print-orders/${o.id}`" class="btn btn-ghost btn-sm">查看详情</router-link>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'quoted'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">已报价 / 待确认</h3>
      </div>
      <div v-if="loading" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="quotedOrders.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">💰</div>
        <div class="empty-state-text">暂无已报价订单</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>刊物名称</th>
              <th>申请人</th>
              <th>规格</th>
              <th>数量</th>
              <th>单价</th>
              <th>总价</th>
              <th>报价时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in quotedOrders" :key="o.id">
              <td class="font-medium">{{ o.title }}</td>
              <td class="text-sm">{{ o.creator?.username }}</td>
              <td class="text-sm">{{ getPaperSizeLabel(o.paperSize) }} / {{ o.pageCount }}P</td>
              <td>{{ o.printQuantity }}册</td>
              <td>¥{{ formatMoney(o.unitPrice) }}</td>
              <td class="accent font-medium">¥{{ formatMoney(o.totalPrice) }}</td>
              <td class="text-xs text-tertiary">{{ formatDateTime(o.quotedAt) }}</td>
              <td>
                <span :class="['badge', o.status === 'QUOTED' ? 'badge-cyan' : 'badge-green']">
                  {{ o.status === 'QUOTED' ? '待确认' : '已确认' }}
                </span>
              </td>
              <td>
                <router-link :to="`/print-orders/${o.id}`" class="btn btn-ghost btn-sm">详情</router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'all'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            :class="['btn', statusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="statusFilter = f.value; loadOrders(1)"
          >
            {{ f.label }}
          </button>
        </div>
        <div class="search-box" style="width: 240px;">
          <input
            v-model="searchKeyword"
            type="text"
            class="form-input"
            placeholder="搜索刊物名称..."
            @input="debouncedSearch"
          >
        </div>
      </div>

      <div v-if="loading" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="allOrders.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">暂无印刷预约</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>刊物名称</th>
              <th>申请人</th>
              <th>规格</th>
              <th>数量</th>
              <th>报价</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in allOrders" :key="o.id">
              <td class="font-medium">{{ o.title }}</td>
              <td>
                <div class="user-cell">
                  <img :src="o.creator?.avatar" alt="">
                  <span>{{ o.creator?.username }}</span>
                </div>
              </td>
              <td class="text-sm">{{ getPaperSizeLabel(o.paperSize) }} / {{ o.pageCount }}P / {{ getBindingLabel(o.binding) }}</td>
              <td>{{ o.printQuantity }}册</td>
              <td class="accent font-medium">{{ o.totalPrice ? '¥' + formatMoney(o.totalPrice) : '-' }}</td>
              <td>
                <span :class="['badge', getStatusBadgeClass(o.status)]">{{ getStatusLabel(o.status) }}</span>
              </td>
              <td class="text-xs text-tertiary">{{ formatDateTime(o.createdAt) }}</td>
              <td>
                <router-link :to="`/print-orders/${o.id}`" class="btn btn-ghost btn-sm">详情</router-link>
                <button v-if="o.status === 'PENDING_REVIEW'" class="btn btn-primary btn-sm" @click="approveOrder(o)">通过</button>
                <button v-if="o.status === 'PENDING_REVIEW'" class="btn btn-secondary btn-sm" @click="rejectOrder(o)">驳回</button>
                <button v-if="o.status === 'APPROVED'" class="btn btn-primary btn-sm" @click="openQuoteModal(o)">报价</button>
                <button v-if="o.status === 'CONFIRMED'" class="btn btn-primary btn-sm" @click="startPrinting(o)">开始印刷</button>
                <button v-if="o.status === 'PRINTING'" class="btn btn-success btn-sm" @click="completePrinting(o)">完成</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteOrder(o)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page === 1" @click="loadOrders(page - 1)">←</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="page === totalPages" @click="loadOrders(page + 1)">→</button>
      </div>
    </div>

    <div v-if="showQuoteModal" class="modal-overlay" @click.self="showQuoteModal = false">
      <div class="modal card" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="font-semibold">提供报价 · {{ quotingOrder?.title }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showQuoteModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="quote-spec-summary">
            <span>{{ getPaperTypeLabel(quotingOrder?.paperType) }}</span>
            <span>{{ quotingOrder?.paperSize }}</span>
            <span>{{ quotingOrder?.pageCount }}P</span>
            <span>{{ quotingOrder?.printQuantity }}册</span>
            <span>{{ getBindingLabel(quotingOrder?.binding) }}</span>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">单价（元/册）<span class="required">*</span></label>
              <div class="input-with-prefix">
                <span class="prefix">¥</span>
                <input v-model.number="quoteForm.unitPrice" type="number" class="form-input" placeholder="0.00" min="0" step="0.01">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">总价 <span class="required">*</span></label>
              <div class="input-with-prefix">
                <span class="prefix">¥</span>
                <input v-model.number="quoteForm.totalPrice" type="number" class="form-input" placeholder="0.00" min="0" step="0.01">
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">报价备注</label>
            <textarea v-model="quoteForm.quotationNote" class="form-textarea" rows="3" placeholder="工期说明、注意事项等..."></textarea>
          </div>
          <div class="form-group">
            <button class="btn btn-secondary btn-sm" type="button" @click="autoCalcTotal">自动计算总价</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showQuoteModal = false">取消</button>
          <button class="btn btn-primary" @click="submitQuote" :disabled="submitting">
            {{ submitting ? '提交中...' : '提交报价' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const tabs = [
  { value: 'overview', label: '数据概览', icon: '📊' },
  { value: 'pending', label: '待审核', icon: '⏳' },
  { value: 'quoted', label: '报价管理', icon: '💰' },
  { value: 'all', label: '全部订单', icon: '📋' }
]

const currentTab = ref('overview')
const loading = ref(false)
const submitting = ref(false)

const stats = ref({
  total: 0, pending: 0, quoted: 0, confirmed: 0,
  printing: 0, completed: 0, totalRevenue: 0
})

const pendingOrders = ref([])
const quotedOrders = ref([])
const allOrders = ref([])
const statusFilter = ref('all')
const searchKeyword = ref('')
const page = ref(1)
const totalPages = ref(0)
const pageSize = 10

const showQuoteModal = ref(false)
const quotingOrder = ref(null)
const quoteForm = ref({ unitPrice: 0, totalPrice: 0, quotationNote: '' })

const statusFilters = [
  { value: 'all', label: '全部' },
  { value: 'PENDING_REVIEW', label: '待审核' },
  { value: 'APPROVED', label: '已审核' },
  { value: 'QUOTED', label: '已报价' },
  { value: 'CONFIRMED', label: '已确认' },
  { value: 'PRINTING', label: '印刷中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'REJECTED', label: '已驳回' }
]

const formatMoney = (amount) => {
  if (!amount) return '0'
  return Number(amount).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

const formatDateTime = (d) => {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getStatusLabel = (status) => {
  const map = {
    DRAFT: '草稿', PENDING_REVIEW: '待审核', APPROVED: '已审核', REJECTED: '已驳回',
    QUOTED: '已报价', CONFIRMED: '已确认', PRINTING: '印刷中', COMPLETED: '已完成', CANCELLED: '已取消'
  }
  return map[status] || status
}

const getStatusBadgeClass = (status) => {
  const map = {
    DRAFT: 'badge-gray', PENDING_REVIEW: 'badge-orange', APPROVED: 'badge-blue',
    REJECTED: 'badge-red', QUOTED: 'badge-cyan', CONFIRMED: 'badge-green',
    PRINTING: 'badge-purple', COMPLETED: 'badge-green', CANCELLED: 'badge-gray'
  }
  return map[status] || 'badge-gray'
}

const getPaperTypeLabel = (v) => {
  const map = { COATED: '铜版纸', UNCOATED: '胶版纸', OFFSET: '轻型纸', KRAFT: '牛皮纸', ART: '艺术纸', SPECIAL: '特种纸' }
  return map[v] || v
}

const getPaperSizeLabel = (v) => {
  const map = { A3: 'A3', A4: 'A4', A5: 'A5', B5: 'B5', A6: 'A6', CUSTOM: '自定义' }
  return map[v] || v
}

const getBindingLabel = (v) => {
  const map = { SADDLE_STITCH: '骑马钉', PERFECT_BIND: '胶装', HARD_BIND: '精装', WIRE_BIND: '线圈装', FOLD: '折页' }
  return map[v] || v
}

const getCoverTypeLabel = (v) => {
  const map = { SOFT: '软封面', HARD: '硬封面', FLAP: '带勒口', DUST_JACKET: '护封' }
  return map[v] || v
}

const switchTab = (tab) => {
  currentTab.value = tab
  if (tab === 'overview') loadStats()
  if (tab === 'pending') loadPendingOrders()
  if (tab === 'quoted') loadQuotedOrders()
  if (tab === 'all') loadOrders(1)
}

const loadStats = async () => {
  try {
    const res = await api.get('/admin/print-orders/stats')
    stats.value = res
  } catch (e) {
    console.error(e)
  }
}

const loadPendingOrders = async () => {
  loading.value = true
  try {
    const res = await api.get('/admin/print-orders?status=PENDING_REVIEW&limit=50')
    pendingOrders.value = res.orders
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const loadQuotedOrders = async () => {
  loading.value = true
  try {
    const [quoted, confirmed] = await Promise.all([
      api.get('/admin/print-orders?status=QUOTED&limit=50'),
      api.get('/admin/print-orders?status=CONFIRMED&limit=50')
    ])
    quotedOrders.value = [...quoted.orders, ...confirmed.orders]
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadOrders(1), 400)
}

const loadOrders = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: pageSize })
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value)
    if (searchKeyword.value) params.set('keyword', searchKeyword.value)
    const res = await api.get(`/admin/print-orders?${params}`)
    allOrders.value = res.orders
    totalPages.value = res.totalPages
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const approveOrder = async (o) => {
  if (!confirm(`确定审核通过《${o.title}》吗？通过后需提供报价。`)) return
  try {
    await api.post(`/admin/print-orders/${o.id}/approve`)
    showToast('已审核通过，请提供报价', 'success')
    refreshCurrentTab()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const rejectOrder = async (o) => {
  const reason = prompt('请输入驳回原因')
  if (reason === null) return
  try {
    await api.post(`/admin/print-orders/${o.id}/reject`, { reason })
    showToast('已驳回', 'success')
    refreshCurrentTab()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const openQuoteModal = (o) => {
  quotingOrder.value = o
  quoteForm.value = { unitPrice: 0, totalPrice: 0, quotationNote: '' }
  showQuoteModal.value = true
}

const autoCalcTotal = () => {
  if (quoteForm.value.unitPrice && quotingOrder.value) {
    quoteForm.value.totalPrice = Number((quoteForm.value.unitPrice * quotingOrder.value.printQuantity).toFixed(2))
  }
}

const submitQuote = async () => {
  if (!quoteForm.value.unitPrice || !quoteForm.value.totalPrice) {
    showToast('请填写报价信息', 'error')
    return
  }
  submitting.value = true
  try {
    await api.post(`/admin/print-orders/${quotingOrder.value.id}/quote`, quoteForm.value)
    showQuoteModal.value = false
    showToast('报价已提交', 'success')
    refreshCurrentTab()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const startPrinting = async (o) => {
  if (!confirm(`确定开始印刷《${o.title}》吗？`)) return
  try {
    await api.post(`/admin/print-orders/${o.id}/start-printing`)
    showToast('已开始印刷', 'success')
    refreshCurrentTab()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const completePrinting = async (o) => {
  if (!confirm(`确定完成印刷《${o.title}》吗？`)) return
  try {
    await api.post(`/admin/print-orders/${o.id}/complete`)
    showToast('印刷已完成', 'success')
    refreshCurrentTab()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const deleteOrder = async (o) => {
  if (!confirm(`确定删除《${o.title}》吗？此操作不可恢复。`)) return
  try {
    await api.delete(`/admin/print-orders/${o.id}`)
    showToast('删除成功', 'success')
    refreshCurrentTab()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const refreshCurrentTab = () => {
  loadStats()
  if (currentTab.value === 'pending') loadPendingOrders()
  else if (currentTab.value === 'quoted') loadQuotedOrders()
  else if (currentTab.value === 'all') loadOrders(page.value)
}

onMounted(() => {
  loadStats()
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

.admin-tab:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.admin-tab.active { background: var(--accent); color: #fff; font-weight: 500; }
.tab-icon { font-size: 18px; }

.tab-badge {
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 100px;
  font-weight: 600;
}

.section { margin-bottom: 32px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.stat-card { padding: 20px; display: flex; gap: 16px; align-items: center; }
.stat-icon { font-size: 36px; }
.stat-info { flex: 1; }
.stat-value { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.stat-label { font-size: 13px; color: var(--text-secondary); }

.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.gap-sm { gap: 8px; }
.mb { margin-bottom: 16px; }

.sub-admin-card { padding: 20px; }
.sub-admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.user-info { display: flex; align-items: center; gap: 10px; }
.sub-user-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-tertiary); }
.sub-admin-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
.sub-admin-content { margin-bottom: 12px; line-height: 1.6; }
.sub-admin-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.spec-inline { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.spec-chip {
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 100px;
  font-size: 12px;
  color: var(--text-secondary);
}

.admin-list { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; }
.admin-table th, .admin-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-light); }
.admin-table th { background: var(--bg-tertiary); font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.admin-table td { font-size: 14px; }

.user-cell { display: flex; align-items: center; gap: 8px; }
.user-cell img { width: 24px; height: 24px; border-radius: 50%; background: var(--bg-tertiary); }

.badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.badge-gray { background: #f5f5f5; color: #8c8c8c; }
.badge-orange { background: #fff7e6; color: #d48806; }
.badge-blue { background: #e6f7ff; color: #1890ff; }
.badge-green { background: #f6ffed; color: #52c41a; }
.badge-red { background: #fff1f0; color: #cf1322; }
.badge-cyan { background: #e6fffb; color: #13c2c2; }
.badge-purple { background: #f9f0ff; color: #722ed1; }

.accent { color: var(--accent); }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.text-xs { font-size: 11px; }
.text-sm { font-size: 12px; }
.text-tertiary { color: var(--text-tertiary); }
.text-muted { color: var(--text-secondary); }

.btn-success { background: #52c41a; color: #fff; }
.btn-success:hover { background: #389e0d; }
.danger-btn { color: var(--danger) !important; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; }
.page-btn { min-width: 36px; height: 36px; padding: 0 12px; border: 1px solid var(--border); background: var(--bg-secondary); border-radius: 6px; cursor: pointer; transition: all 0.2s; }
.page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-secondary); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { width: 100%; background: var(--bg-secondary); border-radius: var(--radius); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid var(--border-light); }
.modal-body { padding: 24px; overflow-y: auto; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border-light); }

.quote-spec-summary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.quote-spec-summary span {
  padding: 4px 10px;
  background: var(--bg-secondary);
  border-radius: 100px;
  font-size: 13px;
  color: var(--text-secondary);
}

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.required { color: var(--danger); }

.input-with-prefix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-prefix .prefix {
  position: absolute;
  left: 12px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.input-with-prefix .form-input { padding-left: 28px; }

.search-box { position: relative; }
</style>
