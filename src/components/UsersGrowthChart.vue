<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import { getUsersGrowth } from '../services/statsService'
import type { UserGrowthPoint } from '../types/stats'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const points = ref<UserGrowthPoint[]>([])
const loading = ref<boolean>(false)
const error = ref<string | null>(null)

function formatDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`))
}

const chartData = computed<ChartData<'line'>>(() => ({
  labels: points.value.map((point) => formatDate(point.date, { day: '2-digit', month: 'short' })),
  datasets: [
    {
      label: 'Total utilisateurs',
      data: points.value.map((point) => point.total),
      borderColor: '#3978c5',
      backgroundColor: 'rgba(57, 120, 197, 0.1)',
      pointBorderColor: '#3978c5',
      yAxisID: 'yTotal',
      fill: true,
    },
    {
      label: 'Utilisateurs créés',
      data: points.value.map((point) => point.created),
      borderColor: '#287354',
      backgroundColor: '#287354',
      pointBorderColor: '#287354',
      yAxisID: 'yActivity',
    },
    {
      label: 'Utilisateurs modifiés',
      data: points.value.map((point) => point.updated),
      borderColor: '#d98228',
      backgroundColor: '#d98228',
      pointBorderColor: '#d98228',
      yAxisID: 'yActivity',
    },
    {
      label: 'Utilisateurs supprimés',
      data: points.value.map((point) => point.deleted),
      borderColor: '#bd463e',
      backgroundColor: '#bd463e',
      pointBorderColor: '#bd463e',
      yAxisID: 'yActivity',
    },
  ].map((dataset) => ({
    ...dataset,
    borderWidth: 2.5,
    pointRadius: 3,
    pointHoverRadius: 5,
    pointBackgroundColor: '#ffffff',
    pointBorderWidth: 2,
    tension: 0.28,
  })),
}))

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { color: '#54645b', usePointStyle: true, boxWidth: 8, padding: 18 },
    },
    tooltip: {
      callbacks: {
        title: (items) => {
          const point = points.value[items[0]?.dataIndex ?? -1]
          return point
            ? formatDate(point.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            : ''
        },
        label: (context) => `${context.dataset.label}: ${context.parsed.y}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#71807a', maxRotation: 0 },
    },
    yTotal: {
      type: 'linear',
      position: 'left',
      beginAtZero: true,
      min: 0,
      ticks: {
        color: '#71807a',
        precision: 0,
        callback: (value) => Number.isInteger(Number(value)) ? value : '',
      },
      grid: { color: 'rgba(113, 128, 122, 0.14)' },
    },
    yActivity: {
      type: 'linear',
      position: 'right',
      beginAtZero: true,
      min: 0,
      ticks: {
        color: '#71807a',
        precision: 0,
        callback: (value) => Number.isInteger(Number(value)) ? value : '',
      },
      grid: { drawOnChartArea: false },
    },
  },
}))

async function refresh() {
  loading.value = true
  error.value = null

  try {
    const response = await getUsersGrowth(7)
    points.value = response.data
  } catch (requestError: unknown) {
    error.value = requestError instanceof Error
      ? requestError.message
      : 'Impossible de récupérer l’évolution des utilisateurs.'
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
defineExpose({ refresh })
</script>

<template>
  <section class="growth-chart" aria-labelledby="growth-chart-title" :aria-busy="loading">
    <header class="chart-header">
      <div>
        <p class="eyebrow">Activité</p>
        <h2 id="growth-chart-title">Évolution des utilisateurs</h2>
        <p class="subtitle">Effectif cumulé · 7 derniers jours · Europe/Paris</p>
      </div>
      <button class="refresh-button" type="button" :disabled="loading" @click="refresh">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 7v5h-5M4.9 9a7.5 7.5 0 0 1 12.6-2L20 12M4 17v-5h5m10.1 3a7.5 7.5 0 0 1-12.6 2L4 12" />
        </svg>
        <span>{{ loading ? 'Chargement…' : 'Actualiser' }}</span>
      </button>
    </header>

    <p v-if="loading" class="chart-message" role="status" aria-live="polite">
      <span class="loading-dot" aria-hidden="true"></span>
      Chargement des statistiques…
    </p>
    <div v-else-if="error" class="chart-message error-message" role="alert">
      <span>{{ error }}</span>
      <button class="retry-button" type="button" @click="refresh">Réessayer</button>
    </div>
    <p v-else-if="points.length === 0" class="chart-message" role="status">
      Aucune donnée disponible pour cette période.
    </p>
    <div v-else class="chart-canvas" role="img" aria-label="Graphique de l’évolution quotidienne du nombre d’utilisateurs">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </section>
</template>

<style scoped>
.growth-chart {
  --ink: #263634;
  --muted: #71807a;
  --line: #e1e9e4;
  --green: #287354;
  --green-dark: #1d5b42;
  --green-wash: #eff7f1;
  --error: #a23e37;

  width: min(100% - 48px, 920px);
  margin: 32px auto 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  text-align: left;
  box-shadow: 0 12px 32px rgb(34 63 47 / 6%);
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 30px 18px;
  border-bottom: 1px solid var(--line);
}

.eyebrow {
  margin: 0 0 5px;
  color: var(--green);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  color: var(--ink);
  font-size: 20px;
  font-weight: 650;
  line-height: 1.3;
}

.subtitle {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.4;
}

.refresh-button,
.retry-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid #c9ddcf;
  border-radius: 5px;
  background: #fff;
  color: var(--green-dark);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease;
}

.refresh-button:hover:not(:disabled),
.retry-button:hover {
  border-color: var(--green);
  background: var(--green-wash);
}

.refresh-button:focus-visible,
.retry-button:focus-visible {
  outline: 3px solid rgb(40 115 84 / 25%);
  outline-offset: 2px;
}

.refresh-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.refresh-button svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.chart-canvas {
  position: relative;
  height: 270px;
  padding: 18px 24px 20px;
}

.chart-message {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 0;
  padding: 24px;
  color: var(--muted);
  font-size: 14px;
  text-align: center;
}

.error-message {
  flex-direction: column;
  color: var(--error);
}

.loading-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--green);
  animation: pulse 900ms ease-in-out infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.4; transform: scale(0.82); }
  to { opacity: 1; transform: scale(1); }
}

@media (max-width: 600px) {
  .growth-chart {
    width: calc(100% - 32px);
    margin-top: 24px;
  }

  .chart-header {
    align-items: flex-start;
    gap: 12px;
    padding: 19px 18px 16px;
  }

  h2 {
    font-size: 18px;
  }

  .subtitle {
    max-width: 28ch;
  }

  .refresh-button {
    gap: 6px;
    min-height: 36px;
    padding: 0 9px;
    font-size: 12px;
  }

  .chart-canvas {
    height: 230px;
    padding: 12px 14px 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
