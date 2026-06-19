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
            <button
              class="btn btn-lg"
              :class="subscribed ? 'btn-secondary' : 'btn-primary'"
              :disabled="!authStore.isAuthenticated"
              @click="toggleSubscribe"
            >
              {{ subscribed ? '✓ 已订阅' : '★ 订阅刊物' }}
            </button>
            <button class="btn btn-secondary btn-lg" @click="handleLike">
              ❤ 收藏 ({{ zine.likes }})
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const authStore = useAuthStore()
const showToast = inject('showToast')

const loading = ref(true)
const zine = ref(null)
const subscribed = ref(false)

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
  } catch (e) {}
}

const toggleSubscribe = async () => {
  if (!authStore.isAuthenticated) {
    showToast('请先登录后再操作', 'warning')
    return
  }
  try {
    if (subscribed.value) {
      await api.delete(`/subscriptions/${zine.value.id}`)
      subscribed.value = false
      showToast('已取消订阅', 'success')
    } else {
      await api.post(`/subscriptions/${zine.value.id}`)
      subscribed.value = true
      showToast('订阅成功！', 'success')
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
    zine.value.likes = res.likes
    showToast('已收藏 ❤', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

onMounted(async () => {
  try {
    const res = await api.get(`/zines/${route.params.id}`)
    zine.value = res.zine
    await checkSubscription()
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
@media (max-width: 800px) {
  .detail-header { grid-template-columns: 1fr; gap: 32px; }
  .cover-wrap { position: static; max-width: 320px; margin: 0 auto; }
  .detail-title { font-size: 26px; }
  .content-section { padding: 24px; }
}
</style>
