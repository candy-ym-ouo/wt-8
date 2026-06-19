<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">后台管理</h1>
      <p class="page-subtitle">审核投稿、管理刊物与用户</p>
    </div>

    <div class="admin-tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="['admin-tab', { active: currentTab === t.value }]"
        @click="switchTab(t.value)"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </div>

    <div v-if="currentTab === 'overview'" class="section">
      <div class="stats-grid">
        <div v-for="s in statList" :key="s.label" class="stat-card card">
          <div class="stat-icon" :style="{ background: s.color + '22', color: s.color }">
            {{ s.icon }}
          </div>
          <div class="stat-info">
            <div class="stat-num">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </div>
        </div>
      </div>

      <div class="card mt-lg" style="padding: 24px;">
        <h3 class="font-semibold mb">📝 最新投稿</h3>
        <div v-if="loadingRecent" class="text-sm text-tertiary text-center py-4">加载中...</div>
        <div v-else-if="recentSubs.length === 0" class="empty-state py-8">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text text-sm">暂无投稿</div>
        </div>
        <div v-else class="recent-list">
          <div
            v-for="sub in recentSubs"
            :key="sub.id"
            class="recent-item"
            @click="goToSubmission(sub.id)"
          >
            <img :src="sub.user?.avatar" class="sub-user-avatar">
            <div class="recent-info">
              <div class="flex justify-between">
                <span class="font-medium">{{ sub.title }}</span>
                <span :class="['badge', statusClass(sub.status)]">{{ statusLabel(sub.status) }}</span>
              </div>
              <div class="text-xs text-muted mt-sm">
                {{ sub.user?.username }} · {{ formatDate(sub.createdAt) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'submissions'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in subFilters"
            :key="f.value"
            :class="['btn', subStatus === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="subStatus = f.value; loadSubmissions(1)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <div v-if="loadingSubs" class="empty-state">
        <div class="empty-state-icon">⏳</div>
        <div class="empty-state-text">加载中...</div>
      </div>
      <div v-else-if="allSubs.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">暂无投稿</div>
      </div>
      <div v-else class="submissions-list">
        <div v-for="sub in allSubs" :key="sub.id" class="sub-admin-card card">
          <div class="sub-admin-header">
            <div class="user-info">
              <img :src="sub.user?.avatar" class="sub-user-avatar">
              <div>
                <div class="font-medium">{{ sub.user?.username }}</div>
                <div class="text-xs text-tertiary">{{ formatDate(sub.createdAt) }}</div>
              </div>
            </div>
            <span :class="['badge', statusClass(sub.status)]">{{ statusLabel(sub.status) }}</span>
          </div>
          <h3 class="sub-admin-title font-serif">{{ sub.title }}</h3>
          <div class="sub-admin-content text-sm text-muted">
            {{ sub.content.substring(0, 200) }}{{ sub.content.length > 200 ? '...' : '' }}
          </div>
          <div v-if="sub.images && sub.images.length" class="sub-images-preview">
            <img v-for="(img, i) in sub.images.slice(0, 6)" :key="i" :src="img" alt="">
          </div>
          <div v-if="sub.rejectionReason" class="reject-notice">
            驳回原因：{{ sub.rejectionReason }}
          </div>
          <div v-if="sub.status === 'PENDING'" class="sub-admin-actions">
            <button
              class="btn btn-primary btn-sm"
              @click="openApprove(sub)"
            >
              ✓ 通过审核
            </button>
            <button
              class="btn btn-outline btn-sm"
              @click="openReject(sub)"
            >
              ✕ 驳回
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'zines'" class="section">
      <div v-if="loadingZines" class="empty-state">
        <div class="empty-state-icon">⏳</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>封面</th>
              <th>标题</th>
              <th>作者</th>
              <th>分类</th>
              <th>浏览</th>
              <th>收藏</th>
              <th>发布时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="z in allZines" :key="z.id">
              <td><img :src="z.coverImage" class="thumb-cover"></td>
              <td class="font-medium">{{ z.title }}</td>
              <td class="text-sm text-muted">{{ z.author?.username }}</td>
              <td><span class="tag">{{ z.category }}</span></td>
              <td class="text-sm">{{ z.views }}</td>
              <td class="text-sm">{{ z.likes }}</td>
              <td class="text-xs text-tertiary">{{ formatDate(z.createdAt) }}</td>
              <td>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteZine(z)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'users'" class="section">
      <div v-if="loadingUsers" class="empty-state">
        <div class="empty-state-icon">⏳</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>投稿数</th>
              <th>订阅数</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in allUsers" :key="u.id">
              <td>
                <div class="flex items-center gap-sm">
                  <img :src="u.avatar" style="width: 32px; height: 32px; border-radius: 50%;">
                  <span class="font-medium">{{ u.username }}</span>
                </div>
              </td>
              <td class="text-sm text-muted">{{ u.email }}</td>
              <td>
                <span :class="['badge', u.role === 'ADMIN' ? 'badge-approved' : '']">{{ u.role === 'ADMIN' ? '管理员' : '普通用户' }}</span>
              </td>
              <td class="text-sm">{{ u._count?.submissions || 0 }}</td>
              <td class="text-sm">{{ u._count?.subscriptions || 0 }}</td>
              <td class="text-xs text-tertiary">{{ formatDate(u.createdAt) }}</td>
              <td>
                <select
                  :value="u.role"
                  class="form-select"
                  style="width: auto; padding: 4px 10px; font-size: 12px;"
                  @change="changeRole(u, $event.target.value)"
                >
                  <option value="USER">普通用户</option>
                  <option value="ADMIN">管理员</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showApprove" class="modal-overlay" @click.self="showApprove = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">通过投稿 · 发布为刊物</h3>
          <button class="btn btn-ghost btn-sm" @click="showApprove = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">分类</label>
            <select v-model="approveForm.category" class="form-select" required>
              <option value="文学">文学创作</option>
              <option value="艺术">艺术插画</option>
              <option value="摄影">摄影作品</option>
              <option value="音乐">音乐文化</option>
              <option value="生活">生活方式</option>
              <option value="亚文化">亚文化</option>
              <option value="学术">独立学术</option>
              <option value="漫画">独立漫画</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">标签（逗号分隔）</label>
            <input v-model="approveForm.tagsText" type="text" class="form-input" placeholder="例如: 原创, 随笔, 生活">
          </div>
          <div class="form-group">
            <label class="form-label">描述简介</label>
            <textarea v-model="approveForm.description" class="form-textarea" rows="3" placeholder="刊物的简短介绍"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showApprove = false">取消</button>
          <button class="btn btn-primary" @click="submitApprove" :disabled="submitting">
            {{ submitting ? '处理中...' : '确认发布' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showReject" class="modal-overlay" @click.self="showReject = false">
      <div class="modal card" style="max-width: 460px;">
        <div class="modal-header">
          <h3 class="font-semibold">驳回投稿</h3>
          <button class="btn btn-ghost btn-sm" @click="showReject = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">驳回原因（建议填写，帮助作者改进）</label>
            <textarea v-model="rejectReason" class="form-textarea" rows="4" placeholder="请说明驳回原因..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showReject = false">取消</button>
          <button class="btn btn-outline" @click="submitReject" :disabled="submitting">
            {{ submitting ? '处理中...' : '确认驳回' }}
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
  { label: '概览', value: 'overview', icon: '📊' },
  { label: '投稿审核', value: 'submissions', icon: '📝' },
  { label: '刊物管理', value: 'zines', icon: '📚' },
  { label: '用户管理', value: 'users', icon: '👥' }
]

const subFilters = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' }
]

const currentTab = ref('overview')
const subStatus = ref('all')
const stats = ref({})
const recentSubs = ref([])
const allSubs = ref([])
const allZines = ref([])
const allUsers = ref([])
const loadingRecent = ref(true)
const loadingSubs = ref(false)
const loadingZines = ref(false)
const loadingUsers = ref(false)

const showApprove = ref(false)
const showReject = ref(false)
const selectedSub = ref(null)
const submitting = ref(false)
const approveForm = ref({ category: '文学', tagsText: '', description: '' })
const rejectReason = ref('')

const statList = computed(() => [
  { label: '用户总数', value: stats.value.totalUsers || 0, icon: '👥', color: '#3b82f6' },
  { label: '刊物总数', value: stats.value.totalZines || 0, icon: '📚', color: '#8b5cf6' },
  { label: '投稿总数', value: stats.value.totalSubmissions || 0, icon: '📝', color: '#f59e0b' },
  { label: '待审核', value: stats.value.pendingSubmissions || 0, icon: '⏳', color: '#ef4444' },
  { label: '订阅总数', value: stats.value.totalSubscriptions || 0, icon: '⭐', color: '#10b981' }
])

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
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const switchTab = (tab) => {
  currentTab.value = tab
  if (tab === 'submissions') loadSubmissions()
  if (tab === 'zines') loadZines()
  if (tab === 'users') loadUsers()
  if (tab === 'overview') loadOverview()
}

const loadOverview = async () => {
  try {
    const res = await api.get('/admin/stats')
    stats.value = res.stats || {}
    recentSubs.value = res.recentSubmissions || []
  } catch (e) {}
  loadingRecent.value = false
}

const loadSubmissions = async () => {
  loadingSubs.value = true
  try {
    const params = new URLSearchParams({ limit: 50 })
    if (subStatus.value !== 'all') params.set('status', subStatus.value)
    const res = await api.get(`/admin/submissions?${params}`)
    allSubs.value = res.submissions
  } catch (e) {
    console.error(e)
  } finally {
    loadingSubs.value = false
  }
}

const loadZines = async () => {
  loadingZines.value = true
  try {
    const res = await api.get('/admin/zines?limit=100')
    allZines.value = res.zines
  } catch (e) {}
  finally { loadingZines.value = false }
}

const loadUsers = async () => {
  loadingUsers.value = true
  try {
    const res = await api.get('/admin/users?limit=100')
    allUsers.value = res.users
  } catch (e) {}
  finally { loadingUsers.value = false }
}

const goToSubmission = (id) => {
  currentTab.value = 'submissions'
  subStatus.value = 'all'
  loadSubmissions()
  setTimeout(() => {
    const el = document.querySelector(`[data-sub-id="${id}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 100)
}

const openApprove = (sub) => {
  selectedSub.value = sub
  approveForm.value = {
    category: '文学',
    tagsText: '',
    description: sub.content.substring(0, 180)
  }
  showApprove.value = true
}

const openReject = (sub) => {
  selectedSub.value = sub
  rejectReason.value = ''
  showReject.value = true
}

const submitApprove = async () => {
  submitting.value = true
  try {
    await api.post(`/admin/submissions/${selectedSub.value.id}/approve`, {
      category: approveForm.value.category,
      tags: approveForm.value.tagsText.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      description: approveForm.value.description
    })
    showToast('已通过审核并发布', 'success')
    showApprove.value = false
    loadSubmissions()
    loadOverview()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const submitReject = async () => {
  submitting.value = true
  try {
    await api.post(`/admin/submissions/${selectedSub.value.id}/reject`, {
      reason: rejectReason.value
    })
    showToast('已驳回', 'success')
    showReject.value = false
    loadSubmissions()
    loadOverview()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteZine = async (zine) => {
  if (!confirm(`确定删除刊物《${zine.title}》？此操作不可撤销。`)) return
  try {
    await api.delete(`/admin/zines/${zine.id}`)
    showToast('已删除', 'success')
    loadZines()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const changeRole = async (user, newRole) => {
  try {
    await api.put(`/admin/users/${user.id}/role`, { role: newRole })
    user.role = newRole
    showToast('角色已更新', 'success')
  } catch (e) {
    showToast(e.error || '更新失败', 'error')
    loadUsers()
  }
}

onMounted(() => loadOverview())
</script>

<style scoped>
.admin-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 28px;
  padding: 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius);
  width: fit-content;
}
.admin-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.admin-tab:hover { color: var(--text-primary); }
.admin-tab.active {
  background: var(--bg-secondary);
  color: var(--accent);
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.tab-icon { font-size: 16px; }
.section {}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.stat-num {
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}
.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.recent-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
}
.recent-item:hover { background: var(--bg-tertiary); }
.sub-user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}
.recent-info { flex: 1; min-width: 0; }
.submissions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sub-admin-card { padding: 24px; }
.sub-admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sub-admin-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
}
.sub-admin-content {
  line-height: 1.7;
  margin-bottom: 12px;
}
.sub-images-preview {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.sub-images-preview img {
  width: 90px;
  height: 90px;
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
  margin-bottom: 14px;
}
.sub-admin-actions {
  display: flex;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}
.admin-list { overflow-x: auto; }
.admin-table {
  width: 100%;
  border-collapse: collapse;
}
.admin-table th {
  text-align: left;
  padding: 14px 18px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
}
.admin-table td {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-light);
  vertical-align: middle;
}
.admin-table tr:last-child td { border-bottom: none; }
.admin-table tbody tr:hover { background: var(--bg-primary); }
.thumb-cover {
  width: 48px;
  height: 64px;
  object-fit: cover;
  border-radius: 4px;
  background: var(--bg-tertiary);
}
.danger-btn { color: var(--danger) !important; }
.danger-btn:hover { background: var(--danger-light) !important; }
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
