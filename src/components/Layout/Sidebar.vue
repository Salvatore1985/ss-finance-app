<template>
  <div class="d-flex flex-column h-100 p-4">
    
    <!-- Logo -->
    <div class="mb-5 px-2">
      <h3 class="fw-bold">L</h3>
    </div>

    <!-- Label -->
    <div class="text-uppercase text-muted small fw-bold mb-3 px-2" style="font-size: 0.7rem;">Menu</div>

    <!-- LINKS DI NAVIGAZIONE FUNZIONANTI -->
    <nav class="nav flex-column gap-2 mb-auto">
      
      <router-link to="/" class="nav-item" active-class="active">
        <i class="bi bi-grid-fill me-3"></i> DASHBOARD
      </router-link>

      <router-link to="/movimenti" class="nav-item" active-class="active">
        <i class="bi bi-wallet-fill me-3"></i> MOVIMENTI
      </router-link>

      <router-link to="/storico" class="nav-item" active-class="active">
        <i class="bi bi-graph-up me-3"></i> ANALISI
      </router-link>

      <router-link to="/config" class="nav-item" active-class="active">
        <i class="bi bi-gear-fill me-3"></i> CONFIG
      </router-link>

    </nav>

    <!-- Promo Box (Rimane uguale) -->
    <div class="promo-box mt-4 p-4 text-center text-white rounded-3">
      <h5 class="fw-bold mb-1">PROMO</h5>
      <small class="d-block mb-3 opacity-75">Lorem ipsum dolor</small>
      <button class="btn btn-light w-100 fw-bold text-primary btn-sm rounded-pill">Button</button>
    </div>

  </div>
</template>

<style scoped>
/* Stile base del link (non attivo) */
.nav-item {
  padding: 12px 15px;
  color: #9ca3af; /* Grigio */
  font-weight: 600;
  font-size: 0.8rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  text-decoration: none; /* Toglie la sottolineatura dei link */
  transition: all 0.2s ease;
  border-left: 3px solid transparent; /* Predisposizione per il bordo colorato */
}

.nav-item:hover {
  background-color: #f9fafb;
  color: #6366f1;
}

/* STILE ATTIVO (Quando sei sulla pagina giusta) */
.nav-item.active {
  background: linear-gradient(90deg, rgba(99,102,241,0.1) 0%, rgba(255,255,255,0) 100%);
  color: #6366f1; /* Viola */
  border-left: 3px solid #6366f1;
}

.promo-box {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3);
}
</style>