<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">🗂️ 素材资源库管理</h1>
      <p class="page-subtitle">分类运营、资源管理、下载统计</p>
    </div>

    <div v-if="stats" class="stats-grid">
      <div class="stat-card card">
        <div class="stat-label">总资源</div>
        <div class="stat-value">{{ stats.totalResources }}</div>
      </div>
      <div class="stat-card card highlight-success">
        <div class="stat-label">已发布</div>
        <div class="stat-value">{{ stats.publishedResources }}</div>
      </div>
      <div class="stat-card card highlight-info">
        <div class="stat-label">分类数</div>
        <div class="stat-value">{{ stats.totalCategories }}</div>
      </div>
      <div class="stat-card card highlight-warning">
        <div class="stat-label">总下载</div>
        <div class="stat-value">{{ stats.totalDownloads }}</div>
      </div>
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

    <div v-if="currentTab === 'categories'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">分类管理</h3>
        <button class="btn btn-primary btn-sm" @click="openCategoryForm()">+ 新建分类</button>
      </div>
      <div v-if="loadingCategories" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="adminCategories.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📁</div>
        <div class="empty-state-text">暂无分类</div>
      </div>
      <div v-else class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>图标</th>
              <th>名称</th>
              <th>标识</th>
              <th>类型</th>
              <th>资源数</th>
              <th>排序</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in adminCategories" :key="c.id">
              <td><span class="text-lg">{{ c.icon || '📁' }}</span></td>
              <td class="font-medium">{{ c.name }}</td>
              <td class="text-sm text-muted">{{ c.slug }}</td>
              <td><span class="tag">{{ categoryTypeLabel(c.type) }}</span></td>
              <td class="text-sm">{{ c._count?.resources || 0 }}</td>
              <td class="text-sm">{{ c.sortOrder }}</td>
              <td>
                <span :class="['status-badge', c.isActive ? 'status-active' : 'status-draft']">
                  {{ c.isActive ? '启用' : '禁用' }}
                </span>
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openCategoryForm(c)">编辑</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteCategory(c)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'resources'" class="section">
      <div class="filter-bar card" style="padding: 16px 20px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">分类</label>
            <select v-model="resFilterCategory" class="form-select" @change="loadResources(1)">
              <option value="">全部</option>
              <option v-for="c in adminCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">类型</label>
            <select v-model="resFilterType" class="form-select" @change="loadResources(1)">
              <option value="">全部</option>
              <option v-for="t in resourceTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">状态</label>
            <select v-model="resFilterStatus" class="form-select" @change="loadResources(1)">
              <option value="">全部</option>
              <option value="PUBLISHED">已发布</option>
              <option value="DRAFT">草稿</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">关键词</label>
            <input v-model="resKeyword" type="text" class="form-input" placeholder="搜索资源" @keyup.enter="loadResources(1)">
          </div>
        </div>
        <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
          <button class="btn btn-primary btn-sm" @click="openResourceForm()">+ 新建资源</button>
          <div>
            <button class="btn btn-secondary btn-sm" @click="resetResFilters">重置</button>
            <button class="btn btn-primary btn-sm" style="margin-left: 8px;" @click="loadResources(1)">🔍 搜索</button>
          </div>
        </div>
      </div>

      <div v-if="loadingResources" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="adminResources.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">暂无资源</div>
      </div>
      <div v-else class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>封面</th>
              <th>标题</th>
              <th>分类</th>
              <th>类型</th>
              <th>权限</th>
              <th>下载</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in adminResources" :key="r.id">
              <td>
                <img v-if="r.coverImage" :src="r.coverImage" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;">
                <span v-else>{{ getTypeIcon(r.type) }}</span>
              </td>
              <td class="font-medium">{{ r.title }}</td>
              <td class="text-sm">{{ r.category?.name }}</td>
              <td><span class="tag">{{ getTypeLabel(r.type) }}</span></td>
              <td class="text-sm">
                <span v-if="r.isFree" class="perm-tag free">免费</span>
                <span v-if="r.requirePlan" class="perm-tag">会员</span>
                <span v-if="r.minLevel > 0" class="perm-tag">Lv.{{ r.minLevel }}</span>
              </td>
              <td class="text-sm">{{ r.downloadCount }}</td>
              <td>
                <span :class="['status-badge', r.status === 'PUBLISHED' ? 'status-active' : 'status-draft']">
                  {{ r.status === 'PUBLISHED' ? '已发布' : '草稿' }}
                </span>
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openResourceForm(r)">编辑</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteResource(r)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="resTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="resPage === 1" @click="loadResources(resPage - 1)">←</button>
        <span class="page-info">第 {{ resPage }} / {{ resTotalPages }} 页 · 共 {{ resTotal }} 条</span>
        <button class="page-btn" :disabled="resPage === resTotalPages" @click="loadResources(resPage + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'downloads'" class="section">
      <div v-if="loadingDownloads" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="adminDownloads.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📥</div>
        <div class="empty-state-text">暂无下载记录</div>
      </div>
      <div v-else class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>资源</th>
              <th>类型</th>
              <th>状态</th>
              <th>失败原因</th>
              <th>下载时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in adminDownloads" :key="d.id">
              <td class="text-sm">{{ d.user?.username }}</td>
              <td class="font-medium text-sm">{{ d.resource?.title }}</td>
              <td class="text-sm">{{ getTypeLabel(d.resource?.type) }}</td>
              <td>
                <span :class="['status-badge', d.status === 'SUCCESS' ? 'status-active' : 'status-rejected']">
                  {{ d.status === 'SUCCESS' ? '成功' : '失败' }}
                </span>
              </td>
              <td class="text-sm text-muted">{{ d.failReason || '-' }}</td>
              <td class="text-sm text-muted">{{ formatDateTime(d.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="dlTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="dlPage === 1" @click="loadAdminDownloads(dlPage - 1)">←</button>
        <span class="page-info">第 {{ dlPage }} / {{ dlTotalPages }} 页</span>
        <button class="page-btn" :disabled="dlPage === dlTotalPages" @click="loadAdminDownloads(dlPage + 1)">→</button>
      </div>
    </div>

    <div v-if="showCategoryModal" class="modal-overlay" @click.self="showCategoryModal = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingCategory ? '编辑分类' : '新建分类' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showCategoryModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">分类名称 <span class="required">*</span></label>
              <input v-model="categoryForm.name" type="text" class="form-input" placeholder="例：封面模板" required>
            </div>
            <div class="form-group">
              <label class="form-label">标识(slug) <span class="required">*</span></label>
              <input v-model="categoryForm.slug" type="text" class="form-input" placeholder="例：cover-template" required>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">图标</label>
              <input v-model="categoryForm.icon" type="text" class="form-input" placeholder="例：🖼️">
            </div>
            <div class="form-group">
              <label class="form-label">分类类型</label>
              <select v-model="categoryForm.type" class="form-select">
                <option value="GENERAL">通用</option>
                <option value="COVER">封面</option>
                <option value="FONT">字体</option>
                <option value="REFERENCE">参考</option>
                <option value="TOOL">工具</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="categoryForm.description" class="form-textarea" rows="2" placeholder="分类描述..."></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">排序权重</label>
              <input v-model.number="categoryForm.sortOrder" type="number" class="form-input" min="0">
            </div>
            <div class="form-group" style="display: flex; align-items: end; padding-bottom: 4px;">
              <label class="checkbox-label">
                <input type="checkbox" v-model="categoryForm.isActive">
                <span>启用</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCategoryModal = false">取消</button>
          <button class="btn btn-primary" @click="submitCategoryForm" :disabled="submitting">{{ submitting ? '处理中...' : (editingCategory ? '保存' : '创建') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showResourceModal" class="modal-overlay" @click.self="showResourceModal = false">
      <div class="modal card" style="max-width: 680px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingResource ? '编辑资源' : '新建资源' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showResourceModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">资源标题 <span class="required">*</span></label>
            <input v-model="resourceForm.title" type="text" class="form-input" placeholder="例：极简风格封面模板" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">所属分类 <span class="required">*</span></label>
              <select v-model="resourceForm.categoryId" class="form-select" required>
                <option v-for="c in adminCategories" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">资源类型</label>
              <select v-model="resourceForm.type" class="form-select">
                <option v-for="t in resourceTypes" :key="t.value" :value="t.value">{{ t.icon }} {{ t.label }}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="resourceForm.description" class="form-textarea" rows="3" placeholder="资源描述..."></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">封面图片链接</label>
              <input v-model="resourceForm.coverImage" type="text" class="form-input" placeholder="https://...">
            </div>
            <div class="form-group">
              <label class="form-label">文件地址 <span class="required">*</span></label>
              <input v-model="resourceForm.fileUrl" type="text" class="form-input" placeholder="https://..." required>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">文件名</label>
              <input v-model="resourceForm.fileName" type="text" class="form-input" placeholder="template.psd">
            </div>
            <div class="form-group">
              <label class="form-label">文件大小(字节)</label>
              <input v-model.number="resourceForm.fileSize" type="number" class="form-input" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">文件类型</label>
              <select v-model="resourceForm.fileType" class="form-select">
                <option value="IMAGE">图片</option>
                <option value="FONT">字体</option>
                <option value="DOCUMENT">文档</option>
                <option value="ARCHIVE">压缩包</option>
                <option value="VIDEO">视频</option>
                <option value="OTHER">其他</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">标签（逗号分隔）</label>
            <input v-model="resourceForm.tagsText" type="text" class="form-input" placeholder="封面, 模板, 极简">
          </div>
          <div class="permission-section">
            <h4 class="section-subtitle">下载权限设置</h4>
            <div class="permission-grid">
              <label class="permission-item">
                <input type="checkbox" v-model="resourceForm.isFree">
                <div>
                  <div class="perm-title">🆓 免费下载</div>
                  <div class="perm-desc">所有用户均可下载</div>
                </div>
              </label>
              <label class="permission-item">
                <input type="checkbox" v-model="resourceForm.requirePlan">
                <div>
                  <div class="perm-title">👑 会员专属</div>
                  <div class="perm-desc">需要有效会员订阅</div>
                </div>
              </label>
            </div>
            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label">最低等级要求</label>
              <input v-model.number="resourceForm.minLevel" type="number" class="form-input" min="0" placeholder="0 表示无等级限制">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="resourceForm.status" class="form-select">
                <option value="PUBLISHED">发布</option>
                <option value="DRAFT">草稿</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">排序权重</label>
              <input v-model.number="resourceForm.sortOrder" type="number" class="form-input" min="0">
            </div>
          </div>
          <div class="form-group" style="margin-top: 8px;">
            <label class="checkbox-label">
              <input type="checkbox" v-model="resourceForm.isFeatured">
              <span>⭐ 设为精选推荐</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showResourceModal = false">取消</button>
          <button class="btn btn-primary" @click="submitResourceForm" :disabled="submitting">{{ submitting ? '处理中...' : (editingResource ? '保存' : '创建') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const tabs = [
  { value: 'categories', label: '分类管理', icon: '📁' },
  { value: 'resources', label: '资源管理', icon: '📦' },
  { value: 'downloads', label: '下载记录', icon: '📥' }
]

const resourceTypes = [
  { value: 'COVER_TEMPLATE', label: '封面模板', icon: '🖼️' },
  { value: 'FONT', label: '字体推荐', icon: '🔤' },
  { value: 'REFERENCE', label: '参考案例', icon: '📖' },
  { value: 'TOOL', label: '工具素材', icon: '🔧' },
  { value: 'OTHER', label: '其他', icon: '📦' }
]

const currentTab = ref('categories')
const stats = ref(null)

const adminCategories = ref([])
const loadingCategories = ref(false)

const adminResources = ref([])
const loadingResources = ref(false)
const resPage = ref(1)
const resTotalPages = ref(1)
const resTotal = ref(0)
const resFilterCategory = ref('')
const resFilterType = ref('')
const resFilterStatus = ref('')
const resKeyword = ref('')

const adminDownloads = ref([])
const loadingDownloads = ref(false)
const dlPage = ref(1)
const dlTotalPages = ref(1)

const showCategoryModal = ref(false)
const editingCategory = ref(null)
const categoryForm = ref({ name: '', slug: '', icon: '', description: '', type: 'GENERAL', sortOrder: 0, isActive: true })

const showResourceModal = ref(false)
const editingResource = ref(null)
const resourceForm = ref({
  title: '', description: '', coverImage: '', fileUrl: '', fileName: '', fileSize: 0,
  fileType: 'IMAGE', categoryId: '', tagsText: '', type: 'COVER_TEMPLATE',
  minLevel: 0, requirePlan: false, isFree: true, status: 'PUBLISHED', isFeatured: false, sortOrder: 0
})

const submitting = ref(false)

const getTypeLabel = (t) => resourceTypes.find(r => r.value === t)?.label || t || '-'
const getTypeIcon = (t) => resourceTypes.find(r => r.value === t)?.icon || '📦'
const categoryTypeLabel = (t) => {
  const map = { GENERAL: '通用', COVER: '封面', FONT: '字体', REFERENCE: '参考', TOOL: '工具' }
  return map[t] || t
}

const formatDateTime = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const switchTab = (t) => {
  currentTab.value = t
  if (t === 'categories') loadCategories()
  if (t === 'resources') loadResources(1)
  if (t === 'downloads') loadAdminDownloads(1)
}

const loadStats = async () => {
  try {
    const res = await api.get('/admin/asset-library/stats')
    stats.value = res.stats
  } catch (e) { console.error(e) }
}

const loadCategories = async () => {
  loadingCategories.value = true
  try {
    const res = await api.get('/admin/asset-library/categories')
    adminCategories.value = res.categories
  } catch (e) { console.error(e) } finally { loadingCategories.value = false }
}

const loadResources = async (newPage = 1) => {
  loadingResources.value = true
  resPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 15 })
    if (resFilterCategory.value) params.set('categoryId', resFilterCategory.value)
    if (resFilterType.value) params.set('type', resFilterType.value)
    if (resFilterStatus.value) params.set('status', resFilterStatus.value)
    if (resKeyword.value) params.set('keyword', resKeyword.value)
    const res = await api.get(`/admin/asset-library/resources?${params}`)
    adminResources.value = res.resources
    resTotal.value = res.total
    resTotalPages.value = res.totalPages
  } catch (e) { console.error(e) } finally { loadingResources.value = false }
}

const resetResFilters = () => {
  resFilterCategory.value = ''
  resFilterType.value = ''
  resFilterStatus.value = ''
  resKeyword.value = ''
  loadResources(1)
}

const loadAdminDownloads = async (newPage = 1) => {
  loadingDownloads.value = true
  dlPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 20 })
    const res = await api.get(`/admin/asset-library/downloads?${params}`)
    adminDownloads.value = res.downloads
    dlTotalPages.value = res.totalPages
  } catch (e) { console.error(e) } finally { loadingDownloads.value = false }
}

const openCategoryForm = (c = null) => {
  editingCategory.value = c
  if (c) {
    categoryForm.value = { name: c.name, slug: c.slug, icon: c.icon || '', description: c.description || '', type: c.type, sortOrder: c.sortOrder, isActive: c.isActive }
  } else {
    categoryForm.value = { name: '', slug: '', icon: '', description: '', type: 'GENERAL', sortOrder: 0, isActive: true }
  }
  showCategoryModal.value = true
}

const submitCategoryForm = async () => {
  if (!categoryForm.value.name || !categoryForm.value.slug) {
    showToast('请填写分类名称和标识', 'warning')
    return
  }
  submitting.value = true
  try {
    if (editingCategory.value) {
      await api.put(`/admin/asset-library/categories/${editingCategory.value.id}`, categoryForm.value)
      showToast('分类已更新', 'success')
    } else {
      await api.post('/admin/asset-library/categories', categoryForm.value)
      showToast('分类已创建', 'success')
    }
    showCategoryModal.value = false
    await loadCategories()
    await loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally { submitting.value = false }
}

const deleteCategory = async (c) => {
  if (!confirm(`确定要删除分类「${c.name}」吗？`)) return
  try {
    await api.delete(`/admin/asset-library/categories/${c.id}`)
    showToast('分类已删除', 'success')
    await loadCategories()
    await loadStats()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const openResourceForm = (r = null) => {
  editingResource.value = r
  if (r) {
    let tags = []
    try { tags = JSON.parse(r.tags || '[]') } catch {}
    resourceForm.value = {
      title: r.title, description: r.description || '', coverImage: r.coverImage || '',
      fileUrl: r.fileUrl, fileName: r.fileName, fileSize: r.fileSize, fileType: r.fileType,
      categoryId: r.categoryId, tagsText: tags.join(', '), type: r.type,
      minLevel: r.minLevel, requirePlan: r.requirePlan, isFree: r.isFree,
      status: r.status, isFeatured: r.isFeatured, sortOrder: r.sortOrder
    }
  } else {
    resourceForm.value = {
      title: '', description: '', coverImage: '', fileUrl: '', fileName: '', fileSize: 0,
      fileType: 'IMAGE', categoryId: adminCategories.value[0]?.id || '', tagsText: '',
      type: 'COVER_TEMPLATE', minLevel: 0, requirePlan: false, isFree: true,
      status: 'PUBLISHED', isFeatured: false, sortOrder: 0
    }
  }
  showResourceModal.value = true
}

const submitResourceForm = async () => {
  if (!resourceForm.value.title || !resourceForm.value.fileUrl || !resourceForm.value.categoryId) {
    showToast('请填写标题、文件地址和分类', 'warning')
    return
  }
  submitting.value = true
  try {
    const tags = resourceForm.value.tagsText
      ? resourceForm.value.tagsText.split(/[,，]/).map(t => t.trim()).filter(Boolean)
      : []
    const data = { ...resourceForm.value, tags }
    delete data.tagsText
    if (editingResource.value) {
      await api.put(`/admin/asset-library/resources/${editingResource.value.id}`, data)
      showToast('资源已更新', 'success')
    } else {
      await api.post('/admin/asset-library/resources', data)
      showToast('资源已创建', 'success')
    }
    showResourceModal.value = false
    await loadResources(resPage.value)
    await loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally { submitting.value = false }
}

const deleteResource = async (r) => {
  if (!confirm(`确定要删除资源「${r.title}」吗？此操作不可恢复。`)) return
  try {
    await api.delete(`/admin/asset-library/resources/${r.id}`)
    showToast('资源已删除', 'success')
    await loadResources(1)
    await loadStats()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

onMounted(async () => {
  await loadStats()
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

.mb { margin-bottom: 16px; }
.mt { margin-top: 16px; }
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.text-sm { font-size: 13px; }
.text-xs { font-size: 12px; }
.text-muted { color: var(--text-tertiary); }
.text-lg { font-size: 20px; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.danger-btn { color: var(--danger); }
.required { color: var(--danger); }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card { padding: 20px 24px; text-align: center; }
.stat-label { font-size: 13px; color: var(--text-tertiary); margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--text-primary); }
.highlight-warning .stat-value { color: #d48806; }
.highlight-success .stat-value { color: #52c41a; }
.highlight-info .stat-value { color: #1890ff; }

.admin-table-wrapper {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  overflow: hidden;
}
.admin-table { width: 100%; border-collapse: collapse; }
.admin-table th {
  padding: 14px 16px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-light);
}
.admin-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 14px;
}
.admin-table tbody tr { transition: background 0.2s; }
.admin-table tbody tr:hover { background: var(--bg-tertiary); }
.admin-table tbody tr:last-child td { border-bottom: none; }

.status-badge {
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}
.status-active { background: #f6ffed; color: #52c41a; }
.status-draft { background: #f5f5f5; color: #8c8c8c; }
.status-rejected { background: #fff1f0; color: #cf1322; }

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 100px;
}
.perm-tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 11px;
  border-radius: 100px;
}
.perm-tag.free { background: #f6ffed; color: #52c41a; }

.filter-bar { margin-bottom: 20px; }

.permission-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}
.section-subtitle {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}
.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.permission-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}
.permission-item:hover { border-color: var(--accent); }
.permission-item input[type="checkbox"] { width: 18px; height: 18px; margin-top: 2px; }
.perm-title { font-size: 14px; font-weight: 600; }
.perm-desc { font-size: 12px; color: var(--text-tertiary); }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal {
  width: 100%;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  overflow: hidden;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-light);
}
.modal-body { padding: 24px; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
}

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

.section { margin-bottom: 24px; }
</style>
