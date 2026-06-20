<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">创作日历管理</h1>
      <p class="page-subtitle">管理日历事件、活动配置与联动同步</p>
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

    <div v-if="currentTab === 'events'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            :class="['btn', statusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="statusFilter = f.value; loadEvents(1)"
          >
            {{ f.label }}
          </button>
          <select v-model="typeFilter" class="form-select" style="width: auto; padding: 6px 12px; font-size: 13px;" @change="loadEvents(1)">
            <option value="all">全部类型</option>
            <option value="SCHEDULE">作者排期</option>
            <option value="SUBMISSION_DEADLINE">征稿节点</option>
            <option value="PUBLISH_REMINDER">发布提醒</option>
            <option value="ACTIVITY">活动</option>
          </select>
        </div>
        <button class="btn btn-primary btn-sm" @click="openEventForm()">+ 新建事件</button>
      </div>

      <div v-if="loadingEvents" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="events.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📅</div>
        <div class="empty-state-text">暂无日历事件</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>颜色</th>
              <th>标题</th>
              <th>类型</th>
              <th>开始时间</th>
              <th>结束时间</th>
              <th>状态</th>
              <th>订阅</th>
              <th>提醒</th>
              <th>关联</th>
              <th>排序</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in events" :key="e.id">
              <td>
                <span class="color-dot" :style="{ background: e.color }"></span>
              </td>
              <td class="font-medium">{{ e.title }}</td>
              <td>
                <span :class="['badge', typeBadgeClass(e.eventType)]">{{ typeLabel(e.eventType) }}</span>
              </td>
              <td class="text-sm">{{ formatDate(e.startDate) }}</td>
              <td class="text-sm">{{ e.endDate ? formatDate(e.endDate) : '-' }}</td>
              <td>
                <span :class="['badge', e.status === 'ACTIVE' ? 'badge-approved' : 'badge-rejected']">
                  {{ e.status === 'ACTIVE' ? '启用' : '停用' }}
                </span>
              </td>
              <td class="text-sm">{{ e._count?.subscriptions || 0 }}</td>
              <td class="text-sm">
                <span v-if="e.reminderEnabled">🔔 {{ e.reminderMinutes }}分钟</span>
                <span v-else>-</span>
              </td>
              <td class="text-sm">
                <span v-if="e.linkType">{{ linkTypeLabel(e.linkType) }} #{{ e.linkId }}</span>
                <span v-else>-</span>
              </td>
              <td>
                <input
                  v-model.number="e.sortOrder"
                  type="number"
                  class="form-input"
                  style="width: 60px; padding: 4px 8px; font-size: 12px;"
                  @blur="updateSortOrder(e)"
                  min="0"
                >
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openEventForm(e)">编辑</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteEvent(e)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page === 1" @click="loadEvents(page - 1)">←</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="page === totalPages" @click="loadEvents(page + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'sync'" class="section">
      <div class="card" style="padding: 24px;">
        <h3 class="font-semibold mb">🔗 活动联动同步</h3>
        <p class="text-sm text-muted mb">从已有模块数据自动同步创建日历事件，避免重复录入。</p>
        <div class="sync-options">
          <div class="sync-item card">
            <div class="sync-icon">📋</div>
            <div class="sync-info">
              <div class="font-medium">征稿专题同步</div>
              <div class="text-sm text-muted">将进行中的征稿专题截止日期同步为征稿节点事件</div>
            </div>
            <button class="btn btn-primary btn-sm" @click="syncFromSource('topics')" :disabled="syncing">
              {{ syncing ? '同步中...' : '同步' }}
            </button>
          </div>
          <div class="sync-item card">
            <div class="sync-icon">🎉</div>
            <div class="sync-info">
              <div class="font-medium">活动同步</div>
              <div class="text-sm text-muted">将已发布的线下活动同步为活动事件</div>
            </div>
            <button class="btn btn-primary btn-sm" @click="syncFromSource('events')" :disabled="syncing">
              {{ syncing ? '同步中...' : '同步' }}
            </button>
          </div>
          <div class="sync-item card">
            <div class="sync-icon">🎯</div>
            <div class="sync-info">
              <div class="font-medium">众筹同步</div>
              <div class="text-sm text-muted">将进行中的众筹截止日期同步为征稿节点事件</div>
            </div>
            <button class="btn btn-primary btn-sm" @click="syncFromSource('crowdfundings')" :disabled="syncing">
              {{ syncing ? '同步中...' : '同步' }}
            </button>
          </div>
          <div class="sync-item card" style="border: 2px dashed var(--border);">
            <div class="sync-icon">🔄</div>
            <div class="sync-info">
              <div class="font-medium">全部同步</div>
              <div class="text-sm text-muted">一次性同步所有模块数据（自动跳过已存在的事件）</div>
            </div>
            <button class="btn btn-outline btn-sm" @click="syncFromSource('all')" :disabled="syncing">
              {{ syncing ? '同步中...' : '全部同步' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'stats'" class="section">
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-icon" style="background: #fbe9e4; color: #d4624a;">📅</div>
          <div class="stat-info">
            <div class="stat-num">{{ stats.total || 0 }}</div>
            <div class="stat-label">总事件数</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon" style="background: #e5f0e5; color: #5a8f5a;">✅</div>
          <div class="stat-info">
            <div class="stat-num">{{ stats.active || 0 }}</div>
            <div class="stat-label">启用事件</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon" style="background: #faf0dc; color: #cc8800;">🔔</div>
          <div class="stat-info">
            <div class="stat-num">{{ stats.withReminders || 0 }}</div>
            <div class="stat-label">启用提醒</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon" style="background: #e8e1f5; color: #8b5cf6;">📊</div>
          <div class="stat-info">
            <div class="stat-num">{{ stats.byType?.SCHEDULE || 0 }}</div>
            <div class="stat-label">作者排期</div>
          </div>
        </div>
      </div>
      <div class="card mt-lg" style="padding: 24px;">
        <h3 class="font-semibold mb">📊 类型分布</h3>
        <div class="type-stats">
          <div v-for="item in typeStatList" :key="item.type" class="type-stat-item">
            <div class="type-stat-label">
              <span :class="['badge', typeBadgeClass(item.type)]">{{ typeLabel(item.type) }}</span>
            </div>
            <div class="type-stat-bar">
              <div class="type-stat-fill" :style="{ width: item.percent + '%', background: item.color }"></div>
            </div>
            <div class="type-stat-num">{{ item.count }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEventForm" class="modal-overlay" @click.self="showEventForm = false">
      <div class="modal card" style="max-width: 640px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingEvent ? '编辑日历事件' : '新建日历事件' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showEventForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">事件标题 <span style="color: var(--danger);">*</span></label>
            <input v-model="eventForm.title" type="text" class="form-input" placeholder="例：第三期征稿截止" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">事件类型 <span style="color: var(--danger);">*</span></label>
              <select v-model="eventForm.eventType" class="form-select">
                <option value="SCHEDULE">作者排期</option>
                <option value="SUBMISSION_DEADLINE">征稿节点</option>
                <option value="PUBLISH_REMINDER">发布提醒</option>
                <option value="ACTIVITY">活动</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="eventForm.status" class="form-select">
                <option value="ACTIVE">启用</option>
                <option value="INACTIVE">停用</option>
              </select>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">开始日期 <span style="color: var(--danger);">*</span></label>
              <input v-model="eventForm.startDate" type="datetime-local" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">结束日期</label>
              <input v-model="eventForm.endDate" type="datetime-local" class="form-input">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">颜色标记</label>
              <div class="color-picker">
                <div
                  v-for="c in colorOptions"
                  :key="c.value"
                  :class="['color-option', { active: eventForm.color === c.value }]"
                  :style="{ background: c.value }"
                  @click="eventForm.color = c.value"
                >
                  <span v-if="eventForm.color === c.value" class="color-check">✓</span>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">排序权重</label>
              <input v-model.number="eventForm.sortOrder" type="number" class="form-input" min="0">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="eventForm.description" class="form-textarea" rows="3" placeholder="事件详细说明..."></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">关联类型</label>
              <select v-model="eventForm.linkType" class="form-select">
                <option :value="null">无关联</option>
                <option value="topic">征稿专题</option>
                <option value="event">活动</option>
                <option value="crowdfunding">众筹</option>
                <option value="collaboration">合作</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">关联ID</label>
              <input v-model.number="eventForm.linkId" type="number" class="form-input" placeholder="关联对象的ID" :disabled="!eventForm.linkType">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="eventForm.isAllDay">
                <span>全天事件</span>
              </label>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="eventForm.reminderEnabled">
                <span>开启提醒</span>
              </label>
            </div>
          </div>
          <div v-if="eventForm.reminderEnabled" class="form-group">
            <label class="form-label">提前提醒时间（分钟）</label>
            <select v-model.number="eventForm.reminderMinutes" class="form-select">
              <option :value="5">5 分钟</option>
              <option :value="15">15 分钟</option>
              <option :value="30">30 分钟</option>
              <option :value="60">1 小时</option>
              <option :value="120">2 小时</option>
              <option :value="1440">1 天</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showEventForm = false">取消</button>
          <button v-if="editingEvent" class="btn btn-ghost btn-sm danger-btn" @click="deleteEvent(editingEvent)" style="margin-right: auto;">删除</button>
          <button class="btn btn-primary" @click="submitEventForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingEvent ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const tabs = [
  { label: '事件管理', value: 'events', icon: '📅' },
  { label: '联动同步', value: 'sync', icon: '🔗' },
  { label: '统计概览', value: 'stats', icon: '📊' }
]

const statusFilters = [
  { label: '全部', value: 'all' },
  { label: '启用', value: 'ACTIVE' },
  { label: '停用', value: 'INACTIVE' }
]

const currentTab = ref('events')
const statusFilter = ref('all')
const typeFilter = ref('all')
const page = ref(1)
const pageSize = 20
const totalPages = ref(0)
const loadingEvents = ref(false)
const events = ref([])
const syncing = ref(false)
const stats = ref({})
const showEventForm = ref(false)
const editingEvent = ref(null)
const submitting = ref(false)

const colorOptions = [
  { value: '#d4624a' },
  { value: '#cc8800' },
  { value: '#5a8f5a' },
  { value: '#4a7fc4' },
  { value: '#8b5cf6' },
  { value: '#ec4899' },
  { value: '#14b8a6' },
  { value: '#6b7280' }
]

const eventForm = ref({
  title: '',
  description: '',
  eventType: 'SCHEDULE',
  startDate: '',
  endDate: '',
  color: '#d4624a',
  status: 'ACTIVE',
  isAllDay: true,
  reminderEnabled: false,
  reminderMinutes: 30,
  linkType: null,
  linkId: null,
  sortOrder: 0
})

const typeLabel = (t) => ({
  SCHEDULE: '作者排期',
  SUBMISSION_DEADLINE: '征稿节点',
  PUBLISH_REMINDER: '发布提醒',
  ACTIVITY: '活动'
}[t] || t)

const typeBadgeClass = (t) => ({
  SCHEDULE: 'badge-pending',
  SUBMISSION_DEADLINE: 'badge-rejected',
  PUBLISH_REMINDER: 'badge-approved',
  ACTIVITY: 'badge-published'
}[t] || '')

const linkTypeLabel = (t) => ({
  topic: '征稿专题',
  event: '活动',
  crowdfunding: '众筹',
  collaboration: '合作'
}[t] || t)

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const typeStatList = computed(() => {
  const types = [
    { type: 'SCHEDULE', color: '#cc8800' },
    { type: 'SUBMISSION_DEADLINE', color: '#d4624a' },
    { type: 'PUBLISH_REMINDER', color: '#5a8f5a' },
    { type: 'ACTIVITY', color: '#4a7fc4' }
  ]
  const total = stats.value.total || 1
  return types.map(t => ({
    ...t,
    count: stats.value.byType?.[t.type] || 0,
    percent: Math.round(((stats.value.byType?.[t.type] || 0) / total) * 100)
  }))
})

const switchTab = (tab) => {
  currentTab.value = tab
  if (tab === 'events') loadEvents(1)
  if (tab === 'stats') loadStats()
}

const loadEvents = async (newPage = 1) => {
  loadingEvents.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: pageSize })
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value)
    if (typeFilter.value !== 'all') params.set('eventType', typeFilter.value)
    const res = await api.get(`/admin/calendar?${params}`)
    events.value = res.events
    totalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingEvents.value = false
  }
}

