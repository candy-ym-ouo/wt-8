<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">我的订阅</h1>
      <p class="page-subtitle">你关注的所有刊物与作者都在这里</p>
    </div>

    <div class="sub-tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="['sub-tab', { active: currentTab === t.value }]"
        @click="currentTab = t.value"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </div>

    <div v-if="currentTab === 'zines'">
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
        <div class="tier-filter mb">
          <button
            v-for="f in tierFilters"
            :key="f.value"
            :class="['tier-btn', { active: tierFilter === f.value }]"
            @click="tierFilter = f.value; fetchData(1)"
          >
            {{ f.label }} ({{ f.count }})
          </button>
        </div>

        <div class="zine-grid">
          <div v-for="sub in subscriptions" :key="sub.id" class="sub-item card">
            <router-link :to="`/zines/${sub.zineId}`" class="sub-link">
              <div class="sub-cover">
                <img :src="sub.zine?.coverImage" :alt="sub.zine?.title">
              </div>
              <div class="sub-info">
                <div class="sub-tier-row">
                  <span class="zine-category">{{ sub.zine?.category }}</span>
                  <span :class="['tier-badge', `tier-${(sub.tier || 'FREE').toLowerCase()}`]">
                    {{ tierLabel(sub.tier) }}
                  </span>
                </div>
                <h3 class="font-serif sub-title">{{ sub.zine?.title }}</h3>
                <div class="sub-author">
                  <img :src="sub.zine?.author?.avatar" alt="">
                  <span>{{ sub.zine?.author?.username }}</span>
                </div>
                <div class="sub-notifies">
                  <span :class="['notify-tag', { on: sub.notifySeriesUpdate }]">
                    {{ sub.notifySeriesUpdate ? '🔔 系列提醒' : '🔕 系列提醒' }}
                  </span>
                  <span :class="['notify-tag', { on: sub.notifyAuthorActivity }]">
                    {{ sub.notifyAuthorActivity ? '🔔 作者动态' : '🔕 作者动态' }}
                  </span>
                </div>
                <div class="sub-date text-xs text-tertiary">
                  订阅于 {{ formatDate(sub.createdAt) }}
                </div>
              </div>
            </router-link>
            <div class="sub-actions">
              <button class="action-btn edit-btn" @click="openTierModal(sub)">切换等级</button>
              <button class="action-btn unsub-btn" @click="unsubscribe(sub.zineId)">取消订阅</button>
            </div>
          </div>
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <button class="page-btn" :disabled="page === 1" @click="fetchData(page - 1)">←</button>
          <span class="text-sm text-muted mx-2">第 {{ page }} / {{ totalPages }} 页</span>
          <button class="page-btn" :disabled="page === totalPages" @click="fetchData(page + 1)">→</button>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'updates'">
      <div v-if="loadingUpdates" class="empty-state">
        <div class="empty-state-icon">⏳</div>
        <div class="empty-state-text">加载中...</div>
      </div>
      <div v-else-if="seriesUpdates.length === 0" class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">暂无系列更新提醒</div>
      </div>
      <div v-else class="activity-list">
        <div v-for="u in seriesUpdates" :key="u.zineId" class="activity-item card">
          <div class="activity-cover">
            <img :src="u.coverImage" :alt="u.title">
          </div>
          <div class="activity-info">
            <div class="activity-type-badge">📖 系列更新</div>
            <h4 class="activity-title">{{ u.title }}</h4>
            <div class="activity-meta">
              <span>{{ u.author?.username }}</span>
              <span>更新于 {{ formatDate(u.updatedAt) }}</span>
            </div>
          </div>
          <router-link :to="`/zines/${u.zineId}`" class="btn btn-ghost btn-sm">查看</router-link>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'authors'">
      <div v-if="loadingAuthors" class="empty-state">
        <div class="empty-state-icon">⏳</div>
        <div class="empty-state-text">加载中...</div>
      </div>
      <div v-else-if="authorFollows.length === 0" class="empty-state">
        <div class="empty-state-icon">✍️</div>
        <div class="empty-state-text">还没有关注任何作者</div>
      </div>
      <div v-else class="author-grid">
        <div v-for="af in authorFollows" :key="af.id" class="author-card card">
          <div class="author-card-avatar">
            <img :src="af.author?.avatar" :alt="af.author?.username">
          </div>
          <div class="author-card-info">
            <div class="author-card-name">{{ af.author?.username }}</div>
            <div class="author-card-bio text-xs text-muted">{{ af.author?.bio || '暂无简介' }}</div>
          </div>
          <button class="action-btn unsub-btn" @click="unfollowAuthor(af.authorId)">取消关注</button>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'feed'">
      <div v-if="loadingFeed" class="empty-state">
        <div class="empty-state-icon">⏳</div>
        <div class="empty-state-text">加载中...</div>
      </div>
      <div v-else-if="authorFeed.length === 0" class="empty-state">
        <div class="empty-state-icon">📡</div>
        <div class="empty-state-text">暂无作者动态</div>
        <p class="text-sm text-muted mt">关注作者或开启作者动态提醒即可看到动态</p>
      </div>
      <div v-else class="activity-list">
        <div v-for="a in authorFeed" :key="a.id" class="activity-item card">
          <div class="activity-avatar">
            <img :src="a.author?.avatar" :alt="a.author?.username">
          </div>
          <div class="activity-info">
            <div class="activity-type-badge">{{ activityTypeLabel(a.type) }}</div>
            <h4 class="activity-title">{{ a.title }}</h4>
            <p v-if="a.content" class="activity-content text-sm text-muted">{{ a.content }}</p>
            <div class="activity-meta">
              <span>{{ a.author?.username }}</span>
              <span>{{ formatDate(a.createdAt) }}</span>
            </div>
          </div>
          <router-link
            v-if="a.linkType && a.linkId"
            :to="`/${a.linkType}/${a.linkId}`"
            class="btn btn-ghost btn-sm"
          >查看</router-link>
        </div>
      </div>
    </div>

    <div v-if="showTierModal" class="modal-overlay" @click.self="showTierModal = false">
      <div class="modal card" style="max-width: 460px;">
        <div class="modal-header">
          <h3 class="font-semibold">切换订阅等级</h3>
          <button class="btn btn-ghost btn-sm" @click="showTierModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="mb text-sm">为《{{ editingSub?.zine?.title }}》选择订阅等级：</p>
          <div class="tier-options">
            <div
              v-for="t in tierOptions"
              :key="t.value"
              :class="['tier-option', { active: selectedTier === t.value }]"
              @click="selectedTier = t.value"
            >
              <div class="tier-option-icon">{{ t.icon }}</div>
              <div class="tier-option-info">
                <div class="tier-option-name">{{ t.label }}</div>
                <div class="tier-option-desc text-xs text-muted">{{ t.desc }}</div>
              </div>
            </div>
          </div>
          <div class="form-group mt">
            <label class="checkbox-label">
              <input type="checkbox" v-model="editNotifySeries">
              <span>系列更新提醒</span>
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="editNotifyAuthor">
              <span>作者动态提醒</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showTierModal = false">取消</button>
          <button class="btn btn-primary" @click="updateTier" :disabled="submitting">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const tabs = [
  { value: 'zines', label: '刊物订阅', icon: '📖' },
  { value: 'updates', label: '系列更新', icon: '🔔' },
  { value: 'authors', label: '关注作者', icon: '✍️' },
  { value: 'feed', label: '作者动态', icon: '📡' }
]

