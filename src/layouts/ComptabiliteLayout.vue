<script setup lang="ts">
import '../styles/comptabilite.css'

const liens = [
  { name: 'comptabilite', label: 'Tableau de bord' },
  { name: 'compta-ecritures', label: 'Écritures' },
  { name: 'compta-balance', label: 'Balance' },
  { name: 'compta-lettrage', label: 'Lettrage' },
]
</script>

<template>
  <div class="compta-shell">
    <div class="compta-frame">
      <aside class="compta-aside">
        <nav class="compta-nav" aria-label="Comptabilité">
          <p class="compta-nav-title">Production</p>
          <RouterLink
            v-for="lien in liens"
            :key="lien.name"
            class="compta-nav-link"
            exact-active-class="active"
            :to="{ name: lien.name }"
          >
            {{ lien.label }}
          </RouterLink>
        </nav>
      </aside>

      <main class="compta-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.compta-shell {
  flex: 1;
  margin-top: 12px;
  border-top: 1px solid var(--line);
  background: var(--page);
}

.compta-frame {
  display: grid;
  width: calc(100% - 48px);
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 32px;
  margin: 0 auto;
}

.compta-aside {
  padding: 24px 0;
}

.compta-nav {
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.compta-nav-title {
  margin: 0;
  padding: 0 12px 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.72px;
  text-transform: uppercase;
}

.compta-nav-link {
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--ink-soft);
  font-size: 15px;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 140ms ease, color 140ms ease;
}

.compta-nav-link:hover {
  background: #fff;
  color: var(--ink);
}

.compta-nav-link.active {
  background: var(--brand-wash);
  color: var(--brand-ink);
  font-weight: 600;
}

.compta-content {
  min-width: 0;
  max-width: 1176px;
  padding: 32px 0 48px;
}

@media (max-width: 900px) {
  .compta-frame {
    width: calc(100% - 32px);
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .compta-aside {
    padding: 16px 0 0;
  }

  .compta-nav {
    position: static;
    flex-direction: row;
    overflow-x: auto;
  }

  .compta-nav-title {
    display: none;
  }

  .compta-content {
    padding-top: 20px;
  }
}
</style>
