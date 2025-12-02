<template>
  <div class="p-4">
    
    <!-- Barra Filtri Finta -->
    <div class="skeleton-box p-3 mb-4 d-flex gap-3">
      <div class="bg-light rounded" style="width: 150px; height: 38px;"></div>
      <div class="bg-light rounded" style="width: 150px; height: 38px;"></div>
      <div class="bg-primary opacity-25 rounded ms-auto" style="width: 100px; height: 38px;"></div>
    </div>

    <!-- Griglia Analisi -->
    <div class="row g-3 mb-4">
      <!-- Grafico Principale -->
      <div class="col-md-8">
        <div class="skeleton-box d-flex align-items-center justify-content-center text-muted fw-bold" style="height: 350px;">
          GRAFICO ANDAMENTO ANNUALE
        </div>
      </div>
      <!-- Statistiche Laterali -->
      <div class="col-md-4">
        <div class="skeleton-box d-flex flex-column gap-3 p-3" style="height: 350px;">
          <div class="bg-light rounded w-100 flex-grow-1"></div>
          <div class="bg-light rounded w-100 flex-grow-1"></div>
          <div class="bg-light rounded w-100 flex-grow-1"></div>
        </div>
      </div>
    </div>

    <!-- Tabella Categorie -->
    <div class="skeleton-box p-4">
      <div class="bg-light mb-4 rounded" style="width: 200px; height: 20px;"></div>
      <!-- Righe finte -->
      <div v-for="n in 4" :key="n" class="d-flex justify-content-between align-items-center border-bottom py-3">
        <div class="d-flex align-items-center gap-3">
          <div class="bg-light rounded-circle" style="width: 30px; height: 30px;"></div>
          <div class="bg-light rounded" style="width: 150px; height: 15px;"></div>
        </div>
        <div class="bg-light rounded" style="width: 80px; height: 15px;"></div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.skeleton-box {
  background-color: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}
</style>