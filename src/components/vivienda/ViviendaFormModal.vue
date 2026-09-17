<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { X } from '@lucide/vue'
import * as api from '@/lib/api'
import DatosApcTab from './DatosApcTab.vue'
import UbicacionTab from './UbicacionTab.vue'
import RevisionTab from './RevisionTab.vue'
import PermisoTab from './PermisoTab.vue'
import type { ViviendaRow, NumeroRevision, Resolucion } from '@/lib/database.types'

const props = defineProps<{ open: boolean; viviendaId: string | null }>()
const emit = defineEmits<{ close: []; guardado: [] }>()

const queryClient = useQueryClient()

type TabKey = 'apc' | 'ubicacion' | 'revision1' | 'revision2' | 'revision3' | 'permiso'

const activeTab = ref<TabKey>('apc')
const idInterno = ref<string | null>(props.viviendaId)

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

const titulo = computed(() => {
  const v = vivienda.value
  if (!v) return 'Nueva vivienda'
  return [v.codigo_cfia, v.nombre_proyecto].filter(Boolean).join(' - ') || 'Vivienda sin nombre'
})

const tabs = computed(() => {
  const v = vivienda.value
  const lista: { key: TabKey; label: string }[] = [
    { key: 'apc', label: 'Datos del APC' },
    { key: 'ubicacion', label: 'Ubicación' },
    { key: 'revision1', label: 'Primera Revisión' },
  ]
  if (v?.primera_resolucion === 'Rechazado') lista.push({ key: 'revision2', label: 'Segunda Revisión' })
  if (v?.segunda_resolucion === 'Rechazado') lista.push({ key: 'revision3', label: 'Tercera Revisión' })
  if (v?.primera_resolucion === 'Aprobado' || v?.segunda_resolucion === 'Aprobado' || v?.tercera_resolucion === 'Aprobado') {
    lista.push({ key: 'permiso', label: 'Permiso' })
  }
  return lista
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

async function onRevisionActualizada(numero: NumeroRevision, resolucion: Resolucion | null) {
  await refetch()
  emit('guardado')
  // resolucion viene null cuando es una corrección a una revisión ya resuelta:
  // en ese caso no se cambia de pestaña, solo se refrescan los datos.
  if (!resolucion) return
  if (resolucion === 'Aprobado') {
    activeTab.value = 'permiso'
  } else if (numero === 1) {
    activeTab.value = 'revision2'
  } else if (numero === 2) {
    activeTab.value = 'revision3'
  }
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
            {{ titulo }}
          </h2>
          <button class="p-1.5 rounded-lg hover:bg-neutral" @click="cerrar">
            <X class="size-5" />
          </button>
        </div>

        <div class="px-6 pt-4">
          <div class="flex gap-2 border-b flex-wrap">
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
            <RevisionTab
              v-else-if="activeTab === 'revision1'"
              :vivienda="vivienda"
              :numero="1"
              @actualizado="onRevisionActualizada"
            />
            <RevisionTab
              v-else-if="activeTab === 'revision2'"
              :vivienda="vivienda"
              :numero="2"
              @actualizado="onRevisionActualizada"
            />
            <RevisionTab
              v-else-if="activeTab === 'revision3'"
              :vivienda="vivienda"
              :numero="3"
              @actualizado="onRevisionActualizada"
            />
            <PermisoTab v-else-if="activeTab === 'permiso'" :vivienda="vivienda" @actualizado="refetch()" />
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
