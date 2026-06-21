<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">财务管理</h1>
      <p class="page-subtitle">收益统计、提现审核与分成规则管理</p>
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
        <span v-if="t.value === 'withdrawals' && stats.pendingCount > 0" class="tab-badge">
          {{ stats.pendingCount }}
        </span>
      </button>
    </div>

    <div v-if="currentTab === 'overview'" class="section">
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-value">¥{{ formatMoney(stats.totalRevenue) }}</div>
            <div class="stat-label">平台总收益</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">💸</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #52c41a;">¥{{ formatMoney(stats.totalWithdrawn) }}</div>
            <div class="stat-label">已提现总额</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #d48806;">¥{{ formatMoney(stats.pendingAmount) }}</div>
            <div class="stat-label">待审核提现</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">👤</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.creatorCount }}</div>
            <div class="stat-label">创作者数量</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'withdrawals'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            :class="['btn', statusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="statusFilter = f.value; loadWithdrawals(1)"
          >
            {{ f.label }}
            <span v-if="f.value === 'PENDING' && stats.pendingCount > 0" class="tab-badge-sm">
              {{ stats.pendingCount }}
            </span>
          </button>
        </div>
        <div class="search-box" style="width: 280px;">
          <input
            v-model="searchKeyword"
            type="text"
            class="form-input"
            placeholder="搜索单号/用户名..."
            @input="debouncedSearch"
          >
        </div>
      </div>

      <div v-if="loadingWithdrawals" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="withdrawals.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">💳</div>
        <div class="empty-state-text">暂无提现申请</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>提现单号</th>
              <th>申请人</th>
              <th>提现金额</th>
              <th>手续费</th>
              <th>实到金额</th>
              <th>提现方式</th>
              <th>状态</th>
              <th>申请时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in withdrawals" :key="w.id">
              <td class="font-mono text-sm">{{ w.withdrawNo }}</td>
              <td>
                <div class="user-cell">
                  <img v-if="w.user?.avatar" :src="w.user.avatar" class="user-avatar-sm">
                  <span class="user-name">{{ w.user?.username }}</span>
                </div>
              </td>
              <td>¥{{ formatMoney(w.amount) }}</td>
              <td class="text-sm">¥{{ formatMoney(w.fee) }}</td>
              <td class="accent font-medium">¥{{ formatMoney(w.actualAmount) }}</td>
              <td>{{ getWithdrawMethodLabel(w.withdrawMethod) }}</td>
              <td>
                <span :class="['badge', getStatusBadgeClass(w.status)]">
                  {{ getStatusLabel(w.status) }}
                </span>
              </td>
              <td class="text-sm">{{ formatDate(w.createdAt) }}</td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="viewWithdrawal(w)">详情</button>
                <button
                  v-if="w.status === 'PENDING'"
                  class="btn btn-primary btn-sm"
                  @click="approveWithdrawal(w)"
                >
                  ✅ 通过
                </button>
                <button
                  v-if="w.status === 'PENDING'"
                  class="btn btn-secondary btn-sm"
                  @click="rejectWithdrawal(w)"
                >
                  ❌ 驳回
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page === 1" @click="loadWithdrawals(page - 1)">←</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="page === totalPages" @click="loadWithdrawals(page + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'rules'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in ruleTypeFilters"
            :key="f.value"
            :class="['btn', ruleTypeFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="ruleTypeFilter = f.value; loadRules(1)"
          >
            {{ f.label }}
          </button>
        </div>
        <button class="btn btn-primary btn-sm" @click="openRuleModal()">+ 新增规则</button>
      </div>

      <div v-if="loadingRules" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="rules.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">暂无分成规则</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>规则名称</th>
              <th>类型</th>
              <th>分成比例</th>
              <th>最低金额</th>
              <th>最高金额</th>
              <th>等级要求</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rules" :key="r.id">
              <td class="font-medium">{{ r.name }}</td>
              <td><span class="tag">{{ getRuleTypeLabel(r.type) }}</span></td>
              <td class="accent font-medium">{{ (r.rate * 100).toFixed(0) }}%</td>
              <td>¥{{ formatMoney(r.minAmount) }}</td>
              <td>{{ r.maxAmount ? '¥' + formatMoney(r.maxAmount) : '不限' }}</td>
              <td>Lv.{{ r.level }}</td>
              <td>
                <span :class="['badge', r.isActive ? 'badge-approved' : 'badge-secondary']">
                  {{ r.isActive ? '启用' : '禁用' }}
                </span>
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openRuleModal(r)">编辑</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteRule(r)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="ruleTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="rulePage === 1" @click="loadRules(rulePage - 1)">←</button>
        <span class="page-info">第 {{ rulePage }} / {{ ruleTotalPages }} 页</span>
        <button class="page-btn" :disabled="rulePage === ruleTotalPages" @click="loadRules(rulePage + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'records'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in recordTypeFilters"
            :key="f.value"
            :class="['btn', recordTypeFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="recordTypeFilter = f.value; loadRecords(1)"
          >
            {{ f.label }}
          </button>
        </div>
        <div class="search-box" style="width: 280px;">
          <input
            v-model="recordSearch"
            type="text"
            class="form-input"
            placeholder="搜索用户名/来源..."
            @input="debouncedRecordSearch"
          >
        </div>
      </div>

      <div v-if="loadingRecords" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="records.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text">暂无收益记录</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>收益类型</th>
              <th>来源</th>
              <th>金额</th>
              <th>状态</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="r.id">
              <td>
                <div class="user-cell">
                  <img v-if="r.user?.avatar" :src="r.user.avatar" class="user-avatar-sm">
                  <span class="user-name">{{ r.user?.username }}</span>
                </div>
              </td>
              <td><span class="tag">{{ getTypeLabel(r.type) }}</span></td>
              <td class="text-sm">{{ r.sourceTitle || '-' }}</td>
              <td :class="r.amount >= 0 ? 'amount-positive' : 'amount-negative'" class="font-medium">
                {{ r.amount >= 0 ? '+' : '' }}¥{{ formatMoney(r.amount) }}
              </td>
              <td>
                <span :class="['badge', getRecordStatusBadgeClass(r.status)]">
                  {{ getRecordStatusLabel(r.status) }}
                </span>
              </td>
              <td class="text-sm">{{ formatDate(r.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="stats-footer card">
        <span>当前筛选结果合计：</span>
        <span class="accent font-bold">¥{{ formatMoney(totalAmount) }}</span>
        <span class="text-tertiary">（共 {{ recordTotal }} 条记录）</span>
      </div>

      <div v-if="recordTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="recordPage === 1" @click="loadRecords(recordPage - 1)">←</button>
        <span class="page-info">第 {{ recordPage }} / {{ recordTotalPages }} 页</span>
        <button class="page-btn" :disabled="recordPage === recordTotalPages" @click="loadRecords(recordPage + 1)">→</button>
      </div>
    </div>

    <div v-if="showWithdrawDetail" class="modal-overlay" @click.self="showWithdrawDetail = false">
      <div class="modal card" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="font-semibold">提现详情</h3>
          <button class="btn btn-ghost btn-sm" @click="showWithdrawDetail = false">✕</button>
        </div>
        <div v-if="selectedWithdrawal" class="modal-body">
          <div class="detail-section">
            <div class="detail-row">
              <span class="detail-label">提现单号</span>
              <span class="detail-value font-mono">{{ selectedWithdrawal.withdrawNo }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">申请人</span>
              <span class="detail-value">{{ selectedWithdrawal.user?.username }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">提现金额</span>
              <span class="detail-value">¥{{ formatMoney(selectedWithdrawal.amount) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">手续费</span>
              <span class="detail-value">¥{{ formatMoney(selectedWithdrawal.fee) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">实到金额</span>
              <span class="detail-value accent font-bold">¥{{ formatMoney(selectedWithdrawal.actualAmount) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">提现方式</span>
              <span class="detail-value">{{ getWithdrawMethodLabel(selectedWithdrawal.withdrawMethod) }}</span>
            </div>
            <div v-if="selectedWithdrawal.withdrawMethod === 'BANK'">
              <div class="detail-row">
                <span class="detail-label">银行名称</span>
                <span class="detail-value">{{ selectedWithdrawal.bankName }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">银行卡号</span>
                <span class="detail-value font-mono">{{ selectedWithdrawal.bankAccount }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">开户人</span>
                <span class="detail-value">{{ selectedWithdrawal.bankAccountName }}</span>
              </div>
            </div>
            <div v-if="selectedWithdrawal.withdrawMethod === 'ALIPAY'" class="detail-row">
              <span class="detail-label">支付宝账号</span>
              <span class="detail-value">{{ selectedWithdrawal.alipayAccount }}</span>
            </div>
            <div v-if="selectedWithdrawal.withdrawMethod === 'WECHAT'" class="detail-row">
              <span class="detail-label">微信账号</span>
              <span class="detail-value">{{ selectedWithdrawal.wechatAccount }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">状态</span>
              <span :class="['badge', getStatusBadgeClass(selectedWithdrawal.status)]">
                {{ getStatusLabel(selectedWithdrawal.status) }}
              </span>
            </div>
            <div v-if="selectedWithdrawal.rejectionReason" class="detail-row">
              <span class="detail-label">驳回原因</span>
              <span class="detail-value" style="color: #f5222d;">{{ selectedWithdrawal.rejectionReason }}</span>
            </div>
            <div v-if="selectedWithdrawal.remark" class="detail-row">
              <span class="detail-label">备注</span>
              <span class="detail-value">{{ selectedWithdrawal.remark }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">申请时间</span>
              <span class="detail-value">{{ formatDate(selectedWithdrawal.createdAt) }}</span>
            </div>
            <div v-if="selectedWithdrawal.reviewedAt" class="detail-row">
              <span class="detail-label">审核时间</span>
              <span class="detail-value">{{ formatDate(selectedWithdrawal.reviewedAt) }}</span>
            </div>
          </div>

          <div v-if="selectedWithdrawal.auditLogs?.length > 0" class="audit-trail">
            <h4 class="audit-title">审核记录</h4>
            <div v-for="log in selectedWithdrawal.auditLogs" :key="log.id" class="audit-item">
              <div class="audit-dot"></div>
              <div class="audit-content">
                <div class="audit-action">{{ getAuditActionLabel(log.action) }}</div>
                <div class="audit-meta">
                  <span>{{ log.operator?.username }}</span>
                  <span>{{ formatDate(log.createdAt) }}</span>
                </div>
                <div v-if="log.remark" class="audit-remark">{{ log.remark }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showWithdrawDetail = false">关闭</button>
          <button
            v-if="selectedWithdrawal?.status === 'PENDING'"
            class="btn btn-primary"
            @click="approveWithdrawal(selectedWithdrawal)"
          >
            ✅ 通过
          </button>
          <button
            v-if="selectedWithdrawal?.status === 'PENDING'"
            class="btn btn-secondary"
            @click="rejectWithdrawal(selectedWithdrawal)"
          >
            ❌ 驳回
          </button>
        </div>
      </div>
    </div>

    <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
      <div class="modal card" style="max-width: 440px;">
        <div class="modal-header">
          <h3 class="font-semibold">驳回提现申请</h3>
          <button class="btn btn-ghost btn-sm" @click="showRejectModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">驳回原因</label>
            <textarea v-model="rejectReason" class="form-textarea" rows="4" placeholder="请输入驳回原因" required></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showRejectModal = false">取消</button>
          <button class="btn btn-primary danger-btn" :disabled="submitting" @click="confirmReject">
            {{ submitting ? '提交中...' : '确认驳回' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showRuleModal" class="modal-overlay" @click.self="showRuleModal = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingRule ? '编辑分成规则' : '新增分成规则' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showRuleModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">规则名称</label>
            <input v-model="ruleForm.name" class="form-input" placeholder="请输入规则名称">
          </div>
          <div class="form-group">
            <label class="form-label">规则编码</label>
            <input v-model="ruleForm.code" class="form-input" placeholder="例如：ZINE_SALE_BASIC">
          </div>
          <div class="form-group">
            <label class="form-label">类型</label>
            <select v-model="ruleForm.type" class="form-input">
              <option value="ZINE_SALE">杂志销售</option>
              <option value="CROWDFUNDING">众筹分成</option>
              <option value="MEMBERSHIP">会员分成</option>
              <option value="SUBSCRIPTION">订阅分成</option>
              <option value="DONATION">打赏分成</option>
              <option value="OTHER">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">分成比例 (%)</label>
            <input v-model.number="ruleForm.rate" type="number" class="form-input" step="0.01" min="0" max="1">
            <div class="form-hint">输入小数，例如 0.7 表示 70%</div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">最低收益金额</label>
              <input v-model.number="ruleForm.minAmount" type="number" class="form-input" step="0.01" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">最高收益金额</label>
              <input v-model.number="ruleForm.maxAmount" type="number" class="form-input" step="0.01" min="0" placeholder="不限">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">等级要求</label>
              <input v-model.number="ruleForm.level" type="number" class="form-input" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">排序</label>
              <input v-model.number="ruleForm.sortOrder" type="number" class="form-input">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="ruleForm.description" class="form-textarea" rows="3" placeholder="规则描述"></textarea>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="ruleForm.isActive">
              <span>启用此规则</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showRuleModal = false">取消</button>
          <button class="btn btn-primary" :disabled="submitting" @click="saveRule">
            {{ submitting ? '保存中...' : '保存' }}
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

const tabs = [
  { label: '数据概览', value: 'overview', icon: '📊' },
  { label: '提现审核', value: 'withdrawals', icon: '💳' },
  { label: '分成规则', value: 'rules', icon: '📋' },
  { label: '收益记录', value: 'records', icon: '💰' }
]

const statusFilters = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '已取消', value: 'CANCELLED' }
]

const ruleTypeFilters = [
  { label: '全部', value: 'all' },
  { label: '杂志销售', value: 'ZINE_SALE' },
  { label: '众筹分成', value: 'CROWDFUNDING' },
  { label: '会员分成', value: 'MEMBERSHIP' },
  { label: '订阅分成', value: 'SUBSCRIPTION' },
  { label: '打赏分成', value: 'DONATION' }
]

const recordTypeFilters = [
  { label: '全部', value: 'all' },
  { label: '销售收益', value: 'SALE' },
  { label: '订阅收益', value: 'SUBSCRIPTION' },
  { label: '赞助收益', value: 'DONATION' },
  { label: '提现', value: 'WITHDRAW' },
  { label: '退款', value: 'REFUND' }
]

const currentTab = ref('overview')
const stats = ref({
  totalRevenue: 0,
  totalWithdrawn: 0,
  pendingAmount: 0,
  pendingCount: 0,
  creatorCount: 0
})

const withdrawals = ref([])
const loadingWithdrawals = ref(false)
const page = ref(1)
const totalPages = ref(1)
const statusFilter = ref('all')
const searchKeyword = ref('')

const rules = ref([])
const loadingRules = ref(false)
const rulePage = ref(1)
const ruleTotalPages = ref(1)
const ruleTypeFilter = ref('all')

const records = ref([])
const loadingRecords = ref(false)
const recordPage = ref(1)
const recordTotalPages = ref(1)
const recordTotal = ref(0)
const totalAmount = ref(0)
const recordTypeFilter = ref('all')
const recordSearch = ref('')

const showWithdrawDetail = ref(false)
const selectedWithdrawal = ref(null)

const showRejectModal = ref(false)
const rejectTarget = ref(null)
const rejectReason = ref('')

const showRuleModal = ref(false)
const editingRule = ref(null)
const ruleForm = ref({
  name: '',
  code: '',
  type: 'ZINE_SALE',
  rate: 0.7,
  minAmount: 0,
  maxAmount: null,
  level: 1,
  sortOrder: 0,
  description: '',
  isActive: true
})

const submitting = ref(false)

let searchTimer = null
let recordSearchTimer = null

const formatMoney = (val) => {
  const num = Number(val) || 0
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDate = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const getStatusLabel = (status) => {
  const map = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已驳回',
    CANCELLED: '已取消',
    PAID: '已打款'
  }
  return map[status] || status
}

const getStatusBadgeClass = (status) => {
  const map = {
    PENDING: 'badge-pending',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
    CANCELLED: 'badge-secondary',
    PAID: 'badge-approved'
  }
  return map[status] || 'badge-secondary'
}

const getWithdrawMethodLabel = (method) => {
  const map = {
    BANK: '银行卡',
    ALIPAY: '支付宝',
    WECHAT: '微信'
  }
  return map[method] || method
}

const getRuleTypeLabel = (type) => {
  const map = {
    ZINE_SALE: '杂志销售',
    CROWDFUNDING: '众筹分成',
    MEMBERSHIP: '会员分成',
    SUBSCRIPTION: '订阅分成',
    DONATION: '打赏分成',
    OTHER: '其他'
  }
  return map[type] || type
}

const getTypeLabel = (type) => {
  const map = {
    SALE: '销售收益',
    SUBSCRIPTION: '订阅收益',
    DONATION: '赞助收益',
    WITHDRAW: '提现',
    REFUND: '退款',
    OTHER: '其他'
  }
  return map[type] || type
}

const getRecordStatusLabel = (status) => {
  const map = {
    PENDING: '待结算',
    SETTLED: '已结算',
    CANCELLED: '已取消'
  }
  return map[status] || status
}

const getRecordStatusBadgeClass = (status) => {
  const map = {
    PENDING: 'badge-pending',
    SETTLED: 'badge-approved',
    CANCELLED: 'badge-secondary'
  }
  return map[status] || 'badge-secondary'
}

const getAuditActionLabel = (action) => {
  const map = {
    SUBMIT: '提交申请',
    APPROVE: '审核通过',
    REJECT: '审核驳回',
    CANCEL: '取消申请',
    PAID: '已打款'
  }
  return map[action] || action
}

const loadStats = async () => {
  try {
    const res = await api.get('/admin/finance/overview')
    stats.value = res.stats
  } catch (e) {
    console.error(e)
  }
}

const loadWithdrawals = async (p = 1) => {
  loadingWithdrawals.value = true
  try {
    const params = new URLSearchParams({
      page: p,
      limit: 20,
      status: statusFilter.value
    })
    if (searchKeyword.value) params.set('keyword', searchKeyword.value)
    const res = await api.get(`/admin/finance/withdrawals?${params}`)
    withdrawals.value = res.withdrawals
    page.value = res.page
    totalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingWithdrawals.value = false
  }
}

const loadRules = async (p = 1) => {
  loadingRules.value = true
  try {
    const params = new URLSearchParams({
      page: p,
      limit: 20,
      type: ruleTypeFilter.value
    })
    const res = await api.get(`/admin/finance/revenue-rules?${params}`)
    rules.value = res.rules
    rulePage.value = res.page
    ruleTotalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingRules.value = false
  }
}

const loadRecords = async (p = 1) => {
  loadingRecords.value = true
  try {
    const params = new URLSearchParams({
      page: p,
      limit: 20,
      type: recordTypeFilter.value
    })
    if (recordSearch.value) params.set('keyword', recordSearch.value)
    const res = await api.get(`/admin/finance/revenue-records?${params}`)
    records.value = res.records
    recordPage.value = res.page
    recordTotalPages.value = res.totalPages
    recordTotal.value = res.total
    totalAmount.value = res.totalAmount
  } catch (e) {
    console.error(e)
  } finally {
    loadingRecords.value = false
  }
}

const switchTab = (tab) => {
  currentTab.value = tab
  if (tab === 'overview') {
    loadStats()
  } else if (tab === 'withdrawals') {
    loadWithdrawals()
  } else if (tab === 'rules') {
    loadRules()
  } else if (tab === 'records') {
    loadRecords()
  }
}

const viewWithdrawal = async (w) => {
  try {
    const res = await api.get(`/admin/finance/withdrawals/${w.id}`)
    selectedWithdrawal.value = res.withdrawal
    showWithdrawDetail.value = true
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  }
}

const approveWithdrawal = async (w) => {
  if (!confirm(`确定要通过这笔 ¥${formatMoney(w.amount)} 的提现申请吗？`)) return
  try {
    await api.post(`/admin/finance/withdrawals/${w.id}/approve`, {
      remark: '审核通过'
    })
    showToast('审核通过', 'success')
    showWithdrawDetail.value = false
    loadStats()
    loadWithdrawals()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const rejectWithdrawal = (w) => {
  rejectTarget.value = w
  rejectReason.value = ''
  showRejectModal.value = true
  showWithdrawDetail.value = false
}

const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    showToast('请填写驳回原因', 'warning')
    return
  }
  submitting.value = true
  try {
    await api.post(`/admin/finance/withdrawals/${rejectTarget.value.id}/reject`, {
      rejectionReason: rejectReason.value
    })
    showToast('已驳回', 'success')
    showRejectModal.value = false
    loadStats()
    loadWithdrawals()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const openRuleModal = (rule = null) => {
  editingRule.value = rule
  if (rule) {
    ruleForm.value = { ...rule }
  } else {
    ruleForm.value = {
      name: '',
      code: '',
      type: 'ZINE_SALE',
      rate: 0.7,
      minAmount: 0,
      maxAmount: null,
      level: 1,
      sortOrder: 0,
      description: '',
      isActive: true
    }
  }
  showRuleModal.value = true
}

const saveRule = async () => {
  if (!ruleForm.value.name) {
    showToast('请输入规则名称', 'warning')
    return
  }
  if (!ruleForm.value.code) {
    showToast('请输入规则编码', 'warning')
    return
  }
  submitting.value = true
  try {
    if (editingRule.value) {
      await api.put(`/admin/finance/revenue-rules/${editingRule.value.id}`, ruleForm.value)
      showToast('规则已更新', 'success')
    } else {
      await api.post('/admin/finance/revenue-rules', ruleForm.value)
      showToast('规则已创建', 'success')
    }
    showRuleModal.value = false
    loadRules()
  } catch (e) {
    showToast(e.error || '保存失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteRule = async (rule) => {
  if (!confirm(`确定要删除分成规则"${rule.name}"吗？`)) return
  try {
    await api.delete(`/admin/finance/revenue-rules/${rule.id}`)
    showToast('已删除', 'success')
    loadRules()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadWithdrawals(1)
  }, 500)
}

const debouncedRecordSearch = () => {
  clearTimeout(recordSearchTimer)
  recordSearchTimer = setTimeout(() => {
    loadRecords(1)
  }, 500)
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.user-name {
  font-size: 13px;
}

.stats-footer {
  margin-top: 16px;
  padding: 14px 20px;
  text-align: right;
  font-size: 14px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-light);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  color: var(--text-tertiary);
  font-size: 13px;
}

.detail-value {
  font-size: 13px;
  color: var(--text-primary);
}

.audit-trail {
  border-top: 1px solid var(--border-light);
  padding-top: 16px;
}

.audit-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.audit-item {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  position: relative;
}

.audit-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 5px;
  flex-shrink: 0;
}

.audit-content {
  flex: 1;
}

.audit-action {
  font-weight: 500;
  font-size: 13px;
  margin-bottom: 4px;
}

.audit-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.audit-remark {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 8px 12px;
  border-radius: 6px;
  margin-top: 6px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.amount-positive {
  color: #52c41a;
}

.amount-negative {
  color: #f5222d;
}

.mb { margin-bottom: 16px; }
</style>
