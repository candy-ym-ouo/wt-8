<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">后台管理</h1>
      <p class="page-subtitle">审核投稿、管理刊物与用户</p>
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

    <div v-if="currentTab === 'overview'" class="section">
      <div class="stats-grid">
        <div v-for="s in statList" :key="s.label" class="stat-card card">
          <div class="stat-icon" :style="{ background: s.color + '22', color: s.color }">
            {{ s.icon }}
          </div>
          <div class="stat-info">
            <div class="stat-num">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </div>
        </div>
      </div>

      <div class="card mt-lg" style="padding: 24px;">
        <h3 class="font-semibold mb">📝 最新投稿</h3>
        <div v-if="loadingRecent" class="text-sm text-tertiary text-center py-4">加载中...</div>
        <div v-else-if="recentSubs.length === 0" class="empty-state py-8">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text text-sm">暂无投稿</div>
        </div>
        <div v-else class="recent-list">
          <div
            v-for="sub in recentSubs"
            :key="sub.id"
            class="recent-item"
            @click="goToSubmission(sub.id)"
          >
            <img :src="sub.user?.avatar" class="sub-user-avatar">
            <div class="recent-info">
              <div class="flex justify-between">
                <span class="font-medium">{{ sub.title }}</span>
                <span :class="['badge', statusClass(sub.status)]">{{ statusLabel(sub.status) }}</span>
              </div>
              <div class="text-xs text-muted mt-sm">
                {{ sub.user?.username }} · {{ formatDate(sub.createdAt) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'submissions'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in subFilters"
            :key="f.value"
            :class="['btn', subStatus === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="subStatus = f.value; loadSubmissions(1)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <div v-if="loadingSubs" class="empty-state">
        <div class="empty-state-icon">⏳</div>
        <div class="empty-state-text">加载中...</div>
      </div>
      <div v-else-if="allSubs.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">暂无投稿</div>
      </div>
      <div v-else class="submissions-list">
        <div v-for="sub in allSubs" :key="sub.id" class="sub-admin-card card">
          <div class="sub-admin-header">
            <div class="user-info">
              <img :src="sub.user?.avatar" class="sub-user-avatar">
              <div>
                <div class="font-medium">{{ sub.user?.username }}</div>
                <div class="text-xs text-tertiary">{{ formatDate(sub.createdAt) }}</div>
              </div>
            </div>
            <span :class="['badge', statusClass(sub.status)]">{{ statusLabel(sub.status) }}</span>
          </div>
          <h3 class="sub-admin-title font-serif">{{ sub.title }}</h3>
          <div class="sub-admin-content text-sm text-muted">
            {{ sub.content.substring(0, 200) }}{{ sub.content.length > 200 ? '...' : '' }}
          </div>
          <div v-if="sub.images && sub.images.length" class="sub-images-preview">
            <img v-for="(img, i) in sub.images.slice(0, 6)" :key="i" :src="img" alt="">
          </div>
          <div v-if="sub.rejectionReason" class="reject-notice">
            驳回原因：{{ sub.rejectionReason }}
          </div>
          <div v-if="sub.status === 'PENDING'" class="sub-admin-actions">
            <button
              class="btn btn-primary btn-sm"
              @click="openApprove(sub)"
            >
              ✓ 通过审核
            </button>
            <button
              class="btn btn-outline btn-sm"
              @click="openReject(sub)"
            >
              ✕ 驳回
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'zines'" class="section">
      <div v-if="loadingZines" class="empty-state">
        <div class="empty-state-icon">⏳</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>封面</th>
              <th>标题</th>
              <th>作者</th>
              <th>分类</th>
              <th>浏览</th>
              <th>收藏</th>
              <th>发布时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="z in allZines" :key="z.id">
              <td><img :src="z.coverImage" class="thumb-cover"></td>
              <td class="font-medium">{{ z.title }}</td>
              <td class="text-sm text-muted">{{ z.author?.username }}</td>
              <td><span class="tag">{{ z.category }}</span></td>
              <td class="text-sm">{{ z.views }}</td>
              <td class="text-sm">{{ z.likes }}</td>
              <td class="text-xs text-tertiary">{{ formatDate(z.createdAt) }}</td>
              <td>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteZine(z)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'topics'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">专题列表</h3>
        <button class="btn btn-primary btn-sm" @click="openTopicForm()">+ 新建专题</button>
      </div>
      <div v-if="loadingTopics" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="allTopics.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text text-sm">暂无专题</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>分类</th>
              <th>状态</th>
              <th>投稿数</th>
              <th>创建者</th>
              <th>截止日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in allTopics" :key="t.id">
              <td class="font-medium">{{ t.title }}</td>
              <td><span class="tag">{{ t.category }}</span></td>
              <td>
                <select :value="t.status" class="form-select" style="width: auto; padding: 4px 10px; font-size: 12px;" @change="changeTopicStatus(t, $event.target.value)">
                  <option value="DRAFT">草稿</option>
                  <option value="ACTIVE">进行中</option>
                  <option value="CLOSED">已关闭</option>
                  <option value="ARCHIVED">已归档</option>
                </select>
              </td>
              <td class="text-sm">{{ t._count?.submissions || 0 }}</td>
              <td class="text-sm text-muted">{{ t.creator?.username }}</td>
              <td class="text-xs text-tertiary">{{ t.deadline ? formatDate(t.deadline) : '无' }}</td>
              <td>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteTopic(t)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'topicSubs'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in topicSubFilters"
            :key="f.value"
            :class="['btn', topicSubStatus === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="topicSubStatus = f.value; loadTopicSubs(1)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>
      <div v-if="loadingTopicSubs" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="topicSubs.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text text-sm">暂无专题投稿</div>
      </div>
      <div v-else class="submissions-list">
        <div v-for="sub in topicSubs" :key="sub.id" class="sub-admin-card card">
          <div class="sub-admin-header">
            <div class="user-info">
              <img :src="sub.user?.avatar" class="sub-user-avatar">
              <div>
                <div class="font-medium">{{ sub.user?.username }}</div>
                <div class="text-xs text-tertiary">{{ formatDate(sub.createdAt) }}</div>
              </div>
            </div>
            <span :class="['badge', topicSubStatusClass(sub.status)]">{{ topicSubStatusLabel(sub.status) }}</span>
          </div>
          <div class="text-xs text-muted mb-sm">专题：{{ sub.topic?.title }}</div>
          <h3 class="sub-admin-title font-serif">{{ sub.title }}</h3>
          <div class="sub-admin-content text-sm text-muted">
            {{ sub.content.substring(0, 200) }}{{ sub.content.length > 200 ? '...' : '' }}
          </div>
          <div v-if="sub.status === 'PENDING'" class="sub-admin-actions">
            <button class="btn btn-primary btn-sm" @click="approveTopicSub(sub)">✓ 通过</button>
            <button class="btn btn-outline btn-sm" @click="openTopicSubReject(sub)">✕ 驳回</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'schedules'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">排期管理</h3>
        <button class="btn btn-primary btn-sm" @click="openScheduleForm()">+ 新建排期</button>
      </div>
      <div v-if="loadingSchedules" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="schedules.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📅</div>
        <div class="empty-state-text text-sm">暂无排期</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>排期标题</th>
              <th>所属专题</th>
              <th>发布日期</th>
              <th>投稿数</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in schedules" :key="s.id">
              <td class="font-medium">{{ s.title }}</td>
              <td class="text-sm text-muted">{{ s.topic?.title }}</td>
              <td class="text-sm">{{ formatDate(s.publishDate) }}</td>
              <td class="text-sm">{{ s._count?.submissions || 0 }}</td>
              <td>
                <span :class="['badge', s.status === 'PUBLISHED' ? 'badge-approved' : 'badge-pending']">
                  {{ s.status === 'PUBLISHED' ? '已发布' : '待发布' }}
                </span>
              </td>
              <td>
                <button v-if="s.status === 'PENDING'" class="btn btn-primary btn-sm" style="padding: 3px 10px; font-size: 12px;" @click="publishSchedule(s)">发布</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteSchedule(s)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'featured'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">首页曝光配置</h3>
        <button class="btn btn-primary btn-sm" @click="openFeaturedForm()">+ 添加曝光</button>
      </div>
      <div v-if="loadingFeatured" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="featuredList.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">🔥</div>
        <div class="empty-state-text text-sm">暂无首页曝光配置</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>专题</th>
              <th>Banner标题</th>
              <th>排序</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in featuredList" :key="f.id">
              <td class="font-medium">{{ f.topic?.title }}</td>
              <td class="text-sm text-muted">{{ f.bannerTitle || '-' }}</td>
              <td class="text-sm">{{ f.sortOrder }}</td>
              <td>
                <span :class="['badge', f.isActive ? 'badge-approved' : 'badge-rejected']">
                  {{ f.isActive ? '启用' : '停用' }}
                </span>
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="toggleFeatured(f)">{{ f.isActive ? '停用' : '启用' }}</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="removeFeatured(f)">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'users'" class="section">
      <div v-if="loadingUsers" class="empty-state">
        <div class="empty-state-icon">⏳</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>投稿数</th>
              <th>订阅数</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in allUsers" :key="u.id">
              <td>
                <div class="flex items-center gap-sm">
                  <img :src="u.avatar" style="width: 32px; height: 32px; border-radius: 50%;">
                  <span class="font-medium">{{ u.username }}</span>
                </div>
              </td>
              <td class="text-sm text-muted">{{ u.email }}</td>
              <td>
                <span :class="['badge', u.role === 'ADMIN' ? 'badge-approved' : '']">{{ u.role === 'ADMIN' ? '管理员' : '普通用户' }}</span>
              </td>
              <td class="text-sm">{{ u._count?.submissions || 0 }}</td>
              <td class="text-sm">{{ u._count?.subscriptions || 0 }}</td>
              <td class="text-xs text-tertiary">{{ formatDate(u.createdAt) }}</td>
              <td>
                <select
                  :value="u.role"
                  class="form-select"
                  style="width: auto; padding: 4px 10px; font-size: 12px;"
                  @change="changeRole(u, $event.target.value)"
                >
                  <option value="USER">普通用户</option>
                  <option value="ADMIN">管理员</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showApprove" class="modal-overlay" @click.self="showApprove = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">通过投稿 · 发布为刊物</h3>
          <button class="btn btn-ghost btn-sm" @click="showApprove = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">分类</label>
            <select v-model="approveForm.category" class="form-select" required>
              <option value="文学">文学创作</option>
              <option value="艺术">艺术插画</option>
              <option value="摄影">摄影作品</option>
              <option value="音乐">音乐文化</option>
              <option value="生活">生活方式</option>
              <option value="亚文化">亚文化</option>
              <option value="学术">独立学术</option>
              <option value="漫画">独立漫画</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">标签（逗号分隔）</label>
            <input v-model="approveForm.tagsText" type="text" class="form-input" placeholder="例如: 原创, 随笔, 生活">
          </div>
          <div class="form-group">
            <label class="form-label">描述简介</label>
            <textarea v-model="approveForm.description" class="form-textarea" rows="3" placeholder="刊物的简短介绍"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showApprove = false">取消</button>
          <button class="btn btn-primary" @click="submitApprove" :disabled="submitting">
            {{ submitting ? '处理中...' : '确认发布' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showTopicReject" class="modal-overlay" @click.self="showTopicReject = false">
      <div class="modal card" style="max-width: 460px;">
        <div class="modal-header">
          <h3 class="font-semibold">驳回专题投稿</h3>
          <button class="btn btn-ghost btn-sm" @click="showTopicReject = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">驳回原因</label>
            <textarea v-model="topicRejectReason" class="form-textarea" rows="4" placeholder="请说明驳回原因..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showTopicReject = false">取消</button>
          <button class="btn btn-outline" @click="submitTopicSubReject" :disabled="submitting">
            {{ submitting ? '处理中...' : '确认驳回' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showTopicForm" class="modal-overlay" @click.self="showTopicForm = false">
      <div class="modal card" style="max-width: 640px;">
        <div class="modal-header">
          <h3 class="font-semibold">新建征稿专题</h3>
          <button class="btn btn-ghost btn-sm" @click="showTopicForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">专题标题 <span style="color: var(--danger);">*</span></label>
            <input v-model="topicForm.title" type="text" class="form-input" placeholder="例：夏日摄影集" required>
          </div>
          <div class="form-group">
            <label class="form-label">简短描述 <span style="color: var(--danger);">*</span></label>
            <input v-model="topicForm.description" type="text" class="form-input" placeholder="一句话介绍专题">
          </div>
          <div class="form-group">
            <label class="form-label">详细内容 <span style="color: var(--danger);">*</span></label>
            <textarea v-model="topicForm.content" class="form-textarea" rows="5" placeholder="征稿详情..."></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">分类 <span style="color: var(--danger);">*</span></label>
              <select v-model="topicForm.category" class="form-select">
                <option value="文学">文学创作</option>
                <option value="艺术">艺术插画</option>
                <option value="摄影">摄影作品</option>
                <option value="音乐">音乐文化</option>
                <option value="生活">生活方式</option>
                <option value="亚文化">亚文化</option>
                <option value="学术">独立学术</option>
                <option value="漫画">独立漫画</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">截止日期</label>
              <input v-model="topicForm.deadline" type="date" class="form-input">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">封面图片链接</label>
            <input v-model="topicForm.coverImage" type="text" class="form-input" placeholder="https://...">
          </div>
          <div class="form-group">
            <label class="form-label">投稿要求</label>
            <textarea v-model="topicForm.requirements" class="form-textarea" rows="3" placeholder="对投稿的具体要求..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">奖励说明</label>
            <input v-model="topicForm.prizes" type="text" class="form-input" placeholder="例：优秀作品将获得首页推荐">
          </div>
          <div class="form-group">
            <label class="form-label">最大投稿数（0为不限）</label>
            <input v-model.number="topicForm.maxSubmissions" type="number" class="form-input" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">状态</label>
            <select v-model="topicForm.status" class="form-select">
              <option value="DRAFT">草稿</option>
              <option value="ACTIVE">立即发布</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showTopicForm = false">取消</button>
          <button class="btn btn-primary" @click="submitTopicForm" :disabled="submitting">
            {{ submitting ? '创建中...' : '创建专题' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showScheduleForm" class="modal-overlay" @click.self="showScheduleForm = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">新建排期</h3>
          <button class="btn btn-ghost btn-sm" @click="showScheduleForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">所属专题 <span style="color: var(--danger);">*</span></label>
            <select v-model="scheduleForm.topicId" class="form-select">
              <option v-for="t in allTopics" :key="t.id" :value="t.id">{{ t.title }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">排期标题 <span style="color: var(--danger);">*</span></label>
            <input v-model="scheduleForm.title" type="text" class="form-input" placeholder="例：第一期">
          </div>
          <div class="form-group">
            <label class="form-label">发布日期 <span style="color: var(--danger);">*</span></label>
            <input v-model="scheduleForm.publishDate" type="date" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="scheduleForm.description" class="form-textarea" rows="3" placeholder="排期描述..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showScheduleForm = false">取消</button>
          <button class="btn btn-primary" @click="submitScheduleForm" :disabled="submitting">
            {{ submitting ? '创建中...' : '创建排期' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showFeaturedForm" class="modal-overlay" @click.self="showFeaturedForm = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">添加首页曝光</h3>
          <button class="btn btn-ghost btn-sm" @click="showFeaturedForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">选择专题 <span style="color: var(--danger);">*</span></label>
            <select v-model="featuredForm.topicId" class="form-select">
              <option v-for="t in allTopics" :key="t.id" :value="t.id">{{ t.title }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Banner图片链接</label>
            <input v-model="featuredForm.bannerImage" type="text" class="form-input" placeholder="https://...">
          </div>
          <div class="form-group">
            <label class="form-label">Banner标题</label>
            <input v-model="featuredForm.bannerTitle" type="text" class="form-input" placeholder="留空则使用专题标题">
          </div>
          <div class="form-group">
            <label class="form-label">Banner副标题</label>
            <input v-model="featuredForm.bannerSubtitle" type="text" class="form-input" placeholder="留空则使用专题描述">
          </div>
          <div class="form-group">
            <label class="form-label">排序权重</label>
            <input v-model.number="featuredForm.sortOrder" type="number" class="form-input" min="0">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showFeaturedForm = false">取消</button>
          <button class="btn btn-primary" @click="submitFeaturedForm" :disabled="submitting">
            {{ submitting ? '添加中...' : '确认添加' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'growth'" class="section">
      <div class="growth-subtabs">
        <button
          v-for="t in growthTabs"
          :key="t.value"
          :class="['btn', 'btn-sm', growthSubTab === t.value ? 'btn-primary' : 'btn-secondary']"
          @click="switchGrowthTab(t.value)"
        >
          {{ t.icon }} {{ t.label }}
        </button>
      </div>

      <div v-if="growthSubTab === 'levels'" class="card mt-lg" style="padding: 24px;">
        <div class="flex justify-between items-center mb">
          <h3 class="font-semibold">等级配置</h3>
          <button class="btn btn-primary btn-sm" @click="openLevelForm()">+ 新增等级</button>
        </div>
        <div v-if="loadingLevels" class="empty-state py-8"><div class="empty-state-icon">⏳</div></div>
        <div v-else-if="levels.length === 0" class="empty-state py-8">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-text text-sm">暂无等级配置</div>
        </div>
        <div v-else class="admin-list">
          <table class="admin-table">
            <thead>
              <tr>
                <th>图标</th>
                <th>等级</th>
                <th>名称</th>
                <th>所需经验</th>
                <th>权益</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in levels" :key="l.id">
                <td><span class="text-2xl">{{ l.icon || '⭐' }}</span></td>
                <td class="font-bold">Lv.{{ l.level }}</td>
                <td class="font-medium">{{ l.name }}</td>
                <td>{{ l.minExp }}</td>
                <td class="text-sm text-muted">
                  {{ (JSON.parse(l.benefits || '[]')).length }} 项权益
                </td>
                <td>
                  <span :class="['badge', l.isActive ? 'badge-approved' : 'badge-rejected']">
                    {{ l.isActive ? '启用' : '禁用' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm" @click="openLevelForm(l)">编辑</button>
                  <button class="btn btn-ghost btn-sm danger-btn" @click="deleteLevel(l)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="growthSubTab === 'badges'" class="card mt-lg" style="padding: 24px;">
        <div class="flex justify-between items-center mb">
          <h3 class="font-semibold">勋章配置</h3>
          <button class="btn btn-primary btn-sm" @click="openBadgeForm()">+ 新增勋章</button>
        </div>
        <div v-if="loadingBadges" class="empty-state py-8"><div class="empty-state-icon">⏳</div></div>
        <div v-else-if="badges.length === 0" class="empty-state py-8">
          <div class="empty-state-icon">🏅</div>
          <div class="empty-state-text text-sm">暂无勋章配置</div>
        </div>
        <div v-else class="badge-grid">
          <div v-for="b in badges" :key="b.id" class="badge-card card">
            <div class="badge-card-header">
              <span class="badge-icon">{{ b.icon }}</span>
              <span :class="['rarity-badge', `rarity-${b.rarity}`]">{{ rarityLabel(b.rarity) }}</span>
            </div>
            <div class="badge-card-title">{{ b.name }}</div>
            <div class="badge-card-desc text-sm text-muted">{{ b.description }}</div>
            <div class="badge-card-footer">
              <span class="text-xs text-tertiary">+{{ b.expReward }} 经验</span>
              <span :class="['badge', b.isActive ? 'badge-approved' : 'badge-rejected']">
                {{ b.isActive ? '启用' : '禁用' }}
              </span>
            </div>
            <div class="badge-card-actions">
              <button class="btn btn-ghost btn-sm" @click="openBadgeForm(b)">编辑</button>
              <button class="btn btn-ghost btn-sm danger-btn" @click="deleteBadge(b)">删除</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="growthSubTab === 'achievements'" class="card mt-lg" style="padding: 24px;">
        <div class="flex justify-between items-center mb">
          <h3 class="font-semibold">成就配置</h3>
          <button class="btn btn-primary btn-sm" @click="openAchievementForm()">+ 新增成就</button>
        </div>
        <div v-if="loadingAchievements" class="empty-state py-8"><div class="empty-state-icon">⏳</div></div>
        <div v-else-if="achievements.length === 0" class="empty-state py-8">
          <div class="empty-state-icon">🏆</div>
          <div class="empty-state-text text-sm">暂无成就配置</div>
        </div>
        <div v-else class="admin-list">
          <table class="admin-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>分类</th>
                <th>条件</th>
                <th>目标值</th>
                <th>奖励</th>
                <th>关联勋章</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in achievements" :key="a.id">
                <td class="font-medium">{{ a.name }}</td>
                <td><span class="tag">{{ categoryLabel(a.category) }}</span></td>
                <td class="text-sm text-muted">{{ a.condition }}</td>
                <td>{{ a.targetValue }}</td>
                <td>+{{ a.expReward }} 经验</td>
                <td>
                  <span v-if="a.badge" class="text-sm">
                    {{ a.badge.icon }} {{ a.badge.name }}
                  </span>
                  <span v-else class="text-sm text-tertiary">-</span>
                </td>
                <td>
                  <span :class="['badge', a.isActive ? 'badge-approved' : 'badge-rejected']">
                    {{ a.isActive ? '启用' : '禁用' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm" @click="openAchievementForm(a)">编辑</button>
                  <button class="btn btn-ghost btn-sm danger-btn" @click="deleteAchievement(a)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="growthSubTab === 'tasks'" class="card mt-lg" style="padding: 24px;">
        <div class="flex justify-between items-center mb">
          <h3 class="font-semibold">任务配置</h3>
          <button class="btn btn-primary btn-sm" @click="openTaskForm()">+ 新增任务</button>
        </div>
        <div v-if="loadingTasks" class="empty-state py-8"><div class="empty-state-icon">⏳</div></div>
        <div v-else-if="tasks.length === 0" class="empty-state py-8">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text text-sm">暂无任务配置</div>
        </div>
        <div v-else class="admin-list">
          <table class="admin-table">
            <thead>
              <tr>
                <th>任务名称</th>
                <th>类型</th>
                <th>分类</th>
                <th>条件</th>
                <th>目标值</th>
                <th>奖励</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in tasks" :key="t.id">
                <td class="font-medium">{{ t.name }}</td>
                <td><span class="tag">{{ taskTypeLabel(t.type) }}</span></td>
                <td><span class="tag">{{ taskCategoryLabel(t.category) }}</span></td>
                <td class="text-sm text-muted">{{ t.condition }}</td>
                <td>{{ t.targetValue }}</td>
                <td>+{{ t.expReward }} 经验</td>
                <td>
                  <span :class="['badge', t.isActive ? 'badge-approved' : 'badge-rejected']">
                    {{ t.isActive ? '启用' : '禁用' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm" @click="openTaskForm(t)">编辑</button>
                  <button class="btn btn-ghost btn-sm danger-btn" @click="deleteTask(t)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="growthSubTab === 'benefits'" class="card mt-lg" style="padding: 24px;">
        <div class="flex justify-between items-center mb">
          <h3 class="font-semibold">权益配置</h3>
          <button class="btn btn-primary btn-sm" @click="openBenefitForm()">+ 新增权益</button>
        </div>
        <div v-if="loadingBenefits" class="empty-state py-8"><div class="empty-state-icon">⏳</div></div>
        <div v-else-if="benefits.length === 0" class="empty-state py-8">
          <div class="empty-state-icon">🎁</div>
          <div class="empty-state-text text-sm">暂无权益配置</div>
        </div>
        <div v-else class="admin-list">
          <table class="admin-table">
            <thead>
              <tr>
                <th>权益名称</th>
                <th>类型</th>
                <th>描述</th>
                <th>最低等级</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in benefits" :key="b.id">
                <td class="font-medium">{{ b.name }}</td>
                <td><span class="tag">{{ benefitTypeLabel(b.type) }}</span></td>
                <td class="text-sm text-muted">{{ b.description }}</td>
                <td>Lv.{{ b.minLevel }}</td>
                <td>
                  <span :class="['badge', b.isActive ? 'badge-approved' : 'badge-rejected']">
                    {{ b.isActive ? '启用' : '禁用' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm" @click="openBenefitForm(b)">编辑</button>
                  <button class="btn btn-ghost btn-sm danger-btn" @click="deleteBenefit(b)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="showLevelForm" class="modal-overlay" @click.self="showLevelForm = false">
      <div class="modal card" style="max-width: 560px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingLevel ? '编辑等级' : '新增等级' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showLevelForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">等级 <span style="color: var(--danger);">*</span></label>
              <input v-model.number="levelForm.level" type="number" class="form-input" min="1" required>
            </div>
            <div class="form-group">
              <label class="form-label">名称 <span style="color: var(--danger);">*</span></label>
              <input v-model="levelForm.name" type="text" class="form-input" placeholder="例：青铜作者" required>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">所需经验 <span style="color: var(--danger);">*</span></label>
              <input v-model.number="levelForm.minExp" type="number" class="form-input" min="0" required>
            </div>
            <div class="form-group">
              <label class="form-label">图标</label>
              <input v-model="levelForm.icon" type="text" class="form-input" placeholder="例：🥉">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="levelForm.description" class="form-textarea" rows="2" placeholder="等级描述..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">权益（每行一项）</label>
            <textarea v-model="levelForm.benefitsText" class="form-textarea" rows="3" placeholder="例：&#10;优先审核投稿&#10;专属标识"></textarea>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="levelForm.isActive">
              <span>启用此等级</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showLevelForm = false">取消</button>
          <button class="btn btn-primary" @click="submitLevelForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingLevel ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showBadgeForm" class="modal-overlay" @click.self="showBadgeForm = false">
      <div class="modal card" style="max-width: 560px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingBadge ? '编辑勋章' : '新增勋章' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showBadgeForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">名称 <span style="color: var(--danger);">*</span></label>
              <input v-model="badgeForm.name" type="text" class="form-input" placeholder="例：初心作者" required>
            </div>
            <div class="form-group">
              <label class="form-label">编码 <span style="color: var(--danger);">*</span></label>
              <input v-model="badgeForm.code" type="text" class="form-input" placeholder="例：FIRST_SUBMISSION" required>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">图标 <span style="color: var(--danger);">*</span></label>
              <input v-model="badgeForm.icon" type="text" class="form-input" placeholder="例：🌟" required>
            </div>
            <div class="form-group">
              <label class="form-label">稀有度</label>
              <select v-model="badgeForm.rarity" class="form-select">
                <option value="COMMON">普通</option>
                <option value="UNCOMMON">稀有</option>
                <option value="RARE">珍贵</option>
                <option value="EPIC">史诗</option>
                <option value="LEGENDARY">传说</option>
              </select>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">分类</label>
              <select v-model="badgeForm.category" class="form-select">
                <option value="GENERAL">通用</option>
                <option value="CREATION">创作</option>
                <option value="ACHIEVEMENT">成就</option>
                <option value="EVENT">活动</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">经验奖励</label>
              <input v-model.number="badgeForm.expReward" type="number" class="form-input" min="0">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">描述 <span style="color: var(--danger);">*</span></label>
            <textarea v-model="badgeForm.description" class="form-textarea" rows="2" placeholder="勋章描述..." required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">排序权重</label>
            <input v-model.number="badgeForm.sortOrder" type="number" class="form-input" min="0">
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="badgeForm.isActive">
              <span>启用此勋章</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showBadgeForm = false">取消</button>
          <button class="btn btn-primary" @click="submitBadgeForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingBadge ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAchievementForm" class="modal-overlay" @click.self="showAchievementForm = false">
      <div class="modal card" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingAchievement ? '编辑成就' : '新增成就' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showAchievementForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">名称 <span style="color: var(--danger);">*</span></label>
              <input v-model="achievementForm.name" type="text" class="form-input" placeholder="例：高产作家" required>
            </div>
            <div class="form-group">
              <label class="form-label">编码 <span style="color: var(--danger);">*</span></label>
              <input v-model="achievementForm.code" type="text" class="form-input" placeholder="例：HIGH_PRODUCTION" required>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">分类</label>
              <select v-model="achievementForm.category" class="form-select">
                <option value="CREATION">创作</option>
                <option value="ENGAGEMENT">互动</option>
                <option value="COLLECTION">收集</option>
                <option value="SOCIAL">社交</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">关联勋章</label>
              <select v-model="achievementForm.badgeId" class="form-select">
                <option :value="null">无</option>
                <option v-for="b in badges" :key="b.id" :value="b.id">{{ b.icon }} {{ b.name }}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">条件描述 <span style="color: var(--danger);">*</span></label>
            <input v-model="achievementForm.condition" type="text" class="form-input" placeholder="例：累计发布 10 篇作品" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">目标值</label>
              <input v-model.number="achievementForm.targetValue" type="number" class="form-input" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">经验奖励</label>
              <input v-model.number="achievementForm.expReward" type="number" class="form-input" min="0">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">描述 <span style="color: var(--danger);">*</span></label>
            <textarea v-model="achievementForm.description" class="form-textarea" rows="2" placeholder="成就描述..." required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">排序权重</label>
            <input v-model.number="achievementForm.sortOrder" type="number" class="form-input" min="0">
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="achievementForm.isActive">
              <span>启用此成就</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAchievementForm = false">取消</button>
          <button class="btn btn-primary" @click="submitAchievementForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingAchievement ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showTaskForm" class="modal-overlay" @click.self="showTaskForm = false">
      <div class="modal card" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingTask ? '编辑任务' : '新增任务' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showTaskForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">名称 <span style="color: var(--danger);">*</span></label>
              <input v-model="taskForm.name" type="text" class="form-input" placeholder="例：每日投稿" required>
            </div>
            <div class="form-group">
              <label class="form-label">编码 <span style="color: var(--danger);">*</span></label>
              <input v-model="taskForm.code" type="text" class="form-input" placeholder="例：DAILY_SUBMISSION" required>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">分类</label>
              <select v-model="taskForm.category" class="form-select">
                <option value="DAILY">每日任务</option>
                <option value="WEEKLY">每周任务</option>
                <option value="MONTHLY">每月任务</option>
                <option value="SPECIAL">特殊任务</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">类型</label>
              <select v-model="taskForm.type" class="form-select">
                <option value="SUBMISSION">投稿</option>
                <option value="VIEW">浏览</option>
                <option value="LIKE">点赞</option>
                <option value="COMMENT">评论</option>
                <option value="SHARE">分享</option>
                <option value="LOGIN">登录</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">条件描述 <span style="color: var(--danger);">*</span></label>
            <input v-model="taskForm.condition" type="text" class="form-input" placeholder="例：发布 1 篇作品" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">目标值</label>
              <input v-model.number="taskForm.targetValue" type="number" class="form-input" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">经验奖励</label>
              <input v-model.number="taskForm.expReward" type="number" class="form-input" min="0">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">描述 <span style="color: var(--danger);">*</span></label>
            <textarea v-model="taskForm.description" class="form-textarea" rows="2" placeholder="任务描述..." required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">排序权重</label>
            <input v-model.number="taskForm.sortOrder" type="number" class="form-input" min="0">
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="taskForm.isActive">
              <span>启用此任务</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showTaskForm = false">取消</button>
          <button class="btn btn-primary" @click="submitTaskForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingTask ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showBenefitForm" class="modal-overlay" @click.self="showBenefitForm = false">
      <div class="modal card" style="max-width: 560px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingBenefit ? '编辑权益' : '新增权益' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showBenefitForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">名称 <span style="color: var(--danger);">*</span></label>
              <input v-model="benefitForm.name" type="text" class="form-input" placeholder="例：优先审核" required>
            </div>
            <div class="form-group">
              <label class="form-label">编码 <span style="color: var(--danger);">*</span></label>
              <input v-model="benefitForm.code" type="text" class="form-input" placeholder="例：PRIORITY_REVIEW" required>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">类型</label>
              <select v-model="benefitForm.type" class="form-select">
                <option value="PRIVILEGE">特权</option>
                <option value="DISCOUNT">折扣</option>
                <option value="REWARD">奖励</option>
                <option value="FEATURE">功能</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">最低等级</label>
              <input v-model.number="benefitForm.minLevel" type="number" class="form-input" min="1">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">权益值（可选）</label>
            <input v-model="benefitForm.value" type="text" class="form-input" placeholder="例：50% 折扣">
          </div>
          <div class="form-group">
            <label class="form-label">描述 <span style="color: var(--danger);">*</span></label>
            <textarea v-model="benefitForm.description" class="form-textarea" rows="2" placeholder="权益描述..." required></textarea>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="benefitForm.isActive">
              <span>启用此权益</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showBenefitForm = false">取消</button>
          <button class="btn btn-primary" @click="submitBenefitForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingBenefit ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showReject" class="modal-overlay" @click.self="showReject = false">
      <div class="modal card" style="max-width: 460px;">
        <div class="modal-header">
          <h3 class="font-semibold">驳回投稿</h3>
          <button class="btn btn-ghost btn-sm" @click="showReject = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">驳回原因（建议填写，帮助作者改进）</label>
            <textarea v-model="rejectReason" class="form-textarea" rows="4" placeholder="请说明驳回原因..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showReject = false">取消</button>
          <button class="btn btn-outline" @click="submitReject" :disabled="submitting">
            {{ submitting ? '处理中...' : '确认驳回' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const showToast = inject('showToast')

const tabs = [
  { label: '概览', value: 'overview', icon: '📊' },
  { label: '投稿审核', value: 'submissions', icon: '📝' },
  { label: '专题管理', value: 'topics', icon: '📋' },
  { label: '专题审核', value: 'topicSubs', icon: '✅' },
  { label: '排期管理', value: 'schedules', icon: '📅' },
  { label: '首页曝光', value: 'featured', icon: '🔥' },
  { label: '刊物管理', value: 'zines', icon: '📚' },
  { label: '用户管理', value: 'users', icon: '👥' },
  { label: '成长规则', value: 'growth', icon: '⭐' }
]

const subFilters = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' }
]

const topicSubFilters = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已排期', value: 'SCHEDULED' },
  { label: '已驳回', value: 'REJECTED' }
]

const currentTab = ref('overview')
const subStatus = ref('all')
const stats = ref({})
const recentSubs = ref([])
const allSubs = ref([])
const allZines = ref([])
const allUsers = ref([])
const allTopics = ref([])
const topicSubs = ref([])
const schedules = ref([])
const featuredList = ref([])
const loadingRecent = ref(true)
const loadingSubs = ref(false)
const loadingZines = ref(false)
const loadingUsers = ref(false)
const loadingTopics = ref(false)
const loadingTopicSubs = ref(false)
const loadingSchedules = ref(false)
const loadingFeatured = ref(false)

const showApprove = ref(false)
const showReject = ref(false)
const showTopicReject = ref(false)
const showTopicForm = ref(false)
const showScheduleForm = ref(false)
const showFeaturedForm = ref(false)
const selectedSub = ref(null)
const selectedTopicSub = ref(null)
const submitting = ref(false)
const approveForm = ref({ category: '文学', tagsText: '', description: '' })
const rejectReason = ref('')
const topicRejectReason = ref('')
const topicSubStatus = ref('all')
const topicForm = ref({ title: '', description: '', content: '', category: '文学', deadline: '', coverImage: '', requirements: '', prizes: '', maxSubmissions: 0, status: 'DRAFT' })
const scheduleForm = ref({ topicId: null, title: '', publishDate: '', description: '' })
const featuredForm = ref({ topicId: null, bannerImage: '', bannerTitle: '', bannerSubtitle: '', sortOrder: 0 })

const growthTabs = [
  { label: '等级', value: 'levels', icon: '📊' },
  { label: '勋章', value: 'badges', icon: '🏅' },
  { label: '成就', value: 'achievements', icon: '🏆' },
  { label: '任务', value: 'tasks', icon: '📋' },
  { label: '权益', value: 'benefits', icon: '🎁' }
]

const growthSubTab = ref('levels')
const levels = ref([])
const badges = ref([])
const achievements = ref([])
const tasks = ref([])
const benefits = ref([])
const loadingLevels = ref(false)
const loadingBadges = ref(false)
const loadingAchievements = ref(false)
const loadingTasks = ref(false)
const loadingBenefits = ref(false)

const showLevelForm = ref(false)
const showBadgeForm = ref(false)
const showAchievementForm = ref(false)
const showTaskForm = ref(false)
const showBenefitForm = ref(false)
const editingLevel = ref(null)
const editingBadge = ref(null)
const editingAchievement = ref(null)
const editingTask = ref(null)
const editingBenefit = ref(null)

const levelForm = ref({ level: 1, name: '', minExp: 0, icon: '', description: '', benefitsText: '', isActive: true })
const badgeForm = ref({ name: '', code: '', icon: '', description: '', category: 'GENERAL', rarity: 'COMMON', expReward: 0, sortOrder: 0, isActive: true })
const achievementForm = ref({ name: '', code: '', description: '', category: 'CREATION', condition: '', targetValue: 1, expReward: 0, badgeId: null, sortOrder: 0, isActive: true })
const taskForm = ref({ name: '', code: '', description: '', category: 'DAILY', type: 'SUBMISSION', condition: '', targetValue: 1, expReward: 10, sortOrder: 0, isActive: true })
const benefitForm = ref({ name: '', code: '', description: '', type: 'PRIVILEGE', value: '', minLevel: 1, isActive: true })

const statList = computed(() => [
  { label: '用户总数', value: stats.value.totalUsers || 0, icon: '👥', color: '#3b82f6' },
  { label: '刊物总数', value: stats.value.totalZines || 0, icon: '📚', color: '#8b5cf6' },
  { label: '投稿总数', value: stats.value.totalSubmissions || 0, icon: '📝', color: '#f59e0b' },
  { label: '待审核', value: stats.value.pendingSubmissions || 0, icon: '⏳', color: '#ef4444' },
  { label: '订阅总数', value: stats.value.totalSubscriptions || 0, icon: '⭐', color: '#10b981' }
])

const statusClass = (s) => ({
  PENDING: 'badge-pending',
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected'
}[s] || '')

const statusLabel = (s) => ({
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回'
}[s] || s)

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const switchTab = (tab) => {
  currentTab.value = tab
  if (tab === 'submissions') loadSubmissions()
  if (tab === 'zines') loadZines()
  if (tab === 'users') loadUsers()
  if (tab === 'overview') loadOverview()
  if (tab === 'topics') loadTopics()
  if (tab === 'topicSubs') loadTopicSubs()
  if (tab === 'schedules') loadSchedules()
  if (tab === 'featured') loadFeatured()
  if (tab === 'growth') switchGrowthTab(growthSubTab.value)
}

const switchGrowthTab = (tab) => {
  growthSubTab.value = tab
  if (tab === 'levels') loadLevels()
  if (tab === 'badges') loadBadges()
  if (tab === 'achievements') loadAchievements()
  if (tab === 'tasks') loadTasks()
  if (tab === 'benefits') loadBenefits()
}

const rarityLabel = (r) => ({
  COMMON: '普通',
  UNCOMMON: '稀有',
  RARE: '珍贵',
  EPIC: '史诗',
  LEGENDARY: '传说'
}[r] || r)

const categoryLabel = (c) => ({
  CREATION: '创作',
  ENGAGEMENT: '互动',
  COLLECTION: '收集',
  SOCIAL: '社交'
}[c] || c)

const taskTypeLabel = (t) => ({
  SUBMISSION: '投稿',
  VIEW: '浏览',
  LIKE: '点赞',
  COMMENT: '评论',
  SHARE: '分享',
  LOGIN: '登录'
}[t] || t)

const taskCategoryLabel = (c) => ({
  DAILY: '每日',
  WEEKLY: '每周',
  MONTHLY: '每月',
  SPECIAL: '特殊'
}[c] || c)

const benefitTypeLabel = (t) => ({
  PRIVILEGE: '特权',
  DISCOUNT: '折扣',
  REWARD: '奖励',
  FEATURE: '功能'
}[t] || t)

const loadLevels = async () => {
  loadingLevels.value = true
  try {
    const res = await api.get('/admin/growth/levels')
    levels.value = res.levels
  } catch (e) {}
  finally { loadingLevels.value = false }
}

const loadBadges = async () => {
  loadingBadges.value = true
  try {
    const res = await api.get('/admin/growth/badges')
    badges.value = res.badges
  } catch (e) {}
  finally { loadingBadges.value = false }
}

const loadAchievements = async () => {
  loadingAchievements.value = true
  try {
    const res = await api.get('/admin/growth/achievements')
    achievements.value = res.achievements
  } catch (e) {}
  finally { loadingAchievements.value = false }
}

const loadTasks = async () => {
  loadingTasks.value = true
  try {
    const res = await api.get('/admin/growth/tasks')
    tasks.value = res.tasks
  } catch (e) {}
  finally { loadingTasks.value = false }
}

const loadBenefits = async () => {
  loadingBenefits.value = true
  try {
    const res = await api.get('/admin/growth/benefits')
    benefits.value = res.benefits
  } catch (e) {}
  finally { loadingBenefits.value = false }
}

const openLevelForm = (level = null) => {
  editingLevel.value = level
  if (level) {
    levelForm.value = {
      level: level.level,
      name: level.name,
      minExp: level.minExp,
      icon: level.icon || '',
      description: level.description || '',
      benefitsText: (JSON.parse(level.benefits || '[]')).join('\n'),
      isActive: level.isActive
    }
  } else {
    levelForm.value = { level: 1, name: '', minExp: 0, icon: '', description: '', benefitsText: '', isActive: true }
  }
  showLevelForm.value = true
}

const submitLevelForm = async () => {
  if (!levelForm.value.name || !levelForm.value.level || levelForm.value.minExp === undefined) {
    showToast('请填写必填项', 'warning')
    return
  }
  submitting.value = true
  try {
    const benefits = levelForm.value.benefitsText.split('\n').map(s => s.trim()).filter(Boolean)
    const data = { ...levelForm.value, benefits }
    if (editingLevel.value) {
      await api.put(`/admin/growth/levels/${editingLevel.value.id}`, data)
      showToast('等级更新成功', 'success')
    } else {
      await api.post('/admin/growth/levels', data)
      showToast('等级创建成功', 'success')
    }
    showLevelForm.value = false
    loadLevels()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteLevel = async (level) => {
  if (!confirm(`确定删除等级「${level.name}」？`)) return
  try {
    await api.delete(`/admin/growth/levels/${level.id}`)
    showToast('已删除', 'success')
    loadLevels()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const openBadgeForm = (badge = null) => {
  editingBadge.value = badge
  if (badge) {
    badgeForm.value = { ...badge }
  } else {
    badgeForm.value = { name: '', code: '', icon: '', description: '', category: 'GENERAL', rarity: 'COMMON', expReward: 0, sortOrder: 0, isActive: true }
  }
  showBadgeForm.value = true
}

const submitBadgeForm = async () => {
  if (!badgeForm.value.name || !badgeForm.value.code || !badgeForm.value.icon || !badgeForm.value.description) {
    showToast('请填写必填项', 'warning')
    return
  }
  submitting.value = true
  try {
    if (editingBadge.value) {
      await api.put(`/admin/growth/badges/${editingBadge.value.id}`, badgeForm.value)
      showToast('勋章更新成功', 'success')
    } else {
      await api.post('/admin/growth/badges', badgeForm.value)
      showToast('勋章创建成功', 'success')
    }
    showBadgeForm.value = false
    loadBadges()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteBadge = async (badge) => {
  if (!confirm(`确定删除勋章「${badge.name}」？`)) return
  try {
    await api.delete(`/admin/growth/badges/${badge.id}`)
    showToast('已删除', 'success')
    loadBadges()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const openAchievementForm = (achievement = null) => {
  editingAchievement.value = achievement
  if (achievement) {
    achievementForm.value = { ...achievement }
  } else {
    achievementForm.value = { name: '', code: '', description: '', category: 'CREATION', condition: '', targetValue: 1, expReward: 0, badgeId: null, sortOrder: 0, isActive: true }
  }
  if (badges.value.length === 0) loadBadges()
  showAchievementForm.value = true
}

const submitAchievementForm = async () => {
  if (!achievementForm.value.name || !achievementForm.value.code || !achievementForm.value.description || !achievementForm.value.condition) {
    showToast('请填写必填项', 'warning')
    return
  }
  submitting.value = true
  try {
    if (editingAchievement.value) {
      await api.put(`/admin/growth/achievements/${editingAchievement.value.id}`, achievementForm.value)
      showToast('成就更新成功', 'success')
    } else {
      await api.post('/admin/growth/achievements', achievementForm.value)
      showToast('成就创建成功', 'success')
    }
    showAchievementForm.value = false
    loadAchievements()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteAchievement = async (achievement) => {
  if (!confirm(`确定删除成就「${achievement.name}」？`)) return
  try {
    await api.delete(`/admin/growth/achievements/${achievement.id}`)
    showToast('已删除', 'success')
    loadAchievements()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const openTaskForm = (task = null) => {
  editingTask.value = task
  if (task) {
    taskForm.value = { ...task }
  } else {
    taskForm.value = { name: '', code: '', description: '', category: 'DAILY', type: 'SUBMISSION', condition: '', targetValue: 1, expReward: 10, sortOrder: 0, isActive: true }
  }
  showTaskForm.value = true
}

const submitTaskForm = async () => {
  if (!taskForm.value.name || !taskForm.value.code || !taskForm.value.description || !taskForm.value.condition) {
    showToast('请填写必填项', 'warning')
    return
  }
  submitting.value = true
  try {
    if (editingTask.value) {
      await api.put(`/admin/growth/tasks/${editingTask.value.id}`, taskForm.value)
      showToast('任务更新成功', 'success')
    } else {
      await api.post('/admin/growth/tasks', taskForm.value)
      showToast('任务创建成功', 'success')
    }
    showTaskForm.value = false
    loadTasks()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteTask = async (task) => {
  if (!confirm(`确定删除任务「${task.name}」？`)) return
  try {
    await api.delete(`/admin/growth/tasks/${task.id}`)
    showToast('已删除', 'success')
    loadTasks()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const openBenefitForm = (benefit = null) => {
  editingBenefit.value = benefit
  if (benefit) {
    benefitForm.value = { ...benefit }
  } else {
    benefitForm.value = { name: '', code: '', description: '', type: 'PRIVILEGE', value: '', minLevel: 1, isActive: true }
  }
  showBenefitForm.value = true
}

const submitBenefitForm = async () => {
  if (!benefitForm.value.name || !benefitForm.value.code || !benefitForm.value.description) {
    showToast('请填写必填项', 'warning')
    return
  }
  submitting.value = true
  try {
    if (editingBenefit.value) {
      await api.put(`/admin/growth/benefits/${editingBenefit.value.id}`, benefitForm.value)
      showToast('权益更新成功', 'success')
    } else {
      await api.post('/admin/growth/benefits', benefitForm.value)
      showToast('权益创建成功', 'success')
    }
    showBenefitForm.value = false
    loadBenefits()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteBenefit = async (benefit) => {
  if (!confirm(`确定删除权益「${benefit.name}」？`)) return
  try {
    await api.delete(`/admin/growth/benefits/${benefit.id}`)
    showToast('已删除', 'success')
    loadBenefits()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const loadOverview = async () => {
  try {
    const res = await api.get('/admin/stats')
    stats.value = res.stats || {}
    recentSubs.value = res.recentSubmissions || []
  } catch (e) {}
  loadingRecent.value = false
}

const loadSubmissions = async () => {
  loadingSubs.value = true
  try {
    const params = new URLSearchParams({ limit: 50 })
    if (subStatus.value !== 'all') params.set('status', subStatus.value)
    const res = await api.get(`/admin/submissions?${params}`)
    allSubs.value = res.submissions
  } catch (e) {
    console.error(e)
  } finally {
    loadingSubs.value = false
  }
}

const loadZines = async () => {
  loadingZines.value = true
  try {
    const res = await api.get('/admin/zines?limit=100')
    allZines.value = res.zines
  } catch (e) {}
  finally { loadingZines.value = false }
}

const loadUsers = async () => {
  loadingUsers.value = true
  try {
    const res = await api.get('/admin/users?limit=100')
    allUsers.value = res.users
  } catch (e) {}
  finally { loadingUsers.value = false }
}

const goToSubmission = (id) => {
  currentTab.value = 'submissions'
  subStatus.value = 'all'
  loadSubmissions()
  setTimeout(() => {
    const el = document.querySelector(`[data-sub-id="${id}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 100)
}

const openApprove = (sub) => {
  selectedSub.value = sub
  approveForm.value = {
    category: '文学',
    tagsText: '',
    description: sub.content.substring(0, 180)
  }
  showApprove.value = true
}

const openReject = (sub) => {
  selectedSub.value = sub
  rejectReason.value = ''
  showReject.value = true
}

const submitApprove = async () => {
  submitting.value = true
  try {
    await api.post(`/admin/submissions/${selectedSub.value.id}/approve`, {
      category: approveForm.value.category,
      tags: approveForm.value.tagsText.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      description: approveForm.value.description
    })
    showToast('已通过审核并发布', 'success')
    showApprove.value = false
    loadSubmissions()
    loadOverview()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const submitReject = async () => {
  submitting.value = true
  try {
    await api.post(`/admin/submissions/${selectedSub.value.id}/reject`, {
      reason: rejectReason.value
    })
    showToast('已驳回', 'success')
    showReject.value = false
    loadSubmissions()
    loadOverview()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteZine = async (zine) => {
  if (!confirm(`确定删除刊物《${zine.title}》？此操作不可撤销。`)) return
  try {
    await api.delete(`/admin/zines/${zine.id}`)
    showToast('已删除', 'success')
    loadZines()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const changeRole = async (user, newRole) => {
  try {
    await api.put(`/admin/users/${user.id}/role`, { role: newRole })
    user.role = newRole
    showToast('角色已更新', 'success')
  } catch (e) {
    showToast(e.error || '更新失败', 'error')
    loadUsers()
  }
}

const topicSubStatusClass = (s) => ({
  PENDING: 'badge-pending',
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected',
  SCHEDULED: 'badge-published',
  PUBLISHED: 'badge-published'
}[s] || '')

const topicSubStatusLabel = (s) => ({
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  SCHEDULED: '已排期',
  PUBLISHED: '已发布'
}[s] || s)

const loadTopics = async () => {
  loadingTopics.value = true
  try {
    const res = await api.get('/admin/topics?limit=100')
    allTopics.value = res.topics
  } catch (e) {}
  finally { loadingTopics.value = false }
}

const loadTopicSubs = async () => {
  loadingTopicSubs.value = true
  try {
    const params = new URLSearchParams({ limit: 50 })
    if (topicSubStatus.value !== 'all') params.set('status', topicSubStatus.value)
    const res = await api.get(`/admin/topics/submissions?${params}`)
    topicSubs.value = res.submissions
  } catch (e) {}
  finally { loadingTopicSubs.value = false }
}

const loadSchedules = async () => {
  loadingSchedules.value = true
  try {
    const res = await api.get('/admin/schedules?limit=100')
    schedules.value = res.schedules
  } catch (e) {}
  finally { loadingSchedules.value = false }
}

const loadFeatured = async () => {
  loadingFeatured.value = true
  try {
    const res = await api.get('/featured?activeOnly=false')
    featuredList.value = res.featured
    if (allTopics.value.length === 0) await loadTopics()
  } catch (e) {}
  finally { loadingFeatured.value = false }
}

const openTopicForm = () => {
  topicForm.value = { title: '', description: '', content: '', category: '文学', deadline: '', coverImage: '', requirements: '', prizes: '', maxSubmissions: 0, status: 'DRAFT' }
  showTopicForm.value = true
}

const submitTopicForm = async () => {
  if (!topicForm.value.title || !topicForm.value.description || !topicForm.value.content) {
    showToast('请填写必填项', 'warning')
    return
  }
  submitting.value = true
  try {
    await api.post('/topics', topicForm.value)
    showToast('专题创建成功', 'success')
    showTopicForm.value = false
    loadTopics()
  } catch (e) {
    showToast(e.error || '创建失败', 'error')
  } finally {
    submitting.value = false
  }
}

const changeTopicStatus = async (topic, newStatus) => {
  try {
    await api.put(`/topics/${topic.id}/status`, { status: newStatus })
    topic.status = newStatus
    showToast('状态已更新', 'success')
  } catch (e) {
    showToast(e.error || '更新失败', 'error')
    loadTopics()
  }
}

const deleteTopic = async (topic) => {
  if (!confirm(`确定删除专题《${topic.title}》？`)) return
  try {
    await api.delete(`/topics/${topic.id}`)
    showToast('已删除', 'success')
    loadTopics()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const approveTopicSub = async (sub) => {
  submitting.value = true
  try {
    await api.post(`/topic-submissions/${sub.id}/review`, { action: 'APPROVE' })
    showToast('审核通过', 'success')
    loadTopicSubs()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const openTopicSubReject = (sub) => {
  selectedTopicSub.value = sub
  topicRejectReason.value = ''
  showTopicReject.value = true
}

const submitTopicSubReject = async () => {
  submitting.value = true
  try {
    await api.post(`/topic-submissions/${selectedTopicSub.value.id}/review`, {
      action: 'REJECT',
      reason: topicRejectReason.value
    })
    showToast('已驳回', 'success')
    showTopicReject.value = false
    loadTopicSubs()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const openScheduleForm = async () => {
  if (allTopics.value.length === 0) await loadTopics()
  scheduleForm.value = { topicId: allTopics.value[0]?.id || null, title: '', publishDate: '', description: '' }
  showScheduleForm.value = true
}

const submitScheduleForm = async () => {
  if (!scheduleForm.value.topicId || !scheduleForm.value.title || !scheduleForm.value.publishDate) {
    showToast('请填写必填项', 'warning')
    return
  }
  submitting.value = true
  try {
    await api.post('/schedules', scheduleForm.value)
    showToast('排期创建成功', 'success')
    showScheduleForm.value = false
    loadSchedules()
  } catch (e) {
    showToast(e.error || '创建失败', 'error')
  } finally {
    submitting.value = false
  }
}

const publishSchedule = async (schedule) => {
  if (!confirm('确认发布此排期？')) return
  try {
    await api.put(`/schedules/${schedule.id}/status`, { status: 'PUBLISHED' })
    showToast('排期已发布', 'success')
    loadSchedules()
  } catch (e) {
    showToast(e.error || '发布失败', 'error')
  }
}

const deleteSchedule = async (schedule) => {
  if (!confirm(`确定删除排期《${schedule.title}》？`)) return
  try {
    await api.delete(`/schedules/${schedule.id}`)
    showToast('已删除', 'success')
    loadSchedules()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const openFeaturedForm = async () => {
  if (allTopics.value.length === 0) await loadTopics()
  featuredForm.value = { topicId: allTopics.value[0]?.id || null, bannerImage: '', bannerTitle: '', bannerSubtitle: '', sortOrder: 0 }
  showFeaturedForm.value = true
}

const submitFeaturedForm = async () => {
  if (!featuredForm.value.topicId) {
    showToast('请选择专题', 'warning')
    return
  }
  submitting.value = true
  try {
    await api.post('/featured', featuredForm.value)
    showToast('曝光配置添加成功', 'success')
    showFeaturedForm.value = false
    loadFeatured()
  } catch (e) {
    showToast(e.error || '添加失败', 'error')
  } finally {
    submitting.value = false
  }
}

const toggleFeatured = async (item) => {
  try {
    await api.put(`/featured/${item.id}`, { isActive: !item.isActive })
    showToast(item.isActive ? '已停用' : '已启用', 'success')
    loadFeatured()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const removeFeatured = async (item) => {
  if (!confirm('确定移除此曝光配置？')) return
  try {
    await api.delete(`/featured/${item.id}`)
    showToast('已移除', 'success')
    loadFeatured()
  } catch (e) {
    showToast(e.error || '移除失败', 'error')
  }
}

onMounted(() => loadOverview())
</script>

<style scoped>
.admin-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 28px;
  padding: 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius);
  width: fit-content;
}
.admin-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.admin-tab:hover { color: var(--text-primary); }
.admin-tab.active {
  background: var(--bg-secondary);
  color: var(--accent);
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.tab-icon { font-size: 16px; }
.section {}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.stat-num {
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}
.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.recent-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
}
.recent-item:hover { background: var(--bg-tertiary); }
.sub-user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}
.recent-info { flex: 1; min-width: 0; }
.submissions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sub-admin-card { padding: 24px; }
.sub-admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sub-admin-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
}
.sub-admin-content {
  line-height: 1.7;
  margin-bottom: 12px;
}
.sub-images-preview {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.sub-images-preview img {
  width: 90px;
  height: 90px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
}
.reject-notice {
  padding: 10px 14px;
  background: var(--danger-light);
  color: var(--danger);
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: 14px;
}
.sub-admin-actions {
  display: flex;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}
.admin-list { overflow-x: auto; }
.admin-table {
  width: 100%;
  border-collapse: collapse;
}
.admin-table th {
  text-align: left;
  padding: 14px 18px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
}
.admin-table td {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-light);
  vertical-align: middle;
}
.admin-table tr:last-child td { border-bottom: none; }
.admin-table tbody tr:hover { background: var(--bg-primary); }
.thumb-cover {
  width: 48px;
  height: 64px;
  object-fit: cover;
  border-radius: 4px;
  background: var(--bg-tertiary);
}
.danger-btn { color: var(--danger) !important; }
.danger-btn:hover { background: var(--danger-light) !important; }
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
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-light);
}
.modal-body {
  padding: 24px;
  overflow-y: auto;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
}

.growth-subtabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.badge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.badge-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.badge-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}

.badge-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.badge-icon {
  font-size: 48px;
  line-height: 1;
}

.rarity-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.rarity-COMMON { background: #e5e7eb; color: #374151; }
.rarity-UNCOMMON { background: #d1fae5; color: #065f46; }
.rarity-RARE { background: #dbeafe; color: #1e40af; }
.rarity-EPIC { background: #f3e8ff; color: #6b21a8; }
.rarity-LEGENDARY { background: #fef3c7; color: #92400e; }

.badge-card-title {
  font-size: 16px;
  font-weight: 600;
}

.badge-card-desc {
  flex: 1;
  line-height: 1.5;
}

.badge-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.badge-card-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
</style>
