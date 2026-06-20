<template>
  <div class="container">
    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>

    <template v-else-if="competition">
      <div class="comp-header">
        <router-link to="/competitions" class="back-btn">← 返回比赛列表</router-link>
      </div>

      <div class="comp-hero card" :style="competition.coverImage ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${competition.coverImage})` } : {}">
        <div :class="['comp-hero-inner', { 'no-cover': !competition.coverImage }]">
          <div :class="['phase-badge', `phase-${competition.phase?.toLowerCase()}`]">{{ phaseLabel(competition.phase) }}</div>
          <h1 class="comp-hero-title font-serif">{{ competition.title }}</h1>
          <p class="comp-hero-desc">{{ competition.description }}</p>
          <div class="comp-hero-meta">
            <span>📅 {{ formatDate(competition.startDate) }} ~ {{ formatDate(competition.endDate) }}</span>
            <span>👥 {{ competition.entryCount || 0 }} 投稿</span>
            <span>👁 {{ competition.viewCount }} 浏览</span>
          </div>
          <div v-if="competition.prizes" class="comp-hero-prizes">
            <span>🎁 奖励：{{ competition.prizes }}</span>
          </div>
        </div>
      </div>

      <div class="comp-body">
        <div class="comp-main">
          <div v-if="competition.rules" class="section card" style="padding: 24px;">
            <h3 class="section-title">📜 比赛规则</h3>
            <div class="section-content text-content">{{ competition.rules }}</div>
          </div>

          <div v-if="competition.groups && competition.groups.length > 0" class="section card" style="padding: 24px;">
            <h3 class="section-title">📂 投稿分组</h3>
            <div class="groups-list">
              <div v-for="g in competition.groups" :key="g.id" class="group-item">
                <span class="group-name">{{ g.name }}</span>
                <span v-if="g.description" class="group-desc">{{ g.description }}</span>
              </div>
            </div>
          </div>

          <div v-if="userEntry" class="section card" style="padding: 24px;">
            <h3 class="section-title">📝 我的投稿</h3>
            <div class="entry-card">
              <div class="entry-header">
                <h4>{{ userEntry.title }}</h4>
                <span :class="['badge', entryStatusClass(userEntry.status)]">{{ entryStatusLabel(userEntry.status) }}</span>
              </div>
              <p class="entry-content">{{ userEntry.content }}</p>
              <div v-if="userEntry.rejectionReason" class="reject-notice">
                驳回原因：{{ userEntry.rejectionReason }}
              </div>
              <div v-if="['PENDING', 'REJECTED'].includes(userEntry.status)" class="entry-actions">
                <button class="btn btn-primary btn-sm" @click="showEntryForm = true">修改投稿</button>
              </div>
            </div>
          </div>

          <div v-if="competition.isAcceptingEntries && !userEntry && authStore?.isAuthenticated" class="section card" style="padding: 24px;">
            <div class="flex justify-between items-center mb">
              <h3 class="section-title" style="margin:0;padding:0;border:none">✍️ 提交投稿</h3>
            </div>
            <div class="entry-form">
              <div v-if="competition.groups && competition.groups.length > 0" class="form-group">
                <label class="form-label">选择分组</label>
                <select v-model="entryForm.groupId" class="form-select">
                  <option :value="null">不分组</option>
                  <option v-for="g in competition.groups" :key="g.id" :value="g.id">{{ g.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">作品标题 <span class="required">*</span></label>
                <input v-model="entryForm.title" class="form-input" placeholder="请输入作品标题">
              </div>
              <div class="form-group">
                <label class="form-label">作品内容 <span class="required">*</span></label>
                <textarea v-model="entryForm.content" class="form-textarea" rows="6" placeholder="详细介绍您的作品..."></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">图片链接（每行一个）</label>
                <textarea v-model="entryForm.imagesText" class="form-textarea" rows="3" placeholder="https://..."></textarea>
              </div>
              <button class="btn btn-primary" @click="submitEntry" :disabled="submitting">
                {{ submitting ? '提交中...' : '提交投稿' }}
              </button>
            </div>
          </div>

          <div v-if="!authStore?.isAuthenticated && competition.isAcceptingEntries" class="section card" style="padding: 24px; text-align: center;">
            <p style="margin-bottom: 12px;">登录后即可参与投稿</p>
            <router-link to="/login" class="btn btn-primary">去登录</router-link>
          </div>

          <div v-if="ranking.length > 0" class="section card" style="padding: 24px;">
            <h3 class="section-title">🏆 排行榜</h3>
            <div class="ranking-list">
              <div v-for="(r, index) in ranking" :key="r.id" :class="['ranking-item', { 'top-3': index < 3 }]">
                <div class="rank-num">{{ index < 3 ? ['🥇','🥈','🥉'][index] : index + 1 }}</div>
                <div class="rank-info">
                  <div class="rank-title">{{ r.title }}</div>
                  <div class="rank-user">
                    <img :src="r.user?.avatar" alt="">
                    <span>{{ r.user?.username }}</span>
                    <span v-if="r.group" class="rank-group">{{ r.group.name }}</span>
                  </div>
                </div>
                <div class="rank-score">
                  <span class="score-value">{{ r.avgScore }}</span>
                  <span class="score-label">分</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="comp-sidebar">
          <div class="sidebar-card card sticky" style="padding: 20px;">
            <h3 class="sidebar-title">比赛信息</h3>
            <div class="info-list">
              <div class="info-row">
                <span class="info-label">发起人</span>
                <span class="info-value">
                  <img :src="competition.creator?.avatar" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:4px;">
                  {{ competition.creator?.username }}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">分类</span>
                <span class="info-value">{{ competition.category }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">评分模式</span>
                <span class="info-value">{{ competition.scoringMode === 'AVERAGE' ? '平均分' : '总分' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">投稿数</span>
                <span class="info-value">{{ competition.entryCount || 0 }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">结果公示</span>
                <span class="info-value">{{ competition.isResultPublic ? '已公示' : '未公示' }}</span>
              </div>
            </div>
            <div v-if="isOwner || isAdmin" class="sidebar-actions" style="margin-top: 16px;">
              <router-link :to="`/competitions/${competition.id}/edit`" class="btn btn-outline btn-block btn-sm">编辑比赛</router-link>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showEntryForm && userEntry" class="modal-overlay" @click.self="showEntryForm = false">
        <div class="modal card" style="max-width: 600px;">
          <div class="modal-header">
            <h3 class="font-semibold">修改投稿</h3>
            <button class="btn btn-ghost btn-sm" @click="showEntryForm = false">✕</button>
          </div>
          <div class="modal-body">
            <div v-if="competition.groups && competition.groups.length > 0" class="form-group">
              <label class="form-label">选择分组</label>
              <select v-model="editForm.groupId" class="form-select">
                <option :value="null">不分组</option>
                <option v-for="g in competition.groups" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">作品标题 <span class="required">*</span></label>
              <input v-model="editForm.title" class="form-input" placeholder="请输入作品标题">
            </div>
            <div class="form-group">
              <label class="form-label">作品内容 <span class="required">*</span></label>
              <textarea v-model="editForm.content" class="form-textarea" rows="6" placeholder="详细介绍您的作品..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">图片链接（每行一个）</label>
              <textarea v-model="editForm.imagesText" class="form-textarea" rows="3" placeholder="https://..."></textarea>
            </div>
            <div class="modal-footer" style="padding:0;margin-top:16px;">
              <button class="btn btn-secondary" @click="showEntryForm = false">取消</button>
              <button class="btn btn-primary" @click="updateEntry" :disabled="submitting">
                {{ submitting ? '提交中...' : '保存修改' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <div class="empty-state-icon">😭</div>
      <div class="empty-state-text">比赛不存在</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const authStore = useAuthStore()
const showToast = inject('showToast')

const competition = ref(null)
const userEntry = ref(null)
const ranking = ref([])
const loading = ref(true)
const isOwner = ref(false)
const isAdmin = ref(false)
const submitting = ref(false)
const showEntryForm = ref(false)

const entryForm = ref({ groupId: null, title: '', content: '', imagesText: '' })
const editForm = ref({ groupId: null, title: '', content: '', imagesText: '' })

const formatDate = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const phaseLabel = (phase) => {
  const map = { UPCOMING: '即将开始', ONGOING: '进行中', ENDED: '已结束', COMPLETED: '已完赛' }
  return map[phase] || phase
}

const entryStatusLabel = (s) => ({ PENDING: '待审核', APPROVED: '已通过', REJECTED: '已驳回' }[s] || s)
const entryStatusClass = (s) => ({ PENDING: 'badge-orange', APPROVED: 'badge-green', REJECTED: 'badge-red' }[s] || 'badge-gray')

const fetchCompetition = async () => {
  loading.value = true
  try {
    const res = await api.get(`/competitions/${route.params.id}`)
    competition.value = res.competition
    userEntry.value = res.userEntry
    ranking.value = res.ranking || []
    isOwner.value = res.isOwner
    isAdmin.value = res.isAdmin

    if (userEntry.value) {
      editForm.value = {
        groupId: userEntry.value.groupId,
        title: userEntry.value.title,
        content: userEntry.value.content,
        imagesText: (userEntry.value.images || []).join('\n')
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const submitEntry = async () => {
  if (!entryForm.value.title.trim() || !entryForm.value.content.trim()) {
    showToast('请填写标题和内容', 'error')
    return
  }
  submitting.value = true
  try {
    const images = entryForm.value.imagesText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s)

    await api.post(`/competitions/${route.params.id}/entries`, {
      groupId: entryForm.value.groupId,
      title: entryForm.value.title,
      content: entryForm.value.content,
      images
    })
    showToast('投稿成功', 'success')
    fetchCompetition()
  } catch (e) {
    showToast(e.error || '投稿失败', 'error')
  } finally {
    submitting.value = false
  }
}

const updateEntry = async () => {
  if (!editForm.value.title.trim() || !editForm.value.content.trim()) {
    showToast('请填写标题和内容', 'error')
    return
  }
  submitting.value = true
  try {
    const images = editForm.value.imagesText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s)

    await api.put(`/competitions/${route.params.id}/entries`, {
      groupId: editForm.value.groupId,
      title: editForm.value.title,
      content: editForm.value.content,
      images
    })
    showEntryForm.value = false
    showToast('修改成功', 'success')
    fetchCompetition()
  } catch (e) {
    showToast(e.error || '修改失败', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchCompetition()
})
</script>

<style scoped>
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.mb { margin-bottom: 16px; }

.back-btn {
  display: inline-block;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s;
}
.back-btn:hover { color: var(--accent); }

.comp-hero {
  position: relative;
  background-size: cover;
  background-position: center;
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 32px;
}

.comp-hero-inner {
  padding: 40px 32px;
  color: #fff;
}

.comp-hero-inner.no-cover {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.phase-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
}
.phase-upcoming { background: rgba(24, 144, 255, 0.85); }
.phase-ongoing { background: rgba(82, 196, 26, 0.85); }
.phase-ended { background: rgba(0, 0, 0, 0.5); }
.phase-completed { background: rgba(114, 46, 209, 0.85); }

.comp-hero-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
}

.comp-hero-desc {
  font-size: 15px;
  opacity: 0.9;
  line-height: 1.6;
  margin-bottom: 16px;
  max-width: 680px;
}

.comp-hero-meta {
  display: flex;
  gap: 20px;
  font-size: 14px;
  opacity: 0.85;
  flex-wrap: wrap;
}

.comp-hero-prizes {
  margin-top: 12px;
  padding: 8px 14px;
  background: rgba(255, 215, 0, 0.25);
  border-radius: var(--radius-sm);
  display: inline-block;
  font-size: 14px;
}

.comp-body {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
  align-items: flex-start;
}

.section { margin-bottom: 24px; }
.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border-light);
}

.text-content {
  white-space: pre-wrap;
  line-height: 1.8;
  color: var(--text-secondary);
}

.groups-list { display: flex; flex-wrap: wrap; gap: 12px; }
.group-item {
  padding: 10px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
.group-name { font-weight: 500; }
.group-desc { font-size: 12px; color: var(--text-secondary); margin-left: 8px; }

.entry-card {
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.entry-header h4 { font-size: 16px; font-weight: 600; }
.entry-content {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}
.reject-notice {
  padding: 8px 12px;
  background: #fff1f0;
  color: #cf1322;
  font-size: 13px;
  border-radius: 4px;
  margin-bottom: 12px;
}
.entry-actions { margin-top: 8px; }

.entry-form { display: flex; flex-direction: column; gap: 16px; }

.ranking-list { display: flex; flex-direction: column; gap: 8px; }
.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}
.ranking-item.top-3 {
  background: linear-gradient(135deg, #fffbe6, #fff7e6);
}
.rank-num { font-size: 20px; min-width: 32px; text-align: center; }
.rank-info { flex: 1; }
.rank-title { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
.rank-user {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}
.rank-user img { width: 18px; height: 18px; border-radius: 50%; }
.rank-group {
  padding: 1px 6px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  font-size: 11px;
}
.rank-score { text-align: center; }
.score-value { font-size: 18px; font-weight: 700; color: var(--accent); }
.score-label { font-size: 11px; color: var(--text-tertiary); display: block; }

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.info-list { display: flex; flex-direction: column; gap: 10px; }
.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}
.info-label { color: var(--text-secondary); }
.info-value { color: var(--text-primary); font-weight: 500; }

.sticky { position: sticky; top: 80px; }
.btn-block { width: 100%; }

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.badge-gray { background: #f5f5f5; color: #8c8c8c; }
.badge-orange { background: #fff7e6; color: #d48806; }
.badge-green { background: #f6ffed; color: #52c41a; }
.badge-red { background: #fff1f0; color: #cf1322; }

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
}
.modal-body { padding: 24px; overflow-y: auto; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  margin-top: 8px;
}

@media (max-width: 900px) {
  .comp-body { grid-template-columns: 1fr; }
  .sticky { position: static; }
}
</style>
