<template>
  <div class="container">
    <div class="page-header">
      <div class="flex items-center gap-sm">
        <router-link to="/my-collaborations" class="back-btn">←</router-link>
        <div>
          <h1 class="page-title">{{ editingId ? '编辑合作招募' : '发起合作招募' }}</h1>
          <p class="page-subtitle">
            {{ editingId ? '修改合作招募信息，保存后将重新提交审核' : '填写合作信息，审核通过后将公开发布' }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>

    <div v-else class="form-layout">
      <div class="form-card card">
        <div v-if="submitNotice" class="notice notice-info" style="margin-bottom: 24px;">
          <span class="notice-icon">ℹ️</span>
          <div class="notice-content">
            <strong>提交须知：</strong>
            <ul style="margin: 8px 0 0 20px; padding: 0;">
              <li>提交后管理员将在 1-3 个工作日内进行审核</li>
              <li>审核通过后合作项目将自动公开发布</li>
              <li>审核结果将通过站内消息通知您</li>
              <li>请确保联系方式真实有效，方便创作者联系</li>
            </ul>
          </div>
        </div>

        <form @submit.prevent="submitForm">
          <div class="form-section">
            <h3 class="section-title">基本信息</h3>

            <div class="form-group">
              <label class="form-label">合作标题 <span class="required">*</span></label>
              <input
                v-model="form.title"
                type="text"
                class="form-input"
                placeholder="例：夏季特辑封面插画合作招募"
                maxlength="80"
                required
              >
              <div class="form-hint">简洁明了的标题，突出合作主题（≤80字）</div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">合作分类 <span class="required">*</span></label>
                <select v-model="form.category" class="form-select" required>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.icon }} {{ cat.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">合作报酬</label>
                <input
                  v-model="form.compensation"
                  type="text"
                  class="form-input"
                  placeholder="例：500-1000元/篇、面议、稿酬分成等"
                >
                <div class="form-hint">明确的报酬更容易吸引优质创作者</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">截止时间</label>
                <input v-model="form.deadline" type="datetime-local" class="form-input">
                <div class="form-hint">申请截止日期，留空则长期有效</div>
              </div>

              <div class="form-group">
                <label class="form-label">封面图片链接</label>
                <input
                  v-model="form.coverImage"
                  type="text"
                  class="form-input"
                  placeholder="https://... 图片URL"
                >
                <div class="form-hint">建议尺寸 16:9，可留空使用默认封面</div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">相关标签</label>
              <input
                v-model="tagsText"
                type="text"
                class="form-input"
                placeholder="多个标签用逗号分隔，例如: 插画, 设计, 原创"
              >
              <div class="form-hint">帮助创作者更精准地找到您的合作</div>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">详细信息</h3>

            <div class="form-group">
              <label class="form-label">项目介绍 <span class="required">*</span></label>
              <textarea
                v-model="form.description"
                class="form-textarea"
                rows="6"
                placeholder="详细介绍合作项目的背景、目标、内容等"
                required
              ></textarea>
              <div class="form-hint">请提供足够的信息，让创作者了解合作内容</div>
            </div>

            <div class="form-group">
              <label class="form-label">合作要求</label>
              <textarea
                v-model="form.requirements"
                class="form-textarea"
                rows="4"
                placeholder="对申请者的技能、经验、作品等要求"
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">交付成果</label>
              <textarea
                v-model="form.deliverables"
                class="form-textarea"
                rows="4"
                placeholder="需要交付的成果内容、数量、格式、时间节点等"
              ></textarea>
            </div>
          </div>

          <div class="form-actions">
            <router-link to="/my-collaborations" class="btn btn-secondary">取消</router-link>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="submitting"
            >
              {{ submitting ? '提交中...' : (editingId ? '保存并提交审核' : '提交审核') }}
            </button>
          </div>
        </form>
      </div>

      <div class="sidebar">
        <div class="tips-card card">
          <h4 class="tips-title">📌 填写小贴士</h4>
          <ul class="tips-list">
            <li><strong>标题清晰</strong>：突出合作类型和核心内容</li>
            <li><strong>报酬明确</strong>：尽量给出具体范围，不要只写面议</li>
            <li><strong>详细介绍</strong>：充分说明项目背景和预期效果</li>
            <li><strong>要求具体</strong>：明确技能、经验和作品要求</li>
            <li><strong>合理时间</strong>：给创作者足够的申请和创作时间</li>
          </ul>
        </div>

        <div v-if="editingId && collabStatus" class="tips-card card" style="margin-top: 16px;">
          <h4 class="tips-title">📋 当前状态</h4>
          <div :class="['status-badge', `status-${collabStatus.toLowerCase()}`]" style="margin-bottom: 12px;">
            {{ getStatusText(collabStatus) }}
          </div>
          <div v-if="collabStatus === 'REJECTED' && rejectionReason" class="rejection-note">
            <strong>驳回原因：</strong>{{ rejectionReason }}
          </div>
          <div class="form-hint" style="margin-top: 8px;">
            修改后提交将重新进入审核流程
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const showToast = inject('showToast')

const editingId = computed(() => route.params.id ? Number(route.params.id) : null)

const loading = ref(false)
const submitting = ref(false)
const submitNotice = ref(true)
const collabStatus = ref('')
const rejectionReason = ref('')

const categories = [
  { id: 'WRITING', name: '撰稿', icon: '✍️' },
  { id: 'DESIGN', name: '设计', icon: '🎨' },
  { id: 'ILLUSTRATION', name: '插画', icon: '🖼️' },
  { id: 'PHOTOGRAPHY', name: '摄影', icon: '📷' },
  { id: 'TRANSLATION', name: '翻译', icon: '🌐' },
  { id: 'EDITING', name: '编辑', icon: '📝' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const form = ref({
  title: '',
  description: '',
  category: 'OTHER',
  compensation: '',
  deadline: '',
  coverImage: '',
  requirements: '',
  deliverables: ''
})
const tagsText = ref('')

const getStatusText = (s) => {
  const map = {
    DRAFT: '草稿',
    PENDING_REVIEW: '待审核',
    PUBLISHED: '已发布',
    REJECTED: '未通过',
    CLOSED: '已关闭'
  }
  return map[s] || s
}

const loadData = async () => {
  if (!editingId.value) return
  loading.value = true
  try {
    const res = await api.get(`/collaborations/${editingId.value}`)
    const c = res.collaboration
    collabStatus.value = c.status
    rejectionReason.value = c.rejectionReason || ''
    form.value = {
      title: c.title,
      description: c.description,
      category: c.category,
      compensation: c.compensation || '',
      deadline: c.deadline ? new Date(c.deadline).toISOString().slice(0, 16) : '',
      coverImage: c.coverImage || '',
      requirements: c.requirements || '',
      deliverables: c.deliverables || ''
    }
    tagsText.value = (c.tags || []).join(', ')
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
    router.push('/my-collaborations')
  } finally {
    loading.value = false
  }
}

const submitForm = async () => {
  if (!form.value.title || !form.value.description) {
    showToast('请填写标题和项目介绍', 'warning')
    return
  }
  submitting.value = true
  try {
    const tags = tagsText.value
      ? tagsText.value.split(',').map(t => t.trim()).filter(Boolean)
      : []
    const data = { ...form.value, tags }
    if (editingId.value) {
      await api.put(`/collaborations/${editingId.value}`, data)
      showToast('已保存并提交审核', 'success')
    } else {
      const res = await api.post('/collaborations', data)
      showToast(res.message || '提交成功', 'success')
    }
    router.push('/my-collaborations')
  } catch (e) {
    showToast(e.error || '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.gap-sm { gap: 8px; }
.flex { display: flex; }
.items-center { align-items: center; }

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--bg-secondary);
  font-size: 18px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.back-btn:hover {
  background: var(--accent-light);
  color: var(--accent);
}

.form-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 24px;
  align-items: flex-start;
}

.form-card { padding: 32px; }

.form-section + .form-section {
  margin-top: 32px;
  padding-top: 28px;
  border-top: 1px solid var(--border-light);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.required { color: var(--danger); }

.form-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 6px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-light);
}

.sidebar { position: sticky; top: 80px; }

.tips-card { padding: 20px 24px; }

.tips-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
}

.tips-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.tips-list li {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-secondary);
  padding-left: 18px;
  position: relative;
}
.tips-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--accent);
  font-weight: 700;
}

.status-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
}
.status-pending_review { background: #fff7e6; color: #d48806; }
.status-published { background: #f6ffed; color: #52c41a; }
.status-rejected { background: #fff1f0; color: #cf1322; }
.status-draft { background: #f5f5f5; color: #8c8c8c; }
.status-closed { background: #f0f0f0; color: #8c8c8c; }

.rejection-note {
  padding: 12px;
  background: var(--danger-light);
  color: var(--danger);
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.6;
}

.notice {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-radius: var(--radius);
  line-height: 1.6;
}
.notice-info {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  color: #0050b3;
}
.notice-icon { font-size: 20px; flex-shrink: 0; }

@media (max-width: 900px) {
  .form-layout { grid-template-columns: 1fr; }
  .sidebar { position: static; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
