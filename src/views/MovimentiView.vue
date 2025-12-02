<template>
  <!-- CONTENITORE: Altezza 100% del padre (main-area) -->
  <div class="page-fixed-layout">
    
    <!-- A. INTESTAZIONE (NON SCORRE) -->
    <header class="page-header px-4 py-4 bg-white border-bottom">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h3 class="fw-bold text-dark m-0">Movimenti</h3>
          <p class="text-muted small m-0">Lista completa transazioni</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-light border fw-bold shadow-sm">Filtra</button>
          <button class="btn btn-primary fw-bold shadow-sm" data-bs-toggle="modal" data-bs-target="#modalNuovo">
            <i class="bi bi-plus-lg me-1"></i> Nuovo
          </button>
        </div>
      </div>
    </header>

    <!-- B. LISTA (SCORRE SOLO QUI) -->
    <div class="page-content-scroll px-4 py-3">
      
      <!-- Esempio Lista -->
      <div v-for="n in 15" :key="n" class="card border-0 shadow-sm mb-2 p-3">
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-3">
            <div class="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center" style="width:45px;height:45px;">
              <i class="bi bi-bag"></i>
            </div>
            <div>
              <div class="fw-bold text-dark">Spesa Supermercato {{ n }}</div>
              <div class="text-muted small">Categoria • Conto Intesa</div>
            </div>
          </div>
          <div class="fw-bold fs-5">- 45,{{ n }}0 €</div>
        </div>
      </div>

      <!-- Spazio finale -->
      <div style="height: 50px;"></div>

    </div>

  </div>
</template>

<style scoped>
/* 1. STRUTTURA VERTICALE */
.page-fixed-layout {
  display: flex;
  flex-direction: column;
  height: 100%; /* Occupa tutto lo spazio disponibile */
  width: 100%;
}

/* 2. TESTA FISSA */
.page-header {
  flex-shrink: 0; /* Non si schiaccia */
  z-index: 10;
}

/* 3. CORPO SCORREVOLE */
.page-content-scroll {
  flex-grow: 1; /* Occupa tutto lo spazio rimanente */
  overflow-y: auto; /* ABILITA LO SCROLL QUI */
  overflow-x: hidden;
  
  /* Scrollbar carina */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

/* Webkit Scrollbar */
.page-content-scroll::-webkit-scrollbar { width: 6px; }
.page-content-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
</style>