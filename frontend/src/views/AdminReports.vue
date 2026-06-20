<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">举报与申诉管理</h1>
      <p class="page-subtitle">审核举报、处理申诉、查看操作日志</p>
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
        <span v-if="t.value === 'reports' && stats.pendingReports > 0" class="tab-badge">{{ stats.pendingReports }}</span>
        <span v-if="t.value === 'appeals' && stats.pendingAppeals > 0" class="tab-badge">{{ stats.pendingAppeals }}</span>
      </button>
    </div>

    <div v-if="currentTab === 'overview'" class="section">
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalReports }}</div>
            <div class="stat-label">举报总数</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #d48806;">{{ stats.pendingReports }}</div>
            <div class="stat-label">待处理举报</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">🔥</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #cf1322;">{{ stats.highPriorityReports }}</div>
            <div class="stat-label">高优先级</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.resolvedReports + stats.penalizedReports }}</div>
            <div class="stat-label">已处理</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">🔄</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #722ed1;">{{ stats.appealingReports }}</div>
            <div class="stat-label">申诉中</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">📭</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #d48806;">{{ stats.pendingAppeals }}</div>
            <div class="stat-label">待处理申诉</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">📅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayReports }}</div>
            <div class="stat-label">今日新增举报</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">❌</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #8c8c8c;">{{ stats.dismissedReports }}</div>
            <div class="stat-label">已驳回举报</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'reports'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm" style="flex-wrap: wrap;">
          <button
            v-for="f in reportStatusFilters"
            :key="f.value"
            :class="['btn', reportFilterStatus === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="reportFilterStatus = f.value; loadReports(1)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
        <select v-model="reportFilterType" class="form-select" style="width: auto; padding: 6px 12px; font-size: 13px;" @change="loadReports(1)">
          <option value="all">全部类型</option>
          <option v-for="t in reportTypes" :key="t.value" :value="t.value">{{ t.icon }} {{ t.label }}</option>
        </select>
        <select v-model="reportFilterPriority" class="form-select" style="width: auto; padding: 6px 12px; font-size: 13px;" @change="loadReports(1)">
          <option value="all">全部优先级</option>
          <option value="URGENT">紧急</option>
          <option value="HIGH">高</option>
          <option value="NORMAL">普通</option>
          <option value="LOW">低</option>
        </select>
        <select v-model="reportFilterLevel" class="form-select" style="width: auto; padding: 6px 12px; font-size: 13px;" @change="loadReports(1)">
          <option value="all">全部处理级别</option>
          <option value="LEVEL_1">一级审核</option>
          <option value="LEVEL_2">二级审核</option>
          <option value="LEVEL_3">三级审核</option>
        </select>
        <input
          v-model="reportKeyword"
          type="text"
          class="form-input"
          style="width: 200px; padding: 6px 12px; font-size: 13px;"
          placeholder="搜索举报内容..."
          @input="debouncedReportSearch"
        >
      </div>

      <div v-if="loadingReports" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="reports.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">暂无举报记录</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>类型</th>
              <th>举报原因</th>
              <th>目标</th>
              <th>举报者</th>
              <th>优先级</th>
              <th>处理级别</th>
              <th>状态</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in reports" :key="r.id">
              <td class="text-sm">#{{ r.id }}</td>
              <td><span class="tag">{{ typeLabel(r.type) }}</span></td>
              <td class="font-medium" style="max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ r.reason }}</td>
              <td class="text-sm">{{ targetLabel(r.targetType) }} #{{ r.targetId }}</td>
              <td class="text-sm">{{ r.reporter?.username }}</td>
              <td>
                <select
                  :value="r.priority"
                  class="form-select"
                  style="width: auto; padding: 2px 8px; font-size: 11px;"
                  @change="changePriority(r, $event.target.value)"
                >
                  <option value="LOW">低</option>
                  <option value="NORMAL">普通</option>
                  <option value="HIGH">高</option>
                  <option value="URGENT">紧急</option>
                </select>
              </td>
              <td><span class="tag">{{ levelLabel(r.handlerLevel) }}</span></td>
              <td>
                <span :class="['badge', statusBadgeClass(r.status)]">{{ statusLabel(r.status) }}</span>
              </td>
              <td class="text-xs text-muted">{{ formatDate(r.createdAt) }}</td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-ghost btn-sm" @click="viewReportDetail(r)">详情</button>
                  <button v-if="r.status === 'PENDING' || r.status === 'PROCESSING'" class="btn btn-primary btn-sm" @click="openHandleModal(r, 'RESOLVE')">✅ 处理</button>
                  <button v-if="r.status === 'PENDING' || r.status === 'PROCESSING'" class="btn btn-secondary btn-sm" @click="openHandleModal(r, 'PENALIZE')">⚠️ 处罚</button>
                  <button v-if="r.status === 'PENDING' || r.status === 'PROCESSING'" class="btn btn-ghost btn-sm" @click="openHandleModal(r, 'DISMISS')">❌ 驳回</button>
                  <button v-if="r.status === 'PENDING' || r.status === 'PROCESSING'" class="btn btn-ghost btn-sm" @click="escalateReport(r)">⬆ 升级</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="reportTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="reportPage === 1" @click="loadReports(reportPage - 1)">←</button>
        <span class="page-info">第 {{ reportPage }} / {{ reportTotalPages }} 页</span>
        <button class="page-btn" :disabled="reportPage === reportTotalPages" @click="loadReports(reportPage + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'appeals'" class="section">
      <div class="filter-tabs flex gap-sm mb">
        <button
          v-for="f in appealStatusFilters"
          :key="f.value"
          :class="['btn', appealFilterStatus === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
          @click="appealFilterStatus = f.value; loadAppeals(1)"
        >
          {{ f.label }}
        </button>
      </div>

      <div v-if="loadingAppeals" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="appeals.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">🔄</div>
        <div class="empty-state-text">暂无申诉记录</div>
      </div>
      <div v-else class="appeal-list">
        <div v-for="a in appeals" :key="a.id" class="appeal-card card">
          <div class="ap-header">
            <div class="ap-header-left">
              <span :class="['status-badge', `status-${a.status.toLowerCase()}`]">{{ appealStatusLabel(a.status) }}</span>
              <span class="text-sm text-muted">申诉 #{{ a.id }}</span>
            </div>
            <span class="text-sm text-muted">{{ formatDateTime(a.createdAt) }}</span>
          </div>
          <div class="ap-body">
            <div class="ap-user">
              <img :src="a.appellant?.avatar" class="ap-avatar">
              <div>
                <div class="font-medium">{{ a.appellant?.username }}</div>
                <div class="text-xs text-muted">{{ a.appellant?.email }}</div>
              </div>
            </div>
            <div class="ap-reason font-medium">{{ a.reason }}</div>
            <div class="ap-report-ref text-sm text-muted">
              关联举报 #{{ a.report?.id }}：{{ a.report?.reason }}
              <span v-if="a.report?.penaltyType">· 处罚：{{ penaltyLabel(a.report.penaltyType) }}</span>
            </div>
          </div>
          <div v-if="a.handleNote" class="ap-handle-note">
            处理说明：{{ a.handleNote }}
          </div>
          <div class="ap-footer">
            <div v-if="a.handler" class="text-sm text-muted">
              处理人：{{ a.handler.username }} · {{ formatDateTime(a.handledAt) }}
            </div>
            <div v-if="a.status === 'PENDING' || a.status === 'PROCESSING'" class="ap-actions">
              <button class="btn btn-primary btn-sm" @click="handleAppeal(a, 'APPROVE')">✅ 申诉成立</button>
              <button class="btn btn-secondary btn-sm" @click="handleAppeal(a, 'REJECT')">❌ 申诉不成立</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="appealTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="appealPage === 1" @click="loadAppeals(appealPage - 1)">←</button>
        <span class="page-info">第 {{ appealPage }} / {{ appealTotalPages }} 页</span>
        <button class="page-btn" :disabled="appealPage === appealTotalPages" @click="loadAppeals(appealPage + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'logs'" class="section">
      <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
        <select v-model="logFilterAction" class="form-select" style="width: auto; padding: 6px 12px; font-size: 13px;" @change="loadLogs(1)">
          <option value="all">全部操作</option>
          <option v-for="a in logActionOptions" :key="a.value" :value="a.value">{{ a.label }}</option>
        </select>
        <input
          v-model.number="logFilterReportId"
          type="number"
          class="form-input"
          style="width: 140px; padding: 6px 12px; font-size: 13px;"
          placeholder="举报ID筛选"
          @input="debouncedLogSearch"
        >
      </div>

      <div v-if="loadingLogs" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="logs.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📜</div>
        <div class="empty-state-text">暂无操作日志</div>
      </div>
      <div v-else class="log-list">
        <div v-for="log in logs" :key="log.id" class="log-entry card">
          <div class="log-entry-left">
            <span :class="['log-action-badge', `action-${log.action.toLowerCase().replace(/_/g, '-')}`]">
              {{ actionLabel(log.action) }}
            </span>
          </div>
          <div class="log-entry-center">
            <div class="log-detail" v-if="log.detail">{{ log.detail }}</div>
            <div class="log-ref text-sm text-muted">
              举报 #{{ log.reportId }}
              <span v-if="log.report?.targetTitle">· {{ log.report.targetTitle }}</span>
            </div>
          </div>
          <div class="log-entry-right">
            <div class="log-operator text-sm">
              <img v-if="log.operator?.avatar" :src="log.operator.avatar" class="log-avatar">
              {{ log.operator?.username || '系统' }}
            </div>
            <div class="text-xs text-muted">{{ formatDateTime(log.createdAt) }}</div>
          </div>
        </div>
      </div>

      <div v-if="logTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="logPage === 1" @click="loadLogs(logPage - 1)">←</button>
        <span class="page-info">第 {{ logPage }} / {{ logTotalPages }} 页</span>
        <button class="page-btn" :disabled="logPage === logTotalPages" @click="loadLogs(logPage + 1)">→</button>
      </div>
    </div>

    <div v-if="showHandleModal" class="modal-overlay" @click.self="showHandleModal = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ handleActionLabel(handleAction) }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showHandleModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">举报信息</label>
            <div class="form-static">{{ handlingReport?.reason }} · {{ targetLabel(handlingReport?.targetType) }} #{{ handlingReport?.targetId }}</div>
          </div>
          <div class="form-group">
            <label class="form-label">举报者</label>
            <div class="form-static">{{ handlingReport?.reporter?.username }}</div>
          </div>
          <div v-if="handlingReport?.description" class="form-group">
            <label class="form-label">详细描述</label>
            <div class="form-static">{{ handlingReport.description }}</div>
          </div>
          <div v-if="handleAction === 'PENALIZE'" class="form-group">
            <label class="form-label">处罚类型 <span style="color: var(--danger);">*</span></label>
            <select v-model="handleForm.penaltyType" class="form-select" required>
              <option value="" disabled>请选择处罚类型</option>
              <option value="WARNING">警告</option>
              <option value="MUTE">禁言</option>
              <option value="BAN">封禁</option>
              <option value="DELETE_CONTENT">删除内容</option>
            </select>
          </div>
          <div v-if="handleAction === 'PENALIZE'" class="form-group">
            <label class="form-label">处罚详情</label>
            <textarea v-model="handleForm.penaltyDetail" class="form-textarea" rows="2" placeholder="处罚详细说明..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">处理备注</label>
            <textarea v-model="handleForm.handleNote" class="form-textarea" rows="3" placeholder="处理说明..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showHandleModal = false">取消</button>
          <button class="btn btn-primary" @click="submitHandle" :disabled="submittingHandle">
            {{ submittingHandle ? '处理中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal card" style="max-width: 700px;">
        <div class="modal-header">
          <h3 class="font-semibold">举报详情 #{{ detailReport?.id }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showDetailModal = false">✕</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <div v-if="detailReport" class="detail-content">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">举报类型</span>
                <span class="detail-value">{{ typeLabel(detailReport.type) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">目标</span>
                <span class="detail-value">{{ targetLabel(detailReport.targetType) }} #{{ detailReport.targetId }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">状态</span>
                <span :class="['badge', statusBadgeClass(detailReport.status)]">{{ statusLabel(detailReport.status) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">优先级</span>
                <span class="detail-value">{{ priorityLabel(detailReport.priority) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">处理级别</span>
                <span class="detail-value">{{ levelLabel(detailReport.handlerLevel) }}</span>
              </div>
              <div class="detail-item" v-if="detailReport.handler">
                <span class="detail-label">处理人</span>
                <span class="detail-value">{{ detailReport.handler.username }}</span>
              </div>
            </div>

            <div class="detail-section">
              <h4 class="detail-section-title">举报原因</h4>
              <p>{{ detailReport.reason }}</p>
            </div>

            <div v-if="detailReport.description" class="detail-section">
              <h4 class="detail-section-title">详细描述</h4>
              <p>{{ detailReport.description }}</p>
            </div>

            <div class="detail-section">
              <h4 class="detail-section-title">举报者</h4>
              <div class="user-row">
                <img :src="detailReport.reporter?.avatar" class="detail-avatar">
                <div>
                  <div class="font-medium">{{ detailReport.reporter?.username }}</div>
                  <div class="text-sm text-muted">{{ detailReport.reporter?.email }}</div>
                </div>
              </div>
            </div>

            <div v-if="detailReport.targetUser" class="detail-section">
              <h4 class="detail-section-title">被举报用户</h4>
              <div class="user-row">
                <img :src="detailReport.targetUser?.avatar" class="detail-avatar">
                <div>
                  <div class="font-medium">{{ detailReport.targetUser?.username }}</div>
                  <div class="text-sm text-muted">{{ detailReport.targetUser?.email }}</div>
                </div>
              </div>
            </div>

            <div v-if="detailReport.handleNote" class="detail-section">
              <h4 class="detail-section-title">处理说明</h4>
              <p>{{ detailReport.handleNote }}</p>
            </div>

            <div v-if="detailReport.penaltyType" class="detail-section">
              <h4 class="detail-section-title">处罚信息</h4>
              <p>处罚类型：{{ penaltyLabel(detailReport.penaltyType) }}</p>
              <p v-if="detailReport.penaltyDetail">{{ detailReport.penaltyDetail }}</p>
            </div>

            <div v-if="detailReport.appeals && detailReport.appeals.length > 0" class="detail-section">
              <h4 class="detail-section-title">申诉记录</h4>
              <div v-for="a in detailReport.appeals" :key="a.id" class="appeal-timeline-item">
                <div class="appeal-timeline-header">
                  <span :class="['status-badge', `status-${a.status.toLowerCase()}`]">{{ appealStatusLabel(a.status) }}</span>
                  <span class="text-sm text-muted">{{ formatDateTime(a.createdAt) }}</span>
                </div>
                <div class="font-medium">{{ a.reason }}</div>
                <div v-if="a.handleNote" class="text-sm text-muted">处理说明：{{ a.handleNote }}</div>
                <div v-if="a.handler" class="text-sm text-muted">处理人：{{ a.handler.username }}</div>
              </div>
            </div>

            <div v-if="detailReport.logs && detailReport.logs.length > 0" class="detail-section">
              <h4 class="detail-section-title">操作日志</h4>
              <div class="log-timeline">
                <div v-for="log in detailReport.logs" :key="log.id" class="log-item">
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
          </div>
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
  { value: 'overview', label: '数据概览', icon: '📊' },
  { value: 'reports', label: '举报审核', icon: '📋' },
  { value: 'appeals', label: '申诉处理', icon: '🔄' },
  { value: 'logs', label: '操作日志', icon: '📜' }
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

const reportStatusFilters = [
  { label: '全部', value: 'all' },
  { label: '待处理', value: 'PENDING' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '申诉中', value: 'APPEALING' },
  { label: '已处理', value: 'RESOLVED' },
  { label: '已处罚', value: 'PENALIZED' },
  { label: '已驳回', value: 'DISMISSED' }
]

const appealStatusFilters = [
  { label: '全部', value: 'all' },
  { label: '待处理', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' }
]

const logActionOptions = [
  { value: 'CREATE', label: '提交举报' },
  { value: 'CANCEL', label: '撤回举报' },
  { value: 'HANDLE_DISMISS', label: '驳回举报' },
  { value: 'HANDLE_RESOLVE', label: '处理举报' },
  { value: 'HANDLE_PENALIZE', label: '处罚处理' },
  { value: 'APPEAL', label: '提交申诉' },
  { value: 'APPEAL_APPROVE', label: '申诉通过' },
  { value: 'APPEAL_REJECT', label: '申诉驳回' },
  { value: 'ESCALATE', label: '升级处理' },
  { value: 'PRIORITY_CHANGE', label: '优先级变更' }
]

const currentTab = ref('overview')
const stats = ref({
  totalReports: 0, pendingReports: 0, processingReports: 0,
  resolvedReports: 0, penalizedReports: 0, appealingReports: 0,
  dismissedReports: 0, totalAppeals: 0, pendingAppeals: 0,
  resolvedAppeals: 0, todayReports: 0, highPriorityReports: 0
})

const reports = ref([])
const loadingReports = ref(false)
const reportFilterStatus = ref('all')
const reportFilterType = ref('all')
const reportFilterPriority = ref('all')
const reportFilterLevel = ref('all')
const reportKeyword = ref('')
const reportPage = ref(1)
const reportTotalPages = ref(1)

const appeals = ref([])
const loadingAppeals = ref(false)
const appealFilterStatus = ref('all')
const appealPage = ref(1)
const appealTotalPages = ref(1)

const logs = ref([])
const loadingLogs = ref(false)
const logFilterAction = ref('all')
const logFilterReportId = ref(null)
const logPage = ref(1)
const logTotalPages = ref(1)

const showHandleModal = ref(false)
const handlingReport = ref(null)
const handleAction = ref('RESOLVE')
const handleForm = ref({ handleNote: '', penaltyType: '', penaltyDetail: '' })
const submittingHandle = ref(false)

const showDetailModal = ref(false)
const detailReport = ref(null)

const typeLabel = (t) => {
  const found = reportTypes.find(r => r.value === t)
  return found ? `${found.icon} ${found.label}` : t
}

const targetLabel = (t) => {
  const found = targetTypes.find(r => r.value === t)
  return found ? found.label : t
}

const statusLabel = (s) => {
  const map = {
    PENDING: '待处理', PROCESSING: '处理中', RESOLVED: '已处理',
    PENALIZED: '已处罚', DISMISSED: '已驳回', APPEALING: '申诉中', CANCELLED: '已撤回'
  }
  return map[s] || s
}

const statusBadgeClass = (s) => {
  const map = {
    PENDING: 'badge-pending', PROCESSING: 'badge-pending', RESOLVED: 'badge-approved',
    PENALIZED: 'badge-rejected', DISMISSED: 'badge-cancelled', APPEALING: 'badge-pending', CANCELLED: 'badge-cancelled'
  }
  return map[s] || 'badge-pending'
}

const priorityLabel = (p) => {
  const map = { LOW: '低', NORMAL: '普通', HIGH: '高', URGENT: '紧急' }
  return map[p] || p
}

const levelLabel = (l) => {
  const map = { LEVEL_1: '一级', LEVEL_2: '二级', LEVEL_3: '三级' }
  return map[l] || l
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
    CREATE: '提交举报', CANCEL: '撤回举报',
    HANDLE_DISMISS: '驳回举报', HANDLE_RESOLVE: '处理举报', HANDLE_PENALIZE: '处罚处理',
    APPEAL: '提交申诉', APPEAL_APPROVE: '申诉通过', APPEAL_REJECT: '申诉驳回',
    ESCALATE: '升级处理', PRIORITY_CHANGE: '优先级变更'
  }
  return map[a] || a
}

const handleActionLabel = (a) => {
  const map = { DISMISS: '驳回举报', RESOLVE: '处理举报', PENALIZE: '处罚处理' }
  return map[a] || a
}

const formatDate = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const formatDateTime = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const switchTab = (t) => {
  currentTab.value = t
  if (t === 'overview') loadStats()
  if (t === 'reports') loadReports(1)
  if (t === 'appeals') loadAppeals(1)
  if (t === 'logs') loadLogs(1)
}

const loadStats = async () => {
  try {
    const res = await api.get('/admin/reports/stats')
    stats.value = res.stats
  } catch (e) { console.error(e) }
}

let reportSearchTimer = null
const debouncedReportSearch = () => {
  clearTimeout(reportSearchTimer)
  reportSearchTimer = setTimeout(() => loadReports(1), 400)
}

let logSearchTimer = null
const debouncedLogSearch = () => {
  clearTimeout(logSearchTimer)
  logSearchTimer = setTimeout(() => loadLogs(1), 400)
}

const loadReports = async (newPage = 1) => {
  loadingReports.value = true
  reportPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 15 })
    if (reportFilterStatus.value !== 'all') params.set('status', reportFilterStatus.value)
    if (reportFilterType.value !== 'all') params.set('type', reportFilterType.value)
    if (reportFilterPriority.value !== 'all') params.set('priority', reportFilterPriority.value)
    if (reportFilterLevel.value !== 'all') params.set('handlerLevel', reportFilterLevel.value)
    if (reportKeyword.value) params.set('keyword', reportKeyword.value)
    const res = await api.get(`/admin/reports/reports?${params}`)
    reports.value = res.reports
    reportTotalPages.value = res.totalPages
  } catch (e) { console.error(e) }
  finally { loadingReports.value = false }
}

const loadAppeals = async (newPage = 1) => {
  loadingAppeals.value = true
  appealPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 15 })
    if (appealFilterStatus.value !== 'all') params.set('status', appealFilterStatus.value)
    const res = await api.get(`/admin/reports/appeals?${params}`)
    appeals.value = res.appeals
    appealTotalPages.value = res.totalPages
  } catch (e) { console.error(e) }
  finally { loadingAppeals.value = false }
}

const loadLogs = async (newPage = 1) => {
  loadingLogs.value = true
  logPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 20 })
    if (logFilterAction.value !== 'all') params.set('action', logFilterAction.value)
    if (logFilterReportId.value) params.set('reportId', logFilterReportId.value)
    const res = await api.get(`/admin/reports/logs?${params}`)
    logs.value = res.logs
    logTotalPages.value = res.totalPages
  } catch (e) { console.error(e) }
  finally { loadingLogs.value = false }
}

