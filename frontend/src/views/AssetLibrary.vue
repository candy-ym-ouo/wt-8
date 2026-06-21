<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">🎨 素材资源库</h1>
      <p class="page-subtitle">封面模板、字体推荐、参考案例，为创作提供灵感与素材</p>
    </div>

    <div class="al-tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="['al-tab', { active: currentTab === t.value }]"
        @click="switchTab(t.value)"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </div>

    <div v-if="currentTab === 'browse'" class="section">
      <div class="filter-bar card" style="padding: 16px 20px;">
        <div class="filter-row">
          <div class="filter-group">
            <label class="filter-label">分类</label>
            <select v-model="filterCategory" class="form-select" @change="loadResources(1)">
              <option value="">全部分类</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">类型</label>
            <select v-model="filterType" class="form-select" @change="loadResources(1)">
              <option value="">全部类型</option>
              <option v-for="t in resourceTypes" :key="t.value" :value="t.value">{{ t.icon }} {{ t.label }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">排序</label>
            <select v-model="filterSort" class="form-select" @change="loadResources(1)">
              <option value="latest">最新发布</option>
              <option value="popular">最多下载</option>
              <option value="featured">精选推荐</option>
            </select>
          </div>
          <div class="filter-group" style="flex: 1;">
            <label class="filter-label">搜索</label>
            <input v-model="keyword" type="text" class="form-input" placeholder="搜索资源标题..." @keyup.enter="loadResources(1)">
          </div>
        </div>
      </div>

      <div v-if="loading" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="resources.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">暂无资源</div>
      </div>
      <div v-else class="resource-grid">
        <div v-for="r in resources" :key="r.id" class="resource-card card" @click="viewResource(r)">
          <div class="rc-cover">
            <img v-if="r.coverImage" :src="r.coverImage" :alt="r.title">
            <div v-else class="rc-cover-placeholder">{{ getTypeIcon(r.type) }}</div>
            <span v-if="!r.isFree" class="rc-badge">🔒</span>
            <span v-if="r.isFeatured" class="rc-featured">⭐</span>
            <span class="rc-type-tag">{{ getTypeLabel(r.type) }}</span>
          </div>
          <div class="rc-body">
            <div class="rc-title font-medium">{{ r.title }}</div>
            <div class="rc-desc text-sm text-muted" v-if="r.description">{{ r.description.substring(0, 60) }}{{ r.description.length > 60 ? '...' : '' }}</div>
          </div>
          <div class="rc-footer">
            <div class="rc-meta text-xs text-muted">
              <span>{{ r.category?.icon }} {{ r.category?.name }}</span>
              <span>⬇ {{ r.downloadCount }}</span>
            </div>
            <div class="rc-perms">
              <span v-if="r.requirePlan" class="perm-tag">会员</span>
              <span v-if="r.minLevel > 0" class="perm-tag">Lv.{{ r.minLevel }}</span>
              <span v-if="r.isFree" class="perm-tag free">免费</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page === 1" @click="loadResources(page - 1)">←</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="page === totalPages" @click="loadResources(page + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'detail' && selectedResource" class="section">
      <div class="card" style="padding: 28px;">
        <div class="detail-back">
          <button class="btn btn-ghost btn-sm" @click="currentTab = 'browse'">← 返回资源库</button>
        </div>

        <div class="detail-header">
          <div class="detail-cover" v-if="selectedResource.coverImage">
            <img :src="selectedResource.coverImage" :alt="selectedResource.title">
          </div>
          <div class="detail-info">
            <h3 class="font-semibold" style="font-size: 20px;">{{ selectedResource.title }}</h3>
            <div class="detail-meta text-sm text-muted mt-sm">
              <span>{{ selectedResource.category?.icon }} {{ selectedResource.category?.name }}</span>
              <span>·</span>
              <span>{{ getTypeLabel(selectedResource.type) }}</span>
              <span>·</span>
              <span>浏览 {{ selectedResource.viewCount + 1 }}</span>
              <span>·</span>
              <span>下载 {{ selectedResource.downloadCount }}</span>
            </div>
            <div class="detail-perms mt-sm">
              <span v-if="selectedResource.isFree" class="perm-tag free">✅ 免费下载</span>
              <span v-else>
                <span v-if="selectedResource.requirePlan" class="perm-tag">👑 需要会员</span>
                <span v-if="selectedResource.minLevel > 0" class="perm-tag">⭐ 需要Lv.{{ selectedResource.minLevel }}</span>
              </span>
            </div>
            <div class="detail-creator text-sm text-muted mt-sm" v-if="selectedResource.creator">
              上传者：{{ selectedResource.creator.username }}
            </div>
          </div>
        </div>

        <div class="detail-section mt">
          <h4 class="detail-section-title">资源说明</h4>
          <p v-if="selectedResource.description">{{ selectedResource.description }}</p>
          <p v-else class="text-muted">暂无描述</p>
        </div>

        <div class="detail-section mt" v-if="selectedResource.tags && parseTags(selectedResource.tags).length > 0">
          <h4 class="detail-section-title">标签</h4>
          <div class="tag-list">
            <span v-for="tag in parseTags(selectedResource.tags)" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>

        <div class="detail-file mt">
          <div class="file-info card" style="background: var(--bg-tertiary); padding: 16px;">
            <div class="file-row">
              <span class="file-icon">📄</span>
              <div class="file-detail">
                <div class="font-medium">{{ selectedResource.fileName || '资源文件' }}</div>
                <div class="text-xs text-muted">{{ selectedResource.fileType }} · {{ formatFileSize(selectedResource.fileSize) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-actions mt">
          <button
            v-if="canDownload"
            class="btn btn-primary"
            @click="downloadResource"
            :disabled="downloading"
          >
            {{ downloading ? '下载中...' : '⬇️ 下载资源' }}
          </button>
          <button
            v-if="alreadyDownloaded"
            class="btn btn-secondary"
            @click="downloadResource"
            :disabled="downloading"
          >
            ⬇️ 重新下载
          </button>
          <div v-if="!canDownload && denialReason" class="download-denied">
            <span class="denied-icon">🔒</span>
            <span>{{ denialReason }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'downloads'" class="section">
      <div v-if="loadingDownloads" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="downloads.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📥</div>
        <div class="empty-state-text">暂无下载记录</div>
      </div>
      <div v-else class="download-list">
        <div v-for="d in downloads" :key="d.id" class="download-card card">
          <div class="dl-icon">{{ getTypeIcon(d.resource?.type) }}</div>
          <div class="dl-info">
            <div class="font-medium">{{ d.resource?.title }}</div>
            <div class="text-xs text-muted">{{ d.resource?.category?.name }} · {{ formatDateTime(d.createdAt) }}</div>
          </div>
          <button class="btn btn-sm btn-secondary" @click="redownload(d.resource?.id)">重新下载</button>
        </div>
      </div>
      <div v-if="dlTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="dlPage === 1" @click="loadDownloads(dlPage - 1)">←</button>
        <span class="page-info">第 {{ dlPage }} / {{ dlTotalPages }} 页</span>
        <button class="page-btn" :disabled="dlPage === dlTotalPages" @click="loadDownloads(dlPage + 1)">→</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const authStore = useAuthStore()
const showToast = inject('showToast')

const tabs = [
  { value: 'browse', label: '浏览资源', icon: '📚' },
  { value: 'downloads', label: '我的下载', icon: '📥' }
]

const resourceTypes = [
  { value: 'COVER_TEMPLATE', label: '封面模板', icon: '🖼️' },
  { value: 'FONT', label: '字体推荐', icon: '🔤' },
  { value: 'REFERENCE', label: '参考案例', icon: '📖' },
  { value: 'TOOL', label: '工具素材', icon: '🔧' },
  { value: 'OTHER', label: '其他', icon: '📦' }
]

const currentTab = ref('browse')
const categories = ref([])
const resources = ref([])
const loading = ref(false)
const page = ref(1)
const totalPages = ref(1)
const filterCategory = ref('')
const filterType = ref('')
const filterSort = ref('latest')
const keyword = ref('')

const selectedResource = ref(null)
const canDownload = ref(false)
const alreadyDownloaded = ref(false)
const denialReason = ref(null)
const downloading = ref(false)

const downloads = ref([])
const loadingDownloads = ref(false)
const dlPage = ref(1)
const dlTotalPages = ref(1)

const getTypeLabel = (t) => resourceTypes.find(r => r.value === t)?.label || t
const getTypeIcon = (t) => resourceTypes.find(r => r.value === t)?.icon || '📦'

const parseTags = (tags) => {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  try { return JSON.parse(tags) } catch { return [] }
}

const formatFileSize = (bytes) => {
  if (!bytes) return '未知大小'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

const formatDateTime = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const switchTab = (t) => {
  currentTab.value = t
  if (t === 'browse') loadResources(1)
  if (t === 'downloads') loadDownloads(1)
}

const loadCategories = async () => {
  try {
    const res = await api.get('/asset-library/categories')
    categories.value = res.categories
  } catch (e) { console.error(e) }
}

const loadResources = async (newPage = 1) => {
  loading.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 12, sort: filterSort.value })
    if (filterCategory.value) params.set('categoryId', filterCategory.value)
    if (filterType.value) params.set('type', filterType.value)
    if (keyword.value) params.set('keyword', keyword.value)
    const res = await api.get(`/asset-library/resources?${params}`)
    resources.value = res.resources
    totalPages.value = res.totalPages
  } catch (e) { console.error(e) } finally { loading.value = false }
}

const viewResource = async (r) => {
  try {
    const res = await api.get(`/asset-library/resources/${r.id}`)
    selectedResource.value = res.resource
    canDownload.value = res.canDownload
    denialReason.value = res.denialReason
    alreadyDownloaded.value = !!res.alreadyDownloaded
    currentTab.value = 'detail'
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  }
}

const downloadResource = async () => {
  if (!selectedResource.value) return
  downloading.value = true
  try {
    const res = await api.post(`/asset-library/resources/${selectedResource.value.id}/download`)
    alreadyDownloaded.value = !!res.alreadyDownloaded
    canDownload.value = true
    denialReason.value = null
    if (res.fileUrl) {
      const a = document.createElement('a')
      a.href = res.fileUrl
      a.download = res.fileName || 'download'
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    showToast(res.alreadyDownloaded ? '重新下载成功' : '下载成功', 'success')
  } catch (e) {
    if (e.error) {
      denialReason.value = e.error
      canDownload.value = false
      alreadyDownloaded.value = false
      showToast(e.error, 'error')
    } else {
      showToast('下载失败', 'error')
    }
  } finally {
    downloading.value = false
  }
}

const redownload = async (resourceId) => {
  if (!resourceId) return
  try {
    const res = await api.post(`/asset-library/resources/${resourceId}/download`)
    if (res.fileUrl) {
      const a = document.createElement('a')
      a.href = res.fileUrl
      a.download = res.fileName || 'download'
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    showToast('下载成功', 'success')
  } catch (e) {
    showToast(e.error || '下载失败', 'error')
  }
}

const loadDownloads = async (newPage = 1) => {
  if (!authStore.isAuthenticated) return
  loadingDownloads.value = true
  dlPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 12 })
    const res = await api.get(`/asset-library/my-downloads?${params}`)
    downloads.value = res.downloads
    dlTotalPages.value = res.totalPages
  } catch (e) { console.error(e) } finally { loadingDownloads.value = false }
}

onMounted(async () => {
  await loadCategories()
  await loadResources()
})
</script>

<style scoped>
.al-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 6px;
  flex-wrap: wrap;
}
.al-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.al-tab:hover { color: var(--text-primary); background: var(--bg-tertiary); }
.al-tab.active { background: var(--accent); color: #fff; }
.tab-icon { font-size: 16px; }

.filter-bar { margin-bottom: 20px; }
.filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  align-items: end;
}
.filter-group { }
.filter-label { font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px; display: block; }

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}
.resource-card {
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}
.resource-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }

