<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DernieresPieces from '../../components/comptabilite/DernieresPieces.vue'
import FluxBancaires from '../../components/comptabilite/FluxBancaires.vue'
import { getBalance, getJournal } from '../../services/comptabiliteService'
import type { Balance, Ecriture } from '../../types/comptabilite'
import { formatMois, groupPieces, soldePrefixe } from '../../utils/compta'
import { formatEuros, formatMontant, toCents } from '../../utils/montant'

const balance = ref<Balance | null>(null)
const journal = ref<Ecriture[]>([])
const loading = ref(false)
const error = ref('')

const comptes = computed(() => balance.value?.comptes ?? [])
const pieces = computed(() => groupPieces(journal.value))
const banque = computed(() => journal.value.filter((ligne) => ligne.compte.startsWith('512')))
const clientsOuverts = computed(() => journal.value.filter((ligne) => ligne.compte.startsWith('411') && !ligne.lettrage))
const banqueOuverte = computed(() => banque.value.filter((ligne) => !ligne.lettrage))

const contexte = computed(() => {
  const derniere = journal.value.at(-1)
  return derniere ? `${formatMois(derniere.date)} · ${pieces.value.length} pièce(s)` : 'Aucune écriture'
})

// Soldes de la balance : débit − crédit, donc les comptes créditeurs (401, 4457x, 7) sont négatifs.
const indicateurs = computed(() => {
  const collectee = -soldePrefixe(comptes.value, '44571')
  const deductible = soldePrefixe(comptes.value, '44566')
  const tva = collectee - deductible
  const produits = -soldePrefixe(comptes.value, '7')
  const charges = soldePrefixe(comptes.value, '6')
  const factureFournisseurs = journal.value.filter((ligne) => ligne.compte.startsWith('401') && toCents(ligne.credit) > 0n).length

  return [
    {
      label: 'Trésorerie · 512',
      valeur: soldePrefixe(comptes.value, '512'),
      detail: `${banque.value.length} mouvement(s) bancaire(s)`,
    },
    {
      label: 'Créances clients · 411',
      valeur: soldePrefixe(comptes.value, '411'),
      detail: clientsOuverts.value.length > 0 ? `${clientsOuverts.value.length} ligne(s) client à lettrer` : 'Toutes les lignes sont lettrées',
      alerte: clientsOuverts.value.length > 0,
    },
    {
      label: 'Dettes fournisseurs · 401',
      valeur: -soldePrefixe(comptes.value, '401'),
      detail: `${factureFournisseurs} facture(s) fournisseur`,
    },
    {
      label: tva < 0n ? 'Crédit de TVA' : 'TVA à reverser',
      valeur: tva < 0n ? -tva : tva,
      detail: `Collectée ${formatMontant(collectee)} − déductible ${formatMontant(deductible)}`,
    },
    {
      label: 'Résultat provisoire',
      valeur: produits - charges,
      detail: `Produits ${formatMontant(produits)} − charges ${formatMontant(charges)}`,
      sombre: true,
    },
  ]
})

const aTraiter = computed(() => [
  {
    cle: '411',
    titre: `${clientsOuverts.value.length} ligne(s) client à lettrer`,
    detail: 'Factures et règlements du compte 411',
    compte: clientsOuverts.value[0]?.compte,
  },
  {
    cle: '512',
    titre: `${banqueOuverte.value.length} mouvement(s) bancaire(s) à lettrer`,
    detail: 'Encaissements et décaissements du compte 512',
    compte: banqueOuverte.value[0]?.compte,
  },
].filter((item) => item.compte !== undefined))

const dernieresPieces = computed(() => [...pieces.value]
  .reverse()
  .sort((left, right) => (left.date < right.date ? 1 : left.date > right.date ? -1 : 0))
  .slice(0, 5))

