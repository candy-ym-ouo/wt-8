<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">创作者合作管理</h1>
      <p class="page-subtitle">管理合作项目、审核申请与数据统计</p>
    </div>

    <div class="admin-tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="['admin-tab', { active: currentTab === t.value }]"
        @click="switchTab(t.value)"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
        <span v-if="t.value === 'applications' && stats.pendingApplications > 0" class="tab-badge">
          {{ stats.pendingApplications }}
        </span>
        <span v-if="t.value === 'review' && stats.pendingReviewCollaborations > 0" class="tab-badge">
          {{ stats.pendingReviewCollaborations }}
        </span>
      </button>
    </div>

    <div v-if="currentTab === 'overview'" class="section">
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalCollaborations }}</div>
            <div class="stat-label">合作项目总数</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #d48806;">{{ stats.pendingReviewCollaborations }}</div>
            <div class="stat-label">待审核项目</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.publishedCollaborations }}</div>
            <div class="stat-label">已发布项目</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">❌</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #cf1322;">{{ stats.rejectedCollaborations }}</div>
            <div class="stat-label">已驳回项目</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">�</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalApplications }}</div>
            <div class="stat-label">申请总数</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.approvalRate }}%</div>
            <div class="stat-label">审核通过率</div>
          </div>
        </div>
      </div>

      <div v-if="activeCollaborations.length > 0" class="card" style="margin-top: 24px; padding: 20px 24px;">
        <h3 class="font-semibold" style="margin-bottom: 16px;">🔥 进行中的合作项目</h3>
        <div class="active-list">
          <router-link
            v-for="c in activeCollaborations"
            :key="c.id"
            :to="`/collaborations/${c.id}`"
            class="active-item"
          >
            <div class="active-title font-medium">{{ c.title }}</div>
            <div class="active-stats">
              <span>👥 {{ c._count.applications }} 人申请</span>
            </div>
          </router-link>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'collaborations'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            :class="['btn', statusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="statusFilter = f.value; loadCollaborations(1)"
          >
            {{ f.label }}
          </button>
        </div>
        <button class="btn btn-primary btn-sm" @click="openCollabForm()">+ 新建合作</button>
      </div>

      <div class="search-box" style="margin-bottom: 16px;">
        <input
          v-model="searchKeyword"
          type="text"
          class="form-input"
          placeholder="搜索合作标题..."
          @input="debouncedSearch"
        >
      </div>

      <div v-if="loadingCollaborations" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="collaborations.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">🤝</div>
        <div class="empty-state-text">暂无合作项目</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>封面</th>
              <th>标题</th>
              <th>分类</th>
              <th>报酬</th>
              <th>申请数</th>
              <th>状态</th>
              <th>浏览</th>
              <th>排序</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in collaborations" :key="c.id">
              <td>
                <div v-if="c.coverImage" class="thumb-cover" :style="{ backgroundImage: `url(${c.coverImage})` }"></div>
                <div v-else class="thumb-cover thumb-placeholder">🤝</div>
              </td>
              <td class="font-medium">{{ c.title }}</td>
              <td><span class="tag">{{ getCategoryLabel(c.category) }}</span></td>
              <td class="text-sm">{{ c.compensation || '-' }}</td>
              <td class="text-sm">{{ c.applicationCount }}</td>
              <td>
                <span :class="['badge', getStatusBadgeClass(c.status)]">
                  {{ statusLabel(c.status) }}
                </span>
              </td>
              <td class="text-sm">{{ c.viewCount }}</td>
              <td>
                <input
                  v-model.number="c.sortOrder"
                  type="number"
                  class="form-input"
                  style="width: 60px; padding: 4px 8px; font-size: 12px;"
                  @blur="updateSortOrder(c)"
                  min="0"
                >
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openCollabForm(c)">编辑</button>
                <button v-if="c.status === 'PENDING_REVIEW'" class="btn btn-primary btn-sm" @click="openReviewCollabModal(c, 'APPROVE')">✅ 通过</button>
                <button v-if="c.status === 'PENDING_REVIEW'" class="btn btn-secondary btn-sm" @click="openReviewCollabModal(c, 'REJECT')">❌ 驳回</button>
                <button v-if="c.status === 'DRAFT'" class="btn btn-ghost btn-sm" @click="publishCollab(c)">发布</button>
                <button v-if="c.status === 'PUBLISHED'" class="btn btn-ghost btn-sm" @click="unpublishCollab(c)">下架</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteCollab(c)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page === 1" @click="loadCollaborations(page - 1)">←</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="page === totalPages" @click="loadCollaborations(page + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'applications'" class="section">
      <div class="filter-tabs flex gap-sm mb">
        <button
          v-for="f in applicationStatusFilters"
          :key="f.value"
          :class="['btn', appStatusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
          @click="appStatusFilter = f.value; loadApplications(1)"
        >
          {{ f.label }}
          <span v-if="f.value === 'PENDING' && stats.pendingApplications > 0" class="tab-badge-sm">
            {{ stats.pendingApplications }}
          </span>
        </button>
      </div>

      <div v-if="loadingApplications" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="applications.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">暂无申请记录</div>
      </div>
      <div v-else class="application-list">
        <div v-for="app in applications" :key="app.id" class="application-card card">
          <div class="app-header">
            <div class="app-user">
              <img :src="app.user?.avatar" class="app-avatar">
              <div>
                <div class="app-username font-medium">{{ app.user?.username }}</div>
                <div class="app-email text-sm text-muted">{{ app.user?.email }}</div>
              </div>
            </div>
            <span :class="['status-badge', `status-${app.status.toLowerCase()}`]">
              {{ getStatusText(app.status) }}
            </span>
          </div>

          <div class="app-collab-title">
            📋 <router-link :to="`/collaborations/${app.collaboration?.id}`" class="link">
              {{ app.collaboration?.title }}
            </router-link>
          </div>

          <div class="app-body">
            <div v-if="app.portfolio" class="app-info-row">
              <span class="info-label">作品集</span>
              <a :href="app.portfolio" target="_blank" class="info-link">{{ app.portfolio }}</a>
            </div>
            <div v-if="app.skills" class="app-info-row">
              <span class="info-label">技能</span>
              <span class="info-value">{{ app.skills }}</span>
            </div>
            <div v-if="app.motivation" class="app-info-row">
              <span class="info-label">动机</span>
              <span class="info-value">{{ app.motivation }}</span>
            </div>
            <div v-if="app.contactInfo" class="app-info-row">
              <span class="info-label">联系方式</span>
              <span class="info-value">{{ app.contactInfo }}</span>
            </div>
          </div>

          <div v-if="app.status === 'REJECTED' && app.rejectionReason" class="app-rejection">
            <span class="rejection-label">驳回原因：</span>{{ app.rejectionReason }}
          </div>

          <div v-if="app.reviewedAt" class="app-review">
            审核时间：{{ formatDateTime(app.reviewedAt) }}
            <span v-if="app.reviewer"> · 审核人：{{ app.reviewer.username }}</span>
          </div>

          <div class="app-footer">
            <span class="text-sm text-muted">申请时间：{{ formatDateTime(app.createdAt) }}</span>
            <div v-if="app.status === 'PENDING'" class="app-actions">
              <button class="btn btn-primary btn-sm" @click="openReviewModal(app, 'APPROVE')">✅ 通过</button>
              <button class="btn btn-secondary btn-sm" @click="openReviewModal(app, 'REJECT')">❌ 驳回</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="appTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="appPage === 1" @click="loadApplications(appPage - 1)">←</button>
        <span class="page-info">第 {{ appPage }} / {{ appTotalPages }} 页</span>
        <button class="page-btn" :disabled="appPage === appTotalPages" @click="loadApplications(appPage + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'review'" class="section">
      <div class="filter-tabs flex gap-sm mb">
        <button
          class="btn btn-sm"
          :class="reviewStatusFilter === 'PENDING_REVIEW' ? 'btn-primary' : 'btn-secondary'"
          @click="reviewStatusFilter = 'PENDING_REVIEW'; loadReviewCollaborations(1)"
        >
          待审核
          <span v-if="stats.pendingReviewCollaborations > 0" class="tab-badge-sm">{{ stats.pendingReviewCollaborations }}</span>
        </button>
        <button
          class="btn btn-sm"
          :class="reviewStatusFilter === 'REJECTED' ? 'btn-primary' : 'btn-secondary'"
          @click="reviewStatusFilter = 'REJECTED'; loadReviewCollaborations(1)"
        >
          已驳回
        </button>
      </div>

      <div v-if="loadingReview" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="reviewCollaborations.length === 0" class="empty-state card" style="padding: 64px 24px;">
        <div class="empty-state-icon">✅</div>
        <div class="empty-state-text">
          {{ reviewStatusFilter === 'PENDING_REVIEW' ? '暂无可审核的合作招募' : '暂无驳回记录' }}
        </div>
        <div class="empty-hint text-sm text-muted" style="margin-top: 8px;">
          {{ reviewStatusFilter === 'PENDING_REVIEW' ? '新的合作招募提交审核后将出现在这里' : '' }}
        </div>
      </div>
      <div v-else class="review-list">
        <div
          v-for="c in reviewCollaborations"
          :key="c.id"
          class="review-card card"
        >
          <div class="review-header">
            <div class="review-title-row">
              <h3 class="review-title">
                <router-link :to="`/collaborations/${c.id}`" class="link">{{ c.title }}</router-link>
              </h3>
              <span :class="['status-badge', `status-${c.status.toLowerCase().replace('_', '')}`]">
                {{ statusLabel(c.status) }}
              </span>
            </div>
            <div class="review-subtitle">
              <span class="tag">{{ getCategoryLabel(c.category) }}</span>
              <span>·</span>
              <span class="text-muted text-sm">提交时间：{{ formatDateTime(c.createdAt) }}</span>
            </div>
          </div>

          <div class="review-creator">
            <img :src="c.creator?.avatar" class="creator-avatar" style="width:40px;height:40px;border-radius:50%;background:var(--bg-tertiary);">
            <div class="creator-info">
              <div class="font-medium">{{ c.creator?.username }}</div>
              <div class="text-sm text-muted">ID: {{ c.creatorId }} · {{ c.creator?.email }}</div>
            </div>
          </div>

          <div class="review-body">
            <div class="review-description">
              <strong>项目介绍：</strong>
              <div class="desc-content">{{ c.description }}</div>
            </div>
            <div class="review-grid">
              <div class="review-item">
                <span class="review-label">💰 合作报酬</span>
                <span class="review-value">{{ c.compensation || '面议' }}</span>
              </div>
              <div class="review-item" v-if="c.deadline">
                <span class="review-label">⏰ 截止时间</span>
                <span class="review-value">{{ formatDateTime(c.deadline) }}</span>
              </div>
              <div class="review-item">
                <span class="review-label">👥 浏览量</span>
                <span class="review-value">{{ c.viewCount }}</span>
              </div>
            </div>
            <div v-if="c.tags && c.tags.length > 0" class="collab-tags" style="margin-top:12px;">
              <span v-for="tag in c.tags" :key="tag" class="tag">#{{ tag }}</span>
            </div>
          </div>

          <div v-if="c.rejectionReason" class="app-rejection">
            <span class="rejection-label">上次驳回原因：</span>{{ c.rejectionReason }}
            <div class="text-sm" style="margin-top:4px;opacity:0.8;">
              审核人：{{ c.reviewer?.username || '-' }} · {{ formatDateTime(c.reviewedAt) }}
            </div>
          </div>

          <div v-if="reviewStatusFilter === 'PENDING_REVIEW'" class="review-actions">
            <button class="btn btn-primary" @click="openReviewCollabModal(c, 'APPROVE')">✅ 审核通过并发布</button>
            <button class="btn btn-secondary" @click="openReviewCollabModal(c, 'REJECT')">❌ 驳回申请</button>
          </div>
        </div>
      </div>

      <div v-if="reviewTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="reviewPage === 1" @click="loadReviewCollaborations(reviewPage - 1)">←</button>
        <span class="page-info">第 {{ reviewPage }} / {{ reviewTotalPages }} 页</span>
        <button class="page-btn" :disabled="reviewPage === reviewTotalPages" @click="loadReviewCollaborations(reviewPage + 1)">→</button>
      </div>
    </div>

    <div v-if="showCollabForm" class="modal-overlay" @click.self="showCollabForm = false">
      <div class="modal card" style="max-width: 700px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingCollab ? '编辑合作项目' : '新建合作项目' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showCollabForm = false">✕</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <div class="form-group">
            <label class="form-label">合作标题 <span style="color: var(--danger);">*</span></label>
            <input v-model="collabForm.title" type="text" class="form-input" placeholder="例：夏季特辑插画合作" required>
          </div>
          <div class="form-group">
            <label class="form-label">项目介绍 <span style="color: var(--danger);">*</span></label>
            <textarea v-model="collabForm.description" class="form-textarea" rows="4" placeholder="详细介绍合作项目..."></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">分类 <span style="color: var(--danger);">*</span></label>
              <select v-model="collabForm.category" class="form-select">
                <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">{{ cat.icon }} {{ cat.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="collabForm.status" class="form-select">
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">已发布</option>
                <option value="CLOSED">已关闭</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">合作报酬</label>
            <input v-model="collabForm.compensation" type="text" class="form-input" placeholder="例：500-1000元/篇 或 面议">
          </div>
          <div class="form-group">
            <label class="form-label">截止时间</label>
            <input v-model="collabForm.deadline" type="datetime-local" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">封面图片链接</label>
            <input v-model="collabForm.coverImage" type="text" class="form-input" placeholder="https://...">
          </div>
          <div class="form-group">
            <label class="form-label">合作要求</label>
            <textarea v-model="collabForm.requirements" class="form-textarea" rows="3" placeholder="对申请者的要求..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">交付成果</label>
            <textarea v-model="collabForm.deliverables" class="form-textarea" rows="3" placeholder="需要交付的成果..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">标签（逗号分隔）</label>
            <input v-model="collabForm.tagsText" type="text" class="form-input" placeholder="例如: 插画, 设计, 原创">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">排序权重</label>
              <input v-model.number="collabForm.sortOrder" type="number" class="form-input" min="0">
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="collabForm.isFeatured">
                <span>设为精选推荐</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCollabForm = false">取消</button>
          <button class="btn btn-primary" @click="submitCollabForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingCollab ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showReviewModal" class="modal-overlay" @click.self="showReviewModal = false">
      <div class="modal card" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ reviewAction === 'APPROVE' ? '通过合作申请' : '驳回合作申请' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showReviewModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">申请人</label>
            <div class="form-static">{{ reviewingApplication?.user?.username }} - {{ reviewingApplication?.collaboration?.title }}</div>
          </div>
          <div v-if="reviewAction === 'REJECT'" class="form-group">
            <label class="form-label">驳回原因 <span style="color: var(--danger);">*</span></label>
            <textarea v-model="reviewForm.reason" class="form-textarea" rows="3" placeholder="请填写驳回原因..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">审核备注 <span class="optional">可选</span></label>
            <textarea v-model="reviewForm.feedback" class="form-textarea" rows="2" placeholder="给申请人的额外说明..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showReviewModal = false">取消</button>
          <button class="btn btn-primary" @click="submitReview" :disabled="submittingReview">
            {{ submittingReview ? '处理中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showReviewCollabModal" class="modal-overlay" @click.self="showReviewCollabModal = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ reviewCollabAction === 'APPROVE' ? '审核通过合作招募' : '驳回合作招募' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showReviewCollabModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">合作项目</label>
            <div class="form-static">{{ reviewingCollaboration?.title }}</div>
          </div>
          <div class="form-group">
            <label class="form-label">发布者</label>
            <div class="form-static">{{ reviewingCollaboration?.creator?.username }}</div>
          </div>
          <div v-if="reviewCollabAction === 'REJECT'" class="form-group">
            <label class="form-label">驳回原因 <span style="color: var(--danger);">*</span></label>
            <textarea
              v-model="reviewCollabForm.reason"
              class="form-textarea"
              rows="3"
              placeholder="请填写驳回原因，发布者将看到此说明以便修改..."
            ></textarea>
          </div>
          <div v-else class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="reviewCollabForm.featured">
              <span>同时设为精选推荐</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showReviewCollabModal = false">取消</button>
          <button class="btn btn-primary" @click="submitCollabReview" :disabled="submittingCollabReview">
            {{ submittingCollabReview ? '处理中...' : '确认' }}
          </button>
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
  { value: 'overview', label: '数据概览', icon: '📊' },
  { value: 'collaborations', label: '合作项目', icon: '🤝' },
  { value: 'applications', label: '申请审核', icon: '📝' },
  { value: 'review', label: '招募审核', icon: '✅' }
]

const currentTab = ref('overview')
const stats = ref({
  totalCollaborations: 0,
  publishedCollaborations: 0,
  draftCollaborations: 0,
  closedCollaborations: 0,
  pendingReviewCollaborations: 0,
  rejectedCollaborations: 0,
  totalApplications: 0,
  pendingApplications: 0,
  approvedApplications: 0,
  rejectedApplications: 0,
  cancelledApplications: 0,
  approvalRate: 0
})
const activeCollaborations = ref([])

const statusFilters = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'PENDING_REVIEW' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '草稿', value: 'DRAFT' },
  { label: '未通过', value: 'REJECTED' },
  { label: '已关闭', value: 'CLOSED' }
]

