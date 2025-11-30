<template>
  <div class="d-flex gap-2 justify-content-end w-100 w-md-auto mt-2 mt-md-0">
    <button
      @click="$emit('view')"
      class="btn btn-white border shadow-sm btn-action text-primary"
      title="Dettaglio"
      type="button"
    >
      <i class="bi bi-eye"></i>
    </button>

    <button
      @click="$emit('edit')"
      class="btn btn-white border shadow-sm btn-action text-dark"
      title="Modifica"
      type="button"
    >
      <i class="bi bi-pencil"></i>
    </button>

    <button
      @click="$emit('split')"
      class="btn btn-white border shadow-sm btn-action text-dark"
      title="Dividi"
      type="button"
    >
      <i class="bi bi-scissors"></i>
    </button>
  </div>
</template>

<script setup>
defineEmits(['view', 'edit', 'split'])
</script>

<style scoped>
.btn-action {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition: all 0.2s;
  background-color: #fff;
}
.btn-action:hover {
  background-color: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}
.btn-white {
  background-color: white;
}
</style>
