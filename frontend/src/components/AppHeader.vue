<template>
  <header class="header">
    <div class="container header-inner">
      <router-link to="/" class="logo">
        <span class="logo-icon">📖</span>
        <span class="logo-text">ZineSpace</span>
      </router-link>
      
      <nav class="nav">
        <router-link to="/" class="nav-link" exact-active-class="active">首页</router-link>
        <router-link to="/zines" class="nav-link" active-class="active">刊物</router-link>
        <router-link to="/collections" class="nav-link" active-class="active">合集</router-link>
        <router-link to="/topics" class="nav-link" active-class="active">专题征稿</router-link>
        <router-link to="/collaborations" class="nav-link" active-class="active">创作者合作</router-link>
        <router-link to="/crowdfundings" class="nav-link" active-class="active">众筹预售</router-link>
        <router-link to="/swap" class="nav-link" active-class="active">交换市集</router-link>
        <router-link to="/interviews" class="nav-link" active-class="active">作者访谈</router-link>
        <router-link to="/calendar" class="nav-link" active-class="active">创作日历</router-link>
        <router-link to="/reading" class="nav-link" active-class="active">阅读社区</router-link>
        <router-link to="/exclusive-zines" class="nav-link" active-class="active">专属刊物</router-link>
        <router-link to="/early-access" class="nav-link" active-class="active">提前阅读</router-link>
        <template v-if="authStore.isAuthenticated">
          <router-link to="/submissions" class="nav-link" active-class="active">我的投稿</router-link>
          <router-link to="/topic-submissions" class="nav-link" active-class="active">专题投稿</router-link>
          <router-link to="/collaboration-applications" class="nav-link" active-class="active">合作申请</router-link>
          <router-link to="/my-collaborations" class="nav-link" active-class="active">我的招募</router-link>
          <router-link to="/crowdfunding-orders" class="nav-link" active-class="active">我的众筹</router-link>
          <router-link to="/my-swaps" class="nav-link" active-class="active">我的交换</router-link>
          <router-link to="/subscriptions" class="nav-link" active-class="active">订阅</router-link>
          <router-link to="/reading/checkin" class="nav-link" active-class="active">我的打卡</router-link>
          <router-link to="/reading/reviews/new" class="nav-link" active-class="active">写书评</router-link>
          <router-link to="/messages" class="nav-link messages-link" active-class="active">
            消息
            <span v-if="unreadCount > 0" class="badge-count">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </router-link>
          <router-link to="/report-center" class="nav-link" active-class="active">举报中心</router-link>
        </template>
      </nav>

      <div class="header-actions">
        <template v-if="authStore.isAuthenticated">
          <router-link to="/submissions/new" class="btn btn-primary btn-sm">
            <span>+</span> 投稿
          </router-link>
          <div class="user-menu" @click="menuOpen = !menuOpen">
            <img :src="authStore.user?.avatar" class="avatar" alt="">
            <div v-if="menuOpen" class="menu-dropdown" @click.stop>
              <router-link to="/profile" class="menu-item">
                <span>👤</span> 个人资料
              </router-link>
              <router-link to="/membership" class="menu-item">
                <span>👑</span> 会员中心
              </router-link>
              <router-link to="/growth" class="menu-item">
                <span>📈</span> 成长中心
              </router-link>
              <router-link v-if="authStore.isAdmin" to="/admin" class="menu-item">
                <span>⚙️</span> 后台管理
              </router-link>
              <router-link v-if="authStore.isAdmin" to="/editor-workbench" class="menu-item">
                <span>🎯</span> 编辑工作台
              </router-link>
              <router-link v-if="authStore.isAdmin" to="/admin/collections" class="menu-item">
                <span>📚</span> 合集管理
              </router-link>
              <router-link v-if="authStore.isAdmin" to="/admin/collaborations" class="menu-item">
                <span>🤝</span> 合作管理
              </router-link>
              <router-link v-if="authStore.isAdmin" to="/admin/crowdfundings" class="menu-item">
                <span>🎯</span> 众筹管理
              </router-link>
              <router-link v-if="authStore.isAdmin" to="/admin/swaps" class="menu-item">
                <span>🔄</span> 交换管理
              </router-link>
              <router-link v-if="authStore.isAdmin" to="/admin/reports" class="menu-item">
                <span>🛡️</span> 举报管理
              </router-link>
              <router-link v-if="authStore.isAdmin" to="/admin/calendar" class="menu-item">
                <span>📅</span> 日历管理
              </router-link>
              <router-link v-if="authStore.isAdmin" to="/admin/memberships" class="menu-item">
                <span>👑</span> 会员管理
              </router-link>
              <router-link v-if="authStore.isAdmin" to="/admin/interviews" class="menu-item">
                <span>💬</span> 访谈管理
              </router-link>
              <router-link v-if="authStore.isAdmin" to="/admin/reading" class="menu-item">
                <span>📚</span> 阅读社区管理
              </router-link>
              <div class="menu-divider"></div>
              <button class="menu-item menu-logout" @click="handleLogout">
                <span>🚪</span> 退出登录
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <router-link to="/login" class="btn btn-ghost btn-sm">登录</router-link>
          <router-link to="/register" class="btn btn-primary btn-sm">注册</router-link>
        </template>
      </div>
    </div>
    <div v-if="menuOpen" class="menu-overlay" @click="menuOpen = false"></div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const authStore = useAuthStore()
const router = useRouter()
const menuOpen = ref(false)
const unreadCount = ref(0)
let timer = null

const fetchUnread = async () => {
  if (!authStore.isAuthenticated) return
  try {
    const res = await api.get('/messages/unread')
    unreadCount.value = res.unreadCount
  } catch (e) {}
}

const handleLogout = () => {
  authStore.logout()
  menuOpen.value = false
  router.push('/login')
}

onMounted(() => {
  fetchUnread()
  timer = setInterval(fetchUnread, 30000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(250, 248, 245, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-light);
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  gap: 24px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}
.logo-icon { font-size: 24px; }
.nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  max-width: 600px;
  margin-left: 24px;
}
.nav-link {
  position: relative;
  padding: 8px 14px;
  font-size: 14px;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}
.nav-link:hover { color: var(--text-primary); background: var(--bg-tertiary); }
.nav-link.active { color: var(--accent); background: var(--accent-light); }
.messages-link { position: relative; }
.badge-count {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-menu { position: relative; cursor: pointer; }
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-light);
  transition: border-color 0.2s;
}
.user-menu:hover .avatar { border-color: var(--accent); }
.menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  padding: 8px;
  z-index: 101;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  transition: background 0.15s;
  text-align: left;
}
.menu-item:hover { background: var(--bg-tertiary); }
.menu-divider {
  height: 1px;
  background: var(--border-light);
  margin: 6px 0;
}
.menu-logout { color: var(--danger); }
.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
}
@media (max-width: 768px) {
  .nav { display: none; }
}
</style>
