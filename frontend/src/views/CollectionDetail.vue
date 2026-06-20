<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="!collection" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">合集不存在或已下架</div>
      <router-link to="/collections" class="btn btn-outline">返回合集</router-link>
    </div>
    <div v-else class="detail">
      <button class="btn btn-ghost btn-sm back-btn" @click="$router.back()">← 返回</button>
      
      <div class="detail-hero card">
        <div class="hero-cover">
          <img :src="collection.coverImage" :alt="collection.title">
        </div>
        <div class="hero-content">
          <div class="collection-category">{{ collection.category }}</div>
          <h1 class="hero-title font-serif">{{ collection.title }}</h1>
          <p class="hero-desc">{{ collection.description }}</p>
          
          <div class="hero-tags">
            <span v-for="tag in collection.tags" :key="tag" class="tag">#{{ tag }}</span>
          </div>

          <div class="creator-row">
            <img :src="collection.creator?.avatar" class="creator-avatar">
            <div class="creator-info">
              <div class="creator-name">{{ collection.creator?.username }}</div>
              <div class="creator-bio">{{ collection.creator?.bio || '这位策展人很神秘...' }}</div>
            </div>
          </div>

          <div class="hero-actions">
            <button class="btn btn-primary btn-lg" @click="handleLike">
              ❤ 喜欢 ({{ collection.likeCount }})
            </button>
          </div>

          <div class="hero-stats">
            <span>📚 {{ zines.length }} 本刊物</span>
            <span>👁 {{ formatNum(collection.viewCount) }} 次浏览</span>
            <span>❤ {{ formatNum(collection.likeCount) }} 喜欢</span>
            <span>📅 {{ formatDate(collection.createdAt) }}</span>
          </div>
        </div>
      </div>

      <div class="content-section card" v-if="collection.content">
        <div class="section-label">📝 合集前言</div>
        <div class="collection-content font-serif" v-html="formatContent(collection.content)"></div>
      </div>

      <div class="zines-section">
        <div class="section-header">
          <h2 class="section-title">
            <span class="title-icon">📚</span> 收录刊物
            <span class="count-badge">{{ zines.length }}</span>
          </h2>
        </div>

        <div v-if="zines.length === 0" class="empty-state card">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">该合集暂无刊物</div>
        </div>
        <div v-else class="zine-list">
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
const collection = ref(null)
const zines = ref([])

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

const handleLike = async () => {
  if (!authStore.isAuthenticated) {
    showToast('请先登录后再操作', 'warning')
    return
  }
  try {
    const res = await api.post(`/collections/${collection.value.id}/like`)
    collection.value.likeCount = res.likeCount
    showToast('已收藏 ❤', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

onMounted(async () => {
  try {
    const res = await api.get(`/collections/${route.params.id}`)
    collection.value = res.collection
    zines.value = res.zines
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.back-btn { margin-bottom: 24px; }

.detail-hero {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 48px;
  padding: 0;
  overflow: hidden;
  margin-bottom: 32px;
}

.hero-cover {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
}

.hero-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-content { padding: 36px 40px; }

.collection-category {
  display: inline-block;
  padding: 5px 14px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  border-radius: 100px;
  margin-bottom: 16px;
}

.hero-title {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 14px;
}

.hero-desc {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 18px;
}

.hero-tags { margin-bottom: 20px; }

.creator-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  margin-bottom: 22px;
}

.creator-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-primary);
}

.creator-info { flex: 1; }

.creator-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}

.creator-bio {
  font-size: 12px;
  color: var(--text-secondary);
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
  flex-wrap: wrap;
}

.hero-stats {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--text-tertiary);
  padding-top: 18px;
  border-top: 1px solid var(--border-light);
  flex-wrap: wrap;
}

.content-section {
  padding: 36px 40px;
  margin-bottom: 32px;
}

.section-label {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-light);
}

.collection-content {
  font-size: 15px;
  line-height: 2;
  color: var(--text-primary);
}

.collection-content :deep(p) { margin-bottom: 14px; }
.collection-content :deep(br) { display: block; margin-bottom: 8px; }

.zines-section {}

.section-header { margin-bottom: 20px; }

.section-title {
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon { font-size: 22px; }

.count-badge {
  padding: 2px 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  border-radius: 100px;
}

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
  left: -8px;
  top: -8px;
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
  aspect-ratio: 5 / 7;
  object-fit: cover;
  border-radius: var(--radius-sm);
  transition: transform 0.3s ease;
}

.zine-cover-link:hover .zine-cover { transform: scale(1.03); }

.zine-info { flex: 1; min-width: 0; }

.zine-category {
  display: inline-block;
  padding: 3px 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 11px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.zine-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  margin-bottom: 8px;
  display: block;
}

.zine-title:hover { color: var(--accent); }

.zine-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recommend-note {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #fff9e6, #fff5d6);
  border-left: 3px solid #ffc107;
  border-radius: 0 6px 6px 0;
  margin-bottom: 12px;
  font-size: 13px;
  color: #8a6d00;
}

.note-icon { flex-shrink: 0; }

.note-text { line-height: 1.5; }

.zine-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid var(--border-light);
}

.zine-author {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zine-author img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.zine-author span {
  font-size: 12px;
  color: var(--text-secondary);
}

.zine-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
}

@media (max-width: 900px) {
  .detail-hero { grid-template-columns: 1fr; gap: 0; }
  .hero-cover { aspect-ratio: 16 / 9; }
  .hero-content { padding: 24px; }
  .hero-title { font-size: 24px; }
  .content-section { padding: 24px; }
}

@media (max-width: 600px) {
  .zine-item { padding: 14px; gap: 14px; }
  .zine-cover { width: 90px; }
  .zine-title { font-size: 15px; }
}
</style>
