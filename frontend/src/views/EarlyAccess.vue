<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">提前阅读</h1>
      <p class="page-subtitle">新刊抢先看，快人一步享受精彩内容</p>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="text-lg text-muted">加载中...</div>
    </div>

    <div v-else>
      <div v-if="items.length === 0" class="empty-state card py-12">
        <div class="empty-state-icon">⏰</div>
        <div class="empty-state-text">暂无提前阅读内容</div>
      </div>

      <div v-else class="early-list">
        <div
          v-for="item in items"
          :key="item.id"
          class="early-card card"
          @click="openItem(item)"
        >
          <div class="early-cover" :style="{ backgroundImage: `url(${item.coverImage})` }">
            <div class="early-status" :class="getPublishStatus(item).class">
              {{ getPublishStatus(item).text }}
            </div>
            <div class="early-badges">
              <span v-if="item.requirePlan" class="early-badge member">会员</span>
              <span v-if="item.minLevel > 1" class="early-badge level">Lv.{{ item.minLevel }}</span>
            </div>
          </div>
          <div class="early-content">
            <div class="early-time-info">
              <span v-if="item.accessPhase === 'NOT_OPEN'" class="not-open-tag">
                ⏳ {{ getWindowCountdown(item) }}后开放提前阅读
              </span>
              <span v-else-if="item.accessPhase === 'EARLY_WINDOW'" class="countdown">
                ⚡ 提前阅读中 · 距离正式发布：{{ getCountdown(item) }}
              </span>
              <span v-else class="published-tag">
                ✓ 已发布
              </span>
              <span class="early-hours">
                提前 {{ item.earlyHours }} 小时阅读
              </span>
            </div>
            <h3 class="early-title font-serif">{{ item.title }}</h3>
            <p class="early-desc text-sm text-muted">{{ item.description }}</p>
            <div class="early-meta">
              <img v-if="item.creator?.avatar" :src="item.creator.avatar" class="creator-avatar">
              <span class="creator-name text-sm">{{ item.creator?.username }}</span>
              <span class="text-sm text-muted">发布于 {{ formatDate(item.publishDate) }}</span>
              <span class="text-sm text-muted">👁 {{ item.views }}</span>
            </div>
            <div v-if="item.zine" class="early-zine-ref">
              <span class="text-xs text-muted">关联刊物：</span>
              <span class="text-xs">{{ item.zine.title }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="pagination mt-lg">
        <button
          class="btn btn-secondary btn-sm"
          :disabled="page <= 1"
          @click="loadItems(page - 1)"
        >上一页</button>
        <span class="page-info text-sm">{{ page }} / {{ totalPages }}</span>
        <button
          class="btn btn-secondary btn-sm"
          :disabled="page >= totalPages"
          @click="loadItems(page + 1)"
        >下一页</button>
      </div>
    </div>

    <div v-if="showDetail" class="modal-overlay" @click.self="closeDetail">
      <div class="modal card early-detail-modal">
        <div class="modal-header">
          <h3 class="font-semibold font-serif">{{ currentItem?.title }}</h3>
          <button class="btn btn-ghost btn-sm" @click="closeDetail">✕</button>
        </div>
        <div class="modal-body early-detail-body">
          <div v-if="!hasAccess" class="access-denied">
            <div class="denied-icon" :class="getDeniedIconClass()">{{ getDeniedIcon() }}</div>
            <h4 class="denied-title">{{ accessError }}</h4>
            <div v-if="denialInfo.accessPhase === 'NOT_OPEN'" class="denied-timeline">
              <div class="timeline-item">
                <span class="timeline-marker"></span>
                <div>
                  <div class="timeline-label">提前阅读开放时间</div>
                  <div class="timeline-value">{{ formatDateTime(denialInfo.earlyWindowStart) }}</div>
                </div>
              </div>
              <div class="timeline-item">
                <span class="timeline-marker published"></span>
                <div>
                  <div class="timeline-label">正式发布时间（所有人可读）</div>
                  <div class="timeline-value">{{ formatDateTime(denialInfo.publishDate) }}</div>
                </div>
              </div>
            </div>
            <div v-else-if="denialInfo.accessPhase === 'EARLY_WINDOW'" class="denied-requirement">
              <div v-if="denialInfo.denialCode === 'INSUFFICIENT_LEVEL'" class="requirement-row">
                <span>要求等级：</span>
                <span class="requirement-value need">Lv.{{ denialInfo.requiresLevel }}</span>
                <span>当前：</span>
                <span class="requirement-value current">Lv.{{ denialInfo.userLevel }}</span>
              </div>
              <div v-if="denialInfo.denialCode === 'MEMBERSHIP_REQUIRED'" class="requirement-row">
                <span>会员要求：</span>
                <span class="requirement-value need">需要会员</span>
                <span>当前：</span>
                <span class="requirement-value current">{{ denialInfo.hasMembership ? '已开通' : '未开通' }}</span>
              </div>
              <div class="text-sm text-muted mt-sm">
                正式发布时间：{{ formatDateTime(denialInfo.publishDate) }}
              </div>
            </div>
            <div class="denied-actions">
              <button
                v-if="denialInfo.denialCode === 'MEMBERSHIP_REQUIRED'"
                class="btn btn-primary"
                @click="$router.push('/membership')"
              >开通会员</button>
              <button
                v-if="denialInfo.denialCode === 'INSUFFICIENT_LEVEL'"
                class="btn btn-primary"
                @click="$router.push('/growth')"
              >提升等级</button>
              <button class="btn btn-secondary" @click="closeDetail">关闭</button>
            </div>
          </div>
          <div v-else>
            <div class="detail-status-bar">
              <span :class="['status-tag', detailAccessPhase === 'PUBLISHED' ? 'published' : 'early']">
                {{ detailAccessPhase === 'PUBLISHED' ? '📖 已公开发布' : '⚡ 提前阅读中' }}
              </span>
              <span v-if="detailAccessPhase !== 'PUBLISHED'" class="text-sm text-muted">
                正式发布：{{ formatDateTime(currentItem?.publishDate || detailPublishDate) }}
              </span>
            </div>
            <div v-if="currentItem?.coverImage" class="detail-cover">
              <img :src="currentItem.coverImage" alt="">
            </div>
            <div class="detail-content" v-html="renderContent(currentItem?.content)"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, onUnmounted } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const loading = ref(true)
