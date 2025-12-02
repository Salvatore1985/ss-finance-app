<template>
  <div class="p-4" style="max-width: 1000px; margin: 0 auto;">
    
    <!-- Titolo -->
    <div class="mb-4 bg-light rounded" style="width: 200px; height: 30px;"></div>

    <!-- Sezione 1: Profilo -->
    <div class="skeleton-box p-4 mb-4 d-flex align-items-center gap-4">
      <div class="bg-light rounded-circle" style="width: 80px; height: 80px;"></div>
      <div class="flex-grow-1">
        <div class="bg-light rounded mb-2" style="width: 200px; height: 20px;"></div>
        <div class="bg-light rounded" style="width: 150px; height: 15px;"></div>
      </div>
      <div class="bg-primary opacity-25 rounded" style="width: 100px; height: 40px;"></div>
    </div>

    <!-- Sezione 2: Impostazioni -->
    <div class="row g-4">
      <div class="col-md-6">
        <div class="skeleton-box p-4" style="height: 250px;">
          <div class="text-muted fw-bold small mb-3">CATEGORIE</div>
          <div class="d-flex flex-wrap gap-2">
            <div v-for="n in 6" :key="n" class="bg-light rounded-pill" style="width: 80px; height: 30px;"></div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="skeleton-box p-4" style="height: 250px;">
          <div class="text-muted fw-bold small mb-3">CONTI BANCARI</div>
          <div class="d-flex flex-column gap-3">
            <div class="bg-light rounded w-100" style="height: 40px;"></div>
            <div class="bg-light rounded w-100" style="height: 40px;"></div>
          </div>
        </div>
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