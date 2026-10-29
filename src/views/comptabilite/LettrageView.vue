<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LettragePanel from '../../components/LettragePanel.vue'
import { delettrer, getBalance, getEcrituresCompte, lettrer } from '../../services/comptabiliteService'
import type { Balance, Ecriture } from '../../types/comptabilite'
import { isCompteLettrable, libelleCompte } from '../../utils/compta'
import { formatEuros, toCents } from '../../utils/montant'

const route = useRoute()
const router = useRouter()

const balance = ref<Balance | null>(null)
const compte = ref('')
const ecritures = ref<Ecriture[]>([])
const loading = ref(false)
const error = ref('')
const busy = ref(false)
const actionError = ref('')
const successMessage = ref('')
let latestRequestId = 0

const comptes = computed(() => (balance.value?.comptes ?? []).filter((ligne) => isCompteLettrable(ligne.compte)))

const contexte = computed(() => {
  const ligne = comptes.value.find((candidat) => candidat.compte === compte.value)
  if (!ligne) {
    return 'Comptes clients (411) et banque (512)'
  }
  const solde = toCents(ligne.solde)
  const sens = solde > 0n ? 'débiteur' : solde < 0n ? 'créditeur' : 'soldé'
  const libelle = libelleCompte(ligne.compte)
  return `Compte ${ligne.compte}${libelle ? ` · ${libelle}` : ''} · solde ${formatEuros(solde < 0n ? -solde : solde)} ${sens}`
})

const codes = computed(() => [...new Set(ecritures.value.flatMap((ecriture) => ecriture.lettrage ?? []))])
const lettrees = computed(() => ecritures.value.filter((ecriture) => ecriture.lettrage !== null).length)

// Paires débit / crédit non lettrées de même montant, appariées dans l'ordre chronologique.
const propositions = computed(() => {
  const ouvertes = ecritures.value.filter((ecriture) => ecriture.lettrage === null)
  const credits = ouvertes.filter((ecriture) => toCents(ecriture.credit) > 0n)
  const utilises = new Set<number>()
  const paires: { debit: Ecriture, credit: Ecriture, montant: bigint }[] = []

  for (const debit of ouvertes.filter((ecriture) => toCents(ecriture.debit) > 0n)) {
    const montant = toCents(debit.debit)
    const credit = credits.find((candidat) => !utilises.has(candidat.id) && toCents(candidat.credit) === montant)
    if (credit) {
      utilises.add(credit.id)
      paires.push({ debit, credit, montant })
    }
  }

  return paires
})

const sansContrepartie = computed(() => {
  const proposees = new Set(propositions.value.flatMap(({ debit, credit }) => [debit.id, credit.id]))
  const lignes = ecritures.value.filter((ecriture) => ecriture.lettrage === null && !proposees.has(ecriture.id))
  const reste = lignes.reduce((sum, ligne) => sum + toCents(ligne.debit) - toCents(ligne.credit), 0n)
  return { lignes, reste }
})

