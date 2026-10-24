import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { useAuth } from './composables/useAuth'
import { createAppRouter } from './router'
import { onUnauthorized } from './services/api'

const router = createAppRouter()

onUnauthorized(() => {
  useAuth().clearSession()
  const route = router.currentRoute.value
  if (route.meta.requiresAuth) {
    void router.replace({ name: 'login', query: { redirect: route.fullPath, expired: '1' } })
  }
})

createApp(App).use(router).mount('#app')
