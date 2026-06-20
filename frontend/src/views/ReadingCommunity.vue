<template>
  <div class="container reading-community">
    <section class="hero-section">
      <div class="hero-content">
        <h1>📚 阅读打卡社区</h1>
        <p>每天阅读一点，让文字陪你成长</p>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-num">{{ stats.totalCheckIns || 0 }}</span>
            <span class="stat-label">累计打卡</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">{{ stats.todayCheckIns || 0 }}</span>
            <span class="stat-label">今日打卡</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">{{ stats.totalReviews || 0 }}</span>
            <span class="stat-label">精彩书评</span>
          </div>
        </div>
        <div class="hero-actions">
          <router-link v-if="authStore.isAuthenticated" to="/reading/checkin" class="btn btn-primary btn-lg">
            <span>📖</span> 立即打卡
          </router-link>
          <router-link to="/reading/reviews" class="btn btn-outline btn-lg">
            <span>✨</span> 浏览书评
          </router-link>
        </div>
      </div>
    </section>

    <section v-if="featuredReviews.length > 0" class="featured-section">
      <div class="section-header">
        <h2>🌟 精选书评</h2>
        <router-link to="/reading/reviews" class="link-more">查看全部 →</router-link>
      </div>
      <div class="featured-grid">
        <div v-for="item in featuredReviews" :key="item.id" class="featured-card"
             :style="item.bannerImage ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${item.bannerImage})` } : {}">
          <div class="featured-info">
            <h3 class="featured-title">{{ item.bannerTitle || item.review.title }}</h3>
            <p class="featured-subtitle">{{ item.bannerSubtitle || item.review.bookTitle }}</p>
            <div class="featured-meta">
              <img :src="item.review.user.avatar" class="mini-avatar" alt="">
              <span>{{ item.review.user.username }}</span>
              <span class="dot">·</span>
              <span>❤️ {{ item.review.likeCount || 0 }}</span>
              <span class="dot">·</span>
              <span>💬 {{ item.review.commentCount || 0 }}</span>
            </div>
            <router-link :to="`/reading/reviews/${item.reviewId}`" class="featured-overlay-link"></router-link>
          </div>
        </div>
      </div>
    </section>

    <section class="streak-section">
      <div class="section-header">
        <h2>🔥 连续打卡榜</h2>
      </div>
      <div class="streak-list">
        <div v-for="(user, index) in topUsers" :key="user.userId" class="streak-item">
          <div class="streak-rank" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
          <img :src="user.user.avatar" class="avatar" alt="">
          <div class="streak-info">
            <span class="username">{{ user.user.username }}</span>
            <span class="streak-detail">
              🔥 连续 {{ user.currentStreak }} 天 · 累计 {{ user.totalCheckIns }} 次
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="feed-section">
      <div class="section-header">
        <h2>📝 打卡动态</h2>
        <div class="filter-tabs">
          <button :class="['tab', { active: sortBy === 'newest' }]" @click="sortBy = 'newest'; loadCheckIns()">最新</button>
          <button :class="['tab', { active: sortBy === 'popular' }]" @click="sortBy = 'popular'; loadCheckIns()">最热</button>
        </div>
      </div>

      <div class="checkin-feed">
        <div v-for="ci in checkIns" :key="ci.id" class="checkin-card">
          <div class="checkin-header">
            <img :src="ci.user.avatar" class="avatar" alt="">
            <div class="user-info">
              <span class="username">{{ ci.user.username }}</span>
              <span class="checkin-date">{{ formatDate(ci.checkInDate) }}</span>
            </div>
            <span class="mood-tag">{{ getMoodEmoji(ci.mood) }}</span>
          </div>
          <div class="checkin-book">
            <span class="book-icon">📖</span>
            <span class="book-title">{{ ci.bookTitle }}</span>
            <span v-if="ci.bookAuthor" class="book-author">· {{ ci.bookAuthor }}</span>
          </div>
          <div v-if="ci.pagesRead || ci.minutesRead" class="checkin-stats">
            <span v-if="ci.pagesRead" class="stat"><strong>{{ ci.pagesRead }}</strong> 页</span>
            <span v-if="ci.minutesRead" class="stat"><strong>{{ ci.minutesRead }}</strong> 分钟</span>
          </div>
          <p v-if="ci.note" class="checkin-note">{{ ci.note }}</p>
          <div class="checkin-actions">
            <button class="action-btn" @click="toggleCheckInLike(ci)">
              <span>❤️</span> {{ ci.likeCount || 0 }}
            </button>
            <button class="action-btn" @click="openCheckInComments(ci)">
              <span>💬</span> {{ ci.commentCount || 0 }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="checkIns.length === 0 && !loading" class="empty-state">
        <span class="empty-icon">📚</span>
        <p>暂无打卡动态，成为第一个打卡的人吧！</p>
      </div>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-if="hasMore && !loading" class="load-more">
        <button class="btn btn-outline" @click="loadMore">加载更多</button>
      </div>
    </section>

    <div v-if="showCommentsModal" class="modal-overlay" @click.self="showCommentsModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>评论 ({{ checkInComments.length }})</h3>
          <button class="close-btn" @click="showCommentsModal = false">×</button>
        </div>
        <div class="modal-body">
          <div v-if="authStore.isAuthenticated" class="comment-input">
            <img :src="authStore.user.avatar" class="mini-avatar" alt="">
            <textarea v-model="newComment" placeholder="写下你的评论..." rows="2"></textarea>
            <button class="btn btn-primary btn-sm" @click="submitCheckInComment" :disabled="!newComment.trim()">发送</button>
          </div>
          <div v-else class="comment-login">
            <router-link to="/login">登录后参与评论</router-link>
          </div>
          <div class="comments-list">
            <div v-for="c in checkInComments" :key="c.id" class="comment-item">
              <img :src="c.user.avatar" class="mini-avatar" alt="">
              <div class="comment-content">
                <div class="comment-user">
                  <span class="username">{{ c.user.username }}</span>
                  <span class="comment-time">{{ formatDate(c.createdAt) }}</span>
                </div>
                <p>{{ c.content }}</p>
              </div>
            </div>
            <div v-if="checkInComments.length === 0" class="empty-comments">暂无评论</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'
import { inject } from 'vue'

const showToast = inject('showToast')
const authStore = useAuthStore()
const router = useRouter()

const stats = ref({})
const featuredReviews = ref([])
const topUsers = ref([])
const checkIns = ref([])
const sortBy = ref('newest')
const page = ref(1)
const hasMore = ref(false)
const loading = ref(false)

const showCommentsModal = ref(false)
const currentCheckIn = ref(null)
const checkInComments = ref([])
const newComment = ref('')

const moodMap = {
  HAPPY: '😊', INSPIRED: '💡', MOVED: '🥹', THOUGHTFUL: '🤔',
  RELAXED: '😌', EXCITED: '🤩', CHALLENGED: '🧠'
}

const getMoodEmoji = (mood) => moodMap[mood] || '📖'

const formatDate = (d) => {
  const date = new Date(d)
  const now = new Date()
  const diff = (now - date) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const loadStats = async () => {
  try {
    const res = await api.get('/admin/reading/stats')
    stats.value = res.stats
    topUsers.value = res.topUsers || []
  } catch (e) {}
}

const loadFeatured = async () => {
  try {
    const res = await api.get('/reading-reviews/featured')
    featuredReviews.value = res.featured || []
  } catch (e) {}
}

const loadCheckIns = async (reset = true) => {
  if (reset) {
    page.value = 1
    checkIns.value = []
  }
  loading.value = true
  try {
    const res = await api.get('/reading-checkins', {
      params: { page: page.value, limit: 10, sort: sortBy.value }
    })
    checkIns.value = [...checkIns.value, ...res.checkIns]
    hasMore.value = page.value < res.totalPages
    page.value++
  } catch (e) {}
  loading.value = false
}

const loadMore = () => loadCheckIns(false)

const toggleCheckInLike = async (ci) => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  try {
    const res = await api.post(`/reading-checkins/${ci.id}/like`)
    ci.likeCount = res.likeCount
  } catch (e) {}
}

const openCheckInComments = async (ci) => {
  currentCheckIn.value = ci
  showCommentsModal.value = true
  checkInComments.value = []
  newComment.value = ''
  try {
    const res = await api.get(`/reading-checkins/${ci.id}/comments`)
    checkInComments.value = res.comments
  } catch (e) {}
}

const submitCheckInComment = async () => {
  if (!currentCheckIn.value || !newComment.value.trim()) return
  try {
    const res = await api.post(`/reading-checkins/${currentCheckIn.value.id}/comments`, {
      content: newComment.value
    })
    checkInComments.value.unshift(res.comment)
    currentCheckIn.value.commentCount++
    newComment.value = ''
    showToast('评论成功')
  } catch (e) {
    showToast(e.error || '评论失败', 'error')
  }
}

onMounted(() => {
  loadStats()
  loadFeatured()
  loadCheckIns()
})
</script>

<style scoped>
.reading-community { padding-bottom: 48px; }

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 48px;
  color: #fff;
  margin-bottom: 32px;
}
.hero-content { text-align: center; max-width: 700px; margin: 0 auto; }
.hero-content h1 { font-size: 36px; margin-bottom: 8px; }
.hero-content > p { opacity: 0.9; margin-bottom: 32px; font-size: 16px; }

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 48px;
  margin-bottom: 32px;
}
.stat-item { display: flex; flex-direction: column; gap: 4px; }
.stat-num { font-size: 32px; font-weight: 700; font-family: var(--font-serif); }
.stat-label { opacity: 0.85; font-size: 14px; }

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}
.hero-actions .btn-lg {
  padding: 14px 32px;
  font-size: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.section-header h2 { font-size: 22px; }
.link-more { color: var(--accent); font-size: 14px; }

.featured-section { margin-bottom: 40px; }
.featured-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
.featured-card {
  position: relative;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--accent), #8b5a3c);
  padding: 32px 24px;
  color: #fff;
  min-height: 200px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  background-size: cover;
  background-position: center;
}
.featured-info { position: relative; z-index: 1; width: 100%; }
.featured-title { font-size: 20px; margin-bottom: 4px; font-weight: 700; }
.featured-subtitle { opacity: 0.9; margin-bottom: 12px; font-size: 13px; }
.featured-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  opacity: 0.9;
}
.featured-meta .dot { opacity: 0.6; }
.mini-avatar { width: 20px; height: 20px; border-radius: 50%; }
.featured-overlay-link {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.streak-section { margin-bottom: 40px; }
.streak-list {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 8px;
}
.streak-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
}
.streak-item:hover { background: var(--bg-tertiary); }
.streak-rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}
.streak-rank.rank-1 { background: linear-gradient(135deg, #FFD700, #FFA500); color: #fff; }
.streak-rank.rank-2 { background: linear-gradient(135deg, #C0C0C0, #A0A0A0); color: #fff; }
.streak-rank.rank-3 { background: linear-gradient(135deg, #CD7F32, #B8860B); color: #fff; }
.streak-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.streak-info .username { font-weight: 600; font-size: 14px; }
.streak-detail { font-size: 12px; color: var(--text-secondary); }

.filter-tabs {
  display: flex;
  gap: 8px;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-sm);
}
.tab {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.tab.active { background: var(--accent); color: #fff; }

.checkin-feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.checkin-card {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 20px;
  border: 1px solid var(--border-light);
  transition: border-color 0.2s;
}
.checkin-card:hover { border-color: var(--border); }

.checkin-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.checkin-header .avatar { width: 40px; height: 40px; }
.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.user-info .username { font-weight: 600; font-size: 14px; }
.checkin-date { font-size: 12px; color: var(--text-secondary); }
.mood-tag { font-size: 24px; }

.checkin-book {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
  font-size: 14px;
}
.book-icon { font-size: 18px; }
.book-title { font-weight: 600; }
.book-author { color: var(--text-secondary); }

.checkin-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}
.checkin-stats .stat {
  padding: 6px 12px;
  background: var(--accent-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--accent);
}
.checkin-stats .stat strong { font-weight: 700; }

.checkin-note {
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 12px;
  padding-left: 12px;
  border-left: 3px solid var(--accent-light);
}

.checkin-actions {
  display: flex;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.action-btn:hover { background: var(--bg-tertiary); color: var(--accent); }

.empty-state {
  text-align: center;
  padding: 64px 20px;
  color: var(--text-secondary);
}
.empty-icon { font-size: 64px; display: block; margin-bottom: 16px; }
.loading { text-align: center; padding: 24px; color: var(--text-secondary); }
.load-more { text-align: center; margin-top: 24px; }

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
  background: var(--bg-secondary);
  border-radius: var(--radius);
  width: 100%;
  max-width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}
.modal-header h3 { font-size: 16px; }
.close-btn {
  font-size: 28px;
  line-height: 1;
  color: var(--text-secondary);
  transition: color 0.2s;
}
.close-btn:hover { color: var(--text-primary); }
.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.comment-input {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
}
.comment-input textarea {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  resize: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
}
.comment-input textarea:focus { outline: none; border-color: var(--accent); }

.comment-login {
  text-align: center;
  padding: 16px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
}
.comment-login a { color: var(--accent); }

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.comment-item {
  display: flex;
  gap: 10px;
}
.comment-content {
  flex: 1;
  background: var(--bg-primary);
  padding: 10px 14px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) var(--radius-sm);
}
.comment-user {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.comment-user .username { font-weight: 600; font-size: 13px; }
.comment-time { font-size: 11px; color: var(--text-secondary); }
.comment-content p { font-size: 14px; line-height: 1.6; margin: 0; }
.empty-comments { text-align: center; color: var(--text-secondary); padding: 24px; font-size: 13px; }
</style>
