<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getUsersStats } from '../services/usersStatsService'
import type { UsersStatsResponse } from '../types/usersStats'

const stats = ref<UsersStatsResponse | null>(null)
const loading = ref<boolean>(true)
const error = ref<string | null>(null)

const cards = computed(() => {
  if (!stats.value) {
    return []
  }

  return [
    {
      kind: 'users',
      title: 'Total utilisateurs',
      subtitle: 'Présents actuellement',
      value: stats.value.totalUsers,
    },
    {
      kind: 'updates',
      title: 'Utilisateurs modifiés',
      subtitle: `${stats.value.period} derniers jours`,
      value: stats.value.modifiedUsers,
    },
    {
      kind: 'deletions',
      title: 'Utilisateurs supprimés',
      subtitle: `${stats.value.period} derniers jours`,
      value: stats.value.deletedUsers,
    },
  ] as const
})

const numberFormatter = new Intl.NumberFormat('fr-FR')

async function refresh() {
  loading.value = true
  error.value = null

  try {
    stats.value = await getUsersStats(7)
  } catch (requestError: unknown) {
    error.value = requestError instanceof Error
      ? requestError.message
      : 'Impossible de récupérer les statistiques utilisateurs.'
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
defineExpose({ refresh })
</script>

<template>
  <section class="users-stats" aria-label="Statistiques utilisateurs" :aria-busy="loading">
    <div v-if="loading" class="stats-grid" aria-hidden="true">
      <article v-for="index in 3" :key="index" class="stat-card skeleton-card">
        <span class="skeleton-icon"></span>
        <span class="skeleton-line skeleton-title"></span>
        <span class="skeleton-line skeleton-value"></span>
        <span class="skeleton-line skeleton-subtitle"></span>
      </article>
    </div>

    <div v-else-if="error" class="stats-error" role="alert">
      <p>{{ error }}</p>
      <button class="retry-button" type="button" @click="refresh">Réessayer</button>
    </div>

    <div v-else-if="stats" class="stats-grid">
      <article v-for="card in cards" :key="card.kind" class="stat-card" :class="`stat-${card.kind}`">
        <div class="stat-icon" aria-hidden="true">
          <svg v-if="card.kind === 'users'" viewBox="0 0 24 24">
            <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <svg v-else-if="card.kind === 'updates'" viewBox="0 0 24 24">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
          </svg>
          <svg v-else viewBox="0 0 24 24">
            <path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" />
          </svg>
        </div>
        <div class="stat-copy">
          <h2>{{ card.title }}</h2>
          <p class="stat-value">{{ numberFormatter.format(card.value) }}</p>
          <p class="stat-subtitle">{{ card.subtitle }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.users-stats {
  width: min(100% - 48px, 920px);
  margin: 28px auto 0;
  color: #263634;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  display: flex;
  min-width: 0;
  min-height: 142px;
  align-items: flex-start;
  gap: 15px;
  box-sizing: border-box;
  padding: 22px 20px;
  border: 1px solid #e1e9e4;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgb(34 63 47 / 5%);
}

.stat-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 7px;
  background: #edf6ef;
  color: #287354;
}

.stat-updates .stat-icon {
  background: #eef3fb;
  color: #446b9e;
}

.stat-deletions .stat-icon {
  background: #fff0ed;
  color: #ad342b;
}

.stat-icon svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.stat-copy {
  min-width: 0;
}

h2 {
  margin: 1px 0 10px;
  color: #54645b;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
}

.stat-value {
  margin: 0;
  color: #263634;
  font-size: 30px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1;
}

.stat-subtitle {
  margin: 8px 0 0;
  color: #809087;
  font-size: 12px;
  line-height: 1.35;
}

.stats-error {
  display: flex;
  min-height: 120px;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 20px;
  border: 1px solid #efd0cc;
  border-radius: 8px;
  background: #fff6f4;
  color: #a23e37;
  text-align: center;
}

.stats-error p {
  margin: 0;
  font-size: 14px;
}

.retry-button {
  min-height: 38px;
  flex: 0 0 auto;
  padding: 0 12px;
  border: 1px solid #c9ddcf;
  border-radius: 5px;
  background: #fff;
  color: #1d5b42;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.retry-button:hover {
  background: #eff7f1;
}

.retry-button:focus-visible {
  outline: 3px solid rgb(40 115 84 / 25%);
  outline-offset: 2px;
}

.skeleton-card {
  flex-direction: column;
  gap: 12px;
}

.skeleton-icon,
.skeleton-line {
  display: block;
  border-radius: 5px;
  background: linear-gradient(90deg, #edf1ee 25%, #f7f9f7 50%, #edf1ee 75%);
  background-size: 220% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.skeleton-icon {
  width: 34px;
  height: 30px;
}

.skeleton-line {
  height: 10px;
}

.skeleton-title {
  width: 60%;
}

.skeleton-value {
  width: 34%;
  height: 22px;
}

.skeleton-subtitle {
  width: 48%;
}

@keyframes shimmer {
  to { background-position: -220% 0; }
}

@media (max-width: 700px) {
  .users-stats {
    width: calc(100% - 32px);
    margin-top: 22px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .stat-card {
    min-height: 116px;
    padding: 18px;
  }

  .stats-error {
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
  }
}
</style>
