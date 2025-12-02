<template>
  <div class="input-wrapper mb-3">
    
    <!-- 1. LABEL (Opzionale) -->
    <label 
      v-if="label" 
      :for="id" 
      class="form-label small fw-bold text-muted text-uppercase ls-1"
    >
      {{ label }}
    </label>

    <!-- 2. CONTAINER INPUT (Gestisce l'icona e l'input) -->
    <div class="input-group shadow-sm" :class="{ 'has-error': error }">
      
      <!-- Icona (Se presente) -->
      <span 
        v-if="icon" 
        class="input-group-text bg-white text-muted border-end-0 ps-3"
      >
        <i :class="['bi', icon]"></i>
      </span>

      <!-- Input Campo -->
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :step="type === 'number' ? '0.01' : null"
        class="form-control py-3"
        :class="{ 'border-start-0': icon, 'is-invalid': error }"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur')"
      />
      
      <!-- Slot per appendere cose a destra (es. "€" o bottone) -->
      <slot name="append"></slot>
    </div>

    <!-- 3. MESSAGGIO ERRORE -->
    <div v-if="error" class="text-danger small fw-bold mt-1 ps-1">
      <i class="bi bi-exclamation-circle me-1"></i> {{ error }}
    </div>

  </div>
</template>

<script setup>
defineProps({
  modelValue: [String, Number], // Il valore (v-model)
  label: String,                // Etichetta sopra (es. "Importo")
  type: { type: String, default: 'text' }, // text, number, date, password
  placeholder: String,
  icon: String,                 // Classe icona (es. bi-wallet)
  error: String,                // Messaggio errore rosso
  id: String,                   // ID per accessibilità
  disabled: Boolean
});

defineEmits(['update:modelValue', 'blur']);
</script>

<style scoped lang="scss">
/* Stile personalizzato per l'input */
.form-control {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-weight: 600;
  color: #1e293b;
  transition: all 0.2s ease;

  /* Rimuove bordo a sinistra se c'è l'icona */
  &.border-start-0 {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  &:focus {
    box-shadow: none;
    border-color: #6366f1; /* Colore Primary */
  }

  &::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }
}

/* Stile dell'icona a sinistra */
.input-group-text {
  border: 1px solid #e2e8f0;
  border-right: none;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

/* Focus stat su tutto il gruppo */
.input-group:focus-within .input-group-text,
.input-group:focus-within .form-control {
  border-color: #6366f1;
}

/* Stato di errore */
.has-error {
  .form-control, .input-group-text {
    border-color: #f43f5e; /* Rosso */
  }
  .input-group-text {
    color: #f43f5e !important;
  }
}

/* Spaziatura lettere label */
.ls-1 { letter-spacing: 0.5px; }
</style>