<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import UsersGrowthChart from '../components/UsersGrowthChart.vue'
import UsersList from '../components/UsersList.vue'
import UsersStatsCards from '../components/UsersStatsCards.vue'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { account, logout } = useAuth()

const usersGrowthChart = ref<{ refresh: () => Promise<void> } | null>(null)
const usersStatsCards = ref<{ refresh: () => Promise<void> } | null>(null)
const loggingOut = ref(false)
const logoutError = ref('')

async function refreshUserStatistics() {
  await Promise.all([
    usersGrowthChart.value?.refresh(),
    usersStatsCards.value?.refresh(),
  ])
}

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
  <header class="dashboard-header">
    <div>
      <p class="eyebrow">IZI</p>
      <h1>Tableau de bord</h1>
    </div>
    <div class="session">
      <span v-if="account" class="account-name">{{ account.name }}</span>
      <button class="logout-button" type="button" :disabled="loggingOut" @click="handleLogout">
        {{ loggingOut ? 'Déconnexion…' : 'Se déconnecter' }}
      </button>
    </div>
  </header>
  <p v-if="logoutError" class="logout-error" role="alert">{{ logoutError }}</p>

  <main>
    <UsersStatsCards ref="usersStatsCards" />
    <UsersGrowthChart ref="usersGrowthChart" />
    <UsersList @stats-changed="refreshUserStatistics" />
  </main>
</template>

<style scoped>
.dashboard-header {
  display: flex;
  width: min(100% - 48px, 920px);
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 28px auto 0;
  color: #263634;
  text-align: left;
}

.eyebrow {
  margin: 0 0 4px;
  color: #287354;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #263634;
  font-size: 26px;
  font-weight: 650;
  line-height: 1.2;
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

@media (max-width: 700px) {
  .dashboard-header,
  .logout-error {
    width: calc(100% - 32px);
  }

  h1 {
    font-size: 22px;
  }
}
</style>
