<template>
  <div class="container">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">我的合作招募</h1>
        <p class="page-subtitle">管理我发起的合作招募，查看申请情况</p>
      </div>
      <router-link to="/collaborations/new" class="btn btn-primary">
        <span>+</span> 发起合作招募
      </router-link>
    </div>

    <div class="filters card" style="padding: 16px 20px; margin-bottom: 24px;">
      <div class="filter-row">
        <span class="filter-label">状态</span>
        <div class="status-tabs">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            :class="['status-tab', { active: currentStatus === tab.value }]"
            @click="setStatus(tab.value)"
          >
            {{ tab.label }}
            <span v-if="tab.count !== undefined && tab.count > 0" class="tab-count">{{ tab.count }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="collaborations.length === 0" class="empty-state card" style="padding: 64px 24px;">
      <div class="empty-state-icon">🤝</div>
      <div class="empty-state-text">
        {{ currentStatus === 'all' ? '您还没有发起过合作招募' : '暂无该状态的合作项目' }}
      </div>
      <div class="empty-hint text-sm text-tertiary" style="margin-top: 8px;">
        发起合作招募，与优秀创作者共创精彩！
      </div>
      <router-link to="/collaborations/new" class="btn btn-primary" style="margin-top: 24px;">
        <span>+</span> 立即发起
      </router-link>
    </div>
    <div v-else class="collab-list">
      <div
        v-for="c in collaborations"
        :key="c.id"
        class="collab-card card"
      >
        <div class="collab-cover" :style="c.coverImage ? { backgroundImage: `url(${c.coverImage})` } : {}">
          <div v-if="!c.coverImage" class="collab-cover-placeholder">
            <span class="cover-icon">🤝</span>
          </div>
          <span :class="['status-badge', `status-${c.status.toLowerCase()}`]">
            {{ getStatusText(c.status) }}
          </span>
        </div>

        <div class="collab-body">
          <div class="collab-header">
            <h3 class="collab-title">
              <router-link :to="`/collaborations/${c.id}`">{{ c.title }}</router-link>
            </h3>
            <span class="collab-category">{{ getCategoryLabel(c.category) }}</span>
          </div>

          <p class="collab-desc">{{ c.description }}</p>

          <div class="collab-tags">
            <span v-for="tag in c.tags?.slice(0, 4)" :key="tag" class="tag">#{{ tag }}</span>
          </div>

          <div v-if="c.status === 'REJECTED' && c.rejectionReason" class="rejection-notice">
            <span class="rejection-icon">⚠️</span>
            <div>
              <strong>审核未通过</strong>
              <div class="rejection-reason">{{ c.rejectionReason }}</div>
            </div>
          </div>

          <div class="collab-meta-row">
            <div class="meta-item">
              <span>💰</span>
              <span>{{ c.compensation || '面议' }}</span>
            </div>
            <div v-if="c.deadline" class="meta-item">
              <span>⏰</span>
              <span>{{ formatDate(c.deadline) }}</span>
            </div>
            <div class="meta-item">
              <span>👥</span>
              <span>{{ c.applicationCount }} 人申请</span>
            </div>
            <div class="meta-item">
              <span>👁</span>
              <span>{{ c.viewCount }} 浏览</span>
            </div>
          </div>

          <div v-if="c.reviewedAt" class="review-info">
            <span>审核时间：{{ formatDateTime(c.reviewedAt) }}</span>
            <span v-if="c.reviewer"> · 审核人：{{ c.reviewer.username }}</span>
          </div>

          <div class="collab-actions">
            <router-link :to="`/collaborations/${c.id}`" class="btn btn-ghost btn-sm">
              查看详情
            </router-link>
            <router-link
              v-if="['DRAFT', 'PENDING_REVIEW', 'REJECTED'].includes(c.status)"
              :to="`/collaborations/${c.id}/edit`"
              class="btn btn-secondary btn-sm"
            >
              编辑
            </router-link>
            <button
              v-if="c.status === 'REJECTED'"
              class="btn btn-primary btn-sm"
              @click="resubmitCollab(c)"
            >
              重新提交
            </button>
            <button
              v-if="c.status === 'PENDING_REVIEW'"
              class="btn btn-ghost btn-sm"
              @click="withdrawCollab(c)"
            >
              撤回
            </button>
            <button
              v-if="['DRAFT', 'REJECTED', 'CLOSED'].includes(c.status)"
              class="btn btn-ghost btn-sm danger-btn"
              @click="deleteCollab(c)"
            >
              🗑 删除
            </button>
            <router-link
              v-if="['PUBLISHED', 'CLOSED'].includes(c.status) && c.applicationCount > 0"
              :to="`/admin/collaborations?collaborationId=${c.id}`"
              class="btn btn-secondary btn-sm"
            >
              查看申请
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="fetchList(page - 1)">←</button>
      <button
        v-for="p in displayPages"
        :key="p"
        :class="['page-btn', { active: p === page }]"
        @click="p !== '...' && fetchList(p)"
        :disabled="p === '...'"
      >
        {{ p }}
      </button>
      <button class="page-btn" :disabled="page === totalPages" @click="fetchList(page + 1)">→</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const collaborations = ref([])
const loading = ref(false)
const currentStatus = ref('all')
const page = ref(1)
const total = ref(0)
const pageSize = 10

const categories = [
  { id: 'WRITING', name: '撰稿', icon: '✍️' },
  { id: 'DESIGN', name: '设计', icon: '🎨' },
  { id: 'ILLUSTRATION', name: '插画', icon: '🖼️' },
  { id: 'PHOTOGRAPHY', name: '摄影', icon: '📷' },
  { id: 'TRANSLATION', name: '翻译', icon: '🌐' },
  { id: 'EDITING', name: '编辑', icon: '📝' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const statusMap = {
  DRAFT: '草稿',
  PENDING_REVIEW: '待审核',
  PUBLISHED: '已发布',
  REJECTED: '未通过',
  CLOSED: '已关闭'
}

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

const statusTabs = computed(() => [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'PENDING_REVIEW', count: 0 },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '未通过', value: 'REJECTED' },
  { label: '草稿', value: 'DRAFT' },
  { label: '已关闭', value: 'CLOSED' }
])

const getStatusText = (s) => statusMap[s] || s
const getCategoryLabel = (cat) => {
  const found = categories.find(c => c.id === cat)
  return found ? `${found.icon} ${found.name}` : cat
}

const formatDate = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

const formatDateTime = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${formatDate(d)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const setStatus = (s) => {
  currentStatus.value = s
  fetchList(1)
}

const fetchList = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: pageSize })
    if (currentStatus.value !== 'all') params.set('status', currentStatus.value)
    const res = await api.get(`/collaborations/mine?${params}`)
    collaborations.value = res.collaborations
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const resubmitCollab = async (c) => {
  try {
    await api.post(`/collaborations/${c.id}/resubmit`)
    c.status = 'PENDING_REVIEW'
    showToast('已重新提交审核', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const withdrawCollab = async (c) => {
  if (!confirm('确定要撤回该合作招募的审核申请吗？')) return
  try {
    await api.put(`/collaborations/${c.id}`, { status: 'DRAFT' })
    c.status = 'DRAFT'
    showToast('已撤回', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const deleteCollab = async (c) => {
  if (!confirm(`确定要删除合作招募"${c.title}"吗？相关申请也将被删除。`)) return
  try {
    await api.delete(`/collaborations/${c.id}`)
    collaborations.value = collaborations.value.filter(x => x.id !== c.id)
    showToast('已删除', 'success')
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.text-sm { font-size: 13px; }
.text-tertiary { color: var(--text-tertiary); }

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
}
.status-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--bg-tertiary);
  border-radius: 100px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.status-tab:hover { color: var(--text-primary); }
.status-tab.active {
  background: var(--accent);
  color: #fff;
}
.tab-count {
  background: rgba(255,255,255,0.3);
  color: #fff;
  padding: 1px 7px;
  border-radius: 100px;
  font-size: 11px;
}

.collab-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.collab-card {
  display: flex;
  overflow: hidden;
}

.collab-cover {
  width: 220px;
  flex-shrink: 0;
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 12px;
}
.collab-cover-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-icon { font-size: 42px; opacity: 0.3; }

.status-badge {
  position: relative;
  z-index: 1;
  display: inline-block;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(4px);
}
.status-pending_review { background: rgba(255, 183, 0, 0.9); color: #5c4a00; }
.status-published { background: rgba(82, 196, 26, 0.95); color: #fff; }
.status-rejected { background: rgba(207, 19, 34, 0.95); color: #fff; }
.status-draft { background: rgba(140, 140, 140, 0.9); color: #fff; }
.status-closed { background: rgba(120, 120, 120, 0.9); color: #fff; }

.collab-body {
  flex: 1;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.collab-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}
.collab-title {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
}
.collab-title a { color: var(--text-primary); transition: color 0.2s; }
.collab-title a:hover { color: var(--accent); }

.collab-category {
  flex-shrink: 0;
  padding: 3px 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 100px;
}

.collab-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.collab-tags { margin-bottom: 12px; }
.tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 11px;
  border-radius: 4px;
  margin-right: 6px;
  margin-bottom: 4px;
}

.rejection-notice {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  background: var(--danger-light);
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.6;
}
.rejection-icon { font-size: 18px; flex-shrink: 0; }
.rejection-reason {
  font-size: 12px;
  color: var(--danger);
  margin-top: 2px;
}

.collab-meta-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  padding: 8px 0;
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.review-info {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}

.collab-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
}
.danger-btn { color: var(--danger); }

.empty-hint { margin: 0; }

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
}
.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-primary);
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.page-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 768px) {
  .collab-card { flex-direction: column; }
  .collab-cover {
    width: 100%;
    height: 160px;
    aspect-ratio: 16/7;
  }
}
</style>