const applicationStatusFilters = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '未通过', value: 'REJECTED' },
  { label: '已取消', value: 'CANCELLED' }
]

const categoryOptions = [
  { id: 'WRITING', name: '撰稿', icon: '✍️' },
  { id: 'DESIGN', name: '设计', icon: '🎨' },
  { id: 'ILLUSTRATION', name: '插画', icon: '🖼️' },
  { id: 'PHOTOGRAPHY', name: '摄影', icon: '📷' },
  { id: 'TRANSLATION', name: '翻译', icon: '🌐' },
  { id: 'EDITING', name: '编辑', icon: '📝' },
  { id: 'OTHER', name: '其他', icon: '✨' }
]

const collaborations = ref([])
const loadingCollaborations = ref(false)
const statusFilter = ref('all')
const searchKeyword = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 10
const totalPages = ref(1)

const applications = ref([])
const loadingApplications = ref(false)
const appStatusFilter = ref('all')
const appPage = ref(1)
const appTotal = ref(0)
const appTotalPages = ref(1)

const showCollabForm = ref(false)
const editingCollab = ref(null)
const submitting = ref(false)
const collabForm = ref(getEmptyForm())

const showReviewModal = ref(false)
const reviewingApplication = ref(null)
const reviewAction = ref('APPROVE')
const submittingReview = ref(false)
const reviewForm = ref({ reason: '', feedback: '' })

