<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { safeRedirect } from '../router/redirect'
import '../styles/auth.css'

const route = useRoute()
const router = useRouter()
const { login } = useAuth()

const form = reactive({ email: '', password: '' })
const fieldErrors = reactive({ email: '', password: '' })
const requestError = ref('')
const submitting = ref(false)
const sessionExpired = computed(() => route.query.expired === '1')

function validate(): boolean {
  fieldErrors.email = form.email.trim() ? '' : 'L’adresse e-mail est obligatoire.'
  fieldErrors.password = form.password ? '' : 'Le mot de passe est obligatoire.'
  return !fieldErrors.email && !fieldErrors.password
}

async function submit() {
  if (submitting.value || !validate()) {
    return
  }

  submitting.value = true
  requestError.value = ''

  try {
    await login({ email: form.email.trim(), password: form.password })
    await router.replace(safeRedirect(route.query.redirect))
  } catch (error: unknown) {
    requestError.value = error instanceof Error ? error.message : 'Connexion impossible.'
    form.password = ''
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" aria-labelledby="login-title">
      <p class="eyebrow">Gestion Utilisateurs</p>
      <h1 id="login-title">Connexion</h1>

      <form class="auth-form" novalidate @submit.prevent="submit">
        <p v-if="sessionExpired && !requestError" class="auth-notice" role="status">
          Votre session a expiré. Reconnectez-vous pour continuer.
        </p>

        <div class="auth-field">
          <label for="login-email">Email</label>
          <input
            id="login-email"
            v-model="form.email"
            type="email"
            name="email"
            autocomplete="email"
            required
            :aria-invalid="Boolean(fieldErrors.email)"
            :aria-describedby="fieldErrors.email ? 'login-email-error' : undefined"
            :disabled="submitting"
          />
          <p v-if="fieldErrors.email" id="login-email-error" class="auth-field-error">{{ fieldErrors.email }}</p>
        </div>

        <div class="auth-field">
          <label for="login-password">Mot de passe</label>
          <input
            id="login-password"
            v-model="form.password"
            type="password"
            name="password"
            autocomplete="current-password"
            required
            :aria-invalid="Boolean(fieldErrors.password)"
            :aria-describedby="fieldErrors.password ? 'login-password-error' : undefined"
            :disabled="submitting"
          />
          <p v-if="fieldErrors.password" id="login-password-error" class="auth-field-error">{{ fieldErrors.password }}</p>
        </div>

        <p v-if="requestError" class="auth-alert" role="alert">{{ requestError }}</p>

        <button class="auth-submit" type="submit" :disabled="submitting">
          {{ submitting ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>

      <p class="auth-switch">
        Pas encore de compte ?
        <RouterLink :to="{ name: 'register', query: route.query.redirect ? { redirect: route.query.redirect } : {} }">
          Créer un compte
        </RouterLink>
      </p>
    </section>
  </main>
</template>
