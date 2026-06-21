<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">品牌联名看板</h1>
      <p class="page-subtitle">看板视图管理品牌联名合作项目，推进排期与审核</p>
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
        <span v-if="t.value === 'kanban' && stats.pendingReviewCoops > 0" class="tab-badge">{{ stats.pendingReviewCoops }}</span>
      </button>
    </div>

    <div v-if="currentTab === 'overview'" class="section">
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalCoops }}</div>
            <div class="stat-label">项目总数</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <div class="stat-value" style="color:#d48806;">{{ stats.pendingReviewCoops }}</div>
            <div class="stat-label">待审核</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.publishedCoops }}</div>
            <div class="stat-label">已发布</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">⚡</div>
          <div class="stat-info">
            <div class="stat-value" style="color:#0050b3;">{{ stats.inProgressCoops }}</div>
            <div class="stat-label">进行中</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">🎉</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.completedCoops }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">❌</div>
          <div class="stat-info">
            <div class="stat-value" style="color:#cf1322;">{{ stats.rejectedCoops }}</div>
            <div class="stat-label">已驳回</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'kanban'" class="section">
      <div v-if="loadingKanban" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else class="kanban-board">
        <div v-for="col in kanbanColumns" :key="col.value" class="kanban-column">
          <div class="column-header" :style="{ borderTopColor: col.color }">
            <span class="column-icon">{{ col.icon }}</span>
            <span class="column-title">{{ col.label }}</span>
            <span class="column-count">{{ (kanbanData[col.value] || []).length }}</span>
          </div>
          <div class="column-body">
            <div
              v-for="item in (kanbanData[col.value] || [])"
              :key="item.id"
              class="kanban-card card"
              @click="openDetail(item)"
            >
              <div class="kc-header">
                <span class="kc-brand">{{ item.brandName }}</span>
                <span :class="['kc-status', `status-${getStatusClass(item.status)}`]">{{ getStatusText(item.status) }}</span>
              </div>
              <h4 class="kc-title">{{ item.title }}</h4>
              <div class="kc-meta">
                <span v-if="item.budget">💰 {{ item.budget }}</span>
                <span>📖 {{ item.zineCount }}</span>
                <span>📋 {{ item.scheduleCount }}</span>
              </div>
              <div class="kc-footer">
                <div class="kc-creator">
                  <img :src="item.creator?.avatar" alt="">
                  <span>{{ item.creator?.username }}</span>
                </div>
                <div class="kc-actions" @click.stop>
                  <select class="kc-move" @change="moveCard(item, $event.target.value)">
                    <option value="">移动到...</option>
                    <option v-for="c in kanbanColumns" :key="c.value" :value="c.value" :disabled="c.value === item.kanbanColumn">{{ c.icon }} {{ c.label }}</option>
                  </select>
                </div>
              </div>
            </div>
            <div v-if="(kanbanData[col.value] || []).length === 0" class="column-empty">
              暂无项目
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'list'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button v-for="f in statusFilters" :key="f.value" :class="['btn', statusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']" @click="statusFilter = f.value; loadList(1)">{{ f.label }}</button>
        </div>
        <div class="search-box-sm">
          <input v-model="searchKeyword" type="text" class="form-input" placeholder="搜索..." @input="debouncedSearch">
        </div>
      </div>
      <div v-if="loadingList" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="listData.length === 0" class="empty-state card" style="padding:48px;"><div class="empty-state-icon">🏷️</div><div class="empty-state-text">暂无数据</div></div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr><th>品牌</th><th>标题</th><th>分类</th><th>阶段</th><th>预算</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in listData" :key="c.id">
              <td>
                <div class="brand-cell">
                  <span v-if="c.brandLogo" class="brand-thumb">🏷️</span>
                  <span class="font-medium">{{ c.brandName }}</span>
                </div>
              </td>
              <td><router-link :to="`/brand-coops/${c.id}`" class="link">{{ c.title }}</router-link></td>
              <td><span class="tag">{{ getCategoryLabel(c.category) }}</span></td>
              <td>{{ getColumnLabel(c.kanbanColumn) }}</td>
              <td class="text-sm">{{ c.budget || '-' }}</td>
              <td><span :class="['badge', getStatusBadgeClass(c.status)]">{{ getStatusText(c.status) }}</span></td>
              <td>
                <button v-if="c.status === 'PENDING_REVIEW'" class="btn btn-primary btn-sm" @click="approveItem(c)">✅ 通过</button>
                <button v-if="c.status === 'PENDING_REVIEW'" class="btn btn-secondary btn-sm" @click="rejectItem(c)">❌ 驳回</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteItem(c)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="listTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="listPage === 1" @click="loadList(listPage - 1)">←</button>
        <span class="page-info">第 {{ listPage }} / {{ listTotalPages }} 页</span>
        <button class="page-btn" :disabled="listPage === listTotalPages" @click="loadList(listPage + 1)">→</button>
      </div>
    </div>

    <div v-if="showReviewModal" class="modal-overlay" @click.self="showReviewModal = false">
      <div class="modal card" style="max-width:500px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ reviewAction === 'APPROVE' ? '审核通过' : '驳回提案' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showReviewModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">项目</label><div class="form-static">{{ reviewingItem?.title }}</div></div>
          <div class="form-group"><label class="form-label">品牌</label><div class="form-static">{{ reviewingItem?.brandName }}</div></div>
          <div v-if="reviewAction === 'REJECT'" class="form-group">
            <label class="form-label">驳回原因 <span style="color:var(--danger)">*</span></label>
            <textarea v-model="reviewReason" class="form-textarea" rows="3" placeholder="请填写驳回原因..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showReviewModal = false">取消</button>
          <button class="btn btn-primary" @click="submitReview" :disabled="submittingReview">{{ submittingReview ? '处理中...' : '确认' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const showToast = inject('showToast')

const tabs = [
  { value: 'overview', label: '数据概览', icon: '📊' },
  { value: 'kanban', label: '看板视图', icon: '📋' },
  { value: 'list', label: '列表管理', icon: '📝' }
]

const currentTab = ref('overview')
const stats = ref({ totalCoops: 0, pendingReviewCoops: 0, publishedCoops: 0, inProgressCoops: 0, completedCoops: 0, rejectedCoops: 0, draftCoops: 0 })

const kanbanColumns = [
  { value: 'PROPOSAL', label: '提案', icon: '📋', color: '#8c8c8c' },
  { value: 'NEGOTIATING', label: '协商中', icon: '🤝', color: '#d48806' },
  { value: 'CONFIRMED', label: '已确认', icon: '✅', color: '#52c41a' },
  { value: 'EXECUTING', label: '执行中', icon: '⚡', color: '#0050b3' },
  { value: 'COMPLETED', label: '已完成', icon: '🎉', color: '#722ed1' },
  { value: 'ARCHIVED', label: '已归档', icon: '📦', color: '#595959' }
]

const kanbanData = ref({})
const loadingKanban = ref(false)

const statusFilters = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'PENDING_REVIEW' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '进行中', value: 'IN_PROGRESS' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已驳回', value: 'REJECTED' }
]

const listData = ref([])
const loadingList = ref(false)
const statusFilter = ref('all')
const searchKeyword = ref('')
const listPage = ref(1)
const listTotalPages = ref(1)

const showReviewModal = ref(false)
const reviewingItem = ref(null)
const reviewAction = ref('APPROVE')
const reviewReason = ref('')
const submittingReview = ref(false)

const categories = [
  { id: 'COBRANDING', name: '联名共创', icon: '🏷️' },
  { id: 'SPONSORSHIP', name: '品牌赞助', icon: '💰' },
  { id: 'CONTENT_COLLAB', name: '内容合作', icon: '📝' },
  { id: 'CROSSOVER', name: '跨界联动', icon: '🔀' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const getStatusText = (s) => {
  const map = { DRAFT: '草稿', PENDING_REVIEW: '待审核', PUBLISHED: '已发布', IN_PROGRESS: '进行中', COMPLETED: '已完成', REJECTED: '未通过', CLOSED: '已关闭' }
  return map[s] || s
}
const getStatusClass = (s) => s.toLowerCase().replace('_', '')
const getStatusBadgeClass = (s) => {
  const map = { DRAFT: 'badge-pending', PENDING_REVIEW: 'badge-pending', PUBLISHED: 'badge-approved', IN_PROGRESS: 'badge-progress', COMPLETED: 'badge-approved', REJECTED: 'badge-rejected', CLOSED: 'badge-cancelled' }
  return map[s] || 'badge-pending'
}
const getCategoryLabel = (cat) => { const found = categories.find(c => c.id === cat); return found ? `${found.icon} ${found.name}` : cat }
const getColumnLabel = (col) => { const found = kanbanColumns.find(c => c.value === col); return found ? `${found.icon} ${found.label}` : col }

const switchTab = (t) => {
  currentTab.value = t
  if (t === 'overview') loadStats()
  if (t === 'kanban') loadKanban()
  if (t === 'list') loadList(1)
}

const loadStats = async () => {
  try {
    const res = await api.get('/admin/brand-coops/stats')
    stats.value = res.stats
  } catch (e) { console.error(e) }
}

const loadKanban = async () => {
  loadingKanban.value = true
  try {
    const res = await api.get('/admin/brand-coops/kanban')
    kanbanData.value = res.kanban
  } catch (e) { console.error(e) } finally { loadingKanban.value = false }
}

let searchTimer = null
const debouncedSearch = () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadList(1), 400) }

const loadList = async (newPage = 1) => {
  loadingList.value = true
  listPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 10 })
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value)
    if (searchKeyword.value) params.set('keyword', searchKeyword.value)
    const res = await api.get(`/admin/brand-coops/list?${params}`)
    listData.value = res.brandCoops
    listTotalPages.value = res.totalPages
  } catch (e) { console.error(e) } finally { loadingList.value = false }
}