const changePriority = async (r, newPriority) => {
  try {
    await api.put(`/admin/reports/reports/${r.id}/priority`, { priority: newPriority })
    r.priority = newPriority
    showToast('优先级已更新', 'success')
  } catch (e) {
    showToast(e.error || '更新失败', 'error')
  }
}

const viewReportDetail = async (r) => {
  try {
    const res = await api.get(`/admin/reports/reports/${r.id}`)
    detailReport.value = res.report
    showDetailModal.value = true
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  }
}

const openHandleModal = (r, action) => {
  handlingReport.value = r
  handleAction.value = action
  handleForm.value = { handleNote: '', penaltyType: '', penaltyDetail: '' }
  showHandleModal.value = true
}

const submitHandle = async () => {
  if (handleAction.value === 'PENALIZE' && !handleForm.value.penaltyType) {
    showToast('请选择处罚类型', 'warning')
    return
  }
  submittingHandle.value = true
  try {
    await api.put(`/admin/reports/reports/${handlingReport.value.id}/handle`, {
      action: handleAction.value,
      handleNote: handleForm.value.handleNote,
      penaltyType: handleForm.value.penaltyType || undefined,
      penaltyDetail: handleForm.value.penaltyDetail || undefined
    })
    showHandleModal.value = false
    const actionLabels = { DISMISS: '已驳回', RESOLVE: '已处理', PENALIZE: '已处罚' }
    showToast(actionLabels[handleAction.value], 'success')
    loadReports(reportPage.value)
    loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submittingHandle.value = false
  }
}

