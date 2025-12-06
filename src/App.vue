<script setup>
import { RouterView } from "vue-router";

import { computed } from "vue";
import { useRoute } from "vue-router";

import Header from "./components/Layout/Header.vue";
import Footer from "./components/Layout/Footer.vue";
import NuovoMovimento from "./components/Movimenti/NuovoMovimento.vue";
import AccountMenu from "./components/Layout/AccountMenu.vue";

const route = useRoute();
const hideChrome = computed(() => route.meta?.hideChrome);
</script>

<template>
  <div id="app-shell">
    <!-- HEADER DESKTOP -->
    <header v-if="!hideChrome" class="app-header d-none d-lg-block">
      <Header />
    </header>

    <!-- HEADER MOBILE -->
    <header v-if="!hideChrome" class="app-header-mobile d-lg-none">
      <div class="app-header-mobile-inner">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-wallet2 text-primary fs-5"></i>
          <span class="fw-semibold text-primary">Finance</span>
        </div>

        <!-- QUI il menu account (logout / cambio utente) -->
        <AccountMenu />
      </div>
    </header>

    <!-- CONTENUTO PRINCIPALE -->
    <!-- CONTENUTO PAGINE -->
    <main :class="['app-content', { 'app-content-auth': hideChrome }]">
      <!-- app-content -->
      <!-- RouterView con key sulla route per forzare il remount della pagina -->
      <router-view v-slot="{ Component, route }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </transition>
      </router-view>
    </main>

    <!-- FOOTER (TAB BAR) SOLO MOBILE -->
    <footer v-if="!hideChrome" class="app-footer d-lg-none">
      <Footer />
    </footer>

    <!-- FAB "Nuovo movimento" (resta come prima) -->
    <NuovoMovimento v-if="!hideChrome" />
  </div>
</template>

<style>
html,
body,
#app {
  height: 100%;
}

/* Shell generale */
#app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f4f7fb;
}

/* Header desktop */
.app-header {
  flex-shrink: 0;
}

/* Header mobile */
.app-header-mobile {
  flex-shrink: 0;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.app-header-mobile-inner {
  height: 56px;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Area centrale con le view */
.app-main {
  flex: 1 1 auto;
  overflow: hidden;
}

.app-content-auth {
  overflow: auto;
  background: transparent;
}

/* Footer mobile (tab bar in basso) */
.app-footer {
  flex-shrink: 0;
}

/* Transizione base tra view */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
