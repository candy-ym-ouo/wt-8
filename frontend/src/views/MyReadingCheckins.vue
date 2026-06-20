<template>
  <div class="container my-reading">
    <div class="page-header">
      <h1>📖 我的阅读打卡</h1>
      <button class="btn btn-primary" @click="showCheckInForm = true">
        <span>✍️</span> 今日打卡
      </button>
    </div>

    <div class="streak-overview">
      <div class="streak-card main">
        <div class="streak-flame">🔥</div>
        <div class="streak-info">
          <span class="streak-num">{{ streak.currentStreak || 0 }}</span>
          <span class="streak-label">连续打卡天数</span>
        </div>
      </div>
      <div class="streak-card">
        <span class="num">{{ streak.longestStreak || 0 }}</span>
        <span class="label">最长连续</span>
      </div>
      <div class="streak-card">
        <span class="num">{{ streak.totalCheckIns || 0 }}</span>
        <span class="label">累计次数</span>
      </div>
      <div class="streak-card">
        <span class="num">{{ streak.totalMinutes || 0 }}</span>
        <span class="label">阅读分钟</span>
      </div>
      <div class="streak-card">
        <span class="num">{{ streak.totalPages || 0 }}</span>
        <span class="label">阅读页数</span>
      </div>
    </div>

    <div class="calendar-section">
      <div class="section-header">
        <div class="cal-nav">
          <button class="cal-btn" @click="prevMonth">‹</button>
          <h3>{{ currentYear }}年{{ currentMonth + 1 }}月</h3>
          <button class="cal-btn" @click="nextMonth">›</button>
        </div>
        <div class="cal-legend">
          <span>本月打卡 <strong>{{ monthlyCount }}</strong> 次</span>
        </div>
      </div>
      <div class="calendar-grid">
        <div v-for="w in weekDays" :key="w" class="cal-weekday">{{ w }}</div>
        <div v-for="(day, idx) in calendarDays" :key="idx"
             :class="['cal-day', {
               'other-month': !day.current,
               'has-checkin': day.hasCheckIn,
               'is-today': day.isToday,
               'clickable': day.current && day.hasCheckIn
             }]"
             @click="day.hasCheckIn && scrollToCheckIn(day.date)">
          <span class="day-num">{{ day.num }}</span>
          <div v-if="day.hasCheckIn" class="day-indicator">
            <span v-if="day.minutes" class="day-mins">{{ day.minutes }}分</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section-header">
      <h3>📚 打卡记录</h3>
      <div class="filter-tabs">
        <button :class="['tab', { active: filter === 'all' }]" @click="filter = 'all'; loadCheckIns()">全部</button>
        <button :class="['tab', { active: filter === 'public' }]" @click="filter = 'public'; loadCheckIns()">公开</button>
        <button :class="['tab', { active: filter === 'private' }]" @click="filter = 'private'; loadCheckIns()">私密</button>
      </div>
    </div>

    <div v-if="checkIns.length > 0" class="checkin-list">
      <div v-for="ci in checkIns" :key="ci.id" :ref="el => setCheckInRef(ci.id, el)" class="checkin-item">
        <div class="ci-left">
          <div class="ci-date">
            <span class="d">{{ formatDay(ci.checkInDate) }}</span>
            <span class="m">{{ formatMonth(ci.checkInDate) }}</span>
          </div>
          <span class="mood-icon">{{ getMoodEmoji(ci.mood) }}</span>
        </div>
        <div class="ci-main">
          <div class="ci-book">
            <span class="book-emoji">📖</span>
            <strong>{{ ci.bookTitle }}</strong>
            <span v-if="ci.bookAuthor" class="author">· {{ ci.bookAuthor }}</span>
            <span :class="['vis-tag', ci.isPublic ? 'public' : 'private']">
              {{ ci.isPublic ? '公开' : '私密' }}
            </span>
          </div>
          <div class="ci-stats">
            <span v-if="ci.pagesRead" class="ci-stat">📄 {{ ci.pagesRead }}页</span>
            <span v-if="ci.minutesRead" class="ci-stat">⏱️ {{ ci.minutesRead }}分钟</span>
            <span class="ci-stat">❤️ {{ ci.likeCount || 0 }}</span>
            <span class="ci-stat">💬 {{ ci.commentCount || 0 }}</span>
          </div>
          <p v-if="ci.note" class="ci-note">{{ ci.note }}</p>
          <div class="ci-actions">
            <button class="ci-btn" @click="editCheckIn(ci)">编辑</button>
            <button class="ci-btn danger" @click="deleteCheckIn(ci)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <span class="empty-icon">📖</span>
      <h3>还没有打卡记录</h3>
      <p>点击右上角"今日打卡"开始记录你的阅读吧！</p>
    </div>

    <div v-if="checkIns.length > 0 && hasMore" class="load-more">
      <button class="btn btn-outline" @click="loadMore">加载更多</button>
    </div>

    <div v-if="showCheckInForm || editingCheckIn" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingCheckIn ? '编辑打卡' : '今日阅读打卡' }}</h3>
          <button class="close-btn" @click="closeForm">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="submitCheckIn" class="checkin-form">
            <div class="form-group">
              <label>📚 书名 *</label>
              <input v-model="form.bookTitle" type="text" placeholder="请输入书名" required />
            </div>
            <div class="form-group">
              <label>✍️ 作者</label>
              <input v-model="form.bookAuthor" type="text" placeholder="请输入作者（选填）" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>📄 阅读页数</label>
                <input v-model.number="form.pagesRead" type="number" min="0" placeholder="0" />
              </div>
              <div class="form-group">
                <label>⏱️ 阅读时长（分钟）</label>
                <input v-model.number="form.minutesRead" type="number" min="0" placeholder="0" />
              </div>
            </div>
            <div class="form-group">
              <label>😊 阅读心情</label>
              <div class="mood-selector">
                <button v-for="m in moods" :key="m.id" type="button"
                        :class="['mood-btn', { active: form.mood === m.id }]"
                        @click="form.mood = m.id">
                  <span class="emoji">{{ m.icon }}</span>
                  <span class="name">{{ m.name }}</span>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>📝 阅读笔记</label>
              <textarea v-model="form.note" rows="4" placeholder="写下今天的阅读感悟...（选填）"></textarea>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input v-model="form.isPublic" type="checkbox" />
                公开这条打卡（所有人可见）
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-ghost" @click="closeForm">取消</button>
              <button type="submit" class="btn btn-primary" :disabled="submitting">
                {{ submitting ? '提交中...' : (editingCheckIn ? '保存' : '完成打卡') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/utils/api'
import { inject } from 'vue'

const showToast = inject('showToast')

const streak = ref({})
const monthlyCount = ref(0)
const calendarData = ref([])

const checkIns = ref([])
const filter = ref('all')
const page = ref(1)
const hasMore = ref(false)
const loading = ref(false)

const showCheckInForm = ref(false)
const editingCheckIn = ref(null)
const submitting = ref(false)

const checkInRefs = ref({})

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth())

const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const moods = ref([])

const form = ref({
  bookTitle: '',
  bookAuthor: '',
  pagesRead: 0,
  minutesRead: 0,
  mood: 'HAPPY',
  note: '',
  isPublic: true
})

const moodMap = {
  HAPPY: '😊', INSPIRED: '💡', MOVED: '🥹', THOUGHTFUL: '🤔',
  RELAXED: '😌', EXCITED: '🤩', CHALLENGED: '🧠'
}
const getMoodEmoji = (m) => moodMap[m] || '📖'

const calendarDays = computed(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const prevLastDay = new Date(currentYear.value, currentMonth.value, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const calMap = {}
  calendarData.value.forEach(c => {
    const d = new Date(c.checkInDate)
    calMap[d.getDate()] = { minutes: c.minutesRead, pages: c.pagesRead }
  })

  const days = []
  for (let i = startWeekday - 1; i >= 0; i--) {
    days.push({ num: prevLastDay - i, current: false, date: null })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(currentYear.value, currentMonth.value, d)
    const isToday = date.getTime() === today.getTime()
    const hasCheckIn = !!calMap[d]
    days.push({
      num: d,
      current: true,
      isToday,
      hasCheckIn,
      minutes: calMap[d]?.minutes,
      pages: calMap[d]?.pages,
      date: new Date(date)
    })
  }

  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push({ num: d, current: false, date: null })
  }

  return days
})

