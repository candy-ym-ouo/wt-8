<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>

    <template v-else-if="order">
      <div class="page-header">
        <div class="flex items-center gap-sm">
          <router-link to="/print-orders" class="back-btn">← 返回</router-link>
          <h1 class="page-title">{{ order.title }}</h1>
        </div>
        <div class="flex items-center gap-sm">
          <span :class="['status-badge', getStatusClass(order.status)]">
            {{ getStatusLabel(order.status) }}
          </span>
          <router-link
            v-if="isOwner && ['DRAFT', 'REJECTED', 'PENDING_REVIEW'].includes(order.status)"
            :to="`/print-orders/${order.id}/edit`"
            class="btn btn-secondary btn-sm"
          >
            编辑
          </router-link>
        </div>
      </div>

      <div class="detail-layout">
        <div class="detail-main">
          <div class="card flow-section">
            <h3 class="section-title">状态流转</h3>
            <div class="flow-steps">
              <div
                v-for="(step, idx) in flowSteps"
                :key="idx"
                :class="['flow-step', { active: idx <= currentStepIndex, current: idx === currentStepIndex }]"
              >
                <div class="step-dot">{{ step.icon }}</div>
                <div class="step-info">
                  <div class="step-label">{{ step.label }}</div>
                  <div v-if="step.time" class="step-time">{{ step.time }}</div>
                </div>
                <div v-if="idx < flowSteps.length - 1" class="step-line" :class="{ active: idx < currentStepIndex }"></div>
              </div>
            </div>
          </div>

          <div class="card" style="padding: 24px;">
            <h3 class="section-title">刊物信息</h3>
            <p class="order-desc">{{ order.description }}</p>
            <div v-if="order.tags?.length" class="tags-row">
              <span v-for="tag in order.tags" :key="tag" class="tag-chip">{{ tag }}</span>
            </div>
          </div>

          <div class="card" style="padding: 24px;">
            <h3 class="section-title">印刷规格</h3>
            <div class="spec-table">
              <div class="spec-row">
                <span class="spec-key">纸张类型</span>
                <span class="spec-val">{{ getPaperTypeLabel(order.paperType) }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-key">纸张尺寸</span>
                <span class="spec-val">{{ getPaperSizeLabel(order.paperSize) }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-key">页数</span>
                <span class="spec-val">{{ order.pageCount }}P</span>
              </div>
              <div class="spec-row">
                <span class="spec-key">色彩模式</span>
                <span class="spec-val">{{ getColorModeLabel(order.colorMode) }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-key">装订方式</span>
                <span class="spec-val">{{ getBindingLabel(order.binding) }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-key">封面类型</span>
                <span class="spec-val">{{ getCoverTypeLabel(order.coverType) }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-key">印刷数量</span>
                <span class="spec-val">{{ order.printQuantity }} 册</span>
              </div>
              <div v-if="order.specialReq?.length" class="spec-row">
                <span class="spec-key">特殊要求</span>
                <span class="spec-val">{{ order.specialReq.join('、') }}</span>
              </div>
            </div>
          </div>

          <div v-if="order.unitPrice || order.totalPrice" class="card quotation-card" style="padding: 24px;">
            <h3 class="section-title">报价信息</h3>
            <div class="quotation-body">
              <div class="quote-row">
                <span class="quote-key">单价</span>
                <span class="quote-val">¥{{ formatMoney(order.unitPrice) }} / 册</span>
              </div>
              <div class="quote-row total">
                <span class="quote-key">总价</span>
                <span class="quote-val accent">¥{{ formatMoney(order.totalPrice) }}</span>
              </div>
              <div v-if="order.quotationNote" class="quote-note">
                <strong>备注：</strong>{{ order.quotationNote }}
              </div>
              <div v-if="order.quoter" class="quote-meta">
                报价人：{{ order.quoter.username }} · {{ formatDateTime(order.quotedAt) }}
              </div>
            </div>

            <div v-if="order.status === 'QUOTED' && isOwner" class="quote-actions">
              <button class="btn btn-primary" @click="confirmQuotation" :disabled="actionLoading">
                {{ actionLoading ? '处理中...' : '确认报价' }}
              </button>
              <button class="btn btn-outline" @click="cancelOrder" :disabled="actionLoading">
                取消预约
              </button>
            </div>
          </div>

          <div class="card" style="padding: 24px;">
            <h3 class="section-title">联系信息</h3>
            <div class="spec-table">
              <div class="spec-row">
                <span class="spec-key">联系人</span>
                <span class="spec-val">{{ order.contactName }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-key">联系电话</span>
                <span class="spec-val">{{ order.contactPhone }}</span>
              </div>
              <div v-if="order.contactAddress" class="spec-row">
                <span class="spec-key">联系地址</span>
                <span class="spec-val">{{ order.contactAddress }}</span>
              </div>
              <div v-if="order.deliveryAddress" class="spec-row">
                <span class="spec-key">收货地址</span>
                <span class="spec-val">{{ order.deliveryAddress }}</span>
              </div>
              <div v-if="order.deliveryDate" class="spec-row">
                <span class="spec-key">期望交付</span>
                <span class="spec-val">{{ formatDate(order.deliveryDate) }}</span>
              </div>
            </div>
          </div>

          <div v-if="order.rejectionReason" class="card reject-card" style="padding: 24px;">
            <h3 class="section-title" style="color: var(--danger);">驳回原因</h3>
            <p>{{ order.rejectionReason }}</p>
            <button v-if="isOwner" class="btn btn-primary btn-sm" style="margin-top: 12px;" @click="resubmit" :disabled="actionLoading">
              修改并重新提交
            </button>
          </div>

          <div v-if="order.remark" class="card" style="padding: 24px;">
            <h3 class="section-title">备注</h3>
            <p class="text-sm text-muted" style="line-height: 1.8;">{{ order.remark }}</p>
          </div>
        </div>

        <div class="detail-sidebar">
          <div class="sidebar-card card sticky" style="padding: 20px;">
            <h3 class="sidebar-title">操作</h3>

            <div v-if="order.status === 'DRAFT' && isOwner" class="sidebar-actions">
              <router-link :to="`/print-orders/${order.id}/edit`" class="btn btn-primary btn-block">编辑并提交</router-link>
            </div>

            <div v-else-if="order.status === 'PENDING_REVIEW' && isOwner" class="sidebar-actions">
              <button class="btn btn-outline btn-block" @click="cancelOrder" :disabled="actionLoading">取消预约</button>
            </div>

            <div v-else-if="order.status === 'QUOTED' && isOwner" class="sidebar-actions">
              <button class="btn btn-primary btn-block" @click="confirmQuotation" :disabled="actionLoading">
                确认报价
              </button>
              <button class="btn btn-outline btn-block" @click="cancelOrder" :disabled="actionLoading">
                取消预约
              </button>
            </div>

            <div v-else-if="order.status === 'CONFIRMED'" class="sidebar-info">
              <p class="text-sm text-muted text-center">已确认报价，等待安排印刷</p>
            </div>

            <div v-else-if="order.status === 'PRINTING'" class="sidebar-info">
              <p class="text-sm text-muted text-center">正在印刷中，请耐心等待</p>
            </div>

            <div v-else-if="order.status === 'COMPLETED'" class="sidebar-info">
              <p class="text-sm" style="color: #52c41a; text-align: center;">印刷已完成！</p>
            </div>

            <div v-else-if="order.status === 'CANCELLED'" class="sidebar-info">
              <p class="text-sm text-muted text-center">已取消</p>
            </div>

            <div class="sidebar-meta">
              <div class="meta-row">
                <span class="meta-key">申请编号</span>
                <span class="meta-val">#{{ order.id }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-key">申请人</span>
                <span class="meta-val">{{ order.creator?.username }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-key">提交时间</span>
                <span class="meta-val">{{ formatDateTime(order.createdAt) }}</span>
              </div>
              <div v-if="order.reviewer" class="meta-row">
                <span class="meta-key">审核人</span>
                <span class="meta-val">{{ order.reviewer.username }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-text">印刷预约不存在</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const showToast = inject('showToast')

const order = ref(null)
const loading = ref(true)
const actionLoading = ref(false)
const isOwner = ref(false)

const currentStepIndex = computed(() => {
  const map = {
    DRAFT: 0, PENDING_REVIEW: 1, APPROVED: 2, REJECTED: -1,
    QUOTED: 3, CONFIRMED: 4, PRINTING: 5, COMPLETED: 6, CANCELLED: -1
  }
  return map[order.value?.status] ?? 0
})

const flowSteps = computed(() => {
  const o = order.value
  return [
    { icon: '📝', label: '填写申请', time: o ? formatDateTime(o.createdAt) : '' },
    { icon: '🔍', label: '审核中', time: o?.reviewedAt ? formatDateTime(o.reviewedAt) : '' },
    { icon: '✅', label: '审核通过', time: o?.reviewedAt ? formatDateTime(o.reviewedAt) : '' },
    { icon: '💰', label: '已报价', time: o?.quotedAt ? formatDateTime(o.quotedAt) : '' },
    { icon: '📋', label: '已确认', time: o?.status === 'CONFIRMED' || o?.status === 'PRINTING' || o?.status === 'COMPLETED' ? '已确认' : '' },
    { icon: '🖨', label: '印刷中', time: '' },
    { icon: '📦', label: '已完成', time: '' }
  ]
})

const formatMoney = (amount) => {
  if (!amount) return '0'
  return Number(amount).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

const formatDate = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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

const getStatusClass = (status) => {
  const map = {
    DRAFT: 'status-gray', PENDING_REVIEW: 'status-orange', APPROVED: 'status-blue',
    REJECTED: 'status-red', QUOTED: 'status-cyan', CONFIRMED: 'status-green',
    PRINTING: 'status-purple', COMPLETED: 'status-green', CANCELLED: 'status-gray'
  }
  return map[status] || 'status-gray'
}

const getPaperTypeLabel = (v) => {
  const map = { COATED: '铜版纸', UNCOATED: '胶版纸', OFFSET: '轻型纸', KRAFT: '牛皮纸', ART: '艺术纸', SPECIAL: '特种纸' }
  return map[v] || v
}

const getPaperSizeLabel = (v) => {
  const map = { A3: 'A3', A4: 'A4', A5: 'A5', B5: 'B5', A6: 'A6', CUSTOM: '自定义' }
  return map[v] || v
}

const getColorModeLabel = (v) => {
  const map = { CMYK: 'CMYK四色', PANTONE: 'Pantone专色', BW: '黑白', MIXED: '彩色+黑白' }
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

const fetchOrder = async () => {
  loading.value = true
  try {
    const res = await api.get(`/print-orders/${route.params.id}`)
    order.value = res.order
    isOwner.value = res.isOwner
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const confirmQuotation = async () => {
  if (!confirm('确认接受此报价？确认后将进入印刷流程。')) return
  actionLoading.value = true
  try {
    const res = await api.post(`/print-orders/${order.value.id}/confirm`)
    showToast(res.message || '报价已确认', 'success')
    fetchOrder()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    actionLoading.value = false
  }
}

const cancelOrder = async () => {
  const reason = prompt('请输入取消原因（可选）')
  if (reason === null) return
  if (!confirm('确定取消此印刷预约？')) return
  actionLoading.value = true
  try {
    const res = await api.post(`/print-orders/${order.value.id}/cancel`, { reason })
    showToast(res.message || '已取消', 'success')
    fetchOrder()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    actionLoading.value = false
  }
}

const resubmit = () => {
  router.push(`/print-orders/${order.value.id}/edit`)
}

onMounted(() => {
  fetchOrder()
})
</script>

<style scoped>
.flex { display: flex; }
.items-center { align-items: center; }
.gap-sm { gap: 8px; }

.back-btn {
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s;
}

.back-btn:hover { color: var(--accent); }

.status-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 13px;
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

.detail-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
  align-items: flex-start;
}

.detail-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--border-light);
}

.flow-section { padding: 24px; }

.flow-steps {
  display: flex;
  align-items: flex-start;
  gap: 0;
  overflow-x: auto;
  padding-bottom: 8px;
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 90px;
  position: relative;
  flex-shrink: 0;
}

.step-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.flow-step.active .step-dot {
  background: var(--accent-light);
  border: 2px solid var(--accent);
}

.flow-step.current .step-dot {
  background: var(--accent);
  border: 2px solid var(--accent);
  box-shadow: 0 0 0 4px var(--accent-light);
}

.step-info { text-align: center; }
.step-label { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
.flow-step.active .step-label { color: var(--text-primary); }
.flow-step.current .step-label { color: var(--accent); font-weight: 600; }
.step-time { font-size: 10px; color: var(--text-tertiary); margin-top: 2px; }

.step-line {
  position: absolute;
  top: 20px;
  left: calc(50% + 24px);
  width: calc(100% - 48px);
  height: 2px;
  background: var(--border-light);
}

.step-line.active { background: var(--accent); }

.order-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 12px;
}

.tags-row { display: flex; gap: 8px; flex-wrap: wrap; }

.tag-chip {
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 100px;
  font-size: 12px;
  color: var(--text-secondary);
}

.spec-table {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-light);
}

.spec-row:nth-child(odd) { background: var(--bg-tertiary); }
.spec-key { font-size: 13px; color: var(--text-secondary); }
.spec-val { font-size: 13px; font-weight: 500; color: var(--text-primary); }

.quotation-card { border: 2px solid var(--accent-light); }

.quotation-body { margin-bottom: 16px; }

.quote-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.quote-row.total {
  border-top: 2px solid var(--border-light);
  margin-top: 8px;
  padding-top: 12px;
}

.quote-key { font-size: 14px; color: var(--text-secondary); }
.quote-val { font-size: 16px; font-weight: 600; }
.quote-val.accent { color: var(--accent); font-size: 24px; }
.quote-note { font-size: 13px; color: var(--text-secondary); margin-top: 10px; padding: 10px; background: var(--bg-tertiary); border-radius: 6px; line-height: 1.6; }
.quote-meta { font-size: 12px; color: var(--text-tertiary); margin-top: 8px; }
.quote-actions { display: flex; gap: 12px; }

.reject-card { border-left: 4px solid var(--danger); }

.sticky { position: sticky; top: 80px; }
.sidebar-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.sidebar-actions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.sidebar-info { margin-bottom: 16px; }
.sidebar-meta { padding-top: 16px; border-top: 1px solid var(--border-light); }
.meta-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
.meta-key { color: var(--text-tertiary); }
.meta-val { color: var(--text-secondary); font-weight: 500; }
.btn-block { width: 100%; }

.text-sm { font-size: 13px; }
.text-muted { color: var(--text-secondary); }
.text-center { text-align: center; }

@media (max-width: 900px) {
  .detail-layout { grid-template-columns: 1fr; }
  .sticky { position: static; }
}
</style>
