<template>
  <div class="container">
    <div class="page-header">
      <div>
        <h1 class="page-title">创作者收益中心</h1>
        <p class="page-subtitle">管理您的创作收益和提现</p>
      </div>
    </div>

    <div class="wallet-overview card mb">
      <div class="wallet-stats">
        <div class="wallet-stat main-stat">
          <div class="stat-label">可提现余额</div>
          <div class="stat-value accent">¥{{ formatMoney(wallet?.balance || 0) }}</div>
          <button class="btn btn-primary btn-sm mt-sm" @click="showWithdrawModal = true">
            💰 立即提现
          </button>
        </div>
        <div class="wallet-stat">
          <div class="stat-label">累计收益</div>
          <div class="stat-value">¥{{ formatMoney(wallet?.totalRevenue || 0) }}</div>
        </div>
        <div class="wallet-stat">
          <div class="stat-label">待审核提现</div>
          <div class="stat-value" style="color: #d48806;">¥{{ formatMoney(wallet?.pendingWithdraw || 0) }}</div>
        </div>
        <div class="wallet-stat">
          <div class="stat-label">已提现总额</div>
          <div class="stat-value" style="color: #52c41a;">¥{{ formatMoney(wallet?.totalWithdrawn || 0) }}</div>
        </div>
      </div>
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

    <div v-if="currentTab === 'records'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in typeFilters"
            :key="f.value"
            :class="['btn', typeFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="typeFilter = f.value; loadRecords(1)"
          >
            {{ f.label }}
          </button>
        </div>
        <div class="search-box" style="width: 200px;">
          <select v-model="periodFilter" class="form-input" @change="loadSummary">
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="year">本年</option>
          </select>
        </div>
      </div>

      <div class="summary-cards mb">
        <div class="summary-card card">
          <div class="summary-label">本期收益</div>
          <div class="summary-value">¥{{ formatMoney(summary.totalEarnings || 0) }}</div>
        </div>
        <div v-for="item in summary.typeBreakdown || []" :key="item.type" class="summary-card card">
          <div class="summary-label">{{ getTypeLabel(item.type) }}</div>
          <div class="summary-value">¥{{ formatMoney(item.amount) }}</div>
          <div class="summary-sub">{{ item.count }} 笔</div>
        </div>
      </div>

      <div v-if="loadingRecords" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="records.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text">暂无收益记录</div>
      </div>
      <div v-else class="record-list card">
        <div v-for="r in records" :key="r.id" class="record-item">
          <div class="record-icon">
            {{ getSourceIcon(r.sourceType) }}
          </div>
          <div class="record-info">
            <div class="record-title">{{ r.sourceTitle || r.description || '收益' }}</div>
            <div class="record-meta">
              <span class="record-type">{{ getTypeLabel(r.type) }}</span>
              <span class="record-date">{{ formatDate(r.createdAt) }}</span>
            </div>
          </div>
          <div class="record-amount">
            <span :class="r.amount >= 0 ? 'amount-positive' : 'amount-negative'">
              {{ r.amount >= 0 ? '+' : '' }}¥{{ formatMoney(r.amount) }}
            </span>
            <span :class="['record-status', getStatusClass(r.status)]">
              {{ getStatusLabel(r.status) }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page === 1" @click="loadRecords(page - 1)">←</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="page === totalPages" @click="loadRecords(page + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'rules'" class="section">
      <div class="rules-header mb">
        <h3 class="section-title">💡 分成规则说明</h3>
        <p class="section-desc">了解平台的收益分配规则，最大化您的创作收益</p>
      </div>

      <div v-if="loadingRules" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="rules.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">暂无分成规则</div>
      </div>
      <div v-else class="rules-grid">
        <div v-for="rule in rules" :key="rule.id" class="rule-card card">
          <div class="rule-header">
            <h4 class="rule-name">{{ rule.name }}</h4>
            <span class="rule-type">{{ getRuleTypeLabel(rule.type) }}</span>
          </div>
          <div class="rule-rate">
            <span class="rate-value">{{ rule.rate * 100 }}%</span>
            <span class="rate-label">分成比例</span>
          </div>
          <div v-if="rule.description" class="rule-desc">{{ rule.description }}</div>
          <div class="rule-details">
            <div v-if="rule.minAmount > 0" class="rule-detail">
              <span>最低收益</span>
              <span>¥{{ formatMoney(rule.minAmount) }}</span>
            </div>
            <div v-if="rule.maxAmount" class="rule-detail">
              <span>最高收益</span>
              <span>¥{{ formatMoney(rule.maxAmount) }}</span>
            </div>
            <div class="rule-detail">
              <span>等级要求</span>
              <span>Lv.{{ rule.level }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'withdrawals'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in withdrawStatusFilters"
            :key="f.value"
            :class="['btn', withdrawStatusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="withdrawStatusFilter = f.value; loadWithdrawals(1)"
          >
            {{ f.label }}
          </button>
        </div>
        <button class="btn btn-primary btn-sm" @click="showWithdrawModal = true">
          + 申请提现
        </button>
      </div>

      <div v-if="loadingWithdrawals" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="withdrawals.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">💳</div>
        <div class="empty-state-text">暂无提现记录</div>
      </div>
      <div v-else class="withdrawal-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>提现单号</th>
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
              <td>¥{{ formatMoney(w.amount) }}</td>
              <td class="text-sm">¥{{ formatMoney(w.fee) }}</td>
              <td class="accent font-medium">¥{{ formatMoney(w.actualAmount) }}</td>
              <td>{{ getWithdrawMethodLabel(w.withdrawMethod) }}</td>
              <td>
                <span :class="['badge', getWithdrawStatusBadgeClass(w.status)]">
                  {{ getWithdrawStatusLabel(w.status) }}
                </span>
              </td>
              <td class="text-sm">{{ formatDate(w.createdAt) }}</td>
              <td>
                <button
                  v-if="w.status === 'PENDING'"
                  class="btn btn-ghost btn-sm danger-btn"
                  @click="cancelWithdrawal(w)"
                >
                  取消
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="withdrawTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="withdrawPage === 1" @click="loadWithdrawals(withdrawPage - 1)">←</button>
        <span class="page-info">第 {{ withdrawPage }} / {{ withdrawTotalPages }} 页</span>
        <button class="page-btn" :disabled="withdrawPage === withdrawTotalPages" @click="loadWithdrawals(withdrawPage + 1)">→</button>
      </div>
    </div>

    <div v-if="showWithdrawModal" class="modal-overlay" @click.self="showWithdrawModal = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">申请提现</h3>
          <button class="btn btn-ghost btn-sm" @click="showWithdrawModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="balance-tip mb">
            <span>可提现余额：</span>
            <span class="accent font-bold">¥{{ formatMoney(wallet?.balance || 0) }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">提现金额</label>
            <div class="amount-input-wrap">
              <input
                v-model.number="withdrawForm.amount"
                type="number"
                class="form-input amount-input"
                placeholder="请输入提现金额"
                min="10"
                step="0.01"
              >
              <button class="btn btn-secondary btn-sm all-btn" @click="withdrawForm.amount = wallet?.balance || 0">
                全部
              </button>
            </div>
            <div class="form-hint">最低提现金额 ¥10，手续费 1%</div>
          </div>

          <div class="form-group">
            <label class="form-label">提现方式</label>
            <div class="method-options">
              <label
                v-for="m in withdrawMethods"
                :key="m.value"
                :class="['method-option', { active: withdrawForm.withdrawMethod === m.value }]"
              >
                <input
                  type="radio"
                  v-model="withdrawForm.withdrawMethod"
                  :value="m.value"
                  style="display: none;"
                >
                <span class="method-icon">{{ m.icon }}</span>
                <span class="method-name">{{ m.label }}</span>
              </label>
            </div>
          </div>

          <div v-if="withdrawForm.withdrawMethod === 'BANK'">
            <div class="form-group">
              <label class="form-label">银行名称</label>
              <input v-model="withdrawForm.bankName" class="form-input" placeholder="例如：招商银行">
            </div>
            <div class="form-group">
              <label class="form-label">银行卡号</label>
              <input v-model="withdrawForm.bankAccount" class="form-input" placeholder="请输入银行卡号">
            </div>
            <div class="form-group">
              <label class="form-label">开户人姓名</label>
              <input v-model="withdrawForm.bankAccountName" class="form-input" placeholder="请输入开户人姓名">
            </div>
          </div>

          <div v-if="withdrawForm.withdrawMethod === 'ALIPAY'" class="form-group">
            <label class="form-label">支付宝账号</label>
            <input v-model="withdrawForm.alipayAccount" class="form-input" placeholder="请输入支付宝账号">
          </div>

          <div v-if="withdrawForm.withdrawMethod === 'WECHAT'" class="form-group">
            <label class="form-label">微信账号</label>
            <input v-model="withdrawForm.wechatAccount" class="form-input" placeholder="请输入微信账号">
          </div>

          <div class="form-group">
            <label class="form-label">备注（选填）</label>
            <textarea v-model="withdrawForm.remark" class="form-textarea" rows="2" placeholder="备注信息"></textarea>
          </div>

          <div v-if="withdrawForm.amount > 0" class="fee-calc card">
            <div class="fee-row">
              <span>提现金额</span>
              <span>¥{{ formatMoney(withdrawForm.amount) }}</span>
            </div>
            <div class="fee-row">
              <span>手续费 (1%)</span>
              <span>-¥{{ formatMoney(calcFee) }}</span>
            </div>
            <div class="fee-row total">
              <span>实到金额</span>
              <span class="accent font-bold">¥{{ formatMoney(calcActualAmount) }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showWithdrawModal = false">取消</button>
          <button class="btn btn-primary" :disabled="submitting" @click="submitWithdrawal">
            {{ submitting ? '提交中...' : '提交申请' }}
          </button>
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
  { label: '收益明细', value: 'records', icon: '📊' },
  { label: '分成规则', value: 'rules', icon: '📋' },
  { label: '提现记录', value: 'withdrawals', icon: '💳' }
]

const typeFilters = [
  { label: '全部', value: 'all' },
  { label: '销售收益', value: 'SALE' },
  { label: '订阅收益', value: 'SUBSCRIPTION' },
  { label: '赞助收益', value: 'DONATION' },
  { label: '其他收益', value: 'OTHER' }
]

const withdrawStatusFilters = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '已取消', value: 'CANCELLED' }
]

const withdrawMethods = [
  { label: '银行卡', value: 'BANK', icon: '🏦' },
  { label: '支付宝', value: 'ALIPAY', icon: '💙' },
  { label: '微信', value: 'WECHAT', icon: '💚' }
]

const currentTab = ref('records')
const wallet = ref(null)

const records = ref([])
const loadingRecords = ref(false)
const page = ref(1)
const totalPages = ref(1)
const typeFilter = ref('all')
const periodFilter = ref('month')
const summary = ref({ totalEarnings: 0, typeBreakdown: [] })

const rules = ref([])
const loadingRules = ref(false)

const withdrawals = ref([])
const loadingWithdrawals = ref(false)
const withdrawPage = ref(1)
const withdrawTotalPages = ref(1)
const withdrawStatusFilter = ref('all')

const showWithdrawModal = ref(false)
const submitting = ref(false)
const withdrawForm = ref({
  amount: 0,
  withdrawMethod: 'ALIPAY',
  bankName: '',
  bankAccount: '',
  bankAccountName: '',
  alipayAccount: '',
  wechatAccount: '',
  remark: ''
})

const calcFee = computed(() => {
  const amount = Number(withdrawForm.value.amount) || 0
  return Math.round(amount * 0.01 * 100) / 100
})

const calcActualAmount = computed(() => {
  const amount = Number(withdrawForm.value.amount) || 0
  return Math.round((amount - calcFee.value) * 100) / 100
})

const formatMoney = (val) => {
  const num = Number(val) || 0
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDate = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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

const getSourceIcon = (type) => {
  const map = {
    ZINE: '📖',
    CROWDFUNDING: '🎯',
    MEMBERSHIP: '⭐',
    SUBSCRIPTION: '📬',
    DONATION: '💝',
    OTHER: '💰'
  }
  return map[type] || '💰'
}

const getStatusLabel = (status) => {
  const map = {
    PENDING: '待结算',
    SETTLED: '已结算',
    CANCELLED: '已取消'
  }
  return map[status] || status
}

const getStatusClass = (status) => {
  const map = {
    PENDING: 'status-pending',
    SETTLED: 'status-settled',
    CANCELLED: 'status-cancelled'
  }
  return map[status] || ''
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

const getWithdrawMethodLabel = (method) => {
  const map = {
    BANK: '银行卡',
    ALIPAY: '支付宝',
    WECHAT: '微信'
  }
  return map[method] || method
}

const getWithdrawStatusLabel = (status) => {
  const map = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已驳回',
    CANCELLED: '已取消',
    PAID: '已打款'
  }
  return map[status] || status
}

const getWithdrawStatusBadgeClass = (status) => {
  const map = {
    PENDING: 'badge-pending',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
    CANCELLED: 'badge-secondary',
    PAID: 'badge-approved'
  }
  return map[status] || 'badge-secondary'
}

const loadWallet = async () => {
  try {
    const res = await api.get('/revenue/wallet')
    wallet.value = res.wallet
  } catch (e) {
    console.error(e)
  }
}

const loadRecords = async (p = 1) => {
  loadingRecords.value = true
  try {
    const params = new URLSearchParams({
      page: p,
      limit: 20,
      type: typeFilter.value
    })
    const res = await api.get(`/revenue/records?${params}`)
    records.value = res.records
    page.value = res.page
    totalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingRecords.value = false
  }
}

const loadSummary = async () => {
  try {
    const res = await api.get(`/revenue/records/summary?period=${periodFilter.value}`)
    summary.value = res
  } catch (e) {
    console.error(e)
  }
}

const loadRules = async () => {
  loadingRules.value = true
  try {
    const res = await api.get('/revenue/rules')
    rules.value = res.rules
  } catch (e) {
    console.error(e)
  } finally {
    loadingRules.value = false
  }
}

const loadWithdrawals = async (p = 1) => {
  loadingWithdrawals.value = true
  try {
    const params = new URLSearchParams({
      page: p,
      limit: 20,
      status: withdrawStatusFilter.value
    })
    const res = await api.get(`/withdrawals?${params}`)
    withdrawals.value = res.withdrawals
    withdrawPage.value = res.page
    withdrawTotalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingWithdrawals.value = false
  }
}

const switchTab = (tab) => {
  currentTab.value = tab
  if (tab === 'records') {
    loadRecords()
    loadSummary()
  } else if (tab === 'rules') {
    loadRules()
  } else if (tab === 'withdrawals') {
    loadWithdrawals()
  }
}

const submitWithdrawal = async () => {
  const form = withdrawForm.value
  if (!form.amount || form.amount <= 0) {
    showToast('请输入提现金额', 'warning')
    return
  }
  if (form.amount < 10) {
    showToast('最低提现金额为 ¥10', 'warning')
    return
  }
  if (form.amount > (wallet.value?.balance || 0)) {
    showToast('余额不足', 'warning')
    return
  }

  submitting.value = true
  try {
    await api.post('/withdrawals', form)
    showToast('提现申请已提交', 'success')
    showWithdrawModal.value = false
    loadWallet()
    loadWithdrawals()
  } catch (e) {
    showToast(e.error || '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}

const cancelWithdrawal = async (w) => {
  if (!confirm('确定要取消这笔提现申请吗？')) return
  try {
    await api.post(`/withdrawals/${w.id}/cancel`)
    showToast('已取消提现申请', 'success')
    loadWallet()
    loadWithdrawals()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

onMounted(() => {
  loadWallet()
  loadRecords()
  loadSummary()
})
</script>

<style scoped>
.wallet-overview {
  padding: 24px;
  margin-bottom: 20px;
}

.wallet-stats {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 24px;
  align-items: center;
}

.wallet-stat {
  text-align: center;
  padding: 8px;
}

.wallet-stat.main-stat {
  text-align: left;
  border-right: 1px solid var(--border-light);
  padding-right: 24px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  font-family: 'Times New Roman', serif;
}

.mt-sm { margin-top: 12px; }

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  padding: 16px;
  text-align: center;
}

.summary-label {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}

.summary-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--accent);
  font-family: 'Times New Roman', serif;
}

.summary-sub {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.record-list {
  overflow: hidden;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.15s;
}

.record-item:last-child {
  border-bottom: none;
}

.record-item:hover {
  background: var(--bg-tertiary);
}

.record-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.record-info {
  flex: 1;
  min-width: 0;
}

.record-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.record-meta {
  display: flex;
  gap: 10px;
  align-items: center;
}

.record-type {
  font-size: 12px;
  color: var(--accent);
  background: var(--accent-light);
  padding: 2px 8px;
  border-radius: 4px;
}

.record-date {
  font-size: 12px;
  color: var(--text-tertiary);
}

.record-amount {
  text-align: right;
  flex-shrink: 0;
}

.amount-positive {
  color: #52c41a;
  font-weight: 600;
  font-size: 16px;
  font-family: 'Times New Roman', serif;
}

.amount-negative {
  color: #f5222d;
  font-weight: 600;
  font-size: 16px;
  font-family: 'Times New Roman', serif;
}

.record-status {
  display: block;
  font-size: 11px;
  margin-top: 4px;
}

.status-pending { color: #d48806; }
.status-settled { color: #52c41a; }
.status-cancelled { color: var(--text-tertiary); }

.rules-header {
  text-align: center;
  padding: 16px 0;
}

.section-title {
  font-size: 20px;
  margin-bottom: 8px;
}

.section-desc {
  color: var(--text-tertiary);
  font-size: 13px;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.rule-card {
  padding: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.rule-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.rule-name {
  font-size: 16px;
  font-weight: 600;
}

.rule-type {
  font-size: 11px;
  padding: 3px 10px;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 12px;
}

.rule-rate {
  text-align: center;
  margin-bottom: 16px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.rate-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
  font-family: 'Times New Roman', serif;
  display: block;
}

.rate-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.rule-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  line-height: 1.6;
}

.rule-details {
  border-top: 1px solid var(--border-light);
  padding-top: 12px;
}

.rule-detail {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.rule-detail:last-child {
  margin-bottom: 0;
}

.balance-tip {
  padding: 12px 16px;
  background: var(--accent-light);
  border-radius: 8px;
  font-size: 14px;
}

.amount-input-wrap {
  position: relative;
  display: flex;
  gap: 8px;
}

.amount-input {
  flex: 1;
  font-size: 18px;
  font-family: 'Times New Roman', serif;
}

.all-btn {
  white-space: nowrap;
}

.form-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 6px;
}

.method-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.method-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px;
  border: 2px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.method-option:hover {
  border-color: var(--accent-light);
}

.method-option.active {
  border-color: var(--accent);
  background: var(--accent-light);
}

.method-icon {
  font-size: 24px;
}

.method-name {
  font-size: 13px;
}

.fee-calc {
  padding: 16px;
  background: var(--bg-tertiary);
}

.fee-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 8px;
}

.fee-row:last-child {
  margin-bottom: 0;
}

.fee-row.total {
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid var(--border-light);
  font-size: 15px;
}

.mb { margin-bottom: 16px; }

@media (max-width: 768px) {
  .wallet-stats {
    grid-template-columns: 1fr 1fr;
  }
  .wallet-stat.main-stat {
    grid-column: 1 / -1;
    border-right: none;
    border-bottom: 1px solid var(--border-light);
    padding-right: 0;
    padding-bottom: 16px;
    text-align: center;
  }
  .method-options {
    grid-template-columns: 1fr;
  }
}
</style>
