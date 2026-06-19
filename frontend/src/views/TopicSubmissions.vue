<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">我的专题投稿</h1>
      <p class="page-subtitle">查看你在各专题的投稿状态</p>
    </div>

    <div class="topic-sub-filters">
      <button
        v-for="f in statusFilters"
        :key="f.value"
        :class="['btn', currentStatus === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
        @click="currentStatus = f.value; loadSubmissions(1)"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>

    <div v-else-if="submissions.length === 0" class="empty-state card" style="padding: 48px;">
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-text">暂无投稿记录</div>
      <router-link to="/topics" class="btn btn-primary btn-sm mt">浏览专题</router-link>
    </div>

    <div v-else class="submissions-list">
      <div v-for="sub in submissions" :key="sub.id" class="sub-card card">
        <div class="sub-header">
          <router-link :to="`/topics/${sub.topicId}`" class="sub-topic-link">
            📋 {{ sub.topic?.title }}
          </router-link>
          <span :class="['badge', statusBadgeClass(sub.status)]">{{ statusLabel(sub.status) }}</span>
        </div>
        <h3 class="sub-title font-serif">{{ sub.title }}</h3>
        <div class="sub-content text-sm text-muted">
          {{ sub.content.substring(0, 200) }}{{ sub.content.length > 200 ? '...' : '' }}
        </div>
        <div v-if="sub.images && sub.images.length" class="sub-images">
          <img v-for="(img, i) in sub.images.slice(0, 4)" :key="i" :src="img" alt="">
        </div>
        <div v-if="sub.rejectionReason" class="reject-notice">
          驳回原因：{{ sub.rejectionReason }}
        </div>
        <div class="sub-footer">
          <span class="text-xs text-tertiary">提交于 {{ formatDate(sub.createdAt) }}</span>
          <div class="sub-actions">
            <span v-if="sub.reviewer" class="text-xs text-tertiary">审核人：{{ sub.reviewer.username }}</span>
            <span v-if="sub.schedule" class="text-xs text-muted">排期：{{ sub.schedule.title }}（{{ formatDate(sub.schedule.publishDate) }}）</span>
            <button
              v-if="sub.status === 'REJECTED'"
              class="btn btn-outline btn-sm"
              @click="editSubmission(sub)"
            >
              修改重投
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page <= 1" @click="loadSubmissions(page - 1)">上一页</button>
      <span class="text-sm text-muted">{{ page }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="page >= totalPages" @click="loadSubmissions(page + 1)">下一页</button>
    </div>

    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal card" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="font-semibold">修改投稿</h3>
          <button class="btn btn-ghost btn-sm" @click="showEditModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">标题</label>
            <input v-model="editForm.title" type="text" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">内容</label>
            <textarea v-model="editForm.content" class="form-textarea" rows="8" required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">配图链接（每行一个）</label>
            <textarea v-model="editForm.imagesText" class="form-textarea" rows="2"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showEditModal = false">取消</button>
          <button class="btn btn-primary" :disabled="submitting" @click="submitEdit">
            {{ submitting ? '提交中...' : '重新提交' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const submissions = ref([])
const loading = ref(true)
const currentStatus = ref('all')
const page = ref(1)
const totalPages = ref(0)
const showEditModal = ref(false)
const editForm = ref({ title: '', content: '', imagesText: '', id: null })
const submitting = ref(false)

const statusFilters = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已排期', value: 'SCHEDULED' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已驳回', value: 'REJECTED' }
]

const statusLabel = (s) => ({
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  SCHEDULED: '已排期',
  PUBLISHED: '已发布'
}[s] || s)

const statusBadgeClass = (s) => ({
  PENDING: 'badge-pending',
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected',
  SCHEDULED: 'badge-published',
  PUBLISHED: 'badge-published'
}[s] || '')

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const loadSubmissions = async (p = 1) => {
  loading.value = true
  page.value = p
  try {
    const params = new URLSearchParams({ page: p, limit: 20 })
    if (currentStatus.value !== 'all') params.set('status', currentStatus.value)
    const res = await api.get(`/topic-submissions?${params}`)
    submissions.value = res.submissions
    totalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const editSubmission = (sub) => {
  editForm.value = {
    id: sub.id,
    title: sub.title,
    content: sub.content,
    imagesText: (sub.images || []).join('\n')
  }
  showEditModal.value = true
}

const submitEdit = async () => {
  submitting.value = true
  try {
    const images = editForm.value.imagesText.split('\n').map(s => s.trim()).filter(Boolean)
    await api.put(`/topic-submissions/${editForm.value.id}`, {
      title: editForm.value.title,
      content: editForm.value.content,
      images
    })
    showToast('修改成功，已重新提交审核', 'success')
    showEditModal.value = false
    loadSubmissions()
  } catch (e) {
    showToast(e.error || '修改失败', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => loadSubmissions())
</script>

<style scoped>
.topic-sub-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.submissions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sub-card { padding: 24px; }
.sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.sub-topic-link {
  font-size: 13px;
  color: var(--accent);
  font-weight: 500;
}
.sub-topic-link:hover { text-decoration: underline; }
.sub-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
}
.sub-content {
  line-height: 1.7;
  margin-bottom: 12px;
}
.sub-images {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.sub-images img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
}
.reject-notice {
  padding: 10px 14px;
  background: var(--danger-light);
  color: var(--danger);
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: 12px;
}
.sub-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid var(--border-light);
  flex-wrap: wrap;
  gap: 8px;
}
.sub-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
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
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
}
</style>
