<template>
  <div class="container">
    <div class="page-header">
      <div class="flex items-center gap-sm">
        <router-link :to="isEdit ? `/competitions/${competitionId}` : '/competitions'" class="back-btn">
          ← 返回
        </router-link>
        <h1 class="page-title">{{ isEdit ? '编辑比赛' : '发起创作比赛' }}</h1>
      </div>
      <p class="page-subtitle">{{ isEdit ? '修改比赛信息' : '创建一个新的创作比赛，邀请创作者参与' }}</p>
    </div>

    <div class="form-layout">
      <div class="form-main card">
        <div class="form-section">
          <h3 class="section-title">基本信息</h3>

          <div class="form-group">
            <label class="form-label">比赛标题 <span class="required">*</span></label>
            <input v-model="form.title" class="form-input" placeholder="请输入比赛标题">
          </div>

          <div class="form-group">
            <label class="form-label">比赛分类 <span class="required">*</span></label>
            <div class="category-grid">
              <div
                v-for="cat in categories"
                :key="cat.id"
                :class="['category-item', { active: form.category === cat.id }]"
                @click="form.category = cat.id"
              >
                <span class="cat-icon">{{ cat.icon }}</span>
                <span class="cat-name">{{ cat.name }}</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">封面图片</label>
            <input v-model="form.coverImage" class="form-input" placeholder="请输入封面图片URL">
          </div>

          <div class="form-group">
            <label class="form-label">比赛描述 <span class="required">*</span></label>
            <textarea v-model="form.description" class="form-textarea" rows="6" placeholder="详细介绍比赛..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">标签</label>
            <input v-model="tagsInput" class="form-input" placeholder="多个标签用逗号分隔，如：创作,插画,比赛">
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">比赛设置</h3>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">开始时间 <span class="required">*</span></label>
              <input v-model="form.startDate" type="datetime-local" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">截止时间 <span class="required">*</span></label>
              <input v-model="form.endDate" type="datetime-local" class="form-input">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">结果公布时间</label>
              <input v-model="form.resultDate" type="datetime-local" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">最大投稿数</label>
              <input v-model.number="form.maxEntries" type="number" class="form-input" placeholder="0 为不限" min="0">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">评分模式</label>
              <select v-model="form.scoringMode" class="form-select">
                <option value="AVERAGE">平均分</option>
                <option value="SUM">总分</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">评委（用户ID，逗号分隔）</label>
              <input v-model="judgesInput" class="form-input" placeholder="如：1,2,3">
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">比赛规则与奖励</h3>

          <div class="form-group">
            <label class="form-label">比赛规则</label>
            <textarea v-model="form.rules" class="form-textarea" rows="5" placeholder="详细说明比赛规则、投稿要求、评审标准等..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">奖励说明</label>
            <textarea v-model="form.prizes" class="form-textarea" rows="3" placeholder="一等奖、二等奖、三等奖等奖励内容..."></textarea>
          </div>
        </div>

        <div class="form-section">
          <div class="section-header">
            <h3 class="section-title">投稿分组</h3>
            <button class="btn btn-primary btn-sm" @click="addGroup">+ 添加分组</button>
          </div>

          <div v-if="form.groups.length === 0" class="empty-tiers">
            <div class="empty-icon">📂</div>
            <p>暂不分组，所有投稿统一评审</p>
          </div>

          <div v-else class="groups-editor">
            <div v-for="(group, index) in form.groups" :key="index" class="group-editor card">
              <div class="group-editor-header">
                <span class="group-order">分组 {{ index + 1 }}</span>
                <button class="btn btn-ghost btn-sm danger-btn" @click="removeGroup(index)">删除</button>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">分组名称 <span class="required">*</span></label>
                  <input v-model="group.name" class="form-input" placeholder="如：小说组、插画组">
                </div>
                <div class="form-group">
                  <label class="form-label">排序</label>
                  <input v-model.number="group.sortOrder" type="number" class="form-input" placeholder="0" style="width: 120px;">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">分组描述</label>
                <textarea v-model="group.description" class="form-textarea" rows="2" placeholder="简要描述该分组"></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="form-sidebar">
        <div class="sidebar-card card sticky">
          <h3 class="sidebar-title">操作</h3>

          <button class="btn btn-primary btn-block btn-lg" @click="submitForm" :disabled="submitting">
            {{ submitting ? '提交中...' : (isEdit ? '保存修改' : '提交审核') }}
          </button>

          <p class="sidebar-tip">
            {{ isEdit ? '修改后将重新提交审核' : '提交后管理员将审核您的比赛，审核通过后自动发布' }}
          </p>

          <button
            v-if="isAdmin && isEdit"
            class="btn btn-success btn-block"
            @click="saveDraft"
            :disabled="submitting"
          >
            保存为草稿
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const showToast = inject('showToast')

const competitionId = computed(() => route.params.id)
const isEdit = computed(() => !!route.params.id)
const isAdmin = computed(() => authStore.user?.role === 'ADMIN')

const submitting = ref(false)
const tagsInput = ref('')
const judgesInput = ref('')

