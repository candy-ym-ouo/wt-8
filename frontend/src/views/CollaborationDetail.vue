<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="!collaboration" class="empty-state">
      <div class="empty-state-icon">❓</div>
      <div class="empty-state-text">合作项目不存在</div>
    </div>
    <div v-else class="detail-layout">
      <div class="detail-main">
        <div class="detail-header card">
          <div class="breadcrumbs">
            <router-link to="/collaborations" class="breadcrumb-link">← 返回合作列表</router-link>
          </div>
          <div v-if="collaboration.coverImage" class="cover-image">
            <img :src="collaboration.coverImage" :alt="collaboration.title">
          </div>
          <div class="header-content">
            <div class="header-tags">
              <span class="cat-badge">{{ getCategoryLabel(collaboration.category) }}</span>
              <span v-if="collaboration.isFeatured" class="featured-badge">⭐ 精选推荐</span>
              <span v-if="isExpired" class="expired-badge">已截止</span>
              <span :class="['status-badge', `status-${collaboration.status.toLowerCase()}`]">
                {{ getCollabStatus(collaboration.status) }}
              </span>
            </div>
            <h1 class="detail-title font-serif">{{ collaboration.title }}</h1>
            <div v-if="collaboration.rejectionReason && isOwner" class="rejection-notice">
              <span class="notice-icon">⚠️</span>
              <div>
                <strong>审核未通过</strong>
                <div class="rejection-detail">原因：{{ collaboration.rejectionReason }}</div>
              </div>
            </div>
            <div v-if="isOwner || isAdmin" class="owner-actions">
              <router-link
                v-if="['DRAFT', 'PENDING_REVIEW', 'REJECTED'].includes(collaboration.status)"
                :to="`/collaborations/${collaboration.id}/edit`"
                class="btn btn-secondary btn-sm"
              >
                ✏️ 编辑
              </router-link>
              <button
                v-if="collaboration.status === 'REJECTED'"
                class="btn btn-primary btn-sm"
                @click="resubmit"
              >
                🔄 重新提交审核
              </button>
              <button
                v-if="isAdmin && collaboration.status === 'PENDING_REVIEW'"
                class="btn btn-primary btn-sm"
                @click="adminApprove"
              >
                ✅ 审核通过
              </button>
              <button
                v-if="isAdmin && collaboration.status === 'PENDING_REVIEW'"
                class="btn btn-secondary btn-sm"
                @click="adminReject"
              >
                ❌ 驳回
              </button>
              <router-link
                v-if="collaboration.applicationCount > 0 && (isOwner || isAdmin)"
                :to="`/admin/collaborations?collaborationId=${collaboration.id}`"
                class="btn btn-ghost btn-sm"
              >
                👥 查看申请 ({{ collaboration.applicationCount }})
              </router-link>
            </div>
            <div class="header-meta">
              <div class="creator-info">
                <img :src="collaboration.creator?.avatar" alt="">
                <div>
                  <div class="creator-name">{{ collaboration.creator?.username }}</div>
                  <div class="creator-label">发布方</div>
                </div>
              </div>
              <div class="stats-row">
                <div class="stat-item">
                  <span class="stat-value">{{ collaboration.viewCount }}</span>
                  <span class="stat-label">浏览</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ collaboration.applicationCount }}</span>
                  <span class="stat-label">申请</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section card">
          <h3 class="section-title">
            <span class="section-icon">📋</span> 项目介绍
          </h3>
          <div class="section-content" v-html="formatContent(collaboration.description)"></div>
        </div>

        <div v-if="collaboration.requirements" class="detail-section card">
          <h3 class="section-title">
            <span class="section-icon">📝</span> 合作要求
          </h3>
          <div class="section-content" v-html="formatContent(collaboration.requirements)"></div>
        </div>

        <div v-if="collaboration.deliverables" class="detail-section card">
          <h3 class="section-title">
            <span class="section-icon">🎯</span> 交付成果
          </h3>
          <div class="section-content" v-html="formatContent(collaboration.deliverables)"></div>
        </div>

        <div v-if="collaboration.tags?.length > 0" class="detail-section card">
          <h3 class="section-title">
            <span class="section-icon">🏷️</span> 相关标签
          </h3>
          <div class="tags-list">
            <span v-for="tag in collaboration.tags" :key="tag" class="tag-large">#{{ tag }}</span>
          </div>
        </div>
      </div>

      <div class="detail-sidebar">
        <div class="sidebar-card card sticky">
          <h3 class="sidebar-title">合作信息</h3>

          <div v-if="collaboration.compensation" class="info-row">
            <span class="info-icon">💰</span>
            <div class="info-content">
              <span class="info-label">合作报酬</span>
              <span class="info-value highlight">{{ collaboration.compensation }}</span>
            </div>
          </div>

          <div v-if="collaboration.deadline" class="info-row">
            <span class="info-icon">⏰</span>
            <div class="info-content">
              <span class="info-label">截止时间</span>
              <span class="info-value" :class="{ expired: isExpired }">
                {{ formatDateTime(collaboration.deadline) }}
              </span>
            </div>
          </div>

          <div class="info-row">
            <span class="info-icon">📅</span>
            <div class="info-content">
              <span class="info-label">发布时间</span>
              <span class="info-value">{{ formatDateTime(collaboration.createdAt) }}</span>
            </div>
          </div>

          <div class="sidebar-divider"></div>

          <div v-if="!authStore.isAuthenticated" class="apply-notice">
            <p class="notice-text">请先登录后申请合作</p>
            <router-link to="/login" class="btn btn-primary btn-block">登录账号</router-link>
          </div>
          <div v-else-if="userApplication" class="applied-status">
            <div class="status-icon">{{ getStatusIcon(userApplication.status) }}</div>
            <div class="status-info">
              <div class="status-title">{{ getStatusText(userApplication.status) }}</div>
              <div class="status-time">申请时间：{{ formatDateTime(userApplication.createdAt) }}</div>
            </div>
            <div v-if="userApplication.status === 'REJECTED' && userApplication.rejectionReason" class="rejection-reason">
              <span class="reason-label">驳回原因：</span>
              {{ userApplication.rejectionReason }}
            </div>
            <button
              v-if="userApplication.status === 'PENDING'"
              class="btn btn-ghost btn-block"
              @click="cancelApplication"
            >
              取消申请
            </button>
          </div>
          <div v-else-if="isExpired" class="apply-notice">
            <p class="notice-text">该合作项目已截止申请</p>
          </div>
          <div v-else>
            <button class="btn btn-primary btn-block btn-lg" @click="showApplyModal = true">
              🚀 立即申请合作
            </button>
            <p class="apply-tip">申请后将通过站内消息通知您审核结果</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showApplyModal" class="modal-overlay" @click.self="showApplyModal = false">
      <div class="modal card" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="font-semibold">申请合作</h3>
          <button class="btn btn-ghost btn-sm" @click="showApplyModal = false">✕</button>
        </div>
        <form @submit.prevent="submitApplication" class="modal-body">
          <div class="form-group">
            <label class="form-label">申请项目</label>
            <div class="form-static">{{ collaboration.title }}</div>
          </div>
          <div class="form-group">
            <label class="form-label">作品集链接 <span class="optional">可选</span></label>
            <input v-model="applyForm.portfolio" class="form-input" placeholder="您的个人作品集或作品展示链接">
          </div>
          <div class="form-group">
            <label class="form-label">擅长技能 <span class="optional">可选</span></label>
            <textarea v-model="applyForm.skills" class="form-textarea" rows="2" placeholder="简要介绍您擅长的技能和领域"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">合作动机 <span class="optional">可选</span></label>
            <textarea v-model="applyForm.motivation" class="form-textarea" rows="3" placeholder="为什么想要参与这个合作项目？"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">联系方式 <span class="optional">可选</span></label>
            <input v-model="applyForm.contactInfo" class="form-input" placeholder="方便项目方联系您的方式（微信/邮箱/电话等）">
          </div>
          <div class="modal-footer" style="padding: 0;">
            <button type="button" class="btn btn-secondary" @click="showApplyModal = false">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? '提交中...' : '提交申请' }}
            </button>
          </div>
        </form>
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

