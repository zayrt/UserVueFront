<script setup lang="ts">
import { ref } from 'vue'
import UsersGrowthChart from '../components/UsersGrowthChart.vue'
import UsersList from '../components/UsersList.vue'
import UsersStatsCards from '../components/UsersStatsCards.vue'

const usersGrowthChart = ref<{ refresh: () => Promise<void> } | null>(null)
const usersStatsCards = ref<{ refresh: () => Promise<void> } | null>(null)

async function refreshUserStatistics() {
  await Promise.all([
    usersGrowthChart.value?.refresh(),
    usersStatsCards.value?.refresh(),
  ])
}
</script>

<template>
  <header class="dashboard-header">
    <p class="eyebrow">Gestion Utilisateurs</p>
    <h1>Tableau de bord</h1>
  </header>

  <main>
    <UsersStatsCards ref="usersStatsCards" />
    <UsersGrowthChart ref="usersGrowthChart" />
    <UsersList @stats-changed="refreshUserStatistics" />
  </main>
</template>

<style scoped>
.dashboard-header {
  width: min(100% - 48px, 920px);
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

@media (max-width: 700px) {
  .dashboard-header {
    width: calc(100% - 32px);
  }

  h1 {
    font-size: 22px;
  }
}
</style>