const categories = [
  { id: 'CREATION', name: '创作', icon: '✍️' },
  { id: 'ILLUSTRATION', name: '插画', icon: '🎨' },
  { id: 'PHOTOGRAPHY', name: '摄影', icon: '📷' },
  { id: 'WRITING', name: '文学', icon: '📝' },
  { id: 'DESIGN', name: '设计', icon: '🖌️' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const form = ref({
  title: '',
  description: '',
  coverImage: '',
  category: 'CREATION',
  rules: '',
  prizes: '',
  startDate: '',
  endDate: '',
  resultDate: '',
  maxEntries: 0,
  scoringMode: 'AVERAGE',
  groups: []
})

const addGroup = () => {
  form.value.groups.push({
    name: '',
    description: '',
    sortOrder: form.value.groups.length
  })
}

const removeGroup = (index) => {
  if (confirm('确定删除该分组吗？')) {
    form.value.groups.splice(index, 1)
  }
}

const formatDateTimeLocal = (d) => {
  const date = new Date(d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const fetchCompetition = async () => {
  try {
    const res = await api.get(`/competitions/${competitionId.value}`)
    const c = res.competition
    form.value = {
      title: c.title,
      description: c.description,
      coverImage: c.coverImage || '',
      category: c.category,
      rules: c.rules || '',
      prizes: c.prizes || '',
      startDate: c.startDate ? formatDateTimeLocal(c.startDate) : '',
      endDate: c.endDate ? formatDateTimeLocal(c.endDate) : '',
      resultDate: c.resultDate ? formatDateTimeLocal(c.resultDate) : '',
      maxEntries: c.maxEntries || 0,
      scoringMode: c.scoringMode || 'AVERAGE',
      groups: []
    }
    tagsInput.value = c.tags?.join(', ') || ''
    judgesInput.value = c.judges?.join(', ') || ''

    if (res.competition.groups && res.competition.groups.length > 0) {
      form.value.groups = res.competition.groups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description || '',
        sortOrder: g.sortOrder
      }))
    }
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  }
}

const validateForm = () => {
  if (!form.value.title.trim()) {
    showToast('请输入比赛标题', 'error')
    return false
  }
  if (!form.value.description.trim()) {
    showToast('请输入比赛描述', 'error')
    return false
  }
  if (!form.value.startDate || !form.value.endDate) {
    showToast('请设置比赛时间', 'error')
    return false
  }
  return true
}

const buildSubmitData = () => {
  const tags = tagsInput.value
    .split(/[,，]/)
    .map(t => t.trim())
    .filter(t => t)

  const judges = judgesInput.value
    .split(/[,，]/)
    .map(j => parseInt(j.trim()))
    .filter(j => !isNaN(j))

  const groups = form.value.groups.map(g => ({
    ...(g.id ? { id: g.id } : {}),
    name: g.name,
    description: g.description || null,
    sortOrder: Number(g.sortOrder) || 0
  }))

  return {
    title: form.value.title,
    description: form.value.description,
    coverImage: form.value.coverImage || null,
    category: form.value.category,
    tags,
    rules: form.value.rules || null,
    prizes: form.value.prizes || null,
    judges,
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    resultDate: form.value.resultDate || null,
    maxEntries: Number(form.value.maxEntries) || 0,
    scoringMode: form.value.scoringMode,
    groups
  }
}

const submitForm = async () => {
  if (!validateForm()) return

  submitting.value = true
  try {
    const data = buildSubmitData()
    let res
    if (isEdit.value) {
      res = await api.put(`/competitions/${competitionId.value}`, data)
      showToast(res.message || '保存成功', 'success')
    } else {
      res = await api.post('/competitions', data)
      showToast(res.message || '提交成功', 'success')
    }

    setTimeout(() => {
      if (isEdit.value) {
        router.push(`/competitions/${competitionId.value}`)
      } else {
        router.push('/competitions')
      }
    }, 1000)
  } catch (e) {
    showToast(e.error || '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}

const saveDraft = async () => {
  submitting.value = true
  try {
    const data = buildSubmitData()
    data.status = 'DRAFT'
    let res
    if (isEdit.value) {
      res = await api.put(`/competitions/${competitionId.value}`, data)
    } else {
      res = await api.post('/competitions', data)
    }
    showToast('已保存为草稿', 'success')
  } catch (e) {
    showToast(e.error || '保存失败', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (isEdit.value) {
    fetchCompetition()
  }
})
</script>

<style scoped>
.flex { display: flex; }
.items-center { align-items: center; }
.gap-sm { gap: 8px; }

.back-btn {
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s;
}
.back-btn:hover { color: var(--accent); }

.form-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 24px;
  align-items: flex-start;
}

.form-main { padding: 24px; }
.form-section { margin-bottom: 32px; }
.form-section:last-child { margin-bottom: 0; }

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border-light);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border-light);
}

.section-header .section-title {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.required { color: var(--danger); }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border: 2px solid var(--border-light);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover { border-color: var(--accent); }
.category-item.active { border-color: var(--accent); background: var(--accent-light); }
.cat-icon { font-size: 28px; }
.cat-name { font-size: 13px; color: var(--text-secondary); }
.category-item.active .cat-name { color: var(--accent); font-weight: 500; }

.empty-tiers {
  text-align: center;
  padding: 48px 24px;
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  color: var(--text-tertiary);
}
.empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.5; }

.groups-editor { display: flex; flex-direction: column; gap: 16px; }
.group-editor { padding: 20px; border: 1px solid var(--border-light); }
.group-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}
.group-order { font-weight: 600; color: var(--text-primary); }

.sticky { position: sticky; top: 80px; }
.sidebar-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.sidebar-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
  margin-top: 12px;
  line-height: 1.6;
}
.btn-success { background: #52c41a; color: #fff; }
.btn-success:hover { background: #389e0d; }
.btn-block { width: 100%; }
.btn-lg { padding: 14px 24px; font-size: 15px; }
.danger-btn { color: var(--danger) !important; }

@media (max-width: 900px) {
  .form-layout { grid-template-columns: 1fr; }
  .sticky { position: static; }
  .category-grid { grid-template-columns: repeat(2, 1fr); }
  .form-row { grid-template-columns: 1fr; }
}
</style>
