<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>

    <div v-else-if="listing" class="detail-wrap">
      <div class="detail-header card">
        <div class="detail-cover" :style="listing.coverImage ? { backgroundImage: `url(${listing.coverImage})` : {}">
          <div v-if="!listing.coverImage" class="detail-cover-placeholder">
            <span>🔄</span>
          </div>
          <div class="status-badges">
            <span class="status-badge" :class="getStatusClass(listing.status)">
              {{ getStatusLabel(listing.status) }}
            </span>
            <span v-if="listing.isFeatured" class="featured-badge">⭐ 精选</span>
          </div>
        </div>

        <div class="detail-body">
          <h1 class="detail-title font-serif">{{ listing.title }}</h1>

          <div class="creator-info">
            <img :src="listing.creator?.avatar" alt="">
            <div>
              <div class="creator-name">{{ listing.creator?.username }}</div>
              <div class="creator-bio">{{ listing.creator?.bio }}</div>
            </div>
            <div class="detail-stats">
              <span>👁 {{ formatNum(listing.viewCount) }} 浏览</span>
              <span>🤝 {{ listing.matchCount }} 匹配</span>
              <span>📅 {{ formatDate(listing.createdAt) }}</span>
            </div>
          </div>

          <div v-if="listing.rejectionReason" class="rejection-box">
            <div class="rejection-title">⚠️ 审核未通过</div>
            <div class="rejection-reason">{{ listing.rejectionReason }}</div>
          </div>
        </div>
      </div>

      <div class="detail-content">
        <div class="main-col">
          <div class="card section-card">
            <h3 class="section-title">🔄 交换信息</h3>
            <div class="zine-info">
              <div class="zine-section have">
                <div class="zine-section-title">📖 我有的</div>
                <div class="zine-detail-item">
                  <span class="label">刊物</span>
                  <span class="value">{{ listing.haveZineTitle || listing.haveZine?.title || '未指定' }}</span>
                </div>
                <div v-if="listing.haveZineAuthor" class="zine-detail-item">
                  <span class="label">作者</span>
                  <span class="value">{{ listing.haveZineAuthor }}</span>
                </div>
                <div v-if="listing.haveZineCategory" class="zine-detail-item">
                  <span class="label">分类</span>
                  <span class="value">{{ listing.haveZineCategory }}</span>
                </div>
                <div class="zine-detail-item">
                  <span class="label">品相</span>
                  <span class="value">{{ getConditionLabel(listing.haveZineCondition) }}</span>
                </div>
                <div v-if="listing.haveTags?.length" class="zine-detail-item">
                  <span class="label">标签</span>
                  <div class="value">
                    <span v-for="tag in listing.haveTags" :key="tag" class="tag have-tag">#{{ tag }}</span>
                  </div>
                </div>
              </div>

              <div class="exchange-arrow">
                <span>↓</span>
              </div>

              <div class="zine-section want">
                <div class="zine-section-title">🎯 我想要的</div>
                <div class="zine-detail-item">
                  <span class="label">刊物</span>
                  <span class="value">{{ listing.wantZineTitle || listing.wantZine?.title || '未指定' }}</span>
                </div>
                <div v-if="listing.wantZineAuthor" class="zine-detail-item">
                  <span class="label">作者</span>
                  <span class="value">{{ listing.wantZineAuthor }}</span>
                </div>
                <div v-if="listing.wantZineCategory" class="zine-detail-item">
                  <span class="label">分类</span>
                  <span class="value">{{ listing.wantZineCategory }}</span>
                </div>
                <div v-if="listing.wantTags?.length" class="zine-detail-item">
                  <span class="label">标签</span>
                  <div class="value">
                    <span v-for="tag in listing.wantTags" :key="tag" class="tag want-tag">求#{{ tag }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="card section-card">
            <h3 class="section-title">📝 详细描述</h3>
            <div class="description-text" style="white-space: pre-wrap;">{{ listing.description }}</div>
          </div>

          <div v-if="isOwner && matches.length" class="card section-card">
            <div class="section-header">
              <h3 class="section-title">💡 为您推荐的匹配</h3>
              <span class="section-desc">系统根据标签和分类自动匹配</span>
            </div>
            <div class="match-list">
              <div v-for="m in matches.slice(0, 5)" :key="m.listing.id" class="match-item card-inner">
                <div class="match-score" :style="{ background: getScoreColor(m.score) }">
                  {{ m.score }}%
                </div>
                <div class="match-info">
                  <div class="match-title">{{ m.listing.title }}</div>
                  <div class="match-sub">
                    有: {{ m.listing.haveZineTitle || '未指定' }} | 求: {{ m.listing.wantZineTitle || '未指定' }}
                  </div>
                  <div class="match-creator">
                    <img :src="m.listing.creator?.avatar" alt="">
                    <span>{{ m.listing.creator?.username }}</span>
                  </div>
                </div>
                <button v-if="!hasExistingMatch(m.listing.id)" class="btn btn-primary btn-sm" @click="initiateMatch(m.listing.id)">
                  发起匹配
                </button>
                <span v-else class="matched-tag">已匹配</span>
              </div>
            </div>
          </div>
        </div>

        <div class="side-col">
          <div class="card side-card">
            <div class="side-section">
              <div class="side-item">
                <span class="side-label">📂 分类</span>
                <span class="side-value">{{ getCategoryLabel(listing.category) }}</span>
              </div>
              <div class="side-item">
                <span class="side-label">🔄 交换方式</span>
                <span class="side-value">{{ getExchangeLabel(listing.exchangeType) }}</span>
              </div>
              <div v-if="listing.location" class="side-item">
                <span class="side-label">📍 地区</span>
                <span class="side-value">{{ listing.location }}</span>
              </div>
              <div v-if="listing.shippingMethod" class="side-item">
                <span class="side-label">📮 邮寄</span>
                <span class="side-value">{{ listing.shippingMethod }}</span>
              </div>
            </div>

            <div v-if="authStore?.isAuthenticated && !isOwner && listing.status === 'PUBLISHED'" class="side-actions">
              <button v-if="!userMatch" class="btn btn-primary btn-block" @click="showMatchModal = true">
                🤝 发起交换匹配
              </button>
              <router-link v-else :to="`/swap-matches/${userMatch.id}`" class="btn btn-outline btn-block">
                💬 查看匹配对话
              </router-link>
            </div>

            <div v-if="isOwner" class="side-actions">
              <router-link v-if="['DRAFT', 'REJECTED'].includes(listing.status)" :to="`/swap/${listing.id}/edit`" class="btn btn-outline btn-block">
                ✏️ 编辑
              </router-link>
              <button v-if="['DRAFT', 'REJECTED'].includes(listing.status)" class="btn btn-primary btn-block" @click="resubmit">
                📤 提交审核
              </button>
              <button v-if="listing.status === 'PUBLISHED'" class="btn btn-outline btn-block" @click="closeListing">
                🔒 关闭需求
              </button>
              <button class="btn btn-ghost btn-block" @click="deleteListing">
                🗑️ 删除
              </button>
            </div>

            <div v-if="isAdmin" class="side-actions admin-actions">
              <div class="side-title">管理员操作</div>
              <button v-if="listing.status === 'PENDING_REVIEW'" class="btn btn-primary btn-block" @click="publish">
                ✅ 审核通过
              </button>
              <button v-if="listing.status === 'PENDING_REVIEW'" class="btn btn-outline btn-block" @click="showRejectModal = true">
                ❌ 驳回
              </button>
              <button v-if="listing.status === 'PUBLISHED'" class="btn btn-outline btn-block" @click="unpublish">
                ⬇️ 下架
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showMatchModal" class="modal-overlay" @click.self="showMatchModal = false">
      <div class="modal card">
        <h3 class="modal-title">发起交换匹配</h3>
        <p class="modal-desc">请选择您的一个已发布的交换需求与对方匹配</p>
        <div v-if="myListingsLoading" class="empty-state" style="padding: 20px;">
          <div class="empty-state-icon">⏳</div>
        </div>
        <div v-else-if="myPublishedListings.length === 0" class="empty-state" style="padding: 20px;">
          <div class="empty-state-text">您还没有已发布的交换需求</div>
          <router-link to="/swap/new" class="btn btn-primary btn-sm" @click="showMatchModal = false">去发布</router-link>
        </div>
        <div v-else class="my-listings-list">
          <div
            v-for="l in myPublishedListings"
            :key="l.id"
            :class="['my-listing-item', { selected: selectedMyListing === l.id }]"
            @click="selectedMyListing = l.id"
          >
            <div class="my-listing-title">{{ l.title }}</div>
            <div class="my-listing-sub">有: {{ l.haveZineTitle || '未指定' }} | 求: {{ l.wantZineTitle || '未指定' }}</div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showMatchModal = false">取消</button>
          <button class="btn btn-primary" :disabled="!selectedMyListing || matchSubmitting" @click="confirmMatch">
            {{ matchSubmitting ? '发送中...' : '确认发起匹配' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
      <div class="modal card">
        <h3 class="modal-title">驳回交换需求</h3>
        <textarea
          v-model="rejectReason"
          rows="4"
          class="form-input"
          placeholder="请输入驳回原因"
        ></textarea>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showRejectModal = false">取消</button>
          <button class="btn btn-primary" @click="reject">确认驳回</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const listing = ref(null)
const isOwner = ref(false)
const isAdmin = ref(false)
const userMatch = ref(null)
const matches = ref([])
const showMatchModal = ref(false)
const showRejectModal = ref(false)
const rejectReason = ref('')
const myListingsLoading = ref(false)
const myPublishedListings = ref([])
const selectedMyListing = ref(null)
const matchSubmitting = ref(false)

const formatNum = (n) => {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n
}

const formatDate = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

const getStatusLabel = (s) => {
  const labels = {
    DRAFT: '草稿', PENDING_REVIEW: '审核中', PUBLISHED: '已发布',
    REJECTED: '已驳回', CLOSED: '已关闭', COMPLETED: '已完成'
  }
  return labels[s] || s
}

const getStatusClass = (s) => {
  const classes = {
    DRAFT: 'status-draft',
    PENDING_REVIEW: 'status-pending',
    PUBLISHED: 'status-published',
    REJECTED: 'status-rejected',
    CLOSED: 'status-closed',
    COMPLETED: 'status-completed'
  }
  return classes[s] || ''
}

const getCategoryLabel = (c) => {
  const labels = { ZINE: 'Zine 刊物', COMIC: '漫画', PHOTO: '摄影集', POETRY: '诗集', ART: '艺术画册', OTHER: '其他' }
  return labels[c] || c
}

const getExchangeLabel = (t) => {
  const labels = { SWAP: '互换', SELL: '出售', GIFT: '赠送', TRADE: '物物交换' }
  return labels[t] || t
}

const getConditionLabel = (c) => {
  const labels = { LIKE_NEW: '全新/近全新', GOOD: '良好', FAIR: '一般' }
  return labels[c] || c
}

const getScoreColor = (score) => {
  if (score >= 70) return 'linear-gradient(135deg, #11998e, #38ef7d)'
  if (score >= 40) return 'linear-gradient(135deg, #f093fb, #f5576c)'
  return 'linear-gradient(135deg, #667eea, #764ba2)'
}

const hasExistingMatch = (listingId) => {
  return matches.value.some(m => m.listing.id === listingId && userMatch.value)
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await api.get(`/swap-listings/${route.params.id}`)
    listing.value = res.listing
    isOwner.value = res.isOwner
    isAdmin.value = res.isAdmin
    userMatch.value = res.userMatch

    if (res.isOwner) {
      try {
        const matchRes = await api.get(`/swap-listings/${route.params.id}/matches`)
        matches.value = matchRes.matches
      } catch (e) {}
    }
  } catch (e) {
    alert(e.error || '加载失败')
  } finally {
    loading.value = false
  }
}

const loadMyListings = async () => {
  myListingsLoading.value = true
  try {
    const res = await api.get('/swap-listings/mine?status=PUBLISHED')
    myPublishedListings.value = res.listings
  } catch (e) {
  } finally {
    myListingsLoading.value = false
  }
}

const initiateMatch = async (targetListingId) => {
  if (!confirm('确定要与此交换需求发起匹配吗？')) return
  try {
    const myRes = await api.get('/swap-listings/mine?status=PUBLISHED')
    const myPublished = myRes.listings
    if (myPublished.length === 0) {
      alert('请先发布一个交换需求')
      router.push('/swap/new')
      return
    }
    selectedMyListing.value = myPublished[0].id
    showMatchModal.value = true
    await loadMyListings()
    pendingTargetListingId.value = targetListingId
  } catch (e) {}
}

const pendingTargetListingId = ref(null)

const confirmMatch = async () => {
  if (!selectedMyListing.value) return
  matchSubmitting.value = true
  try {
    const res = await api.post('/swap-matches', {
      listingAId: selectedMyListing.value,
      listingBId: pendingTargetListingId.value || route.params.id
    })
    alert(res.message || '匹配请求已发送')
    showMatchModal.value = false
    router.push(`/swap-matches/${res.match.id}`)
  } catch (e) {
    alert(e.error || '发起失败')
  } finally {
    matchSubmitting.value = false
  }
}

const resubmit = async () => {
  if (!confirm('确定要重新提交审核吗？')) return
  try {
    const res = await api.post(`/swap-listings/${listing.value.id}/resubmit`)
    alert(res.message)
    loadData()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

const closeListing = async () => {
  if (!confirm('确定要关闭此交换需求吗？')) return
  try {
    const res = await api.post(`/swap-listings/${listing.value.id}/close`)
    alert(res.message)
    loadData()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

const deleteListing = async () => {
  if (!confirm('确定要删除吗？此操作不可恢复')) return
  try {
    await api.delete(`/swap-listings/${listing.value.id}`)
    alert('删除成功')
    router.push('/swap')
  } catch (e) {
    alert(e.error || '删除失败')
  }
}

const publish = async () => {
  if (!confirm('确定审核通过并发布吗？')) return
  try {
    const res = await api.post(`/admin/swaps/listings/${listing.value.id}/publish`)
    alert(res.message)
    loadData()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

const reject = async () => {
  try {
    const res = await api.post(`/admin/swaps/listings/${listing.value.id}/reject`, { reason: rejectReason.value })
    alert(res.message)
    showRejectModal.value = false
    rejectReason.value = ''
    loadData()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

const unpublish = async () => {
  if (!confirm('确定要下架此交换需求吗？')) return
  try {
    const res = await api.post(`/admin/swaps/listings/${listing.value.id}/unpublish`)
    alert(res.message)
    loadData()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.detail-wrap {
  max-width: 1100px;
  margin: 0 auto;
}

.detail-header {
  overflow: hidden;
  margin-bottom: 24px;
}

.detail-cover {
  position: relative;
  height: 240px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  background-size: cover;
  background-position: center;
}

.detail-cover-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
  opacity: 0.3;
}

.status-badges {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  gap: 8px;
}

.status-badge {
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(4px);
}
.status-draft { background: rgba(108, 117, 125, 0.9); color: #fff; }
.status-pending { background: rgba(255, 193, 7, 0.9); color: #7a5d00; }
.status-published { background: rgba(40, 167, 69, 0.9); color: #fff; }
.status-rejected { background: rgba(220, 53, 69, 0.9); color: #fff; }
.status-closed { background: rgba(108, 117, 125, 0.9); color: #fff; }
.status-completed { background: rgba(23, 162, 184, 0.9); color: #fff; }

.featured-badge {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #5c4a00;
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
}

.detail-body {
  padding: 24px 28px;
}

.detail-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 16px;
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.creator-info img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.creator-name {
  font-size: 15px;
  font-weight: 600;
}

.creator-bio {
  font-size: 13px;
  color: var(--text-secondary);
}

.detail-stats {
  margin-left: auto;
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.rejection-box {
  margin-top: 16px 0 0;
  padding: 14px 18px;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: var(--radius-sm);
}

.rejection-title {
  font-weight: 600;
  color: #c53030;
  margin-bottom: 6px;
}

.rejection-reason {
  font-size: 13px;
  color: #9b2c2c;
}

.detail-content {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
}

.section-card {
  padding: 24px 28px;
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.zine-info {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
}

.zine-section {
  padding: 16px 18px;
  border-radius: var(--radius);
  background: var(--bg-tertiary);
}

.zine-section.have {
  border-left: 3px solid #1565c0;
}

.zine-section.want {
  border-left: 3px solid #c2185b;
}

.zine-section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.zine-detail-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.zine-detail-item .label {
  min-width: 48px;
  color: var(--text-secondary);
}

.zine-detail-item .value {
  flex: 1;
  color: var(--text-primary);
}

.exchange-arrow {
  display: flex;
  align-items: center;
  font-size: 24px;
  color: var(--text-tertiary);
}

.description-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 6px;
  margin-bottom: 4px;
}
.have-tag { background: #e3f2fd; color: #1565c0; }
.want-tag { background: #fce4ec; color: #c2185b; }

.match-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.match-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.match-score {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.match-info {
  flex: 1;
}

.match-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.match-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.match-creator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.match-creator img {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.matched-tag {
  font-size: 12px;
  color: #38a169;
  font-weight: 600;
}

.side-card {
  padding: 20px;
  position: sticky;
  top: 80px;
}

.side-section {
  margin-bottom: 20px;
}

.side-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--border-light);
}

.side-label {
  color: var(--text-secondary);
}

.side-value {
  color: var(--text-primary);
  font-weight: 500;
}

.side-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.admin-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.side-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.btn-block {
  width: 100%;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 500px;
  padding: 28px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.modal-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.my-listings-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px 0;
}

.my-listing-item {
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.my-listing-item:hover {
  background: var(--bg-primary);
}

.my-listing-item.selected {
  border-color: var(--accent);
  background: var(--accent-light);
}

.my-listing-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.my-listing-sub {
  font-size: 12px;
  color: var(--text-secondary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 14px;
  font-family: inherit;
}

@media (max-width: 768px) {
  .detail-content {
    grid-template-columns: 1fr;
  }
  .zine-info {
    grid-template-columns: 1fr;
  }
}
</style>