const collaboration = ref(null)
const userApplication = ref(null)
const isOwner = ref(false)
const isAdmin = ref(false)
const loading = ref(false)
const showApplyModal = ref(false)
const submitting = ref(false)
const applyForm = ref({
  portfolio: '',
  skills: '',
  motivation: '',
  contactInfo: ''
})

const categories = [
  { id: 'WRITING', name: '撰稿', icon: '✍️' },
  { id: 'DESIGN', name: '设计', icon: '🎨' },
  { id: 'ILLUSTRATION', name: '插画', icon: '🖼️' },
  { id: 'PHOTOGRAPHY', name: '摄影', icon: '📷' },
  { id: 'TRANSLATION', name: '翻译', icon: '🌐' },
  { id: 'EDITING', name: '编辑', icon: '📝' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const isExpired = computed(() => {
  if (!collaboration.value?.deadline) return false
  return new Date(collaboration.value.deadline) < new Date()
})

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

const formatDateTime = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getStatusIcon = (status) => {
  const map = {
    PENDING: '⏳',
    APPROVED: '✅',
    REJECTED: '❌',
    CANCELLED: '🚫'
  }
  return map[status] || '📋'
}

const getStatusText = (status) => {
  const map = {
    PENDING: '等待审核',
    APPROVED: '审核通过',
    REJECTED: '未通过',
    CANCELLED: '已取消'
  }
  return map[status] || status
}

const getCollabStatus = (s) => {
  const map = {
    DRAFT: '草稿',
    PENDING_REVIEW: '待审核',
    PUBLISHED: '已发布',
    REJECTED: '未通过审核',
    CLOSED: '已关闭'
  }
  return map[s] || s
}

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await api.get(`/collaborations/${route.params.id}`)
    collaboration.value = res.collaboration
    userApplication.value = res.userApplication
    isOwner.value = res.isOwner || false
    isAdmin.value = res.isAdmin || false
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const submitApplication = async () => {
  submitting.value = true
  try {
    const res = await api.post('/collaboration-applications', {
      collaborationId: collaboration.value.id,
      ...applyForm.value
    })
    userApplication.value = res.application
    showApplyModal.value = false
    showToast(res.message || '申请提交成功', 'success')
  } catch (e) {
    showToast(e.error || '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}

const cancelApplication = async () => {
  if (!confirm('确定要取消此申请吗？')) return
  try {
    await api.put(`/collaboration-applications/${userApplication.value.id}/cancel`)
    userApplication.value.status = 'CANCELLED'
    showToast('申请已取消', 'success')
  } catch (e) {
    showToast(e.error || '取消失败', 'error')
  }
}

const resubmit = async () => {
  if (!confirm('确定要重新提交审核吗？')) return
  try {
    await api.post(`/collaborations/${collaboration.value.id}/resubmit`)
    collaboration.value.status = 'PENDING_REVIEW'
    collaboration.value.rejectionReason = null
    showToast('已重新提交审核', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const adminApprove = async () => {
  if (!confirm('确定审核通过并发布该合作招募吗？')) return
  try {
    await api.post(`/collaborations/${collaboration.value.id}/publish`)
    collaboration.value.status = 'PUBLISHED'
    showToast('已通过并发布', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const adminReject = async () => {
  const reason = prompt('请输入驳回原因（将发送给发起者）')
  if (reason === null) return
  try {
    await api.post(`/collaborations/${collaboration.value.id}/reject`, { reason })
    collaboration.value.status = 'REJECTED'
    collaboration.value.rejectionReason = reason
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
  grid-template-columns: 1fr 320px;
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
.expired-badge {
  padding: 4px 12px;
  background: var(--danger-light);
  color: var(--danger);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}

.detail-title {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 16px;
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
.info-row {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
}
.info-row:last-of-type { border-bottom: none; }
.info-icon { font-size: 18px; }
.info-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.info-label {
  font-size: 12px;
  color: var(--text-tertiary);
}
.info-value {
  font-size: 14px;
  font-weight: 500;
}
.info-value.highlight {
  color: var(--accent);
  font-size: 16px;
}
.info-value.expired { color: var(--danger); }

.sidebar-divider {
  height: 1px;
  background: var(--border-light);
  margin: 20px 0;
}

.apply-notice {
  text-align: center;
}
.notice-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}
.apply-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
  margin-top: 12px;
}

.applied-status {
  text-align: center;
}
.status-icon {
  font-size: 36px;
  margin-bottom: 8px;
}
.status-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}
.status-time {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}
.rejection-reason {
  padding: 12px;
  background: var(--danger-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--danger);
  text-align: left;
  margin-bottom: 16px;
}
.reason-label { font-weight: 500; }

.form-static {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-primary);
}
.optional {
  font-weight: 400;
  color: var(--text-tertiary);
  font-size: 12px;
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

.status-badge {
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}
.status-draft { background: #f5f5f5; color: #8c8c8c; }
.status-pending_review { background: #fff7e6; color: #d48806; }
.status-published { background: #f6ffed; color: #52c41a; }
.status-rejected { background: #fff1f0; color: #cf1322; }
.status-closed { background: #f0f0f0; color: #8c8c8c; }

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

@media (max-width: 900px) {
  .detail-layout { grid-template-columns: 1fr; }
  .sticky { position: static; }
}
</style>
