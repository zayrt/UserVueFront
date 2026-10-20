<script setup lang="ts">
import { ref } from 'vue'
import HelloWorld from './components/HelloWorld.vue'
import UsersGrowthChart from './components/UsersGrowthChart.vue'
import UsersStatsCards from './components/UsersStatsCards.vue'
import UsersList from './components/UsersList.vue'

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
  <!-- <HelloWorld /> -->
  <UsersStatsCards ref="usersStatsCards" />
  <UsersGrowthChart ref="usersGrowthChart" />
  <UsersList @stats-changed="refreshUserStatistics" />
</template>