const tierOptions = [
  { value: 'FREE', label: '免费订阅', icon: '⭐', desc: '基础内容更新通知' },
  { value: 'STANDARD', label: '标准订阅', icon: '🌟', desc: '系列更新提醒 + 优先阅读' },
  { value: 'PREMIUM', label: '高级订阅', icon: '👑', desc: '全部提醒 + 作者动态 + 专属内容' }
]

const tierFilters = computed(() => [
  { value: '', label: '全部', count: stats.value.totalSubs || 0 },
  { value: 'FREE', label: '免费', count: stats.value.freeSubs || 0 },
  { value: 'STANDARD', label: '标准', count: stats.value.standardSubs || 0 },
  { value: 'PREMIUM', label: '高级', count: stats.value.premiumSubs || 0 }
])

const currentTab = ref('zines')
const subscriptions = ref([])
const seriesUpdates = ref([])
const authorFollows = ref([])
const authorFeed = ref([])
const stats = ref({})
const loading = ref(false)
const loadingUpdates = ref(false)
const loadingAuthors = ref(false)
const loadingFeed = ref(false)
const submitting = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 12
const totalPages = computed(() => Math.ceil(total.value / pageSize))
const tierFilter = ref('')

const showTierModal = ref(false)
const editingSub = ref(null)
const selectedTier = ref('FREE')
const editNotifySeries = ref(true)
const editNotifyAuthor = ref(false)

const tierLabel = (tier) => {
  const labels = { FREE: '免费', STANDARD: '标准', PREMIUM: '高级' }
  return labels[tier] || '免费'
}

const activityTypeLabel = (type) => {
  const labels = {
    NEW_ZINE: '📖 新刊发布',
    UPDATE: '📝 内容更新',
    EVENT: '🎉 活动通知',
    ACHIEVEMENT: '🏆 成就达成',
    OTHER: '📢 动态'
  }
  return labels[type] || '📢 动态'
}

