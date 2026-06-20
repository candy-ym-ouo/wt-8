<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">会员权益中心</h1>
      <p class="page-subtitle">解锁专属权益，享受创作特权</p>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="text-lg text-muted">加载中...</div>
    </div>

    <div v-else>
      <div class="membership-status card" v-if="membership.currentMembership">
        <div class="membership-badge" :style="{ background: membership.currentMembership.plan.color }">
          {{ membership.currentMembership.plan.icon || '👑' }}
        </div>
        <div class="membership-info">
          <div class="membership-plan-name">{{ membership.currentMembership.plan.name }}</div>
          <div class="membership-level">Lv.{{ membership.currentMembership.plan.level }} 会员</div>
          <div class="membership-dates">
            <span>有效期至：{{ formatDate(membership.currentMembership.endDate) }}</span>
            <span class="days-remaining">{{ daysRemaining }} 天后到期</span>
          </div>
        </div>
        <div class="membership-actions">
          <button class="btn btn-primary" @click="showRenewModal = true">续费会员</button>
          <button class="btn btn-outline btn-danger" @click="cancelMembership">取消会员</button>
        </div>
      </div>

      <div class="membership-status card no-membership" v-else>
        <div class="membership-badge basic">🎫</div>
        <div class="membership-info">
          <div class="membership-plan-name">普通用户</div>
          <div class="membership-level">当前等级：Lv.{{ membership.userLevel || 1 }}</div>
          <div class="membership-dates">
            <span>开通会员即可享受专属权益</span>
          </div>
        </div>
        <div class="membership-actions">
          <button class="btn btn-primary" @click="scrollToPlans">立即开通</button>
        </div>
      </div>

      <div class="benefit-section card mt-lg">
        <h3 class="section-title">专属权益</h3>
        <div class="benefit-grid">
          <div class="benefit-card">
            <div class="benefit-icon">📖</div>
            <div class="benefit-name">专属刊物</div>
            <div class="benefit-desc">会员专属原创内容，深度阅读体验</div>
            <button class="btn btn-ghost btn-sm mt-sm" @click="$router.push('/exclusive-zines')">查看</button>
          </div>
          <div class="benefit-card">
            <div class="benefit-icon">⏰</div>
            <div class="benefit-name">提前阅读</div>
            <div class="benefit-desc">新刊发布抢先看，快人一步</div>
            <button class="btn btn-ghost btn-sm mt-sm" @click="$router.push('/early-access')">查看</button>
          </div>
          <div class="benefit-card">
            <div class="benefit-icon">⚡</div>
            <div class="benefit-name">优先审核</div>
            <div class="benefit-desc">投稿优先处理，审核速度提升</div>
          </div>
          <div class="benefit-card">
            <div class="benefit-icon">🎨</div>
            <div class="benefit-name">专属标识</div>
            <div class="benefit-desc">独特会员徽章，彰显身份</div>
          </div>
          <div class="benefit-card">
            <div class="benefit-icon">💬</div>
            <div class="benefit-name">消息提醒</div>
            <div class="benefit-desc">重要内容第一时间通知</div>
            <button class="btn btn-ghost btn-sm mt-sm" @click="$router.push('/messages')">查看</button>
          </div>
          <div class="benefit-card">
            <div class="benefit-icon">🎁</div>
            <div class="benefit-name">更多惊喜</div>
            <div class="benefit-desc">会员专属活动持续更新中</div>
          </div>
        </div>
      </div>

      <div id="plans-section" class="plans-section mt-lg">
        <h3 class="section-title text-center">选择会员方案</h3>
        <p class="section-subtitle text-center">灵活选择，享受更多权益</p>
        <div class="plans-grid">
          <div
            v-for="plan in plans"
            :key="plan.id"
            :class="['plan-card', { recommended: plan.isRecommended }]"
            :style="{ borderColor: plan.color }"
          >
            <div v-if="plan.isRecommended" class="plan-recommended" :style="{ background: plan.color }">推荐</div>
            <div class="plan-header">
              <div class="plan-icon" :style="{ background: plan.color + '22', color: plan.color }">
                {{ plan.icon || '⭐' }}
              </div>
              <div class="plan-name">{{ plan.name }}</div>
              <div class="plan-level">Lv.{{ plan.level }} 及以上可购买</div>
            </div>
            <div class="plan-price">
              <span class="price-symbol">¥</span>
              <span class="price-value">{{ plan.price }}</span>
              <span class="price-unit">/{{ plan.durationDays }}天</span>
            </div>
            <div v-if="plan.originalPrice > plan.price" class="plan-original-price">
              原价 ¥{{ plan.originalPrice }}
            </div>
            <div class="plan-benefits">
              <div v-for="(b, i) in parseBenefits(plan.benefits)" :key="i" class="plan-benefit-item">
                <span class="check-icon">✓</span>
                <span>{{ b }}</span>
              </div>
            </div>
            <button
              class="btn btn-primary plan-subscribe-btn"
              :style="{ background: plan.color, borderColor: plan.color }"
              :disabled="(membership.userLevel || 1) < plan.level"
              @click="subscribe(plan)"
            >
              {{ (membership.userLevel || 1) < plan.level ? `需要 Lv.${plan.level}` : (membership.currentMembership ? '续费' : '立即开通') }}
            </button>
          </div>
        </div>
      </div>

      <div class="history-section card mt-lg" v-if="membership.history && membership.history.length > 0">
        <h3 class="section-title">会员记录</h3>
        <div class="history-list">
          <div v-for="h in membership.history" :key="h.id" class="history-item">
            <div class="history-icon" :style="{ background: h.plan.color + '22', color: h.plan.color }">
              {{ h.plan.icon || '📋' }}
            </div>
            <div class="history-info">
              <div class="history-plan">{{ h.plan.name }}</div>
              <div class="history-dates text-sm text-muted">
                {{ formatDate(h.startDate) }} - {{ formatDate(h.endDate) }}
              </div>
            </div>
            <div :class="['history-status', `status-${h.status.toLowerCase()}`]">
              {{ statusLabel(h.status) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showRenewModal" class="modal-overlay" @click.self="showRenewModal = false">
      <div class="modal card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="font-semibold">续费会员</h3>
          <button class="btn btn-ghost btn-sm" @click="showRenewModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="mb">选择续费方案：</p>
          <div class="renew-plans">
            <div
              v-for="plan in plans"
              :key="plan.id"
              :class="['renew-plan-item', { active: selectedPlanId === plan.id }]"
              @click="selectedPlanId = plan.id"
            >
              <div class="renew-plan-name">{{ plan.name }}</div>
              <div class="renew-plan-price">¥{{ plan.price }} / {{ plan.durationDays }}天</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showRenewModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmRenew" :disabled="submitting || !selectedPlanId">
            {{ submitting ? '处理中...' : '确认续费' }}
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

const loading = ref(true)
const submitting = ref(false)
const membership = ref({})
const plans = ref([])
const showRenewModal = ref(false)
const selectedPlanId = ref(null)

const daysRemaining = computed(() => {
  if (!membership.value.currentMembership) return 0
  const end = new Date(membership.value.currentMembership.endDate)
  const now = new Date()
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
})

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

const parseBenefits = (benefitsStr) => {
  try {
    return JSON.parse(benefitsStr || '[]')
  } catch (e) {
    return []
  }
}

const statusLabel = (status) => {
  const labels = {
    ACTIVE: '有效',
    EXPIRED: '已过期',
    CANCELLED: '已取消',
    REVOKED: '已撤销'
  }
  return labels[status] || status
}

const loadData = async () => {
  loading.value = true
  try {
    const [resPlans, resMembership] = await Promise.all([
      api.get('/memberships/plans'),
      api.get('/memberships/my-membership')
    ])
    plans.value = resPlans.plans
    membership.value = resMembership
  } catch (e) {
    showToast(e.error || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const subscribe = async (plan) => {
  if ((membership.value.userLevel || 1) < plan.level) {
    showToast(`需要等级 Lv.${plan.level} 才能购买此方案`, 'error')
    return
  }
  submitting.value = true
  try {
    const res = await api.post(`/memberships/plans/${plan.id}/subscribe`)
    showToast(res.message || '开通成功')
    await loadData()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const confirmRenew = async () => {
  if (!selectedPlanId.value) return
  submitting.value = true
  try {
    const res = await api.post(`/memberships/plans/${selectedPlanId.value}/subscribe`)
    showToast(res.message || '续费成功')
    showRenewModal.value = false
    selectedPlanId.value = null
    await loadData()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

const cancelMembership = async () => {
  if (!confirm('确定要取消会员吗？')) return
  try {
    await api.post('/memberships/my-membership/cancel', { reason: '用户主动取消' })
    showToast('会员已取消')
    await loadData()
  } catch (e) {
    showToast(e.error || '操作失败', 'error')
  }
}

const scrollToPlans = () => {
  document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => loadData())
</script>

<style scoped>
.membership-status {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 28px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: none;
}
.membership-status.no-membership {
  background: var(--bg-secondary);
}
.membership-badge {
  width: 80px;
  height: 80px;
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  flex-shrink: 0;
}
.membership-badge.basic {
  background: var(--bg-tertiary);
}
.membership-info { flex: 1; }
.membership-plan-name {
  font-size: 24px;
  font-weight: 700;
  font-family: var(--font-serif);
  margin-bottom: 4px;
}
.membership-level {
  font-size: 14px;
  color: var(--accent);
  font-weight: 500;
  margin-bottom: 8px;
}
.membership-dates {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  gap: 16px;
}
.days-remaining {
  color: var(--accent);
  font-weight: 600;
}
.membership-actions {
  display: flex;
  gap: 12px;
}

.benefit-section {
  padding: 28px;
}
.section-title {
  font-size: 20px;
  font-weight: 700;
  font-family: var(--font-serif);
  margin-bottom: 8px;
}
.section-subtitle {
  color: var(--text-secondary);
  margin-bottom: 24px;
}
.benefit-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
@media (max-width: 768px) {
  .benefit-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .benefit-grid { grid-template-columns: 1fr; }
}
.benefit-card {
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  text-align: center;
}
.benefit-icon {
  font-size: 36px;
  margin-bottom: 12px;
}
.benefit-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
}
.benefit-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.plans-section {
  padding: 0;
}
.plans-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
@media (max-width: 960px) {
  .plans-grid { grid-template-columns: 1fr; }
}
.plan-card {
  position: relative;
  padding: 28px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  transition: all 0.3s;
}
.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.1);
}
.plan-card.recommended {
  border-width: 3px;
}
.plan-recommended {
  position: absolute;
  top: 0;
  right: 20px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
}
.plan-header {
  text-align: center;
  margin-bottom: 20px;
}
.plan-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
}
.plan-name {
  font-size: 20px;
  font-weight: 700;
  font-family: var(--font-serif);
}
.plan-level {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.plan-price {
  text-align: center;
  margin-bottom: 8px;
}
.price-symbol {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
  vertical-align: top;
}
.price-value {
  font-size: 48px;
  font-weight: 800;
  color: var(--accent);
  font-family: var(--font-serif);
}
.price-unit {
  font-size: 14px;
  color: var(--text-secondary);
}
.plan-original-price {
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary);
  text-decoration: line-through;
  margin-bottom: 16px;
}
.plan-benefits {
  margin-bottom: 20px;
}
.plan-benefit-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
}
.check-icon {
  color: var(--success);
  font-weight: 700;
}
.plan-subscribe-btn {
  width: 100%;
}

.history-section {
  padding: 28px;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.history-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
}
.history-icon {
  width: 44px;
  height: 44px;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}
.history-info { flex: 1; }
.history-plan {
  font-size: 14px;
  font-weight: 600;
}
.history-status {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 100px;
}
.history-status.status-active {
  background: var(--success-light);
  color: var(--success);
}
.history-status.status-expired,
.history-status.status-cancelled,
.history-status.status-revoked {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.renew-plans {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.renew-plan-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}
.renew-plan-item:hover {
  border-color: var(--accent);
}
.renew-plan-item.active {
  border-color: var(--accent);
  background: var(--accent-light);
}
.renew-plan-name {
  font-weight: 600;
}
.renew-plan-price {
  color: var(--accent);
  font-weight: 600;
}
</style>
