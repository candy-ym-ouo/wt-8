<template>
  <div class="container">
    <div class="page-header flex justify-between items-center">
      <div>
        <h1 class="page-title">{{ editingId ? '编辑投稿' : '提交投稿' }}</h1>
        <p class="page-subtitle">分享你的创作，让它被更多人看到</p>
      </div>
      <div class="draft-info" v-if="lastSaved">
        <span class="text-sm text-tertiary">上次保存：{{ formatLastSaved }}</span>
      </div>
    </div>

    <div class="submit-layout">
      <div class="form-section card">
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label class="form-label">作品标题 <span class="text-danger">*</span></label>
            <input
              v-model="form.title"
              type="text"
              class="form-input"
              placeholder="给你的作品起个吸引人的标题"
              maxlength="60"
              required
              autofocus
              @input="onContentChange"
            >
            <div class="form-hint text-xs text-tertiary mt-sm">
              {{ form.title.length }} / 60 字
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">作品内容 <span class="text-danger">*</span></label>
            <textarea
              v-model="form.content"
              class="form-textarea"
              rows="14"
              placeholder="在这里写下你的作品内容... 支持文本排版，每行可以是一个段落。"
              required
              @input="onContentChange"
            ></textarea>
            <div class="form-hint text-xs text-tertiary mt-sm">
              {{ form.content.length }} 字 · 建议不少于 200 字以提高通过审核
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">配图（可选）</label>
            <div class="upload-section">
              <textarea
                v-model="imagesText"
                class="form-textarea"
                rows="3"
                placeholder="每行填入一个图片链接（URL），支持多张图片。示例：&#10;https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                @input="onContentChange"
              ></textarea>
            </div>
            <div v-if="imageUrls.length" class="image-preview">
              <div v-for="(url, idx) in imageUrls" :key="idx" class="preview-item">
                <img :src="url" alt="">
                <button type="button" class="remove-btn" @click="removeImage(idx)">✕</button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="enableSchedule">
              <span>定时提交</span>
            </label>
            <div v-if="enableSchedule" class="schedule-inputs">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">提交日期</label>
                  <input
                    v-model="scheduleDate"
                    type="date"
                    class="form-input"
                    :min="minDate"
                  >
                </div>
                <div class="form-group">
                  <label class="form-label">提交时间</label>
                  <input
                    v-model="scheduleTime"
                    type="time"
                    class="form-input"
                  >
                </div>
              </div>
              <p class="text-xs text-tertiary">
                系统将在设定时间自动将投稿提交至审核队列
              </p>
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="autoSaveEnabled">
              <span>自动保存草稿</span>
            </label>
          </div>

          <div class="submit-actions">
            <button
              type="button"
              class="btn btn-secondary btn-lg"
              @click="saveDraft"
              :disabled="savingDraft"
            >
              {{ savingDraft ? '保存中...' : '保存草稿' }}
            </button>
            <button
              type="submit"
              class="btn btn-primary btn-lg"
              :disabled="submitting"
            >
              {{ submitting ? '提交中...' : (enableSchedule ? '定时提交' : '提交审核') }}
            </button>
            <router-link to="/submissions" class="btn btn-ghost btn-lg">取消</router-link>
          </div>
        </form>
      </div>

      <div class="tips-section card">
        <h3 class="tips-title">📋 投稿指南</h3>
        <ul class="tips-list">
          <li>
            <span class="tip-icon">✍️</span>
            <div>
              <strong>原创优先</strong>
              <p>请确保投稿为原创作品，抄袭内容将直接被驳回。</p>
            </div>
          </li>
          <li>
            <span class="tip-icon">📝</span>
            <div>
              <strong>内容完整</strong>
              <p>标题清晰，内容完整，避免大段空白或过于简短。</p>
            </div>
          </li>
          <li>
            <span class="tip-icon">🖼️</span>
            <div>
              <strong>配图建议</strong>
              <p>添加 1-5 张相关配图可让你的作品更有吸引力。</p>
            </div>
          </li>
          <li>
            <span class="tip-icon">⏱️</span>
            <div>
              <strong>审核周期</strong>
              <p>人工审核通常在 24-48 小时内完成，请耐心等待。</p>
            </div>
          </li>
          <li>
            <span class="tip-icon">📤</span>
            <div>
              <strong>定时提交</strong>
              <p>可以设定定时提交，在你指定的时间自动进入审核队列。</p>
            </div>
          </li>
          <li>
            <span class="tip-icon">💾</span>
            <div>
              <strong>草稿保存</strong>
              <p>随时保存草稿，支持随时编辑和重新提交。</p>
            </div>
          </li>
          <li>
            <span class="tip-icon">❌</span>
            <div>
              <strong>违规内容</strong>
              <p>违反社区公约、涉及敏感话题的内容将被驳回。</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const route = useRoute()
const showToast = inject('showToast')

const form = ref({ title: '', content: '' })
const imagesText = ref('')
const submitting = ref(false)
const savingDraft = ref(false)
const lastSaved = ref(null)
const autoSaveEnabled = ref(true)
const draftId = ref(null)
const editingId = ref(null)

