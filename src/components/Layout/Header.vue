<template>
  <header class="main-header">
    <div class="main-header-inner">
      <!-- LOGO / BRAND -->
      <div class="main-header-left">
        <i class="bi bi-wallet2 text-primary fs-4"></i>
        <span class="fw-bold text-primary d-none d-xl-inline ms-2">
          Finance
        </span>
      </div>

      <!-- NAV CENTRALE -->
      <nav class="main-header-nav">
        <RouterLink
          to="/"
          class="nav-pill-link"
          active-class="nav-pill-link-active"
        >
          Dashboard
        </RouterLink>

        <RouterLink
          to="/movimenti"
          class="nav-pill-link"
          active-class="nav-pill-link-active"
        >
          Movimenti
        </RouterLink>

        <RouterLink
          to="/storico"
          class="nav-pill-link"
          active-class="nav-pill-link-active"
        >
          Storico
        </RouterLink>

        <RouterLink
          to="/config"
          class="nav-pill-link"
          active-class="nav-pill-link-active"
        >
          Config
        </RouterLink>
      </nav>

      <!-- MENU ACCOUNT (logout / cambia utente) -->
      <div class="main-header-right">
        <AccountMenu />
      </div>
    </div>
  </header>
</template>

<script setup>
import { RouterLink } from "vue-router";
import AccountMenu from "./AccountMenu.vue";
</script>

<style scoped>
.main-header {
  height: 64px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.main-header-inner {
  height: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.main-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Nav pill centrale */
.main-header-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: #ffffff;
  padding: 4px;
  border-radius: 999px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.nav-pill-link {
  border-radius: 999px;
  padding: 6px 18px;
  font-size: 0.85rem;
  text-decoration: none;
  color: #64748b;
  white-space: nowrap;
}

.nav-pill-link:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}

.nav-pill-link-active {
  background-color: #6366f1;
  color: #ffffff !important;
  box-shadow: 0 10px 25px rgba(79, 70, 229, 0.35);
}

.main-header-right {
  display: flex;
  align-items: center;
}
</style>
