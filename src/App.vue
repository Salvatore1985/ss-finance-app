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
          style="width:32px;height:32px;"
        >
          S
        </div>
      </div>
    </header>

    <!-- CONTENUTO CENTRALE (senza scroll, passa 100% spazio alla pagina) -->
    <div class="app-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>

    <!-- FOOTER MOBILE -->
    <footer class="app-footer d-lg-none">
      <Footer />
    </footer>

    <!-- MODALE GLOBALE -->
    <NuovoMovimento />
  </div>
</template>

<script setup>
import Header from '@/components/Layout/Header.vue'
import Footer from '@/components/Layout/Footer.vue'
import NuovoMovimento from '@/components/Movimenti/NuovoMovimento.vue'
</script>

<style>
/* RESET GLOBALE / FULLSCREEN WEBAPP */
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden; /* ❌ niente scroll del browser */
  background-color: #f8fafc;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

/* LAYOUT A COLONNA: Header -> Content -> Footer */
#app-shell {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh; /* riempie tutto lo schermo */
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

/* AREA CONTENUTO
   - prende tutto lo spazio tra header e footer
   - niente scroll
   - il figlio (pagina) si stira a 100% */
.app-content {
  flex: 1 1 auto;
  position: relative;
  overflow: hidden;   /* niente scroll globale */
  display: flex;      /* permette al figlio di riempire l'area */
  min-height: 0;
}

/* Il componente caricato dal router-view riempie l'area centrale */
.app-content > * {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
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

/* Animazione fade tra le pagine */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
