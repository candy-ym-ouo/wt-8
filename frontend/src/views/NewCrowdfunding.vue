<template>
  <div class="container">
    <div class="page-header">
      <div class="flex items-center gap-sm">
        <router-link :to="isEdit ? `/crowdfundings/${crowdfundingId}` : '/crowdfundings'" class="back-btn">
          ← 返回
        </router-link>
        <h1 class="page-title">{{ isEdit ? '编辑众筹项目' : '发起众筹' }}</h1>
      </div>
      <p class="page-subtitle">{{ isEdit ? '修改您的众筹项目信息' : '创建一个新的众筹项目，让更多人支持您的创作' }}</p>
    </div>

    <div class="form-layout">
      <div class="form-main card">
        <div class="form-section">
          <h3 class="section-title">基本信息</h3>
          
          <div class="form-group">
            <label class="form-label">项目标题 <span class="required">*</span></label>
            <input v-model="form.title" class="form-input" placeholder="请输入众筹项目标题">
          </div>

          <div class="form-group">
            <label class="form-label">项目分类 <span class="required">*</span></label>
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
            <label class="form-label">项目描述 <span class="required">*</span></label>
            <textarea v-model="form.description" class="form-textarea" rows="8" placeholder="详细介绍您的众筹项目..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">标签</label>
            <input v-model="tagsInput" class="form-input" placeholder="多个标签用逗号分隔，如：刊物,原创,插画">
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">众筹设置</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">目标金额 <span class="required">*</span></label>
              <div class="input-with-prefix">
                <span class="prefix">¥</span>
                <input v-model.number="form.targetAmount" type="number" class="form-input" placeholder="0" min="0">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">库存预警阈值</label>
              <div class="input-with-suffix">
                <input v-model.number="form.stockThreshold" type="number" class="form-input" placeholder="0" min="0">
                <span class="suffix">件</span>
              </div>
              <p class="form-tip">当某档位库存低于此值时触发预警提醒</p>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">开始时间</label>
              <input v-model="form.startTime" type="datetime-local" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">截止时间</label>
              <input v-model="form.deadline" type="datetime-local" class="form-input">
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="section-header">
            <h3 class="section-title">支持档位</h3>
            <button class="btn btn-primary btn-sm" @click="addTier">+ 添加档位</button>
          </div>
          
          <div v-if="form.tiers.length === 0" class="empty-tiers">
            <div class="empty-icon">📦</div>
            <p>还没有添加档位，点击上方按钮添加</p>
          </div>

          <div v-else class="tiers-editor">
            <div v-for="(tier, index) in form.tiers" :key="index" class="tier-editor card">
              <div class="tier-editor-header">
                <span class="tier-order">档位 {{ index + 1 }}</span>
                <button class="btn btn-ghost btn-sm danger-btn" @click="removeTier(index)">删除</button>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">档位名称 <span class="required">*</span></label>
                  <input v-model="tier.name" class="form-input" placeholder="如：基础版、珍藏版">
                </div>
                <div class="form-group">
                  <label class="form-label">价格 <span class="required">*</span></label>
                  <div class="input-with-prefix">
                    <span class="prefix">¥</span>
                    <input v-model.number="tier.price" type="number" class="form-input" placeholder="0" min="0">
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">档位描述</label>
                <textarea v-model="tier.description" class="form-textarea" rows="2" placeholder="简要描述这个档位包含的内容"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">权益列表（每行一项）</label>
                <textarea v-model="tier.perksText" class="form-textarea" rows="3" placeholder="每期一项，如：&#10;实体刊物一本&#10;专属编号&#10;作者签名"></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">库存数量</label>
                  <input v-model.number="tier.stock" type="number" class="form-input" placeholder="0" min="0">
                </div>
                <div class="form-group">
                  <label class="form-label">预计发货时间</label>
                  <input v-model="tier.deliveryDate" type="date" class="form-input">
                </div>
              </div>

              <div class="form-group">
                <label class="form-checkbox">
                  <input v-model="tier.isUnlimited" type="checkbox">
                  <span>无限库存</span>
                </label>
              </div>

              <div class="form-group">
                <label class="form-label">排序</label>
                <input v-model.number="tier.sortOrder" type="number" class="form-input" placeholder="0" style="width: 120px;">
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
            {{ isEdit ? '修改后将重新提交审核' : '提交后管理员将审核您的众筹项目，审核通过后自动发布' }}
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

