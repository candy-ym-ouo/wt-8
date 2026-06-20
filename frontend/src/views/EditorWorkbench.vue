<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">编辑工作台</h1>
      <p class="page-subtitle">整合审核、校对、模板、协作与绩效管理</p>
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
        <span v-if="t.count > 0" class="tab-badge">{{ t.count > 99 ? '99+' : t.count }}</span>
      </button>
    </div>

    <div v-if="currentTab === 'overview'" class="section">
      <div class="stats-grid">
        <div v-for="s in overviewStats" :key="s.label" class="stat-card card" @click="s.onClick && s.onClick()">
          <div class="stat-icon" :style="{ background: s.color + '22', color: s.color }">
            {{ s.icon }}
          </div>
          <div class="stat-info">
            <div class="stat-num">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </div>
        </div>
      </div>

      <div class="workbench-grid">
        <div class="card mt-lg" style="padding: 24px;">
          <div class="flex justify-between items-center mb">
            <h3 class="font-semibold">📋 待审投稿</h3>
            <button class="btn btn-ghost btn-sm" @click="switchTab('submissions')">查看全部 →</button>
          </div>
          <div v-if="loadingPending" class="text-sm text-tertiary text-center py-4">加载中...</div>
          <div v-else-if="pendingList.length === 0" class="empty-state py-8">
            <div class="empty-state-icon">✅</div>
            <div class="empty-state-text text-sm">暂无待审内容</div>
          </div>
          <div v-else class="pending-list">
            <div v-for="item in pendingList.slice(0, 6)" :key="item.sourceType + item.id" class="pending-item" @click="goToReview(item)">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="flex items-center gap-sm mb-sm">
                    <span :class="['badge', 'badge-source', `source-${item.sourceType.toLowerCase()}`]">
                      {{ sourceTypeLabel(item.sourceType) }}
                    </span>
                    <span class="text-xs text-tertiary">{{ formatDate(item.createdAt) }}</span>
                  </div>
                  <div class="font-medium">{{ item.title }}</div>
                  <div class="text-xs text-muted mt-sm">
                    {{ (item.user?.username || item.creator?.username) }}
                    <span v-if="item.topic?.title" class="ml-sm">· 专题: {{ item.topic.title }}</span>
                  </div>
                </div>
                <span class="badge badge-pending">待审核</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card mt-lg" style="padding: 24px;">
          <div class="flex justify-between items-center mb">
            <h3 class="font-semibold">🔄 最近流转记录</h3>
            <button class="btn btn-ghost btn-sm" @click="switchTab('workflow')">查看全部 →</button>
          </div>
          <div v-if="loadingRecent" class="text-sm text-tertiary text-center py-4">加载中...</div>
          <div v-else-if="recentRecords.length === 0" class="empty-state py-8">
            <div class="empty-state-icon">📝</div>
            <div class="empty-state-text text-sm">暂无流转记录</div>
          </div>
          <div v-else class="workflow-list">
            <div v-for="r in recentRecords" :key="r.id" class="workflow-item">
              <img :src="r.operator?.avatar" class="wf-avatar">
              <div class="wf-content">
                <div class="flex items-center gap-sm">
                  <span class="font-medium text-sm">{{ r.operator?.username }}</span>
                  <span :class="['wf-action', `action-${r.action.toLowerCase()}`]">{{ actionLabel(r.action) }}</span>
                  <span class="text-xs text-tertiary">{{ formatDate(r.createdAt) }}</span>
                </div>
                <div class="text-sm text-muted mt-sm">{{ r.targetTitle || (r.targetType + ' #' + r.targetId) }}</div>
                <div v-if="r.remark" class="text-xs text-tertiary mt-sm">{{ r.remark }}</div>
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
            :class="['btn', subFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="subFilter = f.value; loadPendingSubs()"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <div v-if="loadingSubs" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else class="submissions-grid">
        <div v-for="(list, type) in subsByType" :key="type" class="sub-group card" style="padding: 20px;">
          <h4 class="font-semibold mb" style="color: var(--text-secondary);">
            {{ sourceTypeLabel(type) }}
            <span class="text-sm text-muted ml-sm">({{ list.length }})</span>
          </h4>
          <div v-if="list.length === 0" class="empty-state py-6">
            <div class="empty-state-icon">✅</div>
            <div class="empty-state-text text-sm">暂{{ sourceTypeLabel(type) }}待审核</div>
          </div>
          <div v-else class="sub-review-list">
            <div v-for="s in list" :key="s.id" class="sub-review-card">
              <div class="user-info mb-sm">
                <img :src="s.user?.avatar || s.creator?.avatar" class="sub-user-avatar">
                <div>
                  <div class="font-medium text-sm">{{ s.user?.username || s.creator?.username }}</div>
                  <div class="text-xs text-tertiary">{{ formatDate(s.createdAt) }}</div>
                </div>
              </div>
              <h5 class="font-serif mb-sm">{{ s.title }}</h5>
              <div v-if="s.topic?.title" class="text-xs text-muted mb-sm">专题：{{ s.topic.title }}</div>
              <div v-if="s.description" class="text-sm text-muted mb-sm line-clamp-2">{{ s.description }}</div>
              <div v-if="s.content && !s.description" class="text-sm text-muted mb-sm line-clamp-2">{{ s.content.substring(0, 120) }}...</div>
              <div class="flex gap-sm">
                <button class="btn btn-primary btn-sm" @click="quickApprove(s)">✓ 通过</button>
                <button class="btn btn-outline btn-sm" @click="openQuickReject(s)">✕ 驳回</button>
                <button class="btn btn-ghost btn-sm" @click="goToReview(s)">详情 →</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'proofreading'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in proofFilters"
            :key="f.value"
            :class="['btn', proofFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="proofFilter = f.value; loadProofreading()"
          >
            {{ f.label }}
          </button>
        </div>
        <button class="btn btn-primary btn-sm" @click="openProofForm()">+ 新建校对任务</button>
      </div>

      <div v-if="loadingProof" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="proofTasks.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📖</div>
        <div class="empty-state-text">暂无校对任务</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>优先级</th>
              <th>任务标题</th>
              <th>类型</th>
              <th>指派人</th>
              <th>截止日期</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in proofTasks" :key="t.id">
              <td>
                <span :class="['priority-badge', `priority-${t.priority.toLowerCase()}`]">{{ priorityLabel(t.priority) }}</span>
              </td>
              <td class="font-medium">{{ t.title }}</td>
              <td><span class="tag">{{ t.type }}</span></td>
              <td class="text-sm text-muted">
                <span v-if="t.assignee">{{ t.assignee.username }}</span>
                <span v-else class="text-tertiary">未分配</span>
              </td>
              <td class="text-sm">{{ t.deadline ? formatDate(t.deadline) : '-' }}</td>
              <td>
                <span :class="['badge', proofStatusClass(t.status)]">{{ proofStatusLabel(t.status) }}</span>
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openProofForm(t)">编辑</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteProof(t)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'templates'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in templateFilters"
            :key="f.value"
            :class="['btn', templateTypeFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="templateTypeFilter = f.value; loadTemplates()"
          >
            {{ f.label }}
          </button>
        </div>
        <button class="btn btn-primary btn-sm" @click="openTemplateForm()">+ 新建模板</button>
      </div>

      <div v-if="loadingTemplates" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="templates.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📄</div>
        <div class="empty-state-text">暂无模板</div>
      </div>
      <div v-else class="template-grid">
        <div v-for="tpl in templates" :key="tpl.id" class="template-card card">
          <div class="template-card-header">
            <div class="flex items-center gap-sm">
              <span class="tpl-icon">{{ tplIcon(tpl.type) }}</span>
              <span class="font-medium">{{ tpl.name }}</span>
            </div>
            <div class="flex gap-xs">
              <span class="tag">{{ tplTypeLabel(tpl.type) }}</span>
              <span v-if="tpl.isPublic" class="tag tag-public">公开</span>
            </div>
          </div>
          <div v-if="tpl.description" class="text-sm text-muted mt-sm mb-sm line-clamp-2">{{ tpl.description }}</div>
          <div class="template-preview mt-sm mb-sm">
            <div class="text-xs text-tertiary line-clamp-4">{{ tpl.content }}</div>
          </div>
          <div class="template-card-footer">
            <div class="text-xs text-tertiary">
              <span>{{ tpl.creator?.username }}</span> · 
              <span>使用 {{ tpl.usageCount }} 次</span>
            </div>
            <div class="flex gap-xs">
              <button class="btn btn-primary btn-xs" @click="useTemplate(tpl)">使用</button>
              <button v-if="tpl.creatorId === authStore.user?.id" class="btn btn-ghost btn-xs" @click="openTemplateForm(tpl)">编辑</button>
              <button v-if="tpl.creatorId === authStore.user?.id" class="btn btn-ghost btn-xs danger-btn" @click="deleteTemplate(tpl)">删</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'notes'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">协作备注便签</h3>
        <button class="btn btn-primary btn-sm" @click="openNoteForm()">+ 新建备注</button>
      </div>

      <div v-if="loadingNotes" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="notes.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📌</div>
        <div class="empty-state-text">暂无备注</div>
      </div>
      <div v-else class="notes-grid">
        <div
          v-for="note in notes"
          :key="note.id"
          class="note-card"
          :style="{ background: note.color + '44', borderLeftColor: note.color }"
        >
          <div class="note-card-header">
            <div class="flex items-center gap-sm">
              <span v-if="note.isPinned" class="pin-icon">📌</span>
              <span class="font-medium text-sm">
                {{ note.targetTitle || note.targetType + ' #' + note.targetId }}
              </span>
            </div>
            <div class="flex gap-xs">
              <button class="icon-btn" @click="openNoteForm(note)">✏️</button>
              <button class="icon-btn danger" @click="deleteNote(note)">🗑️</button>
            </div>
          </div>
          <div class="note-content mt-sm">{{ note.content }}</div>
          <div class="note-card-footer mt-sm">
            <div class="flex items-center gap-xs">
              <img :src="note.creator?.avatar" class="note-avatar">
              <span class="text-xs text-tertiary">{{ note.creator?.username }} · {{ formatDate(note.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'workflow'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in wfFilters"
            :key="f.value"
            :class="['btn', wfFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="wfFilter = f.value; loadWorkflow()"
          >
            {{ f.label }}
          </button>
        </div>
        <button class="btn btn-primary btn-sm" @click="loadWorkflow()">🔄 刷新</button>
      </div>

      <div v-if="loadingWorkflow" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="workflowRecords.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">🔄</div>
        <div class="empty-state-text">暂无流转记录</div>
      </div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>操作时间</th>
              <th>操作人</th>
              <th>操作类型</th>
              <th>目标对象</th>
              <th>状态变更</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in workflowRecords" :key="r.id">
              <td class="text-xs text-tertiary">{{ formatDateTime(r.createdAt) }}</td>
              <td>
                <div class="flex items-center gap-xs">
                  <img :src="r.operator?.avatar" style="width: 24px; height: 24px; border-radius: 50%;">
                  <span class="text-sm">{{ r.operator?.username }}</span>
                </div>
              </td>
              <td><span :class="['wf-action', `action-${r.action.toLowerCase()}`]">{{ actionLabel(r.action) }}</span></td>
              <td class="text-sm">{{ r.targetTitle || (r.targetType + ' #' + r.targetId) }}</td>
              <td class="text-xs">
                <span v-if="r.fromStatus">{{ r.fromStatus }}</span>
                <span v-if="r.fromStatus && r.toStatus"> → </span>
                <span v-if="r.toStatus" class="text-accent font-medium">{{ r.toStatus }}</span>
                <span v-else class="text-tertiary">-</span>
              </td>
              <td class="text-xs text-muted max-w-200 truncate">{{ r.remark || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'performance'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in perfFilters"
            :key="f.value"
            :class="['btn', perfFilter === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="perfFilter = f.value; loadPerformance()"
          >
            {{ f.label }}
          </button>
        </div>
        <div class="text-sm text-tertiary">
          统计周期: {{ formatDate(perfPeriodStart) }} ~ {{ formatDate(perfPeriodEnd) }}
        </div>
      </div>

      <div v-if="loadingPerf" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else class="perf-cards">
        <div v-for="p in perfResults" :key="p.reviewer.id" class="perf-card card" style="padding: 24px;">
          <div class="flex items-center gap-md mb">
            <img :src="p.reviewer.avatar" class="perf-avatar">
            <div>
              <div class="font-semibold text-lg">{{ p.reviewer.username }}</div>
              <div class="text-sm text-tertiary">审核绩效统计</div>
            </div>
          </div>

          <div class="perf-stats-grid mb">
            <div class="perf-stat">
              <div class="perf-stat-num text-accent">{{ p.totalReviews }}</div>
              <div class="perf-stat-label">总审核数</div>
            </div>
            <div class="perf-stat">
              <div class="perf-stat-num text-success">{{ p.approvedCount }}</div>
              <div class="perf-stat-label">通过数</div>
            </div>
            <div class="perf-stat">
              <div class="perf-stat-num text-danger">{{ p.rejectedCount }}</div>
              <div class="perf-stat-label">驳回数</div>
            </div>
            <div class="perf-stat">
              <div class="perf-stat-num">{{ p.avgReviewTime }}h</div>
              <div class="perf-stat-label">平均用时</div>
            </div>
          </div>

          <div class="perf-breakdown">
            <div v-for="cat in perfCategories" :key="cat.key" class="perf-breakdown-item">
              <div class="flex justify-between text-sm mb-xs">
                <span class="text-muted">{{ cat.label }}</span>
                <span class="font-medium">{{ p[cat.key] || 0 }}</span>
              </div>
              <div class="perf-bar">
                <div
                  class="perf-bar-fill"
                  :style="{
                    width: p.totalReviews ? (p[cat.key] || 0) / p.totalReviews * 100 + '%' : '0%',
                    background: cat.color
                  }"
                ></div>
              </div>
            </div>
          </div>

          <div class="flex gap-sm mt-md pt-md" style="border-top: 1px solid var(--border-light);">
            <div class="text-sm text-muted">
              <span class="font-medium text-primary">{{ p.proofreadings }}</span> 校对任务完成
            </div>
            <div class="text-sm text-muted">
              <span class="font-medium text-accent">{{ p.workflowCount }}</span> 流转操作
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showProofForm" class="modal-overlay" @click.self="showProofForm = false">
      <div class="modal card" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingProof ? '编辑校对任务' : '新建校对任务' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showProofForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">任务标题 *</label>
            <input v-model="proofForm.title" type="text" class="form-input" placeholder="校对任务标题" required>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">类型</label>
              <select v-model="proofForm.type" class="form-select">
                <option value="ZINE">刊物</option>
                <option value="SUBMISSION">投稿</option>
                <option value="COLLECTION">合集</option>
                <option value="TOPIC">专题</option>
                <option value="OTHER">其他</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">优先级</label>
              <select v-model="proofForm.priority" class="form-select">
                <option value="URGENT">紧急</option>
                <option value="HIGH">高</option>
                <option value="NORMAL">普通</option>
                <option value="LOW">低</option>
              </select>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">指派人</label>
              <select v-model="proofForm.assigneeId" class="form-select">
                <option :value="null">未分配</option>
                <option v-for="a in adminList" :key="a.id" :value="a.id">{{ a.username }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">截止日期</label>
              <input v-model="proofForm.deadline" type="date" class="form-input">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">状态</label>
            <select v-model="proofForm.status" class="form-select">
              <option value="PENDING">待处理</option>
              <option value="IN_PROGRESS">进行中</option>
              <option value="REVIEW">复核中</option>
              <option value="COMPLETED">已完成</option>
              <option value="CANCELLED">已取消</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">内容/原文 *</label>
            <textarea v-model="proofForm.content" class="form-textarea" rows="6" placeholder="需要校对的内容..."></textarea>
          </div>
          <div v-if="proofForm.status === 'COMPLETED' || proofForm.status === 'REVIEW'" class="form-group">
            <label class="form-label">校对反馈</label>
            <textarea v-model="proofForm.feedback" class="form-textarea" rows="4" placeholder="校对意见和反馈..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showProofForm = false">取消</button>
          <button class="btn btn-primary" @click="submitProofForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingProof ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showTemplateForm" class="modal-overlay" @click.self="showTemplateForm = false">
      <div class="modal card" style="max-width: 640px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingTemplate ? '编辑模板' : '新建模板' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showTemplateForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">模板名称 *</label>
              <input v-model="templateForm.name" type="text" class="form-input" placeholder="模板名称" required>
            </div>
            <div class="form-group">
              <label class="form-label">类型</label>
              <select v-model="templateForm.type" class="form-select">
                <option value="SUBMISSION">投稿模板</option>
                <option value="REVIEW">审核意见</option>
                <option value="REJECT">驳回通知</option>
                <option value="APPROVE">通过通知</option>
                <option value="COLLABORATION">合作</option>
                <option value="OTHER">其他</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">分类标签</label>
            <input v-model="templateForm.category" type="text" class="form-input" placeholder="例如: 文学, 艺术, 生活">
          </div>
          <div class="form-group">
            <label class="form-label">简短描述</label>
            <input v-model="templateForm.description" type="text" class="form-input" placeholder="模板用途说明">
          </div>
          <div class="form-group">
            <label class="form-label">模板内容 *</label>
            <textarea v-model="templateForm.content" class="form-textarea" rows="8" placeholder="模板正文内容，可使用占位符..."></textarea>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="templateForm.isPublic">
              <span>设为公开模板（其他管理员可见）</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showTemplateForm = false">取消</button>
          <button class="btn btn-primary" @click="submitTemplateForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingTemplate ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showNoteForm" class="modal-overlay" @click.self="showNoteForm = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingNote ? '编辑备注' : '新建备注' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showNoteForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">关联类型</label>
              <select v-model="noteForm.targetType" class="form-select">
                <option value="SUBMISSION">投稿</option>
                <option value="TOPIC">专题</option>
                <option value="ZINE">刊物</option>
                <option value="COLLABORATION">合作</option>
                <option value="PROOFREADING">校对</option>
                <option value="GENERAL">通用</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">关联ID</label>
              <input v-model.number="noteForm.targetId" type="number" class="form-input" placeholder="留空为0">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">标题</label>
            <input v-model="noteForm.targetTitle" type="text" class="form-input" placeholder="备注标题说明">
          </div>
          <div class="form-group">
            <label class="form-label">便签颜色</label>
            <div class="color-picker">
              <button
                v-for="c in noteColors"
                :key="c"
                :class="['color-dot', { active: noteForm.color === c }]"
                :style="{ background: c }"
                @click="noteForm.color = c"
              ></button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">备注内容 *</label>
            <textarea v-model="noteForm.content" class="form-textarea" rows="5" placeholder="输入备注内容..."></textarea>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="noteForm.isPinned">
              <span>置顶显示</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showNoteForm = false">取消</button>
          <button class="btn btn-primary" @click="submitNoteForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingNote ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showQuickReject" class="modal-overlay" @click.self="showQuickReject = false">
      <div class="modal card" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="font-semibold">快速驳回</h3>
          <button class="btn btn-ghost btn-sm" @click="showQuickReject = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">选择快捷理由</label>
            <select class="form-select" @change="e => rejectForm.reason = e.target.value">
              <option value="">自定义...</option>
              <option value="内容不符合主题要求">内容不符合主题要求</option>
              <option value="质量需要提升">质量需要提升</option>
              <option value="原创性存疑">原创性存疑</option>
              <option value="格式规范问题">格式规范问题</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">驳回原因 *</label>
            <textarea v-model="rejectForm.reason" class="form-textarea" rows="4" placeholder="请说明驳回原因..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showQuickReject = false">取消</button>
          <button class="btn btn-outline" @click="submitQuickReject" :disabled="submitting">
            {{ submitting ? '处理中...' : '确认驳回' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const router = useRouter()
const authStore = useAuthStore()

const currentTab = ref('overview')
const submitting = ref(false)

const tabs = computed(() => [
  { value: 'overview', label: '总览', icon: '🎯', count: 0 },
  { value: 'submissions', label: '待审投稿', icon: '📋', count: pendingCount.value },
  { value: 'proofreading', label: '刊物校对', icon: '📖', count: tabsCount.proof || 0 },
  { value: 'templates', label: '常用模板', icon: '📄', count: 0 },
  { value: 'notes', label: '协作备注', icon: '📌', count: 0 },
  { value: 'workflow', label: '流转记录', icon: '🔄', count: 0 },
  { value: 'performance', label: '审核绩效', icon: '📊', count: 0 }
])

const pendingCount = ref(0)
const tabsCount = ref({ proof: 0 })
const overviewStats = ref([])
const recentRecords = ref([])
const loadingRecent = ref(true)
const loadingPending = ref(true)
const pendingList = ref([])

const subFilter = ref('ALL')
const loadingSubs = ref(false)
const subsByType = ref({ SUBMISSION: [], TOPIC: [], COLLABORATION: [], CROWDFUNDING: [] })
const subFilters = [
  { value: 'ALL', label: '全部' },
  { value: 'SUBMISSION', label: '普通投稿' },
  { value: 'TOPIC', label: '专题投稿' },
  { value: 'COLLABORATION', label: '合作' },
  { value: 'CROWDFUNDING', label: '众筹' }
]

const proofFilter = ref('ALL')
const loadingProof = ref(false)
const proofTasks = ref([])
const proofFilters = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: '待处理' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'REVIEW', label: '复核中' },
  { value: 'COMPLETED', label: '已完成' }
]

const templateTypeFilter = ref('ALL')
const loadingTemplates = ref(false)
const templates = ref([])
const templateFilters = [
  { value: 'ALL', label: '全部' },
  { value: 'SUBMISSION', label: '投稿' },
  { value: 'REVIEW', label: '审核' },
  { value: 'APPROVE', label: '通过' },
  { value: 'REJECT', label: '驳回' }
]

const loadingNotes = ref(false)
const notes = ref([])
const noteColors = ['#ffeaa7', '#fab1a0', '#81ecec', '#a29bfe', '#55efc4', '#fd79a8', '#dfe6e9', '#74b9ff']

const wfFilter = ref('ALL')
const loadingWorkflow = ref(false)
const workflowRecords = ref([])
const wfFilters = [
  { value: 'ALL', label: '全部' },
  { value: 'CREATE', label: '创建' },
  { value: 'STATUS_CHANGE', label: '状态变更' },
  { value: 'APPROVE', label: '通过' },
  { value: 'REJECT', label: '驳回' }
]

const perfFilter = ref('MONTHLY')
const loadingPerf = ref(false)
const perfResults = ref([])
const perfPeriodStart = ref(new Date())
const perfPeriodEnd = ref(new Date())
const perfFilters = [
  { value: 'WEEKLY', label: '本周' },
  { value: 'MONTHLY', label: '本月' }
]
const perfCategories = [
  { key: 'submissions', label: '普通投稿', color: 'var(--accent)' },
  { key: 'topicSubs', label: '专题投稿', color: 'var(--success)' },
  { key: 'collaborations', label: '合作招募', color: 'var(--warning)' },
  { key: 'crowdfundings', label: '众筹项目', color: '#fd79a8' }
]

const showProofForm = ref(false)
const editingProof = ref(null)
const proofForm = ref({ title: '', content: '', type: 'ZINE', priority: 'NORMAL', status: 'PENDING', assigneeId: null, deadline: '', feedback: '' })

const showTemplateForm = ref(false)
const editingTemplate = ref(null)
const templateForm = ref({ name: '', type: 'SUBMISSION', category: 'GENERAL', content: '', description: '', isPublic: true, sortOrder: 0 })

const showNoteForm = ref(false)
const editingNote = ref(null)
const noteForm = ref({ targetType: 'GENERAL', targetId: 0, targetTitle: '', content: '', color: '#ffeaa7', isPinned: false })

const showQuickReject = ref(false)
const rejectTarget = ref(null)
const rejectForm = ref({ reason: '' })

const adminList = ref([])

const loadOverview = async () => {
  try {
    loadingRecent.value = true
    const res = await api.get('/editor-workbench/overview')
    pendingCount.value = res.pendingSubs + res.pendingTopicSubs + res.pendingCollabs + res.pendingCrowdfundings
    tabsCount.value = { proof: res.pendingProofreadings }
    overviewStats.value = [
      { icon: '📝', label: '待审投稿', value: pendingCount.value, color: 'var(--accent)', onClick: () => switchTab('submissions') },
      { icon: '📖', label: '校对任务', value: res.pendingProofreadings, color: 'var(--warning)', onClick: () => switchTab('proofreading') },
      { icon: '🧾', label: '待审合作', value: res.pendingCollabs, color: 'var(--success)', onClick: () => { subFilter.value = 'COLLABORATION'; switchTab('submissions'); } },
      { icon: '🎯', label: '待审众筹', value: res.pendingCrowdfundings, color: '#fd79a8', onClick: () => { subFilter.value = 'CROWDFUNDING'; switchTab('submissions'); } },
      { icon: '📋', label: '专题投稿', value: res.pendingTopicSubs, color: '#a29bfe', onClick: () => { subFilter.value = 'TOPIC'; switchTab('submissions'); } },
      { icon: '👤', label: '分配给我', value: res.myProofreadings, color: '#00b894', onClick: () => switchTab('proofreading') }
    ]
    recentRecords.value = res.recentRecords
  } finally {
    loadingRecent.value = false
  }
}

const loadPendingSubs = async () => {
  loadingPending.value = true
  loadingSubs.value = true
  try {
    const res = await api.get('/editor-workbench/pending-submissions', {
      params: { type: subFilter.value }
    })
    const all = [
      ...(res.submissions || []),
      ...(res.topicSubmissions || []),
      ...(res.collaborations || []),
      ...(res.crowdfundings || [])
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    pendingList.value = all
    subsByType.value = {
      SUBMISSION: res.submissions || [],
      TOPIC: res.topicSubmissions || [],
      COLLABORATION: res.collaborations || [],
      CROWDFUNDING: res.crowdfundings || []
    }
  } finally {
    loadingPending.value = false
    loadingSubs.value = false
  }
}

const loadProofreading = async () => {
  loadingProof.value = true
  try {
    const res = await api.get('/editor-workbench/proofreading', {
      params: { status: proofFilter.value }
    })
    proofTasks.value = res.tasks
  } finally {
    loadingProof.value = false
  }
}

const loadTemplates = async () => {
  loadingTemplates.value = true
  try {
    const res = await api.get('/editor-workbench/templates', {
      params: { type: templateTypeFilter.value }
    })
    templates.value = res.templates
  } finally {
    loadingTemplates.value = false
  }
}

const loadNotes = async () => {
  loadingNotes.value = true
  try {
    const res = await api.get('/editor-workbench/notes')
    notes.value = res.notes
  } finally {
    loadingNotes.value = false
  }
}

const loadWorkflow = async () => {
  loadingWorkflow.value = true
  try {
    const params = {}
    if (wfFilter.value !== 'ALL') params.action = wfFilter.value
    const res = await api.get('/editor-workbench/workflow', { params })
    workflowRecords.value = res.records
  } finally {
    loadingWorkflow.value = false
  }
}

const loadPerformance = async () => {
  loadingPerf.value = true
  try {
    const res = await api.get('/editor-workbench/performance', {
      params: { periodType: perfFilter.value }
    })
    perfResults.value = res.results
    perfPeriodStart.value = new Date(res.periodStart)
    perfPeriodEnd.value = new Date(res.periodEnd)
  } finally {
    loadingPerf.value = false
  }
}

const loadAdmins = async () => {
  try {
    adminList.value = await api.get('/editor-workbench/admins')
  } catch (e) {}
}

const switchTab = (tab) => {
  currentTab.value = tab
  if (tab === 'overview') loadOverview()
  if (tab === 'submissions') loadPendingSubs()
  if (tab === 'proofreading') loadProofreading()
  if (tab === 'templates') loadTemplates()
  if (tab === 'notes') loadNotes()
  if (tab === 'workflow') loadWorkflow()
  if (tab === 'performance') loadPerformance()
}

const formatDate = (d) => {
  if (!d) return '-'
  const dt = new Date(d)
  return `${dt.getMonth() + 1}/${dt.getDate()}`
}

const formatDateTime = (d) => {
  if (!d) return '-'
  const dt = new Date(d)
  return `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
}

const sourceTypeLabel = (t) => ({
  SUBMISSION: '普通投稿', TOPIC: '专题投稿', COLLABORATION: '合作招募', CROWDFUNDING: '众筹项目'
}[t] || t)

const actionLabel = (a) => ({
  CREATE: '创建', STATUS_CHANGE: '状态变更', APPROVE: '通过', REJECT: '驳回',
  REVIEW: '审核', UPDATE: '更新', DELETE: '删除', ASSIGN: '分配', COMPLETE: '完成'
}[a] || a)

const priorityLabel = (p) => ({ URGENT: '紧急', HIGH: '高', NORMAL: '普通', LOW: '低' }[p] || p)

const proofStatusLabel = (s) => ({
  PENDING: '待处理', IN_PROGRESS: '进行中', REVIEW: '复核中', COMPLETED: '已完成', CANCELLED: '已取消'
}[s] || s)

const proofStatusClass = (s) => ({
  PENDING: 'badge-pending', IN_PROGRESS: '', REVIEW: 'badge-approved', COMPLETED: 'badge-approved', CANCELLED: 'badge-rejected'
}[s] || '')

const tplIcon = (t) => ({
  SUBMISSION: '📝', REVIEW: '🔍', APPROVE: '✅', REJECT: '❌', COLLABORATION: '🤝', OTHER: '📄'
}[t] || '📄')

const tplTypeLabel = (t) => ({
  SUBMISSION: '投稿', REVIEW: '审核', APPROVE: '通过', REJECT: '驳回', COLLABORATION: '合作', OTHER: '其他'
}[t] || t)

const goToReview = (item) => {
  if (item.sourceType === 'SUBMISSION') router.push('/admin')
  else if (item.sourceType === 'TOPIC') router.push('/admin')
  else if (item.sourceType === 'COLLABORATION') router.push('/admin/collaborations')
  else if (item.sourceType === 'CROWDFUNDING') router.push('/admin/crowdfundings')
}

const quickApprove = async (item) => {
  try {
    submitting.value = true
    if (item.sourceType === 'SUBMISSION') {
      await api.patch(`/admin/submissions/${item.id}/approve`, { category: '文学', tags: '原创', description: item.content?.substring(0, 100) })
    } else if (item.sourceType === 'TOPIC') {
      await api.patch(`/admin/topic-submissions/${item.id}/approve`)
    } else if (item.sourceType === 'COLLABORATION') {
      await api.patch(`/admin/collaborations/${item.id}/approve`)
    } else if (item.sourceType === 'CROWDFUNDING') {
      await api.patch(`/admin/crowdfundings/${item.id}/approve`)
    }
    await api.post('/editor-workbench/workflow', {
      targetType: item.sourceType,
      targetId: item.id,
      targetTitle: item.title,
      action: 'APPROVE',
      toStatus: 'APPROVED',
      remark: '工作台快速通过'
    })
    await Promise.all([loadOverview(), loadPendingSubs()])
  } catch (e) {
    alert(e.error || '操作失败')
  } finally {
    submitting.value = false
  }
}

const openQuickReject = (item) => {
  rejectTarget.value = item
  rejectForm.value = { reason: '' }
  showQuickReject.value = true
}

const submitQuickReject = async () => {
  if (!rejectForm.value.reason) { alert('请填写驳回原因'); return }
  try {
    submitting.value = true
    const item = rejectTarget.value
    if (item.sourceType === 'SUBMISSION') {
      await api.patch(`/admin/submissions/${item.id}/reject`, { reason: rejectForm.value.reason })
    } else if (item.sourceType === 'TOPIC') {
      await api.patch(`/admin/topic-submissions/${item.id}/reject`, { reason: rejectForm.value.reason })
    } else if (item.sourceType === 'COLLABORATION') {
      await api.patch(`/admin/collaborations/${item.id}/reject`, { reason: rejectForm.value.reason })
    } else if (item.sourceType === 'CROWDFUNDING') {
      await api.patch(`/admin/crowdfundings/${item.id}/reject`, { reason: rejectForm.value.reason })
    }
    await api.post('/editor-workbench/workflow', {
      targetType: item.sourceType,
      targetId: item.id,
      targetTitle: item.title,
      action: 'REJECT',
      toStatus: 'REJECTED',
      remark: rejectForm.value.reason
    })
    showQuickReject.value = false
    await Promise.all([loadOverview(), loadPendingSubs()])
  } catch (e) {
    alert(e.error || '操作失败')
  } finally {
    submitting.value = false
  }
}

const openProofForm = (t = null) => {
  editingProof.value = t
  if (t) {
    proofForm.value = {
      title: t.title, content: t.content, type: t.type, priority: t.priority,
      status: t.status, assigneeId: t.assigneeId || null,
      deadline: t.deadline ? new Date(t.deadline).toISOString().split('T')[0] : '',
      feedback: t.feedback || ''
    }
  } else {
    proofForm.value = { title: '', content: '', type: 'ZINE', priority: 'NORMAL', status: 'PENDING', assigneeId: null, deadline: '', feedback: '' }
  }
  showProofForm.value = true
}

const submitProofForm = async () => {
  if (!proofForm.value.title || !proofForm.value.content) { alert('请填写必填项'); return }
  try {
    submitting.value = true
    if (editingProof.value) {
      await api.patch(`/editor-workbench/proofreading/${editingProof.value.id}`, proofForm.value)
    } else {
      await api.post('/editor-workbench/proofreading', proofForm.value)
    }
    showProofForm.value = false
    await Promise.all([loadOverview(), loadProofreading()])
  } catch (e) {
    alert(e.error || '保存失败')
  } finally {
    submitting.value = false
  }
}

const deleteProof = async (t) => {
  if (!confirm('确认删除此校对任务？')) return
  try {
    await api.delete(`/editor-workbench/proofreading/${t.id}`)
    await Promise.all([loadOverview(), loadProofreading()])
  } catch (e) { alert(e.error || '删除失败') }
}

const openTemplateForm = (t = null) => {
  editingTemplate.value = t
  if (t) {
    templateForm.value = { ...t }
  } else {
    templateForm.value = { name: '', type: 'SUBMISSION', category: 'GENERAL', content: '', description: '', isPublic: true, sortOrder: 0 }
  }
  showTemplateForm.value = true
}

const submitTemplateForm = async () => {
  if (!templateForm.value.name || !templateForm.value.content) { alert('请填写必填项'); return }
  try {
    submitting.value = true
    if (editingTemplate.value) {
      await api.patch(`/editor-workbench/templates/${editingTemplate.value.id}`, templateForm.value)
    } else {
      await api.post('/editor-workbench/templates', templateForm.value)
    }
    showTemplateForm.value = false
    await loadTemplates()
  } catch (e) {
    alert(e.error || '保存失败')
  } finally {
    submitting.value = false
  }
}

const deleteTemplate = async (t) => {
  if (!confirm('确认删除此模板？')) return
  try {
    await api.delete(`/editor-workbench/templates/${t.id}`)
    await loadTemplates()
  } catch (e) { alert(e.error || '删除失败') }
}

const useTemplate = async (t) => {
  try {
    await api.post(`/editor-workbench/templates/${t.id}/use`)
    navigator.clipboard?.writeText(t.content)
    alert('模板内容已复制到剪贴板')
    await loadTemplates()
  } catch (e) { alert(e.error || '操作失败') }
}

const openNoteForm = (n = null) => {
  editingNote.value = n
  if (n) {
    noteForm.value = {
      targetType: n.targetType, targetId: n.targetId, targetTitle: n.targetTitle || '',
      content: n.content, color: n.color, isPinned: n.isPinned
    }
  } else {
    noteForm.value = { targetType: 'GENERAL', targetId: 0, targetTitle: '', content: '', color: '#ffeaa7', isPinned: false }
  }
  showNoteForm.value = true
}

const submitNoteForm = async () => {
  if (!noteForm.value.content) { alert('请填写备注内容'); return }
  try {
    submitting.value = true
    if (editingNote.value) {
      await api.patch(`/editor-workbench/notes/${editingNote.value.id}`, noteForm.value)
    } else {
      await api.post('/editor-workbench/notes', noteForm.value)
    }
    showNoteForm.value = false
    await loadNotes()
  } catch (e) {
    alert(e.error || '保存失败')
  } finally {
    submitting.value = false
  }
}

const deleteNote = async (n) => {
  if (!confirm('确认删除此备注？')) return
  try {
    await api.delete(`/editor-workbench/notes/${n.id}`)
    await loadNotes()
  } catch (e) { alert(e.error || '删除失败') }
}

watch(proofFilter, () => loadProofreading())
watch(templateTypeFilter, () => loadTemplates())
watch(wfFilter, () => loadWorkflow())
watch(perfFilter, () => loadPerformance())
watch(subFilter, () => loadPendingSubs())

onMounted(async () => {
  await Promise.all([loadOverview(), loadAdmins()])
})
</script>

<style scoped>
.workbench-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
@media (max-width: 900px) {
  .workbench-grid { grid-template-columns: 1fr; }
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  margin-left: 4px;
}

.stat-card {
  cursor: pointer;
  transition: transform 0.15s;
}
.stat-card:hover {
  transform: translateY(-2px);
}

.pending-list { display: flex; flex-direction: column; gap: 12px; }
.pending-item {
  padding: 14px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: background 0.15s;
}
.pending-item:hover { background: var(--accent-light); }

.badge-source { font-size: 10px; padding: 2px 8px; }
.source-submission { background: #dfe6e9; color: #2d3436; }
.source-topic { background: #a29bfe; color: #fff; }
.source-collaboration { background: #55efc4; color: #2d3436; }
.source-crowdfunding { background: #fd79a8; color: #fff; }

.workflow-list { display: flex; flex-direction: column; gap: 16px; }
.workflow-item {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--border-light);
}
.workflow-item:last-child { border-bottom: none; }
.wf-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  flex-shrink: 0; background: var(--bg-tertiary);
}
.wf-content { flex: 1; min-width: 0; }
.wf-action {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}
.action-create { background: #dfe6e9; color: #2d3436; }
.action-status_change { background: #74b9ff; color: #fff; }
.action-approve { background: #55efc4; color: #2d3436; }
.action-reject { background: #fab1a0; color: #2d3436; }

.submissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}
.sub-group { display: flex; flex-direction: column; }
.sub-review-list { display: flex; flex-direction: column; gap: 12px; max-height: 600px; overflow-y: auto; }
.sub-review-card {
  padding: 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.priority-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.priority-urgent { background: #d63031; color: #fff; }
.priority-high { background: #fdcb6e; color: #2d3436; }
.priority-normal { background: #74b9ff; color: #fff; }
.priority-low { background: #b2bec3; color: #2d3436; }

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.template-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
}
.template-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.tpl-icon { font-size: 20px; }
.tag-public { background: var(--success-light); color: var(--success); }
.template-preview {
  background: var(--bg-secondary);
  padding: 10px 12px;
  border-radius: 6px;
  border-left: 3px solid var(--accent);
  flex: 1;
}
.template-card-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px dashed var(--border-light);
}
.btn-xs { padding: 4px 10px; font-size: 12px; }

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.note-card {
  padding: 16px;
  border-radius: var(--radius);
  border-left: 4px solid;
  transition: transform 0.15s;
}
.note-card:hover { transform: translateY(-2px); }
.note-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.pin-icon { font-size: 14px; }
.note-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
}
.note-avatar { width: 20px; height: 20px; border-radius: 50%; }
.icon-btn {
  width: 26px; height: 26px;
  border: none;
  background: rgba(0,0,0,0.05);
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background 0.15s;
}
.icon-btn:hover { background: rgba(0,0,0,0.1); }
.icon-btn.danger:hover { background: rgba(214,48,49,0.2); }

.perf-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 20px;
}
.perf-card {}
.perf-avatar {
  width: 56px; height: 56px;
  border-radius: 50%;
  border: 3px solid var(--accent-light);
}
.perf-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
.perf-stat { text-align: center; }
.perf-stat-num {
  font-size: 24px;
  font-weight: 700;
  font-family: var(--font-serif);
  line-height: 1.2;
}
.text-success { color: var(--success); }
.text-danger { color: var(--danger); }
.perf-stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
}
.perf-breakdown { display: flex; flex-direction: column; gap: 10px; }
.perf-breakdown-item {}
.perf-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}
.perf-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.color-picker {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.color-dot {
  width: 30px; height: 30px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s;
}
.color-dot.active {
  border-color: var(--accent);
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.max-w-200 { max-width: 200px; }
.gap-xs { gap: 4px; }
.gap-md { gap: 16px; }
.mt-md { margin-top: 16px; }
.pt-md { padding-top: 16px; }
.mb-xs { margin-bottom: 4px; }
</style>
