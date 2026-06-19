<template>
  <div class="auth-page">
    <div class="auth-card card">
      <router-link to="/" class="auth-logo">📖 ZineSpace</router-link>
      <h1 class="auth-title font-serif">欢迎回来</h1>
      <p class="auth-sub">登录后即可投稿、订阅刊物。</p>
      
      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label class="form-label">用户名或邮箱</label>
          <input
            v-model="form.identifier"
            type="text"
            class="form-input"
            placeholder="输入用户名或邮箱"
            required
            autofocus
          >
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="form.password"
            type="password"
            class="form-input"
            placeholder="输入密码"
            required
          >
        </div>
        <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="auth-divider">
        <span>或</span>
      </div>

      <div class="demo-accounts">
        <p class="demo-title">🎯 快速体验演示账号</p>
        <div class="demo-list">
          <button
            v-for="acc in demoAccounts"
            :key="acc.label"
            class="demo-item"
            @click="quickLogin(acc)"
          >
            <span class="demo-role">{{ acc.label }}</span>
            <span class="demo-account">{{ acc.identifier }} / 123456</span>
          </button>
        </div>
      </div>

      <div class="auth-footer">
        还没有账号？<router-link to="/register" class="text-accent">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const showToast = inject('showToast')

const demoAccounts = [
  { label: '管理员', identifier: 'admin' },
  { label: '普通用户', identifier: '墨香' }
]

const form = ref({ identifier: '', password: '' })
const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  try {
    await authStore.login(form.value.identifier, form.value.password)
    showToast('登录成功', 'success')
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (e) {
    showToast(e.error || '登录失败', 'error')
  } finally {
    loading.value = false
  }
}

const quickLogin = (acc) => {
  form.value.identifier = acc.identifier
  form.value.password = '123456'
  handleLogin()
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 64px - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
}
.auth-card {
  width: 100%;
  max-width: 440px;
  padding: 40px;
}
.auth-logo {
  display: block;
  text-align: center;
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 24px;
}
.auth-title {
  font-size: 28px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 8px;
}
.auth-sub {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 32px;
}
.auth-form { margin-bottom: 24px; }
.w-full { width: 100%; }
.auth-divider {
  position: relative;
  text-align: center;
  margin: 24px 0;
}
.auth-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border);
}
.auth-divider span {
  position: relative;
  padding: 0 12px;
  background: var(--bg-secondary);
  color: var(--text-tertiary);
  font-size: 12px;
}
.demo-accounts {}
.demo-title {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 14px;
}
.demo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.demo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}
.demo-item:hover {
  border-color: var(--accent);
  background: var(--accent-light);
}
.demo-role {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}
.demo-account {
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: monospace;
}
.auth-footer {
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--border-light);
}
</style>
