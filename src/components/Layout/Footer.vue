<template>
  <!-- La barra è visibile solo su mobile (d-lg-none) -->
  <div class="fixed-bottom d-lg-none bg-white border-top pb-safe">
    <div class="d-flex justify-content-around align-items-center px-2 py-2">
      
      <!-- Link Sinistri -->
      <router-link to="/" class="nav-item" active-class="active">
        <i class="bi bi-grid-1x2-fill"></i>
        <span>Home</span>
      </router-link>

      <router-link to="/movimenti" class="nav-item" active-class="active">
        <i class="bi bi-receipt"></i>
        <span>Movim.</span>
      </router-link>

      <!-- FAB CENTRALE (Apre il Modale NuovoMovimento) -->
      <div class="fab-container">
        <!-- Usiamo il nostro componente Button in versione FAB -->
        <Button 
          icon="bi-plus-lg" 
          variant="fab" 
          circle 
          data-bs-toggle="modal" 
          data-bs-target="#modalNuovo"
        />
      </div>

      <!-- Link Destri -->
      <router-link to="/storico" class="nav-item" active-class="active">
        <i class="bi bi-search"></i>
        <span>Storico</span>
      </router-link>

      <router-link to="/config" class="nav-item" active-class="active">
        <i class="bi bi-gear-fill"></i>
        <span>Config</span>
      </router-link>

    </div>
  </div>
</template>

<script setup>
import Button from '../UI/Button/Button.vue'
</script>

<style scoped>
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 8px;
  border-radius: 12px;
  transition: color 0.2s;
  width: 60px;
}

.nav-item i {
  font-size: 1.4rem;
  margin-bottom: 2px;
}

.nav-item.active {
  color: #6366f1; /* Primary Color */
  background-color: #e0e7ff;
}

.fab-container {
  transform: translateY(-20px); /* Solleva il bottone */
}

/* Gestione safe-area per iPhone recenti */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 10px);
}
</style>