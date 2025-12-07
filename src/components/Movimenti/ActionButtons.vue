<template>
  <!-- Layout orizzontale su mobile, riga sotto il contenuto -->
  <div class="mov-actions d-flex flex-row gap-2 justify-content-center w-100 mt-2">
    <!-- Dettaglio (Occhio) -->
    <button
      @click="$emit('view')"
      class="action-btn action-btn-view"
      title="Dettaglio"
    >
      <i class="bi bi-eye"></i>
      <span class="d-none d-md-inline ms-1">Dettaglio</span>
    </button>

    <!-- Modifica (Matita) -->
    <button
      @click="$emit('edit')"
      class="action-btn action-btn-edit"
      title="Modifica"
    >
      <i class="bi bi-pencil"></i>
      <span class="d-none d-md-inline ms-1">Modifica</span>
    </button>

    <!-- Dividi (Split) -->
    <button
      @click="$emit('split')"
      class="action-btn action-btn-split"
      title="Dividi"
    >
      <i class="bi bi-scissors"></i>
      <span class="d-none d-md-inline ms-1">Dividi</span>
    </button>
  </div>
</template>

<script setup>
// Eventi che esponiamo al genitore (MovimentiView)
defineEmits(["view", "edit", "split"]);
</script>

<style scoped>
.mov-actions {
  border-top: 1px solid #e9ecef;
  padding-top: 12px;
}

.action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 42px; /* Touch-friendly */
}

.action-btn i {
  font-size: 1.1rem;
}

/* Hover states */
.action-btn-view {
  color: #0d6efd;
}

.action-btn-view:hover {
  background: #e7f1ff;
  border-color: #0d6efd;
}

.action-btn-edit {
  color: #6c757d;
}

.action-btn-edit:hover {
  background: #f8f9fa;
  border-color: #6c757d;
}

.action-btn-split {
  color: #ffc107;
}

.action-btn-split:hover {
  background: #fff3cd;
  border-color: #ffc107;
}

.action-btn:active {
  transform: scale(0.96);
}

@media (min-width: 768px) {
  .action-btn {
    flex: 0 0 auto;
    min-width: 100px;
  }
}
</style>