const loadStats = async () => {
  try {
    const res = await api.get('/admin/calendar/stats')
    stats.value = res
  } catch (e) {
    console.error(e)
  }
}

const openEventForm = (evt = null) => {
  editingEvent.value = evt
  if (evt) {
    const sd = new Date(evt.startDate)
    const sdStr = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}T${String(sd.getHours()).padStart(2, '0')}:${String(sd.getMinutes()).padStart(2, '0')}`
    let edStr = ''
    if (evt.endDate) {
      const ed = new Date(evt.endDate)
      edStr = `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}-${String(ed.getDate()).padStart(2, '0')}T${String(ed.getHours()).padStart(2, '0')}:${String(ed.getMinutes()).padStart(2, '0')}`
    }
    eventForm.value = {
      title: evt.title,
      description: evt.description || '',
      eventType: evt.eventType,
      startDate: sdStr,
      endDate: edStr,
      color: evt.color,
      status: evt.status,
      isAllDay: evt.isAllDay,
      reminderEnabled: evt.reminderEnabled,
      reminderMinutes: evt.reminderMinutes,
      linkType: evt.linkType,
      linkId: evt.linkId,
      sortOrder: evt.sortOrder
    }
  } else {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T09:00`
    eventForm.value = {
      title: '',
      description: '',
      eventType: 'SCHEDULE',
      startDate: todayStr,
      endDate: '',
      color: '#d4624a',
      status: 'ACTIVE',
      isAllDay: true,
      reminderEnabled: false,
      reminderMinutes: 30,
      linkType: null,
      linkId: null,
      sortOrder: 0
    }
  }
  showEventForm.value = true
}

