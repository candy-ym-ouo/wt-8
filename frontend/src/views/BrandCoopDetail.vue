<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <div v-else-if="!brandCoop" class="empty-state">
      <div class="empty-state-icon">❓</div>
      <div class="empty-state-text">品牌联名合作不存在</div>
    </div>
    <div v-else class="detail-layout">
      <div class="detail-main">
        <div class="detail-header card">
          <div class="breadcrumbs">
            <router-link to="/brand-coops" class="breadcrumb-link">← 返回品牌联名列表</router-link>
          </div>
          <div v-if="brandCoop.coverImage" class="cover-image">
            <img :src="brandCoop.coverImage" :alt="brandCoop.title">
          </div>
          <div class="header-content">
            <div class="header-tags">
              <span class="cat-badge">{{ getCategoryLabel(brandCoop.category) }}</span>
              <span class="kanban-badge">{{ getColumnLabel(brandCoop.kanbanColumn) }}</span>
              <span v-if="brandCoop.isFeatured" class="featured-badge">⭐ 精选推荐</span>
              <span :class="['status-badge', `status-${getStatusClass(brandCoop.status)}`]">
                {{ getStatusText(brandCoop.status) }}
              </span>
            </div>
            <h1 class="detail-title font-serif">{{ brandCoop.title }}</h1>
            <div class="brand-row">
              <img v-if="brandCoop.brandLogo" :src="brandCoop.brandLogo" class="brand-logo-lg" alt="">
              <span v-else class="brand-logo-placeholder-lg">🏷️</span>
              <span class="brand-name-lg">{{ brandCoop.brandName }}</span>
              <span class="coop-type">{{ getCoopTypeLabel(brandCoop.cooperationType) }}</span>
            </div>
            <div v-if="brandCoop.rejectionReason && isOwner" class="rejection-notice">
              <span class="notice-icon">⚠️</span>
              <div>
                <strong>审核未通过</strong>
                <div class="rejection-detail">原因：{{ brandCoop.rejectionReason }}</div>
              </div>
            </div>
            <div v-if="isOwner || isAdmin" class="owner-actions">
              <router-link
                v-if="['DRAFT', 'PENDING_REVIEW', 'REJECTED'].includes(brandCoop.status)"
                :to="`/brand-coops/${brandCoop.id}/edit`"
                class="btn btn-secondary btn-sm"
              >
                ✏️ 编辑
              </router-link>
              <button
                v-if="brandCoop.status === 'REJECTED'"
                class="btn btn-primary btn-sm"
                @click="resubmit"
              >
                🔄 重新提交审核
              </button>
              <button
                v-if="isAdmin && brandCoop.status === 'PENDING_REVIEW'"
                class="btn btn-primary btn-sm"
                @click="adminApprove"
              >
                ✅ 审核通过
              </button>
              <button
                v-if="isAdmin && brandCoop.status === 'PENDING_REVIEW'"
                class="btn btn-secondary btn-sm"
                @click="adminReject"
              >
                ❌ 驳回
              </button>
            </div>
            <div class="header-meta">
              <div class="creator-info">
                <img :src="brandCoop.creator?.avatar" alt="">
                <div>
                  <div class="creator-name">{{ brandCoop.creator?.username }}</div>
                  <div class="creator-label">发布方</div>
                </div>
              </div>
              <div class="stats-row">
                <div class="stat-item">
                  <span class="stat-value">{{ brandCoop.viewCount }}</span>
                  <span class="stat-label">浏览</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ brandCoop.zineCount }}</span>
                  <span class="stat-label">刊物</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ brandCoop.scheduleCount }}</span>
                  <span class="stat-label">排期</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ brandCoop.messageCount }}</span>
                  <span class="stat-label">消息</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-tabs card">
          <div class="tabs-nav">
            <button
              v-for="tab in detailTabs"
              :key="tab.value"
              :class="['tab-btn', { active: currentTab === tab.value }]"
              @click="currentTab = tab.value"
            >
              <span class="tab-icon">{{ tab.icon }}</span>
              {{ tab.label }}
            </button>
          </div>

          <div v-if="currentTab === 'overview'" class="tab-content">
            <div class="section-content" v-html="formatContent(brandCoop.description)"></div>
            <div v-if="brandCoop.requirements" class="detail-section">
              <h3 class="section-title"><span class="section-icon">📝</span> 合作要求</h3>
              <div class="section-content" v-html="formatContent(brandCoop.requirements)"></div>
            </div>
            <div v-if="brandCoop.deliverables" class="detail-section">
              <h3 class="section-title"><span class="section-icon">🎯</span> 交付成果</h3>
              <div class="section-content" v-html="formatContent(brandCoop.deliverables)"></div>
            </div>
            <div v-if="brandCoop.tags?.length > 0" class="detail-section">
              <h3 class="section-title"><span class="section-icon">🏷️</span> 相关标签</h3>
              <div class="tags-list">
                <span v-for="tag in brandCoop.tags" :key="tag" class="tag-large">#{{ tag }}</span>
              </div>
            </div>
          </div>

          <div v-if="currentTab === 'zines'" class="tab-content">
            <div v-if="isOwner || isAdmin" class="tab-toolbar">
              <button class="btn btn-primary btn-sm" @click="showAddZineModal = true">+ 关联刊物</button>
            </div>
            <div v-if="brandCoop.zines?.length === 0" class="empty-tab">
              <div class="empty-tab-icon">📖</div>
              <div class="empty-tab-text">暂无关联刊物</div>
            </div>
            <div v-else class="zine-grid">
              <div v-for="link in brandCoop.zines" :key="link.id" class="zine-card card">
                <div class="zine-cover" :style="link.zine?.coverImage ? { backgroundImage: `url(${link.zine.coverImage})` } : {}">
                  <div v-if="!link.zine?.coverImage" class="zine-cover-placeholder">📖</div>
                </div>
                <div class="zine-info">
                  <h4 class="zine-title">
                    <router-link :to="`/zines/${link.zine?.id}`">{{ link.zine?.title }}</router-link>
                  </h4>
                  <div class="zine-meta">
                    <span class="zine-role">{{ getRoleLabel(link.role) }}</span>
                    <span class="zine-author">{{ link.zine?.author?.username }}</span>
                  </div>
                  <div v-if="link.recommendNote" class="zine-note">{{ link.recommendNote }}</div>
                  <div v-if="isOwner || isAdmin" class="zine-actions">
                    <button class="btn btn-ghost btn-sm danger-btn" @click="removeZine(link.zineId)">移除</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="currentTab === 'schedules'" class="tab-content">
            <div v-if="isOwner || isAdmin" class="tab-toolbar">
              <button class="btn btn-primary btn-sm" @click="openScheduleForm()">+ 添加排期节点</button>
            </div>
            <div v-if="brandCoop.schedules?.length === 0" class="empty-tab">
              <div class="empty-tab-icon">📋</div>
              <div class="empty-tab-text">暂无排期节点</div>
            </div>
            <div v-else class="timeline">
              <div v-for="s in brandCoop.schedules" :key="s.id" class="timeline-item">
                <div :class="['timeline-dot', `dot-${s.status.toLowerCase()}`]"></div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <h4 class="timeline-title">{{ s.title }}</h4>
                    <span :class="['schedule-status', `status-${s.status.toLowerCase()}`]">
                      {{ getScheduleStatus(s.status) }}
                    </span>
                  </div>
                  <div v-if="s.description" class="timeline-desc">{{ s.description }}</div>
                  <div class="timeline-dates">
                    <span>📅 计划：{{ formatDateTime(s.plannedDate) }}</span>
                    <span v-if="s.actualDate"> ✅ 实际：{{ formatDateTime(s.actualDate) }}</span>
                  </div>
                  <div v-if="s.remark" class="timeline-remark">{{ s.remark }}</div>
                  <div v-if="isOwner || isAdmin" class="timeline-actions">
                    <button class="btn btn-ghost btn-sm" @click="openScheduleForm(s)">编辑</button>
                    <button v-if="s.status !== 'COMPLETED'" class="btn btn-primary btn-sm" @click="completeSchedule(s)">完成</button>
                    <button class="btn btn-ghost btn-sm danger-btn" @click="deleteSchedule(s)">删除</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="currentTab === 'messages'" class="tab-content">
            <div class="message-list" ref="messageListRef">
              <div v-if="brandCoop.messages?.length === 0" class="empty-tab">
                <div class="empty-tab-icon">💬</div>
                <div class="empty-tab-text">暂无协同消息</div>
              </div>
              <div v-for="msg in brandCoop.messages" :key="msg.id" :class="['message-item', { 'is-me': msg.senderId === currentUserId }]">
                <img :src="msg.sender?.avatar" class="msg-avatar" alt="">
                <div class="msg-body">
                  <div class="msg-header">
                    <span class="msg-sender">{{ msg.sender?.username }}</span>
                    <span class="msg-time">{{ formatDateTime(msg.createdAt) }}</span>
                  </div>
                  <div class="msg-content">{{ msg.content }}</div>
                </div>
              </div>
            </div>
            <div v-if="isOwner || isAdmin" class="message-input-area">
              <textarea
                v-model="newMessage"
                class="msg-textarea"
                rows="2"
                placeholder="输入协同消息..."
                @keydown.enter.ctrl="sendMessage"
              ></textarea>
              <button class="btn btn-primary btn-sm" @click="sendMessage" :disabled="!newMessage.trim()">发送</button>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-sidebar">
        <div class="sidebar-card card sticky">
          <h3 class="sidebar-title">合作信息</h3>
          <div v-if="brandCoop.budget" class="info-row">
            <span class="info-icon">💰</span>
            <div class="info-content">
              <span class="info-label">合作预算</span>
              <span class="info-value highlight">{{ brandCoop.budget }}</span>
            </div>
          </div>
          <div v-if="brandCoop.startDate" class="info-row">
            <span class="info-icon">📅</span>
            <div class="info-content">
              <span class="info-label">开始时间</span>
              <span class="info-value">{{ formatDateTime(brandCoop.startDate) }}</span>
            </div>
          </div>
          <div v-if="brandCoop.endDate" class="info-row">
            <span class="info-icon">⏰</span>
            <div class="info-content">
              <span class="info-label">截止时间</span>
              <span class="info-value">{{ formatDateTime(brandCoop.endDate) }}</span>
            </div>
          </div>
          <div class="info-row">
            <span class="info-icon">📋</span>
            <div class="info-content">
              <span class="info-label">看板阶段</span>
              <span class="info-value">{{ getColumnLabel(brandCoop.kanbanColumn) }}</span>
            </div>
          </div>
          <div v-if="brandCoop.contactPerson" class="info-row">
            <span class="info-icon">👤</span>
            <div class="info-content">
              <span class="info-label">联系人</span>
              <span class="info-value">{{ brandCoop.contactPerson }}</span>
            </div>
          </div>
          <div v-if="brandCoop.contactPhone" class="info-row">
            <span class="info-icon">📞</span>
            <div class="info-content">
              <span class="info-label">联系电话</span>
              <span class="info-value">{{ brandCoop.contactPhone }}</span>
            </div>
          </div>
          <div v-if="brandCoop.contactEmail" class="info-row">
            <span class="info-icon">📧</span>
            <div class="info-content">
              <span class="info-label">联系邮箱</span>
              <span class="info-value">{{ brandCoop.contactEmail }}</span>
            </div>
          </div>
          <div class="info-row">
            <span class="info-icon">🕐</span>
            <div class="info-content">
              <span class="info-label">发布时间</span>
              <span class="info-value">{{ formatDateTime(brandCoop.createdAt) }}</span>
            </div>
          </div>

          <div class="sidebar-divider"></div>

          <div v-if="isAdmin" class="admin-advance">
            <h4 class="advance-title">推进阶段</h4>
            <div class="advance-btns">
              <button
                v-for="col in kanbanColumns"
                :key="col.value"
                :class="['advance-btn', { active: brandCoop.kanbanColumn === col.value }]"
                @click="advanceColumn(col.value)"
                :disabled="brandCoop.kanbanColumn === col.value"
              >
                {{ col.icon }} {{ col.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddZineModal" class="modal-overlay" @click.self="showAddZineModal = false">
      <div class="modal card" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="font-semibold">关联刊物</h3>
          <button class="btn btn-ghost btn-sm" @click="showAddZineModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">搜索刊物</label>
            <input v-model="zineSearch" class="form-input" placeholder="输入刊物标题搜索..." @input="searchZines">
          </div>
          <div v-if="zineResults.length > 0" class="zine-results">
            <div v-for="z in zineResults" :key="z.id" class="zine-result-item" @click="selectZine(z)">
              <span>{{ z.title }}</span>
              <span class="text-sm text-muted">{{ z.author?.username }}</span>
            </div>
          </div>
          <div v-if="selectedZine" class="selected-zine">
            已选：<strong>{{ selectedZine.title }}</strong>
          </div>
          <div class="form-group">
            <label class="form-label">关联角色</label>
            <select v-model="zineRole" class="form-select">
              <option value="RELATED">关联刊物</option>
              <option value="FEATURED">主推刊物</option>
              <option value="COCREATED">共创刊物</option>
              <option value="SPONSORED">赞助刊物</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">推荐备注</label>
            <input v-model="zineNote" class="form-input" placeholder="可选备注说明">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddZineModal = false">取消</button>
          <button class="btn btn-primary" @click="addZine" :disabled="!selectedZine">确认关联</button>
        </div>
      </div>
    </div>

    <div v-if="showScheduleFormModal" class="modal-overlay" @click.self="showScheduleFormModal = false">
      <div class="modal card" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingSchedule ? '编辑排期节点' : '添加排期节点' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showScheduleFormModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">节点标题 <span style="color:var(--danger)">*</span></label>
            <input v-model="scheduleForm.title" class="form-input" placeholder="例：初稿交付">
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="scheduleForm.description" class="form-textarea" rows="2" placeholder="节点描述..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">计划时间 <span style="color:var(--danger)">*</span></label>
            <input v-model="scheduleForm.plannedDate" type="datetime-local" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">状态</label>
            <select v-model="scheduleForm.status" class="form-select">
              <option value="PENDING">待开始</option>
              <option value="IN_PROGRESS">进行中</option>
              <option value="COMPLETED">已完成</option>
              <option value="DELAYED">已延期</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <input v-model="scheduleForm.remark" class="form-input" placeholder="可选备注">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showScheduleFormModal = false">取消</button>
          <button class="btn btn-primary" @click="submitScheduleForm" :disabled="!scheduleForm.title || !scheduleForm.plannedDate">
            {{ editingSchedule ? '保存' : '添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const authStore = useAuthStore()
const showToast = inject('showToast')

const brandCoop = ref(null)
const isOwner = ref(false)
const isAdmin = ref(false)
const loading = ref(false)
const currentTab = ref('overview')
const currentUserId = computed(() => authStore.user?.id)

const newMessage = ref('')
const messageListRef = ref(null)

const showAddZineModal = ref(false)
const zineSearch = ref('')
const zineResults = ref([])
const selectedZine = ref(null)
const zineRole = ref('RELATED')
const zineNote = ref('')

const showScheduleFormModal = ref(false)
const editingSchedule = ref(null)
const scheduleForm = ref({ title: '', description: '', plannedDate: '', status: 'PENDING', remark: '' })

const detailTabs = [
  { value: 'overview', label: '项目概览', icon: '📋' },
  { value: 'zines', label: '刊物关联', icon: '📖' },
  { value: 'schedules', label: '排期推进', icon: '📅' },
  { value: 'messages', label: '消息协同', icon: '💬' }
]

const kanbanColumns = [
  { value: 'PROPOSAL', label: '提案', icon: '📋' },
  { value: 'NEGOTIATING', label: '协商中', icon: '🤝' },
  { value: 'CONFIRMED', label: '已确认', icon: '✅' },
  { value: 'EXECUTING', label: '执行中', icon: '⚡' },
  { value: 'COMPLETED', label: '已完成', icon: '🎉' },
  { value: 'ARCHIVED', label: '已归档', icon: '📦' }
]

const categories = [
  { id: 'COBRANDING', name: '联名共创', icon: '🏷️' },
  { id: 'SPONSORSHIP', name: '品牌赞助', icon: '💰' },
  { id: 'CONTENT_COLLAB', name: '内容合作', icon: '📝' },
  { id: 'CROSSOVER', name: '跨界联动', icon: '🔀' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const getCategoryLabel = (cat) => {
  const found = categories.find(c => c.id === cat)
  return found ? `${found.icon} ${found.name}` : cat
}

const getColumnLabel = (col) => {
  const found = kanbanColumns.find(c => c.value === col)
  return found ? `${found.icon} ${found.label}` : col
}

const getCoopTypeLabel = (t) => {
  const map = { COBRANDING: '联名共创', SPONSORSHIP: '品牌赞助', CONTENT_COLLAB: '内容合作', CROSSOVER: '跨界联动', OTHER: '其他' }
  return map[t] || t
}

const getStatusText = (s) => {
  const map = { DRAFT: '草稿', PENDING_REVIEW: '待审核', PUBLISHED: '已发布', IN_PROGRESS: '进行中', COMPLETED: '已完成', REJECTED: '未通过', CLOSED: '已关闭' }
  return map[s] || s
}

const getStatusClass = (s) => s.toLowerCase().replace('_', '')

const getScheduleStatus = (s) => {
  const map = { PENDING: '待开始', IN_PROGRESS: '进行中', COMPLETED: '已完成', DELAYED: '已延期' }
  return map[s] || s
}

const getRoleLabel = (r) => {
  const map = { RELATED: '关联', FEATURED: '主推', COCREATED: '共创', SPONSORED: '赞助' }
  return map[r] || r
}

const formatContent = (text) => {
  if (!text) return ''
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .split('\n').map(l => l ? `<p>${l}</p>` : '<br>').join('')
}

const formatDateTime = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await api.get(`/brand-coops/${route.params.id}`)
    brandCoop.value = res.brandCoop
    isOwner.value = res.isOwner || false
    isAdmin.value = res.isAdmin || false
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const resubmit = async () => {
  if (!confirm('确定要重新提交审核吗？')) return
  try {
    await api.post(`/brand-coops/${brandCoop.value.id}/resubmit`)
    brandCoop.value.status = 'PENDING_REVIEW'
    brandCoop.value.rejectionReason = null
    showToast('已重新提交审核', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const adminApprove = async () => {
  if (!confirm('确定审核通过并发布该品牌联名合作吗？')) return
  try {
    await api.post(`/brand-coops/${brandCoop.value.id}/publish`)
    brandCoop.value.status = 'PUBLISHED'
    brandCoop.value.kanbanColumn = 'NEGOTIATING'
    showToast('已通过并发布', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const adminReject = async () => {
  const reason = prompt('请输入驳回原因')
  if (reason === null) return
  try {
    await api.post(`/brand-coops/${brandCoop.value.id}/reject`, { reason })
    brandCoop.value.status = 'REJECTED'
    brandCoop.value.rejectionReason = reason
    showToast('已驳回', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const advanceColumn = async (col) => {
  try {
    await api.post(`/brand-coops/${brandCoop.value.id}/advance`, { kanbanColumn: col })
    brandCoop.value.kanbanColumn = col
    if (col === 'EXECUTING') brandCoop.value.status = 'IN_PROGRESS'
    if (col === 'COMPLETED') brandCoop.value.status = 'COMPLETED'
    showToast('阶段已推进', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const searchZines = async () => {
  if (!zineSearch.value) { zineResults.value = []; return }
  try {
    const res = await api.get(`/zines?keyword=${zineSearch.value}&limit=10`)
    zineResults.value = res.zines || []
  } catch (e) { console.error(e) }
}

const selectZine = (z) => {
  selectedZine.value = z
  zineResults.value = []
  zineSearch.value = z.title
}

const addZine = async () => {
  if (!selectedZine.value) return
  try {
    await api.post(`/brand-coops/${brandCoop.value.id}/zines`, {
      zineId: selectedZine.value.id,
      role: zineRole.value,
      recommendNote: zineNote.value
    })
    showToast('刊物关联成功', 'success')
    showAddZineModal.value = false
    selectedZine.value = null
    zineSearch.value = ''
    fetchDetail()
  } catch (e) {
    showToast(e.error || '关联失败', 'error')
  }
}

const removeZine = async (zineId) => {
  if (!confirm('确定移除该刊物关联？')) return
  try {
    await api.delete(`/brand-coops/${brandCoop.value.id}/zines/${zineId}`)
    showToast('已移除', 'success')
    fetchDetail()
  } catch (e) {
    showToast(e.error || '移除失败', 'error')
  }
}

const openScheduleForm = (s = null) => {
  editingSchedule.value = s
  if (s) {
    scheduleForm.value = {
      title: s.title,
      description: s.description || '',
      plannedDate: s.plannedDate ? new Date(s.plannedDate).toISOString().slice(0, 16) : '',
      status: s.status,
      remark: s.remark || ''
    }
  } else {
    scheduleForm.value = { title: '', description: '', plannedDate: '', status: 'PENDING', remark: '' }
  }
  showScheduleFormModal.value = true
}

const submitScheduleForm = async () => {
  try {
    if (editingSchedule.value) {
      await api.put(`/brand-coops/${brandCoop.value.id}/schedules/${editingSchedule.value.id}`, scheduleForm.value)
      showToast('排期节点已更新', 'success')
    } else {
      await api.post(`/brand-coops/${brandCoop.value.id}/schedules`, scheduleForm.value)
      showToast('排期节点已添加', 'success')
    }
    showScheduleFormModal.value = false
    fetchDetail()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const completeSchedule = async (s) => {
  try {
    await api.put(`/brand-coops/${brandCoop.value.id}/schedules/${s.id}`, {
      status: 'COMPLETED',
      actualDate: new Date().toISOString().slice(0, 16)
    })
    showToast('节点已完成', 'success')
    fetchDetail()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const deleteSchedule = async (s) => {
  if (!confirm(`确定删除排期节点"${s.title}"？`)) return
  try {
    await api.delete(`/brand-coops/${brandCoop.value.id}/schedules/${s.id}`)
    showToast('已删除', 'success')
    fetchDetail()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  try {
    await api.post(`/brand-coops/${brandCoop.value.id}/messages`, { content: newMessage.value })
    newMessage.value = ''
    fetchDetail()
    await nextTick()
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  } catch (e) {
    showToast(e.error || '发送失败', 'error')
  }
}

onMounted(() => {
  fetchDetail()
})
</script>

<style scoped>
.detail-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  align-items: flex-start;
}

.breadcrumbs { margin-bottom: 16px; }
.breadcrumb-link { font-size: 13px; color: var(--text-secondary); transition: color 0.2s; }
.breadcrumb-link:hover { color: var(--accent); }

.cover-image { margin-bottom: 20px; border-radius: 12px; overflow: hidden; aspect-ratio: 16 / 7; }
.cover-image img { width: 100%; height: 100%; object-fit: cover; }

.header-tags { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.cat-badge { padding: 4px 12px; background: var(--accent-light); color: var(--accent); border-radius: 100px; font-size: 12px; font-weight: 500; }
.kanban-badge { padding: 4px 12px; background: #e6f7ff; color: #0050b3; border-radius: 100px; font-size: 12px; font-weight: 500; }
.featured-badge { padding: 4px 12px; background: linear-gradient(135deg, #ffd700, #ffb700); color: #5c4a00; border-radius: 100px; font-size: 12px; font-weight: 600; }
.status-badge { padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 500; }
.status-draft { background: #f5f5f5; color: #8c8c8c; }
.status-pendingreview { background: #fff7e6; color: #d48806; }
.status-published { background: #f6ffed; color: #52c41a; }
.status-inprogress { background: #e6f7ff; color: #0050b3; }
.status-completed { background: #f6ffed; color: #52c41a; }
.status-rejected { background: #fff1f0; color: #cf1322; }
.status-closed { background: #f0f0f0; color: #8c8c8c; }

.detail-title { font-size: 28px; font-weight: 700; line-height: 1.3; margin-bottom: 12px; }

.brand-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.brand-logo-lg { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; background: var(--bg-tertiary); }
.brand-logo-placeholder-lg { font-size: 28px; }
.brand-name-lg { font-size: 18px; font-weight: 600; color: var(--accent); }
.coop-type { padding: 4px 10px; background: var(--bg-tertiary); border-radius: 100px; font-size: 12px; color: var(--text-secondary); }

.rejection-notice { display: flex; gap: 12px; padding: 14px 18px; background: var(--danger-light); border-radius: var(--radius); margin-bottom: 16px; font-size: 14px; line-height: 1.6; color: var(--danger); }
.notice-icon { font-size: 22px; flex-shrink: 0; }
.rejection-detail { margin-top: 4px; font-size: 13px; opacity: 0.9; }

.owner-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; padding: 12px 16px; background: var(--bg-tertiary); border-radius: var(--radius-sm); }

.header-meta { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--border-light); }
.creator-info { display: flex; align-items: center; gap: 12px; }
.creator-info img { width: 44px; height: 44px; border-radius: 50%; background: var(--bg-tertiary); }
.creator-name { font-size: 14px; font-weight: 600; }
.creator-label { font-size: 12px; color: var(--text-tertiary); }
.stats-row { display: flex; gap: 24px; }
.stat-item { text-align: center; }
.stat-value { display: block; font-size: 18px; font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: 12px; color: var(--text-tertiary); }

.detail-tabs { margin-top: 20px; }
.tabs-nav { display: flex; gap: 4px; border-bottom: 1px solid var(--border-light); padding: 0 20px; }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: 14px 20px; font-size: 14px; color: var(--text-secondary); border-bottom: 2px solid transparent; transition: all 0.2s; }
.tab-btn:hover { color: var(--text-primary); }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 500; }
.tab-icon { font-size: 16px; }
.tab-content { padding: 20px; }
.tab-toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }

.detail-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-light); }
.section-title { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 600; margin-bottom: 16px; }
.section-icon { font-size: 20px; }
.section-content { font-size: 15px; line-height: 2; color: var(--text-primary); }
.section-content :deep(p) { margin-bottom: 12px; }
.tags-list { display: flex; flex-wrap: wrap; gap: 10px; }
.tag-large { padding: 6px 14px; background: var(--bg-tertiary); color: var(--text-secondary); border-radius: 100px; font-size: 13px; }

.empty-tab { text-align: center; padding: 48px 24px; }
.empty-tab-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.4; }
.empty-tab-text { font-size: 14px; color: var(--text-secondary); }

.zine-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.zine-card { display: flex; overflow: hidden; }
.zine-cover { width: 80px; flex-shrink: 0; background: linear-gradient(135deg, #667eea, #764ba2); background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; }
.zine-cover-placeholder { font-size: 28px; opacity: 0.3; }
.zine-info { flex: 1; padding: 12px 14px; display: flex; flex-direction: column; }
.zine-title { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
.zine-title a { color: var(--text-primary); transition: color 0.2s; }
.zine-title a:hover { color: var(--accent); }
.zine-meta { display: flex; gap: 8px; margin-bottom: 6px; }
.zine-role { padding: 2px 8px; background: var(--accent-light); color: var(--accent); border-radius: 100px; font-size: 11px; }
.zine-author { font-size: 12px; color: var(--text-tertiary); }
.zine-note { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.zine-actions { margin-top: auto; }

.timeline { position: relative; padding-left: 24px; }
.timeline-item { position: relative; padding-bottom: 24px; padding-left: 24px; border-left: 2px solid var(--border-light); }
.timeline-item:last-child { border-left-color: transparent; padding-bottom: 0; }
.timeline-dot { position: absolute; left: -7px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--bg-tertiary); border: 2px solid var(--border); }
.dot-pending { background: #fff7e6; border-color: #d48806; }
.dot-in_progress { background: #e6f7ff; border-color: #0050b3; }
.dot-completed { background: #f6ffed; border-color: #52c41a; }
.dot-delayed { background: #fff1f0; border-color: #cf1322; }
.timeline-content { }
.timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.timeline-title { font-size: 15px; font-weight: 600; margin: 0; }
.schedule-status { padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 500; }
.status-pending { background: #fff7e6; color: #d48806; }
.status-in_progress { background: #e6f7ff; color: #0050b3; }
.status-completed { background: #f6ffed; color: #52c41a; }
.status-delayed { background: #fff1f0; color: #cf1322; }
.timeline-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.timeline-dates { font-size: 12px; color: var(--text-tertiary); margin-bottom: 6px; }
.timeline-remark { font-size: 12px; color: var(--text-secondary); padding: 8px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm); margin-bottom: 8px; }
.timeline-actions { display: flex; gap: 6px; }

.message-list { max-height: 480px; overflow-y: auto; margin-bottom: 16px; }
.message-item { display: flex; gap: 10px; margin-bottom: 16px; }
.message-item.is-me { flex-direction: row-reverse; }
.msg-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--bg-tertiary); flex-shrink: 0; }
.msg-body { max-width: 70%; }
.is-me .msg-body { text-align: right; }
.msg-header { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
.is-me .msg-header { justify-content: flex-end; }
.msg-sender { font-size: 12px; font-weight: 500; color: var(--text-primary); }
.msg-time { font-size: 11px; color: var(--text-tertiary); }
.msg-content { padding: 10px 14px; background: var(--bg-tertiary); border-radius: var(--radius); font-size: 14px; line-height: 1.6; display: inline-block; text-align: left; }
.is-me .msg-content { background: var(--accent); color: #fff; }
.message-input-area { display: flex; gap: 10px; align-items: flex-end; padding-top: 16px; border-top: 1px solid var(--border-light); }
.msg-textarea { flex: 1; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); resize: none; font-size: 14px; background: var(--bg-primary); }
.msg-textarea:focus { outline: none; border-color: var(--accent); }

.sticky { position: sticky; top: 80px; }
.sidebar-title { font-size: 16px; font-weight: 600; margin-bottom: 20px; }
.info-row { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-light); }
.info-row:last-of-type { border-bottom: none; }
.info-icon { font-size: 18px; }
.info-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.info-label { font-size: 12px; color: var(--text-tertiary); }
.info-value { font-size: 14px; font-weight: 500; }
.info-value.highlight { color: var(--accent); font-size: 16px; }
.sidebar-divider { height: 1px; background: var(--border-light); margin: 20px 0; }

.admin-advance {}
.advance-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
.advance-btns { display: flex; flex-direction: column; gap: 6px; }
.advance-btn { padding: 8px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm); font-size: 13px; color: var(--text-secondary); text-align: left; transition: all 0.2s; }
.advance-btn:hover:not(:disabled) { background: var(--accent-light); color: var(--accent); }
.advance-btn.active { background: var(--accent); color: #fff; }
.advance-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.danger-btn { color: var(--danger); }

.zine-results { max-height: 200px; overflow-y: auto; margin-bottom: 12px; border: 1px solid var(--border-light); border-radius: var(--radius-sm); }
.zine-result-item { display: flex; justify-content: space-between; padding: 10px 14px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid var(--border-light); }
.zine-result-item:last-child { border-bottom: none; }
.zine-result-item:hover { background: var(--accent-light); }
.selected-zine { padding: 10px 14px; background: var(--accent-light); border-radius: var(--radius-sm); font-size: 13px; margin-bottom: 12px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { width: 100%; background: var(--bg-secondary); border-radius: var(--radius); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid var(--border-light); }
.modal-body { padding: 24px; overflow-y: auto; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border-light); }

@media (max-width: 900px) {
  .detail-layout { grid-template-columns: 1fr; }
  .sticky { position: static; }
}
</style>
