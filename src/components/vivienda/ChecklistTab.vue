<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import * as api from '@/lib/api'
import { cn } from '@/lib/utils'
import type { EstadoChecklist, NumeroRevision } from '@/lib/database.types'

const props = defineProps<{ viviendaId: string; numeroRevision: NumeroRevision }>()

const queryClient = useQueryClient()

const queryKey = ['checklist', props.viviendaId, props.numeroRevision]

const { data: respuestas, error, isLoading } = useQuery({
  queryKey,
  queryFn: async () => {
    let filas = await api.listViviendaChecklist(props.viviendaId, props.numeroRevision)
    if (filas.length === 0) {
      await api.crearChecklistParaRevision(props.viviendaId, props.numeroRevision)
      filas = await api.listViviendaChecklist(props.viviendaId, props.numeroRevision)
    }
    return filas
  },
  select: (data) => [...data].sort((a, b) => a.checklist_items.orden - b.checklist_items.orden),
})

async function actualizarEstado(id: string, estado: EstadoChecklist) {
  await api.actualizarRespuestaChecklist(id, { estado })
  queryClient.invalidateQueries({ queryKey })
}

async function actualizarObservacion(id: string, observacion: string) {
  await api.actualizarRespuestaChecklist(id, { observacion })
}
</script>

<template>
  <div class="space-y-4">
    <p v-if="isLoading" class="text-sm text-gray-500">Cargando…</p>
    <p v-else-if="error" class="text-sm text-error">
      {{ (error as { message?: string })?.message || 'No se pudo cargar el check list.' }}
    </p>
    <p v-else-if="!respuestas?.length" class="text-sm text-gray-500">
      No hay ítems de check list activos. Configúralos en Configuración.
    </p>
    <div
      v-for="r in respuestas"
      :key="r.id"
      class="grid grid-cols-1 md:grid-cols-[160px_220px_1fr] gap-3 items-start border-b pb-4 last:border-0"
    >
      <p class="font-medium pt-2">{{ r.checklist_items.nombre }}</p>

      <div class="flex gap-2">
        <button
          type="button"
          :class="
            cn(
              'flex-1 px-3 py-2 rounded-lg border text-sm font-medium shadow-sm',
              r.estado === 'Cumple' ? 'bg-success text-white border-success' : 'bg-surface',
            )
          "
          @click="actualizarEstado(r.id, 'Cumple')"
        >
          Cumple
        </button>
        <button
          type="button"
          :class="
            cn(
              'flex-1 px-3 py-2 rounded-lg border text-sm font-medium shadow-sm',
              r.estado === 'No cumple' ? 'bg-error text-white border-error' : 'bg-surface',
            )
          "
          @click="actualizarEstado(r.id, 'No cumple')"
        >
          No cumple
        </button>
      </div>

      <textarea
        :value="r.observacion ?? ''"
        rows="2"
        placeholder="Observación…"
        class="w-full border rounded-lg px-2 py-1.5"
        @blur="actualizarObservacion(r.id, ($event.target as HTMLTextAreaElement).value)"
      />
    </div>
  </div>
</template>
