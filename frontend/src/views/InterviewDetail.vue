<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="!interview" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">访谈不存在或已下架</div>
      <router-link to="/interviews" class="btn btn-outline">返回访谈列表</router-link>
    </div>
    <div v-else class="detail">
      <button class="btn btn-ghost btn-sm back-btn" @click="$router.back()">← 返回</button>

      <div class="detail-hero card">
        <div class="hero-cover">
          <img :src="interview.coverImage" :alt="interview.title">
        </div>
        <div class="hero-content">
          <div class="interview-category">{{ categoryLabel(interview.category) }}</div>
          <h1 class="hero-title font-serif">{{ interview.title }}</h1>
          <p class="hero-desc">{{ interview.description }}</p>

          <div class="interviewer-info" v-if="interview.interviewerName">
            <span class="interviewer-label">采访者：</span>
            <span class="interviewer-name">{{ interview.interviewerName }}</span>
          </div>

          <div class="hero-tags">
            <span v-for="tag in interview.tags" :key="tag" class="tag">#{{ tag }}</span>
          </div>

          <div class="author-section">
            <div class="author-header">
              <img :src="interview.authorAvatar || interview.authorUser?.avatar" class="author-avatar" alt="">
              <div class="author-info">
                <div class="author-name">{{ interview.authorName }}</div>
                <div class="author-bio">{{ interview.authorBio || interview.authorUser?.bio || '这位创作者很神秘...' }}</div>
              </div>
            </div>
          </div>

          <div class="hero-actions">
            <button class="btn btn-primary btn-lg" @click="handleLike">
              ❤ 喜欢 ({{ interview.likeCount }})
            </button>
          </div>

          <div class="hero-stats">
            <span>📚 {{ zines.length }} 本关联作品</span>
            <span>👁 {{ formatNum(interview.viewCount) }} 次浏览</span>
            <span>❤ {{ formatNum(interview.likeCount) }} 喜欢</span>
            <span>💬 {{ interview.commentCount }} 评论</span>
            <span>📅 {{ formatDate(interview.publishDate || interview.createdAt) }}</span>
          </div>
        </div>
      </div>

      <div class="content-section card" v-if="interview.content">
        <div class="section-label">📝 访谈正文</div>
        <div class="interview-content font-serif" v-html="formatContent(interview.content)"></div>
      </div>

      <div class="zines-section" v-if="zines.length > 0">
        <div class="section-header">
          <h2 class="section-title">
            <span class="title-icon">📚</span> 关联作品
            <span class="count-badge">{{ zines.length }}</span>
          </h2>
        </div>

        <div class="zine-list">
          <div
            v-for="(item, index) in zines"
            :key="item.id"
            class="zine-item card"
          >
            <div class="zine-index">{{ index + 1 }}</div>
            <router-link :to="`/zines/${item.zine.id}`" class="zine-cover-link">
              <img :src="item.zine.coverImage" :alt="item.zine.title" class="zine-cover">
            </router-link>
            <div class="zine-info">
              <div class="zine-category">{{ item.zine.category }}</div>
              <router-link :to="`/zines/${item.zine.id}`" class="zine-title font-serif">
                {{ item.zine.title }}
              </router-link>
              <p class="zine-desc">{{ item.zine.description }}</p>
              <div v-if="item.recommendNote" class="recommend-note">
                <span class="note-icon">💬</span>
                <span class="note-text">{{ item.recommendNote }}</span>
              </div>
              <div class="zine-meta">
                <div class="zine-author">
                  <img :src="item.zine.author?.avatar" alt="">
                  <span>{{ item.zine.author?.username }}</span>
                </div>
                <div class="zine-stats">
                  <span>👁 {{ formatNum(item.zine.views) }}</span>
                  <span>❤ {{ formatNum(item.zine.likes) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="comments-section">
        <div class="section-header">
          <h2 class="section-title">
            <span class="title-icon">💬</span> 互动留言
            <span class="count-badge">{{ totalComments }}</span>
          </h2>
        </div>

        <div class="comment-form card" v-if="isLoggedIn">
          <img :src="currentUser?.avatar" class="comment-avatar" alt="">
          <div class="comment-input-wrap">
            <textarea
              v-model="newComment"
              class="comment-textarea"
              placeholder="说说你的看法..."
              rows="3"
            ></textarea>
            <div class="comment-actions">
              <span class="char-count">{{ newComment.length }}/500</span>
              <button
                class="btn btn-primary btn-sm"
                :disabled="!newComment.trim() || submittingComment"
                @click="submitComment"
              >
                {{ submittingComment ? '发布中...' : '发表评论' }}
              </button>
            </div>
          </div>
        </div>
        <div class="comment-form card" v-else>
          <p class="login-tip">请先 <router-link to="/login" class="link">登录</router-link> 后发表评论</p>
        </div>

        <div v-if="loadingComments" class="empty-state card"><div class="empty-state-icon">⏳</div></div>
        <div v-else-if="comments.length === 0" class="empty-state card" style="padding: 40px;">
          <div class="empty-state-icon">💬</div>
          <div class="empty-state-text">暂无评论，来抢沙发吧~</div>
        </div>
        <div v-else class="comment-list">
          <div
            v-for="comment in comments"
            :key="comment.id"
            :class="['comment-item card', { pinned: comment.isPinned }]"
          >
            <img :src="comment.user?.avatar" class="comment-avatar" alt="">
            <div class="comment-body">
              <div class="comment-header">
                <span class="comment-author">{{ comment.user?.username }}</span>
                <span v-if="comment.isPinned" class="pinned-badge">📌 置顶</span>
                <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
              </div>
              <div class="comment-content">{{ comment.content }}</div>
            </div>
          </div>
        </div>

        <div v-if="totalCommentPages > 1" class="pagination">
          <button
            class="page-btn"
            :disabled="commentPage === 1"
            @click="fetchComments(commentPage - 1)"
          >
            ←
          </button>
          <span class="page-info">{{ commentPage }} / {{ totalCommentPages }}</span>
          <button
            class="page-btn"
            :disabled="commentPage === totalCommentPages"
            @click="fetchComments(commentPage + 1)"
          >
            →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const authStore = useAuthStore()

const interview = ref(null)
const zines = ref([])
const comments = ref([])
const loading = ref(false)
const loadingComments = ref(false)
const newComment = ref('')
const submittingComment = ref(false)
const commentPage = ref(1)
const totalComments = ref(0)
const commentPageSize = 20

const isLoggedIn = computed(() => authStore.isAuthenticated)
const currentUser = computed(() => authStore.user)
const totalCommentPages = computed(() => Math.ceil(totalComments.value / commentPageSize))

const categoryMap = {
  CREATOR: '创作者专访',
  DESIGNER: '设计师访谈',
  PHOTOGRAPHER: '摄影师对话',
  WRITER: '作家笔谈',
  ARTIST: '艺术家专访',
  PUBLISHER: '出版人访谈',
  OTHER: '其他'
}

const categoryLabel = (cat) => categoryMap[cat] || cat

const formatNum = (n) => {
  if (!n) return 0
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatContent = (content) => {
  if (!content) return ''
  return content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
}

const fetchInterview = async () => {
  loading.value = true
  try {
    const id = route.params.id
    const res = await api.get(`/interviews/${id}`)
    interview.value = res.interview
    zines.value = res.zines
    totalComments.value = res.interview.commentCount
  } catch (e) {
    console.error(e)
    interview.value = null
  } finally {
    loading.value = false
  }
}

const fetchComments = async (page = 1) => {
  loadingComments.value = true
  commentPage.value = page
  try {
    const id = route.params.id
    const res = await api.get(`/interviews/${id}/comments?page=${page}&limit=${commentPageSize}`)
    comments.value = res.comments
    totalComments.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loadingComments.value = false
  }
}

const handleLike = async () => {
  if (!authStore.isAuthenticated) {
    window.location.hash = '#/login'
    return
  }
  try {
    const id = route.params.id
    const res = await api.post(`/interviews/${id}/like`)
    interview.value.likeCount = res.likeCount
  } catch (e) {
    console.error(e)
  }
}

const submitComment = async () => {
  if (!newComment.value.trim()) return
  submittingComment.value = true
  try {
    const id = route.params.id
    const res = await api.post(`/interviews/${id}/comments`, {
      content: newComment.value
    })
    newComment.value = ''
    interview.value.commentCount++
    fetchComments(1)
  } catch (e) {
    console.error(e)
    alert(e.error || '评论失败')
  } finally {
    submittingComment.value = false
  }
}

onMounted(() => {
  fetchInterview()
  fetchComments(1)
})
</script>

<style scoped>
.back-btn { margin-bottom: 20px; }

.detail-hero {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 32px;
  padding: 32px;
  margin-bottom: 24px;
}

.hero-cover {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-tertiary);
}

.hero-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-content {
  display: flex;
  flex-direction: column;
}

.interview-category {
  display: inline-block;
  padding: 6px 14px;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  border-radius: 100px;
  margin-bottom: 16px;
  align-self: flex-start;
}

.hero-title {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 12px;
}

.hero-desc {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 16px;
}

.interviewer-info {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}
.interviewer-label { color: var(--text-tertiary); }
.interviewer-name { font-weight: 500; color: var(--text-primary); }

.hero-tags { margin-bottom: 20px; }
.hero-tags .tag {
  font-size: 12px;
  padding: 4px 10px;
  margin-right: 8px;
  margin-bottom: 8px;
}

.author-section {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  margin-bottom: 20px;
}

.author-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.author-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.author-info { flex: 1; min-width: 0; }

.author-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.author-bio {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hero-actions { margin-bottom: 20px; }

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  font-size: 13px;
  color: var(--text-tertiary);
}

.content-section {
  padding: 32px;
  margin-bottom: 24px;
}

.section-label {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--accent);
  display: inline-block;
}

.interview-content {
  font-size: 15px;
  line-height: 1.9;
  color: var(--text-primary);
}
.interview-content p { margin-bottom: 16px; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}
.title-icon { font-size: 22px; }
.count-badge {
  font-size: 13px;
  font-weight: 500;
  padding: 2px 10px;
  background: var(--bg-tertiary);
  border-radius: 100px;
  color: var(--text-secondary);
}

.zines-section { margin-bottom: 32px; }

.zine-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.zine-item {
  display: flex;
  gap: 20px;
  padding: 20px;
  position: relative;
}

.zine-index {
  position: absolute;
  top: -8px;
  left: -8px;
  width: 28px;
  height: 28px;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.zine-cover-link { flex-shrink: 0; }

.zine-cover {
  width: 120px;
  height: 160px;
  object-fit: cover;
  border-radius: 8px;
  background: var(--bg-tertiary);
}

.zine-info { flex: 1; min-width: 0; }

.zine-category {
  font-size: 12px;
  color: var(--accent);
  margin-bottom: 6px;
}

.zine-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  display: block;
  color: var(--text-primary);
}

.zine-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recommend-note {
  background: var(--bg-secondary);
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}
.note-icon { font-size: 14px; }

.zine-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.zine-author {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
.zine-author img {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.zine-stats {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.comments-section { margin-bottom: 40px; }

.comment-form {
  display: flex;
  gap: 14px;
  padding: 20px;
  margin-bottom: 20px;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.comment-input-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}
.comment-textarea:focus {
  outline: none;
  border-color: var(--accent);
  background: #fff;
}

.comment-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.char-count {
  font-size: 12px;
  color: var(--text-tertiary);
}

.login-tip {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}
.link {
  color: var(--accent);
  text-decoration: underline;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  display: flex;
  gap: 14px;
  padding: 18px 20px;
}
.comment-item.pinned {
  border-left: 3px solid var(--accent);
  background: linear-gradient(to right, rgba(212, 98, 74, 0.05), transparent);
}

.comment-body { flex: 1; min-width: 0; }

.comment-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.comment-author {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.pinned-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--accent);
  color: #fff;
  border-radius: 4px;
}

.comment-time {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: auto;
}

.comment-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  word-break: break-word;
}

.page-info {
  font-size: 13px;
  color: var(--text-secondary);
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
  border: 1px solid var(--border);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.page-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .detail-hero {
    grid-template-columns: 1fr;
    padding: 20px;
    gap: 20px;
  }
  .hero-cover { aspect-ratio: 16 / 10; }
  .hero-title { font-size: 22px; }
  .content-section { padding: 20px; }
  .zine-item { flex-direction: column; }
  .zine-cover { width: 100%; height: 200px; }
}
</style>
