<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">合集策展管理</h1>
      <p class="page-subtitle">管理主题合集、收录刊物与精选推荐</p>
    </div>

    <div class="admin-tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="['admin-tab', { active: currentTab === t.value }]"
        @click="switchTab(t.value)"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </div>

    <div v-if="currentTab === 'collections'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            :class="['btn', statusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="statusFilter = f.value; loadCollections(1)"
          >
            {{ f.label }}
          </button>
        </div>
        <button class="btn btn-primary btn-sm" @click="openCollectionForm()">+ 新建合集</button>
      </div>

      <div class="search-box" style="margin-bottom: 16px;">
        <input
          v-model="searchKeyword"
          type="text"
          class="form-input"
          placeholder="搜索合集标题..."
          @input="debouncedSearch"
        >
      </div>

      <div v-if="loadingCollections" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="collections.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-text">暂无合集</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>封面</th>
              <th>标题</th>
              <th>分类</th>
              <th>刊物数</th>
              <th>状态</th>
              <th>浏览</th>
              <th>喜欢</th>
              <th>创建者</th>
              <th>排序</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in collections" :key="c.id">
              <td><img :src="c.coverImage" class="thumb-cover"></td>
              <td class="font-medium">{{ c.title }}</td>
              <td><span class="tag">{{ c.category }}</span></td>
              <td class="text-sm">{{ c.zineCount }}</td>
              <td>
                <span :class="['badge', c.status === 'PUBLISHED' ? 'badge-approved' : 'badge-pending']">
                  {{ statusLabel(c.status) }}
                </span>
              </td>
              <td class="text-sm">{{ c.viewCount }}</td>
              <td class="text-sm">{{ c.likeCount }}</td>
              <td class="text-sm text-muted">{{ c.creator?.username }}</td>
              <td>
                <input
                  v-model.number="c.sortOrder"
                  type="number"
                  class="form-input"
                  style="width: 60px; padding: 4px 8px; font-size: 12px;"
                  @blur="updateSortOrder(c)"
                  min="0"
                >
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openCollectionForm(c)">编辑</button>
                <button class="btn btn-ghost btn-sm" @click="openZineManager(c)">管理刊物</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteCollection(c)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page === 1" @click="loadCollections(page - 1)">←</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="page === totalPages" @click="loadCollections(page + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'featured'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">精选推荐配置</h3>
        <button class="btn btn-primary btn-sm" @click="openFeaturedForm()">+ 添加推荐</button>
      </div>

      <div v-if="loadingFeatured" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="featuredList.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">⭐</div>
        <div class="empty-state-text">暂无精选推荐</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>合集</th>
              <th>Banner标题</th>
              <th>排序</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in featuredList" :key="f.id">
              <td class="font-medium">{{ f.collection?.title }}</td>
              <td class="text-sm text-muted">{{ f.bannerTitle || '-' }}</td>
              <td class="text-sm">{{ f.sortOrder }}</td>
              <td>
                <span :class="['badge', f.isActive ? 'badge-approved' : 'badge-rejected']">
                  {{ f.isActive ? '启用' : '停用' }}
                </span>
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="toggleFeatured(f)">{{ f.isActive ? '停用' : '启用' }}</button>
                <button class="btn btn-ghost btn-sm" @click="openFeaturedForm(f)">编辑</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="removeFeatured(f)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showCollectionForm" class="modal-overlay" @click.self="showCollectionForm = false">
      <div class="modal card" style="max-width: 640px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingCollection ? '编辑合集' : '新建合集' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showCollectionForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">合集标题 <span style="color: var(--danger);">*</span></label>
            <input v-model="collectionForm.title" type="text" class="form-input" placeholder="例：夏日独立文学特辑" required>
          </div>
          <div class="form-group">
            <label class="form-label">简短描述 <span style="color: var(--danger);">*</span></label>
            <input v-model="collectionForm.description" type="text" class="form-input" placeholder="一句话介绍合集">
          </div>
          <div class="form-group">
            <label class="form-label">详细内容 / 前言</label>
            <textarea v-model="collectionForm.content" class="form-textarea" rows="4" placeholder="合集前言、策展思路..."></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">分类 <span style="color: var(--danger);">*</span></label>
              <select v-model="collectionForm.category" class="form-select">
                <option value="精选推荐">精选推荐</option>
                <option value="主题特辑">主题特辑</option>
                <option value="创作灵感">创作灵感</option>
                <option value="独立文化">独立文化</option>
                <option value="生活方式">生活方式</option>
                <option value="艺术设计">艺术设计</option>
                <option value="文学诗歌">文学诗歌</option>
                <option value="摄影影像">摄影影像</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="collectionForm.status" class="form-select">
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">已发布</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">封面图片链接</label>
            <input v-model="collectionForm.coverImage" type="text" class="form-input" placeholder="https://...">
          </div>
          <div class="form-group">
            <label class="form-label">标签（逗号分隔）</label>
            <input v-model="collectionForm.tagsText" type="text" class="form-input" placeholder="例如: 原创, 文学, 独立">
          </div>
          <div class="form-group">
            <label class="form-label">排序权重</label>
            <input v-model.number="collectionForm.sortOrder" type="number" class="form-input" min="0">
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="collectionForm.isFeatured">
              <span>设为编辑推荐</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCollectionForm = false">取消</button>
          <button class="btn btn-primary" @click="submitCollectionForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingCollection ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showZineManager" class="modal-overlay" @click.self="showZineManager = false">
      <div class="modal card" style="max-width: 800px; max-height: 85vh;">
        <div class="modal-header">
          <h3 class="font-semibold">管理收录刊物 - {{ editingCollection?.title }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showZineManager = false">✕</button>
        </div>
        <div class="modal-body" style="overflow-y: auto;">
          <div class="zine-manager-header">
            <div class="add-zine-section">
              <input
                v-model="zineSearch"
                type="text"
                class="form-input"
                placeholder="搜索刊物标题..."
                @input="searchZines"
              >
              <div v-if="zineSearchResults.length > 0" class="zine-search-results card">
                <div
                  v-for="z in zineSearchResults"
                  :key="z.id"
                  class="search-result-item"
                  @click="addZineToCollection(z)"
                >
                  <img :src="z.coverImage" class="result-thumb">
                  <div class="result-info">
                    <div class="result-title">{{ z.title }}</div>
                    <div class="result-author text-sm text-muted">{{ z.author?.username }}</div>
                  </div>
                  <span class="add-icon">+</span>
                </div>
              </div>
            </div>
          </div>

          <div class="selected-zines-section">
            <h4 class="font-semibold mb-sm">已收录刊物 ({{ collectionZines.length }})</h4>
            <div v-if="collectionZines.length === 0" class="empty-state" style="padding: 32px;">
              <div class="empty-state-icon">📭</div>
              <div class="empty-state-text text-sm">暂无收录刊物</div>
            </div>
            <div v-else class="zine-list-manage">
              <div v-for="(item, index) in collectionZines" :key="item.zineId" class="zine-manage-item card">
                <span class="zine-order">{{ index + 1 }}</span>
                <img :src="item.zine?.coverImage" class="zine-manage-cover">
                <div class="zine-manage-info">
                  <div class="zine-manage-title">{{ item.zine?.title }}</div>
                  <div class="zine-manage-author text-sm text-muted">{{ item.zine?.author?.username }}</div>
                  <div class="zine-manage-note">
                    <input
                      v-model="item.recommendNote"
                      type="text"
                      class="form-input"
                      placeholder="推荐语（选填）"
                      style="font-size: 12px; padding: 4px 10px;"
                      @blur="updateZineNote(item)"
                    >
                  </div>
                </div>
                <div class="zine-manage-actions">
                  <button v-if="index > 0" class="btn btn-ghost btn-sm" @click="moveZineUp(index)">↑</button>
                  <button v-if="index < collectionZines.length - 1" class="btn btn-ghost btn-sm" @click="moveZineDown(index)">↓</button>
                  <button class="btn btn-ghost btn-sm danger-btn" @click="removeZineFromCollection(item)">✕</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showZineManager = false">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="showFeaturedForm" class="modal-overlay" @click.self="showFeaturedForm = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingFeatured ? '编辑精选推荐' : '添加精选推荐' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showFeaturedForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">选择合集 <span style="color: var(--danger);">*</span></label>
            <select v-model="featuredForm.collectionId" class="form-select">
              <option v-for="c in publishedCollections" :key="c.id" :value="c.id">{{ c.title }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Banner图片链接</label>
            <input v-model="featuredForm.bannerImage" type="text" class="form-input" placeholder="https://...">
          </div>
          <div class="form-group">
            <label class="form-label">Banner标题</label>
            <input v-model="featuredForm.bannerTitle" type="text" class="form-input" placeholder="留空则使用合集标题">
          </div>
          <div class="form-group">
            <label class="form-label">Banner副标题</label>
            <input v-model="featuredForm.bannerSubtitle" type="text" class="form-input" placeholder="留空则使用合集描述">
          </div>
          <div class="form-group">
            <label class="form-label">排序权重</label>
            <input v-model.number="featuredForm.sortOrder" type="number" class="form-input" min="0">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">开始日期</label>
              <input v-model="featuredForm.startDate" type="date" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">结束日期</label>
              <input v-model="featuredForm.endDate" type="date" class="form-input">
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="featuredForm.isActive">
              <span>启用此推荐</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showFeaturedForm = false">取消</button>
          <button class="btn btn-primary" @click="submitFeaturedForm" :disabled="submitting">
            {{ submitting ? '处理中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const showToast = inject('showToast')

const tabs = [
  { label: '合集管理', value: 'collections', icon: '📚' },
  { label: '精选推荐', value: 'featured', icon: '⭐' }
]

const statusFilters = [
  { label: '全部', value: 'all' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '草稿', value: 'DRAFT' }
]

const currentTab = ref('collections')
const statusFilter = ref('all')
const searchKeyword = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const totalPages = ref(0)

const loadingCollections = ref(false)
const collections = ref([])
const publishedCollections = ref([])

const loadingFeatured = ref(false)
const featuredList = ref([])

const showCollectionForm = ref(false)
const editingCollection = ref(null)
const showZineManager = ref(false)
const collectionZines = ref([])
const zineSearch = ref('')
const zineSearchResults = ref([])

const showFeaturedForm = ref(false)
const editingFeatured = ref(null)

const submitting = ref(false)

const collectionForm = ref({
  title: '',
  description: '',
  content: '',
  category: '精选推荐',
  tagsText: '',
  status: 'DRAFT',
  coverImage: '',
  sortOrder: 0,
  isFeatured: false
})

const featuredForm = ref({
  collectionId: null,
  bannerImage: '',
  bannerTitle: '',
  bannerSubtitle: '',
  sortOrder: 0,
  startDate: '',
  endDate: '',
  isActive: true
})

const switchTab = (tab) => {
  currentTab.value = tab
  if (tab === 'collections') loadCollections(1)
  if (tab === 'featured') loadFeatured()
}

const statusLabel = (status) => {
  const map = { DRAFT: '草稿', PUBLISHED: '已发布' }
  return map[status] || status
}

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadCollections(1), 400)
}

const loadCollections = async (newPage = 1) => {
  loadingCollections.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({
      page: newPage,
      limit: pageSize
    })
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value)
    if (searchKeyword.value) params.set('search', searchKeyword.value)
    const res = await api.get(`/admin/collections?${params}`)
    collections.value = res.collections
    total.value = res.total
    totalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingCollections.value = false
  }
}

const loadPublishedCollections = async () => {
  try {
    const res = await api.get('/admin/collections?status=PUBLISHED&limit=100')
    publishedCollections.value = res.collections
  } catch (e) {
    console.error(e)
  }
}

const openCollectionForm = (collection = null) => {
  editingCollection.value = collection
  if (collection) {
    collectionForm.value = {
      title: collection.title,
      description: collection.description,
      content: collection.content || '',
      category: collection.category,
      tagsText: (collection.tags || []).join(', '),
      status: collection.status,
      coverImage: collection.coverImage || '',
      sortOrder: collection.sortOrder,
      isFeatured: collection.isFeatured
    }
  } else {
    collectionForm.value = {
      title: '',
      description: '',
      content: '',
      category: '精选推荐',
      tagsText: '',
      status: 'DRAFT',
      coverImage: '',
      sortOrder: 0,
      isFeatured: false
    }
  }
  showCollectionForm.value = true
}

const submitCollectionForm = async () => {
  if (!collectionForm.value.title || !collectionForm.value.description) {
    showToast('请填写标题和描述', 'warning')
    return
  }

  submitting.value = true
  try {
    const tags = collectionForm.value.tagsText
      .split(',')
      .map(t => t.trim())
      .filter(t => t)

    const data = {
      title: collectionForm.value.title,
      description: collectionForm.value.description,
      content: collectionForm.value.content,
      category: collectionForm.value.category,
      tags,
      status: collectionForm.value.status,
      coverImage: collectionForm.value.coverImage || null,
      sortOrder: collectionForm.value.sortOrder,
      isFeatured: collectionForm.value.isFeatured
    }

    if (editingCollection.value) {
      await api.put(`/admin/collections/${editingCollection.value.id}`, data)
      showToast('更新成功', 'success')
    } else {
      await api.post('/admin/collections', data)
      showToast('创建成功', 'success')
    }

    showCollectionForm.value = false
    loadCollections(page.value)
    if (currentTab.value === 'featured') loadFeatured()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteCollection = async (collection) => {
  if (!confirm(`确定要删除合集「${collection.title}」吗？`)) return
  try {
    await api.delete(`/admin/collections/${collection.id}`)
    showToast('删除成功', 'success')
    loadCollections(page.value)
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const updateSortOrder = async (collection) => {
  try {
    await api.put(`/admin/collections/${collection.id}`, {
      sortOrder: collection.sortOrder
    })
  } catch (e) {
    console.error(e)
  }
}

const openZineManager = async (collection) => {
  editingCollection.value = collection
  collectionZines.value = []
  zineSearch.value = ''
  zineSearchResults.value = []
  try {
    const res = await api.get(`/admin/collections/${collection.id}/zines`)
    collectionZines.value = res.zines
  } catch (e) {
    console.error(e)
  }
  showZineManager.value = true
}

const searchZines = async () => {
  if (!zineSearch.value.trim()) {
    zineSearchResults.value = []
    return
  }
  try {
    const res = await api.get(`/admin/collections/zines/search?search=${encodeURIComponent(zineSearch.value)}&limit=10`)
    zineSearchResults.value = res.zines
  } catch (e) {
    console.error(e)
  }
}

const addZineToCollection = async (zine) => {
  try {
    await api.post(`/admin/collections/${editingCollection.value.id}/zines`, {
      zineId: zine.id
    })
    showToast('添加成功', 'success')
    zineSearch.value = ''
    zineSearchResults.value = []
    const res = await api.get(`/admin/collections/${editingCollection.value.id}/zines`)
    collectionZines.value = res.zines
  } catch (e) {
    showToast(e.error || '添加失败', 'error')
  }
}

const removeZineFromCollection = async (item) => {
  try {
    await api.delete(`/admin/collections/${editingCollection.value.id}/zines/${item.zineId}`)
    showToast('已移除', 'success')
    const res = await api.get(`/admin/collections/${editingCollection.value.id}/zines`)
    collectionZines.value = res.zines
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const updateZineNote = async (item) => {
  try {
    await api.put(`/admin/collections/${editingCollection.value.id}/zines/${item.zineId}`, {
      recommendNote: item.recommendNote
    })
  } catch (e) {
    console.error(e)
  }
}

const moveZineUp = (index) => {
  if (index === 0) return
  const items = [...collectionZines.value]
  const temp = items[index - 1]
  items[index - 1] = items[index]
  items[index] = temp
  collectionZines.value = items
  updateZineSortOrder()
}

const moveZineDown = (index) => {
  if (index === collectionZines.value.length - 1) return
  const items = [...collectionZines.value]
  const temp = items[index + 1]
  items[index + 1] = items[index]
  items[index] = temp
  collectionZines.value = items
  updateZineSortOrder()
}

const updateZineSortOrder = async () => {
  for (let i = 0; i < collectionZines.value.length; i++) {
    try {
      await api.put(`/admin/collections/${editingCollection.value.id}/zines/${collectionZines.value[i].zineId}`, {
        sortOrder: i
      })
    } catch (e) {
      console.error(e)
    }
  }
}

const loadFeatured = async () => {
  loadingFeatured.value = true
  try {
    const res = await api.get('/admin/collections/featured/list')
    featuredList.value = res.featured
  } catch (e) {
    console.error(e)
  } finally {
    loadingFeatured.value = false
  }
}

const openFeaturedForm = (featured = null) => {
  editingFeatured.value = featured
  if (featured) {
    featuredForm.value = {
      collectionId: featured.collectionId,
      bannerImage: featured.bannerImage || '',
      bannerTitle: featured.bannerTitle || '',
      bannerSubtitle: featured.bannerSubtitle || '',
      sortOrder: featured.sortOrder,
      startDate: featured.startDate ? featured.startDate.substring(0, 10) : '',
      endDate: featured.endDate ? featured.endDate.substring(0, 10) : '',
      isActive: featured.isActive
    }
  } else {
    featuredForm.value = {
      collectionId: publishedCollections.value[0]?.id || null,
      bannerImage: '',
      bannerTitle: '',
      bannerSubtitle: '',
      sortOrder: 0,
      startDate: '',
      endDate: '',
      isActive: true
    }
  }
  showFeaturedForm.value = true
}

const submitFeaturedForm = async () => {
  if (!featuredForm.value.collectionId) {
    showToast('请选择合集', 'warning')
    return
  }

  submitting.value = true
  try {
    if (editingFeatured.value) {
      await api.put(`/admin/collections/featured/${editingFeatured.value.id}`, featuredForm.value)
      showToast('更新成功', 'success')
    } else {
      const res = await api.post('/admin/collections/featured', featuredForm.value)
      if (res.error) {
        showToast(res.error, 'error')
        return
      }
      showToast('添加成功', 'success')
    }
    showFeaturedForm.value = false
    loadFeatured()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const toggleFeatured = async (featured) => {
  try {
    await api.put(`/admin/collections/featured/${featured.id}`, {
      isActive: !featured.isActive
    })
    showToast('操作成功', 'success')
    loadFeatured()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const removeFeatured = async (featured) => {
  if (!confirm('确定要移除这个精选推荐吗？')) return
  try {
    await api.delete(`/admin/collections/featured/${featured.id}`)
    showToast('已移除', 'success')
    loadFeatured()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

onMounted(async () => {
  await loadPublishedCollections()
  loadCollections(1)
})
</script>

<style scoped>
.admin-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.admin-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.admin-tab:hover {
  color: var(--text-primary);
  border-color: var(--accent-light);
}

.admin-tab.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.tab-icon { font-size: 16px; }

.section { margin-bottom: 32px; }

.mb { margin-bottom: 16px; }
.mb-sm { margin-bottom: 10px; }

.search-box {
  max-width: 400px;
}

.admin-list {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table th {
  text-align: left;
  padding: 14px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.admin-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
}

.admin-table tr:last-child td {
  border-bottom: none;
}

.thumb-cover {
  width: 50px;
  height: 70px;
  object-fit: cover;
  border-radius: 4px;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 4px;
}

.badge {
  display: inline-block;
  padding: 3px 10px;
  font-size: 12px;
  border-radius: 100px;
  font-weight: 500;
}

.badge-approved {
  background: #e6f7ea;
  color: #2a9d4a;
}

.badge-pending {
  background: #fff7e6;
  color: #cc8800;
}

.badge-rejected {
  background: #ffeaea;
  color: #d93025;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.page-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-light);
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.zine-manager-header { margin-bottom: 20px; }

.add-zine-section {
  position: relative;
}

.zine-search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 4px;
  padding: 8px;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-result-item:hover {
  background: var(--bg-tertiary);
}

.result-thumb {
  width: 40px;
  height: 56px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.result-info { flex: 1; min-width: 0; }

.result-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-icon {
  width: 24px;
  height: 24px;
  background: var(--accent);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.selected-zines-section { }

.zine-list-manage {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.zine-manage-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  position: relative;
}

.zine-order {
  width: 24px;
  height: 24px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.zine-manage-cover {
  width: 50px;
  height: 70px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.zine-manage-info {
  flex: 1;
  min-width: 0;
}

.zine-manage-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.zine-manage-note {
  margin-top: 6px;
}

.zine-manage-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.danger-btn {
  color: var(--danger);
}

.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.gap-sm { gap: 8px; }
.text-sm { font-size: 13px; }
.text-muted { color: var(--text-secondary); }
.text-tertiary { color: var(--text-tertiary); }
.font-semibold { font-weight: 600; }
.mt-lg { margin-top: 24px; }
.py-8 { padding-top: 32px; padding-bottom: 32px; }
.py-4 { padding-top: 16px; padding-bottom: 16px; }
.text-center { text-align: center; }
</style>
