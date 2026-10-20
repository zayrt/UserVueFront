<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { User } from '../services/userService'

const props = defineProps<{
  user: User
  deleting: boolean
  error: string
}>()
const emit = defineEmits<{
  close: []
  confirm: []
}>()

const dialog = ref<HTMLElement | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null
let previousBodyOverflow = ''

function requestClose() {
  if (!props.deleting) {
    emit('close')
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    requestClose()
    return
  }

  if (event.key !== 'Tab') {
    return
  }

  const focusableElements = dialog.value?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  if (!focusableElements?.length) {
    event.preventDefault()
    dialog.value?.focus()
    return
  }

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]
  const focusIsInsideDialog = dialog.value?.contains(document.activeElement) ?? false

  if (event.shiftKey && (document.activeElement === firstElement || !focusIsInsideDialog)) {
    event.preventDefault()
    lastElement.focus()
  } else if (!event.shiftKey && (document.activeElement === lastElement || !focusIsInsideDialog)) {
    event.preventDefault()
    firstElement.focus()
  }
}

onMounted(async () => {
  previouslyFocused = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'

  await nextTick()
  cancelButton.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
  if (previouslyFocused?.isConnected) {
    previouslyFocused.focus()
  }
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="requestClose">
      <section
        ref="dialog"
        class="delete-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-description"
        :aria-busy="deleting"
        tabindex="-1"
        @keydown="handleKeydown"
      >
        <div class="warning-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" />
          </svg>
        </div>

        <h2 id="delete-modal-title">Confirmer la suppression</h2>
        <p id="delete-modal-description" class="confirmation-copy">
          Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{{ user.name }}</strong> ?
          Cette action est irréversible.
        </p>

        <p v-if="error" class="request-error" role="alert">
          {{ error }}
        </p>

        <footer class="modal-actions">
          <button
            ref="cancelButton"
            class="cancel-button"
            type="button"
            :disabled="deleting"
            @click="requestClose"
          >
            Annuler
          </button>
          <button
            class="delete-button"
            type="button"
            :disabled="deleting"
            @click="emit('confirm')"
          >
            {{ deleting ? 'Suppression en cours…' : 'Confirmer la suppression' }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  z-index: 1100;
  inset: 0;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 24px;
  background: rgb(19 29 25 / 66%);
  animation: backdrop-in 160ms ease-out;
}

.delete-modal {
  width: min(100%, 440px);
  box-sizing: border-box;
  padding: 30px;
  border: 1px solid #eadfdd;
  border-radius: 8px;
  background: #fff;
  color: #263634;
  text-align: center;
  box-shadow: 0 24px 70px rgb(8 19 13 / 28%);
  animation: modal-in 180ms ease-out;
}

.warning-icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: #fff0ed;
  color: #ad342b;
}

.warning-icon svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

h2 {
  margin: 0;
  color: #263634;
  font-size: 21px;
  font-weight: 650;
  line-height: 1.3;
}

.confirmation-copy {
  margin: 12px 0 24px;
  color: #63726a;
  font-size: 14px;
  line-height: 1.6;
}

.confirmation-copy strong {
  color: #34483d;
  font-weight: 700;
}

.request-error {
  margin: 0 0 20px;
  padding: 11px 12px;
  border: 1px solid #efd0cc;
  border-radius: 5px;
  background: #fff6f4;
  color: #a23e37;
  font-size: 13px;
  line-height: 1.45;
  text-align: left;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.cancel-button,
.delete-button {
  min-height: 42px;
  padding: 0 15px;
  border: 1px solid transparent;
  border-radius: 5px;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease;
}

.cancel-button {
  border-color: #d6dfd9;
  background: #fff;
  color: #43564b;
}

.cancel-button:hover:not(:disabled) {
  border-color: #aebdb3;
  background: #f7faf8;
}

.delete-button {
  background: #b9362e;
  color: #fff;
}

.delete-button:hover:not(:disabled) {
  background: #982b25;
}

.cancel-button:focus-visible,
.delete-button:focus-visible {
  outline: 3px solid rgb(40 115 84 / 28%);
  outline-offset: 2px;
}

.cancel-button:disabled,
.delete-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

@keyframes backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modal-in {
  from { opacity: 0; transform: translateY(8px) scale(0.99); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 520px) {
  .modal-backdrop {
    align-items: end;
    padding: 12px;
  }

  .delete-modal {
    padding: 25px 20px 20px;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .cancel-button,
  .delete-button {
    width: 100%;
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
