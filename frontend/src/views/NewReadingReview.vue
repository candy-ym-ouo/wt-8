<template>
  <div class="container new-review">
    <div class="page-header">
      <h1>{{ isEdit ? '✏️ 编辑书评' : '✨ 写书评' }}</h1>
      <button class="btn btn-ghost" @click="saveDraft" :disabled="!form.title || !form.content">
        <span>💾</span> 保存草稿
      </button>
    </div>

    <div class="editor-layout">
      <div class="editor-main">
        <div class="form-section">
          <h3 class="section-title">📚 书籍信息</h3>

          <div v-if="bookSearchResults.length > 0" class="book-suggestions">
            <div class="suggestion-title">选择已有书籍：</div>
            <div class="suggestion-list">
              <div v-for="b in bookSearchResults" :key="b.id"
                   :class="['suggestion-item', { selected: form.bookId === b.id }]"
                   @click="selectBook(b)">
                <img v-if="b.coverImage" :src="b.coverImage" class="book-thumb" alt="" />
                <div v-else class="book-thumb placeholder"><span>📖</span></div>
                <div class="book-detail">
                  <span class="b-title">{{ b.title }}</span>
                  <span class="b-author">{{ b.author }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>书名 *</label>
            <input v-model="form.bookTitle" type="text" placeholder="请输入书名"
                   @input="onBookSearch" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>作者</label>
              <input v-model="form.bookAuthor" type="text" placeholder="请输入作者（选填）" />
            </div>
            <div class="form-group">
              <label>封面图片 URL</label>
              <input v-model="form.coverImage" type="text" placeholder="封面图片链接（选填）" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">✍️ 书评内容</h3>

          <div class="form-group">
            <label>书评标题 *</label>
            <input v-model="form.title" type="text" placeholder="给你的书评起个标题" />
          </div>

          <div class="form-group">
            <label>评分</label>
            <div class="rating-selector">
              <button v-for="i in 5" :key="i" type="button"
                      :class="['rating-star', { selected: i <= form.rating }]"
                      @click="form.rating = i">
                <span>⭐</span>
                <span class="r-label">{{ ['很差', '一般', '还行', '推荐', '强烈推荐'][i - 1] }}</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>书评正文 *</label>
            <textarea v-model="form.content" rows="16"
                      placeholder="分享你的阅读感悟...可以包括你最喜欢的章节、书中的金句、以及它对你的启发等等"></textarea>
            <div class="word-count">{{ form.content.length }} 字</div>
          </div>

          <div class="form-group">
            <label>分类</label>
            <div class="category-grid">
              <button v-for="cat in categories" :key="cat.id" type="button"
                      :class="['cat-btn', { active: form.category === cat.id }]"
                      @click="form.category = cat.id">
                <span>{{ cat.icon }}</span>
                <span>{{ cat.name }}</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>标签（用空格或逗号分隔）</label>
            <div class="tag-input-wrapper">
              <div class="tag-preview">
                <span v-for="(t, i) in form.tags" :key="i" class="tag-item">
                  #{{ t }}
                  <button type="button" @click="removeTag(i)">×</button>
                </span>
              </div>
              <input v-model="tagInput" type="text" placeholder="添加标签后回车"
                     @keydown.enter.prevent="addTag"
                     @keydown.space.prevent="addTag" />
            </div>
          </div>
        </div>
      </div>

      <aside class="editor-sidebar">
        <div class="preview-card">
          <h3>📖 预览</h3>
          <div class="preview-cover">
            <img v-if="form.coverImage" :src="form.coverImage" alt="" />
            <div v-else class="cover-placeholder"><span>📖</span></div>
            <div class="preview-rating">
              <span v-for="i in 5" :key="i" :class="['star', i <= form.rating ? 'filled' : '']">⭐</span>
            </div>
          </div>
          <div class="preview-info">
            <div class="p-book">
              <strong>{{ form.bookTitle || '书名预览' }}</strong>
              <span v-if="form.bookAuthor">· {{ form.bookAuthor }}</span>
            </div>
            <h4>{{ form.title || '标题预览' }}</h4>
            <p class="p-excerpt">{{ form.content.slice(0, 100) }}{{ form.content.length > 100 ? '...' : '' }}</p>
            <div v-if="form.tags.length" class="p-tags">
              <span v-for="(t, i) in form.tags" :key="i" class="tag">#{{ t }}</span>
            </div>
          </div>
        </div>

        <div class="action-card">
          <button class="btn btn-primary btn-block" @click="submitReview(false)" :disabled="submitting">
            {{ submitting ? '发布中...' : '🚀 发布书评' }}
          </button>
          <button class="btn btn-outline btn-block" @click="$router.back()">
            取消
          </button>
          <div class="tips">
            <p><strong>💡 小贴士：</strong></p>
            <ul>
              <li>原创书评发布可获得 30 经验值</li>
              <li>精彩书评有机会登上精选推荐</li>
              <li>字数越多越容易被其他读者看到</li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const showToast = inject('showToast')

const isEdit = ref(false)
const editId = ref(null)
const submitting = ref(false)

const categories = ref([
  { id: 'LITERATURE', name: '文学小说', icon: '📖' },
  { id: 'SCIENCE', name: '科学技术', icon: '🔬' },
  { id: 'HISTORY', name: '历史人文', icon: '🏛️' },
  { id: 'PHILOSOPHY', name: '哲学思想', icon: '🧠' },
  { id: 'ART', name: '艺术设计', icon: '🎨' },
  { id: 'BUSINESS', name: '商业经济', icon: '💼' },
  { id: 'SELF_HELP', name: '自我成长', icon: '🌱' },
  { id: 'ZINE', name: 'ZINE刊物', icon: '📰' },
  { id: 'OTHER', name: '其他', icon: '💬' }
])

const form = ref({
  bookId: null,
  bookTitle: '',
  bookAuthor: '',
  coverImage: '',
  title: '',
  content: '',
  rating: 5,
  category: 'OTHER',
  tags: []
})

const tagInput = ref('')
const bookSearchResults = ref([])
let bookSearchTimer = null

const loadCategories = async () => {
  try {
    const res = await api.get('/reading-reviews/categories')
    const cats = res.categories.filter(c => c.id !== 'all')
    if (cats.length) categories.value = cats
  } catch (e) {}
}

const onBookSearch = () => {
  clearTimeout(bookSearchTimer)
  if (!form.value.bookTitle.trim()) {
    bookSearchResults.value = []
    return
  }
  bookSearchTimer = setTimeout(async () => {
    try {
      const res = await api.get('/reading-reviews/books/search', {
        params: { search: form.value.bookTitle, limit: 5 }
      })
      bookSearchResults.value = res.books || []
    } catch (e) {
      bookSearchResults.value = []
    }
  }, 400)
}

const selectBook = (b) => {
  form.value.bookId = b.id
  form.value.bookTitle = b.title
  form.value.bookAuthor = b.author || ''
  form.value.coverImage = b.coverImage || ''
  if (b.category && b.category !== 'OTHER') {
    form.value.category = b.category
  }
  if (b.tags && b.tags.length) {
    form.value.tags = [...b.tags].slice(0, 5)
  }
  bookSearchResults.value = []
}

const addTag = () => {
  const val = tagInput.value.trim().replace(/[#\s,]/g, '')
  if (val && !form.value.tags.includes(val) && form.value.tags.length < 10) {
    form.value.tags.push(val)
  }
  tagInput.value = ''
}

const removeTag = (i) => {
  form.value.tags.splice(i, 1)
}

const validate = () => {
  if (!form.value.bookTitle.trim()) { showToast('请填写书名', 'error'); return false }
  if (!form.value.title.trim()) { showToast('请填写书评标题', 'error'); return false }
  if (!form.value.content.trim()) { showToast('请填写书评内容', 'error'); return false }
  if (form.value.content.length < 20) { showToast('书评内容至少20字', 'error'); return false }
  return true
}

const submitReview = async (isDraft) => {
  if (!validate()) return
  submitting.value = true
  try {
    const payload = { ...form.value, status: isDraft ? 'DRAFT' : 'PUBLISHED' }
    let res
    if (isEdit.value && editId.value) {
      res = await api.put(`/reading-reviews/${editId.value}`, payload)
    } else {
      res = await api.post('/reading-reviews', payload)
    }
    showToast(isDraft ? '草稿已保存' : '发布成功！获得 30 经验值 🎉')
    if (isDraft) {
      // stay
    } else {
      router.push(`/reading/reviews/${res.review.id}`)
    }
  } catch (e) {
    showToast(e.error || '提交失败', 'error')
  }
  submitting.value = false
}

const saveDraft = () => submitReview(true)

onMounted(async () => {
  await loadCategories()
  if (route.params.id) {
    try {
      isEdit.value = true
      editId.value = Number(route.params.id)
      const res = await api.get(`/reading-reviews/${editId.value}`)
      const r = res.review
      form.value = {
        bookId: r.bookId || null,
        bookTitle: r.bookTitle,
        bookAuthor: r.bookAuthor || '',
        coverImage: r.coverImage || '',
        title: r.title,
        content: r.content,
        rating: r.rating,
        category: r.category,
        tags: r.tags || []
      }
    } catch (e) {}
  }
})
</script>

<style scoped>
.new-review { padding-bottom: 64px; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}
.page-header h1 { font-size: 28px; }

.editor-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 28px;
  align-items: start;
}

.editor-main { display: flex; flex-direction: column; gap: 24px; }

.form-section {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 28px;
  border: 1px solid var(--border-light);
}
.section-title {
  font-size: 18px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}

.form-group { margin-bottom: 20px; }
.form-group:last-child { margin-bottom: 0; }
.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  transition: border-color 0.2s;
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}
.form-group textarea { resize: vertical; min-height: 200px; }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.word-count {
  text-align: right;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.book-suggestions {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: var(--accent-light);
  border-radius: var(--radius-sm);
}
.suggestion-title {
  font-size: 12px;
  color: var(--accent);
  margin-bottom: 10px;
  font-weight: 600;
}
.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}
.suggestion-item:hover { transform: translateX(4px); }
.suggestion-item.selected { border-color: var(--accent); }
.book-thumb {
  width: 40px;
  height: 56px;
  border-radius: 4px;
  object-fit: cover;
  background: var(--bg-tertiary);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.book-detail { display: flex; flex-direction: column; gap: 2px; }
.b-title { font-weight: 600; font-size: 14px; }
.b-author { font-size: 12px; color: var(--text-secondary); }

.rating-selector {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.rating-star {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  border: 2px solid transparent;
  transition: all 0.2s;
}
.rating-star:hover { transform: translateY(-2px); }
.rating-star.selected {
  border-color: var(--accent);
  background: var(--accent-light);
}
.rating-star span { font-size: 24px; }
.r-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.cat-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  border: 2px solid transparent;
  transition: all 0.2s;
  font-size: 12px;
  color: var(--text-secondary);
}
.cat-btn:hover { transform: translateY(-2px); }
.cat-btn.active {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}
.cat-btn span:first-child { font-size: 20px; }

.tag-input-wrapper {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  background: var(--bg-primary);
  min-height: 48px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  transition: border-color 0.2s;
}
.tag-input-wrapper:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}
.tag-preview { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 12px;
  font-size: 12px;
}
.tag-item button {
  font-size: 14px;
  line-height: 1;
  color: var(--accent);
}
.tag-input-wrapper input {
  flex: 1;
  min-width: 100px;
  padding: 4px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
}

.editor-sidebar {
  position: sticky;
  top: 88px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-card {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 20px;
  border: 1px solid var(--border-light);
}
.preview-card h3 {
  font-size: 15px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}
.preview-cover {
  position: relative;
  height: 180px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: linear-gradient(135deg, var(--accent-light), #e8ddc7);
  margin-bottom: 14px;
}
.preview-cover img { width: 100%; height: 100%; object-fit: cover; }
.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  opacity: 0.5;
}
.preview-rating {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 4px 8px;
  background: rgba(0,0,0,0.6);
  border-radius: 4px;
  font-size: 12px;
}
.preview-rating .star { filter: grayscale(1); opacity: 0.4; }
.preview-rating .star.filled { filter: none; opacity: 1; }

.preview-info .p-book {
  font-size: 12px;
  color: var(--accent);
  margin-bottom: 6px;
}
.preview-info h4 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
  line-height: 1.4;
}
.p-excerpt {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
  min-height: 38px;
}
.p-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.p-tags .tag {
  font-size: 10px;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  color: var(--text-secondary);
}

.action-card {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 20px;
  border: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.btn-block { width: 100%; }

.tips {
  padding: 14px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  margin-top: 8px;
}
.tips p { font-size: 12px; font-weight: 600; margin-bottom: 8px; }
.tips ul {
  padding-left: 18px;
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.8;
}
</style>
