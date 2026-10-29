<script setup lang="ts">
import { computed } from 'vue'
import type { ImportReport } from '../../types/comptabilite'

const props = defineProps<{
  report: ImportReport | null
  importedAt: Date | null
}>()

function pluriel(nombre: number, singulier: string, plurielForme: string): string {
  return nombre > 1 ? plurielForme : singulier
}

const horodatage = computed(() => props.importedAt?.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) ?? '')

const stats = computed(() => {
  if (!props.report) {
    return []
  }

  const { lignesImportees, doublons, piecesRejetees } = props.report
  return [
    { valeur: lignesImportees, label: pluriel(lignesImportees, 'ligne importée', 'lignes importées'), tone: 'ok' },
    { valeur: doublons, label: pluriel(doublons, 'doublon ignoré', 'doublons ignorés'), tone: 'neutral' },
    { valeur: piecesRejetees, label: pluriel(piecesRejetees, 'pièce rejetée', 'pièces rejetées'), tone: piecesRejetees > 0 ? 'warn' : 'neutral' },
  ]
})
</script>

<template>
  <section class="compta-card padded report-card" aria-labelledby="report-title" aria-live="polite">
    <div class="report-heading">
      <h2 id="report-title">Rapport du dernier import</h2>
      <span v-if="report" class="compta-meta report-file">{{ report.fichier }} · {{ horodatage }}</span>
    </div>

    <p v-if="!report" class="compta-message">
      Aucun import pendant cette session : le rapport ligne par ligne s’affichera ici.
    </p>
    <template v-else>
      <dl class="report-stats">
        <div v-for="stat in stats" :key="stat.label" class="stat" :class="stat.tone">
          <dt>{{ stat.label }}</dt>
          <dd class="mono">{{ stat.valeur }}</dd>
        </div>
      </dl>

      <ul v-if="report.erreurs.length > 0" class="report-errors">
        <li v-for="erreur in report.erreurs" :key="erreur.ligne" class="report-error-row">
          <span class="error-line mono">Ligne {{ erreur.ligne }}</span>
          <div>
            <p class="error-title" :class="{ rejet: erreur.type === 'erreur' }">
              {{ erreur.type === 'doublon' ? 'Doublon' : 'Rejet' }}<template v-if="erreur.piece"> · {{ erreur.piece }}</template>
            </p>
            <p class="error-message">{{ erreur.message }}</p>
          </div>
        </li>
      </ul>
      <p v-else class="compta-alert success report-clean">Toutes les lignes du fichier ont été traitées sans erreur.</p>
    </template>
  </section>
</template>

<style scoped>
.report-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 16px;
}

.report-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.stat {
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-end;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--line-soft);
  color: var(--ink-soft);
}

.stat.ok {
  background: var(--brand-wash);
  color: var(--brand-ink);
}

.stat.warn {
  background: var(--warn-wash);
  color: var(--warn-ink);
}

.stat dt {
  font-size: 13px;
  font-weight: 500;
}

.stat dd {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

.report-errors {
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 10px;
  list-style: none;
}

.report-error-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line-soft);
}

.report-error-row:last-child {
  border-bottom: 0;
}

.error-line {
  min-width: 64px;
  padding-top: 2px;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}

.error-title {
  margin: 0 0 2px;
  font-size: 14px;
  font-weight: 600;
}

.error-title.rejet {
  color: var(--warn-ink);
}

.error-message {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.report-clean {
  margin: 0;
}

@media (max-width: 700px) {
  .report-stats {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
