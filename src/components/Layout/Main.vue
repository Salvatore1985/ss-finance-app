<template>
  <!-- Questa è l'area centrale che SCORRE -->
  <main class="scroll-area">
    <div class="container py-3">
      
      <!-- Qui dentro verranno caricate le pagine (Dashboard, Movimenti, ecc.) -->
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>

      <!-- Spazio extra per non finire sotto il footer mobile -->
      <div class="spacer-bottom d-lg-none"></div>
      
    </div>
  </main>
</template>

<style scoped>
.scroll-area {
  flex: 1; /* Occupa tutto lo spazio disponibile tra Header e Footer */
  min-height: 0; /* Fondamentale per far funzionare lo scroll */
  overflow-y: auto; /* Abilita lo scroll */
  overflow-x: hidden;
  position: relative;
  
  /* Scrollbar carina */
  scrollbar-width: thin;
}

.spacer-bottom {
  height: 90px;
}

/* Animazioni cambio pagina */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>