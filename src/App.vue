<template>
  <div id="app-shell">
    <!-- HEADER DESKTOP -->
    <header class="app-header d-none d-lg-block">
      <Header />
    </header>

    <!-- HEADER MOBILE -->
    <header class="app-header-mobile d-lg-none">
      <div class="d-flex justify-content-between align-items-center px-3 py-2 h-100">
        <span class="fw-bold text-primary">
          <i class="bi bi-wallet2"></i> Finance
        </span>
        <div
          class="avatar-small bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
          style="width: 32px; height: 32px;"
        >
          S
        </div>
      </div>
    </header>

    <!-- CONTENUTO PAGINE -->
    <main class="app-content">
      <!-- niente transition per ora: montiamo direttamente la pagina -->
      <router-view />
    </main>

    <!-- FOOTER MOBILE -->
    <footer class="app-footer d-lg-none">
      <Footer />
    </footer>

    <!-- Modale globale nuovo movimento (se lo usi così) -->
    <NuovoMovimento />
  </div>
</template>

<script setup>
import Header from '@/components/Layout/Header.vue'
import Footer from '@/components/Layout/Footer.vue'
import NuovoMovimento from '@/components/Movimenti/NuovoMovimento.vue'
</script>

<style>
/* RESET GLOBALE */
* {
  box-sizing: border-box;
}

/* il contenitore root che crea Vue */
html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f8fafc;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont,
    'Segoe UI', sans-serif;
}

/* LAYOUT A COLONNA: Header -> Content -> Footer */
#app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

/* Header Desktop */
.app-header {
  height: 70px;
  flex-shrink: 0;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  z-index: 50;
}

/* Header Mobile */
.app-header-mobile {
  height: 50px;
  flex-shrink: 0;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  z-index: 50;
}

/* Area Contenuto (riempie tutto) */
.app-content {
  flex: 1 1 auto;
  min-height: 0;          /* importante per far funzionare bene lo scroll interno delle pagine */
  min-width: 0;
  position: relative;
  overflow: hidden;       /* lo scroll lo fanno le pagine interne (page-fixed-layout) */
  background: #f4f7fb;    /* niente nero! */
}

/* Footer Mobile */
.app-footer {
  height: 70px;
  flex-shrink: 0;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  z-index: 50;
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