const submitEventForm = async () => {
  if (!eventForm.value.title || !eventForm.value.startDate) {
    showToast('请填写标题和开始日期', 'warning')
    return
  }

  submitting.value = true
  try {
    const data = { ...eventForm.value }

    if (editingEvent.value) {
      await api.put(`/admin/calendar/${editingEvent.value.id}`, data)
      showToast('更新成功', 'success')
    } else {
      await api.post('/admin/calendar', data)
      showToast('创建成功', 'success')
    }

    showEventForm.value = false
    loadEvents(page.value)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteEvent = async (evt) => {
  if (!confirm(`确定要删除「${evt.title}」吗？`)) return
  try {
    await api.delete(`/admin/calendar/${evt.id}`)
    showToast('删除成功', 'success')
    showEventForm.value = false
    loadEvents(page.value)
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const updateSortOrder = async (evt) => {
  try {
    await api.put(`/admin/calendar/${evt.id}/sort`, { sortOrder: evt.sortOrder })
  } catch (e) {
    console.error(e)
  }
}

const syncFromSource = async (sourceType) => {
  syncing.value = true
  try {
    const res = await api.post('/calendar/sync-from-activities', { sourceType })
    showToast(res.message, 'success')
    loadEvents(1)
    if (currentTab.value === 'stats') loadStats()
  } catch (e) {
    showToast(e.error || '同步失败', 'error')
  } finally {
    syncing.value = false
  }
}

onMounted(() => {
  loadEvents(1)
  loadStats()
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

.admin-tab:hover { color: var(--text-primary); border-color: var(--accent-light); }

.admin-tab.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.tab-icon { font-size: 16px; }

.section { margin-bottom: 32px; }
.mb { margin-bottom: 16px; }

.admin-list { overflow-x: auto; }

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

.admin-table tr:last-child td { border-bottom: none; }

.color-dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  font-family: var(--font-serif);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.type-stats {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.type-stat-item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.type-stat-label { min-width: 100px; }

.type-stat-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.type-stat-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.type-stat-num {
  font-size: 14px;
  font-weight: 600;
  min-width: 30px;
  text-align: right;
}

.sync-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.sync-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
}

.sync-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.sync-info { flex: 1; }

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

.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }

.page-info { font-size: 13px; color: var(--text-secondary); }

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

.modal-body { padding: 24px; }

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
}

.form-group { margin-bottom: 16px; }

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

.form-textarea { resize: vertical; min-height: 80px; }

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.color-picker { display: flex; gap: 8px; flex-wrap: wrap; }

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
  border: 2px solid transparent;
}

.color-option:hover { transform: scale(1.1); }

.color-option.active {
  border-color: var(--text-primary);
  transform: scale(1.15);
}

.color-check {
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.gap-sm { gap: 8px; }
.text-sm { font-size: 13px; }
.text-muted { color: var(--text-secondary); }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.mb { margin-bottom: 16px; }
.mt-lg { margin-top: 24px; }
.danger-btn { color: var(--danger); }
</style>
