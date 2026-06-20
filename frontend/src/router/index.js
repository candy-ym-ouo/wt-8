import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/', name: 'Home', component: () => import('@/views/Home.vue') },
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue') },
  { path: '/register', name: 'Register', component: () => import('@/views/Register.vue') },
  { path: '/zines', name: 'Zines', component: () => import('@/views/Zines.vue') },
  { path: '/zines/:id', name: 'ZineDetail', component: () => import('@/views/ZineDetail.vue') },
  { path: '/collections', name: 'Collections', component: () => import('@/views/Collections.vue') },
  { path: '/collections/:id', name: 'CollectionDetail', component: () => import('@/views/CollectionDetail.vue') },
  { path: '/topics', name: 'Topics', component: () => import('@/views/Topics.vue') },
  { path: '/topics/:id', name: 'TopicDetail', component: () => import('@/views/TopicDetail.vue') },
  { path: '/topic-submissions', name: 'TopicSubmissions', component: () => import('@/views/TopicSubmissions.vue'), meta: { requiresAuth: true } },
  { path: '/submissions', name: 'Submissions', component: () => import('@/views/Submissions.vue'), meta: { requiresAuth: true } },
  { path: '/submissions/new', name: 'NewSubmission', component: () => import('@/views/NewSubmission.vue'), meta: { requiresAuth: true } },
  { path: '/subscriptions', name: 'Subscriptions', component: () => import('@/views/Subscriptions.vue'), meta: { requiresAuth: true } },
  { path: '/messages', name: 'Messages', component: () => import('@/views/Messages.vue'), meta: { requiresAuth: true } },
  { path: '/profile', name: 'Profile', component: () => import('@/views/Profile.vue'), meta: { requiresAuth: true } },
  { path: '/growth', name: 'Growth', component: () => import('@/views/Growth.vue'), meta: { requiresAuth: true } },
  { path: '/badges', name: 'Badges', component: () => import('@/views/Badges.vue'), meta: { requiresAuth: true } },
  { path: '/achievements', name: 'Achievements', component: () => import('@/views/Achievements.vue'), meta: { requiresAuth: true } },
  { path: '/tasks', name: 'Tasks', component: () => import('@/views/Tasks.vue'), meta: { requiresAuth: true } },
  { path: '/admin', name: 'Admin', component: () => import('@/views/Admin.vue'), meta: { requiresAdmin: true } },
  { path: '/editor-workbench', name: 'EditorWorkbench', component: () => import('@/views/EditorWorkbench.vue'), meta: { requiresAdmin: true } },
  { path: '/admin/collections', name: 'AdminCollections', component: () => import('@/views/AdminCollections.vue'), meta: { requiresAdmin: true } },
  { path: '/collaborations', name: 'Collaborations', component: () => import('@/views/Collaborations.vue') },
  { path: '/collaborations/new', name: 'NewCollaboration', component: () => import('@/views/NewCollaboration.vue'), meta: { requiresAuth: true } },
  { path: '/collaborations/:id/edit', name: 'EditCollaboration', component: () => import('@/views/NewCollaboration.vue'), meta: { requiresAuth: true } },
  { path: '/collaborations/:id', name: 'CollaborationDetail', component: () => import('@/views/CollaborationDetail.vue') },
  { path: '/collaboration-applications', name: 'CollaborationApplications', component: () => import('@/views/CollaborationApplications.vue'), meta: { requiresAuth: true } },
  { path: '/my-collaborations', name: 'MyCollaborations', component: () => import('@/views/MyCollaborations.vue'), meta: { requiresAuth: true } },
  { path: '/admin/collaborations', name: 'AdminCollaborations', component: () => import('@/views/AdminCollaborations.vue'), meta: { requiresAdmin: true } },
  { path: '/crowdfundings', name: 'Crowdfundings', component: () => import('@/views/Crowdfundings.vue') },
  { path: '/crowdfundings/new', name: 'NewCrowdfunding', component: () => import('@/views/NewCrowdfunding.vue'), meta: { requiresAuth: true } },
  { path: '/crowdfundings/:id/edit', name: 'EditCrowdfunding', component: () => import('@/views/NewCrowdfunding.vue'), meta: { requiresAuth: true } },
  { path: '/crowdfundings/:id', name: 'CrowdfundingDetail', component: () => import('@/views/CrowdfundingDetail.vue') },
  { path: '/crowdfunding-orders', name: 'CrowdfundingOrders', component: () => import('@/views/CrowdfundingOrders.vue'), meta: { requiresAuth: true } },
  { path: '/admin/crowdfundings', name: 'AdminCrowdfundings', component: () => import('@/views/AdminCrowdfundings.vue'), meta: { requiresAdmin: true } },
  { path: '/report-center', name: 'ReportCenter', component: () => import('@/views/ReportCenter.vue'), meta: { requiresAuth: true } },
  { path: '/admin/reports', name: 'AdminReports', component: () => import('@/views/AdminReports.vue'), meta: { requiresAdmin: true } },
  { path: '/calendar', name: 'CalendarView', component: () => import('@/views/CalendarView.vue') },
  { path: '/swap', name: 'SwapMarket', component: () => import('@/views/SwapMarket.vue') },
  { path: '/swap/new', name: 'NewSwap', component: () => import('@/views/NewSwap.vue'), meta: { requiresAuth: true } },
  { path: '/swap/:id/edit', name: 'EditSwap', component: () => import('@/views/NewSwap.vue'), meta: { requiresAuth: true } },
  { path: '/swap/:id', name: 'SwapDetail', component: () => import('@/views/SwapDetail.vue') },
  { path: '/my-swaps', name: 'MySwaps', component: () => import('@/views/MySwaps.vue'), meta: { requiresAuth: true } },
  { path: '/swap-matches/:id', name: 'SwapMatchDetail', component: () => import('@/views/SwapMatchDetail.vue'), meta: { requiresAuth: true } },
  { path: '/admin/swaps', name: 'AdminSwaps', component: () => import('@/views/AdminSwaps.vue'), meta: { requiresAdmin: true } },
  { path: '/admin/calendar', name: 'AdminCalendar', component: () => import('@/views/AdminCalendar.vue'), meta: { requiresAdmin: true } },
  { path: '/membership', name: 'MembershipCenter', component: () => import('@/views/MembershipCenter.vue'), meta: { requiresAuth: true } },
  { path: '/exclusive-zines', name: 'ExclusiveZines', component: () => import('@/views/ExclusiveZines.vue') },
  { path: '/early-access', name: 'EarlyAccess', component: () => import('@/views/EarlyAccess.vue') },
  { path: '/admin/memberships', name: 'AdminMemberships', component: () => import('@/views/AdminMemberships.vue'), meta: { requiresAdmin: true } },
  { path: '/interviews', name: 'Interviews', component: () => import('@/views/Interviews.vue') },
  { path: '/interviews/:id', name: 'InterviewDetail', component: () => import('@/views/InterviewDetail.vue') },
  { path: '/admin/interviews', name: 'AdminInterviews', component: () => import('@/views/AdminInterviews.vue'), meta: { requiresAdmin: true } },
  { path: '/print-orders', name: 'PrintOrders', component: () => import('@/views/PrintOrders.vue') },
  { path: '/print-orders/mine', name: 'MyPrintOrders', component: () => import('@/views/PrintOrders.vue'), meta: { requiresAuth: true } },
  { path: '/print-orders/new', name: 'NewPrintOrder', component: () => import('@/views/NewPrintOrder.vue'), meta: { requiresAuth: true } },
  { path: '/print-orders/:id/edit', name: 'EditPrintOrder', component: () => import('@/views/NewPrintOrder.vue'), meta: { requiresAuth: true } },
  { path: '/print-orders/:id', name: 'PrintOrderDetail', component: () => import('@/views/PrintOrderDetail.vue') },
  { path: '/admin/print-orders', name: 'AdminPrintOrders', component: () => import('@/views/AdminPrintOrders.vue'), meta: { requiresAdmin: true } },
  { path: '/reading', name: 'ReadingCommunity', component: () => import('@/views/ReadingCommunity.vue') },
  { path: '/reading/checkin', name: 'MyReadingCheckins', component: () => import('@/views/MyReadingCheckins.vue'), meta: { requiresAuth: true } },
  { path: '/reading/reviews', name: 'ReadingReviews', component: () => import('@/views/ReadingReviews.vue') },
  { path: '/reading/reviews/:id', name: 'ReadingReviewDetail', component: () => import('@/views/ReadingReviewDetail.vue') },
  { path: '/reading/reviews/new', name: 'NewReadingReview', component: () => import('@/views/NewReadingReview.vue'), meta: { requiresAuth: true } },
  { path: '/admin/reading', name: 'AdminReading', component: () => import('@/views/AdminReading.vue'), meta: { requiresAdmin: true } },
  { path: '/competitions', name: 'Competitions', component: () => import('@/views/Competitions.vue') },
  { path: '/competitions/new', name: 'NewCompetition', component: () => import('@/views/NewCompetition.vue'), meta: { requiresAuth: true } },
  { path: '/competitions/:id/edit', name: 'EditCompetition', component: () => import('@/views/NewCompetition.vue'), meta: { requiresAuth: true } },
  { path: '/competitions/:id', name: 'CompetitionDetail', component: () => import('@/views/CompetitionDetail.vue') },
  { path: '/admin/competitions', name: 'AdminCompetitions', component: () => import('@/views/AdminCompetitions.vue'), meta: { requiresAdmin: true } },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/NotFound.vue') }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  if (!authStore.token && localStorage.getItem('zine_token')) {
    authStore.initFromStorage()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin) {
    if (!authStore.isAuthenticated) {
      return { name: 'Login', query: { redirect: to.fullPath } }
    }
    if (authStore.user?.role !== 'ADMIN') {
      return { name: 'Home' }
    }
  }

  if ((to.name === 'Login' || to.name === 'Register') && authStore.isAuthenticated) {
    return { name: 'Home' }
  }
})

export default router
