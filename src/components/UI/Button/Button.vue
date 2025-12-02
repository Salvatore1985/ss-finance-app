<template>
  <button
    :type="nativeType"
    :class="['base-btn', variantClass, { 'is-rounded': rounded, 'is-circle': circle, 'is-block': block }]"
    :disabled="disabled || loading"
    @click="$emit('click')"
  >
    <!-- Mostra Spinner se sta caricando -->
    <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>

    <!-- Mostra Icona se c'è e non sta caricando -->
    <i v-if="icon && !loading" :class="['bi', icon, { 'me-2': text }]"></i>

    <!-- Mostra Testo (o contenuto dello slot) -->
    <span v-if="text && !loading">{{ text }}</span>
    <slot v-if="!text && !loading"></slot>
  </button>
</template>

<script>
export default {
  name: "BaseButton",
  props: {
    text: { type: String, default: "" },      // Testo del bottone
    icon: { type: String, default: "" },      // Classe icona (es. 'bi-plus')
    variant: { type: String, default: "primary" }, // primary, success, danger, nav, ghost
    nativeType: { type: String, default: "button" }, // submit, button
    loading: { type: Boolean, default: false }, // Mostra spinner
    disabled: { type: Boolean, default: false },
    rounded: { type: Boolean, default: false }, // Bordi arrotondati (pillola)
    circle: { type: Boolean, default: false },  // Cerchio perfetto (per FAB o icone)
    block: { type: Boolean, default: false },   // Larghezza 100%
  },
  computed: {
    variantClass() {
      return `btn-${this.variant}`;
    },
  },
};
</script>

<style scoped lang="scss">
/* Stile Base Condiviso */
.base-btn {
  border: none;
  font-weight: 600;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-family: inherit;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  /* Modificatori forma */
  &.is-rounded { border-radius: 50px; }
  &.is-block { width: 100%; }
  &.is-circle {
    padding: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }
}

/* --- VARIANTI COLORI (I Gradienti che volevi) --- */

/* 1. Primary (Blu/Indigo - Per azioni principali come Salva) */
.btn-primary {
  color: white;
  background-image: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  &:hover:not(:disabled) {
    box-shadow: 0 6px 15px rgba(99, 102, 241, 0.5);
  }
}

/* 2. Success (Verde/Teal - Per Entrate o Import) */
.btn-success {
  color: white;
  background-image: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* 3. Danger (Rosso - Per Uscite o Elimina) */
.btn-danger {
  color: white;
  background-image: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  box-shadow: 0 4px 12px rgba(244, 63, 94, 0.3);
}

/* 4. Warning (Giallo/Arancio - Per Da Classificare) */
.btn-warning {
  color: #1e293b;
  background-image: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
}

/* 5. Ghost/Nav (Trasparente - Per menu o icone tabella) */
.btn-ghost {
  background: transparent;
  color: #64748b;
  box-shadow: none;
  padding: 0.5rem; /* Più piccolo */
  border: 1px solid #e2e8f0;

  &:hover:not(:disabled) {
    background: #f1f5f9;
    color: #6366f1; /* Diventa blu hover */
    border-color: #cbd5e1;
  }
}

/* 6. FAB (Il bottone galleggiante in basso) */
.btn-fab {
  color: white;
  background-image: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
  box-shadow: 0 8px 15px rgba(99, 102, 241, 0.4);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  font-size: 1.5rem;
}
</style>