const showReviewCollabModal = ref(false)
const reviewingCollaboration = ref(null)
const reviewCollabAction = ref('APPROVE')
const submittingCollabReview = ref(false)
const reviewCollabForm = ref({ reason: '', featured: false })

const reviewCollaborations = ref([])
const loadingReview = ref(false)
const reviewStatusFilter = ref('PENDING_REVIEW')
const reviewPage = ref(1)
const reviewTotal = ref(0)
const reviewTotalPages = ref(1)

function getEmptyForm() {
  return {
    title: '',
    description: '',
    category: 'OTHER',
    compensation: '',
    deadline: '',
    coverImage: '',
    requirements: '',
    deliverables: '',
    tagsText: '',
    sortOrder: 0,
    isFeatured: false,
    status: 'DRAFT'
  }
}

const getCategoryLabel = (cat) => {
  const found = categoryOptions.find(c => c.id === cat)
  return found ? `${found.icon} ${found.name}` : cat
}

const statusLabel = (s) => {
  const map = { DRAFT: '草稿', PENDING_REVIEW: '待审核', PUBLISHED: '已发布', REJECTED: '未通过', CLOSED: '已关闭' }
  return map[s] || s
}

const getStatusText = (status) => {
  const map = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '未通过',
    CANCELLED: '已取消'
  }
  return map[status] || status
}

