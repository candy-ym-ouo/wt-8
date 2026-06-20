<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">举报与申诉中心</h1>
      <p class="page-subtitle">提交举报、查看处理进度、发起申诉</p>
    </div>

    <div class="rc-tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="['rc-tab', { active: currentTab === t.value }]"
        @click="switchTab(t.value)"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </div>

    <div v-if="currentTab === 'submit'" class="section">
      <div class="card" style="padding: 24px;">
        <h3 class="font-semibold mb" style="font-size: 16px;">📝 提交举报</h3>
        <form @submit.prevent="submitReport" class="report-form">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">举报类型 <span style="color: var(--danger);">*</span></label>
              <select v-model="form.type" class="form-select" required>
                <option v-for="t in reportTypes" :key="t.value" :value="t.value">{{ t.icon }} {{ t.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">目标类型 <span style="color: var(--danger);">*</span></label>
              <select v-model="form.targetType" class="form-select" required>
                <option v-for="t in targetTypes" :key="t.value" :value="t.value">{{ t.icon }} {{ t.label }}</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">目标ID <span style="color: var(--danger);">*</span></label>
              <input v-model.number="form.targetId" type="number" class="form-input" placeholder="输入被举报内容的ID" required>
            </div>
            <div class="form-group">
              <label class="form-label">目标标题</label>
              <input v-model="form.targetTitle" type="text" class="form-input" placeholder="被举报内容的标题（可选）">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">举报原因 <span style="color: var(--danger);">*</span></label>
            <select v-model="form.reason" class="form-select" required>
              <option value="" disabled>请选择举报原因</option>
              <option v-for="r in reasonOptions" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">详细描述</label>
            <textarea v-model="form.description" class="form-textarea" rows="4" placeholder="请详细描述举报原因，有助于我们更快处理..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">证据链接（每行一个）</label>
            <textarea v-model="evidenceText" class="form-textarea" rows="2" placeholder="截图链接、相关页面URL等"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">被举报用户ID（可选）</label>
            <input v-model.number="form.targetUserId" type="number" class="form-input" placeholder="如果是举报用户行为，填写用户ID">
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? '提交中...' : '🚨 提交举报' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="currentTab === 'my-reports'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            :class="['btn', reportStatus === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="reportStatus = f.value; loadMyReports(1)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <div v-if="loadingReports" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="myReports.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">暂无举报记录</div>
      </div>
      <div v-else class="report-list">
        <div v-for="r in myReports" :key="r.id" class="report-card card" @click="viewReport(r)">
          <div class="rc-header">
            <div class="rc-title-row">
              <span :class="['status-badge', `status-${r.status.toLowerCase()}`]">
                {{ statusLabel(r.status) }}
              </span>
              <span class="rc-type tag">{{ typeLabel(r.type) }}</span>
              <span v-if="r.priority !== 'NORMAL'" :class="['priority-badge', `priority-${r.priority.toLowerCase()}`]">
                {{ priorityLabel(r.priority) }}
              </span>
            </div>
            <div class="rc-meta text-sm text-muted">
              {{ formatDateTime(r.createdAt) }}
            </div>
          </div>
          <div class="rc-body">
            <div class="rc-reason font-medium">{{ r.reason }}</div>
            <div class="rc-target text-sm text-muted">
              {{ targetLabel(r.targetType) }} #{{ r.targetId }}
              <span v-if="r.targetTitle">· {{ r.targetTitle }}</span>
            </div>
            <div v-if="r.description" class="rc-desc text-sm text-muted">
              {{ r.description.substring(0, 100) }}{{ r.description.length > 100 ? '...' : '' }}
            </div>
          </div>
          <div class="rc-footer">
            <div v-if="r.handler" class="rc-handler text-sm">
              处理人：{{ r.handler.username }}
            </div>
            <div v-if="r.handleResult" class="rc-result text-sm">
              处理结果：{{ handleResultLabel(r.handleResult) }}
            </div>
            <div class="rc-actions">
              <button
                v-if="r.status === 'PENDING'"
                class="btn btn-ghost btn-sm danger-btn"
                @click.stop="cancelReport(r)"
              >
                撤回
              </button>
              <button
                v-if="r.status === 'RESOLVED' || r.status === 'PENALIZED'"
                class="btn btn-secondary btn-sm"
                @click.stop="openAppealModal(r)"
              >
                🔄 申诉
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="reportTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="reportPage === 1" @click="loadMyReports(reportPage - 1)">←</button>
        <span class="page-info">第 {{ reportPage }} / {{ reportTotalPages }} 页</span>
        <button class="page-btn" :disabled="reportPage === reportTotalPages" @click="loadMyReports(reportPage + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'my-appeals'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in appealStatusFilters"
            :key="f.value"
            :class="['btn', appealStatus === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="appealStatus = f.value; loadMyAppeals(1)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <div v-if="loadingAppeals" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="myAppeals.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">🔄</div>
        <div class="empty-state-text">暂无申诉记录</div>
      </div>
      <div v-else class="appeal-list">
        <div v-for="a in myAppeals" :key="a.id" class="appeal-card card">
          <div class="ap-header">
            <span :class="['status-badge', `status-${a.status.toLowerCase()}`]">
              {{ appealStatusLabel(a.status) }}
            </span>
            <span class="text-sm text-muted">{{ formatDateTime(a.createdAt) }}</span>
          </div>
          <div class="ap-body">
            <div class="ap-reason font-medium">{{ a.reason }}</div>
            <div class="ap-report-ref text-sm text-muted">
              关联举报：{{ a.report?.reason }}
              <span v-if="a.report?.targetTitle">· {{ a.report.targetTitle }}</span>
            </div>
          </div>
          <div v-if="a.handleNote" class="ap-handle-note">
            处理说明：{{ a.handleNote }}
          </div>
          <div v-if="a.handler" class="ap-handler text-sm text-muted">
            处理人：{{ a.handler.username }} · {{ formatDateTime(a.handledAt) }}
          </div>
        </div>
      </div>

      <div v-if="appealTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="appealPage === 1" @click="loadMyAppeals(appealPage - 1)">←</button>
        <span class="page-info">第 {{ appealPage }} / {{ appealTotalPages }} 页</span>
        <button class="page-btn" :disabled="appealPage === appealTotalPages" @click="loadMyAppeals(appealPage + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'detail' && selectedReport" class="section">
      <div class="card" style="padding: 24px;">
        <div class="detail-back">
          <button class="btn btn-ghost btn-sm" @click="currentTab = 'my-reports'">← 返回列表</button>
        </div>

        <div class="detail-header">
          <div class="detail-title-row">
            <h3 class="font-semibold" style="font-size: 18px;">举报详情 #{{ selectedReport.id }}</h3>
            <span :class="['status-badge', `status-${selectedReport.status.toLowerCase()}`]">
              {{ statusLabel(selectedReport.status) }}
            </span>
          </div>
          <div class="detail-meta text-sm text-muted">
            提交时间：{{ formatDateTime(selectedReport.createdAt) }}
            <span v-if="selectedReport.handledAt"> · 处理时间：{{ formatDateTime(selectedReport.handledAt) }}</span>
          </div>
        </div>

        <div class="detail-body">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">举报类型</span>
              <span class="detail-value">{{ typeLabel(selectedReport.type) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">目标</span>
              <span class="detail-value">{{ targetLabel(selectedReport.targetType) }} #{{ selectedReport.targetId }}</span>
            </div>
            <div class="detail-item" v-if="selectedReport.targetTitle">
              <span class="detail-label">目标标题</span>
              <span class="detail-value">{{ selectedReport.targetTitle }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">优先级</span>
              <span class="detail-value">{{ priorityLabel(selectedReport.priority) }}</span>
            </div>
            <div class="detail-item" v-if="selectedReport.handler">
              <span class="detail-label">处理人</span>
              <span class="detail-value">{{ selectedReport.handler.username }}</span>
            </div>
          </div>

          <div class="detail-section">
            <h4 class="detail-section-title">举报原因</h4>
            <p>{{ selectedReport.reason }}</p>
          </div>

          <div v-if="selectedReport.description" class="detail-section">
            <h4 class="detail-section-title">详细描述</h4>
            <p>{{ selectedReport.description }}</p>
          </div>

          <div v-if="selectedReport.handleNote" class="detail-section">
            <h4 class="detail-section-title">处理说明</h4>
            <p>{{ selectedReport.handleNote }}</p>
          </div>

          <div v-if="selectedReport.penaltyType" class="detail-section">
            <h4 class="detail-section-title">处罚信息</h4>
            <p>处罚类型：{{ penaltyLabel(selectedReport.penaltyType) }}</p>
            <p v-if="selectedReport.penaltyDetail">{{ selectedReport.penaltyDetail }}</p>
          </div>
        </div>

        <div v-if="selectedReport.logs && selectedReport.logs.length > 0" class="detail-section" style="margin-top: 24px;">
          <h4 class="detail-section-title">操作日志</h4>
          <div class="log-timeline">
            <div v-for="log in selectedReport.logs" :key="log.id" class="log-item">
              <div class="log-dot"></div>
              <div class="log-content">
                <div class="log-action">{{ actionLabel(log.action) }}</div>
                <div v-if="log.detail" class="log-detail text-sm text-muted">{{ log.detail }}</div>
                <div class="log-meta text-xs text-muted">
                  {{ log.operator?.username || '系统' }} · {{ formatDateTime(log.createdAt) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-actions" style="margin-top: 20px;">
          <button
            v-if="selectedReport.status === 'PENDING'"
            class="btn btn-ghost danger-btn"
            @click="cancelReport(selectedReport)"
          >
            撤回举报
          </button>
          <button
            v-if="selectedReport.status === 'RESOLVED' || selectedReport.status === 'PENALIZED'"
            class="btn btn-primary"
            @click="openAppealModal(selectedReport)"
          >
            🔄 提交申诉
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAppealModal" class="modal-overlay" @click.self="showAppealModal = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">提交申诉</h3>
          <button class="btn btn-ghost btn-sm" @click="showAppealModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">申诉原因 <span style="color: var(--danger);">*</span></label>
            <textarea v-model="appealForm.reason" class="form-textarea" rows="4" placeholder="请详细说明申诉理由..." required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">证据链接（每行一个）</label>
            <textarea v-model="appealEvidenceText" class="form-textarea" rows="2" placeholder="补充证据URL..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAppealModal = false">取消</button>
          <button class="btn btn-primary" @click="submitAppeal" :disabled="submittingAppeal">
            {{ submittingAppeal ? '提交中...' : '提交申诉' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const authStore = useAuthStore()
const showToast = inject('showToast')

const tabs = [
  { value: 'submit', label: '提交举报', icon: '📝' },
  { value: 'my-reports', label: '我的举报', icon: '📋' },
  { value: 'my-appeals', label: '我的申诉', icon: '🔄' }
]

const reportTypes = [
  { value: 'CONTENT', label: '内容违规', icon: '📄' },
  { value: 'USER', label: '用户行为', icon: '👤' },
  { value: 'SPAM', label: '垃圾信息', icon: '📢' },
  { value: 'ILLEGAL', label: '违法信息', icon: '⚠️' },
  { value: 'OTHER', label: '其他', icon: '❓' }
]

const targetTypes = [
  { value: 'ZINE', label: '刊物', icon: '📖' },
  { value: 'SUBMISSION', label: '投稿', icon: '📝' },
  { value: 'COLLABORATION', label: '合作', icon: '🤝' },
  { value: 'CROWDFUNDING', label: '众筹', icon: '🎯' },
  { value: 'EVENT', label: '活动', icon: '📅' },
  { value: 'COMMENT', label: '评论', icon: '💬' },
  { value: 'USER', label: '用户', icon: '👤' },
  { value: 'OTHER', label: '其他', icon: '❓' }
]

const reasonOptions = [
  '色情低俗',
  '广告骚扰',
  '虚假信息',
  '侵权抄袭',
  '恶意攻击',
  '违法违规',
  '垃圾灌水',
  '其他'
]

const statusFilters = [
  { label: '全部', value: 'all' },
  { label: '待处理', value: 'PENDING' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '申诉中', value: 'APPEALING' },
  { label: '已处理', value: 'RESOLVED' },
  { label: '已处罚', value: 'PENALIZED' },
  { label: '已驳回', value: 'DISMISSED' },
  { label: '已撤回', value: 'CANCELLED' }
]

const appealStatusFilters = [
  { label: '全部', value: 'all' },
  { label: '待处理', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' }
]

const currentTab = ref('submit')
const form = ref({
  type: 'CONTENT',
  targetType: 'ZINE',
  targetId: null,
  targetTitle: '',
  reason: '',
  description: '',
  targetUserId: null
})
const evidenceText = ref('')
const submitting = ref(false)

const myReports = ref([])
const loadingReports = ref(false)
const reportStatus = ref('all')
const reportPage = ref(1)
const reportTotalPages = ref(1)

const myAppeals = ref([])
const loadingAppeals = ref(false)
const appealStatus = ref('all')
const appealPage = ref(1)
const appealTotalPages = ref(1)

const selectedReport = ref(null)

const showAppealModal = ref(false)
const appealingReport = ref(null)
const appealForm = ref({ reason: '' })
const appealEvidenceText = ref('')
const submittingAppeal = ref(false)

const statusLabel = (s) => {
  const map = {
    PENDING: '待处理',
    PROCESSING: '处理中',
    RESOLVED: '已处理',
    PENALIZED: '已处罚',
    DISMISSED: '已驳回',
    APPEALING: '申诉中',
    CANCELLED: '已撤回'
  }
  return map[s] || s
}

const typeLabel = (t) => {
  const found = reportTypes.find(r => r.value === t)
  return found ? `${found.icon} ${found.label}` : t
}

const targetLabel = (t) => {
  const found = targetTypes.find(r => r.value === t)
  return found ? found.label : t
}

const priorityLabel = (p) => {
  const map = { LOW: '低', NORMAL: '普通', HIGH: '高', URGENT: '紧急' }
  return map[p] || p
}

const handleResultLabel = (r) => {
  const map = { DISMISS: '驳回', RESOLVE: '处理', PENALIZE: '处罚' }
  return map[r] || r
}

const appealStatusLabel = (s) => {
  const map = { PENDING: '待处理', APPROVED: '已通过', REJECTED: '已驳回', PROCESSING: '处理中' }
  return map[s] || s
}

const penaltyLabel = (p) => {
  const map = { WARNING: '警告', MUTE: '禁言', BAN: '封禁', DELETE_CONTENT: '删除内容' }
  return map[p] || p
}

const actionLabel = (a) => {
  const map = {
    CREATE: '提交举报',
    CANCEL: '撤回举报',
    HANDLE_DISMISS: '驳回举报',
    HANDLE_RESOLVE: '处理举报',
    HANDLE_PENALIZE: '处罚处理',
    APPEAL: '提交申诉',
    APPEAL_APPROVE: '申诉通过',
    APPEAL_REJECT: '申诉驳回',
    ESCALATE: '升级处理',
    PRIORITY_CHANGE: '优先级变更'
  }
  return map[a] || a
}

const formatDateTime = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const switchTab = (t) => {
  currentTab.value = t
  if (t === 'my-reports') loadMyReports(1)
  if (t === 'my-appeals') loadMyAppeals(1)
}

const submitReport = async () => {
  if (!form.value.reason || !form.value.targetId) {
    showToast('请填写举报原因和目标ID', 'warning')
    return
  }
  submitting.value = true
  try {
    const evidence = evidenceText.value
      ? evidenceText.value.split('\n').map(e => e.trim()).filter(Boolean)
      : []
    await api.post('/reports', {
      ...form.value,
      evidence
    })
    showToast('举报已提交，我们会尽快处理', 'success')
    form.value = { type: 'CONTENT', targetType: 'ZINE', targetId: null, targetTitle: '', reason: '', description: '', targetUserId: null }
    evidenceText.value = ''
    currentTab.value = 'my-reports'
    loadMyReports(1)
  } catch (e) {
    showToast(e.error || '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}

const loadMyReports = async (newPage = 1) => {
  loadingReports.value = true
  reportPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 10 })
    if (reportStatus.value !== 'all') params.set('status', reportStatus.value)
    const res = await api.get(`/reports/my?${params}`)
    myReports.value = res.reports
    reportTotalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingReports.value = false
  }
}

const loadMyAppeals = async (newPage = 1) => {
  loadingAppeals.value = true
  appealPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 10 })
    if (appealStatus.value !== 'all') params.set('status', appealStatus.value)
    const res = await api.get(`/reports/my/appeals?${params}`)
    myAppeals.value = res.appeals
    appealTotalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingAppeals.value = false
  }
}

const viewReport = async (r) => {
  try {
    const res = await api.get(`/reports/${r.id}`)
    selectedReport.value = res.report
    currentTab.value = 'detail'
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  }
}

const cancelReport = async (r) => {
  if (!confirm('确定要撤回此举报吗？')) return
  try {
    await api.put(`/reports/${r.id}/cancel`)
    showToast('已撤回', 'success')
    loadMyReports(reportPage.value)
    if (selectedReport.value?.id === r.id) {
      currentTab.value = 'my-reports'
    }
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const openAppealModal = (r) => {
  appealingReport.value = r
  appealForm.value = { reason: '' }
  appealEvidenceText.value = ''
  showAppealModal.value = true
}

const submitAppeal = async () => {
  if (!appealForm.value.reason) {
    showToast('请填写申诉原因', 'warning')
    return
  }
  submittingAppeal.value = true
  try {
    const evidence = appealEvidenceText.value
      ? appealEvidenceText.value.split('\n').map(e => e.trim()).filter(Boolean)
      : []
    await api.post(`/reports/${appealingReport.value.id}/appeal`, {
      reason: appealForm.value.reason,
      evidence
    })
    showToast('申诉已提交', 'success')
    showAppealModal.value = false
    loadMyReports(reportPage.value)
    if (selectedReport.value?.id === appealingReport.value.id) {
      const res = await api.get(`/reports/${appealingReport.value.id}`)
      selectedReport.value = res.report
    }
  } catch (e) {
    showToast(e.error || '提交失败', 'error')
  } finally {
    submittingAppeal.value = false
  }
}

onMounted(() => {
  loadMyReports(1)
  loadMyAppeals(1)
})
</script>

<style scoped>
.rc-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 6px;
}
.rc-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
  position: relative;
}
.rc-tab:hover { color: var(--text-primary); background: var(--bg-tertiary); }
.rc-tab.active { background: var(--accent); color: #fff; }
.tab-icon { font-size: 16px; }

.mb { margin-bottom: 16px; }
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.gap-sm { gap: 8px; }
.text-sm { font-size: 13px; }
.text-xs { font-size: 12px; }
.text-muted { color: var(--text-tertiary); }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.danger-btn { color: var(--danger); }

.report-form .form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.report-list, .appeal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.report-card {
  padding: 18px 22px;
  cursor: pointer;
  transition: all 0.2s;
}
.report-card:hover { box-shadow: var(--shadow-md); }

.rc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.rc-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.rc-meta { white-space: nowrap; }
.rc-body { margin-bottom: 10px; }
.rc-reason { font-size: 15px; margin-bottom: 4px; }
.rc-target { margin-bottom: 4px; }
.rc-desc { line-height: 1.5; }
.rc-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}
.rc-actions { display: flex; gap: 8px; }

.status-badge {
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}
.status-pending { background: #fff7e6; color: #d48806; }
.status-processing { background: #e6f7ff; color: #1890ff; }
.status-resolved { background: #f6ffed; color: #52c41a; }
.status-penalized { background: #fff1f0; color: #cf1322; }
.status-dismissed { background: #f5f5f5; color: #8c8c8c; }
.status-appealing { background: #f9f0ff; color: #722ed1; }
.status-cancelled { background: #f5f5f5; color: #8c8c8c; }
.status-approved { background: #f6ffed; color: #52c41a; }
.status-rejected { background: #fff1f0; color: #cf1322; }

.priority-badge {
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
}
.priority-low { background: #f0f0f0; color: #8c8c8c; }
.priority-normal { background: #e6f7ff; color: #1890ff; }
.priority-high { background: #fff7e6; color: #d48806; }
.priority-urgent { background: #fff1f0; color: #cf1322; }

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 100px;
}

.appeal-card {
  padding: 18px 22px;
}
.ap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.ap-body { margin-bottom: 10px; }
.ap-reason { font-size: 15px; margin-bottom: 4px; }
.ap-report-ref { margin-bottom: 4px; }
.ap-handle-note {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: 8px;
}
.ap-handler { margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--border-light); }

.detail-back { margin-bottom: 16px; }
.detail-header {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 20px;
}
.detail-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.detail-meta { font-size: 13px; }
.detail-body { margin-bottom: 16px; }
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.detail-item {
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
.detail-label { font-size: 12px; color: var(--text-tertiary); display: block; margin-bottom: 4px; }
.detail-value { font-size: 14px; font-weight: 500; }
.detail-section { margin-bottom: 16px; }
.detail-section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-light);
}
.detail-section p { font-size: 14px; line-height: 1.7; }

.log-timeline { position: relative; padding-left: 20px; }
.log-item {
  position: relative;
  padding-bottom: 16px;
  padding-left: 16px;
  border-left: 2px solid var(--border-light);
}
.log-item:last-child { border-left-color: transparent; padding-bottom: 0; }
.log-dot {
  position: absolute;
  left: -7px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--bg-secondary);
}
.log-action { font-size: 14px; font-weight: 500; }
.log-detail { margin-top: 2px; }
.log-meta { margin-top: 4px; }

.detail-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
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
  background: var(--bg-secondary);
  border-radius: var(--radius);
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-light);
}
.modal-body { padding: 24px; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
}

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
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-secondary); }

.filter-tabs { display: flex; flex-wrap: wrap; }
</style>
