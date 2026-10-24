<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { safeRedirect } from '../router/redirect'
import '../styles/auth.css'

const route = useRoute()
const router = useRouter()
const { register } = useAuth()

const form = reactive({ name: '', email: '', password: '', confirmation: '' })
const fieldErrors = reactive({ name: '', email: '', password: '', confirmation: '' })
const requestError = ref('')
const submitting = ref(false)

function validate(): boolean {
  fieldErrors.name = form.name.trim() ? '' : 'Le nom est obligatoire.'
  fieldErrors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ? ''
    : 'Saisissez une adresse e-mail valide.'
  fieldErrors.password = form.password.length >= 8 && new TextEncoder().encode(form.password).length <= 72
    ? ''
    : 'Le mot de passe doit contenir entre 8 et 72 caractères.'
  fieldErrors.confirmation = form.confirmation === form.password ? '' : 'Les mots de passe ne correspondent pas.'

  return Object.values(fieldErrors).every((message) => !message)
}

async function submit() {
  if (submitting.value || !validate()) {
    return
  }

  submitting.value = true
  requestError.value = ''

  try {
    await register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
    await router.replace(safeRedirect(route.query.redirect))
  } catch (error: unknown) {
    requestError.value = error instanceof Error ? error.message : 'Inscription impossible.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" aria-labelledby="register-title">
      <p class="eyebrow">IZI</p>
      <h1 id="register-title">Créer un compte</h1>

      <form class="auth-form" novalidate @submit.prevent="submit">
        <div class="auth-field">
          <label for="register-name">Nom</label>
          <input
            id="register-name"
            v-model="form.name"
            type="text"
            name="name"
            autocomplete="name"
            maxlength="100"
            required
            :aria-invalid="Boolean(fieldErrors.name)"
            :aria-describedby="fieldErrors.name ? 'register-name-error' : undefined"
            :disabled="submitting"
          />
          <p v-if="fieldErrors.name" id="register-name-error" class="auth-field-error">{{ fieldErrors.name }}</p>
        </div>

        <div class="auth-field">
          <label for="register-email">Email</label>
          <input
            id="register-email"
            v-model="form.email"
            type="email"
            name="email"
            autocomplete="email"
            maxlength="254"
            required
            :aria-invalid="Boolean(fieldErrors.email)"
            :aria-describedby="fieldErrors.email ? 'register-email-error' : undefined"
            :disabled="submitting"
          />
          <p v-if="fieldErrors.email" id="register-email-error" class="auth-field-error">{{ fieldErrors.email }}</p>
        </div>

        <div class="auth-field">
          <label for="register-password">Mot de passe</label>
          <input
            id="register-password"
            v-model="form.password"
            type="password"
            name="password"
            autocomplete="new-password"
            minlength="8"
            required
            :aria-invalid="Boolean(fieldErrors.password)"
            :aria-describedby="fieldErrors.password ? 'register-password-error' : 'register-password-hint'"
            :disabled="submitting"
          />
          <p v-if="fieldErrors.password" id="register-password-error" class="auth-field-error">{{ fieldErrors.password }}</p>
          <p v-else id="register-password-hint" class="auth-field-hint">8 caractères minimum.</p>
        </div>

        <div class="auth-field">
          <label for="register-confirmation">Confirmer le mot de passe</label>
          <input
            id="register-confirmation"
            v-model="form.confirmation"
            type="password"
            name="confirmation"
            autocomplete="new-password"
            required
            :aria-invalid="Boolean(fieldErrors.confirmation)"
            :aria-describedby="fieldErrors.confirmation ? 'register-confirmation-error' : undefined"
            :disabled="submitting"
          />
          <p v-if="fieldErrors.confirmation" id="register-confirmation-error" class="auth-field-error">
            {{ fieldErrors.confirmation }}
          </p>
        </div>

        <p v-if="requestError" class="auth-alert" role="alert">{{ requestError }}</p>

        <button class="auth-submit" type="submit" :disabled="submitting">
          {{ submitting ? 'Création du compte…' : 'Créer mon compte' }}
        </button>
      </form>

      <p class="auth-switch">
        Déjà un compte ?
        <RouterLink :to="{ name: 'login', query: route.query.redirect ? { redirect: route.query.redirect } : {} }">
          Se connecter
        </RouterLink>
      </p>
    </section>
  </main>
</template>
