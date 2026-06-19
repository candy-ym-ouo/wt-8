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
          :disabled="unreadCount === 0"
          @click="markAllRead"
        >
          全部已读
        </button>
      </div>
    </div>

    <div class="messages-layout">
      <div class="message-list card">
        <div class="list-tabs">
          <button
            v-for="t in typeTabs"
            :key="t.value"
            :class="['list-tab', { active: currentType === t.value }]"
            @click="setType(t.value)"
          >
            {{ t.label }}
            <span v-if="t.value === 'all' && unreadCount > 0" class="unread-dot"></span>
          </button>
        </div>

        <div v-if="listLoading" class="list-empty p-4">
          <div class="empty-state-icon">⏳</div>
          <div class="text-sm text-tertiary">加载中...</div>
        </div>
        <div v-else-if="messages.length === 0" class="list-empty">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text text-sm">暂无消息</div>
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
            <span v-if="!msg.isRead" class="unread-indicator"></span>
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
            <h3 class="detail-title font-serif">{{ selected.title }}</h3>
            <div class="detail-meta">
              <div class="sender-info">
                <img :src="selected.sender?.avatar" class="msg-avatar-sm">
                <div>
                  <div class="font-medium text-sm">{{ selected.sender?.username || '系统消息' }}</div>
                  <div class="text-xs text-tertiary">{{ selected.type === 'SYSTEM' ? '系统通知' : '用户消息' }}</div>
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
          <div class="detail-footer">
            <button
              v-if="selected.type === 'USER' && selected.senderId !== authStore.user?.id"
              class="btn btn-secondary btn-sm"
              @click="replyToSender"
            >
              ↩ 回复
            </button>
            <button class="btn btn-ghost btn-sm" @click="deleteMessage(selected.id)">
              🗑 删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCompose" class="modal-overlay" @click.self="showCompose = false">
      <div class="modal card" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="font-semibold">发送消息</h3>
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
                  <button type="button" class="remove-user" @click="clearReceiver">✕</button>
                </span>
                <input
                  v-model="receiverSearch"
                  class="form-input receiver-input"
                  :class="{ 'has-selected': selectedReceiver }"
                  :placeholder="selectedReceiver ? '' : '搜索用户名或从下方选择'"
                  @input="onReceiverSearch"
                  @focus="showUserDropdown = true"
                  @keydown.enter.prevent="selectFirstUser"
                  @keydown.arrow.down.prevent="moveHover(1)"
                  @keydown.arrow.up.prevent="moveHover(-1)"
                >
              </div>
              <div v-if="showUserDropdown && filteredUsers.length > 0" class="user-dropdown">
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
              <div v-if="showUserDropdown && filteredUsers.length === 0 && receiverSearch" class="user-dropdown empty-dropdown">
                没有找到匹配的用户
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">标题</label>
            <input v-model="compose.title" class="form-input" placeholder="消息标题" maxlength="50" required>
          </div>
          <div class="form-group">
            <label class="form-label">内容</label>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const authStore = useAuthStore()
const showToast = inject('showToast')

const typeTabs = [
  { label: '全部', value: 'all' },
  { label: '系统通知', value: 'SYSTEM' },
  { label: '用户私信', value: 'USER' }
]

const messages = ref([])
const selected = ref(null)
const selectedId = ref(null)
const currentType = ref('all')
const listLoading = ref(false)
const unreadCount = ref(0)
const showCompose = ref(false)
const sending = ref(false)
const compose = ref({ receiver: '', title: '', content: '' })

const allUsers = ref([])
const receiverSearch = ref('')
const showUserDropdown = ref(false)
const selectedReceiver = ref(null)
const hoverIndex = ref(0)
const usersLoading = ref(false)

const filteredUsers = computed(() => {
  const currentUserId = authStore.user?.id
  let list = allUsers.value.filter(u => u.id !== currentUserId)
  if (receiverSearch.value.trim()) {
    const q = receiverSearch.value.toLowerCase()
    list = list.filter(u => u.username.toLowerCase().includes(q))
  }
  return list.slice(0, 10)
})

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

const formatContent = (text) => {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .split('\n').map(l => l ? `<p>${l}</p>` : '<br>').join('')
}

const setType = (t) => {
  currentType.value = t
  fetchMessages()
}

const fetchMessages = async () => {
  listLoading.value = true
  try {
    const params = new URLSearchParams({ limit: 50 })
    if (currentType.value !== 'all') params.set('type', currentType.value)
    const res = await api.get(`/messages?${params}`)
    messages.value = res.messages
    unreadCount.value = res.unreadCount
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
    }
  } catch (e) {}
}

const markAllRead = async () => {
  try {
    await api.put('/messages/read-all')
    messages.value.forEach(m => m.isRead = true)
    unreadCount.value = 0
    showToast('已全部标记为已读', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const deleteMessage = async (id) => {
  if (!confirm('确定要删除这条消息吗？')) return
  try {
    await api.delete(`/messages/${id}`)
    messages.value = messages.value.filter(m => m.id !== id)
    selected.value = null
    selectedId.value = null
    if (messages.value.length) selectMessage(messages.value[0])
    showToast('已删除', 'success')
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const replyToSender = () => {
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
  }
})

onMounted(() => fetchMessages())
</script>

<style scoped>
.p-4 { padding: 16px; }
.messages-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 20px;
  min-height: 600px;
}
.message-list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.list-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-light);
}
.list-tab {
  flex: 1;
  padding: 14px;
  font-size: 13px;
  color: var(--text-secondary);
  position: relative;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.list-tab:hover { color: var(--text-primary); }
.list-tab.active {
  color: var(--accent);
  font-weight: 500;
  background: var(--accent-light);
}
.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
}
.list-content {
  flex: 1;
  overflow-y: auto;
  max-height: 70vh;
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
.detail-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 16px;
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
  max-height: 55vh;
}
.msg-content {
  font-size: 15px;
  line-height: 2;
  color: var(--text-primary);
}
.msg-content :deep(p) { margin-bottom: 12px; }
.detail-footer {
  padding: 16px 28px;
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: 10px;
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
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-light);
}
.modal-body {
  padding: 24px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  margin-top: 8px;
}
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
</style>
