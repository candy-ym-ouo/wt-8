<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">创作日历</h1>
      <p class="page-subtitle">排期管理、征稿节点、发布提醒与订阅同步</p>
    </div>

    <div class="calendar-controls">
      <div class="calendar-nav">
        <button class="btn btn-ghost btn-sm" @click="prevMonth">←</button>
        <span class="calendar-current-month">{{ currentYear }}年{{ currentMonth }}月</span>
        <button class="btn btn-ghost btn-sm" @click="nextMonth">→</button>
        <button class="btn btn-secondary btn-sm" @click="goToday" style="margin-left: 8px;">今天</button>
      </div>
      <div class="calendar-actions">
        <div class="filter-tabs">
          <button
            v-for="f in typeFilters"
            :key="f.value"
            :class="['btn', currentType === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="currentType = f.value; loadEvents()"
          >
            {{ f.icon }} {{ f.label }}
          </button>
        </div>
        <div class="filter-tabs" style="margin-left: 8px;">
          <button
            :class="['btn', viewMode === 'all' ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="viewMode = 'all'; loadEvents()"
          >全部</button>
          <button
            :class="['btn', viewMode === 'mine' ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="viewMode = 'mine'; loadMyEvents()"
          >我的</button>
          <button
            :class="['btn', viewMode === 'subscribed' ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="viewMode = 'subscribed'; loadSubscribed()"
          >已订阅</button>
        </div>
        <button class="btn btn-primary btn-sm" @click="openEventForm()" v-if="authStore.isAuthenticated">+ 新建事件</button>
      </div>
    </div>

    <div class="calendar-weekdays">
      <div v-for="d in weekdays" :key="d" class="weekday-cell">{{ d }}</div>
    </div>

    <div v-if="loading" class="empty-state" style="padding: 40px;">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>

    <div v-else class="calendar-grid">
      <div
        v-for="(day, idx) in calendarDays"
        :key="idx"
        :class="['calendar-day', {
          'other-month': !day.currentMonth,
          'is-today': day.isToday,
          'is-selected': day.date === selectedDate
        }]"
        @click="selectDate(day)"
      >
        <div class="day-number">{{ day.day }}</div>
        <div class="day-events">
          <div
            v-for="evt in day.events.slice(0, 3)"
            :key="evt.id"
            class="day-event-chip"
            :style="{ background: evt.color + '22', color: evt.color, borderColor: evt.color + '44' }"
            @click.stop="viewEvent(evt)"
          >
            <span class="chip-dot" :style="{ background: evt.color }"></span>
            <span class="chip-text">{{ evt.title }}</span>
          </div>
          <div v-if="day.events.length > 3" class="day-more" @click.stop="selectDate(day)">
            +{{ day.events.length - 3 }} 更多
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedDate" class="selected-detail card">
      <div class="detail-header">
        <h3 class="font-semibold">{{ formatDisplayDate(selectedDate) }} 的事件</h3>
        <button class="btn btn-ghost btn-sm" @click="selectedDate = null">✕</button>
      </div>
      <div v-if="selectedDayEvents.length === 0" class="empty-state" style="padding: 24px;">
        <div class="empty-state-icon" style="font-size: 28px;">📭</div>
        <div class="empty-state-text text-sm">当天无事件</div>
      </div>
      <div v-else class="detail-events">
        <div v-for="evt in selectedDayEvents" :key="evt.id" class="detail-event-item" @click="viewEvent(evt)">
          <div class="detail-event-color" :style="{ background: evt.color }"></div>
          <div class="detail-event-info">
            <div class="detail-event-title font-medium">{{ evt.title }}</div>
            <div class="detail-event-meta text-sm text-muted">
              <span>{{ typeLabel(evt.eventType) }}</span>
              <span v-if="evt.isAllDay">· 全天</span>
              <span v-else>· {{ formatTime(evt.startDate) }}</span>
              <span v-if="evt.endDate"> ~ {{ formatTime(evt.endDate) }}</span>
              <span v-if="evt.reminderEnabled">· 🔔 提醒</span>
            </div>
            <div v-if="evt.description" class="detail-event-desc text-sm text-muted">
              {{ evt.description.substring(0, 100) }}{{ evt.description.length > 100 ? '...' : '' }}
            </div>
          </div>
          <div class="detail-event-actions">
            <button
              v-if="authStore.isAuthenticated"
              :class="['btn', evt._isSubscribed ? 'btn-secondary' : 'btn-outline', 'btn-sm']"
              @click.stop="toggleSubscribe(evt)"
            >
              {{ evt._isSubscribed ? '已订阅' : '订阅' }}
            </button>
            <button
              v-if="authStore.isAuthenticated && !evt._hasReminder && evt.reminderEnabled"
              class="btn btn-ghost btn-sm"
              @click.stop="setReminder(evt)"
            >
              🔔
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="upcoming-section">
      <h3 class="font-semibold mb">📋 即将到来</h3>
      <div v-if="upcomingEvents.length === 0" class="empty-state card" style="padding: 32px;">
        <div class="empty-state-icon">📅</div>
        <div class="empty-state-text text-sm">暂无即将到来的事件</div>
      </div>
      <div v-else class="upcoming-list">
        <div v-for="evt in upcomingEvents" :key="evt.id" class="upcoming-item card" @click="viewEvent(evt)">
          <div class="upcoming-color" :style="{ background: evt.color }"></div>
          <div class="upcoming-info">
            <div class="upcoming-title font-medium">{{ evt.title }}</div>
            <div class="upcoming-meta text-sm text-muted">
              {{ typeLabel(evt.eventType) }} · {{ formatDate(evt.startDate) }}
              <span v-if="evt.reminderEnabled">· 🔔</span>
              <span>· {{ evt._count?.subscriptions || 0 }} 订阅</span>
            </div>
          </div>
          <div class="upcoming-actions">
            <button
              v-if="authStore.isAuthenticated"
              :class="['btn', evt._isSubscribed ? 'btn-secondary' : 'btn-outline', 'btn-sm']"
              @click.stop="toggleSubscribe(evt)"
            >
              {{ evt._isSubscribed ? '已订阅' : '订阅' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEventForm" class="modal-overlay" @click.self="showEventForm = false">
      <div class="modal card" style="max-width: 640px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingEvent ? '编辑事件' : '新建日历事件' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showEventForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">事件标题 <span style="color: var(--danger);">*</span></label>
            <input v-model="eventForm.title" type="text" class="form-input" placeholder="例：第三期征稿截止" required>
          </div>
          <div class="form-group">
            <label class="form-label">事件类型 <span style="color: var(--danger);">*</span></label>
            <select v-model="eventForm.eventType" class="form-select">
              <option value="SCHEDULE">作者排期</option>
              <option value="SUBMISSION_DEADLINE">征稿节点</option>
              <option value="PUBLISH_REMINDER">发布提醒</option>
              <option value="ACTIVITY">活动</option>
            </select>
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
              <label class="form-label">关联类型</label>
              <select v-model="eventForm.linkType" class="form-select">
                <option :value="null">无关联</option>
                <option value="topic">征稿专题</option>
                <option value="event">活动</option>
                <option value="crowdfunding">众筹</option>
                <option value="collaboration">合作</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="eventForm.description" class="form-textarea" rows="3" placeholder="事件详细说明..."></textarea>
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

    <div v-if="showEventDetail" class="modal-overlay" @click.self="showEventDetail = false">
      <div class="modal card" style="max-width: 560px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ detailEvent?.title }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showEventDetail = false">✕</button>
        </div>
        <div class="modal-body" v-if="detailEvent">
          <div class="detail-row">
            <span class="detail-label">类型</span>
            <span :class="['badge', typeBadgeClass(detailEvent.eventType)]">{{ typeLabel(detailEvent.eventType) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">时间</span>
            <span class="detail-value">
              {{ formatDate(detailEvent.startDate) }}
              <span v-if="detailEvent.endDate"> ~ {{ formatDate(detailEvent.endDate) }}</span>
              <span v-if="detailEvent.isAllDay">（全天）</span>
            </span>
          </div>
          <div class="detail-row" v-if="detailEvent.description">
            <span class="detail-label">描述</span>
            <span class="detail-value">{{ detailEvent.description }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">创建者</span>
            <span class="detail-value">{{ detailEvent.creator?.username }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">订阅数</span>
            <span class="detail-value">{{ detailEvent._count?.subscriptions || 0 }}</span>
          </div>
          <div class="detail-row" v-if="detailEvent.reminderEnabled">
            <span class="detail-label">提醒</span>
            <span class="detail-value">提前 {{ detailEvent.reminderMinutes }} 分钟</span>
          </div>
          <div class="detail-row" v-if="detailEvent.linkType">
            <span class="detail-label">关联</span>
            <span class="detail-value">
              <router-link v-if="detailEvent.linkType === 'topic'" :to="`/topics/${detailEvent.linkId}`" class="link-accent">
                征稿专题 #{{ detailEvent.linkId }}
              </router-link>
              <span v-else>{{ linkTypeLabel(detailEvent.linkType) }} #{{ detailEvent.linkId }}</span>
            </span>
          </div>
          <div class="detail-actions-row">
            <button
              v-if="authStore.isAuthenticated"
              :class="['btn', detailEvent._isSubscribed ? 'btn-secondary' : 'btn-outline', 'btn-sm']"
              @click="toggleSubscribe(detailEvent)"
            >
              {{ detailEvent._isSubscribed ? '取消订阅' : '订阅此事件' }}
            </button>
            <button
              v-if="authStore.isAuthenticated && detailEvent.reminderEnabled"
              class="btn btn-outline btn-sm"
              @click="setReminder(detailEvent)"
            >
              🔔 设置提醒
            </button>
            <button
              v-if="authStore.isAuthenticated && (detailEvent.creatorId === authStore.user?.id || authStore.isAdmin)"
              class="btn btn-ghost btn-sm"
              @click="openEventForm(detailEvent); showEventDetail = false;"
            >
              编辑
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const authStore = useAuthStore()
const showToast = inject('showToast')

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const currentType = ref('all')
const viewMode = ref('all')
const loading = ref(false)
const events = ref([])
const selectedDate = ref(null)
const showEventForm = ref(false)
const editingEvent = ref(null)
const showEventDetail = ref(false)
const detailEvent = ref(null)
const submitting = ref(false)

const typeFilters = [
  { label: '全部', value: 'all', icon: '📋' },
  { label: '排期', value: 'SCHEDULE', icon: '📅' },
  { label: '征稿', value: 'SUBMISSION_DEADLINE', icon: '📝' },
  { label: '提醒', value: 'PUBLISH_REMINDER', icon: '🔔' },
  { label: '活动', value: 'ACTIVITY', icon: '🎉' }
]

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
  isAllDay: true,
  reminderEnabled: false,
  reminderMinutes: 30,
  linkType: null,
  linkId: null
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

const prevMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  loadEvents()
}

const nextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  loadEvents()
}

const goToday = () => {
  currentYear.value = new Date().getFullYear()
  currentMonth.value = new Date().getMonth() + 1
  loadEvents()
}

const calendarDays = computed(() => {
  const y = currentYear.value
  const m = currentMonth.value
  const firstDay = new Date(y, m - 1, 1)
  const lastDay = new Date(y, m, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const days = []

  const prevMonthLast = new Date(y, m - 1, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthLast - i
    const pm = m - 1 === 0 ? 12 : m - 1
    const py = m - 1 === 0 ? y - 1 : y
    const dateStr = `${py}-${String(pm).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    days.push({
      day, currentMonth: false, isToday: false, date: dateStr,
      events: getEventsForDate(dateStr)
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      day: d, currentMonth: true,
      isToday: dateStr === todayStr,
      date: dateStr,
      events: getEventsForDate(dateStr)
    })
  }

  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    const nm = m + 1 === 13 ? 1 : m + 1
    const ny = m + 1 === 13 ? y + 1 : y
    const dateStr = `${ny}-${String(nm).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      day: d, currentMonth: false, isToday: false, date: dateStr,
      events: getEventsForDate(dateStr)
    })
  }

  return days
})

const getEventsForDate = (dateStr) => {
  return events.value.filter(evt => {
    const start = formatDate(evt.startDate)
    if (start === dateStr) return true
    if (evt.endDate) {
      const end = formatDate(evt.endDate)
      return dateStr >= start && dateStr <= end
    }
    return false
  })
}

const selectedDayEvents = computed(() => {
  if (!selectedDate.value) return []
  return getEventsForDate(selectedDate.value)
})

const upcomingEvents = computed(() => {
  const now = new Date()
  return events.value
    .filter(e => new Date(e.startDate) >= now && e.status === 'ACTIVE')
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 8)
})

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const selectDate = (day) => {
  if (selectedDate.value === day.date) {
    selectedDate.value = null
  } else {
    selectedDate.value = day.date
  }
}

const viewEvent = async (evt) => {
  detailEvent.value = evt
  showEventDetail.value = true
  if (authStore.isAuthenticated && evt._isSubscribed === undefined) {
    try {
      const res = await api.get('/calendar/subscribed')
      const subIds = new Set((res.events || []).map(e => e.id))
      events.value.forEach(e => {
        e._isSubscribed = subIds.has(e.id)
      })
    } catch (e) {}
  }
}

const loadEvents = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      year: currentYear.value,
      month: currentMonth.value
    })
    if (currentType.value !== 'all') params.set('eventType', currentType.value)
    const res = await api.get(`/calendar?${params}`)
    events.value = res.events || []
    if (authStore.isAuthenticated) await markSubscriptions()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadMyEvents = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      year: currentYear.value,
      month: currentMonth.value
    })
    const res = await api.get(`/calendar/mine?${params}`)
    events.value = res.events || []
    if (authStore.isAuthenticated) await markSubscriptions()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadSubscribed = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      year: currentYear.value,
      month: currentMonth.value
    })
    const res = await api.get(`/calendar/subscribed?${params}`)
    events.value = res.events || []
    events.value.forEach(e => {
      e._isSubscribed = true
    })
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const markSubscriptions = async () => {
  try {
    const res = await api.get('/calendar/subscribed')
    const subIds = new Set((res.events || []).map(e => e.id))
    events.value.forEach(e => {
      e._isSubscribed = subIds.has(e.id)
    })
  } catch (e) {}
}

