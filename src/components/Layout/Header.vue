<template>
  <div class="d-flex align-items-center justify-content-between h-100 px-4">
    
    <!-- Icona Sinistra -->
    <div class="text-primary fs-4">
      <i class="bi bi-wallet2"></i>
    </div>

    <!-- Menu Centrale a Pillola (FUNZIONANTE) -->
    <div class="d-flex bg-white gap-2">
      <!-- Usiamo router-link ma con le classi dei bottoni -->
      
      <router-link to="/" class="btn btn-link text-decoration-none fw-bold" active-class="active-pill">
        Dashboard
      </router-link>

      <router-link to="/movimenti" class="btn btn-link text-decoration-none fw-bold" active-class="active-pill">
        Movimenti
      </router-link>

      <router-link to="/storico" class="btn btn-link text-decoration-none fw-bold" active-class="active-pill">
        Storico
      </router-link>

      <router-link to="/config" class="btn btn-link text-decoration-none fw-bold" active-class="active-pill">
        Config
      </router-link>
    </div>

    <!-- Utente Destra -->
    <div class="d-flex align-items-center gap-2 bg-light px-3 py-2 rounded-3 border">
      <i class="bi bi-person-circle text-muted fs-5"></i>
      <span class="text-muted small">salvatorecascone8@...</span>
    </div>

  </div>
</template>

<style scoped>
/* Stile base dei link nell'header */
.btn-link {
  color: #64748b !important; /* Grigio scuro */
  border-radius: 50px;
  padding: 8px 24px;
}

.btn-link:hover {
  background-color: #f1f5f9;
}

/* Stile quando il link è ATTIVO (Pillola Blu) */
.active-pill {
  background-color: #6366f1 !important; /* Primary */
  color: white !important;
  box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);
}
</style>