async function loadEcritures() {
  const requestId = ++latestRequestId
  actionError.value = ''

  if (!compte.value) {
    ecritures.value = []
    return
  }

  loading.value = true
  error.value = ''

  try {
    const data = await getEcrituresCompte(compte.value)
    if (requestId === latestRequestId) {
      ecritures.value = data
    }
  } catch (requestError: unknown) {
    if (requestId === latestRequestId) {
      error.value = requestError instanceof Error ? requestError.message : 'Impossible de récupérer les écritures du compte.'
    }
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

async function load() {
  loading.value = true
  error.value = ''

  try {
    balance.value = await getBalance()
  } catch (requestError: unknown) {
    error.value = requestError instanceof Error ? requestError.message : 'Impossible de récupérer la balance.'
    return
  } finally {
    loading.value = false
  }

  // Le compte demandé (lien du tableau de bord) s'il est lettrable, sinon le premier.
  const demande = typeof route.query.compte === 'string' ? route.query.compte : ''
  const choisi = comptes.value.some((ligne) => ligne.compte === demande) ? demande : comptes.value[0]?.compte ?? ''
  if (choisi === compte.value) {
    await loadEcritures()
  } else {
    compte.value = choisi // le watcher charge les écritures
  }
}

async function runAction(action: () => Promise<string>) {
  busy.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    successMessage.value = await action()
    await loadEcritures()
  } catch (requestError: unknown) {
    actionError.value = requestError instanceof Error ? requestError.message : 'L’opération a échoué.'
  } finally {
    busy.value = false
  }
}

function handleLettrer(ecritureIds: number[]) {
  void runAction(async () => {
    const lettrage = await lettrer(ecritureIds)
    return `${lettrage.ecritureIds.length} écritures lettrées avec le code ${lettrage.code}.`
  })
}

function handleDelettrer(code: string) {
  void runAction(async () => {
    await delettrer(compte.value, code)
    return `Lettrage ${code} annulé.`
  })
}

function handleToutDelettrer() {
  const aAnnuler = codes.value
  if (aAnnuler.length === 0 || !window.confirm(`Annuler les ${aAnnuler.length} lettrage(s) du compte ${compte.value} ?`)) {
    return
  }

  void runAction(async () => {
    for (const code of aAnnuler) {
      await delettrer(compte.value, code)
    }
    return `${aAnnuler.length} lettrage(s) annulé(s) sur le compte ${compte.value}.`
  })
}

watch(compte, (value) => {
  successMessage.value = ''
  if (value && route.query.compte !== value) {
    void router.replace({ query: { ...route.query, compte: value } })
  }
  void loadEcritures()
})

onMounted(load)
</script>

<template>
  <header class="compta-page-header">
    <div>
      <p class="compta-page-context">{{ contexte }}</p>
      <h1>Lettrage</h1>
    </div>
    <div v-if="comptes.length > 0" class="compta-page-actions">
      <label class="compte-picker">
        <span>Compte</span>
        <select v-model="compte" class="compte-select" :disabled="busy">
          <option v-for="ligne in comptes" :key="ligne.compte" :value="ligne.compte">
            {{ ligne.compte }} {{ libelleCompte(ligne.compte) }}
          </option>
        </select>
      </label>
      <button class="compta-button large tout-delettrer" type="button" :disabled="busy || codes.length === 0" @click="handleToutDelettrer">
        Tout délettrer
      </button>
    </div>
  </header>

  <p v-if="successMessage" class="compta-alert success lettrage-success" role="status">{{ successMessage }}</p>
  <p v-if="actionError" class="compta-alert lettrage-action-error" role="alert">{{ actionError }}</p>

  <p v-if="loading && ecritures.length === 0" class="compta-message" role="status">Chargement des écritures…</p>
  <div v-else-if="error" class="compta-message compta-error" role="alert">
    <p>{{ error }}</p>
    <button class="compta-button" type="button" @click="balance ? loadEcritures() : load()">Réessayer</button>
  </div>
  <p v-else-if="comptes.length === 0" class="compta-card compta-message" role="status">
    Aucun compte 411 ou 512 à lettrer pour le moment.
  </p>

  <div v-else class="lettrage-layout">
    <LettragePanel
      :compte="compte"
      :ecritures="ecritures"
      :busy="busy"
      @lettrer="handleLettrer"
      @delettrer="handleDelettrer"
    />

    <div class="lettrage-side">
      <section class="compta-card padded propositions" aria-labelledby="propositions-title">
        <h2 id="propositions-title">Propositions automatiques</h2>
        <ul v-if="propositions.length > 0" class="proposition-list">
          <li v-for="{ debit, credit, montant } in propositions" :key="`${debit.id}-${credit.id}`" class="proposition">
            <div>
              <p class="proposition-title">{{ debit.libelle }}</p>
              <p class="proposition-detail">{{ debit.piece }} ↔ {{ credit.piece }} · {{ formatEuros(montant) }}</p>
            </div>
            <button
              class="compta-button outline appliquer-button"
              type="button"
              :disabled="busy"
              :aria-label="`Lettrer ${debit.piece} avec ${credit.piece}`"
              @click="handleLettrer([debit.id, credit.id])"
            >
              Appliquer
            </button>
          </li>
        </ul>
        <p v-else class="proposition-empty">Aucune facture et aucun règlement de même montant à rapprocher.</p>
      </section>

      <section v-if="sansContrepartie.lignes.length > 0" class="non-lettrable" aria-labelledby="non-lettrable-title">
        <h2 id="non-lettrable-title">{{ sansContrepartie.lignes.length }} ligne(s) sans contrepartie exacte</h2>
        <p>
          Reste {{ formatEuros(sansContrepartie.reste < 0n ? -sansContrepartie.reste : sansContrepartie.reste) }}
          {{ sansContrepartie.reste < 0n ? 'au crédit' : 'dû' }} sur ces lignes.
          Elles restent ouvertes jusqu’au solde, ou se lettrent ensemble à la main si leur somme est nulle.
        </p>
      </section>

      <section class="compta-card stat-card" aria-label="Avancement du lettrage">
        <span class="compta-meta">Lignes lettrées</span>
        <span class="stat-value mono">{{ lettrees }} / {{ ecritures.length }}</span>
      </section>
    </div>
  </div>
</template>

<style scoped>
.compte-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 13px;
}

.compte-select {
  min-height: 46px;
  padding: 0 28px 0 16px;
  border: 1px solid var(--field);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 14px;
}

.lettrage-layout {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 16px;
  align-items: start;
}

.lettrage-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.propositions {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.proposition-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.proposition {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 15px;
  border: 1px solid var(--line);
  border-radius: 10px;
}

.proposition-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 600;
}

.proposition-detail,
.proposition-empty {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.non-lettrable {
  padding: 20px 24px;
  border-radius: 12px;
  background: var(--warn-wash);
}

.non-lettrable h2 {
  margin-bottom: 6px;
  color: var(--warn-ink);
  font-size: 15px;
}

.non-lettrable p {
  margin: 0;
  color: var(--warn-deep);
  font-size: 14px;
}

.stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
}

.stat-value {
  font-size: 22px;
  font-weight: 500;
}

@media (max-width: 1000px) {
  .lettrage-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