const toggleSubscribe = async (evt) => {
  if (!authStore.isAuthenticated) return
  try {
    if (evt._isSubscribed) {
      await api.delete(`/calendar/${evt.id}/subscribe`)
      evt._isSubscribed = false
      showToast('已取消订阅', 'success')
    } else {
      try {
        await api.post(`/calendar/${evt.id}/subscribe`)
      } catch (e) {
        if (e.error && e.error.includes('已订阅')) {
          evt._isSubscribed = true
          showToast('已订阅', 'success')
          return
        }
        throw e
      }
      evt._isSubscribed = true
      showToast('订阅成功', 'success')
    }
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const setReminder = async (evt) => {
  if (!authStore.isAuthenticated) return
  try {
    await api.post(`/calendar/${evt.id}/remind`, { minutesBefore: evt.reminderMinutes || 30 })
    evt._hasReminder = true
    showToast('提醒设置成功', 'success')
  } catch (e) {
    showToast(e.error || '设置失败', 'error')
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
      isAllDay: evt.isAllDay,
      reminderEnabled: evt.reminderEnabled,
      reminderMinutes: evt.reminderMinutes,
      linkType: evt.linkType,
      linkId: evt.linkId
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
      isAllDay: true,
      reminderEnabled: false,
      reminderMinutes: 30,
      linkType: null,
      linkId: null
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
      await api.put(`/calendar/${editingEvent.value.id}`, data)
      showToast('更新成功', 'success')
    } else {
      await api.post('/calendar', data)
      showToast('创建成功', 'success')
    }
    showEventForm.value = false
    if (viewMode.value === 'mine') loadMyEvents()
    else loadEvents()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteEvent = async (evt) => {
  if (!confirm(`确定要删除「${evt.title}」吗？`)) return
  try {
    await api.delete(`/calendar/${evt.id}`)
    showToast('删除成功', 'success')
    showEventForm.value = false
    loadEvents()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

onMounted(() => loadEvents())
</script>

<style scoped>
.calendar-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calendar-current-month {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 600;
  min-width: 120px;
  text-align: center;
}

.calendar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 4px;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 1px;
}

.weekday-cell {
  padding: 10px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  border-radius: 0;
}

.weekday-cell:first-child { border-radius: var(--radius-sm) 0 0 0; }
.weekday-cell:last-child { border-radius: 0 var(--radius-sm) 0 0; }

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--border-light);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  overflow: hidden;
}

.calendar-day {
  min-height: 110px;
  padding: 6px 8px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: background 0.15s;
}

.calendar-day:hover { background: var(--bg-tertiary); }

.calendar-day.other-month { background: var(--bg-primary); }
.calendar-day.other-month .day-number { color: var(--text-tertiary); }

.calendar-day.is-today {
  background: var(--accent-light);
}

.calendar-day.is-today .day-number {
  background: var(--accent);
  color: #fff;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.calendar-day.is-selected {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.day-number {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.day-event-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  border: 1px solid;
  overflow: hidden;
  cursor: pointer;
  transition: opacity 0.15s;
}

.day-event-chip:hover { opacity: 0.8; }

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chip-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.day-more {
  font-size: 10px;
  color: var(--text-tertiary);
  padding: 1px 6px;
}

.selected-detail {
  margin-top: 24px;
  padding: 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.detail-events {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-event-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  cursor: pointer;
  transition: background 0.15s;
}

.detail-event-item:hover { background: var(--bg-tertiary); }

.detail-event-color {
  width: 4px;
  min-height: 40px;
  border-radius: 2px;
  flex-shrink: 0;
}

.detail-event-info { flex: 1; min-width: 0; }

.detail-event-title {
  font-size: 14px;
  margin-bottom: 4px;
}

.detail-event-meta { font-size: 12px; }

.detail-event-desc {
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.5;
}

.detail-event-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-items: center;
}

.upcoming-section {
  margin-top: 36px;
}

.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upcoming-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  cursor: pointer;
}

.upcoming-item:hover { transform: translateX(4px); }

.upcoming-color {
  width: 4px;
  height: 36px;
  border-radius: 2px;
  flex-shrink: 0;
}

.upcoming-info { flex: 1; min-width: 0; }

.upcoming-title {
  font-size: 14px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upcoming-actions { flex-shrink: 0; }

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

.color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

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

.detail-row {
  display: flex;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-light);
}

.detail-row:last-child { border-bottom: none; }

.detail-label {
  font-size: 13px;
  color: var(--text-tertiary);
  min-width: 60px;
  flex-shrink: 0;
}

.detail-value {
  font-size: 14px;
  flex: 1;
}

.link-accent {
  color: var(--accent);
  text-decoration: underline;
}

.detail-actions-row {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.danger-btn { color: var(--danger); }

@media (max-width: 768px) {
  .calendar-controls { flex-direction: column; align-items: flex-start; }
  .calendar-day { min-height: 70px; padding: 4px; }
  .day-event-chip { font-size: 9px; padding: 1px 3px; }
  .chip-text { display: none; }
}
</style>
