<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">创作比赛管理</h1>
      <p class="page-subtitle">管理比赛、审核投稿、评委评分与结果公示</p>
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
        <span v-if="t.value === 'competitions' && stats.pending > 0" class="tab-badge">{{ stats.pending }}</span>
        <span v-if="t.value === 'entries' && stats.pendingEntries > 0" class="tab-badge">{{ stats.pendingEntries }}</span>
      </button>
    </div>

    <div v-if="currentTab === 'overview'" class="section">
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-icon">🏆</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">比赛总数</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #d48806;">{{ stats.pending }}</div>
            <div class="stat-label">待审核</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">🔥</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #52c41a;">{{ stats.ongoing }}</div>
            <div class="stat-label">进行中</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.completed }}</div>
            <div class="stat-label">已完赛</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">📝</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalEntries }}</div>
            <div class="stat-label">总投稿数</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">⭐</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalScores }}</div>
            <div class="stat-label">评分次数</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'competitions'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            :class="['btn', statusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="statusFilter = f.value; loadCompetitions(1)"
          >
            {{ f.label }}
          </button>
        </div>
        <router-link to="/competitions/new" class="btn btn-primary btn-sm">+ 新建比赛</router-link>
      </div>

      <div class="search-box" style="margin-bottom: 16px;">
        <input v-model="searchKeyword" type="text" class="form-input" placeholder="搜索比赛标题..." @input="debouncedSearch">
      </div>

      <div v-if="loadingCompetitions" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="competitions.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">🏆</div>
        <div class="empty-state-text">暂无比赛</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>封面</th>
              <th>标题</th>
              <th>分类</th>
              <th>投稿数</th>
              <th>状态</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in competitions" :key="c.id">
              <td>
                <div v-if="c.coverImage" class="thumb-cover" :style="{ backgroundImage: `url(${c.coverImage})` }"></div>
                <div v-else class="thumb-cover thumb-placeholder">🏆</div>
              </td>
              <td class="font-medium">{{ c.title }}</td>
              <td><span class="tag">{{ c.category }}</span></td>
              <td class="text-sm">{{ c.entryCount || 0 }}</td>
              <td>
                <span :class="['badge', getStatusBadgeClass(c.status)]">{{ statusLabel(c.status) }}</span>
              </td>
              <td class="text-sm">{{ formatDate(c.startDate) }} ~ {{ formatDate(c.endDate) }}</td>
              <td>
                <router-link :to="`/competitions/${c.id}`" class="btn btn-ghost btn-sm">查看</router-link>
                <button v-if="c.status === 'PENDING_REVIEW'" class="btn btn-primary btn-sm" @click="approveCompetition(c)">✅ 通过</button>
                <button v-if="c.status === 'PENDING_REVIEW'" class="btn btn-secondary btn-sm" @click="rejectCompetition(c)">❌ 驳回</button>
                <button v-if="['DRAFT', 'REJECTED'].includes(c.status)" class="btn btn-ghost btn-sm" @click="publishCompetition(c)">发布</button>
                <button v-if="c.status === 'PUBLISHED'" class="btn btn-ghost btn-sm" @click="completeCompetition(c)">结束</button>
                <button v-if="c.status === 'PUBLISHED'" class="btn btn-ghost btn-sm" @click="toggleFeature(c)">
                  {{ c.isFeatured ? '取消精选' : '精选' }}
                </button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteCompetition(c)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page === 1" @click="loadCompetitions(page - 1)">←</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="page === totalPages" @click="loadCompetitions(page + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'entries'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in entryStatusFilters"
            :key="f.value"
            :class="['btn', entryStatusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="entryStatusFilter = f.value; loadEntries(1)"
          >
            {{ f.label }}
          </button>
        </div>
        <div class="flex gap-sm items-center">
          <select v-model="filterCompetitionId" class="form-select" style="width: auto;" @change="loadEntries(1)">
            <option :value="null">全部比赛</option>
            <option v-for="c in allCompetitions" :key="c.id" :value="c.id">{{ c.title }}</option>
          </select>
        </div>
      </div>

      <div v-if="loadingEntries" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="entries.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">暂无投稿</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>作品标题</th>
              <th>参赛者</th>
              <th>所属比赛</th>
              <th>分组</th>
              <th>平均分</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in entries" :key="e.id">
              <td class="font-medium">{{ e.title }}</td>
              <td>
                <div class="user-cell">
                  <img :src="e.user?.avatar" alt="">
                  <span>{{ e.user?.username }}</span>
                </div>
              </td>
              <td class="text-sm">{{ e.competition?.title }}</td>
              <td class="text-sm">{{ e.group?.name || '-' }}</td>
              <td class="accent font-medium">{{ e.avgScore }}</td>
              <td>
                <span :class="['badge', getEntryStatusBadgeClass(e.status)]">{{ entryStatusLabel(e.status) }}</span>
              </td>
              <td>
                <button v-if="e.status === 'PENDING'" class="btn btn-primary btn-sm" @click="approveEntry(e)">✅ 通过</button>
                <button v-if="e.status === 'PENDING'" class="btn btn-secondary btn-sm" @click="rejectEntry(e)">❌ 驳回</button>
                <button v-if="e.status === 'APPROVED'" class="btn btn-ghost btn-sm" @click="openScoreModal(e)">⭐ 评分</button>
                <button class="btn btn-ghost btn-sm" @click="viewEntryDetail(e)">详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="entryTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="entryPage === 1" @click="loadEntries(entryPage - 1)">←</button>
        <span class="page-info">第 {{ entryPage }} / {{ entryTotalPages }} 页</span>
        <button class="page-btn" :disabled="entryPage === entryTotalPages" @click="loadEntries(entryPage + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'ranking'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">公示榜单</h3>
        <div class="flex gap-sm items-center">
          <select v-model="rankingCompetitionId" class="form-select" style="width: auto;" @change="loadRanking">
            <option :value="null">选择比赛</option>
            <option v-for="c in allCompetitions" :key="c.id" :value="c.id">{{ c.title }}</option>
          </select>
          <button v-if="rankingCompetitionId" class="btn btn-primary btn-sm" @click="publishResult">📢 公示结果</button>
        </div>
      </div>

      <div v-if="loadingRanking" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="rankingData.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">🏆</div>
        <div class="empty-state-text">{{ rankingCompetitionId ? '暂无已审核的投稿' : '请选择一个比赛查看排名' }}</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>作品标题</th>
              <th>参赛者</th>
              <th>分组</th>
              <th>平均分</th>
              <th>评委数</th>
              <th>评分详情</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, index) in rankingData" :key="r.id" :class="{ 'top-row': index < 3 }">
              <td class="font-bold">{{ index < 3 ? ['🥇','🥈','🥉'][index] : index + 1 }}</td>
              <td class="font-medium">{{ r.title }}</td>
              <td>
                <div class="user-cell">
                  <img :src="r.user?.avatar" alt="">
                  <span>{{ r.user?.username }}</span>
                </div>
              </td>
              <td class="text-sm">{{ r.group?.name || '-' }}</td>
              <td class="accent font-bold">{{ r.avgScore }}</td>
              <td class="text-sm">{{ r.scoreCount }}</td>
              <td>
                <div v-if="r.scores && r.scores.length > 0" class="score-details">
                  <span v-for="s in r.scores" :key="s.id" class="score-chip">
                    {{ s.judge?.username }}: {{ s.score }}
                  </span>
                </div>
                <span v-else class="text-sm text-muted">暂无评分</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showScoreModal" class="modal-overlay" @click.self="showScoreModal = false">
      <div class="modal card" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="font-semibold">评分 · {{ scoringEntry?.title }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showScoreModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="entry-preview">
            <p><strong>参赛者：</strong>{{ scoringEntry?.user?.username }}</p>
            <p><strong>分组：</strong>{{ scoringEntry?.group?.name || '无' }}</p>
            <p><strong>内容：</strong>{{ scoringEntry?.content?.substring(0, 200) }}{{ scoringEntry?.content?.length > 200 ? '...' : '' }}</p>
          </div>
          <div class="form-group" style="margin-top: 16px;">
            <label class="form-label">评分 (0-100) <span class="required">*</span></label>
            <input v-model.number="scoreForm.score" type="number" class="form-input" min="0" max="100" placeholder="0-100">
          </div>
          <div class="form-group">
            <label class="form-label">评语</label>
            <textarea v-model="scoreForm.comment" class="form-textarea" rows="3" placeholder="对作品的评价..."></textarea>
          </div>
          <div v-if="scoringEntry?.scores && scoringEntry.scores.length > 0" class="existing-scores">
            <p class="form-label">已有评分</p>
            <div v-for="s in scoringEntry.scores" :key="s.id" class="existing-score-item">
              <span>{{ s.judge?.username }}</span>
              <span class="accent font-bold">{{ s.score }} 分</span>
              <span v-if="s.comment" class="text-sm text-muted">- {{ s.comment }}</span>
            </div>
          </div>
          <div class="modal-footer" style="padding: 0; margin-top: 16px;">
            <button class="btn btn-secondary" @click="showScoreModal = false">取消</button>
            <button class="btn btn-primary" @click="submitScore" :disabled="submitting">
              {{ submitting ? '提交中...' : '提交评分' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal card" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="font-semibold">投稿详情</h3>
          <button class="btn btn-ghost btn-sm" @click="showDetailModal = false">✕</button>
        </div>
        <div class="modal-body" v-if="detailEntry">
          <div class="detail-row">
            <span class="detail-label">作品标题</span>
            <span class="detail-value">{{ detailEntry.title }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">参赛者</span>
            <span class="detail-value">{{ detailEntry.user?.username }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">比赛</span>
            <span class="detail-value">{{ detailEntry.competition?.title }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">分组</span>
            <span class="detail-value">{{ detailEntry.group?.name || '无' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">状态</span>
            <span :class="['badge', getEntryStatusBadgeClass(detailEntry.status)]">{{ entryStatusLabel(detailEntry.status) }}</span>
          </div>
          <div v-if="detailEntry.rejectionReason" class="detail-row">
            <span class="detail-label">驳回原因</span>
            <span class="detail-value" style="color: var(--danger);">{{ detailEntry.rejectionReason }}</span>
          </div>
          <div class="detail-content">
            <span class="detail-label">作品内容</span>
            <div class="detail-text">{{ detailEntry.content }}</div>
          </div>
          <div v-if="detailEntry.images && detailEntry.images.length > 0" class="detail-images">
            <span class="detail-label">作品图片</span>
            <div class="image-grid">
              <img v-for="(img, i) in detailEntry.images" :key="i" :src="img" alt="">
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
  { value: 'competitions', label: '比赛管理', icon: '🏆' },
  { value: 'entries', label: '投稿审核', icon: '📝' },
  { value: 'ranking', label: '公示榜单', icon: '🥇' }
]

const currentTab = ref('overview')

const stats = ref({
  total: 0, pending: 0, ongoing: 0, completed: 0,
  totalEntries: 0, totalScores: 0, pendingEntries: 0
})

const statusFilters = [
  { value: 'all', label: '全部' },
  { value: 'PENDING_REVIEW', label: '待审核' },
  { value: 'PUBLISHED', label: '进行中' },
  { value: 'COMPLETED', label: '已完赛' },
  { value: 'REJECTED', label: '已驳回' }
]

const entryStatusFilters = [
  { value: 'all', label: '全部' },
  { value: 'PENDING', label: '待审核' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已驳回' }
]

const competitions = ref([])
const loadingCompetitions = ref(false)
const statusFilter = ref('all')
const searchKeyword = ref('')
const page = ref(1)
const totalPages = ref(0)
const pageSize = 10

const entries = ref([])
const loadingEntries = ref(false)
const entryStatusFilter = ref('all')
const entryPage = ref(1)
const entryTotalPages = ref(0)
const filterCompetitionId = ref(null)

const allCompetitions = ref([])
const rankingData = ref([])
const loadingRanking = ref(false)
const rankingCompetitionId = ref(null)

const showScoreModal = ref(false)
const scoringEntry = ref(null)
const scoreForm = ref({ score: 80, comment: '' })
const submitting = ref(false)

const showDetailModal = ref(false)
const detailEntry = ref(null)

const formatDate = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const statusLabel = (s) => ({
  DRAFT: '草稿', PENDING_REVIEW: '待审核', PUBLISHED: '已发布',
  COMPLETED: '已完赛', REJECTED: '已驳回'
}[s] || s)

const getStatusBadgeClass = (s) => ({
  DRAFT: 'badge-gray', PENDING_REVIEW: 'badge-orange', PUBLISHED: 'badge-blue',
  COMPLETED: 'badge-green', REJECTED: 'badge-red'
}[s] || 'badge-gray')

const entryStatusLabel = (s) => ({ PENDING: '待审核', APPROVED: '已通过', REJECTED: '已驳回' }[s] || s)
const getEntryStatusBadgeClass = (s) => ({ PENDING: 'badge-orange', APPROVED: 'badge-green', REJECTED: 'badge-red' }[s] || 'badge-gray')

const switchTab = (tab) => {
  currentTab.value = tab
  if (tab === 'competitions') loadCompetitions(1)
  if (tab === 'entries') { loadAllCompetitions(); loadEntries(1) }
  if (tab === 'ranking') { loadAllCompetitions() }
  if (tab === 'overview') loadStats()
}

const loadStats = async () => {
  try {
    const res = await api.get('/admin/competitions/stats')
    stats.value = res
  } catch (e) { console.error(e) }
}

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadCompetitions(1), 400)
}

const loadCompetitions = async (newPage = 1) => {
  loadingCompetitions.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: pageSize })
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value)
    if (searchKeyword.value) params.set('keyword', searchKeyword.value)
    const res = await api.get(`/admin/competitions?${params}`)
    competitions.value = res.competitions
    totalPages.value = res.totalPages
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loadingCompetitions.value = false
  }
}

const loadAllCompetitions = async () => {
  try {
    const res = await api.get('/admin/competitions?limit=100')
    allCompetitions.value = res.competitions
  } catch (e) { console.error(e) }
}

const loadEntries = async (newPage = 1) => {
  loadingEntries.value = true
  entryPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: pageSize })
    if (entryStatusFilter.value !== 'all') params.set('status', entryStatusFilter.value)
    if (filterCompetitionId.value) params.set('competitionId', filterCompetitionId.value)
    const res = await api.get(`/admin/competitions/entries?${params}`)
    entries.value = res.entries
    entryTotalPages.value = res.totalPages
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loadingEntries.value = false
  }
}

