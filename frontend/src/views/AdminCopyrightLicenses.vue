<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">⚖️ 版权授权审批管理</h1>
      <p class="page-subtitle">审批版权授权申请、跟踪合同状态、查看操作留痕</p>
    </div>

    <div v-if="stats" class="stats-grid">
      <div class="stat-card card">
        <div class="stat-label">总申请数</div>
        <div class="stat-value">{{ stats.total }}</div>
      </div>
      <div class="stat-card card highlight-warning">
        <div class="stat-label">待处理</div>
        <div class="stat-value">{{ stats.needReview }}</div>
      </div>
      <div class="stat-card card highlight-success">
        <div class="stat-label">生效中</div>
        <div class="stat-value">{{ stats.active }}</div>
      </div>
      <div class="stat-card card highlight-info">
        <div class="stat-label">今日新增</div>
        <div class="stat-value">{{ stats.todayNew }}</div>
      </div>
    </div>

    <div class="cl-tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="['cl-tab', { active: currentTab === t.value }]"
        @click="switchTab(t.value)"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </div>

    <div v-if="currentTab === 'list'" class="section">
      <div class="filter-bar card" style="padding: 16px 20px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">状态</label>
            <select v-model="filterStatus" class="form-select" @change="loadLicenses(1)">
              <option value="all">全部状态</option>
              <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">作品类型</label>
            <select v-model="filterWorkType" class="form-select" @change="loadLicenses(1)">
              <option value="all">全部</option>
              <option v-for="w in workTypes" :key="w.value" :value="w.value">{{ w.label }}</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">授权类型</label>
            <select v-model="filterLicenseType" class="form-select" @change="loadLicenses(1)">
              <option value="all">全部</option>
              <option v-for="l in licenseTypes" :key="l.value" :value="l.value">{{ l.label }}</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">关键词</label>
            <input v-model="keyword" type="text" class="form-input" placeholder="搜索标题/作品/编号" @keyup.enter="loadLicenses(1)">
          </div>
        </div>
        <div style="margin-top: 12px; text-align: right;">
          <button class="btn btn-secondary btn-sm" @click="resetFilters">重置筛选</button>
          <button class="btn btn-primary btn-sm" @click="loadLicenses(1)" style="margin-left: 8px;">🔍 搜索</button>
        </div>
      </div>

      <div v-if="loading" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="licenses.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">暂无授权申请</div>
      </div>
      <div v-else>
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>编号</th>
                <th>作品</th>
                <th>申请人</th>
                <th>作者</th>
                <th>授权类型</th>
                <th>费用</th>
                <th>状态</th>
                <th>提交时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in licenses" :key="l.id" @click="viewLicense(l)">
                <td class="text-sm">{{ l.licenseNo }}</td>
                <td>
                  <div class="font-medium">{{ l.workTitle }}</div>
                  <div class="text-xs text-muted">{{ getWorkTypeLabel(l.workType) }} #{{ l.workId }}</div>
                </td>
                <td>
                  <span v-if="l.applicant">{{ l.applicant.username }}</span>
                </td>
                <td>
                  <span v-if="l.author">{{ l.author.username }}</span>
                </td>
                <td><span class="tag">{{ getLicenseTypeLabel(l.licenseType) }}</span></td>
                <td class="font-medium" style="color: var(--accent);">¥{{ l.licenseFee || 0 }}</td>
                <td>
                  <span :class="['status-badge', `status-${l.status.toLowerCase()}`]">{{ statusLabel(l.status) }}</span>
                </td>
                <td class="text-sm text-muted">{{ formatDateTime(l.createdAt) }}</td>
                <td>
                  <button class="btn btn-sm btn-primary" @click.stop="viewLicense(l)">查看</button>
                  <button
                    v-if="l.status === 'PENDING'"
                    class="btn btn-sm btn-secondary"
                    style="margin-left: 4px;"
                    @click.stop="openApproveModal(l)"
                  >
                    通过
                  </button>
                  <button
                    v-if="l.status === 'PENDING'"
                    class="btn btn-sm btn-ghost danger-btn"
                    style="margin-left: 4px;"
                    @click.stop="openRejectModal(l)"
                  >
                    拒绝
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="totalPages > 1" class="pagination">
          <button class="page-btn" :disabled="page === 1" @click="loadLicenses(page - 1)">←</button>
          <span class="page-info">第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} 条</span>
          <button class="page-btn" :disabled="page === totalPages" @click="loadLicenses(page + 1)">→</button>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'detail' && selectedLicense" class="section">
      <div class="card" style="padding: 28px;">
        <div class="detail-back">
          <button class="btn btn-ghost btn-sm" @click="currentTab = 'list'">← 返回列表</button>
        </div>

        <div class="detail-header">
          <div class="detail-title-row">
            <h3 class="font-semibold" style="font-size: 20px;">{{ selectedLicense.title }}</h3>
            <span :class="['status-badge', `status-${selectedLicense.status.toLowerCase()}`]">{{ statusLabel(selectedLicense.status) }}</span>
            <span class="tag">{{ selectedLicense.licenseNo }}</span>
          </div>
          <div class="detail-meta text-sm text-muted">
            创建：{{ formatDateTime(selectedLicense.createdAt) }}
            <span v-if="selectedLicense.reviewedAt"> · 审批：{{ formatDateTime(selectedLicense.reviewedAt) }}</span>
            <span v-if="selectedLicense.reviewer"> · 审批人：{{ selectedLicense.reviewer.username }}</span>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">作品</span>
            <span class="detail-value">{{ getWorkTypeLabel(selectedLicense.workType) }} #{{ selectedLicense.workId }} · {{ selectedLicense.workTitle }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">申请人</span>
            <span class="detail-value">{{ selectedLicense.applicant?.username }} <span class="text-muted" v-if="selectedLicense.applicantCompany">({{ selectedLicense.applicantCompany }})</span></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">作者</span>
            <span class="detail-value">{{ selectedLicense.author?.username }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">授权类型</span>
            <span class="detail-value">{{ getLicenseTypeLabel(selectedLicense.licenseType) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">费用</span>
            <span class="detail-value font-semibold" style="color: var(--accent);">¥{{ selectedLicense.licenseFee || 0 }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">使用范围</span>
            <span class="detail-value">{{ getScopeLabel(selectedLicense.usageScope) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">用途</span>
            <span class="detail-value">{{ getPurposeLabel(selectedLicense.purposeCategory) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">合同签署</span>
            <span class="detail-value">{{ selectedLicense.contractSigned ? '✅ 已签署 ' + formatDateTime(selectedLicense.contractSignedAt) : '❌ 未签署' }}</span>
          </div>
        </div>

        <div class="permission-grid mt">
          <div :class="['permission-item', 'readonly', { active: selectedLicense.commercialUse }]">
            <div class="perm-icon">{{ selectedLicense.commercialUse ? '✅' : '❌' }}</div>
            <div><div class="perm-title">商业使用</div></div>
          </div>
          <div :class="['permission-item', 'readonly', { active: selectedLicense.derivativeAllowed }]">
            <div class="perm-icon">{{ selectedLicense.derivativeAllowed ? '✅' : '❌' }}</div>
            <div><div class="perm-title">衍生创作</div></div>
          </div>
          <div :class="['permission-item', 'readonly', { active: selectedLicense.distributeAllowed }]">
            <div class="perm-icon">{{ selectedLicense.distributeAllowed ? '✅' : '❌' }}</div>
            <div><div class="perm-title">分发传播</div></div>
          </div>
          <div :class="['permission-item', 'readonly', { active: selectedLicense.attributionRequired }]">
            <div class="perm-icon">{{ selectedLicense.attributionRequired ? '✅' : '❌' }}</div>
            <div><div class="perm-title">署名要求</div></div>
          </div>
        </div>

        <div class="detail-section mt">
          <h4 class="detail-section-title">用途详细说明</h4>
          <p>{{ selectedLicense.purposeDetail }}</p>
        </div>

        <div v-if="selectedLicense.authorConfirmRemark || selectedLicense.authorAskedPrice" class="detail-section">
          <h4 class="detail-section-title">作者确认信息</h4>
          <div v-if="selectedLicense.authorConfirmRemark"><p>{{ selectedLicense.authorConfirmRemark }}</p></div>
          <div v-if="selectedLicense.authorAskedPrice" class="text-sm">作者期望费用：¥{{ selectedLicense.authorAskedPrice }}</div>
          <div v-if="selectedLicense.authorContractTerms" class="mt-sm" style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px;">
            <strong>作者补充条款：</strong><br>
            {{ selectedLicense.authorContractTerms }}
          </div>
        </div>

        <div v-if="selectedLicense.rejectionReason" class="detail-section" style="background: #fff1f0; padding: 16px; border-radius: 8px;">
          <h4 class="detail-section-title" style="color: #cf1322;">拒绝原因</h4>
          <p>{{ selectedLicense.rejectionReason }}</p>
        </div>

        <div v-if="selectedLicense.reviewRemark" class="detail-section">
          <h4 class="detail-section-title">审批备注</h4>
          <p>{{ selectedLicense.reviewRemark }}</p>
        </div>

        <div v-if="selectedLicense.contractContent" class="detail-section">
          <h4 class="detail-section-title">📄 合同内容</h4>
          <div style="white-space: pre-wrap; line-height: 1.8; background: var(--bg-tertiary); padding: 16px; border-radius: 8px;">{{ selectedLicense.contractContent }}</div>
        </div>

        <div v-if="selectedLicense.logs && selectedLicense.logs.length > 0" class="detail-section">
          <h4 class="detail-section-title">📊 完整审批留痕</h4>
          <div class="log-timeline">
            <div v-for="log in selectedLicense.logs" :key="log.id" class="log-item">
              <div class="log-dot"></div>
              <div class="log-content">
                <div class="log-action">{{ actionLabel(log.action) }}</div>
                <div v-if="log.fromStatus || log.toStatus" class="log-status text-xs text-muted">
                  {{ log.fromStatus ? statusLabel(log.fromStatus) : '' }} {{ log.fromStatus && log.toStatus ? '→' : '' }} {{ log.toStatus ? statusLabel(log.toStatus) : '' }}
                </div>
                <div v-if="log.detail" class="log-detail text-sm text-muted">{{ log.detail }}</div>
                <div class="log-meta text-xs text-muted">
                  {{ log.operator?.username || '系统' }} · {{ formatDateTime(log.createdAt) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-actions mt">
          <button
            v-if="selectedLicense.status === 'PENDING'"
            class="btn btn-primary"
            @click="openApproveModal(selectedLicense)"
          >
            ✅ 通过审批
          </button>
          <button
            v-if="selectedLicense.status === 'PENDING'"
            class="btn btn-ghost danger-btn"
            @click="openRejectModal(selectedLicense)"
          >
            ❌ 拒绝申请
          </button>
          <button
            v-if="['ACTIVE', 'APPROVED'].includes(selectedLicense.status)"
            class="btn btn-secondary"
            @click="markExpire"
          >
            ⏰ 标记过期
          </button>
          <button
            class="btn btn-ghost danger-btn"
            @click="deleteLicense"
          >
            🗑️ 删除申请
          </button>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'logs'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="a in logActionOptions"
            :key="a.value"
            :class="['btn', logFilterAction === a.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="logFilterAction = a.value; loadLogs(1)"
          >
            {{ a.label }}
          </button>
        </div>
      </div>
      <div v-if="loadingLogs" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>操作类型</th>
              <th>操作人</th>
              <th>关联申请</th>
              <th>状态变更</th>
              <th>详情</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td class="text-sm text-muted">{{ formatDateTime(log.createdAt) }}</td>
              <td><span class="tag">{{ actionLabel(log.action) }}</span></td>
              <td>{{ log.operator?.username }}</td>
              <td class="text-sm">
                <span @click="viewLicenseById(log.licenseId)" style="cursor: pointer; color: var(--accent);">
                  {{ log.license?.licenseNo }} - {{ log.license?.workTitle }}
                </span>
              </td>
              <td class="text-xs">
                <span v-if="log.fromStatus">{{ statusLabel(log.fromStatus) }}</span>
                <span v-if="log.fromStatus && log.toStatus"> → </span>
                <span v-if="log.toStatus">{{ statusLabel(log.toStatus) }}</span>
              </td>
              <td class="text-sm text-muted">{{ log.detail || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="logsTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="logsPage === 1" @click="loadLogs(logsPage - 1)">←</button>
        <span class="page-info">第 {{ logsPage }} / {{ logsTotalPages }} 页</span>
        <button class="page-btn" :disabled="logsPage === logsTotalPages" @click="loadLogs(logsPage + 1)">→</button>
      </div>
    </div>

    <div v-if="showApproveModal" class="modal-overlay" @click.self="showApproveModal = false">
      <div class="modal card" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="font-semibold">通过版权授权审批</h3>
          <button class="btn btn-ghost btn-sm" @click="showApproveModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">审批备注</label>
            <textarea v-model="approveForm.remark" class="form-textarea" rows="3" placeholder="（可选）对双方的说明..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">最终授权费用（元）</label>
            <input v-model.number="approveForm.licenseFee" type="number" min="0" step="0.01" class="form-input" placeholder="留空则使用申请时的费用">
          </div>
          <div class="form-group">
            <label class="form-label">合同内容</label>
            <textarea v-model="approveForm.contractContent" class="form-textarea" rows="6" placeholder="请填写完整的授权合同条款内容..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">合同附件链接（可选）</label>
            <input v-model="approveForm.contractFile" type="text" class="form-input" placeholder="PDF文件或在线文档链接">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showApproveModal = false">取消</button>
          <button class="btn btn-primary" @click="approveLicense" :disabled="approving">{{ approving ? '处理中...' : '✅ 确认通过' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">拒绝版权授权申请</h3>
          <button class="btn btn-ghost btn-sm" @click="showRejectModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">拒绝原因 <span class="required">*</span></label>
            <textarea v-model="rejectForm.reason" class="form-textarea" rows="5" placeholder="请详细说明拒绝的原因..." required></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showRejectModal = false">取消</button>
          <button class="btn btn-primary danger-btn" @click="rejectLicense" :disabled="rejecting">{{ rejecting ? '处理中...' : '❌ 确认拒绝' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const tabs = [
  { value: 'list', label: '申请列表', icon: '📋' },
  { value: 'detail', label: '申请详情', icon: '🔍' },
  { value: 'logs', label: '操作日志', icon: '📊' }
]

const workTypes = [
  { value: 'ZINE', label: '刊物' },
  { value: 'SUBMISSION', label: '投稿' },
  { value: 'COLLECTION', label: '合集' },
  { value: 'COLLABORATION', label: '合作' },
  { value: 'COMPETITION', label: '竞赛' },
  { value: 'OTHER', label: '其他' }
]

const licenseTypes = [
  { value: 'STANDARD', label: '标准授权' },
  { value: 'EXTENDED', label: '扩展授权' },
  { value: 'EXCLUSIVE', label: '独家授权' },
  { value: 'CUSTOM', label: '自定义' }
]

const statusOptions = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'AUTHOR_PENDING', label: '待作者确认' },
  { value: 'PENDING', label: '待审批' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'ACTIVE', label: '生效中' },
  { value: 'REJECTED', label: '已拒绝' },
  { value: 'AUTHOR_REJECTED', label: '作者拒绝' },
  { value: 'CANCELLED', label: '已撤回' },
  { value: 'EXPIRED', label: '已过期' }
]

const logActionOptions = [
  { value: 'all', label: '全部操作' },
  { value: 'CREATE', label: '创建' },
  { value: 'SUBMIT', label: '提交' },
  { value: 'AUTHOR_CONFIRM', label: '作者确认' },
  { value: 'AUTHOR_REJECT', label: '作者拒绝' },
  { value: 'APPROVE', label: '审批通过' },
  { value: 'REJECT', label: '审批拒绝' },
  { value: 'SIGN_CONTRACT', label: '签署合同' },
  { value: 'CANCEL', label: '撤回' },
  { value: 'EXPIRE', label: '过期' }
]

const usageScopes = [
  { value: 'PERSONAL', label: '个人使用' },
  { value: 'ORGANIZATION', label: '组织内部' },
  { value: 'ENTERPRISE', label: '企业商用' },
  { value: 'PUBLIC', label: '公开传播' }
]

const purposeCategories = [
  { value: 'ACADEMIC', label: '学术研究' },
  { value: 'COMMERCIAL', label: '商业活动' },
  { value: 'PROMOTION', label: '宣传推广' },
  { value: 'EXHIBITION', label: '展览展示' },
  { value: 'PUBLICATION', label: '出版发行' },
  { value: 'OTHER', label: '其他用途' }
]

const currentTab = ref('list')
const stats = ref(null)

const licenses = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const totalPages = ref(1)
const filterStatus = ref('all')
const filterWorkType = ref('all')
const filterLicenseType = ref('all')
const keyword = ref('')

const logs = ref([])
const loadingLogs = ref(false)
const logsPage = ref(1)
const logsTotalPages = ref(1)
const logFilterAction = ref('all')

const selectedLicense = ref(null)

const showApproveModal = ref(false)
const showRejectModal = ref(false)
const approveForm = ref({ remark: '', licenseFee: null, contractContent: '', contractFile: '' })
const rejectForm = ref({ reason: '' })
const approving = ref(false)
const rejecting = ref(false)

const statusLabel = (s) => {
  const map = {
    DRAFT: '草稿', AUTHOR_PENDING: '待作者确认', PENDING: '待审批',
    APPROVED: '已通过', ACTIVE: '生效中', REJECTED: '已拒绝',
    AUTHOR_REJECTED: '作者拒绝', CANCELLED: '已撤回', EXPIRED: '已过期'
  }
  return map[s] || s
}

const getWorkTypeLabel = (t) => workTypes.find(w => w.value === t)?.label || t
const getLicenseTypeLabel = (l) => licenseTypes.find(lt => lt.value === l)?.label || l
const getScopeLabel = (s) => usageScopes.find(sc => sc.value === s)?.label || s
const getPurposeLabel = (p) => purposeCategories.find(c => c.value === p)?.label || p

const actionLabel = (a) => {
  const map = {
    CREATE: '创建申请', UPDATE: '更新信息', SUBMIT: '提交申请',
    AUTHOR_CONFIRM: '作者确认', AUTHOR_REJECT: '作者拒绝',
    APPROVE: '平台通过', REJECT: '平台拒绝',
    CANCEL: '撤回申请', SIGN_CONTRACT: '签署合同',
    EXPIRE: '标记过期', ADMIN_NOTE: '管理员备注'
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
  if (t === 'list') loadLicenses(1)
  if (t === 'logs') loadLogs(1)
}

const loadStats = async () => {
  try {
    const res = await api.get('/admin/copyright-licenses/stats')
    stats.value = res.stats
  } catch (e) {
    console.error(e)
  }
}

const loadLicenses = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 15 })
    if (filterStatus.value !== 'all') params.set('status', filterStatus.value)
    if (filterWorkType.value !== 'all') params.set('workType', filterWorkType.value)
    if (filterLicenseType.value !== 'all') params.set('licenseType', filterLicenseType.value)
    if (keyword.value) params.set('keyword', keyword.value)
    const res = await api.get(`/admin/copyright-licenses/licenses?${params}`)
    licenses.value = res.licenses
    total.value = res.total
    totalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadLogs = async (newPage = 1) => {
  loadingLogs.value = true
  logsPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 20 })
    if (logFilterAction.value !== 'all') params.set('action', logFilterAction.value)
    const res = await api.get(`/admin/copyright-licenses/logs?${params}`)
    logs.value = res.logs
    logsTotalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingLogs.value = false
  }
}

const resetFilters = () => {
  filterStatus.value = 'all'
  filterWorkType.value = 'all'
  filterLicenseType.value = 'all'
  keyword.value = ''
  loadLicenses(1)
}

const viewLicense = async (l) => {
  try {
    const res = await api.get(`/admin/copyright-licenses/licenses/${l.id}`)
    selectedLicense.value = res.license
    currentTab.value = 'detail'
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  }
}

const viewLicenseById = async (id) => {
  try {
    const res = await api.get(`/admin/copyright-licenses/licenses/${id}`)
    selectedLicense.value = res.license
    currentTab.value = 'detail'
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  }
}

const openApproveModal = (l) => {
  selectedLicense.value = l
  approveForm.value = { remark: '', licenseFee: l.licenseFee || 0, contractContent: '', contractFile: '' }
  showApproveModal.value = true
}

const openRejectModal = (l) => {
  selectedLicense.value = l
  rejectForm.value = { reason: '' }
  showRejectModal.value = true
}

const approveLicense = async () => {
  if (!selectedLicense.value) return
  approving.value = true
  try {
    await api.put(`/admin/copyright-licenses/licenses/${selectedLicense.value.id}/approve`, approveForm.value)
    showToast('审批通过', 'success')
    showApproveModal.value = false
    await loadStats()
    if (currentTab.value === 'list') await loadLicenses(page.value)
    else viewLicenseById(selectedLicense.value.id)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    approving.value = false
  }
}

const rejectLicense = async () => {
  if (!selectedLicense.value) return
  if (!rejectForm.value.reason) {
    showToast('请填写拒绝原因', 'warning')
    return
  }
  rejecting.value = true
  try {
    await api.put(`/admin/copyright-licenses/licenses/${selectedLicense.value.id}/reject`, rejectForm.value)
    showToast('已拒绝申请', 'success')
    showRejectModal.value = false
    await loadStats()
    if (currentTab.value === 'list') await loadLicenses(page.value)
    else viewLicenseById(selectedLicense.value.id)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    rejecting.value = false
  }
}

const markExpire = async () => {
  if (!selectedLicense.value) return
  if (!confirm('确定要标记此授权为已过期吗？')) return
  try {
    await api.put(`/admin/copyright-licenses/licenses/${selectedLicense.value.id}/expire`)
    showToast('已标记过期', 'success')
    await loadStats()
    viewLicenseById(selectedLicense.value.id)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const deleteLicense = async () => {
  if (!selectedLicense.value) return
  if (!confirm('确定要删除此授权申请吗？此操作不可恢复。')) return
  try {
    await api.delete(`/admin/copyright-licenses/licenses/${selectedLicense.value.id}`)
    showToast('已删除', 'success')
    currentTab.value = 'list'
    await loadStats()
    await loadLicenses(1)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

onMounted(async () => {
  await loadStats()
  await loadLicenses()
})
</script>

<style scoped>
.cl-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 6px;
  flex-wrap: wrap;
}
.cl-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.cl-tab:hover { color: var(--text-primary); background: var(--bg-tertiary); }
.cl-tab.active { background: var(--accent); color: #fff; }
.tab-icon { font-size: 16px; }

.mb { margin-bottom: 16px; }
.mt { margin-top: 16px; }
.mt-sm { margin-top: 8px; }
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
.required { color: var(--danger); }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  padding: 20px 24px;
  text-align: center;
}
.stat-label { font-size: 13px; color: var(--text-tertiary); margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--text-primary); }
.highlight-warning .stat-value { color: #d48806; }
.highlight-success .stat-value { color: #52c41a; }
.highlight-info .stat-value { color: #1890ff; }

.filter-bar { margin-bottom: 20px; }

.admin-table-wrapper {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  overflow: hidden;
}
.admin-table {
  width: 100%;
  border-collapse: collapse;
}
.admin-table th {
  padding: 14px 16px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-light);
}
.admin-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 14px;
}
.admin-table tbody tr {
  cursor: pointer;
  transition: background 0.2s;
}
.admin-table tbody tr:hover { background: var(--bg-tertiary); }
.admin-table tbody tr:last-child td { border-bottom: none; }

.status-badge {
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}
.status-draft { background: #f5f5f5; color: #8c8c8c; }
.status-author_pending { background: #fff7e6; color: #d48806; }
.status-pending { background: #e6f7ff; color: #1890ff; }
.status-approved { background: #e6fffb; color: #13c2c2; }
.status-active { background: #f6ffed; color: #52c41a; }
.status-rejected { background: #fff1f0; color: #cf1322; }
.status-author_rejected { background: #fff1f0; color: #a8071a; }
.status-cancelled { background: #f5f5f5; color: #8c8c8c; }
.status-expired { background: #fafafa; color: #8c8c8c; }

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 100px;
}

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
  flex-wrap: wrap;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
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

.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.permission-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
}
.permission-item.readonly { opacity: 0.7; }
.permission-item.active { opacity: 1; background: #f6ffed; }
.perm-icon { font-size: 18px; }
.perm-title { font-size: 14px; font-weight: 600; }

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
.log-status { margin-top: 2px; }
.log-detail { margin-top: 4px; }
.log-meta { margin-top: 4px; }

.detail-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  flex-wrap: wrap;
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
  max-height: 90vh;
  overflow-y: auto;
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

.section { margin-bottom: 24px; }
</style>
