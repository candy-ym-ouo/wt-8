<template>
  <div class="container">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">站内消息</h1>
        <p class="page-subtitle">系统通知和用户私信</p>
      </div>
      <div class="header-actions flex gap-sm items-center">
        <button class="btn btn-secondary btn-sm" @click="showCompose = true">
          ✉️ 发消息
        </button>
        <button
          class="btn btn-ghost btn-sm"
          :disabled="!hasUnreadInCurrent"
          @click="markAllRead"
        >
          全部已读
        </button>
      </div>
    </div>

    <div class="messages-layout">
      <div class="message-list card">
        <div class="list-status-tabs">
          <button
            v-for="s in statusTabs"
            :key="s.value"
            :class="['status-tab', { active: currentStatus === s.value }]"
            @click="setStatus(s.value)"
          >
            {{ s.label }}
            <span v-if="s.value === 'active' && unreadCount > 0" class="badge-count">{{ unreadCount }}</span>
            <span v-if="s.value === 'archived' && archivedCount > 0" class="badge-count muted">{{ archivedCount }}</span>
          </button>
        </div>

        <div class="list-category-tabs">
          <button
            v-for="t in categoryTabs"
            :key="t.value"
            :class="['category-tab', { active: currentCategory === t.value }]"
            @click="setCategory(t.value)"
          >
            {{ t.label }}
            <span
              v-if="getCategoryUnread(t.value) > 0 && currentStatus === 'active'"
              class="cat-unread"
            >{{ getCategoryUnread(t.value) }}</span>
          </button>
        </div>

        <div v-if="showSubCategory" class="list-sub-tabs">
          <button
            v-for="t in subCategoryTabs"
            :key="t.value"
            :class="['sub-tab', { active: currentType === t.value }]"
            @click="setType(t.value)"
          >
            {{ t.label }}
            <span
              v-if="getCategoryUnread(t.value) > 0 && currentStatus === 'active'"
              class="sub-unread"
            >{{ getCategoryUnread(t.value) }}</span>
          </button>
        </div>

        <div v-if="listLoading" class="list-empty p-4">
          <div class="empty-state-icon">⏳</div>
          <div class="text-sm text-tertiary">加载中...</div>
        </div>
        <div v-else-if="messages.length === 0" class="list-empty">
          <div class="empty-state-icon">{{ currentStatus === 'archived' ? '🗄️' : '📭' }}</div>
          <div class="empty-state-text text-sm">
            {{ currentStatus === 'archived' ? '暂无归档消息' : '暂无消息' }}
          </div>
        </div>
        <div v-else class="list-content">
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="['msg-item', { unread: !msg.isRead, active: selectedId === msg.id }]"
            @click="selectMessage(msg)"
          >
            <img :src="msg.sender?.avatar" class="msg-avatar">
            <div class="msg-brief">
              <div class="msg-top">
                <span class="msg-sender font-medium">{{ msg.sender?.username || '系统' }}</span>
                <span class="msg-time text-xs text-tertiary">{{ formatTime(msg.createdAt) }}</span>
              </div>
              <div class="msg-subject">{{ msg.title }}</div>
              <div class="msg-preview text-xs text-muted">{{ stripHtml(msg.content).substring(0, 40) }}...</div>
            </div>
            <div class="msg-item-actions" @click.stop>
              <button
                v-if="currentStatus === 'active'"
                class="icon-btn"
                title="归档"
                @click="toggleArchive(msg, true)"
              >📥</button>
              <button
                v-else
                class="icon-btn"
                title="取消归档"
                @click="toggleArchive(msg, false)"
              >📤</button>
              <span v-if="!msg.isRead" class="unread-indicator"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="message-detail card">
        <div v-if="!selected" class="detail-empty">
          <div class="empty-state-icon">💌</div>
          <div class="empty-state-text">选择一条消息查看详情</div>
        </div>
        <div v-else>
          <div class="detail-header">
            <div class="detail-title-row">
              <h3 class="detail-title font-serif">{{ selected.title }}</h3>
              <span v-if="selected.isArchived" class="archive-tag">已归档</span>
            </div>
            <div class="detail-meta">
              <div class="sender-info">
                <img :src="selected.sender?.avatar" class="msg-avatar-sm">
                <div>
                  <div class="font-medium text-sm">{{ selected.sender?.username || '系统消息' }}</div>
                  <div class="text-xs text-tertiary">{{ getTypeLabel(selected.type) }}</div>
                </div>
              </div>
              <div class="text-xs text-tertiary text-right">
                {{ formatFullDate(selected.createdAt) }}
              </div>
            </div>
          </div>
          <div class="detail-body">
            <div class="msg-content" v-html="formatContent(selected.content)"></div>
          </div>

          <div v-if="selected.type === 'USER' && selected.senderId !== authStore.user?.id" class="quick-reply-section">
            <div class="quick-reply-header">
              <span class="text-sm font-medium">快捷回复</span>
              <button class="btn-link text-xs" @click="openQuickReplyManager">管理</button>
            </div>
            <div v-if="quickReplies.length === 0" class="no-quick-replies text-xs text-tertiary">
              暂无快捷回复，点击"管理"添加
            </div>
            <div v-else class="quick-reply-tags">
              <button
                v-for="qr in quickReplies"
                :key="qr.id"
                class="quick-reply-tag"
                @click="applyQuickReply(qr)"
                :title="qr.content"
              >
                {{ qr.title }}
              </button>
            </div>
          </div>

          <div class="detail-footer">
            <router-link
              v-if="selected.type === 'REPORT' && extractReportId(selected.content)"
              :to="`/report-center?reportId=${extractReportId(selected.content)}`"
              class="btn btn-primary btn-sm"
            >
              🛡️ 查看举报详情
            </router-link>
            <router-link
              v-if="selected.type === 'CROWDFUNDING'"
              :to="`/crowdfundings`"
              class="btn btn-primary btn-sm"
            >
              🎯 查看众筹
            </router-link>
            <router-link
              v-if="selected.type === 'ZINE'"
              :to="`/zines`"
              class="btn btn-primary btn-sm"
            >
              📖 查看刊物
            </router-link>
            <button
              v-if="selected.type === 'USER' && selected.senderId !== authStore.user?.id"
              class="btn btn-secondary btn-sm"
              @click="replyToSender"
            >
              ↩ 回复
            </button>
            <button
              v-if="!selected.isArchived"
              class="btn btn-ghost btn-sm"
              @click="toggleArchive(selected, true)"
            >
              📥 归档
            </button>
            <button
              v-else
              class="btn btn-ghost btn-sm"
              @click="toggleArchive(selected, false)"
            >
              📤 取消归档
            </button>
            <button class="btn btn-ghost btn-sm" @click="deleteMessage(selected.id)">
              🗑 删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCompose" class="modal-overlay" @click.self="showCompose = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ isReplying ? '回复消息' : '发送消息' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showCompose = false">✕</button>
        </div>
        <form @submit.prevent="sendMessage" class="modal-body">
          <div class="form-group">
            <label class="form-label">接收者</label>
            <div class="receiver-select">
              <div class="receiver-input-wrap">
                <span v-if="selectedReceiver" class="selected-user">
                  <img :src="selectedReceiver.avatar">
                  <span>{{ selectedReceiver.username }}</span>
                  <button v-if="!isReplying" type="button" class="remove-user" @click="clearReceiver">✕</button>
                </span>
                <input
                  v-model="receiverSearch"
                  class="form-input receiver-input"
                  :class="{ 'has-selected': selectedReceiver }"
                  :placeholder="selectedReceiver ? '' : '搜索用户名或从下方选择'"
                  :disabled="isReplying"
                  @input="onReceiverSearch"
                  @focus="showUserDropdown = true"
                  @keydown.enter.prevent="selectFirstUser"
                  @keydown.arrow.down.prevent="moveHover(1)"
                  @keydown.arrow.up.prevent="moveHover(-1)"
                >
              </div>
              <div v-if="showUserDropdown && filteredUsers.length > 0 && !isReplying" class="user-dropdown">
                <div
                  v-for="(user, idx) in filteredUsers"
                  :key="user.id"
                  :class="['user-dropdown-item', { active: hoverIndex === idx }]"
                  @click="selectReceiver(user)"
                  @mouseenter="hoverIndex = idx"
                >
                  <img :src="user.avatar">
                  <div class="user-info">
                    <div class="user-name">{{ user.username }}</div>
                    <div class="user-bio text-xs text-tertiary">{{ user.bio || '这位用户很神秘...' }}</div>
                  </div>
                  <span v-if="user.role === 'ADMIN'" class="badge badge-approved text-xs">管理员</span>
                </div>
              </div>
              <div v-if="showUserDropdown && filteredUsers.length === 0 && receiverSearch && !isReplying" class="user-dropdown empty-dropdown">
                没有找到匹配的用户
              </div>
            </div>
          </div>

          <div v-if="!isReplying" class="form-group">
            <label class="form-label">标题</label>
            <input v-model="compose.title" class="form-input" placeholder="消息标题" maxlength="50" required>
          </div>

          <div class="form-group">
            <div class="flex justify-between items-center">
              <label class="form-label">内容</label>
              <button
                v-if="quickReplies.length > 0"
                type="button"
                class="btn-link text-xs"
                @click="showQuickReplyPicker = !showQuickReplyPicker"
              >
                {{ showQuickReplyPicker ? '收起快捷回复' : '插入快捷回复' }}
              </button>
            </div>
            <div v-if="showQuickReplyPicker && quickReplies.length > 0" class="quick-reply-inline">
              <button
                v-for="qr in quickReplies"
                :key="qr.id"
                type="button"
                class="quick-reply-tag"
                @click="insertQuickReply(qr)"
              >
                {{ qr.title }}
              </button>
            </div>
            <textarea v-model="compose.content" class="form-textarea" rows="5" required></textarea>
          </div>

          <div class="modal-footer" style="padding: 0;">
            <button type="button" class="btn btn-secondary" @click="showCompose = false">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="sending">
              {{ sending ? '发送中...' : '发送' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showQuickReplyManage" class="modal-overlay" @click.self="showQuickReplyManage = false">
      <div class="modal card" style="max-width: 560px;">
        <div class="modal-header">
          <h3 class="font-semibold">管理快捷回复</h3>
          <button class="btn btn-ghost btn-sm" @click="showQuickReplyManage = false">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="quickReplies.length === 0" class="qr-empty text-center p-4 text-tertiary text-sm">
            暂无快捷回复，添加一个吧
          </div>
          <div v-else class="qr-list">
            <div v-for="qr in quickReplies" :key="qr.id" class="qr-item">
              <div class="qr-item-main">
                <div class="qr-title font-medium text-sm">{{ qr.title }}</div>
                <div class="qr-content text-xs text-muted">{{ qr.content.substring(0, 60) }}{{ qr.content.length > 60 ? '...' : '' }}</div>
              </div>
              <div class="qr-item-actions">
                <button class="btn btn-ghost btn-xs" @click="editQuickReply(qr)">编辑</button>
                <button class="btn btn-ghost btn-xs text-danger" @click="deleteQuickReply(qr.id)">删除</button>
              </div>
            </div>
          </div>

          <div class="qr-form-wrap">
            <div class="qr-form-title text-sm font-medium">
              {{ editingQuickReply ? '编辑快捷回复' : '新增快捷回复' }}
            </div>
            <div class="form-group">
              <label class="form-label">标题</label>
              <input v-model="qrForm.title" class="form-input" placeholder="例如：感谢来信" maxlength="50">
            </div>
            <div class="form-group">
              <label class="form-label">内容</label>
              <textarea v-model="qrForm.content" class="form-textarea" rows="3" placeholder="快捷回复内容"></textarea>
            </div>
            <div class="flex gap-sm">
              <button
                class="btn btn-primary btn-sm"
                :disabled="!qrForm.title || !qrForm.content"
                @click="saveQuickReply"
              >
                {{ editingQuickReply ? '保存修改' : '添加' }}
              </button>
              <button v-if="editingQuickReply" class="btn btn-secondary btn-sm" @click="resetQrForm">取消编辑</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const authStore = useAuthStore()
const showToast = inject('showToast')

const statusTabs = [
  { label: '收件箱', value: 'active' },
  { label: '归档', value: 'archived' }
]

const categoryTabs = [
  { label: '全部', value: 'all' },
  { label: '系统通知', value: 'SYSTEM_CATEGORY' },
  { label: '用户私信', value: 'USER' }
]

const subCategoryTabs = [
  { label: '全部系统', value: 'all' },
  { label: '系统公告', value: 'SYSTEM' },
  { label: '举报通知', value: 'REPORT' },
  { label: '刊物消息', value: 'ZINE' },
  { label: '众筹消息', value: 'CROWDFUNDING' },
  { label: '合作消息', value: 'COLLABORATION' },
  { label: '活动消息', value: 'EVENT' },
  { label: '财务通知', value: 'FINANCE' },
  { label: '会员通知', value: 'MEMBERSHIP' },
  { label: '投稿通知', value: 'SUBMISSION' }
]

const messages = ref([])
const selected = ref(null)
const selectedId = ref(null)
const currentStatus = ref('active')
const currentCategory = ref('all')
const currentType = ref('all')
const listLoading = ref(false)
const unreadCount = ref(0)
const archivedCount = ref(0)
const categoryUnreadCounts = ref({})

const quickReplies = ref([])
const showQuickReplyManage = ref(false)
const editingQuickReply = ref(null)
const qrForm = ref({ title: '', content: '' })
const showQuickReplyPicker = ref(false)

const showCompose = ref(false)
const isReplying = ref(false)
const sending = ref(false)
const compose = ref({ receiver: '', title: '', content: '' })

const allUsers = ref([])
const receiverSearch = ref('')
const showUserDropdown = ref(false)
const selectedReceiver = ref(null)
const hoverIndex = ref(0)
const usersLoading = ref(false)

const showSubCategory = computed(() => currentCategory.value === 'SYSTEM_CATEGORY')

const hasUnreadInCurrent = computed(() => {
  if (currentStatus.value !== 'active') return false
  if (currentCategory.value === 'all') return unreadCount.value > 0
  return getCategoryUnread(currentCategory.value) > 0
})

const filteredUsers = computed(() => {
  const currentUserId = authStore.user?.id
  let list = allUsers.value.filter(u => u.id !== currentUserId)
  if (receiverSearch.value.trim()) {
    const q = receiverSearch.value.toLowerCase()
    list = list.filter(u => u.username.toLowerCase().includes(q))
  }
  return list.slice(0, 10)
})

const getCategoryUnread = (cat) => {
  return categoryUnreadCounts.value[cat] || 0
}

const loadUsers = async () => {
  if (allUsers.value.length > 0) return
  usersLoading.value = true
  try {
    const res = await api.get('/users?limit=200')
    allUsers.value = res.users || []
  } catch (e) {
    console.error('加载用户列表失败', e)
  } finally {
    usersLoading.value = false
  }
}

const loadQuickReplies = async () => {
  try {
    const res = await api.get('/messages/quick-replies')
    quickReplies.value = res.quickReplies || []
  } catch (e) {
    console.error('加载快捷回复失败', e)
  }
}

const openQuickReplyManager = () => {
  resetQrForm()
  showQuickReplyManage.value = true
}

const resetQrForm = () => {
  editingQuickReply.value = null
  qrForm.value = { title: '', content: '' }
}

const editQuickReply = (qr) => {
  editingQuickReply.value = qr
  qrForm.value = { title: qr.title, content: qr.content }
}

const saveQuickReply = async () => {
  if (!qrForm.value.title || !qrForm.value.content) return
  try {
    if (editingQuickReply.value) {
      await api.put(`/messages/quick-replies/${editingQuickReply.value.id}`, qrForm.value)
      showToast('已更新快捷回复', 'success')
    } else {
      await api.post('/messages/quick-replies', qrForm.value)
      showToast('已添加快捷回复', 'success')
    }
    resetQrForm()
    await loadQuickReplies()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const deleteQuickReply = async (id) => {
  if (!confirm('确定删除这个快捷回复吗？')) return
  try {
    await api.delete(`/messages/quick-replies/${id}`)
    await loadQuickReplies()
    showToast('已删除', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const applyQuickReply = (qr) => {
  compose.value.content = qr.content
  compose.value.title = compose.value.title || qr.title
  replyToSenderWithContent()
}

const insertQuickReply = (qr) => {
  compose.value.content = (compose.value.content ? compose.value.content + '\n' : '') + qr.content
  showQuickReplyPicker.value = false
}

const replyToSenderWithContent = () => {
  if (!selected.value) return
  const senderUser = allUsers.value.find(u => u.id === selected.value.senderId)
  if (senderUser) {
    selectedReceiver.value = senderUser
  } else if (selected.value.sender) {
    selectedReceiver.value = {
      id: selected.value.sender.id,
      username: selected.value.sender.username,
      avatar: selected.value.sender.avatar
    }
  }
  compose.value.title = selected.value.title?.startsWith('Re:') ? selected.value.title : `Re: ${selected.value.title}`
  isReplying.value = true
  showCompose.value = true
}

const onReceiverSearch = () => {
  hoverIndex.value = 0
  showUserDropdown.value = true
}

const selectReceiver = (user) => {
  selectedReceiver.value = user
  compose.value.receiver = user.username
  receiverSearch.value = ''
  showUserDropdown.value = false
}

const clearReceiver = () => {
  selectedReceiver.value = null
  compose.value.receiver = ''
  showUserDropdown.value = true
}

const selectFirstUser = () => {
  if (filteredUsers.value.length > 0) {
    selectReceiver(filteredUsers.value[hoverIndex.value])
  }
}

const moveHover = (direction) => {
  const list = filteredUsers.value
  if (list.length === 0) return
  let newIndex = hoverIndex.value + direction
  if (newIndex < 0) newIndex = list.length - 1
  if (newIndex >= list.length) newIndex = 0
  hoverIndex.value = newIndex
}

const handleClickOutside = (e) => {
  if (showUserDropdown.value && !e.target.closest('.receiver-select')) {
    showUserDropdown.value = false
  }
}

onMounted(() => {
  fetchMessages()
  loadQuickReplies()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const formatTime = (date) => {
  const d = new Date(date)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + '天前'
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const formatFullDate = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const stripHtml = (text) => text.replace(/<[^>]*>/g, '').replace(/\n/g, ' ')

const extractReportId = (content) => {
  const match = content && content.match(/\[report:(\d+)\]/)
  return match ? match[1] : null
}

const getTypeLabel = (type) => {
  const map = {
    SYSTEM: '系统公告',
    REPORT: '举报通知',
    ZINE: '刊物消息',
    CROWDFUNDING: '众筹消息',
    COLLABORATION: '合作消息',
    EVENT: '活动消息',
    FINANCE: '财务通知',
    MEMBERSHIP: '会员通知',
    SUBMISSION: '投稿通知',
    USER: '用户消息'
  }
  return map[type] || type
}

const formatContent = (text) => {
  return text
    .replace(/\[report:\d+\]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .split('\n').map(l => l ? `<p>${l}</p>` : '<br>').join('')
}

const setStatus = (s) => {
  currentStatus.value = s
  selected.value = null
  selectedId.value = null
  fetchMessages()
}

const setCategory = (c) => {
  currentCategory.value = c
  if (c !== 'SYSTEM_CATEGORY') currentType.value = 'all'
  selected.value = null
  selectedId.value = null
  fetchMessages()
}

const setType = (t) => {
  currentType.value = t
  selected.value = null
  selectedId.value = null
  fetchMessages()
}

const fetchMessages = async () => {
  listLoading.value = true
  try {
    const params = new URLSearchParams({ limit: 50 })
    if (currentStatus.value === 'archived') {
      params.set('archived', 'true')
    }
    if (currentCategory.value === 'SYSTEM_CATEGORY') {
      params.set('category', 'SYSTEM')
      if (currentType.value !== 'all') params.set('type', currentType.value)
    } else if (currentCategory.value === 'USER') {
      params.set('category', 'USER')
    } else if (currentCategory.value === 'all' && currentType.value !== 'all') {
      params.set('type', currentType.value)
    }

    const res = await api.get(`/messages?${params}`)
    messages.value = res.messages
    unreadCount.value = res.unreadCount || 0
    archivedCount.value = res.archivedCount || 0
    categoryUnreadCounts.value = res.categoryUnreadCounts || {}
    if (messages.value.length && !selectedId.value) selectMessage(messages.value[0])
  } catch (e) {
    console.error(e)
  } finally {
    listLoading.value = false
  }
}

const selectMessage = async (msg) => {
  selectedId.value = msg.id
  try {
    const res = await api.get(`/messages/${msg.id}`)
    selected.value = res.message
    if (!msg.isRead) {
      msg.isRead = true
      if (unreadCount.value > 0) unreadCount.value--
      if (categoryUnreadCounts.value.all > 0) categoryUnreadCounts.value.all--
      if (categoryUnreadCounts.value[selected.value.type] > 0) {
        categoryUnreadCounts.value[selected.value.type]--
      }
    }
  } catch (e) {}
}

const markAllRead = async () => {
  try {
    const params = new URLSearchParams()
    if (currentCategory.value === 'SYSTEM_CATEGORY') {
      params.set('category', 'SYSTEM')
      if (currentType.value !== 'all') params.set('type', currentType.value)
    } else if (currentCategory.value === 'USER') {
      params.set('category', 'USER')
    } else if (currentType.value !== 'all') {
      params.set('type', currentType.value)
    }
    const qs = params.toString()
    await api.put(`/messages/read-all${qs ? '?' + qs : ''}`)
    messages.value.forEach(m => { m.isRead = true })
    unreadCount.value = 0
    if (categoryUnreadCounts.value.all) categoryUnreadCounts.value.all = 0
    Object.keys(categoryUnreadCounts.value).forEach(k => {
      if (currentCategory.value === 'USER') {
        if (k === 'USER') categoryUnreadCounts.value[k] = 0
      } else if (currentCategory.value === 'SYSTEM_CATEGORY') {
        if (k !== 'all' && k !== 'USER') {
          if (currentType.value === 'all' || currentType.value === k) {
            categoryUnreadCounts.value[k] = 0
          }
        }
      } else if (currentCategory.value === 'all' && currentType.value !== 'all') {
        if (k === currentType.value) categoryUnreadCounts.value[k] = 0
      } else {
        categoryUnreadCounts.value[k] = 0
      }
    })
    showToast('已全部标记为已读', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const toggleArchive = async (msg, archive) => {
  try {
    if (archive) {
      await api.put(`/messages/${msg.id}/archive`)
    } else {
      await api.put(`/messages/${msg.id}/unarchive`)
    }
    if (selected.value && selected.value.id === msg.id) {
      selected.value.isArchived = archive
    }
    messages.value = messages.value.filter(m => m.id !== msg.id)
    if (archive) {
      archivedCount.value++
      if (!msg.isRead && unreadCount.value > 0) unreadCount.value--
    } else {
      archivedCount.value = Math.max(0, archivedCount.value - 1)
    }
    if (messages.value.length) {
      if (!selectedId.value || selectedId.value === msg.id) {
        selectMessage(messages.value[0])
      }
    } else {
      selected.value = null
      selectedId.value = null
    }
    showToast(archive ? '已归档' : '已取消归档', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const deleteMessage = async (id) => {
  if (!confirm('确定要删除这条消息吗？')) return
  try {
    await api.delete(`/messages/${id}`)
    messages.value = messages.value.filter(m => m.id !== id)
    if (selected.value && selected.value.id === id) {
      selected.value = null
      selectedId.value = null
    }
    if (messages.value.length && !selectedId.value) selectMessage(messages.value[0])
    showToast('已删除', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const replyToSender = () => {
  if (!selected.value) return
  const senderUser = allUsers.value.find(u => u.id === selected.value.senderId)
  if (senderUser) {
    selectedReceiver.value = senderUser
    receiverSearch.value = ''
  } else {
    selectedReceiver.value = selected.value.sender ? {
      id: selected.value.sender.id,
      username: selected.value.sender.username,
      avatar: selected.value.sender.avatar
    } : null
    compose.value.receiver = selected.value.sender?.username || ''
  }
  compose.value.title = selected.value.title?.startsWith('Re:') ? selected.value.title : `Re: ${selected.value.title}`
  compose.value.content = ''
  isReplying.value = true
  showQuickReplyPicker.value = false
  showCompose.value = true
}

const sendMessage = async () => {
  if (!selectedReceiver.value) {
    showToast('请先选择接收者', 'warning')
    return
  }
  sending.value = true
  try {
    await api.post('/messages', {
      receiverId: selectedReceiver.value.id,
      title: compose.value.title,
      content: compose.value.content
    })
    showToast('发送成功', 'success')
    showCompose.value = false
  } catch (e) {
    showToast(e.error || '发送失败', 'error')
  } finally {
    sending.value = false
  }
}

watch(showCompose, (v) => {
  if (v) {
    loadUsers()
  } else {
    compose.value = { receiver: '', title: '', content: '' }
    selectedReceiver.value = null
    receiverSearch.value = ''
    showUserDropdown.value = false
    hoverIndex.value = 0
    isReplying.value = false
    showQuickReplyPicker.value = false
  }
})
</script>

<style scoped>
.p-4 { padding: 16px; }
.text-danger { color: var(--danger); }
.messages-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 20px;
  min-height: 600px;
}
.message-list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.list-status-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-light);
}
.status-tab {
  flex: 1;
  padding: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  position: relative;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-bottom: 2px solid transparent;
}
.status-tab:hover { color: var(--text-primary); }
.status-tab.active {
  color: var(--accent);
  font-weight: 500;
  border-bottom-color: var(--accent);
}
.badge-count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--accent);
  color: #fff;
  border-radius: 9px;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}
.badge-count.muted {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}
.list-category-tabs {
  display: flex;
  gap: 4px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-light);
  flex-wrap: wrap;
}
.category-tab {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  border-radius: 100px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
}
.category-tab:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.category-tab.active {
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 500;
}
.cat-unread {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: var(--danger);
  color: #fff;
  border-radius: 8px;
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}
.list-sub-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
  flex-wrap: wrap;
  background: var(--bg-tertiary);
}
.sub-tab {
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-secondary);
  border-radius: 100px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
}
.sub-tab:hover { color: var(--text-primary); }
.sub-tab.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.sub-unread {
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  background: rgba(255,255,255,0.3);
  color: #fff;
  border-radius: 7px;
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.list-content {
  flex: 1;
  overflow-y: auto;
  max-height: 65vh;
}
.list-empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--text-tertiary);
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.empty-state-icon {
  font-size: 36px;
  margin-bottom: 8px;
}
.empty-state-text { margin-bottom: 0; font-size: 13px; }
.msg-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  align-items: flex-start;
}
.msg-item:hover { background: var(--bg-tertiary); }
.msg-item.active { background: var(--accent-light); }
.msg-item.unread {
  background: #fffef9;
}
.msg-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}
.msg-avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}
.msg-brief { flex: 1; min-width: 0; }
.msg-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.msg-sender { font-size: 13px; }
.msg-subject {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.msg-item.unread .msg-subject { color: var(--text-primary); }
.msg-preview {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.msg-item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.icon-btn {
  padding: 4px 6px;
  background: transparent;
  border: none;
  border-radius: 4px;
  opacity: 0.5;
  transition: all 0.15s;
  cursor: pointer;
  font-size: 14px;
}
.icon-btn:hover {
  opacity: 1;
  background: var(--bg-secondary);
}
.unread-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  align-self: center;
}
.message-detail {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.detail-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--text-tertiary);
}
.detail-header {
  padding: 24px 28px;
  border-bottom: 1px solid var(--border-light);
}
.detail-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.detail-title {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}
.archive-tag {
  padding: 3px 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 100px;
  font-size: 11px;
}
.detail-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.sender-info {
  display: flex;
  gap: 10px;
  align-items: center;
}
.detail-body {
  flex: 1;
  padding: 28px;
  overflow-y: auto;
  max-height: 45vh;
}
.msg-content {
  font-size: 15px;
  line-height: 2;
  color: var(--text-primary);
}
.msg-content :deep(p) { margin-bottom: 12px; }
.quick-reply-section {
  padding: 16px 28px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-tertiary);
}
.quick-reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.no-quick-replies {
  padding: 8px 0;
}
.quick-reply-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.quick-reply-tag {
  padding: 5px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 100px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.quick-reply-tag:hover {
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
}
.quick-reply-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  padding: 10px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
.detail-footer {
  padding: 16px 28px;
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
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
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}
.modal-body {
  padding: 24px;
  overflow-y: auto;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  margin-top: 8px;
  flex-shrink: 0;
}
.btn-link {
  background: transparent;
  border: none;
  color: var(--accent);
  cursor: pointer;
  padding: 2px 4px;
}
.btn-link:hover { text-decoration: underline; }
@media (max-width: 900px) {
  .messages-layout { grid-template-columns: 1fr; }
  .list-content { max-height: 40vh; }
}

.receiver-select {
  position: relative;
}
.receiver-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.selected-user {
  position: absolute;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
  z-index: 2;
}
.selected-user img {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
}
.remove-user {
  margin-left: 4px;
  padding: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: transparent;
  color: var(--accent);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}
.remove-user:hover {
  background: var(--accent);
  color: #fff;
}
.receiver-input {
  padding-left: 12px;
}
.receiver-input.has-selected {
  padding-left: 180px;
}
.user-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  max-height: 280px;
  overflow-y: auto;
  z-index: 100;
}
.user-dropdown.empty-dropdown {
  padding: 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}
.user-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--border-light);
}
.user-dropdown-item:last-child {
  border-bottom: none;
}
.user-dropdown-item:hover,
.user-dropdown-item.active {
  background: var(--bg-tertiary);
}
.user-dropdown-item img {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}
.user-info {
  flex: 1;
  min-width: 0;
}
.user-name {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
}
.user-bio {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

.qr-empty {
  padding: 16px;
}
.qr-list {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
  max-height: 240px;
  overflow-y: auto;
}
.qr-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-light);
}
.qr-item:last-child { border-bottom: none; }
.qr-item-main { flex: 1; min-width: 0; }
.qr-title { margin-bottom: 2px; }
.qr-content {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.qr-item-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.btn-xs {
  padding: 4px 10px;
  font-size: 12px;
}
.qr-form-wrap {
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
.qr-form-title {
  margin-bottom: 12px;
}
.flex { display: flex; }
.gap-sm { gap: 8px; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.text-center { text-align: center; }
</style>
