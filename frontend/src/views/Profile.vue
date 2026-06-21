<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">个人资料</h1>
      <p class="page-subtitle">管理你的账号信息</p>
    </div>

    <div class="profile-layout">
      <div class="profile-card card">
        <div class="profile-header">
          <div class="avatar-wrap">
            <img :src="authStore.user?.avatar" class="profile-avatar" alt="">
          </div>
          <div class="profile-basic">
            <h2 class="profile-name font-serif">{{ authStore.user?.username }}</h2>
            <p class="profile-email text-sm text-muted">{{ authStore.user?.email }}</p>
            <span :class="['role-badge', authStore.isAdmin ? 'admin' : '']">
              {{ authStore.isAdmin ? '⚙️ 管理员' : '👤 普通用户' }}
            </span>
          </div>
        </div>

        <div class="profile-stats">
          <div class="stat-item">
            <div class="stat-label">注册时间</div>
            <div class="stat-value text-sm">{{ formatDate(authStore.user?.createdAt) }}</div>
          </div>
          <div class="stat-item" v-if="subStats">
            <div class="stat-label">刊物订阅</div>
            <div class="stat-value text-sm">
              <span class="stat-accent">{{ subStats.totalSubs || 0 }}</span>
              <span class="stat-detail" v-if="subStats.totalSubs > 0">
                (免费 {{ subStats.freeSubs }} / 标准 {{ subStats.standardSubs }} / 高级 {{ subStats.premiumSubs }})
              </span>
            </div>
          </div>
          <div class="stat-item" v-if="subStats">
            <div class="stat-label">关注作者</div>
            <div class="stat-value text-sm stat-accent">{{ subStats.followedAuthors || 0 }}</div>
          </div>
        </div>

        <div class="profile-quick-links" v-if="subStats">
          <router-link to="/subscriptions" class="quick-link card">
            <span class="quick-icon">📖</span>
            <span class="quick-label">我的订阅</span>
          </router-link>
          <router-link to="/subscriptions" class="quick-link card" @click="goToTab('updates')">
            <span class="quick-icon">🔔</span>
            <span class="quick-label">系列更新</span>
          </router-link>
          <router-link to="/subscriptions" class="quick-link card" @click="goToTab('feed')">
            <span class="quick-icon">📡</span>
            <span class="quick-label">作者动态</span>
          </router-link>
        </div>
      </div>

      <div class="edit-card card">
        <h3 class="card-title">编辑资料</h3>
        
        <form @submit.prevent="saveProfile">
          <div class="form-group">
            <label class="form-label">头像链接</label>
            <input
              v-model="form.avatar"
              type="text"
              class="form-input"
              placeholder="https://..."
            >
            <div class="mt-sm">
              <span class="text-xs text-muted">当前预览：</span>
              <img v-if="form.avatar" :src="form.avatar" style="width: 48px; height: 48px; border-radius: 50%; vertical-align: middle; margin-left: 8px; background: #eee;">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">个人简介</label>
            <textarea
              v-model="form.bio"
              class="form-textarea"
              rows="4"
              maxlength="200"
              placeholder="介绍一下自己..."
            ></textarea>
            <div class="form-hint text-xs text-tertiary mt-sm">
              {{ (form.bio || '').length }} / 200
            </div>
          </div>

          <div class="submit-row">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? '保存中...' : '保存修改' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const authStore = useAuthStore()
const router = useRouter()
const showToast = inject('showToast')

const form = ref({ avatar: '', bio: '' })
const saving = ref(false)
const subStats = ref(null)

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const saveProfile = async () => {
  saving.value = true
  try {
    await authStore.updateProfile({
      bio: form.value.bio,
      avatar: form.value.avatar || undefined
    })
    showToast('保存成功', 'success')
  } catch (e) {
    showToast(e.error || '保存失败', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await authStore.fetchProfile()
  } catch (e) {}
  form.value.avatar = authStore.user?.avatar || ''
  form.value.bio = authStore.user?.bio || ''
  try {
    const res = await api.get('/subscriptions/stats')
    subStats.value = res
  } catch (e) {}
})

const goToTab = (tab) => {
  router.push({ path: '/subscriptions', query: { tab } })
}
</script>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  align-items: start;
}
.profile-card { padding: 28px; }
.profile-header {
  display: flex;
  gap: 18px;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
}
.avatar-wrap {
  width: 80px;
  height: 80px;
  padding: 3px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #ffb89b);
}
.profile-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #fff;
  display: block;
}
.profile-basic { flex: 1; min-width: 0; }
.profile-name {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 4px;
}
.profile-email { margin-bottom: 8px; }
.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
}
.role-badge.admin {
  background: var(--accent-light);
  color: var(--accent);
}
.profile-stats { display: flex; flex-direction: column; gap: 12px; }
.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
}
.stat-label { font-size: 13px; color: var(--text-secondary); }
.stat-value { font-weight: 500; }
.stat-accent { color: var(--accent); font-weight: 600; }
.stat-detail { font-size: 11px; color: var(--text-tertiary); margin-left: 4px; }
.profile-quick-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 16px;
}
.quick-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  text-align: center;
  text-decoration: none;
  color: var(--text-primary);
  transition: all 0.2s;
}
.quick-link:hover { transform: translateY(-2px); }
.quick-icon { font-size: 22px; }
.quick-label { font-size: 12px; font-weight: 500; }
.edit-card { padding: 28px; }
.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}
.form-hint {}
.submit-row {
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  margin-top: 8px;
}
@media (max-width: 800px) {
  .profile-layout { grid-template-columns: 1fr; }
}
</style>
