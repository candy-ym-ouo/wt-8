<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">📜 版权授权中心</h1>
      <p class="page-subtitle">申请版权授权、管理合同状态、跟踪审批进度</p>
    </div>

    <div class="cl-tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="['cl-tab', { active: currentTab === t.value }]"
        @click="switchTab(t.value)"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
        <span v-if="t.badge && t.badge > 0" class="tab-badge">{{ t.badge }}</span>
      </button>
    </div>

    <div v-if="currentTab === 'new'" class="section">
      <div class="card" style="padding: 28px;">
        <h3 class="font-semibold mb" style="font-size: 18px;">📝 新建版权授权申请</h3>

        <div class="form-step" v-if="formStep === 1">
          <div class="step-title"><span class="step-num">1</span> 选择授权作品</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">作品类型 <span class="required">*</span></label>
              <select v-model="form.workType" class="form-select" required>
                <option v-for="w in workTypes" :key="w.value" :value="w.value">{{ w.icon }} {{ w.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">作品ID <span class="required">*</span></label>
              <input v-model.number="form.workId" type="number" class="form-input" placeholder="输入作品ID" required>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">作品标题</label>
              <input v-model="form.workTitle" type="text" class="form-input" placeholder="（可选）作品标题">
            </div>
            <div class="form-group">
              <label class="form-label">作者用户ID <span class="required">*</span></label>
              <input v-model.number="form.authorId" type="number" class="form-input" placeholder="输入作者用户ID" required>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" @click="formStep = 2">下一步：填写用途 →</button>
          </div>
        </div>

        <div class="form-step" v-if="formStep === 2">
          <div class="step-title"><span class="step-num">2</span> 说明使用用途</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">用途分类 <span class="required">*</span></label>
              <select v-model="form.purposeCategory" class="form-select" required>
                <option v-for="p in purposeCategories" :key="p.value" :value="p.value">{{ p.icon }} {{ p.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">使用范围 <span class="required">*</span></label>
              <select v-model="form.usageScope" class="form-select" required>
                <option v-for="s in usageScopes" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">详细用途说明 <span class="required">*</span></label>
            <textarea v-model="form.purposeDetail" class="form-textarea" rows="5" placeholder="请详细说明您的使用场景、方式、预计受众等信息，这有助于作者更快地确认授权..." required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">使用地区（可选）</label>
            <input v-model="regionsText" type="text" class="form-input" placeholder="多个地区用逗号分隔，如：中国大陆,中国香港,美国">
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="formStep = 1">← 上一步</button>
            <button class="btn btn-primary" @click="formStep = 3">下一步：选择授权 →</button>
          </div>
        </div>

        <div class="form-step" v-if="formStep === 3">
          <div class="step-title"><span class="step-num">3</span> 选择授权方式</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">授权类型 <span class="required">*</span></label>
              <select v-model="form.licenseType" class="form-select" required>
                <option v-for="l in licenseTypes" :key="l.value" :value="l.value">{{ l.icon }} {{ l.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">授权费用（元）</label>
              <input v-model.number="form.licenseFee" type="number" min="0" step="0.01" class="form-input" placeholder="0 表示免费">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">生效日期</label>
              <input v-model="form.startDate" type="date" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">到期日期</label>
              <input v-model="form.endDate" type="date" class="form-input">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">授权期限（天）</label>
            <input v-model.number="form.durationDays" type="number" min="0" class="form-input" placeholder="0 表示长期有效">
          </div>
          <div class="permission-grid">
            <label class="permission-item">
              <input type="checkbox" v-model="form.commercialUse">
              <div>
                <div class="perm-title">💰 商业使用</div>
                <div class="perm-desc">允许用于商业盈利目的</div>
              </div>
            </label>
            <label class="permission-item">
              <input type="checkbox" v-model="form.derivativeAllowed">
              <div>
                <div class="perm-title">🎨 衍生创作</div>
                <div class="perm-desc">允许基于原作品进行二次创作</div>
              </div>
            </label>
            <label class="permission-item">
              <input type="checkbox" v-model="form.distributeAllowed">
              <div>
                <div class="perm-title">📤 分发传播</div>
                <div class="perm-desc">允许向第三方分发作品</div>
              </div>
            </label>
            <label class="permission-item">
              <input type="checkbox" v-model="form.attributionRequired">
              <div>
                <div class="perm-title">📛 署名要求</div>
                <div class="perm-desc">使用时必须标注原作者</div>
              </div>
            </label>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="formStep = 2">← 上一步</button>
            <button class="btn btn-primary" @click="formStep = 4">下一步：补充信息 →</button>
          </div>
        </div>

        <div class="form-step" v-if="formStep === 4">
          <div class="step-title"><span class="step-num">4</span> 补充信息</div>
          <div class="form-group">
            <label class="form-label">申请标题</label>
            <input v-model="form.title" type="text" class="form-input" placeholder="（可选）自定义申请标题">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">联系方式</label>
              <input v-model="form.applicantContact" type="text" class="form-input" placeholder="手机号/邮箱等">
            </div>
            <div class="form-group">
              <label class="form-label">所属公司/机构</label>
              <input v-model="form.applicantCompany" type="text" class="form-input" placeholder="（可选）">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">合同内容（可选）</label>
            <textarea v-model="form.contractContent" class="form-textarea" rows="4" placeholder="如有特殊合同条款，请在此说明..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">附件链接（每行一个）</label>
            <textarea v-model="attachmentsText" class="form-textarea" rows="2" placeholder="相关参考资料链接..."></textarea>
          </div>
          <div class="form-summary card" style="background: var(--bg-tertiary); padding: 20px; margin: 20px 0;">
            <h4 class="font-semibold mb" style="font-size: 15px;">📋 申请信息预览</h4>
            <div class="summary-grid">
              <div class="summary-item"><span>作品：</span>{{ form.workType }} #{{ form.workId }} {{ form.workTitle }}</div>
              <div class="summary-item"><span>用途：</span>{{ getPurposeLabel(form.purposeCategory) }}</div>
              <div class="summary-item"><span>范围：</span>{{ getScopeLabel(form.usageScope) }}</div>
              <div class="summary-item"><span>授权：</span>{{ getLicenseTypeLabel(form.licenseType) }}</div>
              <div class="summary-item"><span>费用：</span>¥{{ form.licenseFee || 0 }}</div>
              <div class="summary-item"><span>期限：</span>{{ form.durationDays ? form.durationDays + '天' : (form.startDate && form.endDate ? form.startDate + ' 至 ' + form.endDate : '长期') }}</div>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="formStep = 3">← 上一步</button>
            <button class="btn btn-ghost" @click="submitForm(false)" :disabled="submitting">{{ submitting ? '保存中...' : '💾 保存为草稿' }}</button>
            <button class="btn btn-primary" @click="submitForm(true)" :disabled="submitting">{{ submitting ? '提交中...' : '✅ 提交申请' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'my-applications'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            :class="['btn', appStatus === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="appStatus = f.value; loadApplications(1)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>
      <div v-if="loadingApps" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="applications.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">暂无授权申请</div>
      </div>
      <div v-else class="license-list">
        <div v-for="l in applications" :key="l.id" class="license-card card" @click="viewDetail(l, 'applicant')">
          <div class="lc-header">
            <div class="lc-title-row">
              <span :class="['status-badge', `status-${l.status.toLowerCase()}`]">{{ statusLabel(l.status) }}</span>
              <span class="tag">{{ getLicenseTypeLabel(l.licenseType) }}</span>
            </div>
            <span class="text-sm text-muted">{{ l.licenseNo }}</span>
          </div>
          <div class="lc-body">
            <div class="lc-work-title font-medium">{{ l.workTitle }}</div>
            <div class="lc-meta text-sm text-muted">
              {{ getWorkTypeLabel(l.workType) }} · {{ formatDateTime(l.createdAt) }}
            </div>
            <div class="lc-purpose text-sm mt-sm">{{ l.purposeDetail.substring(0, 80) }}{{ l.purposeDetail.length > 80 ? '...' : '' }}</div>
          </div>
          <div class="lc-footer">
            <div v-if="l.author" class="lc-author text-sm">作者：{{ l.author.username }}</div>
            <div class="lc-fee text-sm font-medium">¥{{ l.licenseFee || 0 }}</div>
          </div>
        </div>
      </div>
      <div v-if="appTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="appPage === 1" @click="loadApplications(appPage - 1)">←</button>
        <span class="page-info">第 {{ appPage }} / {{ appTotalPages }} 页</span>
        <button class="page-btn" :disabled="appPage === appTotalPages" @click="loadApplications(appPage + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'to-confirm'" class="section">
      <div class="flex justify-between items-center mb">
        <div class="filter-tabs flex gap-sm">
          <button
            v-for="f in authStatusFilters"
            :key="f.value"
            :class="['btn', authStatus === f.value ? 'btn-primary' : 'btn-secondary', 'btn-sm']"
            @click="authStatus = f.value; loadAuthored(1)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>
      <div v-if="loadingAuth" class="empty-state"><div class="empty-state-icon">⏳</div></div>
      <div v-else-if="authored.length === 0" class="empty-state card" style="padding: 48px;">
        <div class="empty-state-icon">📩</div>
        <div class="empty-state-text">暂无待确认的授权申请</div>
      </div>
      <div v-else class="license-list">
        <div v-for="l in authored" :key="l.id" class="license-card card" @click="viewDetail(l, 'author')">
          <div class="lc-header">
            <div class="lc-title-row">
              <span :class="['status-badge', `status-${l.status.toLowerCase()}`]">{{ statusLabel(l.status) }}</span>
              <span v-if="l.status === 'AUTHOR_PENDING'" class="tag tag-danger">待确认</span>
            </div>
            <span class="text-sm text-muted">{{ formatDateTime(l.createdAt) }}</span>
          </div>
          <div class="lc-body">
            <div class="lc-work-title font-medium">{{ l.workTitle }}</div>
            <div class="lc-meta text-sm text-muted">申请人：{{ l.applicant?.username }} · {{ getWorkTypeLabel(l.workType) }}</div>
            <div class="lc-purpose text-sm mt-sm">{{ l.purposeDetail.substring(0, 80) }}{{ l.purposeDetail.length > 80 ? '...' : '' }}</div>
          </div>
          <div class="lc-footer">
            <div class="lc-author text-sm">{{ getScopeLabel(l.usageScope) }}</div>
            <div class="lc-fee text-sm font-medium">¥{{ l.licenseFee || 0 }}</div>
          </div>
        </div>
      </div>
      <div v-if="authTotalPages > 1" class="pagination">
        <button class="page-btn" :disabled="authPage === 1" @click="loadAuthored(authPage - 1)">←</button>
        <span class="page-info">第 {{ authPage }} / {{ authTotalPages }} 页</span>
        <button class="page-btn" :disabled="authPage === authTotalPages" @click="loadAuthored(authPage + 1)">→</button>
      </div>
    </div>

    <div v-if="currentTab === 'detail' && selectedLicense" class="section">
      <div class="card" style="padding: 28px;">
        <div class="detail-back">
          <button class="btn btn-ghost btn-sm" @click="goBackFromDetail">← 返回列表</button>
        </div>

        <div class="detail-header">
          <div class="detail-title-row">
            <h3 class="font-semibold" style="font-size: 20px;">{{ selectedLicense.title }}</h3>
            <span :class="['status-badge', `status-${selectedLicense.status.toLowerCase()}`]">{{ statusLabel(selectedLicense.status) }}</span>
            <span class="tag">{{ selectedLicense.licenseNo }}</span>
          </div>
          <div class="detail-meta text-sm text-muted">
            创建：{{ formatDateTime(selectedLicense.createdAt) }}
            <span v-if="selectedLicense.reviewedAt"> · 审批：{{ formatDateTime(selectedLicense.reviewedAt) }}</span>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">作品</span>
            <span class="detail-value">{{ getWorkTypeLabel(selectedLicense.workType) }} #{{ selectedLicense.workId }} · {{ selectedLicense.workTitle }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">申请人</span>
            <span class="detail-value">{{ selectedLicense.applicant?.username }} <span class="text-muted" v-if="selectedLicense.applicantCompany">({{ selectedLicense.applicantCompany }})</span></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">作者</span>
            <span class="detail-value">{{ selectedLicense.author?.username }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">授权类型</span>
            <span class="detail-value">{{ getLicenseTypeLabel(selectedLicense.licenseType) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">费用</span>
            <span class="detail-value font-semibold" style="color: var(--accent);">¥{{ selectedLicense.licenseFee || 0 }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">使用范围</span>
            <span class="detail-value">{{ getScopeLabel(selectedLicense.usageScope) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">用途</span>
            <span class="detail-value">{{ getPurposeLabel(selectedLicense.purposeCategory) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">期限</span>
            <span class="detail-value">{{ selectedLicense.durationDays ? selectedLicense.durationDays + '天' : '长期有效' }}</span>
          </div>
        </div>

        <div class="permission-grid" style="margin-top: 20px;">
          <div :class="['permission-item', 'readonly', { active: selectedLicense.commercialUse }]">
            <div class="perm-icon">{{ selectedLicense.commercialUse ? '✅' : '❌' }}</div>
            <div>
              <div class="perm-title">商业使用</div>
            </div>
          </div>
          <div :class="['permission-item', 'readonly', { active: selectedLicense.derivativeAllowed }]">
            <div class="perm-icon">{{ selectedLicense.derivativeAllowed ? '✅' : '❌' }}</div>
            <div>
              <div class="perm-title">衍生创作</div>
            </div>
          </div>
          <div :class="['permission-item', 'readonly', { active: selectedLicense.distributeAllowed }]">
            <div class="perm-icon">{{ selectedLicense.distributeAllowed ? '✅' : '❌' }}</div>
            <div>
              <div class="perm-title">分发传播</div>
            </div>
          </div>
          <div :class="['permission-item', 'readonly', { active: selectedLicense.attributionRequired }]">
            <div class="perm-icon">{{ selectedLicense.attributionRequired ? '✅' : '❌' }}</div>
            <div>
              <div class="perm-title">署名要求</div>
            </div>
          </div>
        </div>

        <div class="detail-section mt">
          <h4 class="detail-section-title">用途详细说明</h4>
          <p>{{ selectedLicense.purposeDetail }}</p>
        </div>

        <div v-if="selectedLicense.rejectionReason" class="detail-section" style="background: #fff1f0; padding: 16px; border-radius: 8px;">
          <h4 class="detail-section-title" style="color: #cf1322;">拒绝原因</h4>
          <p>{{ selectedLicense.rejectionReason }}</p>
        </div>

        <div v-if="selectedLicense.authorConfirmRemark" class="detail-section">
          <h4 class="detail-section-title">作者确认备注</h4>
          <p>{{ selectedLicense.authorConfirmRemark }}</p>
          <div v-if="selectedLicense.authorAskedPrice" class="mt-sm text-sm">作者期望费用：¥{{ selectedLicense.authorAskedPrice }}</div>
        </div>

        <div v-if="selectedLicense.reviewRemark" class="detail-section">
          <h4 class="detail-section-title">审批备注</h4>
          <p>{{ selectedLicense.reviewRemark }}</p>
        </div>

        <div v-if="selectedLicense.contractContent" class="detail-section">
          <h4 class="detail-section-title">📄 合同内容</h4>
          <div style="white-space: pre-wrap; line-height: 1.8;">{{ selectedLicense.contractContent }}</div>
        </div>

        <div v-if="selectedLicense.logs && selectedLicense.logs.length > 0" class="detail-section">
          <h4 class="detail-section-title">📊 操作留痕</h4>
          <div class="log-timeline">
            <div v-for="log in selectedLicense.logs" :key="log.id" class="log-item">
              <div class="log-dot"></div>
              <div class="log-content">
                <div class="log-action">{{ actionLabel(log.action) }}</div>
                <div v-if="log.fromStatus || log.toStatus" class="log-status text-xs text-muted">
                  {{ log.fromStatus ? statusLabel(log.fromStatus) : '' }} {{ log.fromStatus && log.toStatus ? '→' : '' }} {{ log.toStatus ? statusLabel(log.toStatus) : '' }}
                </div>
                <div v-if="log.detail" class="log-detail text-sm text-muted">{{ log.detail }}</div>
                <div class="log-meta text-xs text-muted">
                  {{ log.operator?.username || '系统' }} · {{ formatDateTime(log.createdAt) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-actions mt">
          <button
            v-if="currentRole === 'applicant' && selectedLicense.status === 'DRAFT'"
            class="btn btn-primary"
            @click="submitApplication"
          >
            📤 提交申请
          </button>
          <button
            v-if="currentRole === 'applicant' && ['DRAFT', 'AUTHOR_PENDING', 'PENDING'].includes(selectedLicense.status)"
            class="btn btn-ghost danger-btn"
            @click="cancelApplication"
          >
            撤回申请
          </button>
          <button
            v-if="currentRole === 'author' && selectedLicense.status === 'AUTHOR_PENDING'"
            class="btn btn-primary"
            @click="openAuthorConfirmModal"
          >
            ✅ 确认授权
          </button>
          <button
            v-if="currentRole === 'author' && selectedLicense.status === 'AUTHOR_PENDING'"
            class="btn btn-ghost danger-btn"
            @click="openAuthorRejectModal"
          >
            ❌ 拒绝申请
          </button>
          <button
            v-if="(currentRole === 'applicant' || currentRole === 'author') && selectedLicense.status === 'APPROVED' && !selectedLicense.contractSigned"
            class="btn btn-primary"
            @click="signContract"
          >
            ✍️ 签署合同
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAuthorConfirmModal" class="modal-overlay" @click.self="showAuthorConfirmModal = false">
      <div class="modal card" style="max-width: 560px;">
        <div class="modal-header">
          <h3 class="font-semibold">确认授权</h3>
          <button class="btn btn-ghost btn-sm" @click="showAuthorConfirmModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">确认备注</label>
            <textarea v-model="authorConfirmForm.remark" class="form-textarea" rows="3" placeholder="（可选）对申请人的说明..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">期望授权费用（元）</label>
            <input v-model.number="authorConfirmForm.askedPrice" type="number" min="0" step="0.01" class="form-input" placeholder="（可选）如有费用变更，请在此说明">
          </div>
          <div class="form-group">
            <label class="form-label">补充合同条款</label>
            <textarea v-model="authorConfirmForm.contractTerms" class="form-textarea" rows="3" placeholder="（可选）您希望增加的合同条款..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAuthorConfirmModal = false">取消</button>
          <button class="btn btn-primary" @click="authorConfirm" :disabled="authorSubmitting">{{ authorSubmitting ? '提交中...' : '✅ 确认并提交平台审批' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showAuthorRejectModal" class="modal-overlay" @click.self="showAuthorRejectModal = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">拒绝授权申请</h3>
          <button class="btn btn-ghost btn-sm" @click="showAuthorRejectModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">拒绝原因 <span class="required">*</span></label>
            <textarea v-model="authorRejectForm.reason" class="form-textarea" rows="4" placeholder="请说明拒绝的原因..." required></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAuthorRejectModal = false">取消</button>
          <button class="btn btn-primary danger-btn" @click="authorReject" :disabled="authorSubmitting">{{ authorSubmitting ? '提交中...' : '❌ 确认拒绝' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const authStore = useAuthStore()
const showToast = inject('showToast')

const tabs = computed(() => [
  { value: 'new', label: '新建申请', icon: '📝', badge: 0 },
  { value: 'my-applications', label: '我的申请', icon: '📋', badge: 0 },
  { value: 'to-confirm', label: '待我确认', icon: '🔔', badge: toConfirmCount.value }
])

const workTypes = [
  { value: 'ZINE', label: '刊物', icon: '📖' },
  { value: 'SUBMISSION', label: '投稿', icon: '📝' },
  { value: 'COLLECTION', label: '合集', icon: '📚' },
  { value: 'COLLABORATION', label: '合作', icon: '🤝' },
  { value: 'COMPETITION', label: '竞赛', icon: '🏆' },
  { value: 'OTHER', label: '其他', icon: '❓' }
]

const purposeCategories = [
  { value: 'ACADEMIC', label: '学术研究', icon: '🎓' },
  { value: 'COMMERCIAL', label: '商业活动', icon: '💰' },
  { value: 'PROMOTION', label: '宣传推广', icon: '📢' },
  { value: 'EXHIBITION', label: '展览展示', icon: '🖼️' },
  { value: 'PUBLICATION', label: '出版发行', icon: '📰' },
  { value: 'OTHER', label: '其他用途', icon: '❓' }
]

const usageScopes = [
  { value: 'PERSONAL', label: '个人使用' },
  { value: 'ORGANIZATION', label: '组织内部' },
  { value: 'ENTERPRISE', label: '企业商用' },
  { value: 'PUBLIC', label: '公开传播' }
]

const licenseTypes = [
  { value: 'STANDARD', label: '标准授权', icon: '📄' },
  { value: 'EXTENDED', label: '扩展授权', icon: '📑' },
  { value: 'EXCLUSIVE', label: '独家授权', icon: '👑' },
  { value: 'CUSTOM', label: '自定义', icon: '⚙️' }
]

const statusFilters = [
  { label: '全部', value: 'all' },
  { label: '草稿', value: 'DRAFT' },
  { label: '待作者确认', value: 'AUTHOR_PENDING' },
  { label: '待审批', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '生效中', value: 'ACTIVE' },
  { label: '已拒绝', value: 'REJECTED' },
  { label: '作者拒绝', value: 'AUTHOR_REJECTED' },
  { label: '已撤回', value: 'CANCELLED' },
  { label: '已过期', value: 'EXPIRED' }
]

const authStatusFilters = [
  { label: '全部', value: 'all' },
  { label: '待确认', value: 'AUTHOR_PENDING' },
  { label: '已确认', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '生效中', value: 'ACTIVE' },
  { label: '已拒绝', value: 'AUTHOR_REJECTED' }
]

const toConfirmCount = ref(0)
const currentTab = ref('new')
const formStep = ref(1)
const submitting = ref(false)
const previousTab = ref('my-applications')

const form = ref({
  workType: 'ZINE',
  workId: null,
  workTitle: '',
  authorId: null,
  purposeCategory: 'OTHER',
  purposeDetail: '',
  usageScope: 'PERSONAL',
  licenseType: 'STANDARD',
  licenseFee: 0,
  startDate: '',
  endDate: '',
  durationDays: 0,
  commercialUse: false,
  derivativeAllowed: false,
  distributeAllowed: false,
  attributionRequired: true,
  title: '',
  applicantContact: '',
  applicantCompany: '',
  contractContent: ''
})
const regionsText = ref('')
const attachmentsText = ref('')

const applications = ref([])
const loadingApps = ref(false)
const appStatus = ref('all')
const appPage = ref(1)
const appTotalPages = ref(1)

const authored = ref([])
const loadingAuth = ref(false)
const authStatus = ref('all')
const authPage = ref(1)
const authTotalPages = ref(1)

const selectedLicense = ref(null)
const currentRole = ref('applicant')

const showAuthorConfirmModal = ref(false)
const showAuthorRejectModal = ref(false)
const authorConfirmForm = ref({ remark: '', askedPrice: null, contractTerms: '' })
const authorRejectForm = ref({ reason: '' })
const authorSubmitting = ref(false)

const statusLabel = (s) => {
  const map = {
    DRAFT: '草稿',
    AUTHOR_PENDING: '待作者确认',
    PENDING: '待审批',
    APPROVED: '已通过',
    ACTIVE: '生效中',
    REJECTED: '已拒绝',
    AUTHOR_REJECTED: '作者拒绝',
    CANCELLED: '已撤回',
    EXPIRED: '已过期'
  }
  return map[s] || s
}

const getWorkTypeLabel = (t) => workTypes.find(w => w.value === t)?.label || t
const getPurposeLabel = (p) => purposeCategories.find(c => c.value === p)?.label || p
const getScopeLabel = (s) => usageScopes.find(sc => sc.value === s)?.label || s
const getLicenseTypeLabel = (l) => licenseTypes.find(lt => lt.value === l)?.label || l

const actionLabel = (a) => {
  const map = {
    CREATE: '创建申请',
    UPDATE: '更新信息',
    SUBMIT: '提交申请',
    AUTHOR_CONFIRM: '作者确认',
    AUTHOR_REJECT: '作者拒绝',
    APPROVE: '平台通过',
    REJECT: '平台拒绝',
    CANCEL: '撤回申请',
    SIGN_CONTRACT: '签署合同',
    EXPIRE: '标记过期',
    ADMIN_NOTE: '管理员备注'
  }
  return map[a] || a
}

const formatDateTime = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const switchTab = (t) => {
  if (currentTab.value === 'detail') {
    previousTab.value = t
  }
  currentTab.value = t
  if (t === 'my-applications') loadApplications(1)
  if (t === 'to-confirm') loadAuthored(1)
}

const goBackFromDetail = () => {
  currentTab.value = previousTab.value
  selectedLicense.value = null
}

const submitForm = async (andSubmit) => {
  if (!form.value.workId || !form.value.authorId || !form.value.purposeDetail) {
    showToast('请填写必填信息', 'warning')
    return
  }
  submitting.value = true
  try {
    const useRegions = regionsText.value ? regionsText.value.split(/[,，]/).map(r => r.trim()).filter(Boolean) : []
    const attachments = attachmentsText.value ? attachmentsText.value.split('\n').map(a => a.trim()).filter(Boolean) : []
    const res = await api.post('/copyright-licenses', {
      ...form.value,
      useRegions,
      attachments
    })
    if (andSubmit) {
      await api.put(`/copyright-licenses/${res.license.id}/submit`)
      showToast('申请已提交，等待作者确认', 'success')
      currentTab.value = 'my-applications'
      loadApplications(1)
    } else {
      showToast('已保存为草稿', 'success')
      currentTab.value = 'my-applications'
      loadApplications(1)
    }
    resetForm()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  formStep.value = 1
  form.value = {
    workType: 'ZINE', workId: null, workTitle: '', authorId: null,
    purposeCategory: 'OTHER', purposeDetail: '', usageScope: 'PERSONAL',
    licenseType: 'STANDARD', licenseFee: 0, startDate: '', endDate: '', durationDays: 0,
    commercialUse: false, derivativeAllowed: false, distributeAllowed: false, attributionRequired: true,
    title: '', applicantContact: '', applicantCompany: '', contractContent: ''
  }
  regionsText.value = ''
  attachmentsText.value = ''
}

const loadApplications = async (page = 1) => {
  loadingApps.value = true
  appPage.value = page
  try {
    const params = new URLSearchParams({ page, limit: 10 })
    if (appStatus.value !== 'all') params.set('status', appStatus.value)
    const res = await api.get(`/copyright-licenses/my-applications?${params}`)
    applications.value = res.licenses
    appTotalPages.value = res.totalPages
  } catch (e) {
    console.error(e)
  } finally {
    loadingApps.value = false
  }
}

const loadAuthored = async (page = 1) => {
  loadingAuth.value = true
  authPage.value = page
  try {
    const params = new URLSearchParams({ page, limit: 10 })
    if (authStatus.value !== 'all') params.set('status', authStatus.value)
    const res = await api.get(`/copyright-licenses/my-authored?${params}`)
    authored.value = res.licenses
    authTotalPages.value = res.totalPages
    updateToConfirmCount()
  } catch (e) {
    console.error(e)
  } finally {
    loadingAuth.value = false
  }
}

const updateToConfirmCount = async () => {
  try {
    const res = await api.get('/copyright-licenses/my-authored?status=AUTHOR_PENDING&limit=1')
    toConfirmCount.value = res.total
  } catch (e) {
    toConfirmCount.value = 0
  }
}

const viewDetail = async (l, role) => {
  previousTab.value = currentTab.value
  currentRole.value = role
  try {
    const res = await api.get(`/copyright-licenses/${l.id}`)
    selectedLicense.value = res.license
    currentTab.value = 'detail'
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  }
}

const submitApplication = async () => {
  if (!selectedLicense.value) return
  try {
    await api.put(`/copyright-licenses/${selectedLicense.value.id}/submit`)
    showToast('已提交，等待作者确认', 'success')
    viewDetail(selectedLicense.value, currentRole.value)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const cancelApplication = async () => {
  if (!selectedLicense.value) return
  if (!confirm('确定要撤回此授权申请吗？')) return
  try {
    await api.put(`/copyright-licenses/${selectedLicense.value.id}/cancel`)
    showToast('已撤回', 'success')
    viewDetail(selectedLicense.value, currentRole.value)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const openAuthorConfirmModal = () => {
  authorConfirmForm.value = { remark: '', askedPrice: null, contractTerms: '' }
  showAuthorConfirmModal.value = true
}

const openAuthorRejectModal = () => {
  authorRejectForm.value = { reason: '' }
  showAuthorRejectModal.value = true
}

const authorConfirm = async () => {
  if (!selectedLicense.value) return
  authorSubmitting.value = true
  try {
    await api.put(`/copyright-licenses/${selectedLicense.value.id}/author-confirm`, authorConfirmForm.value)
    showToast('已确认，等待平台审批', 'success')
    showAuthorConfirmModal.value = false
    viewDetail(selectedLicense.value, currentRole.value)
    updateToConfirmCount()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    authorSubmitting.value = false
  }
}

const authorReject = async () => {
  if (!selectedLicense.value) return
  if (!authorRejectForm.value.reason) {
    showToast('请填写拒绝原因', 'warning')
    return
  }
  authorSubmitting.value = true
  try {
    await api.put(`/copyright-licenses/${selectedLicense.value.id}/author-reject`, authorRejectForm.value)
    showToast('已拒绝申请', 'success')
    showAuthorRejectModal.value = false
    viewDetail(selectedLicense.value, currentRole.value)
    updateToConfirmCount()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    authorSubmitting.value = false
  }
}

const signContract = async () => {
  if (!selectedLicense.value) return
  if (!confirm('确认签署此授权合同吗？')) return
  try {
    await api.put(`/copyright-licenses/${selectedLicense.value.id}/sign-contract`)
    showToast('合同已签署，授权正式生效', 'success')
    viewDetail(selectedLicense.value, currentRole.value)
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

onMounted(async () => {
  await loadApplications()
  await loadAuthored()

  if (route.query.licenseId) {
    try {
      const res = await api.get(`/copyright-licenses/${route.query.licenseId}`)
      selectedLicense.value = res.license
      currentRole.value = res.role || 'applicant'
      currentTab.value = 'detail'
    } catch (e) {
      showToast(e.error || '授权申请不存在', 'error')
    }
  }
})
</script>

<style scoped>
.cl-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 6px;
  flex-wrap: wrap;
}
.cl-tab {
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
.cl-tab:hover { color: var(--text-primary); background: var(--bg-tertiary); }
.cl-tab.active { background: var(--accent); color: #fff; }
.tab-icon { font-size: 16px; }
.tab-badge {
  background: #fff;
  color: var(--accent);
  padding: 1px 8px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
}

.mb { margin-bottom: 16px; }
.mt { margin-top: 16px; }
.mt-sm { margin-top: 8px; }
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.gap-sm { gap: 8px; }
.text-sm { font-size: 13px; }
.text-xs { font-size: 12px; }
.text-muted { color: var(--text-tertiary); }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.danger-btn { color: var(--danger); }

.required { color: var(--danger); }

.form-step { padding-top: 12px; }
.step-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}
.step-num {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  color: #fff;
  border-radius: 50%;
  font-size: 14px;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin: 16px 0;
}
.permission-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}
.permission-item:hover { border-color: var(--accent); }
.permission-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  margin-top: 2px;
}
.permission-item.readonly { cursor: default; opacity: 0.7; }
.permission-item.readonly:hover { border-color: transparent; }
.permission-item.active { opacity: 1; background: #f6ffed; }
.perm-icon { font-size: 20px; }
.perm-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.perm-desc { font-size: 12px; color: var(--text-tertiary); }

.form-summary { margin: 20px 0; }
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.summary-item { font-size: 13px; }
.summary-item span:first-child { color: var(--text-tertiary); margin-right: 4px; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.license-list { display: flex; flex-direction: column; gap: 12px; }
.license-card {
  padding: 18px 22px;
  cursor: pointer;
  transition: all 0.2s;
}
.license-card:hover { box-shadow: var(--shadow-md); }

.lc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.lc-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.lc-body { margin-bottom: 10px; }
.lc-work-title { font-size: 15px; margin-bottom: 4px; }
.lc-purpose { line-height: 1.5; }
.lc-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.status-badge {
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}
.status-draft { background: #f5f5f5; color: #8c8c8c; }
.status-author_pending { background: #fff7e6; color: #d48806; }
.status-pending { background: #e6f7ff; color: #1890ff; }
.status-approved { background: #e6fffb; color: #13c2c2; }
.status-active { background: #f6ffed; color: #52c41a; }
.status-rejected { background: #fff1f0; color: #cf1322; }
.status-author_rejected { background: #fff1f0; color: #a8071a; }
.status-cancelled { background: #f5f5f5; color: #8c8c8c; }
.status-expired { background: #fafafa; color: #8c8c8c; }

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 100px;
}
.tag-danger { background: #fff1f0; color: #cf1322; }

.detail-back { margin-bottom: 16px; }
.detail-header {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 20px;
}
.detail-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.detail-item {
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
.detail-label { font-size: 12px; color: var(--text-tertiary); display: block; margin-bottom: 4px; }
.detail-value { font-size: 14px; font-weight: 500; }
.detail-section { margin-bottom: 16px; }
.detail-section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-light);
}
.detail-section p { font-size: 14px; line-height: 1.7; }

.log-timeline { position: relative; padding-left: 20px; }
.log-item {
  position: relative;
  padding-bottom: 16px;
  padding-left: 16px;
  border-left: 2px solid var(--border-light);
}
.log-item:last-child { border-left-color: transparent; padding-bottom: 0; }
.log-dot {
  position: absolute;
  left: -7px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--bg-secondary);
}
.log-action { font-size: 14px; font-weight: 500; }
.log-status { margin-top: 2px; }
.log-detail { margin-top: 4px; }
.log-meta { margin-top: 4px; }

.detail-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  flex-wrap: wrap;
}

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
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-secondary); }

.filter-tabs { display: flex; flex-wrap: wrap; }

.section { margin-bottom: 24px; }
</style>