const crowdfundingId = computed(() => route.params.id)
const isEdit = computed(() => !!route.params.id)
const isAdmin = computed(() => authStore.user?.role === 'ADMIN')

const submitting = ref(false)
const tagsInput = ref('')

const categories = [
  { id: 'ZINE', name: '刊物', icon: '📖' },
  { id: 'ART', name: '艺术', icon: '🎨' },
  { id: 'BOOK', name: '书籍', icon: '📚' },
  { id: 'MUSIC', name: '音乐', icon: '🎵' },
  { id: 'GAME', name: '游戏', icon: '🎮' },
  { id: 'TECH', name: '科技', icon: '💻' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const form = ref({
  title: '',
  description: '',
  coverImage: '',
  category: 'ZINE',
  targetAmount: 1000,
  stockThreshold: 5,
  startTime: '',
  deadline: '',
  tiers: []
})

const addTier = () => {
  form.value.tiers.push({
    name: '',
    description: '',
    price: 0,
    stock: 100,
    sortOrder: form.value.tiers.length,
    deliveryDate: '',
    perksText: '',
    isUnlimited: false
  })
}

const removeTier = (index) => {
  if (confirm('确定删除该档位吗？')) {
    form.value.tiers.splice(index, 1)
  }
}

const fetchCrowdfunding = async () => {
  try {
    const res = await api.get(`/crowdfundings/${crowdfundingId.value}`)
    const c = res.crowdfunding
    form.value = {
      title: c.title,
      description: c.description,
      coverImage: c.coverImage || '',
      category: c.category,
      targetAmount: c.targetAmount,
      stockThreshold: c.stockThreshold,
      startTime: c.startTime ? formatDateTimeLocal(c.startTime) : '',
      deadline: c.deadline ? formatDateTimeLocal(c.deadline) : '',
      tiers: []
    }
    tagsInput.value = c.tags?.join(', ') || ''
    
    if (c.tiers && c.tiers.length > 0) {
      form.value.tiers = c.tiers.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        price: t.price,
        stock: t.stock,
        sortOrder: t.sortOrder,
        deliveryDate: t.deliveryDate ? formatDate(t.deliveryDate) : '',
        perksText: t.perks?.join('\n') || '',
        isUnlimited: t.isUnlimited
      }))
    }
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  }
}

