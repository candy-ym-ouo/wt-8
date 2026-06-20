<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">作者访谈管理</h1>
      <p class="page-subtitle">管理访谈稿、关联作品、专题推荐与内容排期</p>
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
      </button>
    </div>

    <div v-if="currentTab === 'interviews'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            :class="['btn', statusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="statusFilter = f.value; loadInterviews(1)"
          >
            {{ f.label }}
          </button>
        </div>
        <button class="btn btn-primary btn-sm" @click="openInterviewForm()">+ 新建访谈</button>
      </div>

      <div class="search-box" style="margin-bottom: 16px;">
        <input
          v-model="searchKeyword"
          type="text"
          class="form-input"
          placeholder="搜索访谈标题、作者..."
          @input="debouncedSearch"
        >
      </div>

      <div v-if="loadingInterviews" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="interviews.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-text">暂无访谈</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>封面</th>
              <th>标题</th>
              <th>作者</th>
              <th>分类</th>
              <th>关联作品</th>
              <th>状态</th>
              <th>浏览</th>
              <th>评论</th>
              <th>排序</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in interviews" :key="item.id">
              <td><img :src="item.coverImage" class="thumb-cover"></td>
              <td class="font-medium">{{ item.title }}</td>
              <td class="text-sm">{{ item.authorName }}</td>
              <td><span class="tag">{{ categoryLabel(item.category) }}</span></td>
              <td class="text-sm">{{ item.zineCount }}</td>
              <td>
                <span :class="['badge', statusBadgeClass(item.status)]">
                  {{ statusLabel(item.status) }}
                </span>
              </td>
              <td class="text-sm">{{ item.viewCount }}</td>
              <td class="text-sm">{{ item.commentCount }}</td>
              <td>
                <input
                  v-model.number="item.sortOrder"
                  type="number"
                  class="form-input"
                  style="width: 60px; padding: 4px 8px; font-size: 12px;"
                  @blur="updateSortOrder(item)"
                  min="0"
                >
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openInterviewForm(item)">编辑</button>
                <button class="btn btn-ghost btn-sm" @click="openZineManager(item)">作品管理</button>
                <button class="btn btn-ghost btn-sm" @click="openScheduleManager(item)">排期</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteInterview(item)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page === 1" @click="loadInterviews(page - 1)">←</button>
        <span class="page-info">{{ page }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="page === totalPages" @click="loadInterviews(page + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'featured'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="section-subtitle">专题推荐位</h3>
        <button class="btn btn-primary btn-sm" @click="openFeaturedForm()">+ 添加推荐</button>
      </div>

      <div v-if="loadingFeatured" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="featuredList.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">⭐</div>
        <div class="empty-state-text">暂无专题推荐</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>封面</th>
              <th>访谈标题</th>
              <th>Banner标题</th>
              <th>排序</th>
              <th>状态</th>
              <th>有效期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in featuredList" :key="item.id">
              <td><img :src="item.bannerImage || item.interview?.coverImage" class="thumb-cover"></td>
              <td class="font-medium">{{ item.interview?.title }}</td>
              <td class="text-sm">{{ item.bannerTitle || '-' }}</td>
              <td>
                <input
                  v-model.number="item.sortOrder"
                  type="number"
                  class="form-input"
                  style="width: 60px; padding: 4px 8px; font-size: 12px;"
                  @blur="updateFeaturedSortOrder(item)"
                  min="0"
                >
              </td>
              <td>
                <span :class="['badge', item.isActive ? 'badge-approved' : 'badge-pending']">
                  {{ item.isActive ? '启用' : '停用' }}
                </span>
              </td>
              <td class="text-sm text-muted">
                {{ formatDate(item.startDate) || '不限' }} ~ {{ formatDate(item.endDate) || '不限' }}
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openFeaturedForm(item)">编辑</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteFeatured(item)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'comments'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in commentStatusFilters"
            :key="f.value"
            :class="['btn', commentStatusFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="commentStatusFilter = f.value; loadComments(1)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <div v-if="loadingComments" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="comments.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">💬</div>
        <div class="empty-state-text">暂无评论</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>访谈</th>
              <th>评论内容</th>
              <th>状态</th>
              <th>置顶</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in comments" :key="c.id">
              <td>
                <div class="flex items-center gap-sm">
                  <img :src="c.user?.avatar" class="avatar-sm">
                  <span class="text-sm">{{ c.user?.username }}</span>
                </div>
              </td>
              <td class="text-sm">{{ c.interviewTitle || '-' }}</td>
              <td class="text-sm" style="max-width: 300px;">
                <div class="text-ellipsis-2">{{ c.content }}</div>
              </td>
              <td>
                <span :class="['badge', statusBadgeClass(c.status)]">
                  {{ commentStatusLabel(c.status) }}
                </span>
              </td>
              <td>
                <button
                  :class="['btn', c.isPinned ? 'btn-primary' : 'btn-secondary', 'btn-xs']"
                  @click="toggleCommentPin(c)"
                >
                  {{ c.isPinned ? '已置顶' : '置顶' }}
                </button>
              </td>
              <td class="text-sm text-muted">{{ formatDate(c.createdAt) }}</td>
              <td>
                <button v-if="c.status === 'APPROVED'" class="btn btn-ghost btn-sm" @click="updateCommentStatus(c, 'PENDING')">隐藏</button>
                <button v-else class="btn btn-ghost btn-sm" @click="updateCommentStatus(c, 'APPROVED')">通过</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteComment(c)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="commentTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="commentPage === 1" @click="loadComments(commentPage - 1)">←</button>
        <span class="page-info">{{ commentPage }} / {{ commentTotalPages }}</span>
        <button class="page-btn" :disabled="commentPage === commentTotalPages" @click="loadComments(commentPage + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'schedules'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="section-subtitle">内容排期管理</h3>
        <button class="btn btn-primary btn-sm" @click="openScheduleForm()">+ 新建排期</button>
      </div>

      <div class="filters card" style="padding: 16px; margin-bottom: 16px;">
        <div class="flex gap-sm flex-wrap">
          <select v-model="scheduleStatusFilter" class="form-select" style="width: 140px;" @change="loadSchedules(1)">
            <option value="all">全部状态</option>
            <option value="PENDING">待发布</option>
            <option value="PUBLISHED">已发布</option>
            <option value="CANCELLED">已取消</option>
          </select>
          <input v-model="scheduleStartDate" type="date" class="form-input" style="width: auto;" @change="loadSchedules(1)">
          <span class="text-muted" style="align-self: center;">至</span>
          <input v-model="scheduleEndDate" type="date" class="form-input" style="width: auto;" @change="loadSchedules(1)">
        </div>
      </div>

      <div v-if="loadingSchedules" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="schedules.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📅</div>
        <div class="empty-state-text">暂无排期</div>
      </div>
      <div v-else class="schedule-list">
        <div v-for="s in schedules" :key="s.id" class="schedule-item card">
          <div class="schedule-time">
            <div class="schedule-date">{{ formatScheduleDate(s.scheduledAt) }}</div>
            <div class="schedule-weekday">{{ formatScheduleWeekday(s.scheduledAt) }}</div>
          </div>
          <div class="schedule-info">
            <div class="schedule-title">{{ s.title }}</div>
            <div class="schedule-desc" v-if="s.description">{{ s.description }}</div>
            <div class="schedule-meta">
              <span class="text-sm text-muted">访谈：{{ s.interview?.title || '-' }}</span>
              <span class="text-sm text-muted">创建者：{{ s.creator?.username || '-' }}</span>
            </div>
            <div class="schedule-note" v-if="s.note">
              <span class="note-label">备注：</span>{{ s.note }}
            </div>
          </div>
          <div class="schedule-status">
            <span :class="['badge', scheduleStatusBadge(s.status)]">{{ scheduleStatusLabel(s.status) }}</span>
          </div>
          <div class="schedule-actions">
            <button class="btn btn-ghost btn-sm" @click="openScheduleForm(s)">编辑</button>
            <button class="btn btn-ghost btn-sm danger-btn" @click="deleteSchedule(s)">删除</button>
          </div>
        </div>
      </div>

      <div v-if="scheduleTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="schedulePage === 1" @click="loadSchedules(schedulePage - 1)">←</button>
        <span class="page-info">{{ schedulePage }} / {{ scheduleTotalPages }}</span>
        <button class="page-btn" :disabled="schedulePage === scheduleTotalPages" @click="loadSchedules(schedulePage + 1)">→</button>
      </div>
    </div>

    <div v-if="showInterviewForm" class="modal-overlay" @click.self="closeInterviewForm">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingInterview?.id ? '编辑访谈' : '新建访谈' }}</h3>
          <button class="modal-close" @click="closeInterviewForm">×</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">访谈标题 *</label>
              <input v-model="interviewForm.title" type="text" class="form-input" placeholder="请输入访谈标题">
            </div>
            <div class="form-group">
              <label class="form-label">分类</label>
              <select v-model="interviewForm.category" class="form-select">
                <option value="CREATOR">创作者专访</option>
                <option value="DESIGNER">设计师访谈</option>
                <option value="PHOTOGRAPHER">摄影师对话</option>
                <option value="WRITER">作家笔谈</option>
                <option value="ARTIST">艺术家专访</option>
                <option value="PUBLISHER">出版人访谈</option>
                <option value="OTHER">其他</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">作者姓名 *</label>
              <input v-model="interviewForm.authorName" type="text" class="form-input" placeholder="请输入作者姓名">
            </div>
            <div class="form-group">
              <label class="form-label">采访者</label>
              <input v-model="interviewForm.interviewerName" type="text" class="form-input" placeholder="请输入采访者姓名">
            </div>
            <div class="form-group full-width">
              <label class="form-label">封面图片</label>
              <input v-model="interviewForm.coverImage" type="text" class="form-input" placeholder="请输入封面图片URL">
            </div>
            <div class="form-group full-width">
              <label class="form-label">访谈简介</label>
              <textarea v-model="interviewForm.description" class="form-input" rows="2" placeholder="请输入访谈简介"></textarea>
            </div>
            <div class="form-group full-width">
              <label class="form-label">访谈正文</label>
              <textarea v-model="interviewForm.content" class="form-input" rows="8" placeholder="请输入访谈正文内容"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">作者头像</label>
              <input v-model="interviewForm.authorAvatar" type="text" class="form-input" placeholder="作者头像URL">
            </div>
            <div class="form-group">
              <label class="form-label">关联用户ID</label>
              <input v-model.number="interviewForm.authorUserId" type="number" class="form-input" placeholder="可选，关联平台用户">
            </div>
            <div class="form-group full-width">
              <label class="form-label">作者简介</label>
              <textarea v-model="interviewForm.authorBio" class="form-input" rows="2" placeholder="请输入作者简介"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">标签（逗号分隔）</label>
              <input v-model="interviewForm.tagsInput" type="text" class="form-input" placeholder="标签1, 标签2">
            </div>
            <div class="form-group">
              <label class="form-label">发布日期</label>
              <input v-model="interviewForm.publishDate" type="date" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="interviewForm.status" class="form-select">
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">已发布</option>
                <option value="REJECTED">已驳回</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">排序</label>
              <input v-model.number="interviewForm.sortOrder" type="number" class="form-input" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">是否精选</label>
              <select v-model="interviewForm.isFeatured" class="form-select">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeInterviewForm">取消</button>
          <button class="btn btn-primary" @click="saveInterview" :disabled="savingInterview">
            {{ savingInterview ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showZineManager" class="modal-overlay" @click.self="closeZineManager">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">管理关联作品 - {{ managingInterview?.title }}</h3>
          <button class="modal-close" @click="closeZineManager">×</button>
        </div>
        <div class="modal-body">
          <div class="mb flex gap-sm">
            <input
              v-model="zineSearch"
              type="text"
              class="form-input"
              style="flex: 1;"
              placeholder="搜索刊物..."
              @input="debouncedZineSearch"
            >
            <button class="btn btn-primary btn-sm" @click="addSelectedZines">添加选中</button>
          </div>

          <div class="search-results" v-if="searchZines.length > 0">
            <h4 class="mb-sm">搜索结果</h4>
            <div class="zine-search-list">
              <label v-for="z in searchZines" :key="z.id" class="zine-search-item">
                <input type="checkbox" :value="z.id" v-model="selectedZineIds">
                <img :src="z.coverImage" class="zine-thumb">
                <div class="zine-search-info">
                  <div class="zine-search-title">{{ z.title }}</div>
                  <div class="zine-search-author">{{ z.author?.username }}</div>
                </div>
              </label>
            </div>
          </div>

          <div style="margin-top: 20px;">
            <h4 class="mb-sm">已关联作品 ({{ interviewZines.length }})</h4>
            <div v-if="loadingInterviewZines" class="empty-state"><div class="empty-state-icon">⏳</div></div>
            <div v-else-if="interviewZines.length === 0" class="empty-state card" style="padding: 30px;">
              <div class="empty-state-icon">📚</div>
              <div class="empty-state-text">暂无关联作品</div>
            </div>
            <div v-else class="admin-list">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>封面</th>
                    <th>刊物</th>
                    <th>推荐语</th>
                    <th>排序</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="iz in interviewZines" :key="iz.id">
                    <td><img :src="iz.zine?.coverImage" class="thumb-cover"></td>
                    <td class="text-sm font-medium">{{ iz.zine?.title }}</td>
                    <td>
                      <input
                        v-model="iz.recommendNote"
                        type="text"
                        class="form-input"
                        style="width: 200px; font-size: 12px;"
                        @blur="updateInterviewZine(iz)"
                        placeholder="推荐语"
                      >
                    </td>
                    <td>
                      <input
                        v-model.number="iz.sortOrder"
                        type="number"
                        class="form-input"
                        style="width: 60px; font-size: 12px;"
                        @blur="updateInterviewZine(iz)"
                        min="0"
                      >
                    </td>
                    <td>
                      <button class="btn btn-ghost btn-sm danger-btn" @click="removeInterviewZine(iz)">移除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeZineManager">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="showFeaturedForm" class="modal-overlay" @click.self="closeFeaturedForm">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingFeatured?.id ? '编辑专题推荐' : '添加专题推荐' }}</h3>
          <button class="modal-close" @click="closeFeaturedForm">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">选择访谈 *</label>
            <select v-model="featuredForm.interviewId" class="form-select">
              <option :value="null">请选择访谈</option>
              <option v-for="i in allInterviews" :key="i.id" :value="i.id">{{ i.title }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Banner图片</label>
            <input v-model="featuredForm.bannerImage" type="text" class="form-input" placeholder="Banner图片URL">
          </div>
          <div class="form-group">
            <label class="form-label">Banner标题</label>
            <input v-model="featuredForm.bannerTitle" type="text" class="form-input" placeholder="自定义标题">
          </div>
          <div class="form-group">
            <label class="form-label">Banner副标题</label>
            <input v-model="featuredForm.bannerSubtitle" type="text" class="form-input" placeholder="自定义副标题">
          </div>
          <div class="form-group">
            <label class="form-label">排序</label>
            <input v-model.number="featuredForm.sortOrder" type="number" class="form-input" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">开始日期</label>
            <input v-model="featuredForm.startDate" type="date" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">结束日期</label>
            <input v-model="featuredForm.endDate" type="date" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">状态</label>
            <select v-model="featuredForm.isActive" class="form-select">
              <option :value="true">启用</option>
              <option :value="false">停用</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeFeaturedForm">取消</button>
          <button class="btn btn-primary" @click="saveFeatured" :disabled="savingFeatured">
            {{ savingFeatured ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showScheduleForm" class="modal-overlay" @click.self="closeScheduleForm">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingSchedule?.id ? '编辑排期' : '新建排期' }}</h3>
          <button class="modal-close" @click="closeScheduleForm">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">排期标题 *</label>
            <input v-model="scheduleForm.title" type="text" class="form-input" placeholder="请输入排期标题">
          </div>
          <div class="form-group">
            <label class="form-label">关联访谈 *</label>
            <select v-model="scheduleForm.interviewId" class="form-select">
              <option :value="null">请选择关联的访谈</option>
              <option v-for="i in allInterviews" :key="i.id" :value="i.id">{{ i.title }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">排期时间 *</label>
            <input v-model="scheduleForm.scheduledAt" type="datetime-local" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="scheduleForm.description" class="form-input" rows="2" placeholder="排期描述"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">状态</label>
            <select v-model="scheduleForm.status" class="form-select">
              <option value="PENDING">待发布</option>
              <option value="PUBLISHED">已发布</option>
              <option value="CANCELLED">已取消</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea v-model="scheduleForm.note" class="form-input" rows="2" placeholder="排期备注"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeScheduleForm">取消</button>
          <button class="btn btn-primary" @click="saveSchedule" :disabled="savingSchedule">
            {{ savingSchedule ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/utils/api'

const tabs = [
  { value: 'interviews', label: '访谈管理', icon: '📝' },
  { value: 'featured', label: '专题推荐', icon: '⭐' },
  { value: 'comments', label: '评论管理', icon: '💬' },
  { value: 'schedules', label: '排期管理', icon: '📅' }
]

const statusFilters = [
  { value: 'all', label: '全部' },
  { value: 'DRAFT', label: '草稿' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'REJECTED', label: '已驳回' }
]

const commentStatusFilters = [
  { value: 'all', label: '全部' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'PENDING', label: '待审核' },
  { value: 'REJECTED', label: '已驳回' }
]

const currentTab = ref('interviews')

const interviews = ref([])
const loadingInterviews = ref(false)
const searchKeyword = ref('')
const statusFilter = ref('all')
const page = ref(1)
const total = ref(0)
const pageSize = 20
const totalPages = computed(() => Math.ceil(total.value / pageSize))

const featuredList = ref([])
const loadingFeatured = ref(false)

const comments = ref([])
const loadingComments = ref(false)
const commentStatusFilter = ref('all')
const commentPage = ref(1)
const commentTotal = ref(0)
const commentTotalPages = computed(() => Math.ceil(commentTotal.value / 20))

const schedules = ref([])
const loadingSchedules = ref(false)
const scheduleStatusFilter = ref('all')
const scheduleStartDate = ref('')
const scheduleEndDate = ref('')
const schedulePage = ref(1)
const scheduleTotal = ref(0)
const scheduleTotalPages = computed(() => Math.ceil(scheduleTotal.value / 20))

const allInterviews = ref([])

const showInterviewForm = ref(false)
const editingInterview = ref(null)
const savingInterview = ref(false)
const interviewForm = ref({
  title: '',
  description: '',
  coverImage: '',
  content: '',
  category: 'CREATOR',
  tagsInput: '',
  authorName: '',
  authorAvatar: '',
  authorBio: '',
  authorUserId: null,
  interviewerName: '',
  publishDate: '',
  status: 'DRAFT',
  sortOrder: 0,
  isFeatured: false
})

const showZineManager = ref(false)
const managingInterview = ref(null)
const interviewZines = ref([])
const loadingInterviewZines = ref(false)
const zineSearch = ref('')
const searchZines = ref([])
const selectedZineIds = ref([])

const showFeaturedForm = ref(false)
const editingFeatured = ref(null)
const savingFeatured = ref(false)
const featuredForm = ref({
  interviewId: null,
  bannerImage: '',
  bannerTitle: '',
  bannerSubtitle: '',
  sortOrder: 0,
  startDate: '',
  endDate: '',
  isActive: true
})

const showScheduleForm = ref(false)
const editingSchedule = ref(null)
const savingSchedule = ref(false)
const scheduleForm = ref({
  title: '',
  description: '',
  interviewId: null,
  scheduledAt: '',
  status: 'PENDING',
  note: ''
})

const categoryLabel = (cat) => {
  const map = {
    CREATOR: '创作者专访',
    DESIGNER: '设计师访谈',
    PHOTOGRAPHER: '摄影师对话',
    WRITER: '作家笔谈',
    ARTIST: '艺术家专访',
    PUBLISHER: '出版人访谈',
    OTHER: '其他'
  }
  return map[cat] || cat
}

const statusLabel = (status) => {
  const map = { DRAFT: '草稿', PUBLISHED: '已发布', REJECTED: '已驳回' }
  return map[status] || status
}

const statusBadgeClass = (status) => {
  const map = {
    PUBLISHED: 'badge-approved',
    APPROVED: 'badge-approved',
    DRAFT: 'badge-pending',
    PENDING: 'badge-pending',
    REJECTED: 'badge-rejected'
  }
  return map[status] || 'badge-pending'
}

const commentStatusLabel = (status) => {
  const map = { APPROVED: '已通过', PENDING: '待审核', REJECTED: '已驳回' }
  return map[status] || status
}

const scheduleStatusLabel = (status) => {
  const map = { PENDING: '待发布', PUBLISHED: '已发布', CANCELLED: '已取消' }
  return map[status] || status
}

const scheduleStatusBadge = (status) => {
  const map = {
    PENDING: 'badge-pending',
    PUBLISHED: 'badge-approved',
    CANCELLED: 'badge-rejected'
  }
  return map[status] || 'badge-pending'
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatScheduleDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${day} ${h}:${min}`
}

const formatScheduleWeekday = (date) => {
  if (!date) return ''
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[new Date(date).getDay()]
}

const switchTab = (tab) => {
  currentTab.value = tab
  if (tab === 'interviews') loadInterviews(1)
  if (tab === 'featured') loadFeatured()
  if (tab === 'comments') loadComments(1)
  if (tab === 'schedules') loadSchedules(1)
}

let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadInterviews(1), 400)
}

let zineSearchTimer = null
const debouncedZineSearch = () => {
  clearTimeout(zineSearchTimer)
  zineSearchTimer = setTimeout(() => searchZineList(), 400)
}

const loadInterviews = async (p = 1) => {
  loadingInterviews.value = true
  page.value = p
  try {
    const params = new URLSearchParams({ page: p, limit: pageSize })
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value)
    if (searchKeyword.value) params.set('search', searchKeyword.value)
    const res = await api.get(`/admin/interviews?${params}`)
    interviews.value = res.interviews
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loadingInterviews.value = false
  }
}

const loadAllInterviews = async () => {
  try {
    const res = await api.get('/admin/interviews?limit=100')
    allInterviews.value = res.interviews
  } catch (e) {
    console.error(e)
  }
}

const openInterviewForm = (item = null) => {
  editingInterview.value = item
  if (item) {
    const tags = Array.isArray(item.tags) ? item.tags.join(', ') : ''
    interviewForm.value = {
      title: item.title,
      description: item.description || '',
      coverImage: item.coverImage || '',
      content: item.content || '',
      category: item.category,
      tagsInput: tags,
      authorName: item.authorName,
      authorAvatar: item.authorAvatar || '',
      authorBio: item.authorBio || '',
      authorUserId: item.authorUserId || null,
      interviewerName: item.interviewerName || '',
      publishDate: item.publishDate ? formatDate(item.publishDate) : '',
      status: item.status,
      sortOrder: item.sortOrder,
      isFeatured: item.isFeatured
    }
  } else {
    interviewForm.value = {
      title: '',
      description: '',
      coverImage: '',
      content: '',
      category: 'CREATOR',
      tagsInput: '',
      authorName: '',
      authorAvatar: '',
      authorBio: '',
      authorUserId: null,
      interviewerName: '',
      publishDate: '',
      status: 'DRAFT',
      sortOrder: 0,
      isFeatured: false
    }
  }
  showInterviewForm.value = true
}

const closeInterviewForm = () => {
  showInterviewForm.value = false
  editingInterview.value = null
}

const saveInterview = async () => {
  if (!interviewForm.value.title || !interviewForm.value.authorName) {
    alert('请填写标题和作者姓名')
    return
  }
  savingInterview.value = true
  try {
    const tags = interviewForm.value.tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t)
    
    const data = {
      ...interviewForm.value,
      tags,
      authorUserId: interviewForm.value.authorUserId || null,
      publishDate: interviewForm.value.publishDate || null
    }

    if (editingInterview.value?.id) {
      await api.put(`/admin/interviews/${editingInterview.value.id}`, data)
    } else {
      await api.post('/admin/interviews', data)
    }
    closeInterviewForm()
    loadInterviews(page.value)
    loadAllInterviews()
  } catch (e) {
    console.error(e)
    alert(e.error || '保存失败')
  } finally {
    savingInterview.value = false
  }
}

const updateSortOrder = async (item) => {
  try {
    await api.put(`/admin/interviews/${item.id}`, { sortOrder: item.sortOrder })
  } catch (e) {
    console.error(e)
  }
}

const deleteInterview = async (item) => {
  if (!confirm(`确定要删除访谈"${item.title}"吗？`)) return
  try {
    await api.delete(`/admin/interviews/${item.id}`)
    loadInterviews(page.value)
  } catch (e) {
    console.error(e)
    alert(e.error || '删除失败')
  }
}

const openZineManager = async (item) => {
  managingInterview.value = item
  interviewZines.value = []
  selectedZineIds.value = []
  zineSearch.value = ''
  searchZines.value = []
  showZineManager.value = true
  loadInterviewZines()
}

const closeZineManager = () => {
  showZineManager.value = false
  managingInterview.value = null
}

const loadInterviewZines = async () => {
  loadingInterviewZines.value = true
  try {
    const res = await api.get(`/admin/interviews/${managingInterview.value.id}/zines`)
    interviewZines.value = res.zines
  } catch (e) {
    console.error(e)
  } finally {
    loadingInterviewZines.value = false
  }
}

const searchZineList = async () => {
  if (!zineSearch.value.trim()) {
    searchZines.value = []
    return
  }
  try {
    const res = await api.get(`/admin/interviews/zines/search?search=${encodeURIComponent(zineSearch.value)}&limit=10`)
    searchZines.value = res.zines
  } catch (e) {
    console.error(e)
  }
}

const addSelectedZines = async () => {
  if (selectedZineIds.value.length === 0) {
    alert('请先选择要添加的刊物')
    return
  }
  try {
    await api.post(`/admin/interviews/${managingInterview.value.id}/zines/batch`, {
      zineIds: selectedZineIds.value
    })
    selectedZineIds.value = []
    zineSearch.value = ''
    searchZines.value = []
    loadInterviewZines()
  } catch (e) {
    console.error(e)
    alert(e.error || '添加失败')
  }
}

const updateInterviewZine = async (iz) => {
  try {
    await api.put(`/admin/interviews/${managingInterview.value.id}/zines/${iz.zineId}`, {
      recommendNote: iz.recommendNote,
      sortOrder: iz.sortOrder
    })
  } catch (e) {
    console.error(e)
  }
}

const removeInterviewZine = async (iz) => {
  if (!confirm('确定要移除该关联作品吗？')) return
  try {
    await api.delete(`/admin/interviews/${managingInterview.value.id}/zines/${iz.zineId}`)
    loadInterviewZines()
  } catch (e) {
    console.error(e)
    alert(e.error || '移除失败')
  }
}

const loadFeatured = async () => {
  loadingFeatured.value = true
  try {
    const res = await api.get('/admin/interviews/featured/list')
    featuredList.value = res.featured
  } catch (e) {
    console.error(e)
  } finally {
    loadingFeatured.value = false
  }
}

const openFeaturedForm = (item = null) => {
  editingFeatured.value = item
  if (item) {
    featuredForm.value = {
      interviewId: item.interviewId,
      bannerImage: item.bannerImage || '',
      bannerTitle: item.bannerTitle || '',
      bannerSubtitle: item.bannerSubtitle || '',
      sortOrder: item.sortOrder,
      startDate: item.startDate ? formatDate(item.startDate) : '',
      endDate: item.endDate ? formatDate(item.endDate) : '',
      isActive: item.isActive
    }
  } else {
    featuredForm.value = {
      interviewId: null,
      bannerImage: '',
      bannerTitle: '',
      bannerSubtitle: '',
      sortOrder: 0,
      startDate: '',
      endDate: '',
      isActive: true
    }
  }
  showFeaturedForm.value = true
}

const closeFeaturedForm = () => {
  showFeaturedForm.value = false
  editingFeatured.value = null
}

const saveFeatured = async () => {
  if (!featuredForm.value.interviewId) {
    alert('请选择访谈')
    return
  }
  savingFeatured.value = true
  try {
    const data = {
      ...featuredForm.value,
      startDate: featuredForm.value.startDate || null,
      endDate: featuredForm.value.endDate || null
    }
    if (editingFeatured.value?.id) {
      await api.put(`/admin/interviews/featured/${editingFeatured.value.id}`, data)
    } else {
      await api.post('/admin/interviews/featured', data)
    }
    closeFeaturedForm()
    loadFeatured()
  } catch (e) {
    console.error(e)
    alert(e.error || '保存失败')
  } finally {
    savingFeatured.value = false
  }
}

const updateFeaturedSortOrder = async (item) => {
  try {
    await api.put(`/admin/interviews/featured/${item.id}`, { sortOrder: item.sortOrder })
  } catch (e) {
    console.error(e)
  }
}

const deleteFeatured = async (item) => {
  if (!confirm('确定要删除该专题推荐吗？')) return
  try {
    await api.delete(`/admin/interviews/featured/${item.id}`)
    loadFeatured()
  } catch (e) {
    console.error(e)
    alert(e.error || '删除失败')
  }
}

const loadComments = async (p = 1) => {
  loadingComments.value = true
  commentPage.value = p
  try {
    const allComments = []
    const interviewIds = {}
    
    const interviewRes = await api.get('/admin/interviews?limit=100')
    const allInts = interviewRes.interviews
    allInts.forEach(i => { interviewIds[i.id] = i.title })

    for (const intv of allInts) {
      try {
        const params = new URLSearchParams({ page: 1, limit: 50 })
        if (commentStatusFilter.value !== 'all') params.set('status', commentStatusFilter.value)
        const res = await api.get(`/admin/interviews/${intv.id}/comments?${params}`)
        res.comments.forEach(c => {
          allComments.push({ ...c, interviewTitle: interviewIds[intv.id] })
        })
      } catch (e) {
        console.error(e)
      }
    }
    
    allComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const start = (p - 1) * 20
    const end = start + 20
    comments.value = allComments.slice(start, end)
    commentTotal.value = allComments.length
  } catch (e) {
    console.error(e)
  } finally {
    loadingComments.value = false
  }
}

const updateCommentStatus = async (c, status) => {
  try {
    await api.put(`/admin/interviews/comments/${c.id}`, { status })
    c.status = status
  } catch (e) {
    console.error(e)
    alert(e.error || '操作失败')
  }
}

const toggleCommentPin = async (c) => {
  try {
    await api.put(`/admin/interviews/comments/${c.id}`, { isPinned: !c.isPinned })
    c.isPinned = !c.isPinned
  } catch (e) {
    console.error(e)
    alert(e.error || '操作失败')
  }
}

const deleteComment = async (c) => {
  if (!confirm('确定要删除该评论吗？')) return
  try {
    await api.delete(`/admin/interviews/comments/${c.id}`)
    loadComments(commentPage.value)
  } catch (e) {
    console.error(e)
    alert(e.error || '删除失败')
  }
}

const loadSchedules = async (p = 1) => {
  loadingSchedules.value = true
  schedulePage.value = p
  try {
    const params = new URLSearchParams({ page: p, limit: 20 })
    if (scheduleStatusFilter.value !== 'all') params.set('status', scheduleStatusFilter.value)
    if (scheduleStartDate.value) params.set('startDate', scheduleStartDate.value)
    if (scheduleEndDate.value) params.set('endDate', scheduleEndDate.value)
    const res = await api.get(`/admin/interviews/schedules/all?${params}`)
    schedules.value = res.schedules
    scheduleTotal.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loadingSchedules.value = false
  }
}

const openScheduleManager = async (item) => {
  managingInterview.value = item
  openScheduleForm(null, item.id)
}

const openScheduleForm = (item = null, defaultInterviewId = null) => {
  editingSchedule.value = item
  if (item) {
    scheduleForm.value = {
      title: item.title,
      description: item.description || '',
      interviewId: item.interviewId,
      scheduledAt: item.scheduledAt ? item.scheduledAt.slice(0, 16) : '',
      status: item.status,
      note: item.note || ''
    }
  } else {
    scheduleForm.value = {
      title: '',
      description: '',
      interviewId: defaultInterviewId || null,
      scheduledAt: '',
      status: 'PENDING',
      note: ''
    }
  }
  showScheduleForm.value = true
}

const closeScheduleForm = () => {
  showScheduleForm.value = false
  editingSchedule.value = null
  managingInterview.value = null
}

const saveSchedule = async () => {
  if (!scheduleForm.value.title || !scheduleForm.value.scheduledAt || !scheduleForm.value.interviewId) {
    alert('请填写排期标题、选择关联访谈和时间')
    return
  }
  savingSchedule.value = true
  try {
    const data = {
      ...scheduleForm.value,
      interviewId: scheduleForm.value.interviewId
    }
    if (editingSchedule.value?.id) {
      await api.put(`/admin/interviews/schedules/${editingSchedule.value.id}`, data)
    } else {
      await api.post('/admin/interviews/schedules', data)
    }
    closeScheduleForm()
    loadSchedules(schedulePage.value)
  } catch (e) {
    console.error(e)
    alert(e.error || '保存失败')
  } finally {
    savingSchedule.value = false
  }
}

const deleteSchedule = async (s) => {
  if (!confirm('确定要删除该排期吗？')) return
  try {
    await api.delete(`/admin/interviews/schedules/${s.id}`)
    loadSchedules(schedulePage.value)
  } catch (e) {
    console.error(e)
    alert(e.error || '删除失败')
  }
}

onMounted(async () => {
  await Promise.all([
    loadInterviews(1),
    loadAllInterviews()
  ])
})
</script>

<style scoped>
.admin-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 0;
}

.admin-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
  margin-bottom: -1px;
}

.admin-tab:hover {
  color: var(--text-primary);
}

.admin-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 500;
}

.tab-icon { font-size: 18px; }

.section { margin-bottom: 32px; }

.section-subtitle {
  font-size: 16px;
  font-weight: 600;
}

.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.gap-sm { gap: 8px; }
.flex-wrap { flex-wrap: wrap; }
.mb { margin-bottom: 16px; }
.mb-sm { margin-bottom: 8px; }

.filter-tabs { display: flex; gap: 8px; }

.admin-list {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table th,
.admin-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.admin-table th {
  background: var(--bg-secondary);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.admin-table tr:hover {
  background: var(--bg-secondary);
}

.thumb-cover {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  background: var(--bg-tertiary);
}

.avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.text-sm { font-size: 13px; }
.text-muted { color: var(--text-tertiary); }
.font-medium { font-weight: 500; }

.text-ellipsis-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 4px;
  font-weight: 500;
}
.badge-approved { background: #e6f7ed; color: #2e7d4f; }
.badge-pending { background: #fff4e5; color: #b57c24; }
.badge-rejected { background: #fde8e8; color: #c0392b; }

.tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 11px;
  border-radius: 4px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
}
.page-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  color: var(--text-secondary);
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
  background: var(--bg-primary);
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-lg {
  max-width: 720px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-light);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-tertiary);
  line-height: 1;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: 14px;
  font-family: inherit;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--accent);
}

textarea.form-input {
  resize: vertical;
  min-height: 80px;
}

.search-results {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.zine-search-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.zine-search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  background: var(--bg-primary);
}

.zine-search-item:hover {
  background: var(--bg-tertiary);
}

.zine-thumb {
  width: 40px;
  height: 52px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.zine-search-info {
  flex: 1;
  min-width: 0;
}

.zine-search-title {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.zine-search-author {
  font-size: 12px;
  color: var(--text-tertiary);
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schedule-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
}

.schedule-time {
  text-align: center;
  min-width: 80px;
}

.schedule-date {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
}

.schedule-weekday {
  font-size: 12px;
  color: var(--text-tertiary);
}

.schedule-info {
  flex: 1;
  min-width: 0;
}

.schedule-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.schedule-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.schedule-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.schedule-note {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 6px 10px;
  border-radius: 4px;
}

.note-label {
  color: var(--text-tertiary);
}

.schedule-status {
  min-width: 80px;
}

.schedule-actions {
  display: flex;
  gap: 8px;
}

.danger-btn {
  color: #e74c3c !important;
}

.filters {
  padding: 16px;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .schedule-item {
    flex-direction: column;
    align-items: flex-start;
  }
  .schedule-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
