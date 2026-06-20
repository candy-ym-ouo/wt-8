<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">交换匹配详情</h1>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>

    <div v-else-if="match" class="match-detail-wrap">
      <div class="match-detail card">
        <div class="match-status-row">
          <div class="match-status-info">
            <span class="match-status-badge" :class="'status-' + match.status.toLowerCase()">
              {{ getMatchStatusLabel(match.status) }}
            </span>
            <span class="match-score" :style="{ background: getScoreColor(match.matchScore) }">
              匹配度 {{ Math.round(match.matchScore) }}%
            </span>
          </div>
          <div class="match-date">
            发起于 {{ formatDate(match.createdAt) }}
            <span v-if="match.confirmedAt"> · 确认于 {{ formatDate(match.confirmedAt) }}</span>
            <span v-if="match.completedAt"> · 完成于 {{ formatDate(match.completedAt) }}</span>
          </div>
        </div>

        <div class="match-listings">
          <div class="match-listing my">
            <div class="listing-badge">我的需求</div>
            <router-link :to="`/swap/${myListing.id}`" class="listing-title">
              {{ myListing.title }}
            </router-link>
            <div class="listing-zines">
              <div class="zine-row">📖 有: {{ myListing.haveZineTitle || '未指定' }}</div>
              <div class="zine-row">🎯 求: {{ myListing.wantZineTitle || '未指定' }}</div>
            </div>
          </div>
          <div class="match-arrow">🤝</div>
          <div class="match-listing other">
            <div class="listing-badge other-badge">对方需求</div>
            <router-link :to="`/swap/${otherListing.id}`" class="listing-title">
              {{ otherListing.title }}
            </router-link>
            <div class="listing-zines">
              <div class="zine-row">📖 有: {{ otherListing.haveZineTitle || '未指定' }}</div>
              <div class="zine-row">🎯 求: {{ otherListing.wantZineTitle || '未指定' }}</div>
            </div>
            <div class="listing-user">
              <img :src="otherUser?.avatar" alt="">
              <span>{{ otherUser?.username }}</span>
            </div>
          </div>
        </div>

        <div class="match-actions">
          <template v-if="match.status === 'PENDING'">
            <button v-if="!isInitiator && !match.responderConfirmed" class="btn btn-primary" @click="confirm">
              ✅ 确认交换
            </button>
            <button v-if="!isInitiator && !match.responderConfirmed" class="btn btn-outline" @click="reject">
              ❌ 拒绝
            </button>
            <button v-if="isInitiator && match.initiatorConfirmed" class="btn btn-outline" disabled>
              已确认，等待对方确认
            </button>
            <button v-if="!isInitiator && match.responderConfirmed" class="btn btn-outline" disabled>
              已确认，等待对方确认
            </button>
            <button class="btn btn-ghost" @click="cancel">
              取消匹配
            </button>
          </template>
          <template v-if="match.status === 'CONFIRMED'">
            <button class="btn btn-primary" @click="complete">
              🎉 标记交换完成
            </button>
            <button class="btn btn-ghost" @click="cancel">
              取消匹配
            </button>
          </template>
          <template v-if="match.status === 'COMPLETED'">
            <span class="completed-text">🎉 恭喜！交换已顺利完成</span>
          </template>
        </div>
      </div>

      <div class="chat-section card">
        <h3 class="chat-title">💬 私信洽谈</h3>
        <div ref="messagesContainer" class="messages-container">
          <div v-if="messages.length === 0" class="empty-messages">
            <div class="empty-messages-icon">💬</div>
            <div>还没有消息，开始和对方沟通吧！</div>
          </div>
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="['message', msg.senderId === authStore.user?.id ? 'mine' : 'other']"
          >
            <img v-if="msg.senderId !== authStore.user?.id" :src="msg.sender?.avatar" class="msg-avatar" alt="">
            <div class="msg-content">
              <div v-if="msg.senderId !== authStore.user?.id" class="msg-sender">{{ msg.sender?.username }}</div>
              <div class="msg-bubble">{{ msg.content }}</div>
              <div class="msg-time">{{ formatTime(msg.createdAt) }}</div>
            </div>
          </div>
        </div>
        <div v-if="canSendMessage" class="chat-input">
          <textarea
            v-model="newMessage"
            rows="2"
            class="form-input"
            placeholder="输入消息，按 Enter 发送..."
            @keydown.enter.exact.prevent="sendMessage"
          ></textarea>
          <button class="btn btn-primary" :disabled="!newMessage.trim() || sending" @click="sendMessage">
            {{ sending ? '发送中...' : '发送' }}
          </button>
        </div>
        <div v-else class="chat-disabled">
          此匹配已关闭，无法继续发送消息
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const authStore = useAuthStore()
const loading = ref(false)
const match = ref(null)
const messages = ref([])
const myListing = ref(null)
const otherListing = ref(null)
const otherUser = ref(null)
const isInitiator = ref(false)
const newMessage = ref('')
const sending = ref(false)
const messagesContainer = ref(null)

const canSendMessage = ref(false)