const escalateReport = async (r) => {
  if (!confirm(`确定要将举报 #${r.id} 升级处理吗？`)) return
  try {
    await api.put(`/admin/reports/reports/${r.id}/handle`, { escalate: true })
    showToast('已升级处理级别', 'success')
    loadReports(reportPage.value)
    loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const handleAppeal = async (a, action) => {
  const actionText = action === 'APPROVE' ? '通过' : '驳回'
  const note = prompt(`请输入处理备注（可选）：`)
  try {
    await api.put(`/admin/reports/appeals/${a.id}/handle`, {
      action,
      handleNote: note || ''
    })
    showToast(`申诉已${actionText}`, 'success')
    loadAppeals(appealPage.value)
    loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
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

.admin-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 6px;
}
.admin-tab {
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
.admin-tab:hover { color: var(--text-primary); background: var(--bg-tertiary); }
.admin-tab.active { background: var(--accent); color: #fff; }
.tab-icon { font-size: 16px; }
.tab-badge {
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 100px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.stat-card {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-icon { font-size: 32px; }
.stat-value { font-size: 24px; font-weight: 700; }
.stat-label { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 100px;
}

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}
.badge-approved { background: #f6ffed; color: #52c41a; }
.badge-pending { background: #fff7e6; color: #d48806; }
.badge-rejected { background: #fff1f0; color: #cf1322; }
.badge-cancelled { background: #f5f5f5; color: #8c8c8c; }

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

.action-btns {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.appeal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.appeal-card {
  padding: 20px 24px;
}
.ap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.ap-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ap-body { margin-bottom: 12px; }
.ap-user {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.ap-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}
.ap-reason { font-size: 15px; margin-bottom: 6px; }
.ap-report-ref { margin-bottom: 4px; }
.ap-handle-note {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: 10px;
}
.ap-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}
.ap-actions { display: flex; gap: 8px; }

.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.log-entry {
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.log-entry-left { flex-shrink: 0; }
.log-entry-center { flex: 1; min-width: 0; }
.log-entry-right { flex-shrink: 0; text-align: right; }
.log-action-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}
.action-create { background: #e6f7ff; color: #1890ff; }
.action-cancel { background: #f5f5f5; color: #8c8c8c; }
.action-handle-dismiss { background: #f5f5f5; color: #8c8c8c; }
.action-handle-resolve { background: #f6ffed; color: #52c41a; }
.action-handle-penalize { background: #fff1f0; color: #cf1322; }
.action-appeal { background: #f9f0ff; color: #722ed1; }
.action-appeal-approve { background: #f6ffed; color: #52c41a; }
.action-appeal-reject { background: #fff1f0; color: #cf1322; }
.action-escalate { background: #fff7e6; color: #d48806; }
.action-priority-change { background: #e6f7ff; color: #1890ff; }
.log-detail { margin-bottom: 2px; }
.log-operator {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}
.log-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.form-static {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-primary);
}

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
.detail-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}
.user-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.appeal-timeline-item {
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}
.appeal-timeline-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

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
.log-content .log-action { font-size: 14px; font-weight: 500; }
.log-content .log-detail { margin-top: 2px; }
.log-content .log-meta { margin-top: 4px; }

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
