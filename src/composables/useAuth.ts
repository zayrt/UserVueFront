import { computed, readonly, ref } from 'vue'
import * as authService from '../services/authService'
import type { Account, LoginPayload, RegisterPayload } from '../services/authService'

const account = ref<Account | null>(null)
let sessionCheck: Promise<Account | null> | null = null

function setAccount(value: Account | null) {
  account.value = value
  sessionCheck = Promise.resolve(value)
}

export function useAuth() {
  return {
    account: readonly(account),
    isAuthenticated: computed(() => account.value !== null),

    // Interroge /api/auth/me une seule fois ; une erreur réseau vaut « non connecté ».
    ensureSession(): Promise<Account | null> {
      sessionCheck ??= authService.fetchCurrentAccount()
        .catch(() => null)
        .then((value) => {
          account.value = value
          return value
        })
      return sessionCheck
    },

    async login(payload: LoginPayload) {
      setAccount(await authService.login(payload))
    },

    async register(payload: RegisterPayload) {
      setAccount(await authService.register(payload))
    },

    async logout() {
      await authService.logout()
      setAccount(null)
    },

    clearSession() {
      setAccount(null)
    },

    forgetSession() {
      account.value = null
      sessionCheck = null
    },
  }
}
