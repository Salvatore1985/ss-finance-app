<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  movimento: { type: Object, required: true },
  expanded: { type: Boolean, default: false }, // usato da Storico se serve
  showTags: { type: Boolean, default: false },
  showAttachments: { type: Boolean, default: false },
  dateVariant: { type: String, default: 'short' },
  amountMode: { type: String, default: 'sign-by-type' }
})

const emit = defineEmits(['toggle'])

// --- STATO LOCALE PER LA DESCRIZIONE (chiusa/aperta) ---
const isExpanded = ref(props.expanded)

watch(
  () => props.expanded,
  (v) => { isExpanded.value = v }
)

const toggleDescription = () => {
  isExpanded.value = !isExpanded.value
  emit('toggle')
}

// --- ICONA TONDA ---
const iconWrapperClass = computed(() => {
  if (props.movimento?.tipo === 'Entrata') {
    return 'bg-success bg-opacity-10 text-success'
  }
  if (props.movimento?.tipo === 'Uscita') {
    return 'bg-primary bg-opacity-10 text-primary'
  }
  return 'bg-light text-muted'
})

const iconClass = computed(() =>
  props.movimento?.tipo === 'Entrata'
    ? 'bi-piggy-bank-fill'
    : 'bi-bag-fill'
)

// --- IMPORTO ---
const amountClass = computed(() =>
  props.movimento?.tipo === 'Uscita' ? 'text-dark' : 'text-success'
)

const formattedAmount = computed(() => {
  const value = parseFloat(props.movimento?.importo || 0)

  if (props.amountMode === 'raw') {
    return value.toFixed(2)
  }

  const sign = props.movimento?.tipo === 'Uscita' ? '-' : '+'
  return `${sign} ${Math.abs(value).toFixed(2)}`
})

// --- DATA ---
const formattedDate = computed(() => {
  const raw =
    props.movimento?.data ||
    props.movimento?.data_movimento ||
    props.movimento?.created_at

  if (!raw) return ''

  const d = new Date(raw)

  if (props.dateVariant === 'long') {
    return d.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: 'long'
    })
  }

  return d.toLocaleDateString('it-IT')
})
</script>

<template>
  <div class="movimento-card w-100">
    <div class="row-main d-flex align-items-start w-100">
      <!-- DATA A SINISTRA -->
      <div class="mov-date small text-muted me-3">
        {{ formattedDate }}
      </div>

      <!-- ICONA + TESTO -->
      <div class="mov-center d-flex align-items-start flex-grow-1 min-width-0 gap-3">
        <!-- ICONA TONDA -->
        <div class="movement-icon shadow-sm flex-shrink-0" :class="iconWrapperClass">
          <i class="bi fs-5" :class="iconClass"></i>
        </div>

        <!-- TESTO -->
        <div class="flex-grow-1 min-width-0">
          <!-- DESCRIZIONE (cliccabile, identica al vecchio HTML) -->
          <div class="d-flex">
            <div class="flex-grow-1 min-width-0">
              <div
                class="fw-bold text-dark mb-1"
                :class="isExpanded ? 'text-wrap' : 'text-truncate'"
                style="max-width: 220px; cursor: pointer;"
                @click="toggleDescription"
              >
                {{ movimento.descrizione }}
              </div>
            </div>
          </div>

          <!-- META: CONTO, CATEGORIA, TAG, NOTE, ALLEGATI -->
          <div class="mov-meta d-flex align-items-center flex-wrap gap-2 mt-1">
            <span v-if="movimento.conto" class="badge badge-soft border">
              <i class="bi bi-bank2 me-1 text-muted"></i> {{ movimento.conto }}
            </span>

            <span v-if="movimento.categoria" class="badge badge-soft border">
              {{ movimento.categoria }}
            </span>

            <!-- TAG -->
            <template v-if="showTags && movimento.tags?.length">
              <span
                v-for="tag in movimento.tags"
                :key="tag"
                class="badge badge-tag text-dark border"
              >
                <i class="bi bi-tag-fill me-1 opacity-50"></i> {{ tag }}
              </span>
            </template>

            <!-- NOTE / ALLEGATI -->
            <i
              v-if="showAttachments && movimento.note"
              class="bi bi-sticky-fill text-warning ms-1"
              title="Note"
            ></i>
            <i
              v-if="showAttachments && movimento.file_url"
              class="bi bi-paperclip text-secondary ms-1"
              title="Allegato"
            ></i>
          </div>
        </div>
      </div>

      <!-- IMPORTO + AZIONI A DESTRA -->
      <div class="mov-right d-flex align-items-center flex-shrink-0 gap-2 ms-auto">
        <div class="text-end">
          <div class="fw-bold text-nowrap fs-6" :class="amountClass">
            {{ formattedAmount }} €
          </div>
        </div>

        <div v-if="$slots.actions" class="d-flex gap-2 actions-row">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CARD BASE */
.movimento-card {
  background: #fff;
  padding: 0.5rem 0.75rem;
}

/* RIGA PRINCIPALE */
.row-main {
  gap: 0.75rem;
  flex-wrap: nowrap;
}

/* DATA A SINISTRA */
.mov-date {
  white-space: nowrap;
}

/* BLOCCO CENTRALE (icona + testo) */
.mov-center {
  flex: 1 1 auto;
  min-width: 0;
}

/* ICONA TONDA */
.movement-icon {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* META SOTTO LA DESCRIZIONE */
.mov-meta {
  font-size: 0.75rem;
}

/* Badge grigio (conto/categoria) */
.badge-soft {
  background-color: #f8fafc;
  color: #475569;
  border-color: #e2e8f0 !important;
  font-weight: 500;
  font-size: 0.75rem;
}

/* Badge giallo (tag) */
.badge-tag {
  background-color: #fef9c3;
  border-color: #fde047 !important;
  color: #854d0e !important;
  font-weight: 600;
  font-size: 0.7rem;
  border-radius: 6px;
  padding: 4px 8px;
}

/* BLOCCO IMPORTO + AZIONI */
.mov-right {
  gap: 0.5rem;
  flex-shrink: 0;
}

/* GRUPPO AZIONI */
.actions-row {
  display: flex;
  gap: 0.25rem;
}

/* Mobile: importo + azioni vanno in basso a destra */
@media (max-width: 767.98px) {
  .row-main {
    flex-wrap: wrap;
  }

  .mov-right {
    width: 100%;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
}
</style>
