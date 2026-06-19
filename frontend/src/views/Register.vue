<template>
  <div class="auth-page">
    <div class="auth-card card">
      <router-link to="/" class="auth-logo">📖 ZineSpace</router-link>
      <h1 class="auth-title font-serif">创建账号</h1>
      <p class="auth-sub">加入我们，分享你的创作。</p>
      
      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input
            v-model="form.username"
            type="text"
            class="form-input"
            placeholder="给自己起个名字"
            minlength="2"
            maxlength="20"
            required
            autofocus
          >
        </div>
        <div class="form-group">
          <label class="form-label">邮箱</label>
          <input
            v-model="form.email"
            type="email"
            class="form-input"
            placeholder="your@email.com"
            required
          >
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="form.password"
            type="password"
            class="form-input"
            placeholder="至少 6 位"
            minlength="6"
            required
          >
        </div>
        <div class="form-group">
          <label class="form-label">个人简介 <span class="text-tertiary">(可选)</span></label>
          <textarea
            v-model="form.bio"
            class="form-textarea"
            placeholder="简单介绍一下自己..."
            rows="3"
            maxlength="200"
          ></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="loading">
          {{ loading ? '注册中...' : '注册账号' }}
        </button>
      </form>

      <div class="auth-footer">
        已有账号？<router-link to="/login" class="text-accent">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const showToast = inject('showToast')

const form = ref({
  username: '',
  email: '',
  password: '',
  bio: ''
})
const loading = ref(false)

const handleRegister = async () => {
  loading.value = true
  try {
    await authStore.register(form.value)
    showToast('注册成功，欢迎加入！', 'success')
    router.push('/')
  } catch (e) {
    showToast(e.error || '注册失败', 'error')
  } finally {
    loading.value = false
  }
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
  max-width: 480px;
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
.w-full { width: 100%; }
.auth-footer {
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--border-light);
}
</style>
