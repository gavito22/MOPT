<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { X } from '@lucide/vue'
import * as api from '@/lib/api'
import DatosApcTab from './DatosApcTab.vue'
import UbicacionTab from './UbicacionTab.vue'
import ChecklistTab from './ChecklistTab.vue'
import RevisionesTab from './RevisionesTab.vue'
import type { ViviendaRow } from '@/lib/database.types'

const props = defineProps<{ open: boolean; viviendaId: string | null }>()
const emit = defineEmits<{ close: []; guardado: [] }>()

const queryClient = useQueryClient()

const activeTab = ref<'apc' | 'ubicacion' | 'checklist' | 'revisiones'>('apc')
const idInterno = ref<string | null>(props.viviendaId)
const tabs = [
  { key: 'apc', label: 'Datos del APC' },
  { key: 'ubicacion', label: 'Ubicación' },
  { key: 'checklist', label: 'Check list' },
  { key: 'revisiones', label: 'Revisiones' },
] as const

watch(
  () => props.open,
  (abierto) => {
    if (abierto) {
      idInterno.value = props.viviendaId
      activeTab.value = 'apc'
    }
  },
)

const { data: vivienda, refetch } = useQuery({
  queryKey: computed(() => ['vivienda', idInterno.value]),
  queryFn: () => api.getVivienda(idInterno.value as string),
  enabled: computed(() => !!idInterno.value),
})

function onCreada(nueva: ViviendaRow) {
  idInterno.value = nueva.id
  queryClient.setQueryData(['vivienda', nueva.id], nueva)
  emit('guardado')
  activeTab.value = 'ubicacion'
}

function onActualizada() {
  refetch()
  emit('guardado')
}

function cerrar() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" @click.self="cerrar">
      <div class="bg-surface rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-surface z-10">
          <h2 class="text-xl font-bold text-primary">
            {{ vivienda?.nombre_proyecto || 'Nueva vivienda' }}
          </h2>
          <button class="p-1.5 rounded-lg hover:bg-neutral" @click="cerrar">
            <X class="size-5" />
          </button>
        </div>

        <div class="px-6 pt-4">
          <div class="flex gap-2 border-b">
            <button
              v-for="t in tabs"
              :key="t.key"
              class="px-4 py-2 text-sm font-medium border-b-2"
              :class="[
                activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500',
                t.key !== 'apc' && !idInterno && 'opacity-40 cursor-not-allowed',
              ]"
              :disabled="t.key !== 'apc' && !idInterno"
              @click="activeTab = t.key"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <div class="p-6">
          <DatosApcTab
            v-if="activeTab === 'apc'"
            :vivienda="vivienda ?? null"
            @creada="onCreada"
            @actualizada="onActualizada"
          />
          <template v-else-if="vivienda">
            <UbicacionTab v-if="activeTab === 'ubicacion'" :vivienda="vivienda" @guardado="refetch()" />
            <ChecklistTab v-else-if="activeTab === 'checklist'" :vivienda-id="vivienda.id" />
            <RevisionesTab
              v-else-if="activeTab === 'revisiones'"
              :vivienda="vivienda"
              @actualizado="refetch()"
              @cerrar="cerrar"
            />
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
