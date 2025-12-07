<template>
  <!-- Container flessibile per allineare i bottoni -->
  <div
    class="mov-actions d-flex flex-column flex-md-row gap-2 justify-content-end w-100 w-md-auto mt-2 mt-md-0"
  >
    <!-- Dettaglio (Occhio) -->
    <Button
      icon="bi-eye"
      class="bg-white border text-primary shadow-sm"
      title="Dettaglio"
      @click="$emit('view')"
    />

    <!-- Modifica (Matita) -->
    <Button
      icon="bi-pencil"
      class="bg-white border text-dark shadow-sm"
      title="Modifica"
      @click="$emit('edit')"
    />

    <!-- Dividi (Split) -->
    <Button
      icon="bi-scissors"
      class="bg-white border text-warning shadow-sm"
      title="Dividi"
      @click="$emit('split')"
    />
  </div>
</template>

<script setup>
// Bottone UI riutilizzabile
import Button from "@/components/UI/Button/Button.vue";

// Eventi che esponiamo al genitore (MovimentiView)
defineEmits(["view", "edit", "split"]);
</script>

<style scoped>
/* Contenitore: su mobile in colonna, da md in poi in riga (gestito dalle classi Bootstrap) */
.mov-actions {
  align-items: flex-end;
}

/* Rimpiccioliamo i bottoni dentro le card movimenti */
.mov-actions :deep(.base-btn) {
  padding: 0.25rem 0.4rem; /* meno padding */
  min-width: 40px;
  height: 40px;
  border-radius: 12px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  font-size: 0.9rem;
}

/* Icone leggermente più grandi per restare leggibili */
.mov-actions :deep(.base-btn i.bi) {
  font-size: 1.1rem;
}

/* Da tablet in su li riallineiamo al centro della card */
@media (min-width: 768px) {
  .mov-actions {
    align-items: center;
  }
}
</style>
