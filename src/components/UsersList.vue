<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import UserCreateModal from './UserCreateModal.vue'
import UserDeleteModal from './UserDeleteModal.vue'
import UserEditModal from './UserEditModal.vue'
import { deleteUser, getUsers, type User, type UsersPagination } from '../services/userService'
import { avatarThumbnail, userInitials } from '../utils/avatar'

const usersPerPage = 10

const emit = defineEmits<{
  deleted: []
  statsChanged: []
}>()

const users = ref<User[]>([])
const loading = ref(false)
const error = ref('')
const pagination = ref<UsersPagination>({
  currentPage: 1,
  totalItems: 0,
  totalPages: 0,
})
const currentPage = computed(() => pagination.value.currentPage)
let latestRequestId = 0
const selectedUser = ref<User | null>(null)
const userToDelete = ref<User | null>(null)
const deleting = ref(false)
const deletionError = ref('')
const successMessage = ref('')
const createModalOpen = ref(false)
const brokenAvatars = reactive(new Set<string>())

async function loadUsers(requestedPage = currentPage.value) {
  const requestId = ++latestRequestId
  loading.value = true
  error.value = ''

  try {
    const response = await getUsers(requestedPage)

    if (requestId !== latestRequestId) {
      return
    }

    const lastPage = response.pagination.totalPages
    if (requestedPage > Math.max(lastPage, 1)) {
      await loadUsers(Math.max(lastPage, 1))
      return
    }

    users.value = response.data
    pagination.value = response.pagination
  } catch (requestError) {
    if (requestId !== latestRequestId) {
      return
    }

    error.value = requestError instanceof Error
      ? requestError.message
      : 'Une erreur est survenue lors du chargement.'
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
    }
  }
}

function goToPage(page: number) {
  if (loading.value || page < 1 || page > pagination.value.totalPages || page === currentPage.value) {
    return
  }

  void loadUsers(page)
}

function openEditModal(user: User) {
  selectedUser.value = { ...user }
  successMessage.value = ''
}

function closeEditModal() {
  selectedUser.value = null
}

async function handleUserSaved(user: User) {
  selectedUser.value = null
  successMessage.value = `${user.name} a été modifié avec succès.`
  await loadUsers()
  emit('statsChanged')
}

async function handleUserCreated(user: User) {
  createModalOpen.value = false
  successMessage.value = `${user.name} a été créé avec succès.`
  const lastPage = Math.max(1, Math.ceil((pagination.value.totalItems + 1) / usersPerPage))
  await loadUsers(lastPage)
  emit('statsChanged')
}

function openDeleteModal(user: User) {
  userToDelete.value = { ...user }
  deletionError.value = ''
  successMessage.value = ''
}

function closeDeleteModal() {
  if (!deleting.value) {
    userToDelete.value = null
    deletionError.value = ''
  }
}

async function handleDeleteConfirmed() {
  const user = userToDelete.value
  if (!user || deleting.value) {
    return
  }

  deleting.value = true
  deletionError.value = ''

  try {
    await deleteUser(user.id)
    emit('deleted')
    emit('statsChanged')
    userToDelete.value = null
    successMessage.value = `${user.name} a été supprimé avec succès.`
    await loadUsers()
  } catch (requestError: unknown) {
    deletionError.value = requestError instanceof Error
      ? requestError.message
      : 'Impossible de supprimer cet utilisateur.'
  } finally {
    deleting.value = false
  }
}

onMounted(loadUsers)
</script>