const setCheckInRef = (id, el) => {
  if (el) checkInRefs.value[id] = el
}

const formatDay = (d) => new Date(d).getDate()
const formatMonth = (d) => `${new Date(d).getMonth() + 1}月`

const loadMoods = async () => {
  try {
    const res = await api.get('/reading-checkins/moods')
    moods.value = res.moods
  } catch (e) {
    moods.value = [
      { id: 'HAPPY', name: '开心', icon: '😊' },
      { id: 'INSPIRED', name: '受启发', icon: '💡' },
      { id: 'MOVED', name: '感动', icon: '🥹' }
    ]
  }
}

const loadStreak = async () => {
  try {
    const res = await api.get('/reading-checkins/streak')
    streak.value = res.streak
    monthlyCount.value = res.monthlyCount
    calendarData.value = res.calendar
  } catch (e) {}
}

const loadCheckIns = async (reset = true) => {
  if (reset) {
    page.value = 1
    checkIns.value = []
  }
  loading.value = true
  try {
    const res = await api.get('/reading-checkins/mine', {
      params: { page: page.value, limit: 20 }
    })
    let data = res.checkIns
    if (filter.value === 'public') data = data.filter(c => c.isPublic)
    if (filter.value === 'private') data = data.filter(c => !c.isPublic)
    checkIns.value = [...checkIns.value, ...data]
    hasMore.value = page.value < res.totalPages
    page.value++
  } catch (e) {}
  loading.value = false
}

