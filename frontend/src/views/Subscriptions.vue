<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">我的订阅</h1>
      <p class="page-subtitle">你关注的所有刊物都在这里</p>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="subscriptions.length === 0" class="empty-state">
      <div class="empty-state-icon">⭐</div>
      <div class="empty-state-text">还没有订阅任何刊物</div>
      <router-link to="/zines" class="btn btn-primary">去发现好刊物</router-link>
    </div>
    <div v-else>
      <div class="zine-grid">
        <div v-for="sub in subscriptions" :key="sub.id" class="sub-item card">
          <router-link :to="`/zines/${sub.zineId}`" class="sub-link">
            <div class="sub-cover">
              <img :src="sub.zine?.coverImage" :alt="sub.zine?.title">
            </div>
            <div class="sub-info">
              <span class="zine-category" style="margin-bottom: 8px">{{ sub.zine?.category }}</span>
              <h3 class="font-serif sub-title">{{ sub.zine?.title }}</h3>
              <div class="sub-author">
                <img :src="sub.zine?.author?.avatar" alt="">
                <span>{{ sub.zine?.author?.username }}</span>
              </div>
              <div class="sub-date text-xs text-tertiary">
                订阅于 {{ formatDate(sub.createdAt) }}
              </div>
            </div>
          </router-link>
          <button class="unsub-btn" @click="unsubscribe(sub.zineId)">
            取消订阅
          </button>
        </div>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page === 1" @click="fetchData(page - 1)">←</button>
        <span class="text-sm text-muted mx-2">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="page === totalPages" @click="fetchData(page + 1)">→</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const subscriptions = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 12
const totalPages = computed(() => Math.ceil(total.value / pageSize))

const formatDate = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fetchData = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const res = await api.get(`/subscriptions?page=${newPage}&limit=${pageSize}`)
    subscriptions.value = res.subscriptions
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const unsubscribe = async (zineId) => {
  if (!confirm('确定要取消订阅吗？')) return
  try {
    await api.delete(`/subscriptions/${zineId}`)
    showToast('已取消订阅', 'success')
    fetchData(1)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.zine-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}
.sub-item {
  padding: 16px;
  display: flex;
  flex-direction: column;
}
.sub-link {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 14px;
}
.sub-cover {
  aspect-ratio: 5 / 7;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
}
.sub-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}
.sub-item:hover .sub-cover img { transform: scale(1.05); }
.sub-info { display: flex; flex-direction: column; flex: 1; }
.zine-category {
  display: inline-block;
  padding: 3px 10px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 11px;
  border-radius: 100px;
  width: fit-content;
}
.sub-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sub-author {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.sub-author img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}
.sub-author span {
  font-size: 12px;
  color: var(--text-secondary);
}
.sub-date {
  margin-top: auto;
  padding-top: 8px;
}
.unsub-btn {
  margin-top: 14px;
  padding: 8px 14px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}
.unsub-btn:hover {
  border-color: var(--danger);
  background: var(--danger-light);
  color: var(--danger);
}
.mx-2 { margin: 0 8px; }
</style>