const items = ref([])
const page = ref(1)
const totalPages = ref(1)
const showDetail = ref(false)
const currentItem = ref(null)
const hasAccess = ref(false)
const accessError = ref('')
const detailAccessPhase = ref(null)
const detailPublishDate = ref(null)
const denialInfo = ref({})
const now = ref(new Date())

let timer = null

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

const formatDateTime = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const renderContent = (content) => {
  if (!content) return ''
  return content.replace(/\n/g, '<br>')
}

const getAccessPhase = (item) => {
  if (item && item.accessPhase) return item.accessPhase
  if (!item) return 'NOT_OPEN'
  const publishDate = new Date(item.publishDate)
  const earlyWindowStart = new Date(publishDate.getTime() - item.earlyHours * 60 * 60 * 1000)
  if (now.value >= publishDate) return 'PUBLISHED'
  if (now.value >= earlyWindowStart) return 'EARLY_WINDOW'
  return 'NOT_OPEN'
}

const getPublishStatus = (item) => {
  const phase = getAccessPhase(item)
  if (phase === 'PUBLISHED') {
    return { text: '已发布', class: 'published' }
  }
  if (phase === 'EARLY_WINDOW') {
    return { text: '提前阅读', class: 'early' }
  }
  return { text: '未开放', class: 'not-open' }
}

