<template>
  <!-- Container flessibile per allineare i bottoni -->
  <div class="d-flex gap-2 justify-content-end w-100 w-md-auto mt-2 mt-md-0">
    
    <!-- Tasto Dettaglio (Occhio) -->
    <Button
      icon="bi-eye"
      class="bg-white border text-primary shadow-sm"
      title="Dettaglio"
      @click="$emit('view')"
    />

    <!-- Tasto Modifica (Matita) -->
    <Button
      icon="bi-pencil"
      class="bg-white border text-dark shadow-sm"
      title="Modifica"
      @click="$emit('edit')"
    />

    <!-- Tasto Split (Forbici) -->
    <Button
      icon="bi-scissors"
      class="bg-white border text-dark shadow-sm"
      title="Dividi"
      @click="$emit('split')"
    />
    
  </div>
</template>

<script setup>
// Importiamo il bottone dalla cartella UI (aggiusta il percorso se serve)
import Button from '@/components/UI/Button/Button.vue';

// Definiamo gli eventi che questo componente spara al genitore
defineEmits(['view', 'edit', 'split']);
</script>
