<template>
  <div class="admin-reading">
    <div class="container">
      <div class="page-header">
        <h1>📚 阅读社区管理</h1>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📖</div>
          <div class="stat-info">
            <span class="stat-num">{{ stats.totalCheckIns || 0 }}</span>
            <span class="stat-label">累计打卡次数</span>
          </div>
          <div class="stat-extra">今日 {{ stats.todayCheckIns || 0 }}</div>
        </div>
        <div class="stat-card highlight">
          <div class="stat-icon">✨</div>
          <div class="stat-info">
            <span class="stat-num">{{ stats.totalReviews || 0 }}</span>
            <span class="stat-label">书评总数</span>
          </div>
          <div class="stat-extra">已发布 {{ stats.publishedReviews || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-info">
            <span class="stat-num">{{ stats.totalBooks || 0 }}</span>
            <span class="stat-label">收录书籍</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💬</div>
          <div class="stat-info">
            <span class="stat-num">{{ (stats.totalCheckInComments || 0) + (stats.totalReviewComments || 0) }}</span>
            <span class="stat-label">评论总数</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🌟</div>
          <div class="stat-info">
            <span class="stat-num">{{ stats.totalFeatured || 0 }}</span>
            <span class="stat-label">精选推荐</span>
          </div>
        </div>
      </div>

      <div class="tab-nav">
        <button v-for="t in tabs" :key="t.id"
                :class="['tab', { active: activeTab === t.id }]"
                @click="activeTab = t.id">
          <span>{{ t.icon }}</span> {{ t.name }}
        </button>
      </div>

      <div v-if="activeTab === 'reviews'" class="tab-panel">
        <div class="filter-bar">
          <select v-model="reviewFilters.status" @change="page = 1; loadReviews()">
            <option value="all">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="PUBLISHED">已发布</option>
            <option value="REJECTED">已拒绝</option>
          </select>
          <select v-model="reviewFilters.category" @change="page = 1; loadReviews()">
            <option value="all">全部分类</option>
            <option value="LITERATURE">文学小说</option>
            <option value="SCIENCE">科学技术</option>
            <option value="HISTORY">历史人文</option>
            <option value="ZINE">ZINE刊物</option>
            <option value="OTHER">其他</option>
          </select>
          <input v-model="reviewSearch" type="text" placeholder="搜索书评..." @input="onReviewSearch" />
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>书评</th>
                <th>书籍</th>
                <th>作者</th>
                <th>评分</th>
                <th>状态</th>
                <th>互动</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in reviews" :key="r.id">
                <td>#{{ r.id }}</td>
                <td class="td-title">
                  <span v-if="r.isFeatured" class="badge-featured">精</span>
                  <strong>{{ r.title }}</strong>
                </td>
                <td>{{ r.bookTitle }}</td>
                <td>{{ r.user.username }}</td>
                <td><span class="rating">⭐ {{ r.rating }}.0</span></td>
                <td><span :class="['status-badge', r.status]">{{ statusText(r.status) }}</span></td>
                <td class="td-interact">
                  <span>👁️ {{ r.viewCount }}</span>
                  <span>❤️ {{ r.likeCount }}</span>
                  <span>💬 {{ r.commentCount }}</span>
                </td>
                <td class="td-time">{{ formatTime(r.createdAt) }}</td>
                <td>
                  <div class="row-actions">
                    <button class="row-btn" @click="viewReview(r)">查看</button>
                    <button v-if="r.status !== 'PUBLISHED'" class="row-btn ok" @click="updateReviewStatus(r, 'PUBLISHED')">通过</button>
                    <button v-if="r.status !== 'REJECTED'" class="row-btn warn" @click="rejectReview(r)">拒绝</button>
                    <button v-if="!r.isFeatured" class="row-btn special" @click="toggleFeatured(r, true)">推荐</button>
                    <button v-else class="row-btn" @click="toggleFeatured(r, false)">取消推荐</button>
                    <button class="row-btn danger" @click="deleteReview(r)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="reviews.length === 0" class="table-empty">暂无数据</div>
        </div>
        <div v-if="totalPages > 1" class="pagination">
          <button :disabled="page <= 1" @click="page--; loadReviews()">上一页</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="page++; loadReviews()">下一页</button>
        </div>
      </div>

      <div v-if="activeTab === 'checkins'" class="tab-panel">
        <div class="filter-bar">
          <select v-model="checkInFilters.isPublic" @change="page = 1; loadCheckIns()">
            <option value="all">全部可见</option>
            <option value="true">公开</option>
            <option value="false">私密</option>
          </select>
          <input v-model="checkInSearch" type="text" placeholder="搜索..." @input="onCheckInSearch" />
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户</th>
                <th>书籍</th>
                <th>阅读量</th>
                <th>心情</th>
                <th>可见性</th>
                <th>互动</th>
                <th>打卡时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ci in checkIns" :key="ci.id">
                <td>#{{ ci.id }}</td>
                <td>
                  <div class="cell-user">
                    <img :src="ci.user.avatar" class="mini-avatar" alt="">
                    <span>{{ ci.user.username }}</span>
                  </div>
                </td>
                <td>{{ ci.bookTitle }}</td>
                <td>
                  <span v-if="ci.pagesRead">{{ ci.pagesRead }}页</span>
                  <span v-if="ci.minutesRead"> / {{ ci.minutesRead }}分</span>
                </td>
                <td>{{ getMoodEmoji(ci.mood) }}</td>
                <td><span :class="['status-badge', ci.isPublic ? 'PUBLISHED' : 'DRAFT']">
                  {{ ci.isPublic ? '公开' : '私密' }}
                </span></td>
                <td>
                  <span>❤️ {{ ci.likeCount }}</span>
                  <span>💬 {{ ci.commentCount }}</span>
                </td>
                <td class="td-time">{{ formatTime(ci.checkInDate) }}</td>
                <td>
                  <div class="row-actions">
                    <button class="row-btn" @click="viewCheckInComments(ci)">评论({{ ci.commentCount }})</button>
                    <button class="row-btn danger" @click="deleteCheckIn(ci)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="checkIns.length === 0" class="table-empty">暂无数据</div>
        </div>
        <div v-if="ciTotalPages > 1" class="pagination">
          <button :disabled="ciPage <= 1" @click="ciPage--; loadCheckIns()">上一页</button>
          <span>{{ ciPage }} / {{ ciTotalPages }}</span>
          <button :disabled="ciPage >= ciTotalPages" @click="ciPage++; loadCheckIns()">下一页</button>
        </div>
      </div>

      <div v-if="activeTab === 'comments'" class="tab-panel">
        <div class="filter-bar">
          <select v-model="commentFilters.type" @change="loadComments()">
            <option value="review">书评评论</option>
            <option value="checkin">打卡评论</option>
          </select>
          <select v-model="commentFilters.status" @change="loadComments()">
            <option value="all">全部状态</option>
            <option value="APPROVED">已审核</option>
            <option value="PENDING">待审核</option>
            <option value="REJECTED">已拒绝</option>
          </select>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户</th>
                <th>内容</th>
                <th>关联</th>
                <th>状态</th>
                <th>置顶</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in comments" :key="c.id">
                <td>#{{ c.id }}</td>
                <td>
                  <div class="cell-user">
                    <img :src="c.user.avatar" class="mini-avatar" alt="">
                    <span>{{ c.user.username }}</span>
                  </div>
                </td>
                <td class="td-content">{{ c.content.slice(0, 60) }}{{ c.content.length > 60 ? '...' : '' }}</td>
                <td>{{ commentFilters.type === 'review' ? `书评 #${c.reviewId}` : `打卡 #${c.checkInId}` }}</td>
                <td><span :class="['status-badge', c.status]">{{ c.status }}</span></td>
                <td>{{ c.isPinned ? '✅' : '—' }}</td>
                <td class="td-time">{{ formatTime(c.createdAt) }}</td>
                <td>
                  <div class="row-actions">
                    <button v-if="c.status !== 'APPROVED'" class="row-btn ok" @click="updateCommentStatus(c, 'APPROVED')">通过</button>
                    <button v-if="c.status !== 'REJECTED'" class="row-btn warn" @click="updateCommentStatus(c, 'REJECTED')">拒绝</button>
                    <button class="row-btn" @click="toggleCommentPin(c)">{{ c.isPinned ? '取消置顶' : '置顶' }}</button>
                    <button class="row-btn danger" @click="deleteComment(c)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="comments.length === 0" class="table-empty">暂无数据</div>
        </div>
      </div>

      <div v-if="activeTab === 'books'" class="tab-panel">
        <div class="filter-bar">
          <input v-model="bookSearch" type="text" placeholder="搜索书籍..." @input="onBookSearch" />
          <button class="btn btn-primary btn-sm" @click="showBookModal = true; resetBookForm()">
            <span>＋</span> 新增书籍
          </button>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>封面</th>
                <th>书名</th>
                <th>作者</th>
                <th>分类</th>
                <th>ISBN</th>
                <th>关联</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in books" :key="b.id">
                <td>#{{ b.id }}</td>
                <td>
                  <img v-if="b.coverImage" :src="b.coverImage" class="book-thumb" alt="">
                  <div v-else class="book-thumb placeholder">📖</div>
                </td>
                <td class="td-title"><strong>{{ b.title }}</strong></td>
                <td>{{ b.author }}</td>
                <td>{{ b.category }}</td>
                <td>{{ b.isbn || '—' }}</td>
                <td>
                  <span>📖 {{ b.checkInCount || 0 }}次打卡</span>
                  <span>✍️ {{ b.reviewCount || 0 }}篇书评</span>
                </td>
                <td>
                  <div class="row-actions">
                    <button class="row-btn" @click="editBook(b)">编辑</button>
                    <button class="row-btn danger" @click="deleteBook(b)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="books.length === 0" class="table-empty">暂无数据</div>
        </div>
      </div>

      <div v-if="activeTab === 'featured'" class="tab-panel">
        <div class="filter-bar">
          <button class="btn btn-primary btn-sm" @click="openAddFeatured">
            <span>＋</span> 添加精选推荐
          </button>
        </div>

        <div v-if="featuredList.length > 0" class="featured-grid">
          <div v-for="f in featuredList" :key="f.id" class="featured-item">
            <div class="f-cover" :style="f.bannerImage ? { backgroundImage: `url(${f.bannerImage})` } : {}">
              <div class="f-info">
                <strong>{{ f.bannerTitle || f.review?.title }}</strong>
                <span>{{ f.bannerSubtitle || f.review?.bookTitle }}</span>
              </div>
              <span :class="['f-status', f.isActive ? 'active' : 'inactive']">
                {{ f.isActive ? '展示中' : '已下架' }}
              </span>
            </div>
            <div class="f-actions">
              <button class="row-btn" @click="editFeatured(f)">编辑</button>
              <button class="row-btn" @click="toggleFeaturedActive(f)">{{ f.isActive ? '下架' : '上架' }}</button>
              <button class="row-btn danger" @click="deleteFeatured(f)">删除</button>
            </div>
          </div>
        </div>
        <div v-else class="table-empty">暂无精选推荐</div>
      </div>
    </div>

    <div v-if="showBookModal" class="modal-overlay" @click.self="showBookModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingBook ? '编辑书籍' : '新增书籍' }}</h3>
          <button class="close-btn" @click="showBookModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>书名 *</label>
            <input v-model="bookForm.title" type="text" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>作者 *</label>
              <input v-model="bookForm.author" type="text" />
            </div>
            <div class="form-group">
              <label>ISBN</label>
              <input v-model="bookForm.isbn" type="text" />
            </div>
          </div>
          <div class="form-group">
            <label>封面图片 URL</label>
            <input v-model="bookForm.coverImage" type="text" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>分类</label>
              <select v-model="bookForm.category">
                <option value="OTHER">其他</option>
                <option value="LITERATURE">文学小说</option>
                <option value="SCIENCE">科学技术</option>
                <option value="HISTORY">历史人文</option>
                <option value="ZINE">ZINE刊物</option>
              </select>
            </div>
            <div class="form-group">
              <label>页数</label>
              <input v-model.number="bookForm.pageCount" type="number" min="0" />
            </div>
          </div>
          <div class="form-group">
            <label>简介</label>
            <textarea v-model="bookForm.description" rows="3"></textarea>
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" @click="showBookModal = false">取消</button>
            <button class="btn btn-primary" @click="submitBook">{{ editingBook ? '保存' : '添加' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showFeaturedModal" class="modal-overlay" @click.self="showFeaturedModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingFeatured ? '编辑精选' : '添加精选推荐' }}</h3>
          <button class="close-btn" @click="showFeaturedModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>关联书评 ID *</label>
            <input v-model.number="featuredForm.reviewId" type="number" placeholder="请输入书评ID" />
          </div>
          <div class="form-group">
            <label>Banner 图片</label>
            <input v-model="featuredForm.bannerImage" type="text" placeholder="图片URL（选填）" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>标题</label>
              <input v-model="featuredForm.bannerTitle" type="text" />
            </div>
            <div class="form-group">
              <label>副标题</label>
              <input v-model="featuredForm.bannerSubtitle" type="text" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>排序</label>
              <input v-model.number="featuredForm.sortOrder" type="number" />
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input v-model="featuredForm.isActive" type="checkbox" /> 立即上架
              </label>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" @click="showFeaturedModal = false">取消</button>
            <button class="btn btn-primary" @click="submitFeatured">{{ editingFeatured ? '保存' : '添加' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showReviewDetail" class="modal-overlay" @click.self="showReviewDetail = false">
      <div class="modal lg">
        <div class="modal-header">
          <h3>书评详情 - #{{ currentReview?.id }}</h3>
          <button class="close-btn" @click="showReviewDetail = false">×</button>
        </div>
        <div class="modal-body review-detail-modal">
          <div v-if="currentReview" class="rd-content">
            <div class="rd-header">
              <img v-if="currentReview.coverImage" :src="currentReview.coverImage" class="rd-cover" alt="" />
              <div class="rd-info">
                <h4>{{ currentReview.title }}</h4>
                <p class="rd-book">📖 {{ currentReview.bookTitle }} <span v-if="currentReview.bookAuthor">· {{ currentReview.bookAuthor }}</span></p>
                <div class="rd-rating">
                  <span v-for="i in 5" :key="i" :class="['star', i <= currentReview.rating ? 'filled' : '']">⭐</span>
                  <span>{{ currentReview.rating }}.0</span>
                </div>
                <p class="rd-author">作者：{{ currentReview.user?.username }}</p>
              </div>
            </div>
            <div class="rd-body" v-html="currentReview.content.replace(/\n/g, '<br>')"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const tabs = [
  { id: 'reviews', name: '书评管理', icon: '✨' },
  { id: 'checkins', name: '打卡管理', icon: '📖' },
  { id: 'comments', name: '评论管理', icon: '💬' },
  { id: 'books', name: '书籍管理', icon: '📚' },
  { id: 'featured', name: '精选推荐', icon: '🌟' }
]
const activeTab = ref('reviews')
const stats = ref({})

const reviews = ref([])
const page = ref(1)
const totalPages = ref(1)
const reviewSearch = ref('')
const reviewFilters = ref({ status: 'all', category: 'all' })
let reviewSearchTimer = null

const checkIns = ref([])
const ciPage = ref(1)
const ciTotalPages = ref(1)
const checkInSearch = ref('')
const checkInFilters = ref({ isPublic: 'all' })
let ciSearchTimer = null

const comments = ref([])
const commentFilters = ref({ type: 'review', status: 'all' })

const books = ref([])
const bookSearch = ref('')
let bookSearchTimer = null

const featuredList = ref([])

const showBookModal = ref(false)
const editingBook = ref(null)
const bookForm = ref({})

const showFeaturedModal = ref(false)
const editingFeatured = ref(null)
const featuredForm = ref({})

const showReviewDetail = ref(false)
const currentReview = ref(null)

const moodMap = { HAPPY: '😊', INSPIRED: '💡', MOVED: '🥹', THOUGHTFUL: '🤔', RELAXED: '😌', EXCITED: '🤩', CHALLENGED: '🧠' }
const getMoodEmoji = (m) => moodMap[m] || '📖'

const statusText = (s) => ({ DRAFT: '草稿', PUBLISHED: '已发布', REJECTED: '已拒绝', APPROVED: '已通过', PENDING: '待审核' }[s] || s)

const formatTime = (d) => {
  const t = new Date(d)
  return `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
}

const loadStats = async () => {
  try {
    const res = await api.get('/admin/reading/stats')
    stats.value = res.stats
  } catch (e) {}
}

const loadReviews = async () => {
  try {
    const res = await api.get('/admin/reading/reviews', {
      params: {
        page: page.value,
        limit: 20,
        status: reviewFilters.value.status,
        category: reviewFilters.value.category,
        search: reviewSearch.value || undefined
      }
    })
    reviews.value = res.reviews
    totalPages.value = res.totalPages
  } catch (e) {}
}
const onReviewSearch = () => {
  clearTimeout(reviewSearchTimer)
  reviewSearchTimer = setTimeout(() => { page.value = 1; loadReviews() }, 400)
}

const loadCheckIns = async () => {
  try {
    const res = await api.get('/admin/reading/checkins', {
      params: {
        page: ciPage.value,
        limit: 20,
        isPublic: checkInFilters.value.isPublic,
        search: checkInSearch.value || undefined
      }
    })
    checkIns.value = res.checkIns
    ciTotalPages.value = res.totalPages
  } catch (e) {}
}
const onCheckInSearch = () => {
  clearTimeout(ciSearchTimer)
  ciSearchTimer = setTimeout(() => { ciPage.value = 1; loadCheckIns() }, 400)
}

const loadComments = async () => {
  try {
    // Load a sample - using reviews comments as default
    const endpoint = commentFilters.value.type === 'review'
      ? (reviews.value.length ? `/admin/reading/reviews/${reviews.value[0].id}/comments` : null)
      : (checkIns.value.length ? `/admin/reading/checkins/${checkIns.value[0].id}/comments` : null)
    if (!endpoint) { comments.value = []; return }
    const res = await api.get(endpoint, { params: { status: commentFilters.value.status, limit: 50 } })
    comments.value = res.comments
  } catch (e) { comments.value = [] }
}

const loadBooks = async () => {
  try {
    const res = await api.get('/admin/reading/books', {
      params: { search: bookSearch.value || undefined, limit: 50 }
    })
    books.value = res.books
  } catch (e) {}
}
const onBookSearch = () => {
  clearTimeout(bookSearchTimer)
  bookSearchTimer = setTimeout(loadBooks, 400)
}

const loadFeatured = async () => {
  try {
    const res = await api.get('/admin/reading/featured/list')
    featuredList.value = res.featured
  } catch (e) {}
}

const viewReview = (r) => { currentReview.value = r; showReviewDetail.value = true }

const updateReviewStatus = async (r, status) => {
  try {
    await api.put(`/admin/reading/reviews/${r.id}`, { status })
    showToast('更新成功')
    loadReviews(); loadStats()
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const rejectReview = async (r) => {
  const reason = prompt('请输入拒绝理由（选填）')
  try {
    await api.put(`/admin/reading/reviews/${r.id}`, { status: 'REJECTED', rejectionReason: reason })
    showToast('已拒绝')
    loadReviews(); loadStats()
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const toggleFeatured = async (r, val) => {
  try {
    await api.put(`/admin/reading/reviews/${r.id}`, { isFeatured: val })
    showToast(val ? '已设为推荐' : '已取消推荐')
    loadReviews(); loadStats()
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const deleteReview = async (r) => {
  if (!confirm(`确定删除书评 #${r.id}？`)) return
  try {
    await api.delete(`/admin/reading/reviews/${r.id}`)
    showToast('删除成功')
    loadReviews(); loadStats()
  } catch (e) { showToast(e.error || '删除失败', 'error') }
}

const deleteCheckIn = async (ci) => {
  if (!confirm(`确定删除打卡记录 #${ci.id}？`)) return
  try {
    await api.delete(`/admin/reading/checkins/${ci.id}`)
    showToast('删除成功')
    loadCheckIns(); loadStats()
  } catch (e) { showToast(e.error || '删除失败', 'error') }
}

const viewCheckInComments = async (ci) => {
  try {
    commentFilters.value.type = 'checkin'
    const res = await api.get(`/admin/reading/checkins/${ci.id}/comments`)
    comments.value = res.comments
    activeTab.value = 'comments'
  } catch (e) {}
}

const updateCommentStatus = async (c, status) => {
  try {
    const endpoint = c.reviewId ? 'reviews' : 'checkins'
    await api.put(`/admin/reading/${endpoint}/comments/${c.id}`, { status })
    showToast('更新成功')
    loadComments()
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const toggleCommentPin = async (c) => {
  try {
    const endpoint = c.reviewId ? 'reviews' : 'checkins'
    await api.put(`/admin/reading/${endpoint}/comments/${c.id}`, { isPinned: !c.isPinned })
    showToast('更新成功')
    loadComments()
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const deleteComment = async (c) => {
  if (!confirm('确定删除该评论？')) return
  try {
    const endpoint = c.reviewId ? 'reviews' : 'checkins'
    await api.delete(`/admin/reading/${endpoint}/comments/${c.id}`)
    showToast('删除成功')
    loadComments()
  } catch (e) { showToast(e.error || '删除失败', 'error') }
}

const resetBookForm = () => {
  editingBook.value = null
  bookForm.value = {
    title: '', author: '', isbn: '', coverImage: '',
    category: 'OTHER', pageCount: 0, description: ''
  }
}

const editBook = (b) => {
  editingBook.value = b
  bookForm.value = {
    title: b.title, author: b.author, isbn: b.isbn || '',
    coverImage: b.coverImage || '', category: b.category,
    pageCount: b.pageCount || 0, description: b.description || ''
  }
  showBookModal.value = true
}

const submitBook = async () => {
  if (!bookForm.value.title || !bookForm.value.author) {
    showToast('请填写书名和作者', 'error'); return
  }
  try {
    if (editingBook.value) {
      await api.put(`/admin/reading/books/${editingBook.value.id}`, bookForm.value)
      showToast('更新成功')
    } else {
      await api.post('/admin/reading/books', bookForm.value)
      showToast('添加成功')
    }
    showBookModal.value = false
    loadBooks(); loadStats()
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const deleteBook = async (b) => {
  if (!confirm(`确定删除书籍《${b.title}》？`)) return
  try {
    await api.delete(`/admin/reading/books/${b.id}`)
    showToast('删除成功')
    loadBooks(); loadStats()
  } catch (e) { showToast(e.error || '删除失败', 'error') }
}

const openAddFeatured = () => {
  editingFeatured.value = null
  featuredForm.value = { reviewId: null, bannerImage: '', bannerTitle: '', bannerSubtitle: '', sortOrder: 0, isActive: true }
  showFeaturedModal.value = true
}

const editFeatured = (f) => {
  editingFeatured.value = f
  featuredForm.value = {
    reviewId: f.reviewId,
    bannerImage: f.bannerImage || '',
    bannerTitle: f.bannerTitle || '',
    bannerSubtitle: f.bannerSubtitle || '',
    sortOrder: f.sortOrder,
    isActive: f.isActive
  }
  showFeaturedModal.value = true
}

const submitFeatured = async () => {
  if (!featuredForm.value.reviewId) { showToast('请输入书评ID', 'error'); return }
  try {
    if (editingFeatured.value) {
      await api.put(`/admin/reading/featured/${editingFeatured.value.id}`, featuredForm.value)
      showToast('更新成功')
    } else {
      await api.post('/admin/reading/featured', featuredForm.value)
      showToast('添加成功')
    }
    showFeaturedModal.value = false
    loadFeatured()
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const toggleFeaturedActive = async (f) => {
  try {
    await api.put(`/admin/reading/featured/${f.id}`, { isActive: !f.isActive })
    showToast('更新成功')
    loadFeatured()
  } catch (e) { showToast(e.error || '操作失败', 'error') }
}

const deleteFeatured = async (f) => {
  if (!confirm('确定删除该精选推荐？')) return
  try {
    await api.delete(`/admin/reading/featured/${f.id}`)
    showToast('删除成功')
    loadFeatured()
  } catch (e) { showToast(e.error || '删除失败', 'error') }
}

onMounted(() => {
  loadStats()
  loadReviews()
  loadFeatured()
})
</script>

<style scoped>
.admin-reading { min-height: 100vh; background: var(--bg-primary); padding: 24px 0; }

.page-header h1 { font-size: 24px; margin-bottom: 20px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  gap: 14px;
  align-items: center;
  border: 1px solid var(--border-light);
  position: relative;
}
.stat-card.highlight {
  background: linear-gradient(135deg, var(--accent-light), #f5efe0);
  border-color: var(--accent);
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.stat-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.stat-num { font-size: 24px; font-weight: 800; font-family: var(--font-serif); }
.stat-label { font-size: 12px; color: var(--text-secondary); }
.stat-extra {
  position: absolute;
  top: 12px;
  right: 14px;
  font-size: 11px;
  color: var(--accent);
  background: rgba(212, 98, 74, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

.tab-nav {
  display: flex;
  gap: 4px;
  background: var(--bg-secondary);
  padding: 6px;
  border-radius: var(--radius);
  margin-bottom: 20px;
  border: 1px solid var(--border-light);
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.tab:hover { background: var(--bg-tertiary); }
.tab.active { background: var(--accent); color: #fff; }

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.filter-bar select,
.filter-bar input {
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  font-size: 13px;
  font-family: inherit;
  min-width: 140px;
}
.filter-bar input { flex: 1; min-width: 200px; }

.admin-table-wrap {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  border: 1px solid var(--border-light);
  overflow: hidden;
}
.admin-table { width: 100%; border-collapse: collapse; }
.admin-table th,
.admin-table td {
  padding: 12px 14px;
  text-align: left;
  font-size: 13px;
  border-bottom: 1px solid var(--border-light);
}
.admin-table th {
  background: var(--bg-tertiary);
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
}
.admin-table tr:hover td { background: rgba(212, 98, 74, 0.03); }

.td-title { max-width: 220px; }
.td-title strong { display: block; line-height: 1.4; }
.td-title .badge-featured {
  display: inline-block;
  padding: 1px 6px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #fff;
  border-radius: 4px;
  font-size: 10px;
  margin-right: 6px;
  font-weight: 700;
}
.td-interact { display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: var(--text-secondary); }
.td-time { color: var(--text-secondary); font-size: 12px; white-space: nowrap; }
.td-content { max-width: 200px; color: var(--text-secondary); }

.cell-user {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mini-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--bg-tertiary); }

.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.status-badge.PUBLISHED, .status-badge.APPROVED { background: #d4edda; color: #155724; }
.status-badge.DRAFT { background: #e2e3e5; color: #383d41; }
.status-badge.REJECTED { background: #f8d7da; color: #721c24; }
.status-badge.PENDING { background: #fff3cd; color: #856404; }

.rating { color: #ffa500; font-weight: 600; }

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.row-btn {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  transition: all 0.15s;
  white-space: nowrap;
}
.row-btn:hover { background: var(--accent-light); color: var(--accent); }
.row-btn.ok:hover { background: #d4edda; color: #155724; }
.row-btn.warn:hover { background: #fff3cd; color: #856404; }
.row-btn.danger:hover { background: #f8d7da; color: #721c24; }
.row-btn.special:hover { background: #ffe8cc; color: #d97706; }

.table-empty {
  text-align: center;
  padding: 48px;
  color: var(--text-secondary);
  font-size: 14px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}
.pagination button {
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  font-size: 13px;
  border: 1px solid var(--border-light);
}
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination span { font-size: 13px; color: var(--text-secondary); }

.book-thumb {
  width: 36px;
  height: 50px;
  border-radius: 4px;
  object-fit: cover;
  background: var(--bg-tertiary);
}
.book-thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.featured-item {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border-light);
}
.f-cover {
  position: relative;
  min-height: 140px;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--accent), #8b5a3c);
  color: #fff;
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.f-info { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 4px; }
.f-info strong { font-size: 16px; }
.f-info span { font-size: 13px; opacity: 0.9; }
.f-status {
  position: relative;
  z-index: 1;
  align-self: flex-start;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  margin-top: 12px;
}
.f-status.active { background: rgba(40, 167, 69, 0.8); }
.f-status.inactive { background: rgba(108, 117, 125, 0.8); }
.f-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-light);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal.lg { max-width: 800px; }
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}
.modal-header h3 { font-size: 16px; }
.close-btn { font-size: 28px; line-height: 1; color: var(--text-secondary); }
.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.form-group { margin-bottom: 16px; }
.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 14px;
  font-family: inherit;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus { outline: none; border-color: var(--accent); }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  margin-bottom: 0 !important;
  cursor: pointer;
  font-weight: 500 !important;
}
.checkbox-label input { width: auto !important; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.review-detail-modal .rd-header {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
}
.rd-cover { width: 120px; height: 170px; object-fit: cover; border-radius: var(--radius-sm); box-shadow: var(--shadow-md); flex-shrink: 0; }
.rd-info h4 { font-size: 22px; margin-bottom: 8px; }
.rd-book { color: var(--accent); margin-bottom: 10px; font-size: 14px; }
.rd-rating { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.rd-rating .star { filter: grayscale(1); opacity: 0.3; font-size: 18px; }
.rd-rating .star.filled { filter: none; opacity: 1; }
.rd-author { font-size: 13px; color: var(--text-secondary); }
.rd-body {
  padding: 20px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  line-height: 1.9;
  font-size: 15px;
  color: var(--text-primary);
}
</style>