<template>
  <section class="users-list" aria-labelledby="users-title" :aria-busy="loading">
    <header class="list-header">
      <div>
        <p class="eyebrow">Répertoire</p>
        <h2 id="users-title">Utilisateurs</h2>
        <p class="subtitle">
          {{ pagination.totalItems }} {{ pagination.totalItems > 1 ? 'comptes' : 'compte' }} enregistré{{ pagination.totalItems > 1 ? 's' : '' }}
        </p>
      </div>

      <div class="header-actions">
        <button class="create-button" type="button" @click="createModalOpen = true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Créer un utilisateur</span>
        </button>
        <button class="refresh-button" type="button" :disabled="loading" @click="loadUsers()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 7v5h-5M4.9 9a7.5 7.5 0 0 1 12.6-2L20 12M4 17v-5h5m10.1 3a7.5 7.5 0 0 1-12.6 2L4 12" />
          </svg>
          <span>{{ loading ? 'Chargement…' : 'Actualiser' }}</span>
        </button>
      </div>
    </header>

    <p v-if="successMessage" class="success-message" role="status" aria-live="polite">
      {{ successMessage }}
    </p>

    <p v-if="loading" class="message loading-message" role="status" aria-live="polite">
      <span class="loading-dot" aria-hidden="true"></span>
      Chargement des utilisateurs…
    </p>

    <div v-else-if="error" class="message error-message" role="alert">
      <span>{{ error }}</span>
      <button class="retry-button" type="button" @click="loadUsers()">Réessayer</button>
    </div>

    <p v-else-if="users.length === 0" class="message empty-message" role="status">
      Aucun utilisateur pour le moment.
    </p>

    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Nom</th>
            <th scope="col">Email</th>
            <th scope="col" class="actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
            class="user-row"
            tabindex="0"
            :aria-label="`Modifier l’utilisateur ${user.name}`"
            aria-haspopup="dialog"
            @click="openEditModal(user)"
            @keydown.enter.prevent="openEditModal(user)"
            @keydown.space.prevent="openEditModal(user)"
          >
            <td class="user-id">{{ user.id }}</td>
            <td class="user-name">
              <span class="user-identity">
                <img
                  v-if="user.avatarUrl && !brokenAvatars.has(user.avatarUrl)"
                  class="user-avatar"
                  :src="avatarThumbnail(user.avatarUrl, 32)"
                  alt=""
                  width="32"
                  height="32"
                  loading="lazy"
                  decoding="async"
                  @error="brokenAvatars.add(user.avatarUrl)"
                />
                <span v-else class="user-avatar avatar-fallback" aria-hidden="true">{{ userInitials(user.name) }}</span>
                <span>{{ user.name }}</span>
              </span>
            </td>
            <td class="user-email">{{ user.email }}</td>
            <td class="actions-cell">
              <button
                class="delete-row-button"
                type="button"
                :aria-label="`Supprimer ${user.name}`"
                @click.stop="openDeleteModal(user)"
                @keydown.enter.stop
                @keydown.space.stop
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" />
                </svg>
                <span>Supprimer</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav
      v-if="!loading && !error && pagination.totalItems > 0"
      class="pagination-controls"
      aria-label="Pagination des utilisateurs"
    >
      <p class="pagination-range" aria-live="polite">
        Affichage de {{ (currentPage - 1) * usersPerPage + 1 }} à
        {{ Math.min(currentPage * usersPerPage, pagination.totalItems) }}
        sur {{ pagination.totalItems }} utilisateurs
      </p>
      <div class="pagination-buttons">
        <button
          class="page-button previous-page"
          type="button"
          :disabled="currentPage <= 1 || loading"
          @click="goToPage(currentPage - 1)"
        >
          Précédent
        </button>
        <span class="page-label" aria-current="page">
          Page {{ currentPage }} sur {{ pagination.totalPages }}
        </span>
        <button
          class="page-button next-page"
          type="button"
          :disabled="currentPage >= pagination.totalPages || loading"
          @click="goToPage(currentPage + 1)"
        >
          Suivant
        </button>
      </div>
    </nav>
  </section>

  <UserCreateModal
    v-if="createModalOpen"
    @close="createModalOpen = false"
    @created="handleUserCreated"
  />

  <UserEditModal
    v-if="selectedUser"
    :user="selectedUser"
    @close="closeEditModal"
    @saved="handleUserSaved"
  />

  <UserDeleteModal
    v-if="userToDelete"
    :user="userToDelete"
    :deleting="deleting"
    :error="deletionError"
    @close="closeDeleteModal"
    @confirm="handleDeleteConfirmed"
  />
</template>

<style scoped>
.users-list {
  --ink: #263634;
  --muted: #71807a;
  --line: #e1e9e4;
  --green: #287354;
  --green-dark: #1d5b42;
  --green-wash: #eff7f1;
  --error: #a23e37;

  width: min(100% - 48px, 920px);
  margin: 48px auto 64px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  text-align: left;
  box-shadow: 0 12px 32px rgb(34 63 47 / 6%);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 26px 30px 22px;
  border-bottom: 1px solid var(--line);
}

