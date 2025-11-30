<script setup>
import { computed } from 'vue'

const props = defineProps({
  movimento: { type: Object, required: true },
  expanded: { type: Boolean, default: true },
  showTags: { type: Boolean, default: false },
  showAttachments: { type: Boolean, default: false },
  dateVariant: { type: String, default: 'short' },
  amountMode: { type: String, default: 'sign-by-type' }
})

const emit = defineEmits(['toggle'])

const iconWrapperClass = computed(() =>
  props.movimento?.tipo === 'Entrata'
    ? 'bg-success bg-opacity-10 text-success'
    : 'bg-primary bg-opacity-10 text-primary'
)

const iconClass = computed(() =>
  props.movimento?.tipo === 'Entrata'
    ? 'bi-piggy-bank-fill'
    : 'bi-bag-fill'
)

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

const formattedDate = computed(() => {
  if (!props.movimento?.data) return ''

  const options = props.dateVariant === 'long'
    ? { weekday: 'short', day: '2-digit', month: 'long' }
    : { day: '2-digit', month: 'short' }

  return new Date(props.movimento.data).toLocaleDateString('it-IT', options)
})
</script>

<template>
  <div class="d-flex align-items-start gap-3 w-100">
    <div>
        <span v-if="formattedDate" class="badge badge-soft d-inline-flex align-items-center gap-1">
        <i class="bi bi-calendar-event"></i>
        {{ formattedDate }}
        </span>
    </div>
    <div class="movement-icon shadow-sm" :class="iconWrapperClass">
      <i class="bi fs-5" :class="iconClass"></i>
    </div>

    <div class="flex-grow-1 min-width-0">
      <div class="d-flex justify-content-between align-items-center gap-3">
        <div
          class="fw-bold text-dark text-break"
          :class="{ 'text-truncate': !expanded, 'cursor-pointer': !!$attrs.onToggle }"
          @click="emit('toggle')"
        >
          {{ movimento.descrizione }}
        </div>

        <div class="text-end text-nowrap">
          <div class="fw-bold" :class="amountClass">
            {{ formattedAmount }} €
          </div>
        </div>
      </div>

      <div class="small text-muted d-flex align-items-center flex-wrap gap-2 mt-1">
        <span class="badge badge-soft">{{ movimento.conto }}</span>
        <span class="badge badge-soft">{{ movimento.categoria }}</span>
        <i v-if="showAttachments && movimento.note" class="bi bi-sticky-fill text-warning"></i>
        <i v-if="showAttachments && movimento.file_url" class="bi bi-paperclip text-secondary"></i>
      </div>

      <div v-if="showTags && movimento.tags?.length" class="d-flex flex-wrap gap-2 mt-2">
        <span v-for="tag in movimento.tags" :key="tag" class="badge badge-tag">#{{ tag }}</span>
      </div>
    </div>

    <div v-if="$slots.actions" class="ms-2 d-flex align-items-center">
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

.badge-soft {
  background-color: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  font-weight: 600;
}

.badge-tag {
  background-color: #fef9c3;
  color: #854d0e;
  border: 1px solid #fde047;
  border-radius: 999px;
  font-weight: 600;
}

.cursor-pointer {
  cursor: pointer;
}
</style>