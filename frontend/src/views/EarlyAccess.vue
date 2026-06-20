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
              <span v-if="!isPublished(item)" class="countdown">
                ⏱ 距离发布：{{ getCountdown(item) }}
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
            <div class="denied-icon">🔒</div>
            <h4 class="denied-title">{{ accessError }}</h4>
            <div v-if="!isPublished(currentItem)" class="denied-subtitle text-sm text-muted">
              正式发布时间：{{ formatDateTime(currentItem?.publishDate) }}
            </div>
            <div class="denied-actions">
              <button class="btn btn-primary" @click="$router.push('/membership')">升级会员</button>
              <button class="btn btn-secondary" @click="$router.push('/growth')">提升等级</button>
            </div>
          </div>
          <div v-else>
            <div class="detail-status-bar">
              <span :class="['status-tag', isPublished(currentItem) ? 'published' : 'early']">
                {{ isPublished(currentItem) ? '📖 已公开发布' : '⚡ 提前阅读中' }}
              </span>
              <span v-if="!isPublished(currentItem)" class="text-sm text-muted">
                正式发布：{{ formatDateTime(currentItem?.publishDate) }}
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

const isPublished = (item) => {
  if (!item) return false
  return now.value >= new Date(item.publishDate)
}

const getPublishStatus = (item) => {
  if (isPublished(item)) {
    return { text: '已发布', class: 'published' }
  }
  const earlyStart = new Date(new Date(item.publishDate).getTime() - item.earlyHours * 60 * 60 * 1000)
  if (now.value >= earlyStart) {
    return { text: '提前阅读', class: 'early' }
  }
  return { text: '待发布', class: 'pending' }
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
    hasAccess.value = true
    showDetail.value = true
  } catch (e) {
    if (e.status === 403) {
      currentItem.value = item
      hasAccess.value = false
      accessError.value = e.error || '您没有权限阅读此内容'
      showDetail.value = true
    } else {
      showToast(e.error || '加载失败', 'error')
    }
  }
}

const closeDetail = () => {
  showDetail.value = false
  currentItem.value = null
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
.denied-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-secondary);
}
.denied-subtitle {
  margin-bottom: 20px;
}
.denied-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
