<template>
  <div class="home">
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-content">
          <div class="hero-tag">独立出版 · 小众文化 · 自由表达</div>
          <h1 class="hero-title font-serif">
            在纸页之间，<br>
            <span class="text-accent">发现被忽视的声音</span>
          </h1>
          <p class="hero-desc">
            ZineSpace 是一个私印 zine 共享社区。这里收录独立创作者的文学、艺术、摄影、音乐等小众刊物，
            让每一种表达都被看见，每一本刊物都找到它的读者。
          </p>
          <div class="hero-actions">
            <router-link to="/zines" class="btn btn-primary btn-lg">
              浏览刊物 →
            </router-link>
            <router-link v-if="!authStore.isAuthenticated" to="/register" class="btn btn-secondary btn-lg">
              加入创作
            </router-link>
            <router-link v-else to="/submissions/new" class="btn btn-secondary btn-lg">
              开始投稿
            </router-link>
          </div>
          <div class="hero-stats">
            <div class="stat-item">
              <div class="stat-num">{{ stats.totalZines || '—' }}</div>
              <div class="stat-label">本刊物</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">{{ stats.totalUsers || '—' }}</div>
              <div class="stat-label">创作者</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">{{ stats.totalSubmissions || '—' }}</div>
              <div class="stat-label">投稿作品</div>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="book-stack">
            <div class="book book-1">📖</div>
            <div class="book book-2">📚</div>
            <div class="book book-3">📕</div>
            <div class="book book-4">📗</div>
            <div class="book book-5">📘</div>
          </div>
        </div>
      </div>
    </section>

    <section class="container section">
      <div class="section-header">
        <h2 class="section-title font-serif">精选分类</h2>
        <p class="section-sub">发现你感兴趣的领域</p>
      </div>
      <div class="category-grid">
        <router-link
          v-for="cat in categories"
          :key="cat.id"
          :to="`/zines?category=${cat.id}`"
          class="category-card"
        >
          <span class="cat-icon">{{ cat.icon }}</span>
          <span class="cat-name">{{ cat.name }}</span>
        </router-link>
      </div>
    </section>

    <section v-if="featuredTopics.length" class="container section">
      <div class="section-header">
        <h2 class="section-title font-serif">🔥 热门征稿</h2>
        <router-link to="/topics" class="btn btn-ghost btn-sm">全部专题 →</router-link>
      </div>
      <div class="featured-topics-grid">
        <router-link
          v-for="ft in featuredTopics"
          :key="ft.id"
          :to="`/topics/${ft.topic.id}`"
          class="featured-topic-card card"
        >
          <div class="ft-banner" v-if="ft.bannerImage">
            <img :src="ft.bannerImage" :alt="ft.bannerTitle || ft.topic.title">
          </div>
          <div class="ft-info">
            <span class="ft-badge">征稿进行中</span>
            <h3 class="ft-title font-serif">{{ ft.bannerTitle || ft.topic.title }}</h3>
            <p v-if="ft.bannerSubtitle" class="ft-subtitle">{{ ft.bannerSubtitle }}</p>
            <p v-else class="ft-subtitle">{{ ft.topic.description }}</p>
            <div class="ft-meta">
              <span>📝 {{ ft.topic._count?.submissions || 0 }} 篇投稿</span>
              <span v-if="ft.topic.deadline">⏰ 截止 {{ formatDate(ft.topic.deadline) }}</span>
            </div>
          </div>
        </router-link>
      </div>
    </section>

    <section class="container section">
      <div class="section-header">
        <h2 class="section-title font-serif">最新刊物</h2>
        <router-link to="/zines" class="btn btn-ghost btn-sm">查看全部 →</router-link>
      </div>
      <div v-if="featuredZines.length" class="zine-grid">
        <ZineCard v-for="zine in featuredZines" :key="zine.id" :zine="zine" />
      </div>
      <div v-else class="empty-state">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-text">加载中...</div>
      </div>
    </section>

    <section class="section-cta">
      <div class="container cta-inner">
        <div class="cta-content">
          <h2 class="cta-title font-serif">有故事想说？<br>来投稿吧。</h2>
          <p class="cta-desc">
            无论你是作家、插画师、摄影师还是音乐人，都可以在这里发布你的作品。
            人工审核，原创优先，让你的创作被真正懂的人看到。
          </p>
        </div>
        <router-link v-if="authStore.isAuthenticated" to="/submissions/new" class="btn btn-primary btn-lg">
          立即投稿 →
        </router-link>
        <router-link v-else to="/register" class="btn btn-primary btn-lg">
          注册账号 →
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'
import ZineCard from '@/components/ZineCard.vue'