const loadMore = () => loadCheckIns(false)

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
  loadStreak()
}
const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
  loadStreak()
}

const scrollToCheckIn = (date) => {
  if (!date) return
  const target = checkIns.value.find(ci => {
    const d = new Date(ci.checkInDate)
    return d.getDate() === date.getDate() && d.getMonth() === date.getMonth()
  })
  if (target && checkInRefs.value[target.id]) {
    checkInRefs.value[target.id].scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

const resetForm = () => {
  form.value = {
    bookTitle: '',
    bookAuthor: '',
    pagesRead: 0,
    minutesRead: 0,
    mood: 'HAPPY',
    note: '',
    isPublic: true
  }
  editingCheckIn.value = null
}

const editCheckIn = (ci) => {
  editingCheckIn.value = ci
  form.value = {
    bookTitle: ci.bookTitle,
    bookAuthor: ci.bookAuthor || '',
    pagesRead: ci.pagesRead || 0,
    minutesRead: ci.minutesRead || 0,
    mood: ci.mood,
    note: ci.note || '',
    isPublic: ci.isPublic
  }
}

const closeForm = () => {
  showCheckInForm.value = false
  resetForm()
}

const submitCheckIn = async () => {
  if (!form.value.bookTitle.trim()) {
    showToast('请填写书名', 'error')
    return
  }
  submitting.value = true
  try {
    if (editingCheckIn.value) {
      await api.put(`/reading-checkins/${editingCheckIn.value.id}`, form.value)
      showToast('更新成功')
    } else {
      await api.post('/reading-checkins', form.value)
      showToast('打卡成功！获得 10 经验值 🎉')
      showCheckInForm.value = false
    }
    resetForm()
    loadStreak()
    loadCheckIns()
  } catch (e) {
    showToast(e.error || '提交失败', 'error')
  }
  submitting.value = false
}

const deleteCheckIn = async (ci) => {
  if (!confirm('确定删除这条打卡记录吗？')) return
  try {
    await api.delete(`/reading-checkins/${ci.id}`)
    showToast('删除成功')
    loadStreak()
    loadCheckIns()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

onMounted(() => {
  loadMoods()
  loadStreak()
  loadCheckIns()
})
</script>

<style scoped>
.my-reading { padding-bottom: 48px; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.page-header h1 { font-size: 28px; }

.streak-overview {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 32px;
}
.streak-card {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid var(--border-light);
}
.streak-card.main {
  flex-direction: row;
  gap: 20px;
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  color: #fff;
  border: none;
}
.streak-flame { font-size: 56px; }
.streak-info { display: flex; flex-direction: column; gap: 2px; }
.streak-num { font-size: 42px; font-weight: 800; font-family: var(--font-serif); line-height: 1; }
.streak-label { opacity: 0.9; font-size: 14px; }

.streak-card .num { font-size: 28px; font-weight: 700; color: var(--accent); font-family: var(--font-serif); }
.streak-card .label { font-size: 12px; color: var(--text-secondary); }

.calendar-section {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 32px;
  border: 1px solid var(--border-light);
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.section-header h3 { font-size: 18px; }

.cal-nav {
  display: flex;
  align-items: center;
  gap: 16px;
}
.cal-nav h3 { font-size: 16px; font-weight: 600; margin: 0; }
.cal-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.cal-btn:hover { background: var(--accent-light); color: var(--accent); }

.cal-legend { font-size: 13px; color: var(--text-secondary); }
.cal-legend strong { color: var(--accent); }

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.cal-weekday {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 8px 0;
  font-weight: 600;
}
.cal-day {
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 13px;
  transition: all 0.15s;
  background: var(--bg-primary);
}
.cal-day.other-month { opacity: 0.3; }
.cal-day.is-today { border: 2px solid var(--accent); }
.cal-day.has-checkin {
  background: linear-gradient(135deg, var(--accent-light), #e8ddc7);
  color: var(--accent);
}
.cal-day.clickable { cursor: pointer; }
.cal-day.clickable:hover { transform: scale(1.05); }
.day-num { font-weight: 600; }
.day-indicator { display: flex; flex-direction: column; align-items: center; }
.day-mins { font-size: 10px; opacity: 0.8; }

.filter-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-sm);
}
.tab {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.tab.active { background: var(--accent); color: #fff; }

.checkin-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}
.checkin-item {
  display: flex;
  gap: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 20px;
  border: 1px solid var(--border-light);
}
.ci-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 64px;
}
.ci-date {
  text-align: center;
  background: var(--accent-light);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  width: 100%;
}
.ci-date .d { font-size: 22px; font-weight: 700; color: var(--accent); display: block; line-height: 1; }
.ci-date .m { font-size: 11px; color: var(--text-secondary); }
.mood-icon { font-size: 28px; }

.ci-main { flex: 1; }
.ci-book {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.book-emoji { font-size: 18px; }
.ci-book strong { font-size: 16px; }
.ci-book .author { color: var(--text-secondary); font-size: 13px; }
.vis-tag {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  margin-left: auto;
}
.vis-tag.public { background: #d4edda; color: #155724; }
.vis-tag.private { background: #fff3cd; color: #856404; }

.ci-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}
.ci-stat {
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}
.ci-note {
  padding: 12px 16px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--accent);
  line-height: 1.7;
  color: var(--text-secondary);
  margin-bottom: 12px;
}
.ci-actions {
  display: flex;
  gap: 8px;
}
.ci-btn {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
  background: var(--bg-primary);
}
.ci-btn:hover { color: var(--accent); background: var(--accent-light); }
.ci-btn.danger:hover { color: var(--danger); background: #fde8e8; }

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-radius: var(--radius);
}
.empty-icon { font-size: 64px; display: block; margin-bottom: 16px; }
.empty-state h3 { color: var(--text-primary); margin-bottom: 8px; }
.load-more { text-align: center; margin-top: 24px; }

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
  background: var(--bg-secondary);
  border-radius: var(--radius);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}
.modal-header h3 { font-size: 18px; }
.close-btn {
  font-size: 28px;
  line-height: 1;
  color: var(--text-secondary);
}
.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.checkin-form { display: flex; flex-direction: column; gap: 16px; }
.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-primary);
}
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--accent);
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.mood-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.mood-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  border: 2px solid transparent;
  transition: all 0.2s;
}
.mood-btn.active {
  border-color: var(--accent);
  background: var(--accent-light);
}
.mood-btn .emoji { font-size: 24px; }
.mood-btn .name { font-size: 12px; color: var(--text-secondary); }

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  margin-bottom: 0 !important;
  cursor: pointer;
  font-weight: 500 !important;
}
.checkbox-label input { width: auto !important; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
</style>
