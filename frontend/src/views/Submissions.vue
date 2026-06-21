<template>
  <div class="container">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">我的投稿</h1>
        <p class="page-subtitle">查看投稿状态和编辑内容</p>
      </div>
      <div class="flex gap-sm">
        <router-link to="/submissions/new" class="btn btn-primary">+ 新建投稿</router-link>
      </div>
    </div>

    <div class="tabs mb-lg">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab', { active: currentStatus === tab.value }]"
        @click="setStatus(tab.value)"
      >
        {{ tab.label }}
        <span v-if="counts[tab.value] !== undefined" class="count">{{ counts[tab.value] }}</span>
      </button>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="submissions.length === 0" class="empty-state">
      <div class="empty-state-icon">{{ emptyIcon }}</div>
      <div class="empty-state-text">
        {{ emptyText }}
      </div>
      <router-link v-if="currentStatus === 'DRAFT' || currentStatus === 'all'" to="/submissions/new" class="btn btn-primary">
        开始创作
      </router-link>
    </div>
    <div v-else class="sub-list">
      <div v-for="sub in submissions" :key="sub.id" class="sub-card card">
        <div class="sub-main">
          <div class="sub-title-row">
            <h3 class="sub-title font-serif">{{ sub.title }}</h3>
            <span :class="['badge', statusClass(sub.status)]">{{ statusLabel(sub.status) }}</span>
          </div>
          <p class="sub-content-preview">{{ sub.content.substring(0, 120) }}{{ sub.content.length > 120 ? '...' : '' }}</p>
          <div v-if="sub.images && sub.images.length" class="sub-images">
            <img
              v-for="(img, idx) in sub.images.slice(0, 4)"
              :key="idx"
              :src="img"
              class="sub-thumb"
              alt=""
            >
            <div v-if="sub.images.length > 4" class="more-images">+{{ sub.images.length - 4 }}</div>
          </div>

          <div v-if="sub.status === 'REJECTED' && sub.rejectionReason" class="reject-reason">
            <span class="reason-label">📝 审核意见：</span>
            <span>{{ sub.rejectionReason }}</span>
          </div>

          <div v-if="sub.status === 'SCHEDULED' && sub.scheduledAt" class="schedule-info">
            <span class="schedule-label">⏰ 定时提交时间：</span>
            <span>{{ formatDateTime(sub.scheduledAt) }}</span>
          </div>

          <div v-if="sub.status === 'WITHDRAWN'" class="withdraw-info">
            <span class="withdraw-label">↩️ 已撤回，可修改后重新提交</span>
          </div>

          <div class="sub-meta">
            <span>📅 创建于 {{ formatDate(sub.createdAt) }}</span>
            <span v-if="sub.lastSavedAt">💾 上次保存 {{ formatDate(sub.lastSavedAt) }}</span>
            <span v-if="sub.reviewedAt">🕐 审核时间：{{ formatDate(sub.reviewedAt) }}</span>
            <span v-if="sub.version">v{{ sub.version }}</span>
          </div>
        </div>
        <div class="sub-actions">
          <button
            v-if="canEdit(sub)"
            class="btn btn-secondary btn-sm"
            @click="editSubmission(sub)"
          >
            ✏️ 编辑
          </button>
          <button
            v-if="canSubmit(sub)"
            class="btn btn-primary btn-sm"
            @click="submitSubmission(sub)"
          >
            📤 提交审核
          </button>
          <button
            v-if="canWithdraw(sub)"
            class="btn btn-outline btn-sm"
            @click="withdrawSubmission(sub)"
          >
            ↩️ 撤回
          </button>
          <button
            v-if="canDelete(sub)"
            class="btn btn-ghost btn-sm danger-btn"
            @click="deleteSubmission(sub)"
          >
            🗑️ 删除
          </button>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="fetchData(page - 1)">←</button>
      <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
      <button class="page-btn" :disabled="page === totalPages" @click="fetchData(page + 1)">→</button>
    </div>

    <div v-if="showSubmitModal" class="modal-overlay" @click.self="showSubmitModal = false">
      <div class="modal card">
        <div class="modal-header">
          <h3 class="font-semibold">提交投稿</h3>
          <button class="btn btn-ghost btn-sm" @click="showSubmitModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="mb">确定要提交这篇投稿到审核队列吗？</p>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="submitWithSchedule">
              <span>定时提交</span>
            </label>
          </div>
          <div v-if="submitWithSchedule" class="schedule-inputs">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">提交日期</label>
                <input
                  v-model="scheduleDate"
                  type="date"
                  class="form-input"
                  :min="minDate"
                >
              </div>
              <div class="form-group">
                <label class="form-label">提交时间</label>
                <input
                  v-model="scheduleTime"
                  type="time"
                  class="form-input"
                >
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showSubmitModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmSubmit" :disabled="submitting">
            {{ submitting ? '提交中...' : '确认提交' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal card" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="font-semibold">确认删除</h3>
          <button class="btn btn-ghost btn-sm" @click="showDeleteConfirm = false">✕</button>
        </div>
        <div class="modal-body">
          <p>确定要删除这篇投稿吗？删除后无法恢复。</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDeleteConfirm = false">取消</button>
          <button class="btn btn-danger" @click="confirmDelete" :disabled="deleting">
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const showToast = inject('showToast')

const tabs = [
  { label: '全部', value: 'all' },
  { label: '草稿箱', value: 'DRAFT' },
  { label: '待审核', value: 'PENDING' },
  { label: '定时中', value: 'SCHEDULED' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '已撤回', value: 'WITHDRAWN' }
]

const submissions = ref([])
const counts = ref({})
const currentStatus = ref('all')
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 10
const totalPages = computed(() => Math.ceil(total.value / pageSize))

const showSubmitModal = ref(false)
const showDeleteConfirm = ref(false)
const selectedSubmission = ref(null)
const submitting = ref(false)
const deleting = ref(false)

const submitWithSchedule = ref(false)
const scheduleDate = ref('')
const scheduleTime = ref('09:00')

const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const emptyIcon = computed(() => {
  switch (currentStatus.value) {
    case 'DRAFT': return '📝'
    case 'PENDING': return '⏳'
    case 'SCHEDULED': return '⏰'
    case 'APPROVED': return '✅'
    case 'REJECTED': return '❌'
    case 'WITHDRAWN': return '↩️'
    default: return '✍️'
  }
})

const emptyText = computed(() => {
  switch (currentStatus.value) {
    case 'DRAFT': return '暂无草稿，开始你的创作吧！'
    case 'PENDING': return '暂无待审核的投稿'
    case 'SCHEDULED': return '暂无定时提交的投稿'
    case 'APPROVED': return '暂无已通过的投稿'
    case 'REJECTED': return '暂无已驳回的投稿'
    case 'WITHDRAWN': return '暂无已撤回的投稿'
    default: return '还没有投过稿，开始你的第一篇创作吧！'
  }
})

const statusClass = (s) => ({
  DRAFT: 'badge-draft',
  PENDING: 'badge-pending',
  SCHEDULED: 'badge-scheduled',
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected',
  WITHDRAWN: 'badge-withdrawn'
}[s] || '')

const statusLabel = (s) => ({
  DRAFT: '草稿',
  PENDING: '待审核',
  SCHEDULED: '定时中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  WITHDRAWN: '已撤回'
}[s] || s)

const canEdit = (sub) => {
  return ['DRAFT', 'REJECTED', 'WITHDRAWN'].includes(sub.status)
}

const canSubmit = (sub) => {
  return ['DRAFT', 'REJECTED', 'WITHDRAWN'].includes(sub.status)
}

const canWithdraw = (sub) => {
  return ['PENDING', 'SCHEDULED'].includes(sub.status)
}

const canDelete = (sub) => {
  return sub.status !== 'APPROVED'
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatDateTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const setStatus = (s) => {
  currentStatus.value = s
  fetchData(1)
}

const fetchData = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: pageSize })
    if (currentStatus.value !== 'all') params.set('status', currentStatus.value)
    const res = await api.get(`/submissions?${params}`)
    submissions.value = res.submissions
    total.value = res.total
    if (newPage === 1) fetchCounts()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchCounts = async () => {
  try {
    const res = await api.get('/submissions/stats')
    counts.value = {
      all: Object.values(res.counts).reduce((sum, c) => sum + c, 0),
      ...res.counts
    }
  } catch (e) {}
}

const editSubmission = (sub) => {
  router.push(`/submissions/${sub.id}/edit`)
}

const submitSubmission = (sub) => {
  selectedSubmission.value = sub
  submitWithSchedule.value = false
  scheduleDate.value = ''
  scheduleTime.value = '09:00'
  showSubmitModal.value = true
}

const confirmSubmit = async () => {
  if (!selectedSubmission.value) return

  let scheduledAt = null
  if (submitWithSchedule.value) {
    if (!scheduleDate.value || !scheduleTime.value) {
      showToast('请选择定时提交的日期和时间', 'warning')
      return
    }
    scheduledAt = new Date(`${scheduleDate.value}T${scheduleTime.value}`)
    if (scheduledAt <= new Date()) {
      showToast('定时提交时间必须晚于当前时间', 'warning')
      return
    }
  }

  submitting.value = true
  try {
    await api.post(`/submissions/${selectedSubmission.value.id}/submit`, {
      scheduledAt: scheduledAt ? scheduledAt.toISOString() : null
    })
    showToast(
      scheduledAt ? '定时提交成功！' : '提交成功，等待审核',
      'success'
    )
    showSubmitModal.value = false
    fetchData(page.value)
  } catch (e) {
    showToast(e.error || '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}

const withdrawSubmission = async (sub) => {
  if (!confirm('确定要撤回这篇投稿吗？')) return

  try {
    await api.post(`/submissions/${sub.id}/withdraw`)
    showToast('撤回成功', 'success')
    fetchData(page.value)
  } catch (e) {
    showToast(e.error || '撤回失败', 'error')
  }
}

const deleteSubmission = (sub) => {
  selectedSubmission.value = sub
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!selectedSubmission.value) return

  deleting.value = true
  try {
    await api.delete(`/submissions/${selectedSubmission.value.id}`)
    showToast('删除成功', 'success')
    showDeleteConfirm.value = false
    fetchData(page.value)
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  } finally {
    deleting.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border-light);
  overflow-x: auto;
}
.tab {
  position: relative;
  padding: 12px 20px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
  white-space: nowrap;
}
.tab:hover { color: var(--text-primary); }
.tab.active {
  color: var(--accent);
  font-weight: 500;
}
.tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
}
.count {
  margin-left: 6px;
  padding: 1px 8px;
  background: var(--bg-tertiary);
  border-radius: 100px;
  font-size: 12px;
  color: var(--text-tertiary);
}
.sub-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sub-card {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
}
.sub-main { flex: 1; }
.sub-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.sub-title {
  font-size: 18px;
  font-weight: 600;
}
.sub-content-preview {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 12px;
}
.sub-images {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.sub-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
}
.more-images {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-weight: 500;
}
.reject-reason {
  padding: 12px 14px;
  background: var(--danger-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 12px;
  line-height: 1.6;
}
.reason-label { font-weight: 600; }

.schedule-info {
  padding: 10px 14px;
  background: var(--warning-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.schedule-label { font-weight: 600; }

.withdraw-info {
  padding: 10px 14px;
  background: var(--info-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.withdraw-label { font-weight: 500; }

.sub-meta {
  display: flex;
  gap: 24px;
  font-size: 12px;
  color: var(--text-tertiary);
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
  flex-wrap: wrap;
}
.sub-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.page-info {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 0 12px;
}

.badge-draft {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}
.badge-scheduled {
  background: #fff3cd;
  color: #856404;
}
.badge-withdrawn {
  background: #d1ecf1;
  color: #0c5460;
}

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
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-light);
}
.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}
.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.schedule-inputs {
  margin-top: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

.mb { margin-bottom: 16px; }
</style>
