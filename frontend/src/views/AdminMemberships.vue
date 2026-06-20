<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">会员管理</h1>
      <p class="page-subtitle">管理会员方案、专属内容与用户权益</p>
    </div>

    <div class="admin-tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="['admin-tab', { active: currentTab === t.value }]"
        @click="currentTab = t.value; loadTabData()"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </div>

    <div v-if="currentTab === 'overview'" class="section">
      <div v-if="loadingOverview" class="empty-state py-8"><div class="empty-state-icon">⏳</div></div>
      <div v-else>
        <div class="stats-grid">
          <div class="stat-card card">
            <div class="stat-icon" style="background: #fef3c7; color: #f59e0b;">👥</div>
            <div class="stat-info">
              <div class="stat-num">{{ stats?.totalMembers || 0 }}</div>
              <div class="stat-label">累计会员数</div>
            </div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon" style="background: #dcfce7; color: #16a34a;">⭐</div>
            <div class="stat-info">
              <div class="stat-num">{{ stats?.activeMembers || 0 }}</div>
              <div class="stat-label">活跃会员数</div>
            </div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon" style="background: #dbeafe; color: #2563eb;">📋</div>
            <div class="stat-info">
              <div class="stat-num">{{ stats?.totalPlans || 0 }}</div>
              <div class="stat-label">会员方案</div>
            </div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon" style="background: #f3e8ff; color: #9333ea;">🆕</div>
            <div class="stat-info">
              <div class="stat-num">{{ stats?.newMembersThisMonth || 0 }}</div>
              <div class="stat-label">本月新增</div>
            </div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon" style="background: #fee2e2; color: #dc2626;">📖</div>
            <div class="stat-info">
              <div class="stat-num">{{ stats?.exclusiveZineCount || 0 }}</div>
              <div class="stat-label">专属刊物</div>
            </div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon" style="background: #cffafe; color: #0891b2;">⏰</div>
            <div class="stat-info">
              <div class="stat-num">{{ stats?.earlyAccessCount || 0 }}</div>
              <div class="stat-label">提前阅读</div>
            </div>
          </div>
        </div>

        <div class="card mt-lg" style="padding: 24px;">
          <h3 class="font-semibold mb">方案订阅统计</h3>
          <div v-if="!planStats || planStats.length === 0" class="text-sm text-muted text-center py-8">
            暂无数据
          </div>
          <div v-else class="plan-stats">
            <div v-for="p in planStats" :key="p.id" class="plan-stat-item">
              <div class="plan-stat-name">{{ p.icon }} {{ p.name }}</div>
              <div class="plan-stat-bar">
                <div
                  class="plan-stat-fill"
                  :style="{
                    width: (p._count.userMemberships / maxPlanCount * 100) + '%',
                    background: p.color
                  }"
                ></div>
              </div>
              <div class="plan-stat-count">{{ p._count.userMemberships }} 人</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'plans'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">会员方案管理</h3>
        <button class="btn btn-primary btn-sm" @click="openPlanForm()">+ 新建方案</button>
      </div>
      <div v-if="loadingPlans" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>图标</th>
              <th>方案名称</th>
              <th>编码</th>
              <th>价格</th>
              <th>时长</th>
              <th>等级限制</th>
              <th>状态</th>
              <th>推荐</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in plans" :key="p.id">
              <td><span class="text-2xl">{{ p.icon || '⭐' }}</span></td>
              <td class="font-medium">{{ p.name }}</td>
              <td class="text-sm text-muted">{{ p.code }}</td>
              <td>¥{{ p.price }}</td>
              <td>{{ p.durationDays }} 天</td>
              <td>Lv.{{ p.level }}</td>
              <td>
                <span :class="['badge', p.isActive ? 'badge-approved' : 'badge-rejected']">
                  {{ p.isActive ? '启用' : '禁用' }}
                </span>
              </td>
              <td>
                <span v-if="p.isRecommended" class="badge badge-approved">推荐</span>
                <span v-else class="text-sm text-muted">-</span>
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openPlanForm(p)">编辑</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deletePlan(p)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'exclusive'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">专属刊物管理</h3>
        <button class="btn btn-primary btn-sm" @click="openExclusiveForm()">+ 新建内容</button>
      </div>
      <div v-if="loadingExclusive" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>封面</th>
              <th>标题</th>
              <th>分类</th>
              <th>等级要求</th>
              <th>会员限定</th>
              <th>浏览量</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="z in exclusiveZines" :key="z.id">
              <td><img v-if="z.coverImage" :src="z.coverImage" class="thumb-cover"></td>
              <td class="font-medium">{{ z.title }}</td>
              <td><span class="tag">{{ z.category }}</span></td>
              <td>Lv.{{ z.minLevel }}</td>
              <td>
                <span v-if="z.requirePlan" class="badge badge-approved">是</span>
                <span v-else class="text-sm text-muted">否</span>
              </td>
              <td>{{ z.views }}</td>
              <td>
                <span :class="['badge', z.status === 'PUBLISHED' ? 'badge-approved' : 'badge-pending']">
                  {{ z.status === 'PUBLISHED' ? '已发布' : '草稿' }}
                </span>
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openExclusiveForm(z)">编辑</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteExclusive(z)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'early'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">提前阅读管理</h3>
        <button class="btn btn-primary btn-sm" @click="openEarlyForm()">+ 新建内容</button>
      </div>
      <div v-if="loadingEarly" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>发布时间</th>
              <th>提前时长</th>
              <th>等级要求</th>
              <th>会员限定</th>
              <th>浏览量</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in earlyItems" :key="e.id">
              <td class="font-medium">{{ e.title }}</td>
              <td class="text-sm">{{ formatDateTime(e.publishDate) }}</td>
              <td>{{ e.earlyHours }} 小时</td>
              <td>Lv.{{ e.minLevel }}</td>
              <td>
                <span v-if="e.requirePlan" class="badge badge-approved">是</span>
                <span v-else class="text-sm text-muted">否</span>
              </td>
              <td>{{ e.views }}</td>
              <td>
                <span :class="['badge', e.status === 'PUBLISHED' ? 'badge-approved' : 'badge-pending']">
                  {{ e.status === 'PUBLISHED' ? '已发布' : e.status === 'PENDING' ? '待发布' : e.status }}
                </span>
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openEarlyForm(e)">编辑</button>
                <button class="btn btn-ghost btn-sm danger-btn" @click="deleteEarly(e)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'members'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">会员用户管理</h3>
        <div class="filter-tabs flex gap-sm">
          <select v-model="memberFilter" class="form-select" style="width: auto;" @change="loadMembers(1)">
            <option value="">全部状态</option>
            <option value="ACTIVE">活跃</option>
            <option value="EXPIRED">已过期</option>
            <option value="CANCELLED">已取消</option>
          </select>
        </div>
      </div>
      <div v-if="loadingMembers" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else class="admin-list card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>会员方案</th>
              <th>开始时间</th>
              <th>到期时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in members" :key="m.id">
              <td>
                <div class="flex items-center gap-sm">
                  <img v-if="m.user?.avatar" :src="m.user.avatar" style="width: 32px; height: 32px; border-radius: 50%;">
                  <div>
                    <div class="font-medium">{{ m.user?.username }}</div>
                    <div class="text-xs text-muted">{{ m.user?.email }}</div>
                  </div>
                </div>
              </td>
              <td>{{ m.plan?.name }}</td>
              <td class="text-sm text-muted">{{ formatDate(m.startDate) }}</td>
              <td class="text-sm text-muted">{{ formatDate(m.endDate) }}</td>
              <td>
                <span :class="['badge', m.status === 'ACTIVE' ? 'badge-approved' : 'badge-rejected']">
                  {{ statusLabel(m.status) }}
                </span>
              </td>
              <td>
                <button v-if="m.status === 'ACTIVE'" class="btn btn-ghost btn-sm danger-btn" @click="revokeMember(m)">撤销</button>
                <button v-else class="btn btn-ghost btn-sm" @click="openGrantModal(m.user?.id)">开通</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="currentTab === 'messages'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">会员消息触达</h3>
      </div>
      <div class="card" style="padding: 24px;">
        <div class="form-group">
          <label class="form-label">消息标题 <span style="color: var(--danger);">*</span></label>
          <input v-model="messageForm.title" type="text" class="form-input" placeholder="消息标题">
        </div>
        <div class="form-group">
          <label class="form-label">消息内容 <span style="color: var(--danger);">*</span></label>
          <textarea v-model="messageForm.content" class="form-textarea" rows="4" placeholder="消息内容..."></textarea>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label class="form-label">目标方案</label>
            <select v-model="messageForm.planId" class="form-select">
              <option :value="null">全部方案</option>
              <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">最低等级</label>
            <input v-model.number="messageForm.minLevel" type="number" class="form-input" min="1" placeholder="1 = 全部等级">
          </div>
        </div>
        <button class="btn btn-primary" @click="sendMessage" :disabled="sendingMessage">
          {{ sendingMessage ? '发送中...' : '发送消息' }}
        </button>
      </div>
    </div>

    <div v-if="currentTab === 'config'" class="section">
      <div class="flex justify-between items-center mb">
        <h3 class="font-semibold">会员配置</h3>
        <button class="btn btn-primary btn-sm" @click="saveConfig">保存配置</button>
      </div>
      <div v-if="loadingConfig" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else class="card" style="padding: 24px;">
        <div
          v-for="cfg in configs"
          :key="cfg.key"
          class="form-group"
        >
          <label class="form-label">{{ cfg.key }}</label>
          <input v-model="cfg.value" type="text" class="form-input">
          <div v-if="cfg.description" class="text-xs text-muted mt-sm">{{ cfg.description }}</div>
        </div>
      </div>
    </div>

    <div v-if="showPlanForm" class="modal-overlay" @click.self="showPlanForm = false">
      <div class="modal card" style="max-width: 640px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingPlan ? '编辑方案' : '新建方案' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showPlanForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">方案名称 *</label>
              <input v-model="planForm.name" type="text" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">方案编码 *</label>
              <input v-model="planForm.code" type="text" class="form-input" required>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">价格</label>
              <input v-model.number="planForm.price" type="number" class="form-input" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label class="form-label">原价</label>
              <input v-model.number="planForm.originalPrice" type="number" class="form-input" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label class="form-label">时长(天)</label>
              <input v-model.number="planForm.durationDays" type="number" class="form-input" min="1">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">等级要求</label>
              <input v-model.number="planForm.level" type="number" class="form-input" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">图标</label>
              <input v-model="planForm.icon" type="text" class="form-input" placeholder="例：👑">
            </div>
            <div class="form-group">
              <label class="form-label">主题色</label>
              <input v-model="planForm.color" type="color" class="form-input" style="height: 42px; padding: 4px;">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="planForm.description" class="form-textarea" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">权益列表（每行一项）</label>
            <textarea v-model="planForm.benefitsText" class="form-textarea" rows="4" placeholder="例：&#10;专属刊物&#10;提前阅读"></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">排序</label>
              <input v-model.number="planForm.sortOrder" type="number" class="form-input" min="0">
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="planForm.isActive">
                <span>启用</span>
              </label>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="planForm.isRecommended">
                <span>推荐</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showPlanForm = false">取消</button>
          <button class="btn btn-primary" @click="submitPlanForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingPlan ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showExclusiveForm" class="modal-overlay" @click.self="showExclusiveForm = false">
      <div class="modal card" style="max-width: 640px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingExclusive ? '编辑内容' : '新建专属刊物' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showExclusiveForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">标题 *</label>
            <input v-model="exclusiveForm.title" type="text" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <input v-model="exclusiveForm.description" type="text" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">封面图片</label>
            <input v-model="exclusiveForm.coverImage" type="text" class="form-input" placeholder="图片URL">
          </div>
          <div class="form-group">
            <label class="form-label">内容 *</label>
            <textarea v-model="exclusiveForm.content" class="form-textarea" rows="6" required></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">分类</label>
              <input v-model="exclusiveForm.category" type="text" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">等级要求</label>
              <input v-model.number="exclusiveForm.minLevel" type="number" class="form-input" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="exclusiveForm.status" class="form-select">
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">发布</option>
              </select>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="exclusiveForm.requirePlan">
                <span>仅限会员</span>
              </label>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="exclusiveForm.isFeatured">
                <span>精选推荐</span>
              </label>
            </div>
            <div class="form-group">
              <label class="form-label">排序</label>
              <input v-model.number="exclusiveForm.sortOrder" type="number" class="form-input" min="0">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showExclusiveForm = false">取消</button>
          <button class="btn btn-primary" @click="submitExclusiveForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingExclusive ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showEarlyForm" class="modal-overlay" @click.self="showEarlyForm = false">
      <div class="modal card" style="max-width: 640px;">
        <div class="modal-header">
          <h3 class="font-semibold">{{ editingEarly ? '编辑内容' : '新建提前阅读' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showEarlyForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">标题 *</label>
            <input v-model="earlyForm.title" type="text" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <input v-model="earlyForm.description" type="text" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">封面图片</label>
            <input v-model="earlyForm.coverImage" type="text" class="form-input" placeholder="图片URL">
          </div>
          <div class="form-group">
            <label class="form-label">内容 *</label>
            <textarea v-model="earlyForm.content" class="form-textarea" rows="6" required></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">发布时间 *</label>
              <input v-model="earlyForm.publishDate" type="datetime-local" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">提前时长(小时)</label>
              <input v-model.number="earlyForm.earlyHours" type="number" class="form-input" min="1">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">等级要求</label>
              <input v-model.number="earlyForm.minLevel" type="number" class="form-input" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="earlyForm.status" class="form-select">
                <option value="PENDING">待发布</option>
                <option value="PUBLISHED">已发布</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">排序</label>
              <input v-model.number="earlyForm.sortOrder" type="number" class="form-input" min="0">
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="earlyForm.requirePlan">
              <span>仅限会员</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showEarlyForm = false">取消</button>
          <button class="btn btn-primary" @click="submitEarlyForm" :disabled="submitting">
            {{ submitting ? '处理中...' : (editingEarly ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showGrantModal" class="modal-overlay" @click.self="showGrantModal = false">
      <div class="modal card" style="max-width: 460px;">
        <div class="modal-header">
          <h3 class="font-semibold">为用户开通会员</h3>
          <button class="btn btn-ghost btn-sm" @click="showGrantModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">用户ID</label>
            <input v-model.number="grantForm.userId" type="number" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">会员方案 *</label>
            <select v-model.number="grantForm.planId" class="form-select" required>
              <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">时长(天) *</label>
            <input v-model.number="grantForm.durationDays" type="number" class="form-input" min="1" required>
          </div>
          <div class="form-group">
            <label class="form-label">备注原因</label>
            <input v-model="grantForm.reason" type="text" class="form-input" placeholder="开通原因">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showGrantModal = false">取消</button>
          <button class="btn btn-primary" @click="grantMembership" :disabled="submitting">
            {{ submitting ? '处理中...' : '确认开通' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '@/utils/api'

const showToast = inject('showToast')

const tabs = [
  { value: 'overview', label: '概览', icon: '📊' },
  { value: 'plans', label: '方案管理', icon: '📋' },
  { value: 'exclusive', label: '专属刊物', icon: '📖' },
  { value: 'early', label: '提前阅读', icon: '⏰' },
  { value: 'members', label: '会员用户', icon: '👥' },
  { value: 'messages', label: '消息触达', icon: '💬' },
  { value: 'config', label: '系统配置', icon: '⚙️' }
]

const currentTab = ref('overview')
const submitting = ref(false)
const sendingMessage = ref(false)

const loadingOverview = ref(false)
const stats = ref(null)
const planStats = ref([])
const maxPlanCount = computed(() => Math.max(1, ...(planStats.value?.map(p => p._count.userMemberships) || [1])))

const loadingPlans = ref(false)
const plans = ref([])
const showPlanForm = ref(false)
const editingPlan = ref(null)
const planForm = ref({})

const loadingExclusive = ref(false)
const exclusiveZines = ref([])
const showExclusiveForm = ref(false)
const editingExclusive = ref(null)
const exclusiveForm = ref({})

const loadingEarly = ref(false)
const earlyItems = ref([])
const showEarlyForm = ref(false)
const editingEarly = ref(null)
const earlyForm = ref({})

const loadingMembers = ref(false)
const members = ref([])
const memberFilter = ref('')
const showGrantModal = ref(false)
const grantForm = ref({ userId: null, planId: null, durationDays: 30, reason: '' })

const messageForm = ref({ title: '', content: '', planId: null, minLevel: 1 })

const loadingConfig = ref(false)
const configs = ref([])

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

const formatDateTime = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const statusLabel = (status) => {
  const labels = { ACTIVE: '活跃', EXPIRED: '已过期', CANCELLED: '已取消', REVOKED: '已撤销' }
  return labels[status] || status
}

const loadTabData = () => {
  if (currentTab.value === 'overview') loadOverview()
  if (currentTab.value === 'plans') loadPlans()
  if (currentTab.value === 'exclusive') loadExclusive()
  if (currentTab.value === 'early') loadEarly()
  if (currentTab.value === 'members') loadMembers()
  if (currentTab.value === 'config') loadConfig()
}

const loadOverview = async () => {
  loadingOverview.value = true
  try {
    const res = await api.get('/memberships/stats')
    stats.value = res.stats
    planStats.value = res.planStats
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loadingOverview.value = false
  }
}

const loadPlans = async () => {
  loadingPlans.value = true
  try {
    const res = await api.get('/admin/memberships/plans')
    plans.value = res.plans
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loadingPlans.value = false
  }
}

const loadExclusive = async () => {
  loadingExclusive.value = true
  try {
    const res = await api.get('/admin/memberships/exclusive-zines')
    exclusiveZines.value = res.zines
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loadingExclusive.value = false
  }
}

const loadEarly = async () => {
  loadingEarly.value = true
  try {
    const res = await api.get('/admin/memberships/early-access')
    earlyItems.value = res.items
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loadingEarly.value = false
  }
}

const loadMembers = async (page = 1) => {
  loadingMembers.value = true
  try {
    let url = `/admin/memberships/members?page=${page}&limit=20`
    if (memberFilter.value) url += `&status=${memberFilter.value}`
    const res = await api.get(url)
    members.value = res.memberships
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loadingMembers.value = false
  }
}

const loadConfig = async () => {
  loadingConfig.value = true
  try {
    const res = await api.get('/admin/memberships/config')
    configs.value = res.configs
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loadingConfig.value = false
  }
}

const openPlanForm = (plan = null) => {
  editingPlan.value = plan
  if (plan) {
    planForm.value = {
      ...plan,
      benefitsText: (() => { try { return JSON.parse(plan.benefits || '[]').join('\n') } catch { return '' } })()
    }
  } else {
    planForm.value = {
      name: '', code: '', description: '', price: 0, originalPrice: 0,
      durationDays: 30, level: 1, color: '#d4624a', icon: '⭐',
      benefitsText: '', sortOrder: 0, isActive: true, isRecommended: false
    }
  }
  showPlanForm.value = true
}

const submitPlanForm = async () => {
  submitting.value = true
  try {
    const benefits = planForm.value.benefitsText?.split('\n').filter(b => b.trim()) || []
    const data = { ...planForm.value, benefits }
    if (editingPlan.value) {
      await api.put(`/admin/memberships/plans/${editingPlan.value.id}`, data)
      showToast('更新成功')
    } else {
      await api.post('/admin/memberships/plans', data)
      showToast('创建成功')
    }
    showPlanForm.value = false
    await loadPlans()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deletePlan = async (plan) => {
  if (!confirm(`确定删除方案「${plan.name}」吗？`)) return
  try {
    await api.del(`/admin/memberships/plans/${plan.id}`)
    showToast('删除成功')
    await loadPlans()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const openExclusiveForm = (zine = null) => {
  editingExclusive.value = zine
  if (zine) {
    exclusiveForm.value = { ...zine }
  } else {
    exclusiveForm.value = {
      title: '', description: '', coverImage: '', content: '',
      category: 'MEMBER', minLevel: 1, requirePlan: true,
      status: 'PUBLISHED', sortOrder: 0, isFeatured: false
    }
  }
  showExclusiveForm.value = true
}

const submitExclusiveForm = async () => {
  submitting.value = true
  try {
    if (editingExclusive.value) {
      await api.put(`/admin/memberships/exclusive-zines/${editingExclusive.value.id}`, exclusiveForm.value)
      showToast('更新成功')
    } else {
      await api.post('/admin/memberships/exclusive-zines', exclusiveForm.value)
      showToast('创建成功')
    }
    showExclusiveForm.value = false
    await loadExclusive()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteExclusive = async (zine) => {
  if (!confirm(`确定删除「${zine.title}」吗？`)) return
  try {
    await api.del(`/admin/memberships/exclusive-zines/${zine.id}`)
    showToast('删除成功')
    await loadExclusive()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const openEarlyForm = (item = null) => {
  editingEarly.value = item
  if (item) {
    earlyForm.value = {
      ...item,
      publishDate: new Date(item.publishDate).toISOString().slice(0, 16)
    }
  } else {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    earlyForm.value = {
      title: '', description: '', coverImage: '', content: '',
      publishDate: tomorrow.toISOString().slice(0, 16),
      earlyHours: 24, minLevel: 1, requirePlan: true,
      status: 'PENDING', sortOrder: 0
    }
  }
  showEarlyForm.value = true
}

const submitEarlyForm = async () => {
  submitting.value = true
  try {
    if (editingEarly.value) {
      await api.put(`/admin/memberships/early-access/${editingEarly.value.id}`, earlyForm.value)
      showToast('更新成功')
    } else {
      await api.post('/admin/memberships/early-access', earlyForm.value)
      showToast('创建成功')
    }
    showEarlyForm.value = false
    await loadEarly()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteEarly = async (item) => {
  if (!confirm(`确定删除「${item.title}」吗？`)) return
  try {
    await api.del(`/admin/memberships/early-access/${item.id}`)
    showToast('删除成功')
    await loadEarly()
  } catch (e) {
    showToast(e.error || '删除失败', 'error')
  }
}

const openGrantModal = (userId = null) => {
  grantForm.value = { userId, planId: plans.value[0]?.id || null, durationDays: 30, reason: '' }
  showGrantModal.value = true
}

const grantMembership = async () => {
  if (!grantForm.value.userId || !grantForm.value.planId || !grantForm.value.durationDays) {
    showToast('请填写完整信息', 'error')
    return
  }
  submitting.value = true
  try {
    await api.post(`/admin/memberships/members/${grantForm.value.userId}/grant`, {
      planId: grantForm.value.planId,
      durationDays: grantForm.value.durationDays,
      reason: grantForm.value.reason
    })
    showToast('开通成功')
    showGrantModal.value = false
    await loadMembers()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const revokeMember = async (m) => {
  if (!confirm(`确定撤销用户「${m.user?.username}」的会员吗？`)) return
  try {
    await api.post(`/admin/memberships/members/${m.userId}/revoke`, { reason: '管理员操作' })
    showToast('已撤销')
    await loadMembers()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const sendMessage = async () => {
  if (!messageForm.value.title || !messageForm.value.content) {
    showToast('请填写标题和内容', 'error')
    return
  }
  sendingMessage.value = true
  try {
    const res = await api.post('/memberships/messages/send-to-members', messageForm.value)
    showToast(res.message || '发送成功')
    messageForm.value = { title: '', content: '', planId: null, minLevel: 1 }
  } catch (e) {
    showToast(e.error || '发送失败', 'error')
  } finally {
    sendingMessage.value = false
  }
}

const saveConfig = async () => {
  try {
    await api.put('/admin/memberships/config', { configs: configs.value })
    showToast('配置已保存')
  } catch (e) {
    showToast(e.error || '保存失败', 'error')
  }
}

onMounted(() => loadTabData())
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
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
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}
.stat-num {
  font-size: 28px;
  font-weight: 700;
  font-family: var(--font-serif);
  line-height: 1.2;
}
.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.plan-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.plan-stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.plan-stat-name {
  width: 120px;
  font-size: 14px;
  flex-shrink: 0;
}
.plan-stat-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}
.plan-stat-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}
.plan-stat-count {
  width: 80px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.thumb-cover {
  width: 60px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}
</style>