const loadRanking = async () => {
  if (!rankingCompetitionId.value) { rankingData.value = []; return }
  loadingRanking.value = true
  try {
    const res = await api.get(`/admin/competitions/ranking/${rankingCompetitionId.value}`)
    rankingData.value = res.ranking
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loadingRanking.value = false
  }
}

const approveCompetition = async (c) => {
  if (!confirm(`确定审核通过《${c.title}》吗？`)) return
  try {
    await api.post(`/admin/competitions/${c.id}/publish`)
    showToast('已通过并发布', 'success')
    loadCompetitions(page.value)
    loadStats()
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const rejectCompetition = async (c) => {
  const reason = prompt('请输入驳回原因')
  if (reason === null) return
  try {
    await api.post(`/admin/competitions/${c.id}/reject`, { reason })
    showToast('已驳回', 'success')
    loadCompetitions(page.value)
    loadStats()
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const publishCompetition = async (c) => {
  if (!confirm(`确定发布《${c.title}》吗？`)) return
  try {
    await api.post(`/admin/competitions/${c.id}/publish`)
    showToast('发布成功', 'success')
    loadCompetitions(page.value)
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const completeCompetition = async (c) => {
  if (!confirm(`确定结束比赛《${c.title}》吗？`)) return
  try {
    await api.post(`/admin/competitions/${c.id}/complete`)
    showToast('比赛已结束', 'success')
    loadCompetitions(page.value)
    loadStats()
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const toggleFeature = async (c) => {
  try {
    await api.post(`/admin/competitions/${c.id}/feature`)
    showToast(c.isFeatured ? '已取消精选' : '已设为精选', 'success')
    loadCompetitions(page.value)
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const deleteCompetition = async (c) => {
  if (!confirm(`确定删除《${c.title}》吗？此操作不可恢复。`)) return
  try {
    await api.delete(`/admin/competitions/${c.id}`)
    showToast('删除成功', 'success')
    loadCompetitions(page.value)
    loadStats()
  } catch (e) { showToast(e.error || '删除失败', 'error') }
}

const approveEntry = async (e) => {
  if (!confirm(`确定通过《${e.title}》吗？`)) return
  try {
    await api.put(`/admin/competitions/entries/${e.id}/approve`)
    showToast('已通过', 'success')
    loadEntries(entryPage.value)
  } catch (e2) { showToast(e2.error || '操作失败', 'error') }
}

const rejectEntry = async (e) => {
  const reason = prompt('请输入驳回原因')
  if (reason === null) return
  try {
    await api.put(`/admin/competitions/entries/${e.id}/reject`, { reason })
    showToast('已驳回', 'success')
    loadEntries(entryPage.value)
  } catch (e2) { showToast(e2.error || '操作失败', 'error') }
}

const openScoreModal = (entry) => {
  scoringEntry.value = entry
  scoreForm.value = { score: 80, comment: '' }
  showScoreModal.value = true
}

const submitScore = async () => {
  if (!scoringEntry.value) return
  if (scoreForm.value.score < 0 || scoreForm.value.score > 100) {
    showToast('评分须在 0-100 之间', 'error')
    return
  }
  submitting.value = true
  try {
    await api.post(`/admin/competitions/entries/${scoringEntry.value.id}/score`, scoreForm.value)
    showScoreModal.value = false
    showToast('评分成功', 'success')
    loadEntries(entryPage.value)
  } catch (e) {
    showToast(e.error || '评分失败', 'error')
  } finally {
    submitting.value = false
  }
}

const viewEntryDetail = (entry) => {
  detailEntry.value = entry
  showDetailModal.value = true
}

const publishResult = async () => {
  if (!rankingCompetitionId.value) return
  if (!confirm('确定公示该比赛结果吗？公示后将通知所有参赛者。')) return
  try {
    await api.post(`/admin/competitions/${rankingCompetitionId.value}/publish-result`)
    showToast('结果已公示', 'success')
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.admin-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: var(--bg-secondary);
  padding: 8px;
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.admin-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.admin-tab:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.admin-tab.active { background: var(--accent); color: #fff; font-weight: 500; }
.tab-icon { font-size: 18px; }
.tab-badge {
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 100px;
  font-weight: 600;
}

.section { margin-bottom: 32px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.stat-card { padding: 20px; display: flex; gap: 16px; align-items: center; }
.stat-icon { font-size: 36px; }
.stat-info { flex: 1; }
.stat-value { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.stat-label { font-size: 13px; color: var(--text-secondary); }

.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.gap-sm { gap: 8px; }
.mb { margin-bottom: 16px; }

.admin-list { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; }
.admin-table th, .admin-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}
.admin-table th { background: var(--bg-tertiary); font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.admin-table td { font-size: 14px; }

.thumb-cover {
  width: 48px;
  height: 36px;
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 4px;
}

.badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.badge-gray { background: #f5f5f5; color: #8c8c8c; }
.badge-orange { background: #fff7e6; color: #d48806; }
.badge-blue { background: #e6f7ff; color: #1890ff; }
.badge-green { background: #f6ffed; color: #52c41a; }
.badge-red { background: #fff1f0; color: #cf1322; }

.text-sm { font-size: 12px; }
.accent { color: var(--accent); }
.font-medium { font-weight: 500; }
.font-bold { font-weight: 700; }

.user-cell { display: flex; align-items: center; gap: 8px; }
.user-cell img { width: 24px; height: 24px; border-radius: 50%; background: var(--bg-tertiary); }

.danger-btn { color: var(--danger) !important; }
.top-row { background: linear-gradient(135deg, #fffbe6, #fff7e6); }

.score-details { display: flex; flex-wrap: wrap; gap: 4px; }
.score-chip {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}

.pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; }
.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-secondary); }

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
.modal-body { padding: 24px; overflow-y: auto; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  margin-top: 8px;
}

.entry-preview { padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius-sm); font-size: 14px; line-height: 1.8; }

.existing-scores { margin-top: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm); }
.existing-score-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; border-bottom: 1px solid var(--border-light); }
.existing-score-item:last-child { border-bottom: none; }

.detail-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; font-size: 14px; margin-bottom: 12px; }
.detail-label { color: var(--text-secondary); flex-shrink: 0; }
.detail-value { color: var(--text-primary); text-align: right; flex: 1; word-break: break-all; }
.detail-content { margin-top: 16px; }
.detail-text { margin-top: 8px; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius-sm); white-space: pre-wrap; line-height: 1.8; font-size: 14px; }
.detail-images { margin-top: 16px; }
.image-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.image-grid img { width: 120px; height: 90px; object-fit: cover; border-radius: 6px; }

.required { color: var(--danger); }
</style>