const getStatusBadgeClass = (s) => {
  const map = {
    DRAFT: 'badge-pending',
    PENDING_REVIEW: 'badge-pending',
    PUBLISHED: 'badge-approved',
    REJECTED: 'badge-rejected',
    CLOSED: 'badge-cancelled'
  }
  return map[s] || 'badge-pending'
}

const formatDateTime = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const switchTab = (t) => {
  currentTab.value = t
  if (t === 'overview') loadStats()
  if (t === 'collaborations') loadCollaborations(1)
  if (t === 'applications') loadApplications(1)
  if (t === 'review') loadReviewCollaborations(1)
}

const loadStats = async () => {
  try {
    const res = await api.get('/admin/collaborations/stats')
    stats.value = res.stats
    activeCollaborations.value = res.activeCollaborations
  } catch (e) {
    console.error(e)
  }
}

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadCollaborations(1), 400)
}

const loadCollaborations = async (newPage = 1) => {
  loadingCollaborations.value = true
  page.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: pageSize })
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value)
    if (searchKeyword.value) params.set('keyword', searchKeyword.value)
    const res = await api.get(`/collaborations?${params}`)
    collaborations.value = res.collaborations
    total.value = res.total
    totalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingCollaborations.value = false
  }
}

const loadApplications = async (newPage = 1) => {
  loadingApplications.value = true
  appPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 10 })
    if (appStatusFilter.value !== 'all') params.set('status', appStatusFilter.value)
    const res = await api.get(`/collaboration-applications?${params}`)
    applications.value = res.applications
    appTotal.value = res.total
    appTotalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingApplications.value = false
  }
}

