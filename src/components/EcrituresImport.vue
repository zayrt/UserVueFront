<script setup lang="ts">
import { ref } from 'vue'
import uploadIcon from '../assets/upload.svg'
import { importEcritures } from '../services/comptabiliteService'
import type { ImportReport } from '../types/comptabilite'

// Émis après chaque import traité par le serveur, même sans ligne importée : le rapport reste utile.
const emit = defineEmits<{
  completed: [report: ImportReport]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const dragging = ref(false)
const error = ref('')

async function upload(file: File | undefined) {
  if (!file || importing.value) {
    return
  }

  importing.value = true
  error.value = ''

  try {
    emit('completed', await importEcritures(file))
  } catch (requestError: unknown) {
    error.value = requestError instanceof Error ? requestError.message : 'L’import du fichier a échoué.'
  } finally {
    importing.value = false
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

function handleChange(event: Event) {
  void upload((event.target as HTMLInputElement).files?.[0])
}

function handleDrop(event: DragEvent) {
  dragging.value = false
  void upload(event.dataTransfer?.files[0])
}
</script>

<template>
  <section class="compta-card padded import-card" aria-labelledby="import-title" :aria-busy="importing">
    <h2 id="import-title">Importer des écritures</h2>

    <label
      class="dropzone"
      :class="{ dragging, busy: importing }"
      for="import-file"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="handleDrop"
    >
      <img :src="uploadIcon" width="32" height="32" alt="">
      <span class="dropzone-title">
        {{ importing ? 'Import en cours…' : 'Glissez un fichier CSV ou cliquez pour parcourir' }}
      </span>
      <span class="dropzone-hint">Séparateur ; · montants à point décimal</span>
      <input
        id="import-file"
        ref="fileInput"
        class="file-input"
        type="file"
        accept=".csv,text/csv"
        :disabled="importing"
        @change="handleChange"
      >
    </label>

    <p v-if="error" class="compta-alert import-error" role="alert">{{ error }}</p>

    <code class="csv-schema">date;journal;piece;compte;libelle;debit;credit</code>
    <p class="import-help">Chaque pièce doit être équilibrée. Les lignes déjà importées sont ignorées.</p>
  </section>
</template>

<style scoped>
.import-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 30px 22px;
  border: 2px dashed var(--night-muted);
  border-radius: 12px;
  background: var(--surface-alt);
  text-align: center;
  cursor: pointer;
  transition: border-color 140ms ease, background-color 140ms ease;
}

.dropzone:hover,
.dropzone.dragging {
  border-color: var(--brand);
  background: var(--brand-wash);
}

.dropzone.busy {
  cursor: progress;
  opacity: 0.7;
}

.dropzone-title {
  font-size: 15px;
  font-weight: 600;
}

.dropzone-hint {
  color: var(--muted);
  font-size: 13px;
}

.file-input {
  max-width: 100%;
  color: var(--ink);
  font-family: inherit;
  font-size: 13px;
}

.import-error {
  margin: 0;
}

.csv-schema {
  display: block;
  overflow-x: auto;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--page);
  color: var(--ink-soft);
  font-family: var(--mono);
  font-size: 12px;
  line-height: normal;
  white-space: nowrap;
}

.import-help {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}
</style>