.eyebrow {
  margin: 0 0 5px;
  color: var(--green);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  color: var(--ink);
  font-size: 24px;
  font-weight: 650;
  line-height: 1.25;
}

.subtitle {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.4;
}

.header-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.create-button,
.refresh-button,
.retry-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid #c9ddcf;
  border-radius: 5px;
  background: #fff;
  color: var(--green-dark);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease;
}

.create-button {
  border-color: #287354;
  background: #287354;
  color: #fff;
}

.create-button:hover {
  border-color: #1d5b42;
  background: #1d5b42;
}

.refresh-button:hover:not(:disabled),
.retry-button:hover {
  border-color: var(--green);
  background: var(--green-wash);
}

.create-button:focus-visible,
.refresh-button:focus-visible,
.retry-button:focus-visible {
  outline: 3px solid rgb(40 115 84 / 25%);
  outline-offset: 2px;
}

.refresh-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.create-button svg,
.refresh-button svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.message {
  display: flex;
  min-height: 130px;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 0;
  padding: 24px;
  color: var(--muted);
  font-size: 14px;
  text-align: center;
}

.success-message {
  margin: 0;
  padding: 12px 30px;
  border-bottom: 1px solid #d7e9dc;
  background: #f0f8f2;
  color: #1d6846;
  font-size: 13px;
  font-weight: 600;
}

.error-message {
  flex-direction: column;
  color: var(--error);
}

.loading-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--green);
  animation: pulse 900ms ease-in-out infinite alternate;
}

.table-scroll {
  overflow-x: auto;
}

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  border-top: 1px solid var(--line);
}

.pagination-range {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-label {
  min-width: 96px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}

.page-button {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid #c9ddcf;
  border-radius: 5px;
  background: #fff;
  color: var(--green-dark);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.page-button:hover:not(:disabled) {
  border-color: var(--green);
  background: var(--green-wash);
}

.page-button:focus-visible {
  outline: 3px solid rgb(40 115 84 / 25%);
  outline-offset: 2px;
}

.page-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  text-align: left;
}

th,
td {
  padding: 15px 30px;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}

.actions-header,
.actions-cell {
  width: 1%;
  text-align: right;
}

.delete-row-button {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid #edc8c4;
  border-radius: 5px;
  background: #fff;
  color: #a3332b;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}

.delete-row-button:hover {
  border-color: #b9362e;
  background: #b9362e;
  color: #fff;
}

.delete-row-button:focus-visible {
  outline: 3px solid rgb(185 54 46 / 24%);
  outline-offset: 2px;
}

.delete-row-button svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

th {
  background: #f7faf8;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.user-row {
  cursor: pointer;
  transition: background-color 120ms ease;
}

.user-row:hover,
.user-row:focus-visible {
  background: #f8fbf9;
}

.user-row:focus-visible {
  outline: 2px solid #287354;
  outline-offset: -2px;
}

.user-id {
  width: 90px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.user-name {
  color: var(--ink);
  font-weight: 600;
}

.user-email {
  color: #4d6258;
}

.user-identity {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border-radius: 50%;
  object-fit: cover;
  background: #edf6ef;
}

.avatar-fallback {
  display: inline-grid;
  place-items: center;
  color: #287354;
  font-size: 12px;
  font-weight: 700;
}

@keyframes pulse {
  from { opacity: 0.4; transform: scale(0.82); }
  to { opacity: 1; transform: scale(1); }
}

@media (max-width: 600px) {
  .users-list {
    width: calc(100% - 32px);
    margin: 28px auto 40px;
  }

  .list-header {
    align-items: flex-start;
    gap: 12px;
    padding: 22px 18px 18px;
  }

  .pagination-controls {
    align-items: flex-start;
    flex-direction: column;
    padding: 16px 18px;
  }

  .pagination-buttons {
    width: 100%;
    justify-content: space-between;
    gap: 8px;
  }

  .page-label {
    min-width: 84px;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  h2 {
    font-size: 21px;
  }

  .create-button,
  .refresh-button {
    gap: 7px;
    min-height: 38px;
    padding: 0 10px;
    font-size: 13px;
  }

  th,
  td {
    padding: 14px 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>