<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { updateUser, uploadUserAvatar, type User } from '../services/userService'
import { avatarAcceptedTypes, avatarMaxBytes, avatarThumbnail, userInitials } from '../utils/avatar'

const props = defineProps<{ user: User }>()
const emit = defineEmits<{
  close: []
  saved: [user: User]
}>()

const form = reactive({
  name: props.user.name,
  email: props.user.email,
})
const fieldErrors = reactive({ name: '', email: '', avatar: '' })
const requestError = ref('')
const saving = ref(false)
const dialog = ref<HTMLElement | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarFile = ref<File | null>(null)
const avatarPreview = ref('')
const savedDetails = ref<User | null>(null)

const currentAvatar = computed(() => avatarPreview.value
  || (props.user.avatarUrl ? avatarThumbnail(props.user.avatarUrl, 72) : ''))

let previouslyFocused: HTMLElement | null = null
let previousBodyOverflow = ''

function clearAvatarSelection() {
  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
  }
  avatarPreview.value = ''
  avatarFile.value = null
  if (avatarInput.value) {
    avatarInput.value.value = ''
  }
}

watch(() => props.user, (user) => {
  form.name = user.name
  form.email = user.email
  fieldErrors.name = ''
  fieldErrors.email = ''
  fieldErrors.avatar = ''
  requestError.value = ''
  savedDetails.value = null
  clearAvatarSelection()
})

function handleAvatarChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  requestError.value = ''
  fieldErrors.avatar = ''

  if (!file) {
    return
  }

  if (!avatarAcceptedTypes.includes(file.type)) {
    clearAvatarSelection()
    fieldErrors.avatar = 'Choisissez une image JPG, PNG ou WebP.'
    return
  }

  if (file.size > avatarMaxBytes) {
    clearAvatarSelection()
    fieldErrors.avatar = 'La photo ne doit pas dépasser 2 Mo.'
    return
  }

  clearAvatarSelection()
  avatarFile.value = file
  avatarPreview.value = URL.createObjectURL(file)
}

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
  if (saving.value) {
    return
  }

  if (savedDetails.value) {
    emit('saved', savedDetails.value)
    return
  }

  emit('close')
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

  const persistedUser = savedDetails.value ?? props.user
  const details = { name: form.name.trim(), email: form.email.trim() }
  const detailsChanged = details.name !== persistedUser.name
    || details.email.toLowerCase() !== persistedUser.email

  let uploadingAvatar = false

  try {
    let updatedUser = persistedUser
    if (!avatarFile.value || detailsChanged) {
      updatedUser = await updateUser(props.user.id, details)
      savedDetails.value = updatedUser
    }

    if (avatarFile.value) {
      uploadingAvatar = true
      updatedUser = await uploadUserAvatar(props.user.id, avatarFile.value)
    }

    emit('saved', updatedUser)
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : 'Impossible de modifier cet utilisateur.'
    requestError.value = uploadingAvatar && savedDetails.value
      ? `Nom et e-mail enregistrés, mais la photo n’a pas pu être envoyée : ${message}`
      : message
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
  clearAvatarSelection()
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
          <div class="avatar-field">
            <img
              v-if="currentAvatar"
              class="avatar-preview"
              :src="currentAvatar"
              alt="Aperçu de la photo de profil"
              width="72"
              height="72"
            />
            <span v-else class="avatar-preview avatar-fallback" aria-hidden="true">
              {{ userInitials(form.name || user.name) }}
            </span>

            <div class="avatar-controls">
              <input
                id="edit-user-avatar"
                ref="avatarInput"
                class="avatar-input"
                type="file"
                name="avatar"
                accept="image/jpeg,image/png,image/webp"
                :aria-invalid="Boolean(fieldErrors.avatar)"
                :aria-describedby="fieldErrors.avatar ? 'edit-user-avatar-error' : 'edit-user-avatar-hint'"
                :disabled="saving"
                @change="handleAvatarChange"
              />
              <div class="avatar-buttons">
                <label for="edit-user-avatar" class="avatar-pick" :class="{ disabled: saving }">
                  {{ currentAvatar ? 'Changer la photo' : 'Ajouter une photo' }}
                </label>
                <button
                  v-if="avatarFile"
                  class="avatar-reset"
                  type="button"
                  :disabled="saving"
                  @click="clearAvatarSelection"
                >
                  Annuler la sélection
                </button>
              </div>
              <p v-if="fieldErrors.avatar" id="edit-user-avatar-error" class="field-error">
                {{ fieldErrors.avatar }}
              </p>
              <p v-else id="edit-user-avatar-hint" class="field-hint">
                {{ avatarFile ? avatarFile.name : 'JPG, PNG ou WebP · 2 Mo maximum' }}
              </p>
            </div>
          </div>

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

.avatar-field {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-preview {
  width: 72px;
  height: 72px;
  flex: 0 0 auto;
  border-radius: 50%;
  object-fit: cover;
  background: #edf6ef;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  color: #287354;
  font-size: 22px;
  font-weight: 700;
}

.avatar-controls {
  position: relative;
  display: grid;
  min-width: 0;
  gap: 6px;
}

.avatar-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.avatar-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.avatar-pick,
.avatar-reset {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  padding: 0 12px;
  border: 1px solid #c9ddcf;
  border-radius: 5px;
  background: #fff;
  color: #1d5b42;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.avatar-reset {
  border-color: #d6dfd9;
  color: #43564b;
}

.avatar-pick:hover:not(.disabled),
.avatar-reset:hover:not(:disabled) {
  background: #f0f5f1;
}

.avatar-input:focus-visible + .avatar-buttons .avatar-pick,
.avatar-reset:focus-visible {
  outline: 3px solid rgb(40 115 84 / 28%);
  outline-offset: 2px;
}

.avatar-pick.disabled {
  cursor: wait;
  opacity: 0.65;
}

.field-hint {
  margin: 0;
  overflow: hidden;
  color: #71807a;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
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
