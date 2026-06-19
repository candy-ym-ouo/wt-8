<template>
  <div class="container">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">我的投稿</h1>
        <p class="page-subtitle">查看投稿状态和编辑内容</p>
      </div>
      <router-link to="/submissions/new" class="btn btn-primary">+ 新建投稿</router-link>
    </div>

    <div class="tabs mb-lg">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab', { active: currentStatus === tab.value }]"
        @click="setStatus(tab.value)"
      >
        {{ tab.label }} <span class="count">{{ counts[tab.value] !== undefined ? counts[tab.value] : '' }}</span>
      </button>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="submissions.length === 0" class="empty-state">
      <div class="empty-state-icon">✍️</div>
      <div class="empty-state-text">
        {{ currentStatus === 'all' ? '还没有投过稿，开始你的第一篇创作吧！' : '暂无此状态的投稿' }}
      </div>
      <router-link to="/submissions/new" class="btn btn-primary">开始投稿</router-link>
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
          <div class="sub-meta">
            <span>📅 {{ formatDate(sub.createdAt) }}</span>
            <span v-if="sub.reviewedAt">🕐 审核时间：{{ formatDate(sub.reviewedAt) }}</span>
          </div>
        </div>
        <div class="sub-actions">
          <router-link
            v-if="sub.status === 'PENDING' || sub.status === 'REJECTED'"
            :to="`/submissions/${sub.id}`"
            class="btn btn-secondary btn-sm"
            @click.prevent="editSubmission(sub)"
          >
            ✏️ 修改并重新提交
          </router-link>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="fetchData(page - 1)">←</button>
      <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
      <button class="page-btn" :disabled="page === totalPages" @click="fetchData(page + 1)">→</button>
    </div>

    <div v-if="editing" class="modal-overlay" @click.self="editing = false">
      <div class="modal card">
        <div class="modal-header">
          <h3 class="font-semibold">修改投稿</h3>
          <button class="btn btn-ghost btn-sm" @click="editing = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">标题</label>
            <input v-model="editForm.title" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">内容</label>
            <textarea v-model="editForm.content" class="form-textarea" rows="10" required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">图片链接（每行一个，可选）</label>
            <textarea v-model="imagesText" class="form-textarea" rows="3" placeholder="https://..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="editing = false">取消</button>
          <button class="btn btn-primary" @click="submitEdit">提交修改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const tabs = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' }
]

const submissions = ref([])
const counts = ref({})
const currentStatus = ref('all')
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 10
const totalPages = computed(() => Math.ceil(total.value / pageSize))

const editing = ref(false)
const editForm = ref({ id: null, title: '', content: '', images: [] })
const imagesText = ref('')

const statusClass = (s) => ({
  PENDING: 'badge-pending',
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected'
}[s] || '')

const statusLabel = (s) => ({
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回'
}[s] || s)

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
    const statuses = ['PENDING', 'APPROVED', 'REJECTED']
    const results = await Promise.all(
      statuses.map(s => api.get(`/submissions?status=${s}&limit=1`).catch(() => ({ total: 0 })))
    )
    const all = results.reduce((sum, r) => sum + (r.total || 0), 0)
    counts.value = {
      all,
      PENDING: results[0]?.total || 0,
      APPROVED: results[1]?.total || 0,
      REJECTED: results[2]?.total || 0
    }
  } catch (e) {}
}

const editSubmission = (sub) => {
  editing.value = true
  editForm.value = { id: sub.id, title: sub.title, content: sub.content, images: [...sub.images] }
  imagesText.value = sub.images?.join('\n') || ''
}

const submitEdit = async () => {
  const images = imagesText.value.split('\n').map(s => s.trim()).filter(Boolean)
  try {
    await api.put(`/submissions/${editForm.value.id}`, {
      title: editForm.value.title,
      content: editForm.value.content,
      images
    })
    showToast('修改成功，已重新提交审核', 'success')
    editing.value = false
    fetchData(1)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border-light);
}
.tab {
  position: relative;
  padding: 12px 20px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
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
.sub-meta {
  display: flex;
  gap: 24px;
  font-size: 12px;
  color: var(--text-tertiary);
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
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
  max-width: 600px;
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
</style>
