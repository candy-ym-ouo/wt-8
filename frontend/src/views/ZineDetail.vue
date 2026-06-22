<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="!zine" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">刊物不存在或已下架</div>
      <router-link to="/zines" class="btn btn-outline">返回目录</router-link>
    </div>
    <div v-else class="detail">
      <button class="btn btn-ghost btn-sm back-btn" @click="$router.back()">← 返回</button>
      
      <div class="detail-header">
        <div class="cover-wrap">
          <img :src="zine.coverImage" :alt="zine.title" class="cover-image">
        </div>
        <div class="detail-info">
          <div class="zine-category">{{ zine.category }}</div>
          <h1 class="detail-title font-serif">{{ zine.title }}</h1>
          <p class="detail-desc">{{ zine.description }}</p>
          
          <div class="tags mb">
            <span v-for="tag in zine.tags" :key="tag" class="tag">#{{ tag }}</span>
          </div>

          <div class="author-row card">
            <img :src="zine.author?.avatar" class="author-avatar">
            <div class="author-info">
              <div class="author-name">{{ zine.author?.username }}</div>
              <div class="author-bio">{{ zine.author?.bio || '这位创作者很神秘，什么都没留下...' }}</div>
            </div>
          </div>

          <div class="actions">
            <template v-if="!subscribed">
              <button
                class="btn btn-primary btn-lg"
                :disabled="!authStore.isAuthenticated"
                @click="subscribeWithTier('FREE')"
              >
                ⭐ 免费订阅
              </button>
              <button
                class="btn btn-lg"
                style="background: #2563eb; color: white; border-color: #2563eb;"
                :disabled="!authStore.isAuthenticated"
                @click="subscribeWithTier('STANDARD')"
              >
                🌟 标准订阅
              </button>
              <button
                class="btn btn-lg"
                style="background: #d97706; color: white; border-color: #d97706;"
                :disabled="!authStore.isAuthenticated"
                @click="subscribeWithTier('PREMIUM')"
              >
                👑 高级订阅
              </button>
            </template>
            <template v-else>
              <button
                class="btn btn-secondary btn-lg"
                @click="toggleSubscribe"
              >
                ✓ 已订阅 ({{ tierLabel(subTier) }})
              </button>
              <button class="btn btn-ghost btn-sm" @click="showTierSwitch = true" v-if="!showTierSwitch">切换等级</button>
              <div v-if="showTierSwitch" class="tier-switch-row">
                <button
                  v-for="t in tierOptions"
                  :key="t.value"
                  :class="['tier-switch-btn', { active: subTier === t.value }]"
                  @click="switchTier(t.value)"
                >{{ t.icon }} {{ t.label }}</button>
                <button class="btn btn-ghost btn-sm" @click="showTierSwitch = false">收起</button>
              </div>
            </template>
            <button
              :class="['btn', zine.isLiked ? 'btn-primary' : 'btn-secondary', 'btn-lg']"
              @click="handleLike"
            >
              {{ zine.isLiked ? '❤ 已收藏' : '🤍 收藏' }} ({{ zine.likes }})
            </button>
          </div>

          <div class="stats-row">
            <span>👁 {{ formatNum(zine.views) }} 次浏览</span>
            <span>❤ {{ formatNum(zine.likes) }} 收藏</span>
            <span>📅 {{ formatDate(zine.createdAt) }}</span>
          </div>
        </div>
      </div>

      <div class="content-section card">
        <div class="section-label">📖 刊物内容</div>
        <div class="zine-content font-serif" v-html="formatContent(zine.content)"></div>
      </div>

      <div class="detail-section card">
        <h3 class="section-title">
          <span class="section-icon">💬</span> 评论区
          <span class="comment-count">({{ zine.commentCount || 0 }})</span>
        </h3>

        <div v-if="authStore.isAuthenticated" class="comment-form">
          <div class="comment-form-inner">
            <img :src="authStore.user?.avatar" class="comment-avatar">
            <div class="comment-input-wrap">
              <textarea
                v-model="commentContent"
                class="comment-textarea"
                :placeholder="replyTarget ? `回复 @${replyTarget.user?.username}...` : '写下你的评论...'"
                rows="3"
                maxlength="2000"
              ></textarea>
              <div class="comment-form-actions">
                <span class="char-count">{{ commentContent.length }}/2000</span>
                <button v-if="replyTarget" class="btn btn-ghost btn-sm" @click="cancelReply">取消回复</button>
                <button class="btn btn-primary btn-sm" @click="submitComment" :disabled="submittingComment || !commentContent.trim()">
                  {{ submittingComment ? '发送中...' : '发送' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="comment-login-prompt">
          <router-link :to="`/login?redirect=${$route.fullPath}`" class="btn btn-outline btn-sm">登录后参与评论</router-link>
        </div>

        <div v-if="loadingComments" class="empty-state" style="padding: 24px;">
          <div class="empty-state-icon">⏳</div>
        </div>
        <div v-else-if="comments.length === 0" class="empty-state" style="padding: 32px;">
          <div class="empty-state-icon">💭</div>
          <div class="empty-state-text">暂无评论，来抢沙发吧</div>
        </div>
        <div v-else class="comment-list">
          <div v-for="comment in comments" :key="comment.id" :class="['comment-item', { 'is-pinned': comment.isPinned }]">
            <div class="comment-main">
              <img :src="comment.user?.avatar" class="comment-avatar">
              <div class="comment-body">
                <div class="comment-header">
                  <span class="comment-username">{{ comment.user?.username }}</span>
                  <span v-if="comment.isPinned" class="pinned-badge">📌 置顶</span>
                  <span v-if="zine.authorId === comment.user?.id" class="author-badge">作者</span>
                  <span class="comment-time">{{ formatCommentTime(comment.createdAt) }}</span>
                </div>
                <div class="comment-content">{{ comment.content }}</div>
                <div class="comment-actions">
                  <button :class="['comment-action-btn', { liked: comment.isLiked }]" @click="toggleLike(comment)">
                    👍 {{ comment.likeCount || 0 }}
                  </button>
                  <button class="comment-action-btn" @click="setReplyTarget(comment)">💬 回复</button>
                  <button
                    v-if="canDeleteComment(comment)"
                    class="comment-action-btn danger"
                    @click="deleteComment(comment)"
                  >🗑 删除</button>
                  <button
                    v-if="canPinComment"
                    class="comment-action-btn"
                    @click="togglePin(comment)"
                  >{{ comment.isPinned ? '取消置顶' : '📌 置顶' }}</button>
                  <button
                    v-if="authStore.isAuthenticated"
                    class="comment-action-btn danger"
                    @click="reportComment(comment)"
                  >🚨 举报</button>
                </div>

                <div v-if="comment.replies && comment.replies.length > 0" class="reply-list">
                  <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                    <img :src="reply.user?.avatar" class="reply-avatar">
                    <div class="reply-body">
                      <div class="reply-header">
                        <span class="comment-username">{{ reply.user?.username }}</span>
                        <span v-if="zine.authorId === reply.user?.id" class="author-badge">作者</span>
                        <template v-if="reply.replyToUser">
                          <span class="reply-arrow">→</span>
                          <span class="reply-to-name">@{{ reply.replyToUser.username }}</span>
                        </template>
                        <span class="comment-time">{{ formatCommentTime(reply.createdAt) }}</span>
                      </div>
                      <div class="comment-content">{{ reply.content }}</div>
                      <div class="comment-actions">
                        <button :class="['comment-action-btn', { liked: reply.isLiked }]" @click="toggleLike(reply, comment.id)">
                          👍 {{ reply.likeCount || 0 }}
                        </button>
                        <button class="comment-action-btn" @click="setReplyTarget(reply, comment)">💬 回复</button>
                        <button
                          v-if="canDeleteComment(reply)"
                          class="comment-action-btn danger"
                          @click="deleteComment(reply, comment.id)"
                        >🗑 删除</button>
                        <button
                          v-if="authStore.isAuthenticated"
                          class="comment-action-btn danger"
                          @click="reportComment(reply)"
                        >🚨 举报</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="commentTotalPages > 1" class="pagination" style="margin-top: 16px;">
          <button class="page-btn" :disabled="commentPage === 1" @click="loadComments(commentPage - 1)">←</button>
          <span class="page-info">第 {{ commentPage }} / {{ commentTotalPages }} 页</span>
          <button class="page-btn" :disabled="commentPage === commentTotalPages" @click="loadComments(commentPage + 1)">→</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const authStore = useAuthStore()
const showToast = inject('showToast')

const loading = ref(true)
const zine = ref(null)
const subscribed = ref(false)
const subTier = ref('FREE')
const showTierSwitch = ref(false)

const tierOptions = [
  { value: 'FREE', label: '免费', icon: '⭐' },
  { value: 'STANDARD', label: '标准', icon: '🌟' },
  { value: 'PREMIUM', label: '高级', icon: '👑' }
]

const tierLabel = (tier) => {
  const labels = { FREE: '免费', STANDARD: '标准', PREMIUM: '高级' }
  return labels[tier] || '免费'
}

const comments = ref([])
const commentContent = ref('')
const replyTarget = ref(null)
const submittingComment = ref(false)
const loadingComments = ref(false)
const commentPage = ref(1)
const commentTotalPages = ref(1)

const isOwner = computed(() => {
  return authStore.isAuthenticated && zine.value?.authorId === authStore.user?.id
})
const isAdmin = computed(() => {
  return authStore.isAuthenticated && authStore.user?.role === 'ADMIN'
})
const canPinComment = computed(() => {
  return isOwner.value || isAdmin.value
})

const formatNum = (n) => {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n
}

const formatDate = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatContent = (text) => {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split('\n')
    .map(line => line.trim() ? `<p>${line}</p>` : '<br>')
    .join('')
}

const checkSubscription = async () => {
  if (!authStore.isAuthenticated) return
  try {
    const res = await api.get(`/subscriptions/check/${zine.value.id}`)
    subscribed.value = res.subscribed
    subTier.value = res.tier || 'FREE'
  } catch (e) {}
}

const subscribeWithTier = async (tier) => {
  if (!authStore.isAuthenticated) {
    showToast('请先登录后再操作', 'warning')
    return
  }
  try {
    await api.post(`/subscriptions/${zine.value.id}`, {
      tier,
      notifySeriesUpdate: tier !== 'FREE',
      notifyAuthorActivity: tier === 'PREMIUM'
    })
    subscribed.value = true
    subTier.value = tier
    showToast(`${tierLabel(tier)}订阅成功！`, 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const switchTier = async (tier) => {
  try {
    await api.put(`/subscriptions/${zine.value.id}`, {
      tier,
      notifySeriesUpdate: tier !== 'FREE',
      notifyAuthorActivity: tier === 'PREMIUM'
    })
    subTier.value = tier
    showTierSwitch.value = false
    showToast(`已切换为${tierLabel(tier)}订阅`, 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const toggleSubscribe = async () => {
  if (!authStore.isAuthenticated) {
    showToast('请先登录后再操作', 'warning')
    return
  }
  try {
    if (subscribed.value) {
      if (!confirm('确定要取消订阅吗？')) return
      await api.delete(`/subscriptions/${zine.value.id}`)
      subscribed.value = false
      subTier.value = 'FREE'
      showToast('已取消订阅', 'success')
    } else {
      await subscribeWithTier('FREE')
    }
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const handleLike = async () => {
  if (!authStore.isAuthenticated) {
    showToast('请先登录后再操作', 'warning')
    return
  }
  try {
    const res = await api.post(`/zines/${zine.value.id}/like`)
    zine.value.isLiked = res.liked
    zine.value.likes = res.likes
    showToast(res.message, res.liked ? 'success' : 'info')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const formatCommentTime = (timeStr) => {
  const d = new Date(timeStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
  if (diff < 86400 * 30) return Math.floor(diff / 86400) + '天前'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const loadComments = async (page = 1) => {
  loadingComments.value = true
  commentPage.value = page
  try {
    const res = await api.get(`/zines/${route.params.id}/comments?page=${page}&limit=20`)
    comments.value = res.comments
    commentTotalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingComments.value = false
  }
}

const submitComment = async () => {
  if (!commentContent.value.trim()) return
  submittingComment.value = true
  try {
    const payload = { content: commentContent.value }
    if (replyTarget.value) {
      if (replyTarget.value.parentId === undefined || replyTarget.value.parentId === null) {
        payload.parentId = replyTarget.value.id
      } else {
        payload.parentId = replyTarget.value._parentId || replyTarget.value.parentId
      }
      payload.replyToUserId = replyTarget.value.user?.id
    }
    await api.post(`/zines/${route.params.id}/comments`, payload)
    commentContent.value = ''
    replyTarget.value = null
    showToast('评论成功', 'success')
    loadComments(1)
    if (zine.value) {
      zine.value.commentCount = (zine.value.commentCount || 0) + 1
    }
  } catch (e) {
    showToast(e.error || '评论失败', 'error')
  } finally {
    submittingComment.value = false
  }
}

const setReplyTarget = (target, parentComment = null) => {
  replyTarget.value = {
    ...target,
    _parentId: parentComment ? parentComment.id : target.id
  }
  commentContent.value = ''
}

const cancelReply = () => {
  replyTarget.value = null
  commentContent.value = ''
}

const canDeleteComment = (comment) => {
  if (!authStore.isAuthenticated) return false
  if (comment.userId === authStore.user?.id) return true
  if (isOwner.value || isAdmin.value) return true
  return false
}

const deleteComment = async (comment, parentCommentId) => {
  if (!confirm('确定要删除此评论吗？')) return
  try {
    await api.delete(`/zines/${route.params.id}/comments/${comment.id}`)
    showToast('已删除', 'success')
    loadComments(commentPage.value)
    if (zine.value && zine.value.commentCount > 0) {
      zine.value.commentCount -= 1
    }
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const toggleLike = async (comment, parentCommentId) => {
  if (!authStore.isAuthenticated) {
    showToast('请先登录', 'warning')
    return
  }
  try {
    const res = await api.post(`/zines/${route.params.id}/comments/${comment.id}/like`)
    comment.isLiked = res.liked
    comment.likeCount = (comment.likeCount || 0) + (res.liked ? 1 : -1)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const togglePin = async (comment) => {
  try {
    await api.put(`/zines/${route.params.id}/comments/${comment.id}/pin`)
    comment.isPinned = !comment.isPinned
    showToast(comment.isPinned ? '已置顶' : '已取消置顶', 'success')
    loadComments(commentPage.value)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const reportComment = (comment) => {
  const reason = prompt('请输入举报原因（色情低俗/广告骚扰/虚假信息/侵权抄袭/恶意攻击/违法违规/垃圾灌水/其他）')
  if (!reason) return
  api.post('/reports', {
    type: 'CONTENT',
    reason,
    targetType: 'COMMENT',
    targetId: comment.id,
    targetTitle: comment.content.substring(0, 50),
    targetUserId: comment.userId
  }).then(() => {
    showToast('举报已提交，我们会尽快处理', 'success')
  }).catch(e => {
    showToast(e.error || '举报失败', 'error')
  })
}

onMounted(async () => {
  try {
    const res = await api.get(`/zines/${route.params.id}`)
    zine.value = res.zine
    await checkSubscription()
    loadComments(1)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.back-btn { margin-bottom: 24px; }
.detail-header {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 48px;
  margin-bottom: 40px;
}
.cover-wrap {
  position: sticky;
  top: 88px;
  height: fit-content;
}
.cover-image {
  width: 100%;
  aspect-ratio: 5 / 7;
  object-fit: cover;
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
}
.detail-info {}
.zine-category {
  display: inline-block;
  padding: 5px 14px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  border-radius: 100px;
  margin-bottom: 16px;
}
.detail-title {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 16px;
}
.detail-desc {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 20px;
}
.author-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  margin-bottom: 24px;
}
.author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}
.author-info { flex: 1; }
.author-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 2px;
}
.author-bio {
  font-size: 13px;
  color: var(--text-secondary);
}
.actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;
}
.tier-switch-row {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.tier-switch-btn {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 100px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.tier-switch-btn:hover { border-color: var(--accent); }
.tier-switch-btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.stats-row {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: var(--text-tertiary);
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
}
.content-section {
  padding: 40px 48px;
}
.section-label {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}
.zine-content {
  font-size: 16px;
  line-height: 2;
  color: var(--text-primary);
}
.zine-content :deep(p) { margin-bottom: 16px; }
.zine-content :deep(br) { display: block; margin-bottom: 8px; }

.detail-section {
  padding: 32px;
  margin-top: 24px;
}
.section-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-icon {
  font-size: 22px;
}
.comment-count {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 400;
}

.comment-form {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
}
.comment-form-inner {
  display: flex;
  gap: 12px;
}
.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}
.reply-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}
.comment-input-wrap {
  flex: 1;
  min-width: 0;
}
.comment-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  min-height: 72px;
  transition: border-color 0.2s;
}
.comment-textarea:focus {
  outline: none;
  border-color: var(--accent);
}
.comment-form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.char-count {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-right: auto;
}
.comment-login-prompt {
  padding: 20px;
  text-align: center;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.comment-list {
  display: flex;
  flex-direction: column;
}
.comment-item {
  padding: 16px 0;
  border-bottom: 1px solid var(--border-light);
}
.comment-item:last-child {
  border-bottom: none;
}
.comment-item.is-pinned {
  background: #fffbf0;
  padding: 16px 12px;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  border-bottom: none;
}
.comment-main {
  display: flex;
  gap: 12px;
}
.comment-body {
  flex: 1;
  min-width: 0;
}
.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.comment-username {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.pinned-badge {
  font-size: 11px;
  color: #d48806;
  background: #fff7e6;
  padding: 2px 6px;
  border-radius: 4px;
}
.author-badge {
  font-size: 11px;
  color: var(--accent);
  background: var(--accent-light);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}
.comment-time {
  font-size: 12px;
  color: var(--text-tertiary);
}
.comment-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  margin-bottom: 8px;
  word-break: break-word;
}
.comment-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.comment-action-btn {
  font-size: 12px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0;
  transition: color 0.2s;
}
.comment-action-btn:hover {
  color: var(--accent);
}
.comment-action-btn.liked {
  color: var(--accent);
}
.comment-action-btn.danger:hover {
  color: var(--danger);
}

.reply-list {
  margin-top: 12px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
.reply-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
}
.reply-item + .reply-item {
  border-top: 1px solid var(--border-light);
}
.reply-body {
  flex: 1;
  min-width: 0;
}
.reply-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.reply-arrow {
  color: var(--text-tertiary);
  font-size: 12px;
}
.reply-to-name {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}
.page-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
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

@media (max-width: 800px) {
  .detail-header { grid-template-columns: 1fr; gap: 32px; }
  .cover-wrap { position: static; max-width: 320px; margin: 0 auto; }
  .detail-title { font-size: 26px; }
  .content-section { padding: 24px; }
  .detail-section { padding: 20px; }
}
</style>
