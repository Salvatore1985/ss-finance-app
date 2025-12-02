<template>
  <div 
    class="base-card" 
    :class="[variantClass, { 'has-hover': hoverable }]"
  >
    
    <!-- 1. HEADER (Opzionale: se c'è un titolo o uno slot header) -->
    <div 
      v-if="title || $slots.header" 
      class="card-header d-flex justify-content-between align-items-center mb-3"
    >
      <!-- Se passi solo il testo -->
      <div v-if="title">
        <h6 class="fw-bold mb-0 text-uppercase ls-1" :class="textClass">{{ title }}</h6>
        <small v-if="subtitle" class="opacity-75" :class="textClass">{{ subtitle }}</small>
      </div>

      <!-- Se vuoi mettere bottoni o icone a destra -->
      <div class="card-actions">
        <slot name="header"></slot>
      </div>
    </div>

    <!-- 2. BODY (Il contenuto principale) -->
    <div class="card-body" :class="{ 'p-0': noPadding }">
      <slot></slot>
    </div>

    <!-- 3. FOOTER (Opzionale) -->
    <div v-if="$slots.footer" class="card-footer mt-3 pt-3 border-top">
      <slot name="footer"></slot>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: String,
  subtitle: String,
  variant: { type: String, default: 'white' }, // white, primary, warning, danger
  noPadding: Boolean, // Utile se dentro ci metti una tabella che deve toccare i bordi
  hoverable: Boolean  // Se true, si alza quando ci passi sopra col mouse
});

// Calcola la classe CSS in base alla variante
const variantClass = computed(() => `card-${props.variant}`);

// Calcola il colore del testo (Bianco se lo sfondo è colorato, Scuro se è bianco)
const textClass = computed(() => {
  return props.variant === 'white' ? 'text-muted' : 'text-white';
});
</script>


<style scoped lang="scss">
.base-card {
  border-radius: 20px;
  border: 1px solid #e2e8f0; /* Bordo grigio chiaro */
  background-color: #ffffff; /* Bianco */
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03); /* Ombra leggerissima */
  padding: 1.5rem;
  transition: transform 0.2s;
  
  /* Assicuriamoci che il testo sia scuro */
  color: #1e293b; 

  &.has-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.06);
  }
}

/* Card Saldo (Quella viola deve rimanere colorata) */
.card-primary {
  background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
  color: white !important; /* Importante per forzare il testo bianco qui */
  border: none;
}

/* Card White (Standard) */
.card-white {
  background-color: #ffffff;
  color: #1e293b;
}
</style>