const enableSchedule = ref(false)
const scheduleDate = ref('')
const scheduleTime = ref('09:00')

let autoSaveTimer = null
let contentChanged = false

const imageUrls = computed(() =>
  imagesText.value.split('\n').map(s => s.trim()).filter(Boolean)
)

const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const formatLastSaved = computed(() => {
  if (!lastSaved.value) return ''
  const d = new Date(lastSaved.value)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const removeImage = (idx) => {
  const urls = imageUrls.value
  urls.splice(idx, 1)
  imagesText.value = urls.join('\n')
  onContentChange()
}

const onContentChange = () => {
  contentChanged = true
  if (autoSaveEnabled.value) {
    resetAutoSaveTimer()
  }
}

const resetAutoSaveTimer = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  autoSaveTimer = setTimeout(() => {
    if (contentChanged && autoSaveEnabled.value) {
      saveDraft(true)
    }
  }, 5000)
}

const saveDraft = async (isAuto = false) => {
  if (!form.value.title.trim() && !form.value.content.trim()) {
    if (!isAuto) showToast('请至少填写标题或内容', 'warning')
    return
  }

  savingDraft.value = true
  try {
    const data = {
      title: form.value.title.trim() || '未命名草稿',
      content: form.value.content.trim(),
      images: imageUrls.value,
      autoSaveEnabled: autoSaveEnabled.value
    }

    if (draftId.value || editingId.value) {
      data.id = draftId.value || editingId.value
    }

    const res = await api.post('/submissions/draft', data)
    draftId.value = res.submission.id
    lastSaved.value = res.submission.lastSavedAt || new Date().toISOString()
    contentChanged = false

    if (!isAuto) {
      showToast('草稿已保存', 'success')
    }
  } catch (e) {
    if (!isAuto) {
      showToast(e.error || '保存失败', 'error')
    }
  } finally {
    savingDraft.value = false
  }
}

const handleSubmit = async () => {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    showToast('请填写标题和内容', 'warning')
    return
  }

  let scheduledAt = null
  if (enableSchedule.value) {
    if (!scheduleDate.value || !scheduleTime.value) {
      showToast('请选择定时提交的日期和时间', 'warning')
      return
    }
    scheduledAt = new Date(`${scheduleDate.value}T${scheduleTime.value}`)
    if (scheduledAt <= new Date()) {
      showToast('定时提交时间必须晚于当前时间', 'warning')
      return
    }
  }

  submitting.value = true
  try {
    if (editingId.value) {
      await api.post(`/submissions/${editingId.value}/submit`, {
        title: form.value.title.trim(),
        content: form.value.content.trim(),
        images: imageUrls.value,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : null
      })
    } else {
      await api.post('/submissions', {
        title: form.value.title.trim(),
        content: form.value.content.trim(),
        images: imageUrls.value,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : null
      })
    }

    showToast(
      scheduledAt ? '定时提交成功！' : '投稿成功！等待编辑审核',
      'success'
    )
    router.push('/submissions')
  } catch (e) {
    showToast(e.error || '投稿失败', 'error')
  } finally {
    submitting.value = false
  }
}

const loadSubmission = async (id) => {
  try {
    const res = await api.get(`/submissions/${id}`)
    const sub = res.submission
    form.value.title = sub.title
    form.value.content = sub.content
    imagesText.value = sub.images?.join('\n') || ''
    lastSaved.value = sub.lastSavedAt || sub.updatedAt
    autoSaveEnabled.value = sub.autoSaveEnabled !== false
    draftId.value = sub.status === 'DRAFT' ? sub.id : null
    editingId.value = sub.id

    if (sub.scheduledAt) {
      enableSchedule.value = true
      const d = new Date(sub.scheduledAt)
      scheduleDate.value = d.toISOString().split('T')[0]
      scheduleTime.value = d.toTimeString().slice(0, 5)
    }
  } catch (e) {
    showToast('加载失败', 'error')
    router.push('/submissions')
  }
}

onMounted(() => {
  const id = route.params.id
  if (id) {
    loadSubmission(id)
  }
})

onUnmounted(() => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
})

watch(autoSaveEnabled, (val) => {
  if (!val && autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  } else if (val && contentChanged) {
    resetAutoSaveTimer()
  }
})
</script>

<style scoped>
.submit-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  align-items: start;
}
.form-section { padding: 32px; }
.form-hint {}
.text-danger { color: var(--danger); }
.upload-section { margin-bottom: 12px; }
.image-preview {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.preview-item {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border);
}
.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.remove-btn:hover { background: var(--danger); }
.submit-actions {
  display: flex;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-light);
}
.tips-section { padding: 24px; position: sticky; top: 88px; }
.tips-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}
.tips-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tips-list li {
  display: flex;
  gap: 12px;
}
.tip-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}
.tips-list strong {
  display: block;
  font-size: 13px;
  margin-bottom: 2px;
}
.tips-list p {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}
.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.schedule-inputs {
  margin-top: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}
.draft-info {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}
@media (max-width: 900px) {
  .submit-layout { grid-template-columns: 1fr; }
  .tips-section { position: static; }
}
</style>
