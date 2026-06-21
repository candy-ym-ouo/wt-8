<template>
  <div class="container">
    <div class="page-header">
      <div class="flex items-center gap-sm">
        <router-link to="/my-brand-coops" class="back-btn">←</router-link>
        <div>
          <h1 class="page-title">{{ editingId ? '编辑品牌联名提案' : '发起品牌联名提案' }}</h1>
          <p class="page-subtitle">
            {{ editingId ? '修改提案信息，保存后将重新提交审核' : '填写品牌联名合作信息，审核通过后公开发布' }}
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
              <li>审核通过后品牌联名合作将自动公开发布</li>
              <li>审核结果将通过站内消息通知您</li>
              <li>请确保品牌联系方式真实有效</li>
            </ul>
          </div>
        </div>

        <form @submit.prevent="submitForm">
          <div class="form-section">
            <h3 class="section-title">基本信息</h3>

            <div class="form-group">
              <label class="form-label">合作标题 <span class="required">*</span></label>
              <input v-model="form.title" type="text" class="form-input" placeholder="例：XX品牌 × 独立杂志联名特辑" maxlength="80" required>
              <div class="form-hint">突出联名主题和品牌名称（≤80字）</div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">品牌名称 <span class="required">*</span></label>
                <input v-model="form.brandName" type="text" class="form-input" placeholder="品牌/企业名称" required>
              </div>
              <div class="form-group">
                <label class="form-label">品牌Logo链接</label>
                <input v-model="form.brandLogo" type="text" class="form-input" placeholder="https://... 品牌Logo URL">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">合作分类 <span class="required">*</span></label>
                <select v-model="form.category" class="form-select" required>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.icon }} {{ cat.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">合作方式</label>
                <select v-model="form.cooperationType" class="form-select">
                  <option v-for="t in coopTypes" :key="t.id" :value="t.id">{{ t.icon }} {{ t.name }}</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">合作预算</label>
                <input v-model="form.budget" type="text" class="form-input" placeholder="例：5-10万元、面议等">
              </div>
              <div class="form-group">
                <label class="form-label">封面图片链接</label>
                <input v-model="form.coverImage" type="text" class="form-input" placeholder="https://... 图片URL">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">开始时间</label>
                <input v-model="form.startDate" type="datetime-local" class="form-input">
              </div>
              <div class="form-group">
                <label class="form-label">截止时间</label>
                <input v-model="form.endDate" type="datetime-local" class="form-input">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">相关标签</label>
              <input v-model="tagsText" type="text" class="form-input" placeholder="多个标签用逗号分隔，例如: 联名, 文创, 品牌">
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">详细描述</h3>

            <div class="form-group">
              <label class="form-label">项目描述 <span class="required">*</span></label>
              <textarea v-model="form.description" class="form-textarea" rows="6" placeholder="详细介绍品牌联名合作的背景、目标、内容等" required></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">合作要求</label>
              <textarea v-model="form.requirements" class="form-textarea" rows="4" placeholder="对合作方的要求和条件"></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">交付成果</label>
              <textarea v-model="form.deliverables" class="form-textarea" rows="4" placeholder="需要交付的成果内容、数量、格式等"></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">备注</label>
              <textarea v-model="form.notes" class="form-textarea" rows="3" placeholder="其他需要说明的事项"></textarea>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">联系信息</h3>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">联系人</label>
                <input v-model="form.contactPerson" type="text" class="form-input" placeholder="联系人姓名">
              </div>
              <div class="form-group">
                <label class="form-label">联系电话</label>
                <input v-model="form.contactPhone" type="text" class="form-input" placeholder="联系电话">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">联系邮箱</label>
              <input v-model="form.contactEmail" type="text" class="form-input" placeholder="联系邮箱">
            </div>
          </div>

          <div class="form-actions">
            <router-link to="/my-brand-coops" class="btn btn-secondary">取消</router-link>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? '提交中...' : (editingId ? '保存并提交审核' : '提交审核') }}
            </button>
          </div>
        </form>
      </div>

      <div class="sidebar">
        <div class="tips-card card">
          <h4 class="tips-title">📌 填写小贴士</h4>
          <ul class="tips-list">
            <li><strong>标题醒目</strong>：突出品牌名称和联名主题</li>
            <li><strong>预算明确</strong>：给出具体范围更易吸引合作</li>
            <li><strong>描述详尽</strong>：充分说明合作背景和愿景</li>
            <li><strong>要求清晰</strong>：明确合作方资质和条件</li>
            <li><strong>联系可靠</strong>：确保联系方式真实有效</li>
          </ul>
        </div>

        <div v-if="editingId && coopStatus" class="tips-card card" style="margin-top: 16px;">
          <h4 class="tips-title">📋 当前状态</h4>
          <div :class="['status-badge', `status-${coopStatus.toLowerCase()}`]" style="margin-bottom: 12px;">
            {{ getStatusText(coopStatus) }}
          </div>
          <div v-if="coopStatus === 'REJECTED' && rejectionReason" class="rejection-note">
            <strong>驳回原因：</strong>{{ rejectionReason }}
          </div>
          <div class="form-hint" style="margin-top: 8px;">修改后提交将重新进入审核流程</div>
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
const coopStatus = ref('')
const rejectionReason = ref('')