const openDetail = (item) => { router.push(`/brand-coops/${item.id}`) }

const moveCard = async (item, targetCol) => {
  if (!targetCol || targetCol === item.kanbanColumn) return
  try {
    await api.post(`/brand-coops/${item.id}/advance`, { kanbanColumn: targetCol })
    showToast('阶段已更新', 'success')
    loadKanban()
    loadStats()
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const approveItem = (item) => {
  reviewingItem.value = item
  reviewAction.value = 'APPROVE'
  reviewReason.value = ''
  showReviewModal.value = true
}

const rejectItem = (item) => {
  reviewingItem.value = item
  reviewAction.value = 'REJECT'
  reviewReason.value = ''
  showReviewModal.value = true
}

const submitReview = async () => {
  if (reviewAction.value === 'REJECT' && !reviewReason.value) { showToast('请填写驳回原因', 'warning'); return }
  submittingReview.value = true
  try {
    if (reviewAction.value === 'APPROVE') {
      await api.post(`/brand-coops/${reviewingItem.value.id}/publish`)
      showToast('已通过审核', 'success')
    } else {
      await api.post(`/brand-coops/${reviewingItem.value.id}/reject`, { reason: reviewReason.value })
      showToast('已驳回', 'success')
    }
    showReviewModal.value = false
    loadList(listPage.value)
    loadStats()
    loadKanban()
  } catch (e) { showToast(e.error || '操作失败', 'error') } finally { submittingReview.value = false }
}

const deleteItem = async (c) => {
  if (!confirm(`确定删除"${c.title}"？`)) return
  try {
    await api.delete(`/brand-coops/${c.id}`)
    listData.value = listData.value.filter(x => x.id !== c.id)
    showToast('已删除', 'success')
    loadStats()
  } catch (e) { showToast(e.error || '删除失败', 'error') }
}

onMounted(() => { loadStats() })
</script>

<style scoped>
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.gap-sm { gap: 8px; }
.mb { margin-bottom: 16px; }
.text-sm { font-size: 13px; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.link { color: var(--accent); }
.link:hover { text-decoration: underline; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
.stat-card { padding: 20px; display: flex; align-items: center; gap: 16px; }
.stat-icon { font-size: 32px; }
.stat-value { font-size: 24px; font-weight: 700; }
.stat-label { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

.admin-tabs { display: flex; gap: 4px; margin-bottom: 24px; background: var(--bg-secondary); border-radius: var(--radius); padding: 6px; }
.admin-tab { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: var(--radius-sm); font-size: 14px; color: var(--text-secondary); transition: all 0.2s; position: relative; }
.admin-tab:hover { color: var(--text-primary); background: var(--bg-tertiary); }
.admin-tab.active { background: var(--accent); color: #fff; }
.tab-icon { font-size: 16px; }
.tab-badge { background: var(--danger); color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 100px; font-weight: 600; }

.kanban-board { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 16px; }
.kanban-column { min-width: 260px; max-width: 300px; flex: 1; display: flex; flex-direction: column; }
.column-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--bg-secondary); border-radius: var(--radius) var(--radius) 0 0; border-top: 3px solid; font-weight: 600; font-size: 14px; }
.column-icon { font-size: 16px; }
.column-count { margin-left: auto; padding: 2px 8px; background: var(--bg-tertiary); border-radius: 100px; font-size: 12px; font-weight: 500; color: var(--text-secondary); }
.column-body { flex: 1; background: var(--bg-tertiary); border-radius: 0 0 var(--radius) var(--radius); padding: 8px; display: flex; flex-direction: column; gap: 8px; min-height: 200px; }
.column-empty { text-align: center; padding: 24px; font-size: 13px; color: var(--text-tertiary); }

.kanban-card { padding: 14px; cursor: pointer; transition: all 0.2s; }
.kanban-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.kc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.kc-brand { font-size: 13px; font-weight: 600; color: var(--accent); }
.kc-status { padding: 2px 8px; border-radius: 100px; font-size: 11px; font-weight: 500; }
.status-pendingreview { background: #fff7e6; color: #d48806; }
.status-published { background: #f6ffed; color: #52c41a; }
.status-inprogress { background: #e6f7ff; color: #0050b3; }
.status-completed { background: #f6ffed; color: #52c41a; }
.status-rejected { background: #fff1f0; color: #cf1322; }
.status-draft { background: #f5f5f5; color: #8c8c8c; }

.kc-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; line-height: 1.4; }
.kc-meta { display: flex; gap: 10px; font-size: 12px; color: var(--text-tertiary); margin-bottom: 10px; }
.kc-footer { display: flex; justify-content: space-between; align-items: center; }
.kc-creator { display: flex; align-items: center; gap: 6px; }
.kc-creator img { width: 20px; height: 20px; border-radius: 50%; background: var(--bg-tertiary); }
.kc-creator span { font-size: 11px; color: var(--text-tertiary); }
.kc-move { padding: 4px 8px; font-size: 11px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-primary); color: var(--text-secondary); }

.admin-list { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; }
.admin-table th { padding: 12px 16px; text-align: left; font-size: 12px; color: var(--text-tertiary); font-weight: 500; border-bottom: 1px solid var(--border-light); }
.admin-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-light); font-size: 14px; }
.brand-cell { display: flex; align-items: center; gap: 6px; }
.brand-thumb { font-size: 16px; }

.badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 500; }
.badge-approved { background: #f6ffed; color: #52c41a; }
.badge-pending { background: #fff7e6; color: #d48806; }
.badge-progress { background: #e6f7ff; color: #0050b3; }
.badge-rejected { background: #fff1f0; color: #cf1322; }
.badge-cancelled { background: #f5f5f5; color: #8c8c8c; }
.tag { display: inline-block; padding: 2px 10px; background: var(--bg-tertiary); color: var(--text-secondary); font-size: 12px; border-radius: 100px; }
.danger-btn { color: var(--danger); }

.search-box-sm { min-width: 200px; }
.search-box-sm .form-input { padding: 6px 12px; font-size: 13px; }

.form-static { padding: 10px 14px; background: var(--bg-tertiary); border-radius: var(--radius-sm); font-size: 14px; color: var(--text-primary); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { width: 100%; background: var(--bg-secondary); border-radius: var(--radius); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid var(--border-light); }
.modal-body { padding: 24px; overflow-y: auto; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border-light); }

.pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 24px; }
.page-btn { min-width: 36px; height: 36px; padding: 0 12px; border-radius: var(--radius-sm); background: var(--bg-secondary); border: 1px solid var(--border); font-size: 13px; color: var(--text-primary); transition: all 0.2s; }
.page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-secondary); }

.filter-tabs { display: flex; flex-wrap: wrap; }
</style>
