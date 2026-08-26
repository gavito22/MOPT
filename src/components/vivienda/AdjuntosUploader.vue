<script setup lang="ts">
import { ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { Paperclip, Trash2 } from '@lucide/vue'
import * as api from '@/lib/api'
import type { ViviendaAdjuntoRow } from '@/lib/database.types'

const props = defineProps<{ viviendaId: string }>()

const queryClient = useQueryClient()
const fileInput = ref<HTMLInputElement>()
const subiendo = ref(false)

const { data: adjuntos } = useQuery({
  queryKey: ['adjuntos', props.viviendaId],
  queryFn: () => api.listAdjuntos(props.viviendaId),
})

function invalidar() {
  queryClient.invalidateQueries({ queryKey: ['adjuntos', props.viviendaId] })
}

async function onArchivos(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  subiendo.value = true
  try {
    for (const file of Array.from(files)) {
      await api.subirAdjunto(props.viviendaId, file)
    }
    invalidar()
  } finally {
    subiendo.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function eliminar(adjunto: ViviendaAdjuntoRow) {
  await api.eliminarAdjunto(adjunto)
  invalidar()
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="flex items-center gap-2 text-sm border rounded-lg shadow-sm px-3 py-1.5"
        :disabled="subiendo"
        @click="fileInput?.click()"
      >
        <Paperclip class="size-4" /> {{ subiendo ? 'Subiendo…' : 'Adjuntar archivos' }}
      </button>
      <input ref="fileInput" type="file" multiple class="hidden" @change="onArchivos" />
    </div>
    <ul v-if="adjuntos?.length" class="space-y-1">
      <li
        v-for="a in adjuntos"
        :key="a.id"
        class="flex items-center justify-between text-sm bg-neutral rounded px-3 py-1.5"
      >
        <a :href="api.urlAdjunto(a.storage_path)" target="_blank" class="truncate text-primary underline">
          {{ a.nombre_archivo }}
        </a>
        <button type="button" class="text-error shrink-0 rounded-lg p-1 hover:bg-black/5" @click="eliminar(a)">
          <Trash2 class="size-4" />
        </button>
      </li>
    </ul>
  </div>
</template>
