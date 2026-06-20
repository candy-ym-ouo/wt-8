<template>
  <div class="container review-detail">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="review" class="detail-content">
      <button class="back-btn" @click="$router.back()">← 返回</button>

      <div class="review-hero">
        <div class="hero-cover">
          <img v-if="review.coverImage" :src="review.coverImage" alt="" />
          <div v-else class="cover-placeholder"><span>📖</span></div>
        </div>
        <div class="hero-info">
          <div class="book-info">
            <span class="book-name">{{ review.bookTitle }}</span>
            <span v-if="review.bookAuthor" class="book-author">· {{ review.bookAuthor }}</span>
            <span class="cat-tag">{{ getCategoryName(review.category) }}</span>
          </div>
          <h1 class="review-title">{{ review.title }}</h1>
          <div class="rating-display">
            <span v-for="i in 5" :key="i" :class="['star', i <= review.rating ? 'filled' : '']">⭐</span>
            <span class="rating-text">{{ review.rating }}.0 / 5.0</span>
          </div>
          <div class="meta-row">
            <div class="author-row">
              <img :src="review.user.avatar" class="avatar" alt="">
              <div class="author-info">
                <span class="username">{{ review.user.username }}</span>
                <span class="publish-time">发布于 {{ formatDate(review.createdAt) }}</span>
              </div>
            </div>
            <div class="stats-row">
              <span>👁️ {{ review.viewCount || 0 }} 浏览</span>
              <span>❤️ {{ review.likeCount || 0 }} 点赞</span>
              <span>💬 {{ review.commentCount || 0 }} 评论</span>
            </div>
          </div>
          <div v-if="review.tags && review.tags.length" class="tags-row">
            <span v-for="t in review.tags" :key="t" class="tag-chip">#{{ t }}</span>
          </div>
        </div>
      </div>

      <div class="review-content">
        <div class="content-text" v-html="formatContent(review.content)"></div>
      </div>

      <div class="action-bar">
        <button :class="['like-btn', { liked: isLiked }]" @click="toggleLike">
          <span>{{ isLiked ? '❤️' : '🤍' }}</span>
          <span>{{ isLiked ? '已点赞' : '点赞' }} {{ localLikeCount }}</span>
        </button>
        <button class="share-btn" @click="copyLink">
          <span>🔗</span> 复制链接
        </button>
      </div>

      <div class="comments-section">
        <div class="section-header">
          <h3>💬 评论 ({{ comments.length }})</h3>
        </div>

        <div v-if="authStore.isAuthenticated" class="comment-writer">
          <img :src="authStore.user.avatar" class="avatar" alt="">
          <div class="writer-area">
            <textarea v-model="newComment" rows="3" placeholder="分享你的看法..."></textarea>
            <div class="writer-actions">
              <button class="btn btn-primary btn-sm" @click="submitComment" :disabled="!newComment.trim()">
                发表评论
              </button>
            </div>
          </div>
        </div>
        <div v-else class="comment-login">
          <router-link to="/login">登录后参与讨论</router-link>
        </div>

        <div v-if="comments.length > 0" class="comments-list">
          <div v-for="c in comments" :key="c.id" class="comment-item">
            <img :src="c.user.avatar" class="avatar" alt="">
            <div class="comment-body">
              <div class="comment-header">
                <span class="username">{{ c.user.username }}</span>
                <span v-if="c.isPinned" class="pin-tag">📌 置顶</span>
                <span class="comment-time">{{ formatDate(c.createdAt) }}</span>
              </div>
              <p class="comment-text">{{ c.content }}</p>
            </div>
          </div>
        </div>
        <div v-else class="empty-comments">
          <span>💬</span>
          <p>还没有评论，来发表第一条吧！</p>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <span class="empty-icon">📖</span>
      <h3>书评不存在</h3>
      <router-link to="/reading/reviews" class="btn btn-primary">返回书评广场</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const authStore = useAuthStore()
const showToast = inject('showToast')

const review = ref(null)
const comments = ref([])
const loading = ref(true)
const isLiked = ref(false)
const localLikeCount = ref(0)
const newComment = ref('')

const categories = [
  { id: 'LITERATURE', name: '文学小说' },
  { id: 'SCIENCE', name: '科学技术' },
  { id: 'HISTORY', name: '历史人文' },
  { id: 'PHILOSOPHY', name: '哲学思想' },
  { id: 'ART', name: '艺术设计' },
  { id: 'BUSINESS', name: '商业经济' },
  { id: 'SELF_HELP', name: '自我成长' },
  { id: 'ZINE', name: 'ZINE刊物' },
  { id: 'OTHER', name: '其他' }
]

const getCategoryName = (id) => categories.find(c => c.id === id)?.name || '其他'

const formatDate = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

const formatContent = (text) => {
  return text.replace(/\n/g, '<br>')
}

const loadReview = async () => {
  loading.value = true
  try {
    const id = route.params.id
    const res = await api.get(`/reading-reviews/${id}`)
    review.value = res.review
    localLikeCount.value = res.review.likeCount || 0
    await loadComments()
  } catch (e) {
    review.value = null
  }
  loading.value = false
}

const loadComments = async () => {
  try {
    const res = await api.get(`/reading-reviews/${route.params.id}/comments`)
    comments.value = res.comments
  } catch (e) {}
}

