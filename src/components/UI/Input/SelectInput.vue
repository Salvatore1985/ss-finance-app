<template>
  <div class="input-wrapper mb-3">
    
    <!-- LABEL (Opzionale) -->
    <label 
      v-if="label" 
      :for="id" 
      class="form-label small fw-bold text-muted text-uppercase ls-1"
    >
      {{ label }}
    </label>

    <!-- CONTAINER INPUT GROUP -->
    <div class="input-group shadow-sm" :class="{ 'has-error': error }">
      
      <!-- Icona a sinistra -->
      <span 
        v-if="icon" 
        class="input-group-text bg-white text-muted border-end-0 ps-3"
      >
        <i :class="['bi', icon]"></i>
      </span>

      <!-- SELECT NATIVA -->
      <select
        :id="id"
        :value="modelValue"
        class="form-select py-3 fw-bold text-dark"
        :class="{ 'border-start-0': icon, 'is-invalid': error, 'text-muted': !modelValue }"
        :disabled="disabled"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <!-- Placeholder (Opzione vuota disabilitata) -->
        <option value="" disabled selected>{{ placeholder || 'Seleziona...' }}</option>
        
        <!-- Loop delle opzioni -->
        <option 
          v-for="(opt, index) in options" 
          :key="index" 
          :value="getValue(opt)"
        >
          {{ getLabel(opt) }}
        </option>
      </select>

    </div>

    <!-- MESSAGGIO ERRORE -->
    <div v-if="error" class="text-danger small fw-bold mt-1 ps-1">
      <i class="bi bi-exclamation-circle me-1"></i> {{ error }}
    </div>

  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: [String, Number],
  label: String,
  options: { type: Array, default: () => [] }, // La lista dati
  placeholder: String,
  icon: String,
  error: String,
  id: String,
  disabled: Boolean,
  
  // Opzionale: se passi oggetti, dimmi quali campi usare
  optionLabel: { type: String, default: 'label' }, 
  optionValue: { type: String, default: 'value' } 
});

defineEmits(['update:modelValue']);

// Helper per gestire sia array di stringhe ["A", "B"] che oggetti [{id:1, name:"A"}]
const getValue = (opt) => {
  return (typeof opt === 'object') ? opt[props.optionValue] : opt;
};

const getLabel = (opt) => {
  return (typeof opt === 'object') ? opt[props.optionLabel] : opt;
};
</script>

<style scoped lang="scss">
/* Stessi stili precisi dell'Input per coerenza visiva */
.form-select {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  
  &.border-start-0 {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  &:focus {
    box-shadow: none;
    border-color: #6366f1;
  }
}

.input-group-text {
  border: 1px solid #e2e8f0;
  border-right: none;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

.input-group:focus-within .input-group-text,
.input-group:focus-within .form-select {
  border-color: #6366f1;
}

.has-error {
  .form-select, .input-group-text {
    border-color: #f43f5e;
  }
  .input-group-text {
    color: #f43f5e !important;
  }
}

.ls-1 { letter-spacing: 0.5px; }
</style>