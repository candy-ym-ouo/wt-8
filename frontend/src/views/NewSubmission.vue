<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">提交投稿</h1>
      <p class="page-subtitle">分享你的创作，让它被更多人看到</p>
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
              ></textarea>
            </div>
            <div v-if="imageUrls.length" class="image-preview">
              <div v-for="(url, idx) in imageUrls" :key="idx" class="preview-item">
                <img :src="url" alt="">
                <button type="button" class="remove-btn" @click="removeImage(idx)">✕</button>
              </div>
            </div>
          </div>

          <div class="submit-actions">
            <button type="submit" class="btn btn-primary btn-lg" :disabled="loading">
              {{ loading ? '提交中...' : '提交审核' }}
            </button>
            <router-link to="/submissions" class="btn btn-secondary btn-lg">取消</router-link>
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
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const showToast = inject('showToast')

const form = ref({ title: '', content: '' })
const imagesText = ref('')
const loading = ref(false)

const imageUrls = computed(() =>
  imagesText.value.split('\n').map(s => s.trim()).filter(Boolean)
)

const removeImage = (idx) => {
  const urls = imageUrls.value
  urls.splice(idx, 1)
  imagesText.value = urls.join('\n')
}

const handleSubmit = async () => {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    showToast('请填写标题和内容', 'warning')
    return
  }
  loading.value = true
  try {
    await api.post('/submissions', {
      title: form.value.title.trim(),
      content: form.value.content.trim(),
      images: imageUrls.value
    })
    showToast('投稿成功！等待编辑审核', 'success')
    router.push('/submissions')
  } catch (e) {
    showToast(e.error || '投稿失败', 'error')
  } finally {
    loading.value = false
  }
}
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
@media (max-width: 900px) {
  .submit-layout { grid-template-columns: 1fr; }
  .tips-section { position: static; }
}
</style>