const toggleLike = async () => {
  if (!authStore.isAuthenticated) {
    showToast('请先登录', 'error')
    return
  }
  try {
    const res = await api.post(`/reading-reviews/${route.params.id}/like`)
    isLiked.value = res.liked
    localLikeCount.value = res.likeCount
    showToast(res.liked ? '点赞成功' : '已取消点赞')
  } catch (e) {}
}

const submitComment = async () => {
  if (!newComment.value.trim()) return
  try {
    const res = await api.post(`/reading-reviews/${route.params.id}/comments`, {
      content: newComment.value
    })
    comments.value.unshift(res.comment)
    newComment.value = ''
    showToast('评论成功')
  } catch (e) {
    showToast(e.error || '评论失败', 'error')
  }
}

const copyLink = () => {
  const url = window.location.href
  navigator.clipboard.writeText(url).then(() => {
    showToast('链接已复制')
  }).catch(() => {
    showToast('复制失败，请手动复制', 'error')
  })
}

watch(() => route.params.id, () => {
  if (route.params.id) loadReview()
})

onMounted(loadReview)
</script>

<style scoped>
.review-detail { padding-bottom: 64px; }

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
  transition: all 0.2s;
}
.back-btn:hover { background: var(--bg-secondary); color: var(--accent); }

.detail-content { max-width: 860px; margin: 0 auto; }

.review-hero {
  display: flex;
  gap: 32px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 32px;
  margin-bottom: 32px;
  border: 1px solid var(--border-light);
}
.hero-cover {
  width: 200px;
  flex-shrink: 0;
}
.hero-cover img {
  width: 100%;
  height: 280px;
  object-fit: cover;
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
}
.cover-placeholder {
  width: 100%;
  height: 280px;
  background: linear-gradient(135deg, var(--accent-light), #e8ddc7);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
  box-shadow: var(--shadow-md);
}

.hero-info { flex: 1; display: flex; flex-direction: column; }
.book-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.book-name {
  color: var(--accent);
  font-weight: 600;
  font-size: 15px;
}
.book-author { color: var(--text-secondary); font-size: 14px; }
.cat-tag {
  padding: 3px 10px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  font-size: 11px;
  color: var(--text-secondary);
  margin-left: auto;
}

.review-title {
  font-size: 30px;
  font-weight: 800;
  line-height: 1.3;
  margin-bottom: 16px;
  font-family: var(--font-serif);
}

.rating-display {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.star { font-size: 22px; filter: grayscale(1); opacity: 0.3; transition: all 0.3s; }
.star.filled { filter: none; opacity: 1; }
.rating-text { font-size: 14px; color: var(--text-secondary); }

.meta-row {
  margin-bottom: 16px;
}
.author-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.author-row .avatar { width: 44px; height: 44px; }
.author-info { display: flex; flex-direction: column; gap: 2px; }
.author-info .username { font-weight: 600; font-size: 15px; }
.publish-time { font-size: 12px; color: var(--text-secondary); }
.stats-row {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--text-secondary);
}

.tags-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
}
.tag-chip {
  padding: 5px 12px;
  border-radius: 12px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 12px;
}

.review-content {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 40px 48px;
  margin-bottom: 24px;
  border: 1px solid var(--border-light);
}
.content-text {
  font-size: 16px;
  line-height: 1.9;
  color: var(--text-primary);
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
  padding: 16px 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  border: 1px solid var(--border-light);
}
.like-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  background: var(--bg-primary);
  color: var(--text-secondary);
  transition: all 0.2s;
}
.like-btn:hover { color: var(--accent); background: var(--accent-light); }
.like-btn.liked {
  background: #ffe8e8;
  color: #e74c3c;
}
.share-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  transition: all 0.2s;
}
.share-btn:hover { color: var(--accent); background: var(--accent-light); }

.comments-section {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 28px 32px;
  border: 1px solid var(--border-light);
}
.section-header h3 { font-size: 20px; margin-bottom: 20px; }

.comment-writer {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-light);
}
.comment-writer .avatar { width: 40px; height: 40px; }
.writer-area { flex: 1; }
.writer-area textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  resize: none;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  margin-bottom: 10px;
}
.writer-area textarea:focus { outline: none; border-color: var(--accent); }
.writer-actions { display: flex; justify-content: flex-end; }

.comment-login {
  text-align: center;
  padding: 20px;
  margin-bottom: 20px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-light);
}
.comment-login a { color: var(--accent); }

.comments-list { display: flex; flex-direction: column; gap: 20px; }
.comment-item { display: flex; gap: 12px; }
.comment-item .avatar { width: 38px; height: 38px; flex-shrink: 0; }
.comment-body {
  flex: 1;
  background: var(--bg-primary);
  padding: 14px 18px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) var(--radius-sm);
}
.comment-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.comment-header .username { font-weight: 600; font-size: 14px; }
.pin-tag {
  padding: 2px 8px;
  border-radius: 4px;
  background: #fff3cd;
  color: #856404;
  font-size: 11px;
}
.comment-time { font-size: 12px; color: var(--text-secondary); }
.comment-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  margin: 0;
}

.empty-comments {
  text-align: center;
  padding: 32px;
  color: var(--text-secondary);
}
.empty-comments span { display: block; font-size: 48px; margin-bottom: 12px; }

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary);
}
.empty-icon { font-size: 64px; display: block; margin-bottom: 16px; }
.empty-state h3 { color: var(--text-primary); margin-bottom: 20px; }

.loading { text-align: center; padding: 80px; color: var(--text-secondary); }
</style>
