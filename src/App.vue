<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

// Componenti
import Header from "./components/Layout/Header.vue";
import Footer from "./components/Layout/Footer.vue";
import NuovoMovimento from "./components/Movimenti/NuovoMovimento.vue";
import AccountMenu from "./components/Layout/AccountMenu.vue";

const route = useRoute();

// Se siamo nel login (hideChrome: true), questa variabile diventa TRUE
const hideChrome = computed(() => route.meta?.hideChrome === true);
</script>

<template>
  <div id="app-shell">
    <!-- HEADER DESKTOP (Nascosto se hideChrome è true) -->
    <header v-if="!hideChrome" class="app-header d-none d-lg-block">
      <Header />
    </header>

    <!-- HEADER MOBILE (Nascosto se hideChrome è true) -->
    <header v-if="!hideChrome" class="app-header-mobile d-lg-none shadow-sm">
      <div class="app-header-mobile-inner container-fluid">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-wallet2 text-primary fs-4"></i>
          <span class="fw-bold text-dark tracking-tight">Finance</span>
        </div>
        <!-- Menu Utente -->
        <AccountMenu />
      </div>
    </header>

    <!-- CONTENUTO PRINCIPALE -->
    <!-- 'auth-mode' centra il login, altrimenti usa layout normale -->
    <main :class="['app-content', { 'auth-mode': hideChrome }]">
      <!-- 
         IL TRUCCO PER LA NAVIGAZIONE FLUIDA:
         :key="route.fullPath" costringe Vue a ricaricare il componente 
         quando cambi pagina. Risolve il problema del "Clear site data".
      -->
      <router-view v-slot="{ Component }">
        <component :is="Component" :key="route.fullPath" />
      </router-view>
    </main>

    <!-- FOOTER MOBILE (Nascosto se hideChrome è true) -->
    <footer v-if="!hideChrome" class="app-footer d-lg-none">
      <Footer />
    </footer>

    <!-- FAB Pulsante + (Nascosto se hideChrome è true) -->
    <NuovoMovimento v-if="!hideChrome" />
  </div>
</template>

<style>
/* CSS CRITICO PER IL LAYOUT */
html,
body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden; /* Blocca scroll pagina intera, scrolla solo main */
  background-color: #f8f9fa;
}

#app {
  height: 100%;
}

/* Flex Column: Header in alto, Footer in basso, Main in mezzo */
#app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-header,
.app-header-mobile {
  flex-shrink: 0;
  background: white;
  z-index: 1000;
  position: relative;
}

.app-header-mobile-inner {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
}

/* Main scrollabile */
.app-content {
  flex: 1 1 auto; /* Occupa tutto lo spazio disponibile */
  overflow-y: auto; /* Scrolla qui dentro */
  overflow-x: hidden;
  position: relative;
  padding-bottom: 0; /* Rimosso - ogni view gestisce il proprio spacing */
}

/* Stile speciale per Login: centra tutto */
.auth-mode {
  background: #ffffff;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-footer {
  flex-shrink: 0;
  background: white;
  border-top: 1px solid #dee2e6;
  z-index: 1000;
}
</style>