const openCollabForm = (c = null) => {
  editingCollab.value = c
  if (c) {
    collabForm.value = {
      title: c.title,
      description: c.description,
      category: c.category,
      compensation: c.compensation || '',
      deadline: c.deadline ? new Date(c.deadline).toISOString().slice(0, 16) : '',
      coverImage: c.coverImage || '',
      requirements: c.requirements || '',
      deliverables: c.deliverables || '',
      tagsText: (c.tags || []).join(', '),
      sortOrder: c.sortOrder,
      isFeatured: c.isFeatured,
      status: c.status
    }
  } else {
    collabForm.value = getEmptyForm()
  }
  showCollabForm.value = true
}

const submitCollabForm = async () => {
  if (!collabForm.value.title || !collabForm.value.description) {
    showToast('请填写标题和介绍', 'warning')
    return
  }
  submitting.value = true
  try {
    const tags = collabForm.value.tagsText
      ? collabForm.value.tagsText.split(',').map(t => t.trim()).filter(Boolean)
      : []
    const data = { ...collabForm.value, tags }
    if (editingCollab.value) {
      await api.put(`/collaborations/${editingCollab.value.id}`, data)
      showToast('更新成功', 'success')
    } else {
      await api.post('/collaborations', data)
      showToast('创建成功', 'success')
    }
    showCollabForm.value = false
    loadCollaborations(page.value)
    loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const updateSortOrder = async (c) => {
  try {
    await api.put(`/collaborations/${c.id}`, { sortOrder: c.sortOrder })
    showToast('排序已更新', 'success')
  } catch (e) {
    showToast(e.error || '更新失败', 'error')
  }
}

const publishCollab = async (c) => {
  try {
    await api.post(`/collaborations/${c.id}/publish`)
    c.status = 'PUBLISHED'
    showToast('已发布', 'success')
    loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const unpublishCollab = async (c) => {
  try {
    await api.post(`/collaborations/${c.id}/unpublish`)
    c.status = 'DRAFT'
    showToast('已下架', 'success')
    loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const deleteCollab = async (c) => {
  if (!confirm(`确定要删除合作项目"${c.title}"吗？相关申请也将被删除。`)) return
  try {
    await api.delete(`/collaborations/${c.id}`)
    collaborations.value = collaborations.value.filter(x => x.id !== c.id)
    showToast('已删除', 'success')
    loadStats()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const openReviewModal = (app, action) => {
  reviewingApplication.value = app
  reviewAction.value = action
  reviewForm.value = { reason: '', feedback: '' }
  showReviewModal.value = true
}

const submitReview = async () => {
  if (reviewAction.value === 'REJECT' && !reviewForm.value.reason) {
    showToast('请填写驳回原因', 'warning')
    return
  }
  submittingReview.value = true
  try {
    await api.post(`/collaboration-applications/${reviewingApplication.value.id}/review`, {
      action: reviewAction.value,
      reason: reviewForm.value.reason,
      feedback: reviewForm.value.feedback
    })
    showReviewModal.value = false
    showToast(reviewAction.value === 'APPROVE' ? '已通过审核' : '已驳回申请', 'success')
    loadApplications(appPage.value)
    loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submittingReview.value = false
  }
}

const loadReviewCollaborations = async (newPage = 1) => {
  loadingReview.value = true
  reviewPage.value = newPage
  try {
    const params = new URLSearchParams({ page: newPage, limit: 10, status: reviewStatusFilter.value })
    const res = await api.get(`/collaborations?${params}`)
    reviewCollaborations.value = res.collaborations
    reviewTotal.value = res.total
    reviewTotalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingReview.value = false
  }
}

const openReviewCollabModal = (c, action) => {
  reviewingCollaboration.value = c
  reviewCollabAction.value = action
  reviewCollabForm.value = { reason: '', featured: false }
  showReviewCollabModal.value = true
}

const submitCollabReview = async () => {
  if (reviewCollabAction.value === 'REJECT' && !reviewCollabForm.value.reason) {
    showToast('请填写驳回原因', 'warning')
    return
  }
  submittingCollabReview.value = true
  try {
    if (reviewCollabAction.value === 'APPROVE') {
      if (reviewCollabForm.value.featured) {
        await api.put(`/collaborations/${reviewingCollaboration.value.id}`, { isFeatured: true })
      }
      await api.post(`/collaborations/${reviewingCollaboration.value.id}/publish`)
      showToast('已通过审核并发布', 'success')
    } else {
      await api.post(`/collaborations/${reviewingCollaboration.value.id}/reject`, {
        reason: reviewCollabForm.value.reason
      })
      showToast('已驳回', 'success')
    }
    showReviewCollabModal.value = false
    loadReviewCollaborations(reviewPage.value)
    loadCollaborations(page.value)
    loadStats()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submittingCollabReview.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.mb { margin-bottom: 16px; }
.mb-sm { margin-bottom: 8px; }
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.gap-sm { gap: 8px; }
.text-sm { font-size: 13px; }
.text-muted { color: var(--text-tertiary); }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.link { color: var(--accent); }
.link:hover { text-decoration: underline; }
.optional { font-weight: 400; color: var(--text-tertiary); font-size: 12px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.stat-card {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-icon { font-size: 32px; }
.stat-value { font-size: 24px; font-weight: 700; }
.stat-label { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

.active-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.active-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}
.active-item:hover { background: var(--accent-light); }
.active-title { font-size: 14px; color: var(--text-primary); }
.active-stats { font-size: 12px; color: var(--text-tertiary); }

.admin-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 6px;
}
.admin-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
  position: relative;
}
.admin-tab:hover { color: var(--text-primary); background: var(--bg-tertiary); }
.admin-tab.active { background: var(--accent); color: #fff; }
.tab-icon { font-size: 16px; }
.tab-badge {
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 100px;
  font-weight: 600;
}
.tab-badge-sm {
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 100px;
  margin-left: 4px;
}

.thumb-cover {
  width: 56px;
  height: 36px;
  border-radius: 6px;
  background: var(--bg-tertiary);
  background-size: cover;
  background-position: center;
}
.thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.application-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.application-card { padding: 20px 24px; }

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 14px;
}
.app-user { display: flex; align-items: center; gap: 12px; }
.app-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--bg-tertiary); }
.app-email { margin-top: 2px; }

.status-badge {
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}
.status-pending { background: #fff7e6; color: #d48806; }
.status-approved { background: #f6ffed; color: #52c41a; }
.status-rejected { background: #fff1f0; color: #cf1322; }
.status-cancelled { background: #f5f5f5; color: #8c8c8c; }

.app-collab-title {
  font-size: 14px;
  margin-bottom: 12px;
}

.app-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}
.app-info-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
}
.info-label {
  min-width: 64px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.info-value { color: var(--text-primary); flex: 1; line-height: 1.6; }
.info-link { color: var(--accent); text-decoration: underline; word-break: break-all; }

.app-rejection {
  padding: 10px 14px;
  background: var(--danger-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--danger);
  margin-bottom: 12px;
}
.rejection-label { font-weight: 500; }

.app-review {
  padding: 8px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.app-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid var(--border-light);
}
.app-actions { display: flex; gap: 8px; }

.form-static {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-primary);
}

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}
.badge-approved { background: #f6ffed; color: #52c41a; }
.badge-pending { background: #fff7e6; color: #d48806; }
.badge-rejected { background: #fff1f0; color: #cf1322; }
.badge-cancelled { background: #f5f5f5; color: #8c8c8c; }

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 100px;
}

.danger-btn { color: var(--danger); }

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}
.checkbox-label input { width: 16px; height: 16px; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal {
  width: 100%;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-light);
}
.modal-body { padding: 24px; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
}
.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-primary);
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.page-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-secondary); }

.review-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.review-card {
  padding: 24px;
}
.review-header {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 16px;
}
.review-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}
.review-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
.review-subtitle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.review-creator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
}
.creator-info { font-size: 14px; }

.review-body { font-size: 14px; line-height: 1.7; }
.review-description { margin-bottom: 16px; }
.desc-content {
  margin-top: 6px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  white-space: pre-wrap;
}
.review-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.review-item {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.review-label { font-size: 12px; color: var(--text-tertiary); }
.review-value { font-size: 14px; font-weight: 500; }

.review-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.filter-tabs { display: flex; flex-wrap: wrap; }
</style>
