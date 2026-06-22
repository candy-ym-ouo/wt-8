<template>
  <div class="container">
    <div class="page-header">
      <div>
        <h1 class="page-title">创作档案</h1>
        <p class="page-subtitle">汇总你的创作成果与数据统计</p>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="text-lg text-muted">加载中...</div>
    </div>

    <div v-else class="portfolio-layout">
      <div class="portfolio-main">
        <div class="portfolio-header card">
          <div class="creator-info">
            <img :src="portfolioData?.overview?.user?.avatar" class="creator-avatar" alt="">
            <div class="creator-basic">
              <h2 class="creator-name font-serif">{{ portfolioData?.overview?.user?.username }}</h2>
              <p class="creator-bio">{{ portfolioData?.overview?.user?.bio || '这位创作者很懒，什么都没写~' }}</p>
              <div class="creator-meta">
                <span class="meta-item">📅 加入于 {{ formatDate(portfolioData?.overview?.user?.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-overview" :class="{ 'stats-4': !isOwner }">
          <div class="stat-card card">
            <div class="stat-icon">📚</div>
            <div class="stat-content">
              <div class="stat-number">{{ portfolioData?.overview?.stats?.publishedZines || 0 }}</div>
              <div class="stat-label">已发布刊物</div>
            </div>
          </div>
          <div v-if="isOwner" class="stat-card card">
            <div class="stat-icon">📝</div>
            <div class="stat-content">
              <div class="stat-number">{{ portfolioData?.overview?.stats?.approvedSubmissions || 0 }}</div>
              <div class="stat-label">通过投稿</div>
            </div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon">❤️</div>
            <div class="stat-content">
              <div class="stat-number">{{ formatNum(portfolioData?.overview?.stats?.totalZineLikes || 0) }}</div>
              <div class="stat-label">总获赞数</div>
            </div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon">👁️</div>
            <div class="stat-content">
              <div class="stat-number">{{ formatNum(portfolioData?.overview?.stats?.totalZineViews || 0) }}</div>
              <div class="stat-label">总阅读量</div>
            </div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon">✨</div>
            <div class="stat-content">
              <div class="stat-number">{{ portfolioData?.overview?.stats?.followerCount || 0 }}</div>
              <div class="stat-label">关注者</div>
            </div>
          </div>
          <div v-if="isOwner" class="stat-card card">
            <div class="stat-icon">⭐</div>
            <div class="stat-content">
              <div class="stat-number">{{ portfolioData?.overview?.stats?.subscriptionCount || 0 }}</div>
              <div class="stat-label">刊物订阅</div>
            </div>
          </div>
        </div>

        <div class="section-tabs">
          <button
            v-for="t in visibleTabs"
            :key="t.value"
            :class="['section-tab', { active: currentTab === t.value }]"
            @click="switchTab(t.value)"
          >
            <span class="tab-icon">{{ t.icon }}</span>
            <span>{{ t.label }}</span>
          </button>
        </div>

        <div v-if="currentTab === 'zines'" class="section-content">
          <div class="section-header">
            <h3 class="section-title">我的刊物</h3>
            <div class="sort-options">
              <select v-model="zineSort" class="form-input form-input-sm" @change="loadZines(1)">
                <option value="newest">最新发布</option>
                <option value="popular">最受欢迎</option>
                <option value="liked">最多点赞</option>
              </select>
            </div>
          </div>

          <div v-if="loadingZines" class="empty-state"><div class="empty-state-icon">⏳</div></div>
          <div v-else-if="zinesList.length === 0" class="empty-state card" style="padding: 48px;">
            <div class="empty-state-icon">📖</div>
            <div class="empty-state-text">还没有发布任何刊物</div>
          </div>
          <div v-else class="zine-grid">
            <ZineCard v-for="zine in zinesList" :key="zine.id" :zine="zine" />
          </div>

          <div v-if="zineTotalPages > 1" class="pagination">
            <button class="page-btn" @click="loadZines(zinePage - 1)" :disabled="zinePage <= 1">上一页</button>
            <span class="page-info">第 {{ zinePage }} / {{ zineTotalPages }} 页</span>
            <button class="page-btn" @click="loadZines(zinePage + 1)" :disabled="zinePage >= zineTotalPages">下一页</button>
          </div>
        </div>

        <div v-if="currentTab === 'submissions'" class="section-content">
          <div class="section-header">
            <h3 class="section-title">投稿记录</h3>
          </div>

          <div class="submission-stats">
            <div
              v-for="(count, status) in submissionStats"
              :key="status"
              :class="['sub-stat-card', { active: subStatusFilter === status }]"
              @click="subStatusFilter = status; loadSubmissions(1)"
            >
              <div class="sub-stat-num">{{ count }}</div>
              <div class="sub-stat-label">{{ getStatusLabel(status) }}</div>
            </div>
          </div>

          <div v-if="loadingSubmissions" class="empty-state"><div class="empty-state-icon">⏳</div></div>
          <div v-else-if="submissionsList.length === 0" class="empty-state card" style="padding: 48px;">
            <div class="empty-state-icon">📝</div>
            <div class="empty-state-text">暂无投稿记录</div>
          </div>
          <div v-else class="submission-list">
            <div v-for="sub in submissionsList" :key="sub.id" class="submission-item card">
              <div class="submission-header">
                <h4 class="submission-title">{{ sub.title }}</h4>
                <span :class="['status-badge', `status-${sub.status.toLowerCase()}`]">
                  {{ getStatusLabel(sub.status) }}
                </span>
              </div>
              <div class="submission-preview">
                <p>{{ sub.content?.slice(0, 120) }}...</p>
              </div>
              <div class="submission-footer">
                <span class="text-sm text-tertiary">投稿于 {{ formatDate(sub.createdAt) }}</span>
                <router-link :to="`/submissions/${sub.id}/edit`" class="text-sm" v-if="sub.status === 'DRAFT'">
                  继续编辑 →
                </router-link>
              </div>
            </div>
          </div>

          <div v-if="subTotalPages > 1" class="pagination">
            <button class="page-btn" @click="loadSubmissions(subPage - 1)" :disabled="subPage <= 1">上一页</button>
            <span class="page-info">第 {{ subPage }} / {{ subTotalPages }} 页</span>
            <button class="page-btn" @click="loadSubmissions(subPage + 1)" :disabled="subPage >= subTotalPages">下一页</button>
          </div>
        </div>

        <div v-if="currentTab === 'likes'" class="section-content">
          <div class="section-header">
            <h3 class="section-title">获赞数据</h3>
            <div class="filter-options">
              <select v-model="likesPeriod" class="form-input form-input-sm" @change="loadLikesStats">
                <option value="week">本周</option>
                <option value="month">本月</option>
                <option value="year">本年</option>
              </select>
            </div>
          </div>

          <div class="likes-summary">
            <div class="like-summary-card card">
              <div class="like-summary-icon">❤️</div>
              <div>
                <div class="like-summary-num">{{ formatNum(likesData?.totalLikes || 0) }}</div>
                <div class="like-summary-label">总获赞数</div>
              </div>
            </div>
            <div class="like-summary-card card">
              <div class="like-summary-icon">👁️</div>
              <div>
                <div class="like-summary-num">{{ formatNum(likesData?.totalViews || 0) }}</div>
                <div class="like-summary-label">总阅读量</div>
              </div>
            </div>
          </div>

          <div class="likes-ranking card">
            <h4 class="ranking-title">🏆 刊物点赞排行</h4>
            <div v-if="!likesData?.zineLikesRanking?.length" class="empty-state" style="padding: 24px;">
              <div class="empty-state-text text-sm">暂无数据</div>
            </div>
            <div v-else class="ranking-list">
              <div v-for="(zine, index) in likesData?.zineLikesRanking" :key="zine.id" class="ranking-item">
                <span :class="['ranking-num', { top: index < 3 }]">{{ index + 1 }}</span>
                <img :src="zine.coverImage" class="ranking-cover" alt="">
                <div class="ranking-info">
                  <div class="ranking-title-text">{{ zine.title }}</div>
                  <div class="ranking-stats">
                    <span>❤️ {{ formatNum(zine.likes) }}</span>
                    <span>👁 {{ formatNum(zine.views) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="recent-comments card">
            <h4 class="ranking-title">💬 最新评论</h4>
            <div v-if="!likesData?.recentComments?.length" class="empty-state" style="padding: 24px;">
              <div class="empty-state-text text-sm">暂无评论</div>
            </div>
            <div v-else class="comment-list">
              <div v-for="comment in likesData?.recentComments" :key="comment.id" class="comment-item">
                <img :src="comment.user?.avatar" class="comment-avatar" alt="">
                <div class="comment-content">
                  <div class="comment-header">
                    <span class="comment-user">{{ comment.user?.username }}</span>
                    <span class="comment-zine">评论于《{{ comment.zine?.title }}》</span>
                  </div>
                  <p class="comment-text">{{ comment.content }}</p>
                  <div class="comment-footer">
                    <span class="text-xs text-tertiary">{{ formatDate(comment.createdAt) }}</span>
                    <span class="comment-likes">❤️ {{ comment.likeCount }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'subscribers'" class="section-content">
          <div class="section-header">
            <h3 class="section-title">订阅增长</h3>
            <div class="filter-options">
              <select v-model="growthPeriod" class="form-input form-input-sm" @change="loadSubscriberGrowth">
                <option value="week">近7天</option>
                <option value="month">近30天</option>
                <option value="year">近一年</option>
              </select>
            </div>
          </div>

          <div class="growth-summary">
            <div class="growth-summary-card card">
              <div class="growth-summary-icon">✨</div>
              <div>
                <div class="growth-summary-num">{{ growthData?.totalFollowers || 0 }}</div>
                <div class="growth-summary-label">关注者总数</div>
              </div>
            </div>
            <div class="growth-summary-card card">
              <div class="growth-summary-icon">⭐</div>
              <div>
                <div class="growth-summary-num">{{ growthData?.totalSubscriptions || 0 }}</div>
                <div class="growth-summary-label">刊物订阅数</div>
              </div>
            </div>
          </div>

          <div class="growth-chart card">
            <h4 class="chart-title">📈 增长趋势</h4>
            <div class="chart-container">
              <div v-if="!growthData?.growthData?.length" class="empty-state" style="padding: 24px;">
                <div class="empty-state-text text-sm">暂无数据</div>
              </div>
              <div v-else class="chart-bars">
                <div
                  v-for="(item, index) in growthData?.growthData"
                  :key="index"
                  class="chart-bar-group"
                >
                  <div class="chart-bars-stack">
                    <div
                      class="chart-bar chart-bar-follower"
                      :style="{ height: getBarHeight(item.followers, 'followers') + '%' }"
                    >
                      <span v-if="item.followers > 0" class="bar-value">{{ item.followers }}</span>
                    </div>
                    <div
                      class="chart-bar chart-bar-subscription"
                      :style="{ height: getBarHeight(item.subscriptions, 'subscriptions') + '%' }"
                    >
                      <span v-if="item.subscriptions > 0" class="bar-value">{{ item.subscriptions }}</span>
                    </div>
                  </div>
                  <div class="chart-label">{{ formatShortDate(item.date) }}</div>
                </div>
              </div>
              <div class="chart-legend">
                <span class="legend-item"><span class="legend-dot legend-follower"></span>新增关注</span>
                <span class="legend-item"><span class="legend-dot legend-subscription"></span>新增订阅</span>
              </div>
            </div>
          </div>

          <div class="tier-breakdown card">
            <h4 class="breakdown-title">📊 订阅等级分布</h4>
            <div class="tier-list">
              <div class="tier-item">
                <div class="tier-info">
                  <span class="tier-name">免费订阅</span>
                  <span class="tier-count">{{ growthData?.tierBreakdown?.FREE || 0 }} 人</span>
                </div>
                <div class="tier-bar-wrap">
                  <div class="tier-bar tier-free" :style="{ width: getTierPercent('FREE') + '%' }"></div>
                </div>
              </div>
              <div class="tier-item">
                <div class="tier-info">
                  <span class="tier-name">标准订阅</span>
                  <span class="tier-count">{{ growthData?.tierBreakdown?.STANDARD || 0 }} 人</span>
                </div>
                <div class="tier-bar-wrap">
                  <div class="tier-bar tier-standard" :style="{ width: getTierPercent('STANDARD') + '%' }"></div>
                </div>
              </div>
              <div class="tier-item">
                <div class="tier-info">
                  <span class="tier-name">高级订阅</span>
                  <span class="tier-count">{{ growthData?.tierBreakdown?.PREMIUM || 0 }} 人</span>
                </div>
                <div class="tier-bar-wrap">
                  <div class="tier-bar tier-premium" :style="{ width: getTierPercent('PREMIUM') + '%' }"></div>
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
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'
import ZineCard from '@/components/ZineCard.vue'

const authStore = useAuthStore()

const loading = ref(true)
const portfolioData = ref(null)

const tabs = [
  { value: 'zines', label: '我的刊物', icon: '📚', private: false },
  { value: 'submissions', label: '投稿记录', icon: '📝', private: true },
  { value: 'likes', label: '获赞数据', icon: '❤️', private: true },
  { value: 'subscribers', label: '订阅增长', icon: '📈', private: true }
]
const currentTab = ref('zines')

const isOwner = computed(() => portfolioData.value?.overview?.isOwner === true)

const visibleTabs = computed(() => {
  if (isOwner.value) return tabs
  return tabs.filter(t => !t.private)
})

const zinesList = ref([])
const zinePage = ref(1)
const zineTotalPages = ref(1)
const zineSort = ref('newest')
const loadingZines = ref(false)

const submissionsList = ref([])
const subPage = ref(1)
const subTotalPages = ref(1)
const subStatusFilter = ref('all')
const loadingSubmissions = ref(false)
const submissionStats = ref({})

const likesData = ref(null)
const likesPeriod = ref('month')

const growthData = ref(null)
const growthPeriod = ref('month')

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatShortDate = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  return `${parts[1]}/${parts[2]}`
}

const formatNum = (n) => {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n
}

const getStatusLabel = (status) => {
  const labels = {
    DRAFT: '草稿',
    PENDING: '审核中',
    SCHEDULED: '已排期',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    WITHDRAWN: '已撤回'
  }
  return labels[status] || status
}

const switchTab = (tab) => {
  currentTab.value = tab
  if (tab === 'zines' && zinesList.value.length === 0) {
    loadZines(1)
  } else if (tab === 'submissions' && submissionsList.value.length === 0) {
    loadSubmissions(1)
  } else if (tab === 'likes' && !likesData.value) {
    loadLikesStats()
  } else if (tab === 'subscribers' && !growthData.value) {
    loadSubscriberGrowth()
  }
}

const loadPortfolio = async () => {
  loading.value = true
  try {
    const res = await api.get('/creator-portfolio/my-portfolio')
    portfolioData.value = res
  } catch (e) {
    console.error('加载创作档案失败', e)
  } finally {
    loading.value = false
  }
}

const loadZines = async (page) => {
  loadingZines.value = true
  try {
    const res = await api.get(`/creator-portfolio/zines/${authStore.user.id}?page=${page}&limit=9&sort=${zineSort.value}`)
    zinesList.value = res.zines
    zinePage.value = res.page
    zineTotalPages.value = res.totalPages
  } catch (e) {
    console.error('加载刊物列表失败', e)
  } finally {
    loadingZines.value = false
  }
}

const loadSubmissions = async (page) => {
  loadingSubmissions.value = true
  try {
    const statusParam = subStatusFilter.value === 'all' ? '' : `&status=${subStatusFilter.value}`
    const res = await api.get(`/creator-portfolio/submissions/${authStore.user.id}?page=${page}&limit=5${statusParam}`)
    submissionsList.value = res.submissions
    subPage.value = res.page
    subTotalPages.value = res.totalPages
    submissionStats.value = res.statusCounts
  } catch (e) {
    console.error('加载投稿记录失败', e)
  } finally {
    loadingSubmissions.value = false
  }
}

const loadLikesStats = async () => {
  try {
    const res = await api.get(`/creator-portfolio/likes-stats/${authStore.user.id}?period=${likesPeriod.value}`)
    likesData.value = res
  } catch (e) {
    console.error('加载获赞数据失败', e)
  }
}

const loadSubscriberGrowth = async () => {
  try {
    const res = await api.get(`/creator-portfolio/subscriber-growth/${authStore.user.id}?period=${growthPeriod.value}`)
    growthData.value = res
  } catch (e) {
    console.error('加载订阅增长数据失败', e)
  }
}

const maxFollowers = computed(() => {
  if (!growthData.value?.growthData) return 1
  return Math.max(1, ...growthData.value.growthData.map(d => d.followers))
})

const maxSubscriptions = computed(() => {
  if (!growthData.value?.growthData) return 1
  return Math.max(1, ...growthData.value.growthData.map(d => d.subscriptions))
})

const getBarHeight = (value, type) => {
  const max = type === 'followers' ? maxFollowers.value : maxSubscriptions.value
  return (value / max) * 100
}

const getTierPercent = (tier) => {
  if (!growthData.value?.tierBreakdown) return 0
  const total = (growthData.value.tierBreakdown.FREE || 0) +
    (growthData.value.tierBreakdown.STANDARD || 0) +
    (growthData.value.tierBreakdown.PREMIUM || 0)
  if (total === 0) return 0
  return ((growthData.value.tierBreakdown[tier] || 0) / total) * 100
}

onMounted(async () => {
  await loadPortfolio()
  await loadZines(1)
})
</script>

<style scoped>
.portfolio-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.portfolio-header {
  padding: 28px;
  margin-bottom: 8px;
}

.creator-info {
  display: flex;
  gap: 20px;
  align-items: center;
}

.creator-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.creator-basic {
  flex: 1;
}

.creator-name {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 6px;
}

.creator-bio {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.creator-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  font-size: 13px;
  color: var(--text-tertiary);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 8px;
}
.stats-overview.stats-4 {
  grid-template-columns: repeat(4, 1fr);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 32px;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.section-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 0;
}

.section-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
}

.section-tab:hover {
  color: var(--text-primary);
}

.section-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 600;
}

.tab-icon {
  font-size: 16px;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.form-input-sm {
  width: 140px;
  height: 36px;
  font-size: 13px;
}

.zine-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.submission-stats {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}

.sub-stat-card {
  padding: 16px;
  text-align: center;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.sub-stat-card:hover {
  border-color: var(--border-light);
}

.sub-stat-card.active {
  border-color: var(--accent);
  background: var(--accent-light);
}

.sub-stat-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.sub-stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.submission-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submission-item {
  padding: 18px;
}

.submission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.submission-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
}

.status-draft {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.status-pending {
  background: #fff7e6;
  color: #d48806;
}

.status-scheduled {
  background: #e6f7ff;
  color: #1890ff;
}

.status-approved {
  background: #f6ffed;
  color: #52c41a;
}

.status-rejected {
  background: #fff1f0;
  color: #f5222d;
}

.status-withdrawn {
  background: #f5f5f5;
  color: #8c8c8c;
}

.submission-preview {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
}

.submission-preview p {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.submission-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid var(--border-light);
}

.likes-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.like-summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.like-summary-icon {
  font-size: 36px;
}

.like-summary-num {
  font-size: 28px;
  font-weight: 700;
}

.like-summary-label {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.likes-ranking,
.recent-comments,
.growth-chart,
.tier-breakdown {
  padding: 24px;
}

.ranking-title,
.chart-title,
.breakdown-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  transition: background 0.2s;
}

.ranking-item:hover {
  background: var(--bg-secondary);
}

.ranking-num {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 50%;
}

.ranking-num.top {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #fff;
}

.ranking-cover {
  width: 48px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  background: var(--bg-tertiary);
}

.ranking-info {
  flex: 1;
  min-width: 0;
}

.ranking-title-text {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ranking-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.comment-item:hover {
  background: var(--bg-secondary);
}

.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 6px;
}

.comment-user {
  font-size: 13px;
  font-weight: 600;
}

.comment-zine {
  font-size: 12px;
  color: var(--text-tertiary);
}

.comment-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 6px 0;
}

.comment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-likes {
  font-size: 12px;
  color: var(--text-tertiary);
}

.growth-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.growth-summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.growth-summary-icon {
  font-size: 36px;
}

.growth-summary-num {
  font-size: 28px;
  font-weight: 700;
}

.growth-summary-label {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.chart-container {
  width: 100%;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 200px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 12px;
  overflow-x: auto;
}

.chart-bar-group {
  flex: 1;
  min-width: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.chart-bars-stack {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 180px;
  width: 100%;
  justify-content: center;
}

.chart-bar {
  width: 12px;
  border-radius: 3px 3px 0 0;
  position: relative;
  min-height: 2px;
  transition: height 0.3s ease;
}

.chart-bar-follower {
  background: linear-gradient(180deg, #52c41a, #73d13d);
}

.chart-bar-subscription {
  background: linear-gradient(180deg, #1890ff, #40a9ff);
}

.bar-value {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.chart-label {
  font-size: 10px;
  color: var(--text-tertiary);
}

.chart-legend {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-follower {
  background: linear-gradient(180deg, #52c41a, #73d13d);
}

.legend-subscription {
  background: linear-gradient(180deg, #1890ff, #40a9ff);
}

.tier-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tier-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tier-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.tier-name {
  font-weight: 500;
}

.tier-count {
  color: var(--text-secondary);
}

.tier-bar-wrap {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.tier-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.tier-free {
  background: linear-gradient(90deg, #bfbfbf, #d9d9d9);
}

.tier-standard {
  background: linear-gradient(90deg, #1890ff, #40a9ff);
}

.tier-premium {
  background: linear-gradient(90deg, #eb2f96, #f759ab);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-light);
  background: var(--bg-card);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  color: var(--text-secondary);
}

@media (max-width: 1024px) {
  .stats-overview {
    grid-template-columns: repeat(3, 1fr);
  }
  .zine-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .submission-stats {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }
  .zine-grid {
    grid-template-columns: 1fr;
  }
  .submission-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .section-tabs {
    overflow-x: auto;
  }
  .section-tab {
    flex-shrink: 0;
  }
}
</style>
