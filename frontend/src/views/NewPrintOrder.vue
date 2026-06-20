<template>
  <div class="container">
    <div class="page-header">
      <div class="flex items-center gap-sm">
        <router-link :to="isEdit ? `/print-orders/${orderId}` : '/print-orders'" class="back-btn">
          ← 返回
        </router-link>
        <h1 class="page-title">{{ isEdit ? '编辑送印申请' : '送印申请' }}</h1>
      </div>
      <p class="page-subtitle">{{ isEdit ? '修改您的送印申请信息' : '填写刊物印刷规格，提交送印申请' }}</p>
    </div>

    <div class="form-layout">
      <div class="form-main card">
        <div class="form-section">
          <h3 class="section-title">基本信息</h3>

          <div class="form-group">
            <label class="form-label">刊物名称 <span class="required">*</span></label>
            <input v-model="form.title" class="form-input" placeholder="请输入刊物名称">
          </div>

          <div class="form-group">
            <label class="form-label">分类</label>
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
            <label class="form-label">刊物描述 <span class="required">*</span></label>
            <textarea v-model="form.description" class="form-textarea" rows="4" placeholder="描述刊物内容和印刷需求..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">标签</label>
            <input v-model="tagsInput" class="form-input" placeholder="多个标签用逗号分隔">
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">印刷规格</h3>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">纸张类型</label>
              <select v-model="form.paperType" class="form-select">
                <option v-for="pt in paperTypes" :key="pt.value" :value="pt.value">{{ pt.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">纸张尺寸</label>
              <select v-model="form.paperSize" class="form-select">
                <option v-for="ps in paperSizes" :key="ps.value" :value="ps.value">{{ ps.label }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">页数 <span class="required">*</span></label>
              <input v-model.number="form.pageCount" type="number" class="form-input" placeholder="1" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">色彩模式</label>
              <select v-model="form.colorMode" class="form-select">
                <option v-for="cm in colorModes" :key="cm.value" :value="cm.value">{{ cm.label }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">装订方式</label>
              <select v-model="form.binding" class="form-select">
                <option v-for="b in bindings" :key="b.value" :value="b.value">{{ b.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">封面类型</label>
              <select v-model="form.coverType" class="form-select">
                <option v-for="ct in coverTypes" :key="ct.value" :value="ct.value">{{ ct.label }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">印刷数量 <span class="required">*</span></label>
              <div class="input-with-suffix">
                <input v-model.number="form.printQuantity" type="number" class="form-input" placeholder="100" min="1">
                <span class="suffix">册</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">期望交付日期</label>
              <input v-model="form.deliveryDate" type="date" class="form-input">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">特殊要求</label>
            <textarea v-model="specialReqText" class="form-textarea" rows="3" placeholder="每行一项特殊要求，如：&#10;覆哑膜&#10;烫金工艺&#10;特殊裁切"></textarea>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">联系信息</h3>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">联系人 <span class="required">*</span></label>
              <input v-model="form.contactName" class="form-input" placeholder="请输入联系人姓名">
            </div>
            <div class="form-group">
              <label class="form-label">联系电话 <span class="required">*</span></label>
              <input v-model="form.contactPhone" class="form-input" placeholder="请输入联系电话">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">联系地址</label>
            <input v-model="form.contactAddress" class="form-input" placeholder="请输入联系地址">
          </div>

          <div class="form-group">
            <label class="form-label">收货地址</label>
            <input v-model="form.deliveryAddress" class="form-input" placeholder="请输入收货地址（如与联系地址不同）">
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">附件与备注</h3>

          <div class="form-group">
            <label class="form-label">附件链接</label>
            <textarea v-model="attachmentsText" class="form-textarea" rows="2" placeholder="每行一个文件链接，如设计稿、源文件等"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea v-model="form.remark" class="form-textarea" rows="3" placeholder="其他需要说明的事项..."></textarea>
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
            {{ isEdit ? '修改后将重新提交审核' : '提交后管理员将审核并报价，审核结果通过站内消息通知' }}
          </p>

          <div v-if="isEdit" class="spec-summary">
            <h4 class="summary-title">规格概览</h4>
            <div class="summary-row">
              <span>{{ getPaperTypeLabel(form.paperType) }}</span>
              <span>{{ form.paperSize }}</span>
            </div>
            <div class="summary-row">
              <span>{{ form.pageCount }}P</span>
              <span>{{ form.printQuantity }}册</span>
            </div>
            <div class="summary-row">
              <span>{{ getBindingLabel(form.binding) }}</span>
              <span>{{ getCoverTypeLabel(form.coverType) }}</span>
            </div>
          </div>
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

const orderId = computed(() => route.params.id)
const isEdit = computed(() => !!route.params.id)

const submitting = ref(false)
const tagsInput = ref('')
const specialReqText = ref('')
const attachmentsText = ref('')

const categories = [
  { id: 'ZINE', name: '刊物', icon: '📖' },
  { id: 'ART', name: '艺术', icon: '🎨' },
  { id: 'BOOK', name: '书籍', icon: '📚' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const paperTypes = [
  { value: 'COATED', label: '铜版纸' },
  { value: 'UNCOATED', label: '胶版纸' },
  { value: 'OFFSET', label: '轻型纸' },
  { value: 'KRAFT', label: '牛皮纸' },
  { value: 'ART', label: '艺术纸' },
  { value: 'SPECIAL', label: '特种纸' }
]

const paperSizes = [
  { value: 'A3', label: 'A3 (297×420mm)' },
  { value: 'A4', label: 'A4 (210×297mm)' },
  { value: 'A5', label: 'A5 (148×210mm)' },
  { value: 'B5', label: 'B5 (176×250mm)' },
  { value: 'A6', label: 'A6 (105×148mm)' },
  { value: 'CUSTOM', label: '自定义尺寸' }
]

const colorModes = [
  { value: 'CMYK', label: 'CMYK 四色' },
  { value: 'PANTONE', label: 'Pantone 专色' },
  { value: 'BW', label: '黑白' },
  { value: 'MIXED', label: '彩色+黑白混排' }
]

const bindings = [
  { value: 'SADDLE_STITCH', label: '骑马钉' },
  { value: 'PERFECT_BIND', label: '胶装' },
  { value: 'HARD_BIND', label: '精装' },
  { value: 'WIRE_BIND', label: '线圈装' },
  { value: 'FOLD', label: '折页' }
]

const coverTypes = [
  { value: 'SOFT', label: '软封面' },
  { value: 'HARD', label: '硬封面' },
  { value: 'FLAP', label: '带勒口封面' },
  { value: 'DUST_JACKET', label: '护封' }
]

const form = ref({
  title: '',
  description: '',
  category: 'ZINE',
  paperType: 'COATED',
  paperSize: 'A5',
  pageCount: 32,
  colorMode: 'CMYK',
  binding: 'SADDLE_STITCH',
  coverType: 'SOFT',
  printQuantity: 100,
  contactName: '',
  contactPhone: '',
  contactAddress: '',
  deliveryAddress: '',
  deliveryDate: '',
  remark: ''
})

const getPaperTypeLabel = (v) => paperTypes.find(p => p.value === v)?.label || v
const getBindingLabel = (v) => bindings.find(b => b.value === v)?.label || v
const getCoverTypeLabel = (v) => coverTypes.find(c => c.value === v)?.label || v

const fetchOrder = async () => {
  try {
    const res = await api.get(`/print-orders/${orderId.value}`)
    const o = res.order
    form.value = {
      title: o.title,
      description: o.description,
      category: o.category,
      paperType: o.paperType,
      paperSize: o.paperSize,
      pageCount: o.pageCount,
      colorMode: o.colorMode,
      binding: o.binding,
      coverType: o.coverType,
      printQuantity: o.printQuantity,
      contactName: o.contactName,
      contactPhone: o.contactPhone,
      contactAddress: o.contactAddress || '',
      deliveryAddress: o.deliveryAddress || '',
      deliveryDate: o.deliveryDate ? formatDate(o.deliveryDate) : '',
      remark: o.remark || ''
    }
    tagsInput.value = o.tags?.join(', ') || ''
    specialReqText.value = o.specialReq?.join('\n') || ''
    attachmentsText.value = o.attachments?.join('\n') || ''
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  }
}

const formatDate = (d) => {
  const date = new Date(d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const validateForm = () => {
  if (!form.value.title.trim()) {
    showToast('请输入刊物名称', 'error')
    return false
  }
  if (!form.value.description.trim()) {
    showToast('请输入刊物描述', 'error')
    return false
  }
  if (!form.value.pageCount || form.value.pageCount < 1) {
    showToast('请输入有效页数', 'error')
    return false
  }
  if (!form.value.printQuantity || form.value.printQuantity < 1) {
    showToast('请输入有效印刷数量', 'error')
    return false
  }
  if (!form.value.contactName.trim()) {
    showToast('请输入联系人', 'error')
    return false
  }
  if (!form.value.contactPhone.trim()) {
    showToast('请输入联系电话', 'error')
    return false
  }
  return true
}

const submitForm = async () => {
  if (!validateForm()) return

  submitting.value = true
  try {
    const tags = tagsInput.value.split(/[,，]/).map(t => t.trim()).filter(t => t)
    const specialReq = specialReqText.value.split('\n').map(s => s.trim()).filter(s => s)
    const attachments = attachmentsText.value.split('\n').map(a => a.trim()).filter(a => a)

    const data = {
      title: form.value.title,
      description: form.value.description,
      category: form.value.category,
      tags,
      paperType: form.value.paperType,
      paperSize: form.value.paperSize,
      pageCount: Number(form.value.pageCount) || 1,
      colorMode: form.value.colorMode,
      binding: form.value.binding,
      coverType: form.value.coverType,
      printQuantity: Number(form.value.printQuantity) || 100,
      specialReq,
      contactName: form.value.contactName,
      contactPhone: form.value.contactPhone,
      contactAddress: form.value.contactAddress || null,
      deliveryAddress: form.value.deliveryAddress || null,
      deliveryDate: form.value.deliveryDate || null,
      attachments,
      remark: form.value.remark || null
    }

    let res
    if (isEdit.value) {
      res = await api.put(`/print-orders/${orderId.value}`, data)
      showToast(res.message || '保存成功', 'success')
    } else {
      res = await api.post('/print-orders', data)
      showToast(res.message || '提交成功', 'success')
    }

    setTimeout(() => {
      if (isEdit.value) {
        router.push(`/print-orders/${orderId.value}`)
      } else {
        router.push('/print-orders/mine')
      }
    }, 1000)
  } catch (e) {
    showToast(e.error || '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (isEdit.value) {
    fetchOrder()
  }
  const user = authStore.user
  if (user && !isEdit.value) {
    form.value.contactName = user.username || ''
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

.required { color: var(--danger); }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.input-with-suffix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-suffix .suffix {
  position: absolute;
  right: 12px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.input-with-suffix .form-input { padding-right: 28px; }

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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

.sticky { position: sticky; top: 80px; }
.sidebar-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.sidebar-tip { font-size: 12px; color: var(--text-tertiary); text-align: center; margin-top: 12px; line-height: 1.6; }
.btn-block { width: 100%; }
.btn-lg { padding: 14px 24px; font-size: 15px; }

.spec-summary {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.summary-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text-secondary);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .form-layout { grid-template-columns: 1fr; }
  .sticky { position: static; }
  .category-grid { grid-template-columns: repeat(2, 1fr); }
  .form-row { grid-template-columns: 1fr; }
}
</style>
