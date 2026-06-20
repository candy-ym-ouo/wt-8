<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">交换市集管理</h1>
      <p class="page-subtitle">审核交换需求、管理匹配记录</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card card">
        <div class="stat-label">总交换需求</div>
        <div class="stat-value">{{ stats.totalListings || 0 }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">已发布</div>
        <div class="stat-value published">{{ stats.publishedListings || 0 }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">待审核</div>
        <div class="stat-value pending">{{ stats.pendingReviewListings || 0 }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">已驳回</div>
        <div class="stat-value rejected">{{ stats.rejectedListings || 0 }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">总匹配数</div>
        <div class="stat-value">{{ stats.totalMatches || 0 }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">成功率</div>
        <div class="stat-value completed">{{ stats.matchSuccessRate || 0 }}%</div>
      </div>
    </div>

    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        :class="['tab', { active: currentTab === t.id }]"
        @click="currentTab = t.id"
      >
        {{ t.name }}
        <span v-if="t.id === 'listings' && stats.pendingReviewListings" class="tab-badge">
          {{ stats.pendingReviewListings }}
        </span>
      </button>
    </div>

    <div v-if="currentTab === 'listings'">
      <div class="filters card" style="padding: 16px 20px; margin-bottom: 20px;">
        <div class="filter-row">
          <span class="filter-label">状态</span>
          <div class="category-tabs">
            <button
              v-for="s in statuses"
              :key="s.id"
              :class="['cat-tab', { active: currentStatus === s.id }]"
              @click="currentStatus = s.id; fetchListings()"
            >
              {{ s.name }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="listingsLoading" class="empty-state">
        <div class="empty-state-icon">⏳</div>
        <div class="empty-state-text">加载中...</div>
      </div>
      <div v-else class="admin-table card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>标题</th>
              <th>发布者</th>
              <th>分类</th>
              <th>状态</th>
              <th>匹配/浏览</th>
              <th>审核人</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in listings" :key="item.id">
              <td>{{ item.id }}</td>
              <td>
                <a class="link" @click="viewListing(item.id)">{{ item.title }}</a>
              </td>
              <td>{{ item.creator?.username }}</td>
              <td>{{ getCategoryLabel(item.category) }}</td>
              <td>
                <span class="status-tag" :class="'status-' + item.status.toLowerCase()">
                  {{ getStatusLabel(item.status) }}
                </span>
              </td>
              <td>{{ item.matchCount }} / {{ item.viewCount }}</td>
              <td>{{ item.reviewer?.username || '-' }}</td>
              <td>{{ formatDate(item.createdAt) }}</td>
              <td class="actions-cell">
                <button v-if="item.status === 'PENDING_REVIEW'" class="btn btn-primary btn-sm" @click="publishListing(item.id)">
                  通过
                </button>
                <button v-if="item.status === 'PENDING_REVIEW'" class="btn btn-outline btn-sm" @click="showRejectModal(item)">
                  驳回
                </button>
                <button v-if="item.status === 'PUBLISHED'" class="btn btn-outline btn-sm" @click="unpublishListing(item.id)">
                  下架
                </button>
                <button class="btn btn-ghost btn-sm" @click="deleteListing(item)">
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'matches'">
      <div class="filters card" style="padding: 16px 20px; margin-bottom: 20px;">
        <div class="filter-row">
          <span class="filter-label">状态</span>
          <div class="category-tabs">
            <button
              v-for="s in matchStatuses"
              :key="s.id"
              :class="['cat-tab', { active: currentMatchStatus === s.id }]"
              @click="currentMatchStatus = s.id; fetchMatches()"
            >
              {{ s.name }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="matchesLoading" class="empty-state">
        <div class="empty-state-icon">⏳</div>
        <div class="empty-state-text">加载中...</div>
      </div>
      <div v-else class="admin-table card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>发起者</th>
              <th>对方</th>
              <th>需求A</th>
              <th>需求B</th>
              <th>匹配度</th>
              <th>状态</th>
              <th>消息数</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in matches" :key="m.id">
              <td>{{ m.id }}</td>
              <td>{{ m.initiator?.username }}</td>
              <td>{{ m.responder?.username }}</td>
              <td>
                <a class="link" @click="viewListing(m.listingAId)">{{ m.listingA?.title }}</a>
              </td>
              <td>
                <a class="link" @click="viewListing(m.listingBId)">{{ m.listingB?.title }}</a>
              </td>
              <td>
                <span class="match-score" :style="{ background: getScoreColor(m.matchScore) }">
                  {{ Math.round(m.matchScore) }}%
                </span>
              </td>
              <td>
                <span class="status-tag" :class="'status-' + m.status.toLowerCase()">
                  {{ getMatchStatusLabel(m.status) }}
                </span>
              </td>
              <td>{{ m._count?.messages }}</td>
              <td>{{ formatDate(m.createdAt) }}</td>
              <td class="actions-cell">
                <button class="btn btn-ghost btn-sm" @click="deleteMatch(m)">
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showRejectDialog" class="modal-overlay" @click.self="showRejectDialog = false">
      <div class="modal card">
        <h3 class="modal-title">驳回交换需求</h3>
        <p class="modal-desc">《{{ currentRejectItem?.title }}》</p>
        <textarea
          v-model="rejectReason"
          rows="4"
          class="form-input"
          placeholder="请输入驳回原因"
        ></textarea>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showRejectDialog = false">取消</button>
          <button class="btn btn-primary" @click="confirmReject">确认驳回</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const currentTab = ref('listings')
const currentStatus = ref('all')
const currentMatchStatus = ref('all')
const stats = ref({})
const listings = ref([])
const matches = ref([])
const listingsLoading = ref(false)
const matchesLoading = ref(false)
const showRejectDialog = ref(false)
const currentRejectItem = ref(null)
const rejectReason = ref('')

const tabs = [
  { id: 'listings', name: '交换需求' },
  { id: 'matches', name: '匹配记录' }
]

const statuses = [
  { id: 'all', name: '全部' },
  { id: 'PENDING_REVIEW', name: '待审核' },
  { id: 'PUBLISHED', name: '已发布' },
  { id: 'DRAFT', name: '草稿' },
  { id: 'REJECTED', name: '已驳回' },
  { id: 'CLOSED', name: '已关闭' },
  { id: 'COMPLETED', name: '已完成' }
]

const matchStatuses = [
  { id: 'all', name: '全部' },
  { id: 'PENDING', name: '待确认' },
  { id: 'CONFIRMED', name: '已确认' },
  { id: 'COMPLETED', name: '已完成' },
  { id: 'REJECTED', name: '已拒绝' },
  { id: 'CANCELLED', name: '已取消' }
]

const formatDate = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

const getStatusLabel = (s) => {
  const labels = {
    DRAFT: '草稿', PENDING_REVIEW: '审核中', PUBLISHED: '已发布',
    REJECTED: '已驳回', CLOSED: '已关闭', COMPLETED: '已完成'
  }
  return labels[s] || s
}

const getMatchStatusLabel = (s) => {
  const labels = {
    PENDING: '待确认', CONFIRMED: '已确认', COMPLETED: '已完成',
    REJECTED: '已拒绝', CANCELLED: '已取消'
  }
  return labels[s] || s
}

const getCategoryLabel = (c) => {
  const labels = { ZINE: 'Zine', COMIC: '漫画', PHOTO: '摄影', POETRY: '诗集', ART: '艺术', OTHER: '其他' }
  return labels[c] || c
}

const getScoreColor = (score) => {
  if (score >= 70) return 'linear-gradient(135deg, #11998e, #38ef7d)'
  if (score >= 40) return 'linear-gradient(135deg, #f093fb, #f5576c)'
  return 'linear-gradient(135deg, #667eea, #764ba2)'
}

const fetchStats = async () => {
  try {
    const res = await api.get('/admin/swaps/stats')
    stats.value = res.stats
  } catch (e) {
    console.error(e)
  }
}

const fetchListings = async () => {
  listingsLoading.value = true
  try {
    const params = new URLSearchParams()
    if (currentStatus.value !== 'all') params.set('status', currentStatus.value)
    const res = await api.get(`/admin/swaps/overview?${params}`)
    listings.value = res.listings
  } catch (e) {
    console.error(e)
  } finally {
    listingsLoading.value = false
  }
}

const fetchMatches = async () => {
  matchesLoading.value = true
  try {
    const params = new URLSearchParams()
    if (currentMatchStatus.value !== 'all') params.set('status', currentMatchStatus.value)
    const res = await api.get(`/admin/swaps/matches?${params}`)
    matches.value = res.matches
  } catch (e) {
    console.error(e)
  } finally {
    matchesLoading.value = false
  }
}

const viewListing = (id) => {
  router.push(`/swap/${id}`)
}

const publishListing = async (id) => {
  if (!confirm('确认审核通过并发布？')) return
  try {
    await api.post(`/admin/swaps/listings/${id}/publish`)
    alert('发布成功')
    fetchStats()
    fetchListings()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

const showRejectModal = (item) => {
  currentRejectItem.value = item
  rejectReason.value = ''
  showRejectDialog.value = true
}

const confirmReject = async () => {
  try {
    await api.post(`/admin/swaps/listings/${currentRejectItem.value.id}/reject`, {
      reason: rejectReason.value
    })
    alert('已驳回')
    showRejectDialog.value = false
    fetchStats()
    fetchListings()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

const unpublishListing = async (id) => {
  if (!confirm('确认下架此交换需求？')) return
  try {
    await api.post(`/admin/swaps/listings/${id}/unpublish`)
    alert('已下架')
    fetchStats()
    fetchListings()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

const deleteListing = async (item) => {
  if (!confirm(`确认删除《${item.title}》？此操作不可恢复`)) return
  try {
    await api.delete(`/admin/swaps/listings/${item.id}`)
    alert('删除成功')
    fetchStats()
    fetchListings()
  } catch (e) {
    alert(e.error || '删除失败')
  }
}

const deleteMatch = async (m) => {
  if (!confirm('确认删除此匹配记录？')) return
  try {
    await api.delete(`/admin/swaps/matches/${m.id}`)
    alert('删除成功')
    fetchStats()
    fetchMatches()
  } catch (e) {
    alert(e.error || '删除失败')
  }
}

onMounted(() => {
  fetchStats()
  fetchListings()
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 20px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-value.published { color: #28a745; }
.stat-value.pending { color: #ffc107; }
.stat-value.rejected { color: #dc3545; }
.stat-value.completed { color: #17a2b8; }

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
}

.tab {
  padding: 12px 24px;
  background: none;
  border: none;
  font-size: 15px;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab.active {
  color: var(--accent);
  font-weight: 600;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
}

.tab-badge {
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 100px;
  font-weight: 600;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 48px;
}

.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cat-tab {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  background: var(--bg-tertiary);
  border-radius: 100px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.cat-tab:hover { color: var(--text-primary); }
.cat-tab.active {
  background: var(--accent);
  color: #fff;
}

.admin-table {
  padding: 0;
  overflow: auto;
}

.admin-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.admin-table th,
.admin-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.admin-table th {
  background: var(--bg-tertiary);
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 12px;
  text-transform: uppercase;
}

.admin-table tr:hover td {
  background: var(--bg-tertiary);
}

.link {
  color: var(--accent);
  cursor: pointer;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}

.status-tag {
  padding: 2px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  display: inline-block;
}

.status-draft { background: #e9ecef; color: #495057; }
.status-pending_review { background: #fff3cd; color: #856404; }
.status-published { background: #d4edda; color: #155724; }
.status-rejected { background: #f8d7da; color: #721c24; }
.status-closed { background: #e9ecef; color: #495057; }
.status-completed { background: #d1ecf1; color: #0c5460; }
.status-pending { background: #fff3cd; color: #856404; }
.status-confirmed { background: #d4edda; color: #155724; }
.status-cancelled { background: #e9ecef; color: #495057; }

.match-score {
  padding: 2px 10px;
  border-radius: 100px;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: inline-block;
}

.actions-cell {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 500px;
  padding: 28px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.modal-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 14px;
  font-family: inherit;
  margin-bottom: 20px;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
