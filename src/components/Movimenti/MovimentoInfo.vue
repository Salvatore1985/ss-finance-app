<script setup>
import { computed } from 'vue'

const props = defineProps({
  movimento: {
    type: Object,
    required: true
  },
  // già usati nella tua pagina (li supportiamo per compatibilità)
  showTags: {
    type: Boolean,
    default: true
  },
  showAttachments: {
    type: Boolean,
    default: false
  },
  // nuovo: se vuoi nascondere la categoria banca
  showCategoriaBanca: {
    type: Boolean,
    default: true
  }
})

const isEntrata = computed(() => Number(props.movimento.importo) > 0)

const importoFormatted = computed(() => {
  const val = Number(props.movimento.importo) || 0
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(val)
})

const dataFormatted = computed(() => {
  if (!props.movimento.data) return ''
  try {
    const d = new Date(props.movimento.data)
    if (Number.isNaN(d.getTime())) return props.movimento.data
    return d.toLocaleDateString('it-IT')
  } catch {
    return props.movimento.data
  }
})

const categoriaLabel = computed(() => {
  // categoria "interna" (tabella categorie)
  return props.movimento.categoria || 'Da classificare'
})

const categoriaBancaLabel = computed(() => {
  return props.movimento.categoria_banca || null
})

const contoLabel = computed(() => props.movimento.conto || '')

// Normalizziamo i tag (può essere array, stringa JSON, stringa singola, null)
const tagsList = computed(() => {
  const raw = props.movimento.tags
  if (!raw) return []
  if (Array.isArray(raw)) return raw

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return []
    // se è una stringa tipo '["Yaris","Panda"]'
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed
        return [trimmed]
      } catch {
        return [trimmed]
      }
    }
    return [trimmed]
  }

  return []
})
</script>

<template>
  <div class="mov-row d-flex align-items-start justify-content-between gap-3">
    <!-- COLONNA SINISTRA: data, descrizione, categorie, tag -->
    <div class="flex-grow-1 min-w-0">
      <!-- data + tipo + conto -->
      <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
        <span class="mov-date text-muted small">
          {{ dataFormatted }}
        </span>

        <span
          class="badge rounded-pill mov-badge-tipo"
          :class="isEntrata ? 'mov-badge-entrata' : 'mov-badge-uscita'"
        >
          {{ movimento.tipo || (isEntrata ? 'Entrata' : 'Uscita') }}
        </span>

        <span
          v-if="contoLabel"
          class="badge rounded-pill bg-light border text-muted small"
        >
          {{ contoLabel }}
        </span>
      </div>

      <!-- descrizione -->
      <div class="fw-semibold text-truncate mb-1">
        {{ movimento.descrizione }}
      </div>

      <!-- categorie + tag -->
      <div class="d-flex flex-wrap gap-1 align-items-center small">
        <!-- categoria interna -->
        <span
          class="badge rounded-pill mov-badge-cat-int"
          v-if="categoriaLabel"
        >
          {{ categoriaLabel }}
        </span>

        <!-- categoria banca (solo se diversa da categoria interna) -->
        <span
          v-if="
            showCategoriaBanca &&
            categoriaBancaLabel &&
            categoriaBancaLabel !== categoriaLabel
          "
          class="badge rounded-pill mov-badge-cat-banca"
        >
          {{ categoriaBancaLabel }}
        </span>

        <!-- tag -->
        <span
          v-if="showTags && tagsList.length">
          <span
            v-for="tag in tagsList"
            :key="tag"
            class="badge rounded-pill mov-badge-tag"
          >
            #{{ tag }}
            </span>
        </span>
      </div>
    </div>

    <!-- COLONNA DESTRA: importo + azioni -->
    <div
      class="flex-shrink-0 text-end d-flex flex-column align-items-end gap-2"
    >
      <div
        class="fw-bold mov-importo"
        :class="isEntrata ? 'text-success' : 'text-danger'"
      >
        {{ importoFormatted }}
      </div>

      <!-- slot per pulsanti azione (vedi MovimentiView) -->
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<style scoped>
.mov-row {
  cursor: default;
}

/* data */
.mov-date {
  font-size: 0.75rem;
}

/* badge tipo Entrata/Uscita */
.mov-badge-tipo {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
}
.mov-badge-entrata {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}
.mov-badge-uscita {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

/* categoria interna */
.mov-badge-cat-int {
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
}

/* categoria banca */
.mov-badge-cat-banca {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  color: #4b5563;
}

/* tag */
.mov-badge-tag {
  background: rgba(14, 165, 233, 0.08);
  color: #0369a1;
  font-weight: 500;
}

/* importo */
.mov-importo {
  font-size: 0.95rem;
}
</style>