const formatDate = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const formatTime = (d) => {
  const date = new Date(d)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getMatchStatusLabel = (s) => {
  const labels = {
    PENDING: '待确认', CONFIRMED: '已确认', COMPLETED: '已完成',
    REJECTED: '已拒绝', CANCELLED: '已取消'
  }
  return labels[s] || s
}

const getScoreColor = (score) => {
  if (score >= 70) return 'linear-gradient(135deg, #11998e, #38ef7d)'
  if (score >= 40) return 'linear-gradient(135deg, #f093fb, #f5576c)'
  return 'linear-gradient(135deg, #667eea, #764ba2)'
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await api.get(`/swap-matches/${route.params.id}`)
    match.value = res.match
    messages.value = res.messages
    myListing.value = res.myListing
    otherListing.value = res.otherListing
    otherUser.value = res.otherUser
    isInitiator.value = res.isInitiator
    canSendMessage.value = !['REJECTED', 'CANCELLED'].includes(res.match.status)
    scrollToBottom()
  } catch (e) {
    alert(e.error || '加载失败')
  } finally {
    loading.value = false
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  sending.value = true
  try {
    const res = await api.post(`/swap-matches/${route.params.id}/messages`, {
      content: newMessage.value.trim()
    })
    messages.value.push(res.message)
    newMessage.value = ''
    scrollToBottom()
  } catch (e) {
    alert(e.error || '发送失败')
  } finally {
    sending.value = false
  }
}

const confirm = async () => {
  if (!confirm('确认接受此交换匹配吗？')) return
  try {
    const res = await api.post(`/swap-matches/${route.params.id}/confirm`)
    alert(res.message)
    loadData()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

const reject = async () => {
  if (!confirm('确定拒绝此交换匹配吗？')) return
  try {
    const res = await api.post(`/swap-matches/${route.params.id}/reject`)
    alert(res.message)
    loadData()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

const cancel = async () => {
  if (!confirm('确定取消此匹配吗？')) return
  try {
    const res = await api.post(`/swap-matches/${route.params.id}/cancel`)
    alert(res.message)
    loadData()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

const complete = async () => {
  if (!confirm('确认标记交换已完成吗？标记后需求状态也会更新为已完成')) return
  try {
    const res = await api.post(`/swap-matches/${route.params.id}/complete`)
    alert(res.message)
    loadData()
  } catch (e) {
    alert(e.error || '操作失败')
  }
}

let pollTimer = null
onMounted(() => {
  loadData()
  pollTimer = setInterval(loadData, 10000)
})

import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.match-detail-wrap {
  max-width: 900px;
  margin: 0 auto;
}

.match-detail {
  padding: 24px 28px;
  margin-bottom: 20px;
}

.match-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
  flex-wrap: wrap;
  gap: 10px;
}

.match-status-info {
  display: flex;
  gap: 10px;
  align-items: center;
}

.match-status-badge {
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
}

.status-pending { background: #fff3cd; color: #856404; }
.status-confirmed { background: #d4edda; color: #155724; }
.status-completed { background: #d1ecf1; color: #0c5460; }
.status-rejected { background: #f8d7da; color: #721c24; }
.status-cancelled { background: #e9ecef; color: #495057; }

.match-score {
  padding: 6px 14px;
  border-radius: 100px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.match-date {
  font-size: 13px;
  color: var(--text-secondary);
}

.match-listings {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: stretch;
  margin-bottom: 20px;
}

.match-listing {
  padding: 16px 18px;
  border-radius: var(--radius);
  background: var(--bg-tertiary);
  border-left: 3px solid var(--accent);
}

.match-listing.other {
  border-left-color: #c2185b;
}

.listing-badge {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 4px;
  font-weight: 600;
  margin-bottom: 8px;
}

.listing-badge.other-badge {
  background: #fce4ec;
  color: #c2185b;
}

.listing-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.listing-title:hover {
  color: var(--accent);
}

.listing-zines {
  font-size: 13px;
  color: var(--text-secondary);
}

.zine-row {
  margin-bottom: 4px;
}

.listing-user {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-light);
  font-size: 13px;
  color: var(--text-secondary);
}

.listing-user img {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.match-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: var(--text-tertiary);
}

.match-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.completed-text {
  font-size: 15px;
  font-weight: 600;
  color: #155724;
}

.chat-section {
  padding: 20px 24px;
}

.chat-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.messages-container {
  height: 400px;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius);
  margin-bottom: 16px;
}

.empty-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  font-size: 14px;
  gap: 8px;
}

.empty-messages-icon {
  font-size: 48px;
  opacity: 0.3;
}

.message {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.message.mine {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--bg-primary);
}

.msg-content {
  max-width: 70%;
}

.msg-sender {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.message.mine .msg-content {
  text-align: right;
}

.msg-bubble {
  display: inline-block;
  padding: 10px 14px;
  border-radius: var(--radius);
  background: var(--bg-primary);
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.message.mine .msg-bubble {
  background: var(--accent);
  color: #fff;
}

.msg-time {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.chat-input {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.chat-input .form-input {
  flex: 1;
  resize: none;
  font-family: inherit;
}

.form-input {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.chat-disabled {
  text-align: center;
  padding: 20px;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  border-radius: var(--radius);
  font-size: 14px;
}

@media (max-width: 768px) {
  .match-listings {
    grid-template-columns: 1fr;
  }
  .match-arrow {
    transform: rotate(90deg);
  }
}
</style>
