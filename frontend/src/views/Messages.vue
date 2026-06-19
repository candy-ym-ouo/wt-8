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
            <label class="form-label">接收者用户名</label>
            <input v-model="compose.receiver" class="form-input" placeholder="输入用户名" required>
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
import { ref, onMounted, inject, watch } from 'vue'
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
  compose.value = {
    receiver: selected.value.sender?.username || '',
    title: selected.value.title?.startsWith('Re:') ? selected.value.title : `Re: ${selected.value.title}`,
    content: ''
  }
  showCompose.value = true
}

const sendMessage = async () => {
  sending.value = true
  try {
    const users = await api.get('/admin/users?limit=100').catch(() => ({ users: [] }))
    const userList = users.users || []
    const receiver = userList.find(u => u.username === compose.value.receiver)
    if (!receiver) throw { error: '找不到该用户' }
    await api.post('/messages', {
      receiverId: receiver.id,
      title: compose.value.title,
      content: compose.value.content
    })
    showToast('发送成功', 'success')
    showCompose.value = false
    compose.value = { receiver: '', title: '', content: '' }
  } catch (e) {
    showToast(e.error || '发送失败', 'error')
  } finally {
    sending.value = false
  }
}

watch(showCompose, (v) => {
  if (!v) compose.value = { receiver: '', title: '', content: '' }
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
</style>