.rc-cover {
  position: relative;
  aspect-ratio: 16 / 10;
  background: var(--bg-tertiary);
  overflow: hidden;
}
.rc-cover img { width: 100%; height: 100%; object-fit: cover; }
.rc-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
}
.rc-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 12px;
}
.rc-featured {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 18px;
}
.rc-type-tag {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  padding: 2px 10px;
  border-radius: 100px;
  font-size: 11px;
}
.rc-body { padding: 14px 16px 8px; }
.rc-title { font-size: 15px; margin-bottom: 4px; }
.rc-desc { font-size: 13px; line-height: 1.4; }
.rc-footer {
  padding: 8px 16px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rc-meta { display: flex; gap: 12px; }
.rc-perms { display: flex; gap: 4px; }

.perm-tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 11px;
  border-radius: 100px;
}
.perm-tag.free { background: #f6ffed; color: #52c41a; }

.detail-back { margin-bottom: 16px; }
.detail-header {
  display: flex;
  gap: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 20px;
}
.detail-cover {
  width: 240px;
  min-height: 150px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex-shrink: 0;
}
.detail-cover img { width: 100%; height: 100%; object-fit: cover; }
.detail-info { flex: 1; }
.detail-meta { display: flex; gap: 6px; flex-wrap: wrap; }
.detail-perms { display: flex; gap: 8px; }

.detail-section { margin-bottom: 16px; }
.detail-section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-light);
}
.detail-section p { font-size: 14px; line-height: 1.7; }

.tag-list { display: flex; gap: 6px; flex-wrap: wrap; }
.tag {
  display: inline-block;
  padding: 2px 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 100px;
}

.file-info { }
.file-row { display: flex; align-items: center; gap: 12px; }
.file-icon { font-size: 28px; }
.file-detail { }

.detail-actions {
  display: flex;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
  align-items: center;
  flex-wrap: wrap;
}
.download-denied {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff7e6;
  border-radius: var(--radius-sm);
  color: #d48806;
  font-size: 14px;
}
.denied-icon { font-size: 18px; }

.download-list { display: flex; flex-direction: column; gap: 12px; }
.download-card {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.dl-icon { font-size: 28px; }
.dl-info { flex: 1; }

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
}
.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-primary);
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-secondary); }

.mt { margin-top: 16px; }
.mt-sm { margin-top: 8px; }
.text-sm { font-size: 13px; }
.text-xs { font-size: 12px; }
.text-muted { color: var(--text-tertiary); }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }

.section { margin-bottom: 24px; }
</style>
