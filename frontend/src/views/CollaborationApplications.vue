<template>
  <div class="container">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">我的合作申请</h1>
        <p class="page-subtitle">查看合作申请进度与审核状态</p>
      </div>
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
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="applications.length === 0" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">暂无合作申请记录</div>
      <router-link to="/collaborations" class="btn btn-primary mt-4">浏览合作机会</router-link>
    </div>
    <div v-else class="application-list">
      <div
        v-for="app in applications"
        :key="app.id"
        class="application-card card"
      >
        <div class="app-header">
          <div class="app-title-row">
            <router-link :to="`/collaborations/${app.collaboration.id}`" class="app-title">
              {{ app.collaboration.title }}
            </router-link>
            <span :class="['status-badge', `status-${app.status.toLowerCase()}`]">
              {{ getStatusText(app.status) }}
            </span>
          </div>
          <div class="app-time text-xs text-tertiary">
            申请时间：{{ formatDateTime(app.createdAt) }}
          </div>
        </div>

        <div class="app-body">
          <div v-if="app.portfolio" class="app-info-row">
            <span class="info-label">作品集</span>
            <a :href="app.portfolio" target="_blank" class="info-link">{{ app.portfolio }}</a>
          </div>
          <div v-if="app.skills" class="app-info-row">
            <span class="info-label">技能</span>
            <span class="info-value">{{ app.skills }}</span>
          </div>
          <div v-if="app.motivation" class="app-info-row">
            <span class="info-label">合作动机</span>
            <span class="info-value">{{ app.motivation }}</span>
          </div>
          <div v-if="app.contactInfo" class="app-info-row">
            <span class="info-label">联系方式</span>
            <span class="info-value">{{ app.contactInfo }}</span>
          </div>
        </div>

        <div v-if="app.status === 'REJECTED' && app.rejectionReason" class="app-rejection">
          <span class="rejection-label">驳回原因：</span>
          {{ app.rejectionReason }}
        </div>

        <div v-if="app.reviewedAt" class="app-review">
          <span class="review-label">审核时间：</span>
          {{ formatDateTime(app.reviewedAt) }}
          <span v-if="app.reviewer" class="reviewer">
            · 审核人：{{ app.reviewer.username }}
          </span>
        </div>

        <div class="app-footer">
          <div class="collab-meta">
            <span v-if="app.collaboration.compensation" class="meta-item">
              💰 {{ app.collaboration.compensation }}
            </span>
          </div>
          <div class="app-actions">
            <router-link :to="`/collaborations/${app.collaboration.id}`" class="btn btn-ghost btn-sm">
              查看详情
            </router-link>
            <button
              v-if="app.status === 'PENDING'"
              class="btn btn-secondary btn-sm"
              @click="cancelApplication(app)"
            >
              取消申请
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="page === 1"
        @click="fetchApplications(page - 1)"
      >
        ←
      </button>
      <button
        v-for="p in displayPages"
        :key="p"
        :class="['page-btn', { active: p === page }]"
        @click="p !== '...' && fetchApplications(p)"
        :disabled="p === '...'"
      >
        {{ p }}
      </button>
      <button
        class="page-btn"
        :disabled="page === totalPages"
        @click="fetchApplications(page + 1)"
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

const applications = ref([])
const loading = ref(false)
const currentStatus = ref('all')
const page = ref(1)
const total = ref(0)
const pageSize = 10

const statusTabs = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '未通过', value: 'REJECTED' },
  { label: '已取消', value: 'CANCELLED' }
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

const getStatusText = (status) => {
  const map = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '未通过',
    CANCELLED: '已取消'
  }
  return map[status] || status
}

const formatDateTime = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const setStatus = (s) => {
  currentStatus.value = s
  fetchApplications(1)
}

const fetchApplications = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({
      page: newPage,
      limit: pageSize
    })
    if (currentStatus.value !== 'all') params.set('status', currentStatus.value)
    const res = await api.get(`/collaboration-applications?${params}`)
    applications.value = res.applications
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const cancelApplication = async (app) => {
  if (!confirm('确定要取消此合作申请吗？')) return
  try {
    await api.put(`/collaboration-applications/${app.id}/cancel`)
    app.status = 'CANCELLED'
    showToast('申请已取消', 'success')
  } catch (e) {
    showToast(e.error || '取消失败', 'error')
  }
}

onMounted(() => {
  fetchApplications()
})
</script>

<style scoped>
.mt-4 { margin-top: 16px; }

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

.application-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.application-card {
  padding: 20px 24px;
}

.app-header {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 16px;
}
.app-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.app-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.2s;
}
.app-title:hover { color: var(--accent); }

.status-badge {
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}
.status-pending {
  background: #fff7e6;
  color: #d48806;
}
.status-approved {
  background: #f6ffed;
  color: #52c41a;
}
.status-rejected {
  background: #fff1f0;
  color: #cf1322;
}
.status-cancelled {
  background: #f5f5f5;
  color: #8c8c8c;
}

.app-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}
.app-info-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
}
.info-label {
  min-width: 72px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.info-value {
  color: var(--text-primary);
  flex: 1;
  line-height: 1.6;
}
.info-link {
  color: var(--accent);
  text-decoration: underline;
  word-break: break-all;
}

.app-rejection {
  padding: 12px 16px;
  background: var(--danger-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--danger);
  margin-bottom: 16px;
  line-height: 1.6;
}
.rejection-label { font-weight: 500; }

.app-review {
  padding: 10px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}
.reviewer { margin-left: 6px; }

.app-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}
.collab-meta {
  display: flex;
  gap: 16px;
}
.meta-item {
  font-size: 13px;
  color: var(--text-secondary);
}
.app-actions {
  display: flex;
  gap: 10px;
}
</style>
