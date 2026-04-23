import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import WorkspacePage from '../views/WorkspacePage.vue'
import PdfPage from '../views/PdfPage.vue'
import DefectFlowPage from '../views/DefectFlowPage.vue'
import LoginPage from '../views/LoginPage.vue'
import { useAuthStore } from '../stores/authStore'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/login', name: 'login', component: LoginPage, meta: { transition: 'fade' } },
    { path: '/workspace', name: 'workspace', component: WorkspacePage, meta: { requiresAuth: true } },
    { path: '/pdf', name: 'pdf', component: PdfPage, meta: { requiresAuth: true } },
    { path: '/defect/:id', name: 'defect', component: DefectFlowPage },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()
  if (!auth.ready) await auth.restoreSession()

  const needAuth = to.meta.requiresAuth === true
  if (needAuth && !auth.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    const r = typeof to.query.redirect === 'string' ? to.query.redirect : '/workspace'
    next(r.startsWith('/') ? r : '/workspace')
    return
  }
  next()
})

export default router
