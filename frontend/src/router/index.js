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
