<template>
  <div class="container">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">我的交换</h1>
        <p class="page-subtitle">管理您发布的交换需求和匹配记录</p>
      </div>
      <router-link to="/swap/new" class="btn btn-primary">
        <span>+</span> 发布新需求
      </router-link>
    </div>

    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        :class="['tab', { active: currentTab === t.id }]"
        @click="currentTab = t.id"
      >
        {{ t.name }}
      </button>
    </div>

    <div v-if="currentTab === 'listings'">
      <div class="filters card" style="padding: 16px 20px; margin-bottom: 24px;">
        <div class="filter-row">
          <span class="filter-label">状态</span>
          <div class="category-tabs">
            <button
              v-for="s in statuses"
              :key="s.id"
              :class="['cat-tab', { active: currentStatus === s.id }]"
              @click="currentStatus = s.id"
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
      <div v-else-if="myListings.length === 0" class="empty-state">
        <div class="empty-state-icon">🔄</div>
        <div class="empty-state-text">暂无交换需求</div>
        <router-link to="/swap/new" class="btn btn-primary">发布第一个需求</router-link>
      </div>
      <div v-else class="my-listings">
        <div v-for="item in myListings" :key="item.id" class="my-listing card">
          <div class="my-listing-cover" :style="item.coverImage ? { backgroundImage: `url(${item.coverImage})` } : {}">
            <div v-if="!item.coverImage" class="my-listing-cover-placeholder">🔄</div>
          </div>
          <div class="my-listing-content">
            <div class="my-listing-header">
              <router-link :to="`/swap/${item.id}`" class="my-listing-title font-serif">
                {{ item.title }}
              </router-link>
              <span class="status-badge" :class="'status-' + item.status.toLowerCase()">
                {{ getStatusLabel(item.status) }}
              </span>
            </div>
            <div class="my-listing-zines">
              <span class="have">📖 有: {{ item.haveZineTitle || '未指定' }}</span>
              <span class="arrow">→</span>
              <span class="want">🎯 求: {{ item.wantZineTitle || '未指定' }}</span>
            </div>
            <div v-if="item.rejectionReason" class="my-listing-reason">
              ⚠️ 驳回原因: {{ item.rejectionReason }}
            </div>
            <div class="my-listing-meta">
              <span>🤝 {{ item.matchCount }} 匹配</span>
              <span>👁 {{ formatNum(item.viewCount) }} 浏览</span>
              <span>📅 {{ formatDate(item.createdAt) }}</span>
              <span v-if="item.reviewer" class="reviewer">审核: {{ item.reviewer?.username }}</span>
            </div>
          </div>
          <div class="my-listing-actions">
            <router-link :to="`/swap/${item.id}`" class="btn btn-outline btn-sm">查看</router-link>
            <router-link v-if="['DRAFT', 'REJECTED'].includes(item.status)" :to="`/swap/${item.id}/edit`" class="btn btn-outline btn-sm">编辑</router-link>
            <button v-if="['DRAFT', 'REJECTED'].includes(item.status)" class="btn btn-primary btn-sm" @click="resubmit(item.id)">提交</button>
            <button v-if="item.status === 'PUBLISHED'" class="btn btn-outline btn-sm" @click="closeListing(item.id)">关闭</button>
            <button class="btn btn-ghost btn-sm" @click="deleteListing(item.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'matches'">
      <div class="filters card" style="padding: 16px 20px; margin-bottom: 24px;">
        <div class="filter-row">
          <span class="filter-label">状态</span>
          <div class="category-tabs">
            <button
              v-for="s in matchStatuses"
              :key="s.id"
              :class="['cat-tab', { active: currentMatchStatus === s.id }]"
              @click="currentMatchStatus = s.id"
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
      <div v-else-if="myMatches.length === 0" class="empty-state">
        <div class="empty-state-icon">💬</div>
        <div class="empty-state-text">暂无匹配记录</div>
        <router-link to="/swap" class="btn btn-primary">去市集看看</router-link>
      </div>
      <div v-else class="matches-list">
        <router-link
          v-for="m in myMatches"
          :key="m.id"
          :to="`/swap-matches/${m.id}`"
          class="match-card card"
        >
          <div class="match-users">
            <div class="match-user">
              <img :src="m.initiator?.avatar" alt="">
              <span>{{ m.initiator?.username }}</span>
            </div>
            <div class="match-arrow">🤝</div>
            <div class="match-user">
              <img :src="m.responder?.avatar" alt="">
              <span>{{ m.responder?.username }}</span>
            </div>
          </div>
          <div class="match-content">
            <div class="match-listing">
              <span class="listing-label">我的</span>
              <span class="listing-name">{{ getMyListing(m).title }}</span>
            </div>
            <div class="match-listing">
              <span class="listing-label">对方</span>
              <span class="listing-name">{{ getOtherListing(m).title }}</span>
            </div>
          </div>
          <div class="match-footer">
            <span class="match-status" :class="'match-status-' + m.status.toLowerCase()">
              {{ getMatchStatusLabel(m.status) }}
            </span>
            <span class="match-score" :style="{ background: getScoreColor(m.matchScore) }">
              {{ Math.round(m.matchScore) }}%
            </span>
            <span class="match-date">{{ formatDate(m.createdAt) }}</span>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/utils/api'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const currentTab = ref('listings')
