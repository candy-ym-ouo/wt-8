<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">专属刊物</h1>
      <p class="page-subtitle">会员专属深度内容，畅享阅读</p>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="text-lg text-muted">加载中...</div>
    </div>

    <div v-else>
      <div v-if="zines.length === 0" class="empty-state card py-12">
        <div class="empty-state-icon">📖</div>
        <div class="empty-state-text">暂无专属刊物</div>
      </div>

      <div v-else class="zine-grid">
        <div
          v-for="zine in zines"
          :key="zine.id"
          class="zine-card card"
          @click="openZine(zine)"
        >
          <div class="zine-cover" :style="{ backgroundImage: `url(${zine.coverImage})` }">
            <div class="zine-badges">
              <span v-if="zine.isFeatured" class="zine-badge featured">精选</span>
              <span v-if="zine.requirePlan" class="zine-badge member">会员</span>
              <span v-if="zine.minLevel > 1" class="zine-badge level">Lv.{{ zine.minLevel }}</span>
            </div>
          </div>
          <div class="zine-content">
            <h3 class="zine-title font-serif">{{ zine.title }}</h3>
            <p class="zine-desc text-sm text-muted">{{ zine.description }}</p>
            <div class="zine-meta">
              <img v-if="zine.creator?.avatar" :src="zine.creator.avatar" class="creator-avatar">
              <span class="creator-name text-sm">{{ zine.creator?.username }}</span>
              <span class="zine-views text-sm text-muted">👁 {{ zine.views }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="pagination mt-lg">
        <button
          class="btn btn-secondary btn-sm"
          :disabled="page <= 1"
          @click="loadZines(page - 1)"
        >上一页</button>
        <span class="page-info text-sm">{{ page }} / {{ totalPages }}</span>
        <button
          class="btn btn-secondary btn-sm"
          :disabled="page >= totalPages"
          @click="loadZines(page + 1)"
        >下一页</button>
      </div>
    </div>

    <div v-if="showDetail" class="modal-overlay" @click.self="closeDetail">
      <div class="modal card zine-detail-modal">
        <div class="modal-header">
          <h3 class="font-semibold font-serif">{{ currentZine?.title }}</h3>
          <button class="btn btn-ghost btn-sm" @click="closeDetail">✕</button>
        </div>
        <div class="modal-body zine-detail-body">
          <div v-if="!hasAccess" class="access-denied">
            <div class="denied-icon">🔒</div>
            <h4 class="denied-title">{{ accessError }}</h4>
            <div class="denied-actions">
              <button class="btn btn-primary" @click="$router.push('/membership')">升级会员</button>
              <button class="btn btn-secondary" @click="$router.push('/growth')">提升等级</button>
            </div>
          </div>
          <div v-else>
            <div v-if="currentZine?.coverImage" class="detail-cover">
              <img :src="currentZine.coverImage" alt="">
            </div>
            <div class="detail-meta">
              <span v-if="currentZine?.category" class="tag">{{ currentZine.category }}</span>
              <span class="text-sm text-muted">{{ formatDate(currentZine?.createdAt) }}</span>
              <span class="text-sm text-muted">👁 {{ currentZine?.views }}</span>
            </div>
            <div v-if="currentZine?.tags && parseTags(currentZine.tags).length" class="detail-tags">
              <span v-for="t in parseTags(currentZine.tags)" :key="t" class="tag tag-sm">{{ t }}</span>
            </div>
            <div class="detail-content" v-html="renderContent(currentZine?.content)"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const loading = ref(true)
const zines = ref([])
const page = ref(1)
const totalPages = ref(1)
const showDetail = ref(false)
const currentZine = ref(null)
const hasAccess = ref(false)
const accessError = ref('')

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

const parseTags = (tagsStr) => {
  try {
    return JSON.parse(tagsStr || '[]')
  } catch (e) {
    return []
  }
}

const renderContent = (content) => {
  if (!content) return ''
  return content.replace(/\n/g, '<br>')
}

const loadZines = async (p = 1) => {
  loading.value = true
  try {
    const res = await api.get(`/memberships/exclusive-zines?page=${p}&limit=12`)
    zines.value = res.zines
    page.value = res.page
    totalPages.value = res.totalPages
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const openZine = async (zine) => {
  try {
    const res = await api.get(`/memberships/exclusive-zines/${zine.id}`)
    currentZine.value = res.zine
    hasAccess.value = true
    showDetail.value = true
  } catch (e) {
    if (e.status === 403) {
      currentZine.value = zine
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
  currentZine.value = null
}

onMounted(() => loadZines())
</script>

<style scoped>
.zine-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
@media (max-width: 1024px) {
  .zine-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .zine-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .zine-grid { grid-template-columns: 1fr; }
}
.zine-card {
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  padding: 0;
}
.zine-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}
.zine-cover {
  height: 180px;
  background-color: var(--bg-tertiary);
  background-size: cover;
  background-position: center;
  position: relative;
}
.zine-badges {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 6px;
}
.zine-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 100px;
  color: white;
}
.zine-badge.featured { background: #f59e0b; }
.zine-badge.member { background: var(--accent); }
.zine-badge.level { background: #8b5cf6; }
.zine-content {
  padding: 16px;
}
.zine-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.zine-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}
.zine-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.creator-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}
.creator-name { flex: 1; }

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}
.page-info { color: var(--text-secondary); }

.zine-detail-modal {
  max-width: 720px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
.zine-detail-body {
  overflow-y: auto;
}
.detail-cover img {
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  border-radius: var(--radius);
  margin-bottom: 16px;
}
.detail-meta {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 12px;
}
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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
  margin-bottom: 20px;
  color: var(--text-secondary);
}
.denied-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
