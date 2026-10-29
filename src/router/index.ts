import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import AppLayout from '../layouts/AppLayout.vue'
import ComptabiliteLayout from '../layouts/ComptabiliteLayout.vue'
import BalanceView from '../views/comptabilite/BalanceView.vue'
import ComptaDashboardView from '../views/comptabilite/ComptaDashboardView.vue'
import EcrituresView from '../views/comptabilite/EcrituresView.vue'
import LettrageView from '../views/comptabilite/LettrageView.vue'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import { safeRedirect } from './redirect'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    title?: string
    // Pages pleine largeur (module Comptabilité et sa navigation latérale).
    wide?: boolean
  }
}

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      {
        // Le meta requiresAuth du parent s'applique à chaque onglet (to.meta fusionne les meta).
        path: '/',
        component: AppLayout,
        meta: { requiresAuth: true },
        children: [
          { path: '', name: 'dashboard', component: DashboardView, meta: { title: 'Tableau de bord' } },
          {
            path: 'comptabilite',
            component: ComptabiliteLayout,
            meta: { title: 'Comptabilité', wide: true },
            children: [
              { path: '', name: 'comptabilite', component: ComptaDashboardView },
              { path: 'ecritures', name: 'compta-ecritures', component: EcrituresView, meta: { title: 'Écritures' } },
              { path: 'balance', name: 'compta-balance', component: BalanceView, meta: { title: 'Balance' } },
              { path: 'lettrage', name: 'compta-lettrage', component: LettrageView, meta: { title: 'Lettrage' } },
            ],
          },
        ],
      },
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
    document.title = to.meta.title ? `${to.meta.title} · Gestion Utilisateurs` : 'Gestion Utilisateurs'
  })

  return router
}
