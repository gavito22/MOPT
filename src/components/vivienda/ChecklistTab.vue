<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import * as api from '@/lib/api'
import { cn } from '@/lib/utils'
import type { EstadoChecklist } from '@/lib/database.types'

const props = defineProps<{ viviendaId: string }>()

const queryClient = useQueryClient()

const { data: respuestas } = useQuery({
  queryKey: ['checklist', props.viviendaId],
  queryFn: () => api.listViviendaChecklist(props.viviendaId),
  select: (data) => [...data].sort((a, b) => a.checklist_items.orden - b.checklist_items.orden),
})

async function actualizarEstado(id: string, estado: EstadoChecklist) {
  await api.actualizarRespuestaChecklist(id, { estado })
  queryClient.invalidateQueries({ queryKey: ['checklist', props.viviendaId] })
}

async function actualizarObservacion(id: string, observacion: string) {
  await api.actualizarRespuestaChecklist(id, { observacion })
}
</script>

<template>
  <div class="space-y-4">
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
