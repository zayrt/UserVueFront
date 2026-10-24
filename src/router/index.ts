import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import { safeRedirect } from './redirect'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    title?: string
  }
}

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      { path: '/', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true, title: 'Tableau de bord' } },
      { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true, title: 'Connexion' } },
      { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true, title: 'Inscription' } },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
  })

  router.beforeEach(async (to) => {
    const account = await useAuth().ensureSession()

    if (to.meta.requiresAuth && !account) {
      return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
    }

    if (to.meta.guestOnly && account) {
      return safeRedirect(to.query.redirect)
    }
  })

  router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} · vueapp` : 'vueapp'
  })

  return router
}
