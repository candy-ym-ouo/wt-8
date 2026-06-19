<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>

    <template v-else-if="topic">
      <div class="topic-header">
        <router-link to="/topics" class="back-link">← 返回专题列表</router-link>
        <div class="topic-header-inner card">
          <div class="topic-cover-area">
            <img v-if="topic.coverImage" :src="topic.coverImage" :alt="topic.title">
            <div v-else class="cover-placeholder">📋</div>
          </div>
          <div class="topic-header-info">
            <div class="topic-meta-top">
              <span class="topic-category-tag">{{ topic.category }}</span>
              <span :class="['badge', statusBadgeClass(topic.status)]">{{ statusLabel(topic.status) }}</span>
            </div>
            <h1 class="topic-title font-serif">{{ topic.title }}</h1>
            <p class="topic-description">{{ topic.description }}</p>
            <div class="topic-tags" v-if="topic.tags && topic.tags.length">
              <span v-for="tag in topic.tags" :key="tag" class="tag">#{{ tag }}</span>
            </div>
            <div class="topic-info-row">
              <div class="info-item">
                <span class="info-icon">👤</span>
                <span>{{ topic.creator?.username }}</span>
              </div>
              <div class="info-item">
                <span class="info-icon">📝</span>
                <span>{{ topic._count?.submissions || 0 }} 篇投稿</span>
              </div>
              <div v-if="topic.deadline" class="info-item" :class="{ urgent: isUrgent(topic.deadline) }">
                <span class="info-icon">⏰</span>
                <span>截止 {{ formatDate(topic.deadline) }}</span>
              </div>
            </div>
            <div v-if="topic.prizes" class="topic-prizes">
              <span class="info-icon">🏆</span>
              <span>{{ topic.prizes }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="topic-body-layout">
        <div class="topic-content-section card">
          <h2 class="section-title">征稿详情</h2>
          <div class="topic-content" v-html="formatContent(topic.content)"></div>
          <div v-if="topic.requirements" class="topic-requirements">
            <h3 class="req-title">📋 投稿要求</h3>
            <div class="req-content" v-html="formatContent(topic.requirements)"></div>
          </div>
        </div>

        <div class="topic-submit-section">
          <div v-if="topic.status !== 'ACTIVE'" class="card submit-disabled">
            <div class="empty-state-icon">📋</div>
            <p class="text-sm text-muted" style="margin-top: 12px;">
              {{ topic.status === 'DRAFT' ? '专题尚未开始征稿' : topic.status === 'CLOSED' ? '征稿已截止' : '专题已归档' }}
            </p>
          </div>

          <div v-else-if="hasSubmitted" class="card submit-done">
            <div class="done-icon">✅</div>
            <h3 class="font-semibold">您已投稿</h3>
            <p class="text-sm text-muted mt-sm">您已在此专题提交过稿件，请前往"我的专题投稿"查看审核进度。</p>
            <router-link to="/topic-submissions" class="btn btn-primary btn-sm mt">查看我的投稿</router-link>
          </div>

          <div v-else-if="isDeadlinePassed" class="card submit-disabled">
            <div class="empty-state-icon">⏰</div>
            <p class="text-sm text-muted" style="margin-top: 12px;">投稿截止时间已过</p>
          </div>

          <form v-else class="card submit-form" @submit.prevent="handleSubmit">
            <h3 class="form-title">📝 投稿到本专题</h3>
            <div class="form-group">
              <label class="form-label">作品标题 <span class="text-danger">*</span></label>
              <input
                v-model="form.title"
                type="text"
                class="form-input"
                placeholder="给你的作品起个标题"
                maxlength="60"
                required
              >
            </div>
            <div class="form-group">
              <label class="form-label">作品内容 <span class="text-danger">*</span></label>
              <textarea
                v-model="form.content"
                class="form-textarea"
                rows="10"
                placeholder="在这里写下你的作品内容..."
                required
              ></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">配图（可选）</label>
              <textarea
                v-model="imagesText"
                class="form-textarea"
                rows="2"
                placeholder="每行一个图片链接"
              ></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-lg" :disabled="submitting" style="width: 100%;">
              {{ submitting ? '提交中...' : '提交投稿' }}
            </button>
          </form>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <div class="empty-state-icon">😕</div>
      <div class="empty-state-text">专题不存在</div>
      <router-link to="/topics" class="btn btn-primary btn-sm">返回列表</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const showToast = inject('showToast')

const topic = ref(null)
const loading = ref(true)
const hasSubmitted = ref(false)
const submitting = ref(false)
const form = ref({ title: '', content: '' })
const imagesText = ref('')

const isDeadlinePassed = computed(() => {
  if (!topic.value?.deadline) return false
  return new Date(topic.value.deadline) < new Date()
})

const statusLabel = (s) => ({
  DRAFT: '即将开始', ACTIVE: '进行中', CLOSED: '已结束', ARCHIVED: '已归档'
}[s] || s)

const statusBadgeClass = (s) => ({
  DRAFT: 'badge-pending', ACTIVE: 'badge-approved', CLOSED: 'badge-rejected', ARCHIVED: 'badge-rejected'
}[s] || '')

const isUrgent = (deadline) => {
  const diff = new Date(deadline) - new Date()
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000
}

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatContent = (text) => {
  if (!text) return ''
  return text.replace(/\n/g, '<br>')
}

const checkSubmission = async () => {
  if (!authStore.isAuthenticated) return
  try {
    const res = await api.get('/topic-submissions?limit=100')
    hasSubmitted.value = res.submissions.some(s => s.topicId === Number(route.params.id))
  } catch (e) {}
}

const handleSubmit = async () => {
  if (!authStore.isAuthenticated) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }
  if (!form.value.title.trim() || !form.value.content.trim()) {
    showToast('请填写标题和内容', 'warning')
    return
  }
  submitting.value = true
  try {
    const images = imagesText.value.split('\n').map(s => s.trim()).filter(Boolean)
    await api.post('/topic-submissions', {
      topicId: Number(route.params.id),
      title: form.value.title.trim(),
      content: form.value.content.trim(),
      images
    })
    showToast('投稿成功！等待编辑审核', 'success')
    hasSubmitted.value = true
  } catch (e) {
    showToast(e.error || '投稿失败', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    const res = await api.get(`/topics/${route.params.id}`)
    topic.value = res.topic
    await checkSubmission()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: color 0.2s;
}
.back-link:hover { color: var(--accent); }
.topic-header-inner {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 32px;
  padding: 24px;
  overflow: hidden;
}
.topic-cover-area {
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-tertiary);
}
.topic-cover-area img {
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
  font-size: 72px;
  background: linear-gradient(135deg, var(--bg-tertiary), var(--accent-light));
}
.topic-header-info {
  display: flex;
  flex-direction: column;
}
.topic-meta-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.topic-category-tag {
  padding: 3px 10px;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}
.topic-title {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 12px;
}
.topic-description {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 14px;
}
.topic-tags { margin-bottom: 14px; }
.topic-info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--border-light);
}
.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}
.info-icon { font-size: 16px; }
.info-item.urgent { color: var(--danger); font-weight: 500; }
.topic-prizes {
  margin-top: 10px;
  padding: 10px 14px;
  background: var(--warning-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.topic-body-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
  margin-top: 24px;
  align-items: start;
}
.topic-content-section { padding: 28px; }
.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}
.topic-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-primary);
}
.topic-requirements {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
}
.req-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}
.req-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.submit-disabled, .submit-done {
  padding: 36px 24px;
  text-align: center;
}
.done-icon { font-size: 48px; margin-bottom: 12px; }
.submit-form {
  padding: 24px;
  position: sticky;
  top: 88px;
}
.form-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}
.text-danger { color: var(--danger); }
@media (max-width: 900px) {
  .topic-header-inner { grid-template-columns: 1fr; }
  .topic-cover-area { max-height: 220px; }
  .topic-body-layout { grid-template-columns: 1fr; }
  .submit-form { position: static; }
}
</style>