const formatDateTimeLocal = (d) => {
  const date = new Date(d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const formatDate = (d) => {
  const date = new Date(d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const validateForm = () => {
  if (!form.value.title.trim()) {
    showToast('请输入项目标题', 'error')
    return false
  }
  if (!form.value.description.trim()) {
    showToast('请输入项目描述', 'error')
    return false
  }
  if (!form.value.targetAmount || form.value.targetAmount <= 0) {
    showToast('请设置有效的目标金额', 'error')
    return false
  }
  if (form.value.tiers.length === 0) {
    showToast('请至少添加一个支持档位', 'error')
    return false
  }
  for (let i = 0; i < form.value.tiers.length; i++) {
    const tier = form.value.tiers[i]
    if (!tier.name.trim()) {
      showToast(`请输入档位 ${i + 1} 的名称`, 'error')
      return false
    }
    if (tier.price === undefined || tier.price === null || tier.price < 0) {
      showToast(`请设置档位 ${i + 1} 的有效价格`, 'error')
      return false
    }
  }
  return true
}

const submitForm = async () => {
  if (!validateForm()) return
  
  submitting.value = true
  try {
    const tags = tagsInput.value
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(t => t)

    const tiers = form.value.tiers.map(t => ({
      ...(t.id ? { id: t.id } : {}),
      name: t.name,
      description: t.description || null,
      price: Number(t.price) || 0,
      stock: Number(t.stock) || 0,
      sortOrder: Number(t.sortOrder) || 0,
      deliveryDate: t.deliveryDate || null,
      perks: t.perksText ? t.perksText.split('\n').filter(p => p.trim()) : [],
      isUnlimited: Boolean(t.isUnlimited)
    }))

    const data = {
      title: form.value.title,
      description: form.value.description,
      coverImage: form.value.coverImage || null,
      category: form.value.category,
      tags,
      targetAmount: Number(form.value.targetAmount) || 0,
      stockThreshold: Number(form.value.stockThreshold) || 0,
      startTime: form.value.startTime || null,
      deadline: form.value.deadline || null,
      tiers
    }

    let res
    if (isEdit.value) {
      res = await api.put(`/crowdfundings/${crowdfundingId.value}`, data)
      showToast(res.message || '保存成功', 'success')
    } else {
      res = await api.post('/crowdfundings', data)
      showToast(res.message || '提交成功', 'success')
    }

    setTimeout(() => {
      if (isEdit.value) {
        router.push(`/crowdfundings/${crowdfundingId.value}`)
      } else {
        router.push('/crowdfundings')
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
    const tags = tagsInput.value
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(t => t)

    const data = {
      title: form.value.title,
      description: form.value.description,
      coverImage: form.value.coverImage || null,
      category: form.value.category,
      tags,
      targetAmount: Number(form.value.targetAmount) || 0,
      stockThreshold: Number(form.value.stockThreshold) || 0,
      startTime: form.value.startTime || null,
      deadline: form.value.deadline || null,
      status: 'DRAFT'
    }

    let res
    if (isEdit.value) {
      res = await api.put(`/crowdfundings/${crowdfundingId.value}`, data)
    } else {
      res = await api.post('/crowdfundings', data)
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
    fetchCrowdfunding()
  } else {
    addTier()
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

.back-btn:hover {
  color: var(--accent);
}

.form-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 24px;
  align-items: flex-start;
}

.form-main {
  padding: 24px;
}

.form-section {
  margin-bottom: 32px;
}

.form-section:last-child {
  margin-bottom: 0;
}

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

.required {
  color: var(--danger);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.input-with-prefix,
.input-with-suffix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-prefix .prefix,
.input-with-suffix .suffix {
  position: absolute;
  color: var(--text-tertiary);
  font-size: 14px;
}

.input-with-prefix .prefix {
  left: 12px;
}

.input-with-prefix .form-input {
  padding-left: 28px;
}

.input-with-suffix .suffix {
  right: 12px;
}

.input-with-suffix .form-input {
  padding-right: 28px;
}

.form-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 6px;
}

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

.category-item:hover {
  border-color: var(--accent);
}

.category-item.active {
  border-color: var(--accent);
  background: var(--accent-light);
}

.cat-icon {
  font-size: 28px;
}

.cat-name {
  font-size: 13px;
  color: var(--text-secondary);
}

.category-item.active .cat-name {
  color: var(--accent);
  font-weight: 500;
}

.empty-tiers {
  text-align: center;
  padding: 48px 24px;
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.tiers-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tier-editor {
  padding: 20px;
  border: 1px solid var(--border-light);
}

.tier-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}

.tier-order {
  font-weight: 600;
  color: var(--text-primary);
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
}

.form-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.sticky { position: sticky; top: 80px; }

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.sidebar-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
  margin-top: 12px;
  line-height: 1.6;
}

.btn-success {
  background: #52c41a;
  color: #fff;
}

.btn-success:hover {
  background: #389e0d;
}

.btn-block { width: 100%; }
.btn-lg { padding: 14px 24px; font-size: 15px; }

.danger-btn {
  color: var(--danger) !important;
}

@media (max-width: 900px) {
  .form-layout { grid-template-columns: 1fr; }
  .sticky { position: static; }
  .category-grid { grid-template-columns: repeat(3, 1fr); }
  .form-row { grid-template-columns: 1fr; }
}
</style>