const getCountdown = (item) => {
  const diff = new Date(item.publishDate).getTime() - now.value.getTime()
  if (diff <= 0) return '已发布'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

const getWindowCountdown = (item) => {
  const publishDate = new Date(item.publishDate)
  const earlyWindowStart = new Date(publishDate.getTime() - item.earlyHours * 60 * 60 * 1000)
  const diff = earlyWindowStart.getTime() - now.value.getTime()
  if (diff <= 0) return '已开放'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.max(1, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)))
  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${minutes}分`
  return `${minutes}分钟`
}

const getDeniedIcon = () => {
  if (denialInfo.value.denialCode === 'WINDOW_NOT_OPEN') return '⏳'
  if (denialInfo.value.denialCode === 'INSUFFICIENT_LEVEL') return '📊'
  if (denialInfo.value.denialCode === 'MEMBERSHIP_REQUIRED') return '👑'
  return '🔒'
}

const getDeniedIconClass = () => {
  if (denialInfo.value.denialCode === 'WINDOW_NOT_OPEN') return 'icon-not-open'
  if (denialInfo.value.denialCode === 'INSUFFICIENT_LEVEL') return 'icon-level'
  if (denialInfo.value.denialCode === 'MEMBERSHIP_REQUIRED') return 'icon-member'
  return ''
}

const loadItems = async (p = 1) => {
  loading.value = true
  try {
    const res = await api.get(`/memberships/early-access?page=${p}&limit=10`)
    items.value = res.items
    page.value = res.page
    totalPages.value = res.totalPages
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const openItem = async (item) => {
  try {
    const res = await api.get(`/memberships/early-access/${item.id}`)
    currentItem.value = res.item
    detailAccessPhase.value = res.accessPhase || (res.isPublished ? 'PUBLISHED' : 'EARLY_WINDOW')
    detailPublishDate.value = res.publishDate || item.publishDate
    hasAccess.value = true
    denialInfo.value = {}
    showDetail.value = true
  } catch (e) {
    if (e.status === 403) {
      currentItem.value = item
      hasAccess.value = false
      accessError.value = e.error || '您没有权限阅读此内容'
      detailAccessPhase.value = e.accessPhase || 'NOT_OPEN'
      denialInfo.value = {
        denialCode: e.denialCode,
        accessPhase: e.accessPhase || 'NOT_OPEN',
        earlyWindowStart: e.earlyWindowStart,
        publishDate: e.publishDate || item.publishDate,
        requiresLevel: e.requiresLevel,
        userLevel: e.userLevel,
        requiresMembership: e.requiresMembership,
        hasMembership: e.hasMembership
      }
      showDetail.value = true
    } else {
      showToast(e.error || '加载失败', 'error')
    }
  }
}

const closeDetail = () => {
  showDetail.value = false
  currentItem.value = null
  denialInfo.value = {}
  detailAccessPhase.value = null
}

onMounted(() => {
  loadItems()
  timer = setInterval(() => {
    now.value = new Date()
  }, 60000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.early-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.early-card {
  display: flex;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  padding: 0;
}
.early-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}
.early-cover {
  width: 240px;
  flex-shrink: 0;
  background-color: var(--bg-tertiary);
  background-size: cover;
  background-position: center;
  position: relative;
}
@media (max-width: 640px) {
  .early-card { flex-direction: column; }
  .early-cover { width: 100%; height: 160px; }
}
.early-status {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 100px;
  color: white;
}
.early-status.published { background: var(--success); }
.early-status.early { background: var(--accent); }
.early-status.not-open { background: #6b7280; }
.early-status.pending { background: var(--text-tertiary); }
.early-badges {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 6px;
}
.early-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 100px;
  color: white;
}
.early-badge.member { background: var(--accent); }
.early-badge.level { background: #8b5cf6; }
.early-content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
}
.early-time-info {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}
.countdown {
  color: var(--accent);
  font-weight: 600;
  font-size: 13px;
}
.not-open-tag {
  color: #6b7280;
  font-weight: 600;
  font-size: 13px;
}
.published-tag {
  color: var(--success);
  font-weight: 600;
  font-size: 13px;
}
.early-hours {
  font-size: 12px;
  color: var(--text-secondary);
}
.early-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}
.early-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}
.early-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: auto;
}
.creator-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}
.early-zine-ref {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}
.page-info { color: var(--text-secondary); }

.early-detail-modal {
  max-width: 720px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
.early-detail-body {
  overflow-y: auto;
}
.detail-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}
.status-tag {
  font-size: 13px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 100px;
}
.status-tag.published {
  background: var(--success-light);
  color: var(--success);
}
.status-tag.early {
  background: var(--accent-light);
  color: var(--accent);
}
.detail-cover img {
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  border-radius: var(--radius);
  margin-bottom: 16px;
}
.detail-content {
  line-height: 1.8;
  font-size: 15px;
  white-space: pre-wrap;
}
.access-denied {
  text-align: center;
  padding: 48px 24px;
}
.denied-icon {
  font-size: 64px;
  margin-bottom: 16px;
}
.denied-icon.icon-not-open { animation: pulse 2s infinite; }
.denied-icon.icon-level { color: #8b5cf6; }
.denied-icon.icon-member { color: var(--accent); }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.denied-title {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--text-primary);
  line-height: 1.6;
}
.denied-subtitle {
  margin-bottom: 20px;
}
.denied-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
.denied-timeline {
  max-width: 400px;
  margin: 0 auto 24px;
  text-align: left;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  border-left: 3px solid #6b7280;
}
.timeline-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 8px 0;
}
.timeline-item + .timeline-item {
  border-top: 1px dashed var(--border-color);
}
.timeline-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #6b7280;
  margin-top: 4px;
  flex-shrink: 0;
}
.timeline-marker.published {
  background: var(--success);
}
.timeline-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}
.timeline-value {
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-mono);
}
.denied-requirement {
  max-width: 400px;
  margin: 0 auto 24px;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  text-align: left;
}
.requirement-row {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  font-size: 14px;
}
.requirement-value {
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}
.requirement-value.need {
  background: #fee2e2;
  color: #dc2626;
}
.requirement-value.current {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}
</style>