const categories = [
  { id: 'COBRANDING', name: '联名共创', icon: '🏷️' },
  { id: 'SPONSORSHIP', name: '品牌赞助', icon: '💰' },
  { id: 'CONTENT_COLLAB', name: '内容合作', icon: '📝' },
  { id: 'CROSSOVER', name: '跨界联动', icon: '🔀' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const coopTypes = [
  { id: 'COBRANDING', name: '联名共创', icon: '🏷️' },
  { id: 'SPONSORSHIP', name: '品牌赞助', icon: '💰' },
  { id: 'CONTENT_COLLAB', name: '内容合作', icon: '📝' },
  { id: 'CROSSOVER', name: '跨界联动', icon: '🔀' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const form = ref({
  title: '', brandName: '', brandLogo: '', description: '', coverImage: '',
  category: 'COBRANDING', cooperationType: 'COBRANDING',
  budget: '', startDate: '', endDate: '',
  requirements: '', deliverables: '', notes: '',
  contactPerson: '', contactPhone: '', contactEmail: ''
})
const tagsText = ref('')

const getStatusText = (s) => {
  const map = { DRAFT: '草稿', PENDING_REVIEW: '待审核', PUBLISHED: '已发布', IN_PROGRESS: '进行中', COMPLETED: '已完成', REJECTED: '未通过', CLOSED: '已关闭' }
  return map[s] || s
}

const loadData = async () => {
  if (!editingId.value) return
  loading.value = true
  try {
    const res = await api.get(`/brand-coops/${editingId.value}`)
    const c = res.brandCoop
    coopStatus.value = c.status
    rejectionReason.value = c.rejectionReason || ''
    form.value = {
      title: c.title,
      brandName: c.brandName,
      brandLogo: c.brandLogo || '',
      description: c.description,
      coverImage: c.coverImage || '',
      category: c.category,
      cooperationType: c.cooperationType,
      budget: c.budget || '',
      startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0, 16) : '',
      endDate: c.endDate ? new Date(c.endDate).toISOString().slice(0, 16) : '',
      requirements: c.requirements || '',
      deliverables: c.deliverables || '',
      notes: c.notes || '',
      contactPerson: c.contactPerson || '',
      contactPhone: c.contactPhone || '',
      contactEmail: c.contactEmail || ''
    }
    tagsText.value = (c.tags || []).join(', ')
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
    router.push('/my-brand-coops')
  } finally {
    loading.value = false
  }
}

const submitForm = async () => {
  if (!form.value.title || !form.value.brandName || !form.value.description) {
    showToast('请填写标题、品牌名称和项目描述', 'warning')
    return
  }
  submitting.value = true
  try {
    const tags = tagsText.value ? tagsText.value.split(',').map(t => t.trim()).filter(Boolean) : []
    const data = { ...form.value, tags }
    if (editingId.value) {
      await api.put(`/brand-coops/${editingId.value}`, data)
      showToast('已保存并提交审核', 'success')
    } else {
      const res = await api.post('/brand-coops', data)
      showToast(res.message || '提交成功', 'success')
    }
    router.push('/my-brand-coops')
  } catch (e) {
    showToast(e.error || '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.gap-sm { gap: 8px; }
.flex { display: flex; }
.items-center { align-items: center; }

.back-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--bg-secondary); font-size: 18px; color: var(--text-secondary); transition: all 0.2s; }
.back-btn:hover { background: var(--accent-light); color: var(--accent); }

.form-layout { display: grid; grid-template-columns: 1fr 280px; gap: 24px; align-items: flex-start; }
.form-card { padding: 32px; }
.form-section + .form-section { margin-top: 32px; padding-top: 28px; border-top: 1px solid var(--border-light); }
.section-title { font-size: 18px; font-weight: 600; margin-bottom: 20px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.required { color: var(--danger); }
.form-hint { font-size: 12px; color: var(--text-tertiary); margin-top: 6px; }
.form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border-light); }

.sidebar { position: sticky; top: 80px; }
.tips-card { padding: 20px 24px; }
.tips-title { font-size: 15px; font-weight: 600; margin-bottom: 14px; }
.tips-list { margin: 0; padding: 0; list-style: none; }
.tips-list li { font-size: 13px; line-height: 1.8; color: var(--text-secondary); padding-left: 18px; position: relative; }
.tips-list li::before { content: '•'; position: absolute; left: 0; color: var(--accent); font-weight: 700; }

.status-badge { display: inline-block; padding: 6px 14px; border-radius: 100px; font-size: 13px; font-weight: 500; }
.status-pending_review { background: #fff7e6; color: #d48806; }
.status-published { background: #f6ffed; color: #52c41a; }
.status-rejected { background: #fff1f0; color: #cf1322; }
.status-draft { background: #f5f5f5; color: #8c8c8c; }
.status-in_progress { background: #e6f7ff; color: #0050b3; }
.status-completed { background: #f6ffed; color: #52c41a; }
.status-closed { background: #f0f0f0; color: #8c8c8c; }

.rejection-note { padding: 12px; background: var(--danger-light); color: var(--danger); border-radius: var(--radius-sm); font-size: 13px; line-height: 1.6; }

.notice { display: flex; gap: 12px; padding: 16px 20px; border-radius: var(--radius); line-height: 1.6; }
.notice-info { background: #e6f7ff; border: 1px solid #91d5ff; color: #0050b3; }
.notice-icon { font-size: 20px; flex-shrink: 0; }

@media (max-width: 900px) {
  .form-layout { grid-template-columns: 1fr; }
  .sidebar { position: static; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
