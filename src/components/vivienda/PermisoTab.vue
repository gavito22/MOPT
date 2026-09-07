<script setup lang="ts">
import { reactive, ref } from 'vue'
import * as api from '@/lib/api'
import AdjuntosUploader from './AdjuntosUploader.vue'
import type { ViviendaRow, DatosAdicionalesCampos } from '@/lib/database.types'

const props = defineProps<{ vivienda: ViviendaRow }>()
const emit = defineEmits<{ actualizado: [] }>()

const campos = reactive<DatosAdicionalesCampos>({
  permiso_ejecucion_funcionamiento: props.vivienda.permiso_ejecucion_funcionamiento ?? '',
  fecha_permiso_ejecucion_funcionamiento: props.vivienda.fecha_permiso_ejecucion_funcionamiento ?? '',
  observaciones: props.vivienda.observaciones ?? '',
})
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')

async function guardar() {
  guardando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    await api.guardarDatosAdicionales(props.vivienda.id, campos)
    emit('actualizado')
    mensaje.value = 'Guardado.'
  } catch (err) {
    const m = (err as { message?: string } | null)?.message
    error.value = m || 'No se pudo guardar.'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <section class="border rounded-lg overflow-hidden">
    <header class="bg-primary text-white px-4 py-2 font-semibold">Permiso</header>
    <div class="p-4 space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-gray-500">Permiso de ejecución y funcionamiento</label>
          <input
            v-model="campos.permiso_ejecucion_funcionamiento"
            type="text"
            class="w-full border rounded-lg px-2 py-1.5"
          />
        </div>
        <div>
          <label class="text-xs text-gray-500">Fecha permiso de ejecución y funcionamiento</label>
          <input
            v-model="campos.fecha_permiso_ejecucion_funcionamiento"
            type="date"
            class="w-full border rounded-lg px-2 py-1.5"
          />
        </div>
      </div>

      <div>
        <label class="text-xs text-gray-500">Observaciones</label>
        <textarea v-model="campos.observaciones" rows="3" class="w-full border rounded-lg px-2 py-1.5" />
      </div>

      <AdjuntosUploader :vivienda-id="vivienda.id" />

      <div>
        <button
          type="button"
          class="bg-primary text-white px-4 py-2 rounded-lg shadow-sm mb-2"
          :disabled="guardando"
          @click="guardar"
        >
          {{ guardando ? 'Guardando…' : 'Guardar' }}
        </button>
        <p v-if="mensaje" class="text-xs text-gray-500 mb-2">{{ mensaje }}</p>
        <p v-if="error" class="text-xs text-error mb-2">{{ error }}</p>
      </div>
    </div>
  </section>
</template>
