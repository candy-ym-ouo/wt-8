<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">我的众筹订单</h1>
      <p class="page-subtitle">查看您支持过的所有众筹项目</p>
    </div>

    <div class="filter-tabs card" style="padding: 0; margin-bottom: 24px;">
      <button
        v-for="tab in statusTabs"
        :key="tab.id"
        :class="['filter-tab', { active: currentStatus === tab.id }]"
        @click="setStatus(tab.id)"
      >
        {{ tab.name }}
      </button>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="orders.length === 0" class="empty-state">
      <div class="empty-state-icon">📦</div>
      <div class="empty-state-text">暂无订单记录</div>
      <router-link to="/crowdfundings" class="btn btn-primary">去逛逛</router-link>
    </div>
    <div v-else class="orders-list">
      <div
        v-for="order in orders"
        :key="order.id"
        class="order-card card"
      >
        <div class="order-header">
          <div class="order-info">
            <span class="order-no">订单号：{{ order.orderNo }}</span>
            <span class="order-time">{{ formatDateTime(order.createdAt) }}</span>
          </div>
          <span :class="['order-status', `status-${order.status.toLowerCase()}`]">
            {{ order.statusText }}
          </span>
        </div>
        <div class="order-body">
          <router-link :to="`/crowdfundings/${order.crowdfundingId}`" class="order-item">
            <div class="item-cover" :style="order.crowdfunding?.coverImage ? { backgroundImage: `url(${order.crowdfunding.coverImage})` } : {}">
              <span v-if="!order.crowdfunding?.coverImage" class="cover-placeholder">📖</span>
            </div>
            <div class="item-info">
              <h4 class="item-title">{{ order.crowdfunding?.title }}</h4>
              <p class="item-tier">档位：{{ order.tier?.name }}</p>
              <p class="item-qty">数量：×{{ order.quantity }}</p>
            </div>
          </router-link>
          <div class="order-amount">
            <span class="amount-label">实付金额</span>
            <span class="amount-value">¥{{ order.amount }}</span>
          </div>
        </div>
        <div class="order-footer">
          <div class="receiver-info" v-if="order.receiverName">
            <span>收货人：{{ order.receiverName }} {{ order.receiverPhone }}</span>
          </div>
          <div class="order-actions">
            <router-link
              :to="`/crowdfundings/${order.crowdfundingId}`"
              class="btn btn-outline btn-sm"
            >
              查看详情
            </router-link>
            <button
              v-if="order.status === 'PENDING'"
              class="btn btn-primary btn-sm"
              @click="payOrder(order)"
            >
              立即支付
            </button>
            <button
              v-if="order.status === 'PENDING'"
              class="btn btn-ghost btn-sm"
              @click="cancelOrder(order)"
            >
              取消订单
            </button>
            <button
              v-if="order.status === 'SHIPPED'"
              class="btn btn-primary btn-sm"
              @click="confirmReceive(order)"
            >
              确认收货
            </button>
          </div>
        </div>
        <div v-if="order.trackingNumber" class="tracking-info">
          <span class="tracking-label">物流单号：</span>
          <span class="tracking-number">{{ order.trackingNumber }}</span>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="page === 1"
        @click="fetchOrders(page - 1)"
      >
        ←
      </button>
      <button
        v-for="p in displayPages"
        :key="p"
        :class="['page-btn', { active: p === page }]"
        @click="p !== '...' && fetchOrders(p)"
        :disabled="p === '...'"
      >
        {{ p }}
      </button>
      <button
        class="page-btn"
        :disabled="page === totalPages"
        @click="fetchOrders(page + 1)"
      >
        →
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')
const orders = ref([])
const loading = ref(false)
const currentStatus = ref('all')
const page = ref(1)
const total = ref(0)
const pageSize = 10

const statusTabs = [
  { id: 'all', name: '全部' },
  { id: 'PAID', name: '已支付' },
  { id: 'SHIPPED', name: '已发货' },
  { id: 'DELIVERED', name: '已完成' },
  { id: 'CANCELLED', name: '已取消' }
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

const formatDateTime = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const setStatus = (status) => {
  currentStatus.value = status
  fetchOrders(1)
}

const fetchOrders = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({
      page: newPage,
      limit: pageSize
    })
    if (currentStatus.value !== 'all') params.set('status', currentStatus.value)
    const res = await api.get(`/crowdfunding-orders/mine?${params}`)
    orders.value = res.orders
    total.value = res.total
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const payOrder = async (order) => {
  if (!confirm('确认支付该订单吗？')) return
  try {
    await api.post(`/crowdfunding-orders/${order.id}/pay`)
    showToast('支付成功', 'success')
    fetchOrders(page.value)
  } catch (e) {
    showToast(e.error || '支付失败', 'error')
  }
}

const cancelOrder = async (order) => {
  const reason = prompt('请输入取消原因（可选）')
  if (reason === null) return
  try {
    await api.post(`/crowdfunding-orders/${order.id}/cancel`, { reason })
    showToast('订单已取消', 'success')
    fetchOrders(page.value)
  } catch (e) {
    showToast(e.error || '取消失败', 'error')
  }
}

const confirmReceive = async (order) => {
  if (!confirm('确认已收到商品吗？')) return
  try {
    await api.put(`/crowdfunding-orders/${order.id}/deliver`)
    showToast('已确认收货', 'success')
    fetchOrders(page.value)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.filter-tabs {
  display: flex;
  overflow-x: auto;
}

.filter-tab {
  padding: 14px 24px;
  background: transparent;
  border: none;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: all 0.2s;
}

.filter-tab:hover {
  color: var(--text-primary);
}

.filter-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 500;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-card {
  overflow: hidden;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-light);
}

.order-info {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.order-no {
  font-weight: 500;
  color: var(--text-primary);
}

.order-status {
  font-size: 13px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 4px;
}

.status-pending { background: #fff7e6; color: #d48806; }
.status-paid { background: #e6f7ff; color: #1890ff; }
.status-shipped { background: #e6fffb; color: #13c2c2; }
.status-delivered { background: #f6ffed; color: #52c41a; }
.status-cancelled { background: #f5f5f5; color: #8c8c8c; }
.status-refunded { background: #fff1f0; color: #cf1322; }

.order-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  gap: 20px;
}

.order-item {
  display: flex;
  gap: 16px;
  flex: 1;
  text-decoration: none;
  color: inherit;
}

.item-cover {
  width: 100px;
  height: 80px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cover-placeholder {
  font-size: 32px;
  opacity: 0.5;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-tier {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.item-qty {
  font-size: 13px;
  color: var(--text-tertiary);
}

.order-amount {
  text-align: right;
  flex-shrink: 0;
}

.amount-label {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.amount-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-tertiary);
}

.receiver-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.order-actions {
  display: flex;
  gap: 8px;
}

.tracking-info {
  padding: 10px 20px;
  border-top: 1px solid var(--border-light);
  font-size: 13px;
  background: #f0f9ff;
}

.tracking-label {
  color: var(--text-secondary);
}

.tracking-number {
  color: #1890ff;
  font-family: monospace;
  font-weight: 500;
}
</style>
