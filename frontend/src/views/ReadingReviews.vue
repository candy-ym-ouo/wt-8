<template>
  <div class="container reading-reviews">
    <div class="page-header">
      <h1>✨ 书评广场</h1>
      <router-link v-if="authStore.isAuthenticated" to="/reading/reviews/new" class="btn btn-primary">
        <span>✍️</span> 写书评
      </router-link>
    </div>

    <div class="filters-bar">
      <div class="category-chips">
        <button v-for="cat in categories" :key="cat.id"
                :class="['chip', { active: category === cat.id }]"
                @click="category = cat.id; page = 1; loadReviews()">
          <span>{{ cat.icon }}</span>
          <span>{{ cat.name }}</span>
        </button>
      </div>
      <div class="search-box">
        <input v-model="search" type="text" placeholder="搜索书评、书名..." @input="onSearch" />
      </div>
      <select v-model="sortBy" class="sort-select" @change="page = 1; loadReviews()">
        <option value="newest">最新发布</option>
        <option value="popular">最多点赞</option>
        <option value="viewed">最多浏览</option>
        <option value="rated">评分最高</option>
        <option value="featured">精选推荐</option>
      </select>
    </div>

    <div v-if="reviews.length > 0" class="reviews-grid">
      <div v-for="r in reviews" :key="r.id" class="review-card">
        <router-link :to="`/reading/reviews/${r.id}`" class="card-link"></router-link>
        <div class="card-cover">
          <img v-if="r.coverImage" :src="r.coverImage" alt="" />
          <div v-else class="cover-placeholder">
            <span>📖</span>
          </div>
          <div v-if="r.isFeatured" class="featured-badge">精选</div>
          <div class="rating-badge">
            <span>⭐</span> {{ r.rating }}.0
          </div>
        </div>
        <div class="card-body">
          <div class="book-meta">
            <span class="book-name">{{ r.bookTitle }}</span>
            <span v-if="r.bookAuthor" class="book-author">· {{ r.bookAuthor }}</span>
          </div>
          <h3 class="review-title">{{ r.title }}</h3>
          <p class="review-excerpt">{{ truncate(r.content, 100) }}</p>
          <div class="card-footer">
            <div class="author-info">
              <img :src="r.user.avatar" class="mini-avatar" alt="">
              <span>{{ r.user.username }}</span>
            </div>
            <div class="card-stats">
              <span>👁️ {{ r.viewCount || 0 }}</span>
              <span>❤️ {{ r.likeCount || 0 }}</span>
              <span>💬 {{ r.commentCount || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="empty-state">
      <span class="empty-icon">📚</span>
      <h3>暂无书评</h3>
      <p>成为第一个分享阅读感悟的人吧！</p>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-if="hasMore && !loading" class="load-more">
      <button class="btn btn-outline" @click="loadMore">加载更多</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const authStore = useAuthStore()

const categories = ref([{ id: 'all', name: '全部书评', icon: '📚' }])
const category = ref('all')
const sortBy = ref('newest')
const search = ref('')
const reviews = ref([])
const page = ref(1)
const hasMore = ref(false)
const loading = ref(false)
let searchTimer = null

const truncate = (text, len) => {
  if (!text) return ''
  return text.length > len ? text.slice(0, len) + '...' : text
}

const loadCategories = async () => {
  try {
    const res = await api.get('/reading-reviews/categories')
    categories.value = res.categories
  } catch (e) {}
}

const loadReviews = async (reset = true) => {
  if (reset) {
    page.value = 1
    reviews.value = []
  }
  loading.value = true
  try {
    const res = await api.get('/reading-reviews', {
      params: {
        page: page.value,
        limit: 12,
        category: category.value,
        sort: sortBy.value,
        search: search.value || undefined
      }
    })
    reviews.value = [...reviews.value, ...res.reviews]
    hasMore.value = page.value < res.totalPages
    page.value++
  } catch (e) {}
  loading.value = false
}

const loadMore = () => loadReviews(false)

const onSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadReviews()
  }, 400)
}

onMounted(() => {
  loadCategories()
  loadReviews()
})
</script>

<style scoped>
.reading-reviews { padding-bottom: 48px; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.page-header h1 { font-size: 28px; }

.filters-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  border: 1px solid var(--border-light);
}
.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}
.chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 20px;
  background: var(--bg-primary);
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
  white-space: nowrap;
}
.chip:hover { background: var(--bg-tertiary); }
.chip.active {
  background: var(--accent);
  color: #fff;
}

.search-box {
  position: relative;
  min-width: 220px;
}
.search-box input {
  width: 100%;
  padding: 9px 14px 9px 36px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 13px;
  font-family: inherit;
}
.search-box input:focus { outline: none; border-color: var(--accent); }
.search-box::before {
  content: '🔍';
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
}

.sort-select {
  padding: 9px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 13px;
  color: var(--text-primary);
  font-family: inherit;
}

.reviews-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.review-card {
  position: relative;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border-light);
  transition: all 0.25s;
}
.review-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--border);
}
.card-link {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.card-cover {
  position: relative;
  height: 180px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--accent-light), #e8ddc7);
}
.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  opacity: 0.5;
}
.featured-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 3;
  padding: 4px 10px;
  border-radius: 4px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}
.rating-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: #ffd700;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(10px);
}

.card-body {
  padding: 16px 18px 18px;
}
.book-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.book-name {
  color: var(--accent);
  font-weight: 600;
}
.review-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.review-excerpt {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 62px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}
.author-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}
.mini-avatar { width: 22px; height: 22px; border-radius: 50%; }
.card-stats {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--text-secondary);
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-radius: var(--radius);
}
.empty-icon { font-size: 64px; display: block; margin-bottom: 16px; }
.empty-state h3 { color: var(--text-primary); margin-bottom: 8px; }

.loading { text-align: center; padding: 40px; color: var(--text-secondary); }
.load-more { text-align: center; margin-top: 32px; }
</style>
