<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import EcrituresImport from '../../components/EcrituresImport.vue'
import ImportReportCard from '../../components/comptabilite/ImportReportCard.vue'
import JournalTable from '../../components/comptabilite/JournalTable.vue'
import { getJournal } from '../../services/comptabiliteService'
import type { Ecriture, ImportReport } from '../../types/comptabilite'
import { formatMois } from '../../utils/compta'

const ecritures = ref<Ecriture[]>([])
const loading = ref(false)
const error = ref('')
const report = ref<ImportReport | null>(null)
const importedAt = ref<Date | null>(null)

const contexte = computed(() => {
  const derniere = ecritures.value.at(-1)
  if (!derniere) {
    return 'Aucune écriture'
  }
  const journaux = new Set(ecritures.value.map((ecriture) => ecriture.journal)).size
  return `${formatMois(derniere.date)} · ${journaux} journa${journaux > 1 ? 'ux' : 'l'}`
})

async function loadJournal() {
  loading.value = true
  error.value = ''

  try {
    ecritures.value = await getJournal()
  } catch (requestError: unknown) {
    error.value = requestError instanceof Error ? requestError.message : 'Impossible de récupérer le journal.'
  } finally {
    loading.value = false
  }
}

async function handleImport(nouveauRapport: ImportReport) {
  report.value = nouveauRapport
  importedAt.value = new Date()
  if (nouveauRapport.lignesImportees > 0) {
    await loadJournal()
  }
}

onMounted(loadJournal)
</script>

<template>
  <header class="compta-page-header">
    <div>
      <p class="compta-page-context">{{ contexte }}</p>
      <h1>Écritures</h1>
    </div>
  </header>

  <div class="ecritures">
    <div class="ecritures-top">
      <EcrituresImport @completed="handleImport" />
      <ImportReportCard :report="report" :imported-at="importedAt" />
    </div>

    <JournalTable :ecritures="ecritures" :loading="loading" :error="error" @retry="loadJournal" />
  </div>
</template>

<style scoped>
.ecritures {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ecritures-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 16px;
}

@media (max-width: 1000px) {
  .ecritures-top {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
