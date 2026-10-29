<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()
const { account, logout } = useAuth()

const loggingOut = ref(false)
const logoutError = ref('')

async function handleLogout() {
  if (loggingOut.value) {
    return
  }

  loggingOut.value = true
  logoutError.value = ''

  try {
    await logout()
    await router.replace({ name: 'login' })
  } catch (error: unknown) {
    logoutError.value = error instanceof Error ? error.message : 'Déconnexion impossible.'
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <header class="app-header" :class="{ wide: route.meta.wide }">
    <nav class="app-tabs" aria-label="Modules">
      <!-- « / » est le parent de toutes les pages : seul l'actif exact compte pour ce lien. -->
      <RouterLink class="app-tab" exact-active-class="active" :to="{ name: 'dashboard' }">Gestion utilisateur</RouterLink>
      <RouterLink class="app-tab" active-class="active" :to="{ name: 'comptabilite' }">Comptabilité</RouterLink>
    </nav>
    <div class="session">
      <span v-if="account" class="account-name">{{ account.name }}</span>
      <button class="logout-button" type="button" :disabled="loggingOut" @click="handleLogout">
        {{ loggingOut ? 'Déconnexion…' : 'Se déconnecter' }}
      </button>
    </div>
  </header>
  <p v-if="logoutError" class="logout-error" :class="{ wide: route.meta.wide }" role="alert">{{ logoutError }}</p>

  <RouterView />
</template>

<style scoped>
.app-header {
  display: flex;
  width: min(100% - 48px, 920px);
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 20px auto 0;
  color: #263634;
  text-align: left;
}

.app-tabs {
  display: flex;
  min-width: 0;
  gap: 4px;
  padding: 4px;
  border: 1px solid #e1e9e4;
  border-radius: 7px;
  background: #f6faf7;
}

.app-tab {
  padding: 7px 14px;
  border-radius: 5px;
  color: #54645b;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 140ms ease, color 140ms ease;
}

.app-tab:hover {
  color: #1d5b42;
}

.app-tab.active {
  background: #fff;
  color: #1d5b42;
  box-shadow: 0 1px 3px rgb(34 63 47 / 12%);
}

.app-tab:focus-visible {
  outline: 3px solid rgb(40 115 84 / 25%);
  outline-offset: 2px;
}

.session {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.account-name {
  overflow: hidden;
  color: #54645b;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-button {
  min-height: 38px;
  flex: 0 0 auto;
  padding: 0 14px;
  border: 1px solid #c9ddcf;
  border-radius: 5px;
  background: #fff;
  color: #1d5b42;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.logout-button:hover:not(:disabled) {
  background: #eff7f1;
}

.logout-button:focus-visible {
  outline: 3px solid rgb(40 115 84 / 25%);
  outline-offset: 2px;
}

.logout-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.logout-error {
  width: min(100% - 48px, 920px);
  box-sizing: border-box;
  margin: 12px auto 0;
  padding: 10px 12px;
  border: 1px solid #efd0cc;
  border-radius: 5px;
  background: #fff6f4;
  color: #a23e37;
  font-size: 13px;
  text-align: left;
}

.app-header.wide,
.logout-error.wide {
  width: calc(100% - 48px);
}

@media (max-width: 700px) {
  .app-header,
  .logout-error,
  .app-header.wide,
  .logout-error.wide {
    width: calc(100% - 32px);
  }

  .app-header {
    flex-wrap: wrap;
  }

  .account-name {
    display: none;
  }
}
</style>