const currentStatus = ref('all')
const currentMatchStatus = ref('all')
const listingsLoading = ref(false)
const matchesLoading = ref(false)
const myListings = ref([])
const myMatches = ref([])

const tabs = [
  { id: 'listings', name: '我的需求' },
  { id: 'matches', name: '匹配记录' }
]

const statuses = [
  { id: 'all', name: '全部' },
  { id: 'DRAFT', name: '草稿' },
  { id: 'PENDING_REVIEW', name: '审核中' },
  { id: 'PUBLISHED', name: '已发布' },
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

const formatNum = (n) => {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n
}

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

const getScoreColor = (score) => {
  if (score >= 70) return 'linear-gradient(135deg, #11998e, #38ef7d)'
  if (score >= 40) return 'linear-gradient(135deg, #f093fb, #f5576c)'
  return 'linear-gradient(135deg, #667eea, #764ba2)'
}

const getMyListing = (m) => {
  return m.initiatorId === authStore.user?.id ? m.listingA : m.listingB
}

const getOtherListing = (m) => {
  return m.initiatorId === authStore.user?.id ? m.listingB : m.listingA
}

const fetchListings = async () => {
  listingsLoading.value = true
  try {
    const params = new URLSearchParams()
    if (currentStatus.value !== 'all') params.set('status', currentStatus.value)
    const res = await api.get(`/swap-listings/mine?${params}`)
    myListings.value = res.listings
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
    const res = await api.get(`/swap-matches?${params}`)
    myMatches.value = res.matches
  } catch (e) {
    console.error(e)
  } finally {
    matchesLoading.value = false
  }
}

const resubmit = async (id) => {
  if (!confirm('确定要重新提交审核吗？')) return
  try {
    const res = await api.post(`/swap-listings/${id}/resubmit`)
    alert(res.message)
    fetchListings()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

const closeListing = async (id) => {
  if (!confirm('确定要关闭此交换需求吗？')) return
  try {
    const res = await api.post(`/swap-listings/${id}/close`)
    alert(res.message)
    fetchListings()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

const deleteListing = async (id) => {
  if (!confirm('确定要删除吗？此操作不可恢复')) return
  try {
    await api.delete(`/swap-listings/${id}`)
    alert('删除成功')
    fetchListings()
  } catch (e) {
    alert(e.error || '删除失败')
  }
}

watch(currentStatus, () => {
  if (currentTab.value === 'listings') fetchListings()
})

watch(currentMatchStatus, () => {
  if (currentTab.value === 'matches') fetchMatches()
})

onMounted(() => {
  fetchListings()
})

watch(currentTab, (tab) => {
  if (tab === 'listings') fetchListings()
  if (tab === 'matches') fetchMatches()
})
</script>

<style scoped>
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }

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
  transition: all 0.2s;
}

.tab:hover {
  color: var(--text-primary);
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

.my-listings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.my-listing {
  display: flex;
  padding: 16px;
  gap: 16px;
}

.my-listing-cover {
  width: 100px;
  height: 72px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
  overflow: hidden;
}

.my-listing-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 32px;
  opacity: 0.3;
}

.my-listing-content {
  flex: 1;
  min-width: 0;
}

.my-listing-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.my-listing-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.my-listing-title:hover {
  color: var(--accent);
}

.status-badge {
  padding: 2px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.status-draft { background: #e9ecef; color: #495057; }
.status-pending_review { background: #fff3cd; color: #856404; }
.status-published { background: #d4edda; color: #155724; }
.status-rejected { background: #f8d7da; color: #721c24; }
.status-closed { background: #e9ecef; color: #495057; }
.status-completed { background: #d1ecf1; color: #0c5460; }

.my-listing-zines {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.my-listing-zines .arrow {
  color: var(--text-tertiary);
}

.my-listing-zines .have {
  background: #e3f2fd;
  color: #1565c0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.my-listing-zines .want {
  background: #fce4ec;
  color: #c2185b;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.my-listing-reason {
  font-size: 12px;
  color: #c53030;
  margin-bottom: 6px;
}

.my-listing-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}

.my-listing-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.matches-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.match-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  transition: transform 0.2s;
}

.match-card:hover {
  transform: translateY(-2px);
}

.match-users {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.match-user {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.match-user img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.match-arrow {
  font-size: 20px;
}

.match-content {
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.match-listing {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.match-listing + .match-listing {
  margin-top: 6px;
}

.listing-label {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
  flex-shrink: 0;
}

.listing-name {
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.match-status {
  padding: 2px 10px;
  border-radius: 100px;
  font-weight: 600;
}

.match-status-pending { background: #fff3cd; color: #856404; }
.match-status-confirmed { background: #d4edda; color: #155724; }
.match-status-completed { background: #d1ecf1; color: #0c5460; }
.match-status-rejected { background: #f8d7da; color: #721c24; }
.match-status-cancelled { background: #e9ecef; color: #495057; }

.match-score {
  padding: 2px 10px;
  border-radius: 100px;
  color: #fff;
  font-weight: 600;
}

.match-date {
  color: var(--text-tertiary);
}
</style>
