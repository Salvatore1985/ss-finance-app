<script setup>
import { computed } from 'vue'

const props = defineProps({
  movimento: { type: Object, required: true },
  expanded: { type: Boolean, default: false }, // Default chiuso
  showTags: { type: Boolean, default: false },
  showAttachments: { type: Boolean, default: false },
  // Opzioni data/importo (lasciate per compatibilità ma scavalcate dalla logica interna per sicurezza)
  dateVariant: { type: String, default: 'short' },
  amountMode: { type: String, default: 'sign-by-type' } 
})

const emit = defineEmits(['toggle'])

// Colori sfondo icona
const iconWrapperClass = computed(() =>
  props.movimento?.tipo === 'Entrata'
    ? 'bg-success bg-opacity-10 text-success'
    : 'bg-primary bg-opacity-10 text-primary'
)

// Icona (Salvadanaio o Borsa)
const iconClass = computed(() =>
  props.movimento?.tipo === 'Entrata'
    ? 'bi-piggy-bank-fill'
    : 'bi-bag-fill'
)

// Colore Importo
const amountClass = computed(() =>
  props.movimento?.tipo === 'Uscita' ? 'text-dark' : 'text-success'
)

// CALCOLO IMPORTO CON SEGNO
const formattedAmount = computed(() => {
  const value = parseFloat(props.movimento?.importo || 0)
  // Forza il segno in base al tipo (risolve il problema del meno mancante)
  const sign = props.movimento?.tipo === 'Uscita' ? '-' : '+'
  return `${sign} ${Math.abs(value).toFixed(2)}`
})

// FORMATTAZIONE DATA
const formattedDate = computed(() => {
  if (!props.movimento?.data) return ''
  // Formato: "18 nov" o "mar 18 novembre"
  const options = props.dateVariant === 'long'
    ? { weekday: 'short', day: '2-digit', month: 'long' }
    : { day: '2-digit', month: 'short' }
  return new Date(props.movimento.data).toLocaleDateString('it-IT', options)
})
</script>

<template>
  <div class="d-flex align-items-start gap-3 w-100">
    
    <!-- 1. ICONA TONDA (SX) -->
    <div class="movement-icon shadow-sm flex-shrink-0" :class="iconWrapperClass">
      <i class="bi fs-5" :class="iconClass"></i>
    </div>

    <!-- 2. CORPO CENTRALE -->
    <div class="flex-grow-1 min-width-0">
      
      <div class="d-flex justify-content-between align-items-start">
        
        <!-- Descrizione e Data -->
        <div class="me-2">
          <div
            class="fw-bold text-dark text-break"
            :class="{ 'text-truncate': !expanded, 'cursor-pointer': !!$attrs.onToggle }"
            @click="emit('toggle')"
            style="max-width: 100%;"
          >
            {{ movimento.descrizione }}
          </div>
          
          <!-- Data piccola sotto la descrizione -->
          <div class="small text-muted mt-1 d-flex align-items-center">
            <i class="bi bi-calendar-event me-1" style="font-size: 0.7rem;"></i>
            {{ formattedDate }}
          </div>
        </div>

        <!-- Importo (DX Mobile) -->
        <div class="text-end">
          <div class="fw-bold text-nowrap fs-6" :class="amountClass">
            {{ formattedAmount }} €
          </div>
        </div>
      </div>

      <!-- Badge Categoria e Conto -->
      <div class="d-flex align-items-center flex-wrap gap-2 mt-2">
        <span class="badge badge-soft border">
          <i class="bi bi-bank2 me-1 text-muted"></i> {{ movimento.conto }}
        </span>
        <span class="badge badge-soft border">
          {{ movimento.categoria }}
        </span>
        
        <!-- Icone Extra (Note/Allegati) -->
        <i v-if="showAttachments && movimento.note" class="bi bi-sticky-fill text-warning ms-1" title="Note"></i>
        <i v-if="showAttachments && movimento.file_url" class="bi bi-paperclip text-secondary ms-1" title="Allegato"></i>
      </div>

      <!-- Tag (Pillole Gialle) -->
      <div v-if="showTags && movimento.tags?.length" class="d-flex flex-wrap gap-1 mt-2">
        <span v-for="tag in movimento.tags" :key="tag" class="badge badge-tag text-dark border">
          <i class="bi bi-tag-fill me-1 opacity-50"></i> {{ tag }}
        </span>
      </div>
    </div>

    <!-- 3. SLOT AZIONI (Bottoni laterali) -->
    <div v-if="$slots.actions" class="d-flex align-items-center align-self-center ms-2">
      <slot name="actions" />
    </div>

  </div>
</template>

<style scoped>
.movement-icon {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Badge Grigio Chiaro (Conti/Cat) */
.badge-soft {
  background-color: #f8fafc;
  color: #475569;
  border-color: #e2e8f0 !important;
  font-weight: 500;
  font-size: 0.75rem;
}

/* Badge Giallo (Tag) - Come da tua foto */
.badge-tag {
  background-color: #fef9c3; /* Giallo chiaro */
  border-color: #fde047 !important; /* Bordo giallo */
  color: #854d0e !important; /* Testo marrone */
  font-weight: 600;
  font-size: 0.7rem;
  border-radius: 6px;
  padding: 4px 8px;
}

.cursor-pointer {
  cursor: pointer;
}

.min-width-0 {
  min-width: 0; /* Fondamentale per far funzionare text-truncate in flexbox */
}
</style>