async function load() {
  loading.value = true
  error.value = ''

  try {
    ;[balance.value, journal.value] = await Promise.all([getBalance(), getJournal()])
  } catch (requestError: unknown) {
    error.value = requestError instanceof Error ? requestError.message : 'Impossible de charger le tableau de bord.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <header class="compta-page-header">
    <div>
      <p class="compta-page-context">{{ contexte }}</p>
      <h1>Tableau de bord</h1>
    </div>
    <div class="compta-page-actions">
      <RouterLink class="compta-button large" :to="{ name: 'compta-ecritures' }">Importer un CSV</RouterLink>
    </div>
  </header>

  <p v-if="loading && !balance" class="compta-message" role="status">Chargement du tableau de bord…</p>
  <div v-else-if="error" class="compta-message compta-error" role="alert">
    <p>{{ error }}</p>
    <button class="compta-button" type="button" @click="load">Réessayer</button>
  </div>
  <div v-else-if="journal.length === 0" class="compta-card compta-message empty-state">
    <p>Aucune écriture pour le moment : importez un fichier CSV pour alimenter le tableau de bord.</p>
    <RouterLink class="compta-button primary" :to="{ name: 'compta-ecritures' }">Importer des écritures</RouterLink>
  </div>

  <div v-else class="dashboard">
    <section class="kpis" aria-label="Indicateurs">
      <article v-for="kpi in indicateurs" :key="kpi.label" class="kpi" :class="{ dark: kpi.sombre }">
        <h2 class="kpi-label">{{ kpi.label }}</h2>
        <p class="kpi-value mono">{{ formatEuros(kpi.valeur) }}</p>
        <p class="kpi-detail" :class="{ alert: kpi.alerte }">{{ kpi.detail }}</p>
      </article>
    </section>

    <div class="dashboard-columns">
      <FluxBancaires :mouvements="banque" />

      <section class="compta-card padded todo-card" aria-labelledby="todo-title">
        <h2 id="todo-title">À traiter</h2>

        <ul v-if="aTraiter.length > 0" class="todo-list">
          <li v-for="item in aTraiter" :key="item.cle" class="todo-item">
            <div>
              <p class="todo-title">{{ item.titre }}</p>
              <p class="todo-detail">{{ item.detail }}</p>
            </div>
            <RouterLink class="compta-button primary" :to="{ name: 'compta-lettrage', query: { compte: item.compte } }">
              Lettrer
            </RouterLink>
          </li>
        </ul>
        <p v-else class="todo-empty">Rien à traiter : les lignes clients et banque sont lettrées.</p>

        <div v-if="balance" class="balance-check" :class="{ ko: !balance.equilibree }">
          <span class="balance-label">{{ balance.equilibree ? 'Balance équilibrée' : 'Balance déséquilibrée' }}</span>
          <span class="mono">
            D {{ formatMontant(balance.totaux.debit) }} {{ balance.equilibree ? '=' : '≠' }} C {{ formatMontant(balance.totaux.credit) }}
          </span>
        </div>
      </section>
    </div>

    <DernieresPieces :pieces="dernieresPieces" />
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.kpi {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
}

.kpi.dark {
  border-color: var(--night);
  background: var(--night);
}

.kpi-label {
  color: var(--muted);
  font-size: 14px;
  font-weight: 400;
}

.kpi-value {
  margin: 0;
  color: var(--ink);
  font-size: 26px;
  font-weight: 500;
  letter-spacing: -0.52px;
  white-space: nowrap;
}

.kpi-detail {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.kpi-detail.alert {
  color: var(--warn);
  font-weight: 500;
}

.kpi.dark .kpi-label,
.kpi.dark .kpi-detail {
  color: var(--night-muted);
}

.kpi.dark .kpi-value {
  color: #fff;
}

.dashboard-columns {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 16px;
  align-items: stretch;
}

.todo-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.todo-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line-soft);
}

.todo-item:last-child {
  border-bottom: 0;
}

.todo-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 500;
}

.todo-detail,
.todo-empty {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.balance-check {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--brand-wash);
  color: var(--brand-ink);
  font-size: 13px;
}

.balance-check.ko {
  background: var(--warn-wash);
  color: var(--warn-ink);
}

.balance-label {
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 1000px) {
  .dashboard-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
