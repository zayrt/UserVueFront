<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { updateUser, type User } from '../services/userService'

const props = defineProps<{ user: User }>()
const emit = defineEmits<{
  close: []
  saved: [user: User]
}>()

const form = reactive({
  name: props.user.name,
  email: props.user.email,
})
const fieldErrors = reactive({ name: '', email: '' })
const requestError = ref('')
const saving = ref(false)
const dialog = ref<HTMLElement | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)

let previouslyFocused: HTMLElement | null = null
let previousBodyOverflow = ''

watch(() => props.user, (user) => {
  form.name = user.name
  form.email = user.email
  fieldErrors.name = ''
  fieldErrors.email = ''
  requestError.value = ''
})

function validateForm(): boolean {
  fieldErrors.name = form.name.trim() ? '' : 'Le nom est obligatoire.'
  fieldErrors.email = ''

  const email = form.email.trim()
  if (!email) {
    fieldErrors.email = 'L’adresse e-mail est obligatoire.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = 'Saisissez une adresse e-mail valide.'
  }

  return !fieldErrors.name && !fieldErrors.email
}

function clearFieldError(field: 'name' | 'email') {
  fieldErrors[field] = ''
  requestError.value = ''
}

function requestClose() {
  if (!saving.value) {
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
    'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

async function saveUser() {
  if (saving.value || !validateForm()) {
    return
  }

  saving.value = true
  requestError.value = ''

  try {
    const updatedUser = await updateUser(props.user.id, {
      name: form.name.trim(),
      email: form.email.trim(),
    })
    emit('saved', updatedUser)
  } catch (error: unknown) {
    requestError.value = error instanceof Error
      ? error.message
      : 'Impossible de modifier cet utilisateur.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  previouslyFocused = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeydown)

  await nextTick()
  nameInput.value?.focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = previousBodyOverflow
  previouslyFocused?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="requestClose">
      <section
        ref="dialog"
        class="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        tabindex="-1"
      >
        <header class="modal-header">
          <div>
            <p class="eyebrow">Compte utilisateur</p>
            <h2 id="edit-modal-title">Modifier l’utilisateur</h2>
          </div>
          <button
            class="close-button"
            type="button"
            aria-label="Fermer la fenêtre"
            :disabled="saving"
            @click="requestClose"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <form class="edit-form" novalidate @submit.prevent="saveUser">
          <div class="field-group">
            <label for="edit-user-name">Nom</label>
            <input
              id="edit-user-name"
              ref="nameInput"
              v-model="form.name"
              type="text"
              name="name"
              autocomplete="name"
              maxlength="100"
              required
              :aria-invalid="Boolean(fieldErrors.name)"
              :aria-describedby="fieldErrors.name ? 'edit-user-name-error' : undefined"
              :disabled="saving"
              @input="clearFieldError('name')"
            />
            <p v-if="fieldErrors.name" id="edit-user-name-error" class="field-error">
              {{ fieldErrors.name }}
            </p>
          </div>

          <div class="field-group">
            <label for="edit-user-email">Email</label>
            <input
              id="edit-user-email"
              v-model="form.email"
              type="email"
              name="email"
              autocomplete="email"
              maxlength="254"
              required
              :aria-invalid="Boolean(fieldErrors.email)"
              :aria-describedby="fieldErrors.email ? 'edit-user-email-error' : undefined"
              :disabled="saving"
              @input="clearFieldError('email')"
            />
            <p v-if="fieldErrors.email" id="edit-user-email-error" class="field-error">
              {{ fieldErrors.email }}
            </p>
          </div>

          <p v-if="requestError" class="request-error" role="alert">
            {{ requestError }}
          </p>

          <footer class="modal-actions">
            <button class="cancel-button" type="button" :disabled="saving" @click="requestClose">
              Annuler
            </button>
            <button class="save-button" type="submit" :disabled="saving">
              {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 24px;
  background: rgb(19 29 25 / 64%);
  animation: backdrop-in 160ms ease-out;
}

.edit-modal {
  width: min(100%, 480px);
  overflow: hidden;
  border: 1px solid #e3e9e5;
  border-radius: 8px;
  background: #fff;
  color: #263634;
  box-shadow: 0 24px 70px rgb(8 19 13 / 28%);
  animation: modal-in 180ms ease-out;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 26px 28px 22px;
  border-bottom: 1px solid #e5ebe7;
}

.eyebrow {
  margin: 0 0 6px;
  color: #287354;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  color: #263634;
  font-size: 22px;
  font-weight: 650;
  line-height: 1.3;
}

.close-button {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  margin: -4px -7px 0 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #68766f;
  cursor: pointer;
}

.close-button:hover:not(:disabled) {
  background: #f0f5f1;
  color: #1d5b42;
}

.close-button:focus-visible,
.cancel-button:focus-visible,
.save-button:focus-visible {
  outline: 3px solid rgb(40 115 84 / 28%);
  outline-offset: 2px;
}

.close-button:disabled,
.cancel-button:disabled,
.save-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.close-button svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.8;
}

.edit-form {
  display: grid;
  gap: 20px;
  padding: 26px 28px 28px;
}

.field-group {
  display: grid;
  gap: 8px;
}

label {
  color: #354940;
  font-size: 13px;
  font-weight: 650;
}

input {
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid #cdd8d0;
  border-radius: 5px;
  background: #fff;
  color: #263634;
  font: inherit;
  font-size: 14px;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

input:hover:not(:disabled) {
  border-color: #91ad9a;
}

input:focus {
  border-color: #287354;
  outline: 0;
  box-shadow: 0 0 0 3px rgb(40 115 84 / 13%);
}

input[aria-invalid="true"] {
  border-color: #b4453e;
}

input:disabled {
  background: #f5f7f5;
  color: #65736c;
}

.field-error,
.request-error {
  margin: 0;
  color: #a23e37;
  font-size: 12px;
  line-height: 1.45;
}

.request-error {
  padding: 11px 12px;
  border: 1px solid #efd0cc;
  border-radius: 5px;
  background: #fff6f4;
  font-size: 13px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.cancel-button,
.save-button {
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 5px;
  font: inherit;
  font-size: 14px;
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

.save-button {
  background: #287354;
  color: #fff;
}

.save-button:hover:not(:disabled) {
  background: #1d5b42;
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

  .edit-modal {
    width: 100%;
  }

  .modal-header {
    padding: 22px 20px 18px;
  }

  .edit-form {
    gap: 18px;
    padding: 22px 20px 20px;
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