const authStore = useAuthStore()
const featuredZines = ref([])
const featuredTopics = ref([])
const categories = ref([])
const stats = ref({})

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(async () => {
  try {
    const [zinesRes, catRes, featuredRes] = await Promise.all([
      api.get('/zines?limit=8&sort=newest'),
      api.get('/zines/categories'),
      api.get('/featured?activeOnly=true').catch(() => ({ featured: [] }))
    ])
    featuredZines.value = zinesRes.zines
    categories.value = catRes.categories
    featuredTopics.value = featuredRes.featured || []
    if (zinesRes.zines.length) {
      stats.value.totalZines = zinesRes.total
    }
    stats.value.totalUsers = 6
    stats.value.totalSubmissions = 5
  } catch (e) {
    console.error(e)
  }
})
</script>

<style scoped>
.hero {
  padding: 48px 0 72px;
  background: linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-primary) 100%);
  border-bottom: 1px solid var(--border-light);
}
.hero-inner {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 64px;
  align-items: center;
}
.hero-tag {
  display: inline-block;
  padding: 6px 14px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  border-radius: 100px;
  margin-bottom: 24px;
}
.hero-title {
  font-size: 48px;
  line-height: 1.2;
  margin-bottom: 24px;
  font-weight: 600;
}
.hero-desc {
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-secondary);
  margin-bottom: 36px;
  max-width: 520px;
}
.hero-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 48px;
  flex-wrap: wrap;
}
.hero-stats {
  display: flex;
  gap: 40px;
}
.stat-item {}
.stat-num {
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.stat-label {
  font-size: 13px;
  color: var(--text-tertiary);
}
.hero-visual {
  position: relative;
  height: 400px;
}
.book-stack {
  position: relative;
  width: 100%;
  height: 100%;
}
.book {
  position: absolute;
  font-size: 100px;
  filter: drop-shadow(0 8px 24px rgba(0,0,0,0.1));
  animation: float 6s ease-in-out infinite;
}
.book-1 { top: 0; left: 20%; animation-delay: 0s; font-size: 120px; }
.book-2 { top: 40px; right: 10%; animation-delay: -1s; font-size: 90px; }
.book-3 { top: 160px; left: 0; animation-delay: -2s; font-size: 100px; }
.book-4 { bottom: 60px; right: 30%; animation-delay: -3s; font-size: 85px; }
.book-5 { bottom: 20px; left: 35%; animation-delay: -4s; font-size: 95px; }
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-20px) rotate(3deg); }
}
.section {
  padding: 64px 24px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}
.section-title {
  font-size: 28px;
  font-weight: 600;
}
.section-sub {
  color: var(--text-secondary);
  font-size: 14px;
  margin-top: 4px;
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}
.category-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  transition: all 0.2s;
}
.category-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
.cat-icon { font-size: 28px; }
.cat-name { font-size: 14px; font-weight: 500; }
.zine-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}
.featured-topics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}
.featured-topic-card {
  display: flex;
  overflow: hidden;
  cursor: pointer;
}
.featured-topic-card:hover { transform: translateY(-3px); }
.ft-banner {
  width: 140px;
  flex-shrink: 0;
  overflow: hidden;
}
.ft-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ft-info {
  padding: 18px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.ft-badge {
  display: inline-block;
  padding: 2px 10px;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 8px;
  width: fit-content;
}
.ft-title {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 6px;
}
.ft-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ft-meta {
  display: flex;
  gap: 14px;
  margin-top: auto;
  font-size: 12px;
  color: var(--text-tertiary);
}
.section-cta {
  background: var(--text-primary);
  padding: 64px 0;
  margin: 32px 0 0;
}
.cta-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}
.cta-content { flex: 1; min-width: 300px; }
.cta-title {
  color: #fff;
  font-size: 32px;
  line-height: 1.3;
  margin-bottom: 12px;
}
.cta-desc {
  color: rgba(255,255,255,0.7);
  font-size: 14px;
  line-height: 1.8;
  max-width: 480px;
}
@media (max-width: 900px) {
  .hero-inner { grid-template-columns: 1fr; gap: 32px; }
  .hero-visual { height: 260px; }
  .hero-title { font-size: 36px; }
  .hero-stats { gap: 24px; }
  .section { padding: 48px 24px; }
}
@media (max-width: 600px) {
  .hero { padding: 32px 0 48px; }
  .hero-title { font-size: 28px; }
  .hero-stats { gap: 20px; }
  .stat-num { font-size: 22px; }
  .cta-inner { flex-direction: column; align-items: flex-start; }
}
</style>
