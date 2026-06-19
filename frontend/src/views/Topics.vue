<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">专题征稿</h1>
      <p class="page-subtitle">参与专题创作，让你的作品被更多人看见</p>
    </div>

    <div class="topic-filters">
      <button
        v-for="f in statusFilters"
        :key="f.value"
        :class="['btn', currentStatus === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
        @click="currentStatus = f.value; loadTopics(1)"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>

    <div v-else-if="topics.length === 0" class="empty-state card" style="padding: 48px;">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-text">暂无征稿专题</div>
    </div>

    <div v-else class="topic-grid">
      <router-link
        v-for="topic in topics"
        :key="topic.id"
        :to="`/topics/${topic.id}`"
        class="topic-card card"
      >
        <div class="topic-cover">
          <img v-if="topic.coverImage" :src="topic.coverImage" :alt="topic.title">
          <div v-else class="topic-cover-placeholder">📋</div>
          <span :class="['topic-status-badge', `badge-${topic.status.toLowerCase()}`]">
            {{ statusLabel(topic.status) }}
          </span>
        </div>
        <div class="topic-info">
          <div class="topic-category">{{ topic.category }}</div>
          <h3 class="topic-title font-serif">{{ topic.title }}</h3>
          <p class="topic-desc">{{ topic.description }}</p>
          <div class="topic-tags" v-if="topic.tags && topic.tags.length">
            <span v-for="tag in topic.tags.slice(0, 3)" :key="tag" class="tag">#{{ tag }}</span>
          </div>
          <div class="topic-meta">
            <div class="topic-creator">
              <img :src="topic.creator?.avatar" alt="">
              <span>{{ topic.creator?.username }}</span>
            </div>
            <div class="topic-stats">
              <span>📝 {{ topic._count?.submissions || 0 }} 篇投稿</span>
            </div>
          </div>
          <div v-if="topic.deadline" class="topic-deadline" :class="{ urgent: isUrgent(topic.deadline) }">
            截止：{{ formatDate(topic.deadline) }}
          </div>
        </div>
      </router-link>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="page <= 1"
        @click="loadTopics(page - 1)"
      >上一页</button>
      <span class="text-sm text-muted">{{ page }} / {{ totalPages }}</span>
      <button
        class="page-btn"
        :disabled="page >= totalPages"
        @click="loadTopics(page + 1)"
      >下一页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

const topics = ref([])
const loading = ref(true)
const currentStatus = ref('ACTIVE')
const page = ref(1)
const totalPages = ref(0)

const statusFilters = [
  { label: '进行中', value: 'ACTIVE' },
  { label: '全部', value: 'all' },
  { label: '即将开始', value: 'DRAFT' },
  { label: '已结束', value: 'CLOSED' }
]

const statusLabel = (s) => ({
  DRAFT: '即将开始',
  ACTIVE: '进行中',
  CLOSED: '已结束',
  ARCHIVED: '已归档'
}[s] || s)

const isUrgent = (deadline) => {
  const diff = new Date(deadline) - new Date()
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000
}

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const loadTopics = async (p = 1) => {
  loading.value = true
  page.value = p
  try {
    const params = new URLSearchParams({ page: p, limit: 12 })
    if (currentStatus.value !== 'all') params.set('status', currentStatus.value)
    const res = await api.get(`/topics?${params}`)
    topics.value = res.topics
    totalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadTopics())
</script>

<style scoped>
.topic-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 28px;
}
.topic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}
.topic-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
}
.topic-card:hover { transform: translateY(-4px); }
.topic-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--bg-tertiary);
}
.topic-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}
.topic-card:hover .topic-cover img { transform: scale(1.05); }
.topic-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  background: linear-gradient(135deg, var(--bg-tertiary), var(--accent-light));
}
.topic-status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(4px);
}
.badge-draft { background: rgba(212, 160, 60, 0.9); color: #fff; }
.badge-active { background: rgba(90, 143, 90, 0.9); color: #fff; }
.badge-closed { background: rgba(156, 146, 138, 0.9); color: #fff; }
.badge-archived { background: rgba(107, 101, 96, 0.9); color: #fff; }
.topic-info {
  padding: 18px 20px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.topic-category {
  font-size: 12px;
  color: var(--accent);
  font-weight: 500;
  margin-bottom: 6px;
}
.topic-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.topic-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.topic-tags { margin-bottom: 12px; }
.topic-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}
.topic-creator {
  display: flex;
  align-items: center;
  gap: 8px;
}
.topic-creator img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}
.topic-creator span {
  font-size: 12px;
  color: var(--text-secondary);
}
.topic-stats {
  font-size: 12px;
  color: var(--text-tertiary);
}
.topic-deadline {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--border-light);
  font-size: 12px;
  color: var(--text-tertiary);
}
.topic-deadline.urgent {
  color: var(--danger);
  font-weight: 500;
}
@media (max-width: 768px) {
  .topic-grid { grid-template-columns: 1fr; }
}
</style>
