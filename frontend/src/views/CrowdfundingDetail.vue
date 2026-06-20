<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="!crowdfunding" class="empty-state">
      <div class="empty-state-icon">❓</div>
      <div class="empty-state-text">众筹项目不存在</div>
    </div>
    <div v-else class="detail-layout">
      <div class="detail-main">
        <div class="detail-header card">
          <div class="breadcrumbs">
            <router-link to="/crowdfundings" class="breadcrumb-link">← 返回众筹列表</router-link>
          </div>
          <div v-if="crowdfunding.coverImage" class="cover-image">
            <img :src="crowdfunding.coverImage" :alt="crowdfunding.title">
          </div>
          <div class="header-content">
            <div class="header-tags">
              <span class="cat-badge">{{ getCategoryLabel(crowdfunding.category) }}</span>
              <span v-if="crowdfunding.isFeatured" class="featured-badge">⭐ 精选推荐</span>
              <span :class="['status-badge', `status-${crowdfunding.status.toLowerCase()}`]">
                {{ getStatusText(crowdfunding.status) }}
              </span>
            </div>
            <h1 class="detail-title font-serif">{{ crowdfunding.title }}</h1>
            
            <div v-if="crowdfunding.rejectionReason && isOwner" class="rejection-notice">
              <span class="notice-icon">⚠️</span>
              <div>
                <strong>审核未通过</strong>
                <div class="rejection-detail">原因：{{ crowdfunding.rejectionReason }}</div>
              </div>
            </div>

            <div v-if="isOwner || isAdmin" class="owner-actions">
              <router-link
                v-if="['DRAFT', 'PENDING_REVIEW', 'REJECTED'].includes(crowdfunding.status)"
                :to="`/crowdfundings/${crowdfunding.id}/edit`"
                class="btn btn-secondary btn-sm"
              >
                ✏️ 编辑
              </router-link>
              <button
                v-if="crowdfunding.status === 'REJECTED'"
                class="btn btn-primary btn-sm"
                @click="resubmit"
              >
                🔄 重新提交审核
              </button>
              <button
                v-if="isAdmin && crowdfunding.status === 'PENDING_REVIEW'"
                class="btn btn-primary btn-sm"
                @click="adminApprove"
              >
                ✅ 审核通过
              </button>
              <button
                v-if="isAdmin && crowdfunding.status === 'PENDING_REVIEW'"
                class="btn btn-secondary btn-sm"
                @click="adminReject"
              >
                ❌ 驳回
              </button>
              <router-link
                v-if="(isOwner || isAdmin) && crowdfunding.orderCount > 0"
                :to="`/admin/crowdfundings?tab=orders&crowdfundingId=${crowdfunding.id}`"
                class="btn btn-ghost btn-sm"
              >
                📦 查看订单 ({{ crowdfunding.orderCount }})
              </router-link>
            </div>

            <div class="progress-section card-highlight">
              <div class="progress-header">
                <div class="progress-main">
                  <span class="progress-amount">¥{{ formatMoney(crowdfunding.currentAmount) }}</span>
                  <span class="progress-target">目标 ¥{{ formatMoney(crowdfunding.targetAmount) }}</span>
                </div>
                <div class="progress-percent">{{ crowdfunding.progress }}%</div>
              </div>
              <div class="progress-bar-large">
                <div class="progress-fill" :style="{ width: crowdfunding.progress + '%' }"></div>
              </div>
              <div class="progress-info">
                <div class="info-item">
                  <span class="info-value">{{ crowdfunding.backerCount }}</span>
                  <span class="info-label">位支持者</span>
                </div>
                <div class="info-item">
                  <span class="info-value">{{ getDaysLeft() }}</span>
                  <span class="info-label">剩余天数</span>
                </div>
                <div class="info-item">
                  <span class="info-value">{{ crowdfunding.tiers?.length || 0 }}</span>
                  <span class="info-label">个档位</span>
                </div>
              </div>
            </div>

            <div class="header-meta">
              <div class="creator-info">
                <img :src="crowdfunding.creator?.avatar" alt="">
                <div>
                  <div class="creator-name">{{ crowdfunding.creator?.username }}</div>
                  <div class="creator-label">发起方</div>
                </div>
              </div>
              <div class="stats-row">
                <div class="stat-item">
                  <span class="stat-value">{{ crowdfunding.viewCount }}</span>
                  <span class="stat-label">浏览</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section card">
          <h3 class="section-title">
            <span class="section-icon">📋</span> 项目介绍
          </h3>
          <div class="section-content" v-html="formatContent(crowdfunding.description)"></div>
        </div>

        <div v-if="crowdfunding.tags?.length > 0" class="detail-section card">
          <h3 class="section-title">
            <span class="section-icon">🏷️</span> 相关标签
          </h3>
          <div class="tags-list">
            <span v-for="tag in crowdfunding.tags" :key="tag" class="tag-large">#{{ tag }}</span>
          </div>
        </div>
      </div>

      <div class="detail-sidebar">
        <div class="sidebar-card card sticky">
          <h3 class="sidebar-title">选择支持档位</h3>

          <div v-if="!canSupport" class="support-notice">
            <p class="notice-text">{{ getSupportNotice() }}</p>
          </div>

          <div v-else-if="userOrder" class="supported-status">
            <div class="status-icon">🎉</div>
            <div class="status-info">
              <div class="status-title">您已支持该项目</div>
              <div class="status-time">支持档位：{{ userOrder.tier?.name }}</div>
              <div class="status-time">支持金额：¥{{ userOrder.amount }}</div>
              <div class="status-time">订单状态：{{ userOrder.statusText || userOrder.status }}</div>
            </div>
            <router-link :to="`/crowdfunding-orders`" class="btn btn-outline btn-block">
              查看我的订单
            </router-link>
          </div>

          <div v-else class="tiers-list">
            <div
              v-for="tier in crowdfunding.tiers"
              :key="tier.id"
              :class="['tier-item', { selected: selectedTier?.id === tier.id, disabled: !tier.isUnlimited && tier.remainingStock <= 0 }]"
              @click="selectTier(tier)"
            >
              <div class="tier-header">
                <span class="tier-name">{{ tier.name }}</span>
                <span class="tier-price">¥{{ tier.price }}</span>
              </div>
              <p v-if="tier.description" class="tier-desc">{{ tier.description }}</p>
              
              <div v-if="tier.perks?.length > 0" class="tier-perks">
                <div v-for="(perk, idx) in tier.perks" :key="idx" class="perk-item">
                  <span class="perk-icon">✓</span>
                  <span>{{ perk }}</span>
                </div>
              </div>

              <div class="tier-footer">
                <div class="stock-info">
                  <span v-if="tier.isUnlimited" class="stock-unlimited">无限库存</span>
                  <span v-else>
                    剩余 <span :class="{ 'low-stock': tier.isLowStock }">{{ tier.remainingStock }}</span> 份
                  </span>
                  <span v-if="tier.isLowStock && !tier.isUnlimited" class="low-stock-tag">即将售罄</span>
                </div>
                <div v-if="tier.deliveryDate" class="delivery-date">
                  预计 {{ formatDate(tier.deliveryDate) }} 发货
                </div>
              </div>
            </div>
          </div>

          <div v-if="canSupport && selectedTier" class="support-action">
            <div class="quantity-selector">
              <span class="qty-label">数量</span>
              <div class="qty-controls">
                <button class="qty-btn" @click="decreaseQty" :disabled="quantity <= 1">-</button>
                <span class="qty-value">{{ quantity }}</span>
                <button class="qty-btn" @click="increaseQty" :disabled="!selectedTier.isUnlimited && quantity >= selectedTier.remainingStock">+</button>
              </div>
            </div>
            <div class="total-amount">
              <span>合计</span>
              <span class="amount-value">¥{{ selectedTier.price * quantity }}</span>
            </div>
            <button class="btn btn-primary btn-block btn-lg" @click="showSupportModal = true">
              🚀 立即支持
            </button>
            <p class="support-tip">支持后将通过站内消息通知您订单状态</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showSupportModal" class="modal-overlay" @click.self="showSupportModal = false">
      <div class="modal card" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="font-semibold">确认支持</h3>
          <button class="btn btn-ghost btn-sm" @click="showSupportModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="order-summary">
            <div class="summary-item">
              <span>众筹项目</span>
              <span class="summary-value">{{ crowdfunding.title }}</span>
            </div>
            <div class="summary-item">
              <span>支持档位</span>
              <span class="summary-value">{{ selectedTier?.name }}</span>
            </div>
            <div class="summary-item">
              <span>单价</span>
              <span class="summary-value">¥{{ selectedTier?.price }}</span>
            </div>
            <div class="summary-item">
              <span>数量</span>
              <span class="summary-value">× {{ quantity }}</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-item total">
              <span>合计</span>
              <span class="summary-value amount">¥{{ selectedTier ? selectedTier.price * quantity : 0 }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">收货人姓名</label>
            <input v-model="supportForm.receiverName" class="form-input" placeholder="请输入收货人姓名">
          </div>
          <div class="form-group">
            <label class="form-label">联系电话</label>
            <input v-model="supportForm.receiverPhone" class="form-input" placeholder="请输入联系电话">
          </div>
          <div class="form-group">
            <label class="form-label">收货地址</label>
            <textarea v-model="supportForm.receiverAddress" class="form-textarea" rows="2" placeholder="请输入详细收货地址"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">备注 <span class="optional">可选</span></label>
            <textarea v-model="supportForm.remark" class="form-textarea" rows="2" placeholder="有什么想对发起者说的..."></textarea>
          </div>

          <div class="modal-footer" style="padding: 0;">
            <button type="button" class="btn btn-secondary" @click="showSupportModal = false">取消</button>
            <button type="button" class="btn btn-primary" @click="submitSupport" :disabled="submitting">
              {{ submitting ? '处理中...' : '确认支持' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const authStore = useAuthStore()
const showToast = inject('showToast')

const crowdfunding = ref(null)
const userOrder = ref(null)
const isOwner = ref(false)
const isAdmin = ref(false)
const loading = ref(false)
const selectedTier = ref(null)
const quantity = ref(1)
const showSupportModal = ref(false)
const submitting = ref(false)
const supportForm = ref({
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  remark: ''
})

const categories = [
  { id: 'ZINE', name: '刊物', icon: '📖' },
  { id: 'ART', name: '艺术', icon: '🎨' },
  { id: 'BOOK', name: '书籍', icon: '📚' },
  { id: 'MUSIC', name: '音乐', icon: '🎵' },
  { id: 'GAME', name: '游戏', icon: '🎮' },
  { id: 'TECH', name: '科技', icon: '💻' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const canSupport = computed(() => {
  if (!crowdfunding.value) return false
  if (crowdfunding.value.status !== 'PUBLISHED') return false
  if (crowdfunding.value.deadline && new Date(crowdfunding.value.deadline) < new Date()) return false
  return true
})

const getStatusText = (status) => {
  const map = {
    DRAFT: '草稿',
    PENDING_REVIEW: '待审核',
    PUBLISHED: '众筹中',
    REJECTED: '未通过',
    SUCCESSFUL: '已达成',
    ENDED: '已结束'
  }
  return map[status] || status
}

const getSupportNotice = () => {
  if (!crowdfunding.value) return ''
  if (crowdfunding.value.status === 'DRAFT') return '该项目尚未发布'
  if (crowdfunding.value.status === 'PENDING_REVIEW') return '该项目正在审核中'
  if (crowdfunding.value.status === 'REJECTED') return '该项目未通过审核'
  if (crowdfunding.value.status === 'SUCCESSFUL') return '该项目众筹已成功达成'
  if (crowdfunding.value.status === 'ENDED') return '该众筹项目已结束'
  if (crowdfunding.value.deadline && new Date(crowdfunding.value.deadline) < new Date()) return '众筹已结束'
  return ''
}

const formatMoney = (amount) => {
  if (!amount) return '0'
  return Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const getDaysLeft = () => {
  if (!crowdfunding.value?.deadline) return '无限期'
  const now = new Date()
  const end = new Date(crowdfunding.value.deadline)
  const diff = end - now
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const formatDate = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const getCategoryLabel = (cat) => {
  const found = categories.find(c => c.id === cat)
  return found ? `${found.icon} ${found.name}` : cat
}

const formatContent = (text) => {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .split('\n').map(l => l ? `<p>${l}</p>` : '<br>').join('')
}

const selectTier = (tier) => {
  if (!tier.isUnlimited && tier.remainingStock <= 0) return
  selectedTier.value = tier
  quantity.value = 1
}

const decreaseQty = () => {
  if (quantity.value > 1) quantity.value--
}

const increaseQty = () => {
  if (!selectedTier.value) return
  if (selectedTier.value.isUnlimited) {
    quantity.value++
  } else if (quantity.value < selectedTier.value.remainingStock) {
    quantity.value++
  }
}

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await api.get(`/crowdfundings/${route.params.id}`)
    crowdfunding.value = res.crowdfunding
    userOrder.value = res.userOrder
    isOwner.value = res.isOwner || false
    isAdmin.value = res.isAdmin || false
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const submitSupport = async () => {
  if (!selectedTier.value) {
    showToast('请选择支持档位', 'error')
    return
  }
  if (!supportForm.value.receiverName || !supportForm.value.receiverPhone || !supportForm.value.receiverAddress) {
    showToast('请填写完整的收货信息', 'error')
    return
  }

  submitting.value = true
  try {
    const orderRes = await api.post('/crowdfunding-orders', {
      crowdfundingId: crowdfunding.value.id,
      tierId: selectedTier.value.id,
      quantity: quantity.value,
      ...supportForm.value
    })

    const payRes = await api.post(`/crowdfunding-orders/${orderRes.order.id}/pay`)
    
    showSupportModal.value = false
    userOrder.value = payRes.order
    showToast(payRes.message || '支持成功！', 'success')
    fetchDetail()
  } catch (e) {
    showToast(e.error || '支持失败', 'error')
  } finally {
    submitting.value = false
  }
}

const resubmit = async () => {
  if (!confirm('确定要重新提交审核吗？')) return
  try {
    await api.post(`/crowdfundings/${crowdfunding.value.id}/resubmit`)
    crowdfunding.value.status = 'PENDING_REVIEW'
    crowdfunding.value.rejectionReason = null
    showToast('已重新提交审核', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const adminApprove = async () => {
  if (!confirm('确定审核通过并发布该众筹项目吗？')) return
  try {
    await api.post(`/crowdfundings/${crowdfunding.value.id}/publish`)
    crowdfunding.value.status = 'PUBLISHED'
    showToast('已通过并发布', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const adminReject = async () => {
  const reason = prompt('请输入驳回原因（将发送给发起者）')
  if (reason === null) return
  try {
    await api.post(`/crowdfundings/${crowdfunding.value.id}/reject`, { reason })
    crowdfunding.value.status = 'REJECTED'
    crowdfunding.value.rejectionReason = reason
    showToast('已驳回', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

onMounted(() => {
  fetchDetail()
})
</script>

<style scoped>
.detail-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
  align-items: flex-start;
}

.breadcrumbs {
  margin-bottom: 16px;
}
.breadcrumb-link {
  font-size: 13px;
  color: var(--text-secondary);
  transition: color 0.2s;
}
.breadcrumb-link:hover { color: var(--accent); }

.cover-image {
  margin-bottom: 20px;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 16 / 7;
}
.cover-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.cat-badge {
  padding: 4px 12px;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}
.featured-badge {
  padding: 4px 12px;
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #5c4a00;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
}
.status-badge {
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}
.status-draft { background: #f5f5f5; color: #8c8c8c; }
.status-pending_review { background: #fff7e6; color: #d48806; }
.status-published { background: #e6f7ff; color: #1890ff; }
.status-rejected { background: #fff1f0; color: #cf1322; }
.status-successful { background: #f6ffed; color: #52c41a; }
.status-ended { background: #f0f0f0; color: #8c8c8c; }

.detail-title {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 16px;
}

.progress-section {
  padding: 24px;
  background: linear-gradient(135deg, #f0f5ff 0%, #f9f0ff 100%);
  border-radius: var(--radius);
  margin-bottom: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 12px;
}

.progress-main {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.progress-amount {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
}

.progress-target {
  font-size: 14px;
  color: var(--text-secondary);
}

.progress-percent {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.progress-bar-large {
  height: 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 100px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #ff85c0);
  border-radius: 100px;
  transition: width 0.5s ease;
}

.progress-info {
  display: flex;
  gap: 32px;
}

.info-item {
  text-align: left;
}

.info-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.info-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.header-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}
.creator-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.creator-info img {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}
.creator-name {
  font-size: 14px;
  font-weight: 600;
}
.creator-label {
  font-size: 12px;
  color: var(--text-tertiary);
}
.stats-row {
  display: flex;
  gap: 32px;
}
.stat-item {
  text-align: center;
}
.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}
.stat-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.detail-section { margin-top: 20px; }
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}
.section-icon { font-size: 20px; }
.section-content {
  font-size: 15px;
  line-height: 2;
  color: var(--text-primary);
}
.section-content :deep(p) { margin-bottom: 12px; }

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.tag-large {
  padding: 6px 14px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 100px;
  font-size: 13px;
}

.sticky { position: sticky; top: 80px; }
.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
}

.support-notice {
  text-align: center;
  padding: 32px 16px;
}
.notice-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.supported-status {
  text-align: center;
  padding: 24px 16px;
}
.status-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.status-info {
  margin-bottom: 20px;
}
.status-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}
.status-time {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.tiers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tier-item {
  padding: 16px;
  border: 2px solid var(--border-light);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

.tier-item:hover {
  border-color: var(--accent);
}

.tier-item.selected {
  border-color: var(--accent);
  background: var(--accent-light);
}

.tier-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tier-name {
  font-size: 15px;
  font-weight: 600;
}

.tier-price {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
}

.tier-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  line-height: 1.5;
}

.tier-perks {
  margin-bottom: 12px;
}

.perk-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.perk-icon {
  color: #52c41a;
  font-weight: 700;
}

.tier-footer {
  padding-top: 10px;
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.stock-info {
  color: var(--text-secondary);
}

.stock-unlimited {
  color: #52c41a;
  font-weight: 500;
}

.low-stock {
  color: #fa8c16;
  font-weight: 600;
}

.low-stock-tag {
  margin-left: 6px;
  padding: 2px 6px;
  background: #fff7e6;
  color: #fa8c16;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.delivery-date {
  color: var(--text-tertiary);
}

.support-action {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
}

.quantity-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.qty-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.qty-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qty-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.qty-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.qty-value {
  min-width: 40px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
}

.total-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--text-secondary);
}

.amount-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
}

.support-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
  margin-top: 12px;
}

.btn-block { width: 100%; }
.btn-lg { padding: 14px 24px; font-size: 15px; }

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

.order-summary {
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 16px;
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--text-secondary);
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-value {
  color: var(--text-primary);
  font-weight: 500;
}

.summary-divider {
  height: 1px;
  background: var(--border-light);
  margin: 12px 0;
}

.summary-item.total {
  font-size: 16px;
}

.summary-item.total .amount {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
}

.rejection-notice {
  display: flex;
  gap: 12px;
  padding: 14px 18px;
  background: var(--danger-light);
  border-radius: var(--radius);
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--danger);
}
.notice-icon { font-size: 22px; flex-shrink: 0; }
.rejection-detail { margin-top: 4px; font-size: 13px; opacity: 0.9; }

.owner-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.optional {
  font-weight: 400;
  color: var(--text-tertiary);
  font-size: 12px;
}

@media (max-width: 900px) {
  .detail-layout { grid-template-columns: 1fr; }
  .sticky { position: static; }
}
</style>