const formatDate = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fetchData = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    let url = `/subscriptions?page=${newPage}&limit=${pageSize}`
    if (tierFilter.value) url += `&tier=${tierFilter.value}`
    const res = await api.get(url)
    subscriptions.value = res.subscriptions
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const res = await api.get('/subscriptions/stats')
    stats.value = res
  } catch (e) {
    console.error(e)
  }
}

const fetchSeriesUpdates = async () => {
  loadingUpdates.value = true
  try {
    const res = await api.get('/subscriptions/series-updates')
    seriesUpdates.value = res.updates
  } catch (e) {
    console.error(e)
  } finally {
    loadingUpdates.value = false
  }
}

const fetchAuthorFollows = async () => {
  loadingAuthors.value = true
  try {
    const res = await api.get('/subscriptions/authors')
    authorFollows.value = res.subscriptions
  } catch (e) {
    console.error(e)
  } finally {
    loadingAuthors.value = false
  }
}

const fetchAuthorFeed = async () => {
  loadingFeed.value = true
  try {
    const res = await api.get('/subscriptions/author-feed')
    authorFeed.value = res.activities
  } catch (e) {
    console.error(e)
  } finally {
    loadingFeed.value = false
  }
}

const unsubscribe = async (zineId) => {
  if (!confirm('确定要取消订阅吗？')) return
  try {
    await api.delete(`/subscriptions/${zineId}`)
    showToast('已取消订阅', 'success')
    fetchData(1)
    fetchStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const unfollowAuthor = async (authorId) => {
  if (!confirm('确定要取消关注吗？')) return
  try {
    await api.delete(`/subscriptions/authors/${authorId}/follow`)
    showToast('已取消关注', 'success')
    fetchAuthorFollows()
    fetchStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const openTierModal = (sub) => {
  editingSub.value = sub
  selectedTier.value = sub.tier || 'FREE'
  editNotifySeries.value = sub.notifySeriesUpdate
  editNotifyAuthor.value = sub.notifyAuthorActivity
  showTierModal.value = true
}

const updateTier = async () => {
  if (!editingSub.value) return
  submitting.value = true
  try {
    await api.put(`/subscriptions/${editingSub.value.zineId}`, {
      tier: selectedTier.value,
      notifySeriesUpdate: editNotifySeries.value,
      notifyAuthorActivity: editNotifyAuthor.value
    })
    showToast('订阅已更新', 'success')
    showTierModal.value = false
    fetchData(page.value)
    fetchStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchData()
  fetchStats()
})

watch(currentTab, (val) => {
  if (val === 'updates' && seriesUpdates.value.length === 0) fetchSeriesUpdates()
  if (val === 'authors' && authorFollows.value.length === 0) fetchAuthorFollows()
  if (val === 'feed' && authorFeed.value.length === 0) fetchAuthorFeed()
})
</script>

<style scoped>
.sub-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid var(--border-light);
  padding-bottom: 0;
}
.sub-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;
}
.sub-tab:hover { color: var(--text-primary); }
.sub-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 600;
}
.tab-icon { font-size: 16px; }

.tier-filter {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.tier-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 100px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.tier-btn:hover { border-color: var(--accent); }
.tier-btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

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
.sub-tier-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.zine-category {
  display: inline-block;
  padding: 3px 10px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 11px;
  border-radius: 100px;
  width: fit-content;
}
.tier-badge {
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 10px;
  font-weight: 600;
}
.tier-badge.tier-free {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}
.tier-badge.tier-standard {
  background: #dbeafe;
  color: #2563eb;
}
.tier-badge.tier-premium {
  background: #fef3c7;
  color: #d97706;
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
.sub-notifies {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.notify-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}
.notify-tag.on {
  background: var(--accent-light);
  color: var(--accent);
}
.sub-date {
  margin-top: auto;
  padding-top: 8px;
}
.sub-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.action-btn {
  padding: 6px 12px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 11px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  text-align: center;
}
.edit-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.unsub-btn:hover {
  border-color: var(--danger);
  background: var(--danger-light);
  color: var(--danger);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
}
.activity-cover {
  width: 60px;
  height: 80px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex-shrink: 0;
}
.activity-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.activity-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}
.activity-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.activity-info { flex: 1; min-width: 0; }
.activity-type-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 11px;
  border-radius: 100px;
  margin-bottom: 6px;
}
.activity-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.activity-content {
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.activity-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.author-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.author-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
}
.author-card-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}
.author-card-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.author-card-info { flex: 1; min-width: 0; }
.author-card-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}
.author-card-bio {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tier-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tier-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}
.tier-option:hover { border-color: var(--accent); }
.tier-option.active {
  border-color: var(--accent);
  background: var(--accent-light);
}
.tier-option-icon { font-size: 24px; }
.tier-option-name { font-weight: 600; margin-bottom: 2px; }

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}
.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

.mx-2 { margin: 0 8px; }
</style>
