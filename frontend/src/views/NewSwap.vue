<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">{{ isEdit ? '编辑交换需求' : '发布交换需求' }}</h1>
      <p class="page-subtitle">{{ isEdit ? '修改您的交换信息' : '分享你想交换的 Zine，找到心仪的刊物' }}</p>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-text">加载中...</div>
    </div>
    <form v-else class="card form-card">
      <div class="form-section">
        <label class="form-label">标题 *</label>
        <input v-model="form.title" type="text" class="form-input" placeholder="例如：用《xxx》求交换《xxx》">
      </div>

      <div class="form-section">
        <label class="form-label">封面图片</label>
        <input v-model="form.coverImage" type="text" class="form-input" placeholder="图片URL（可选）">
        <div v-if="form.coverImage" class="image-preview">
          <img :src="form.coverImage" alt="预览">
        </div>
      </div>

      <div class="form-grid">
        <div class="form-section">
          <label class="form-label">分类</label>
          <select v-model="form.category" class="form-input">
            <option value="ZINE">Zine 刊物</option>
            <option value="COMIC">漫画</option>
            <option value="PHOTO">摄影集</option>
            <option value="POETRY">诗集</option>
            <option value="ART">艺术画册</option>
            <option value="OTHER">其他</option>
          </select>
        </div>
        <div class="form-section">
          <label class="form-label">交换方式</label>
          <select v-model="form.exchangeType" class="form-input">
            <option value="SWAP">互换</option>
            <option value="SELL">出售</option>
            <option value="GIFT">赠送</option>
            <option value="TRADE">物物交换</option>
          </select>
        </div>
      </div>

      <div class="form-divider">
        <span class="divider-text">📖 我有的刊物</span>
      </div>

      <div class="form-grid">
        <div class="form-section">
          <label class="form-label">刊物名称</label>
          <input v-model="form.haveZineTitle" type="text" class="form-input" placeholder="您拥有的 Zine 名称">
        </div>
        <div class="form-section">
          <label class="form-label">作者</label>
          <input v-model="form.haveZineAuthor" type="text" class="form-input" placeholder="作者名">
        </div>
      </div>

      <div class="form-grid">
        <div class="form-section">
          <label class="form-label">分类</label>
          <input v-model="form.haveZineCategory" type="text" class="form-input" placeholder="例如：独立漫画">
        </div>
        <div class="form-section">
          <label class="form-label">品相</label>
          <select v-model="form.haveZineCondition" class="form-input">
            <option value="LIKE_NEW">全新/近全新</option>
            <option value="GOOD">良好</option>
            <option value="FAIR">一般</option>
          </select>
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">相关标签</label>
        <div class="tag-input-wrap">
          <div class="tag-list">
            <span v-for="(tag, idx) in form.haveTags" :key="idx" class="input-tag have-tag">
              #{{ tag }}
              <button type="button" @click="removeHaveTag(idx)" class="tag-remove">×</button>
            </span>
          </div>
          <input
            v-model="haveTagInput"
            type="text"
            class="form-input tag-input"
            placeholder="输入标签后回车添加"
            @keydown.enter.prevent="addHaveTag"
          >
        </div>
      </div>

      <div class="form-divider">
        <span class="divider-text">🎯 我想要的</span>
      </div>

      <div class="form-grid">
        <div class="form-section">
          <label class="form-label">刊物名称</label>
          <input v-model="form.wantZineTitle" type="text" class="form-input" placeholder="您想要的 Zine 名称">
        </div>
        <div class="form-section">
          <label class="form-label">作者</label>
          <input v-model="form.wantZineAuthor" type="text" class="form-input" placeholder="作者名">
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">想要的分类</label>
        <input v-model="form.wantZineCategory" type="text" class="form-input" placeholder="例如：摄影 Zine">
      </div>

      <div class="form-section">
        <label class="form-label">想要的标签</label>
        <div class="tag-input-wrap">
          <div class="tag-list">
            <span v-for="(tag, idx) in form.wantTags" :key="idx" class="input-tag want-tag">
              #{{ tag }}
              <button type="button" @click="removeWantTag(idx)" class="tag-remove">×</button>
            </span>
          </div>
          <input
            v-model="wantTagInput"
            type="text"
            class="form-input tag-input"
            placeholder="输入标签后回车添加"
            @keydown.enter.prevent="addWantTag"
          >
        </div>
      </div>

      <div class="form-divider">
        <span class="divider-text">📍 其他信息</span>
      </div>

      <div class="form-grid">
        <div class="form-section">
          <label class="form-label">所在地区</label>
          <input v-model="form.location" type="text" class="form-input" placeholder="例如：上海、北京（方便本地交换）">
        </div>
        <div class="form-section">
          <label class="form-label">邮寄方式</label>
          <input v-model="form.shippingMethod" type="text" class="form-input" placeholder="例如：包邮、到付、仅限面交">
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">详细描述 *</label>
        <textarea v-model="form.description" rows="5" class="form-input" placeholder="详细描述一下你拥有的刊物情况、交换要求、期望等..."></textarea>
      </div>

      <div class="form-actions">
        <router-link to="/swap" class="btn btn-ghost">取消</router-link>
        <button type="button" class="btn btn-outline" @click="saveDraft">保存草稿</button>
        <button type="button" class="btn btn-primary" :disabled="submitting" @click="submitForm">
          {{ submitting ? '提交中...' : (isEdit ? '保存修改' : '提交审核') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const isEdit = ref(false)
const loading = ref(false)
const submitting = ref(false)
const haveTagInput = ref('')
const wantTagInput = ref('')

const form = reactive({
  title: '',
  description: '',
  coverImage: '',
  category: 'ZINE',
  exchangeType: 'SWAP',
  haveZineTitle: '',
  haveZineAuthor: '',
  haveZineCategory: '',
  haveZineCondition: 'GOOD',
  haveTags: [],
  wantZineTitle: '',
  wantZineAuthor: '',
  wantZineCategory: '',
  wantTags: [],
  location: '',
  shippingMethod: ''
})

const addHaveTag = () => {
  const tag = haveTagInput.value.trim()
  if (tag && !form.haveTags.includes(tag)) {
    form.haveTags.push(tag)
  }
  haveTagInput.value = ''
}

const removeHaveTag = (idx) => {
  form.haveTags.splice(idx, 1)
}

const addWantTag = () => {
  const tag = wantTagInput.value.trim()
  if (tag && !form.wantTags.includes(tag)) {
    form.wantTags.push(tag)
  }
  wantTagInput.value = ''
}

const removeWantTag = (idx) => {
  form.wantTags.splice(idx, 1)
}

const loadData = async () => {
  const id = route.params.id
  if (!id) return
  isEdit.value = true
  loading.value = true
  try {
    const res = await api.get(`/swap-listings/${id}`)
    const l = res.listing
    Object.assign(form, {
      title: l.title,
      description: l.description,
      coverImage: l.coverImage || '',
      category: l.category,
      exchangeType: l.exchangeType,
      haveZineTitle: l.haveZineTitle || '',
      haveZineAuthor: l.haveZineAuthor || '',
      haveZineCategory: l.haveZineCategory || '',
      haveZineCondition: l.haveZineCondition,
      haveTags: l.haveTags || [],
      wantZineTitle: l.wantZineTitle || '',
      wantZineAuthor: l.wantZineAuthor || '',
      wantZineCategory: l.wantZineCategory || '',
      wantTags: l.wantTags || [],
      location: l.location || '',
      shippingMethod: l.shippingMethod || ''
    })
  } catch (e) {
    alert(e.error || '加载失败')
  } finally {
    loading.value = false
  }
}

const validate = () => {
  if (!form.title.trim()) return '请填写标题'
  if (!form.description.trim()) return '请填写详细描述'
  return null
}

const saveDraft = async () => {
  const err = validate()
  if (err) {
    alert(err)
    return
  }
  submitting.value = true
  try {
    let res
    if (isEdit.value) {
      res = await api.put(`/swap-listings/${route.params.id}`, { ...form, status: 'DRAFT' })
    } else {
      res = await api.post('/swap-listings', { ...form, status: 'DRAFT' })
    }
    alert(res.message || '保存成功')
    router.push('/my-swaps')
  } catch (e) {
    alert(e.error || '保存失败')
  } finally {
    submitting.value = false
  }
}

const submitForm = async () => {
  const err = validate()
  if (err) {
    alert(err)
    return
  }
  submitting.value = true
  try {
    let res
    if (isEdit.value) {
      res = await api.put(`/swap-listings/${route.params.id}`, { ...form })
    } else {
      res = await api.post('/swap-listings', { ...form })
    }
    alert(res.message || '提交成功')
    router.push('/my-swaps')
  } catch (e) {
    alert(e.error || '提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.form-card {
  padding: 32px;
  max-width: 720px;
  margin: 0 auto;
}
.form-section {
  margin-bottom: 20px;
}
.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 14px;
  transition: all 0.2s;
}
.form-input:focus {
  outline: none;
  border-color: var(--accent);
  background: #fff;
}
textarea.form-input {
  resize: vertical;
  font-family: inherit;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-divider {
  position: relative;
  margin: 28px 0 20px;
  text-align: center;
}
.form-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border-light);
}
.divider-text {
  position: relative;
  background: var(--bg-secondary);
  padding: 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}
.tag-input-wrap {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px;
  background: var(--bg-primary);
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.input-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}
.have-tag {
  background: #e3f2fd;
  color: #1565c0;
}
.want-tag {
  background: #fce4ec;
  color: #c2185b;
}
.tag-remove {
  background: none;
  border: none;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  opacity: 0.6;
}
.tag-remove:hover { opacity: 1; }
.tag-input {
  border: none;
  background: transparent;
  padding: 6px 8px;
  width: 100%;
  outline: none;
}
.tag-input:focus {
  background: transparent;
  border: none;
}
.image-preview {
  margin-top: 12px;
}
.image-preview img {
  max-width: 200px;
  border-radius: var(--radius-sm);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
}
</style>
