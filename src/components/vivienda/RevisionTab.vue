<script setup lang="ts">
import { reactive, ref } from 'vue'
import * as api from '@/lib/api'
import ChecklistTab from './ChecklistTab.vue'
import type { ViviendaRow, Resolucion, NumeroRevision, RevisionCampos } from '@/lib/database.types'

const props = defineProps<{ vivienda: ViviendaRow; numero: NumeroRevision }>()
const emit = defineEmits<{ actualizado: [numero: NumeroRevision, resolucion: Resolucion] }>()

const PREFIJO: Record<NumeroRevision, 'primera' | 'segunda' | 'tercera'> = {
  1: 'primera',
  2: 'segunda',
  3: 'tercera',
}
const ETIQUETA: Record<NumeroRevision, string> = {
  1: 'Primera revisión',
  2: 'Segunda revisión',
  3: 'Tercera revisión',
}

// La Primera revisión reutiliza los campos "generales" de la vivienda (fecha_inicio /
// fecha_vencimiento); Segunda y Tercera tienen sus propias columnas prefijadas.
const CAMPO_FECHA_INICIO: Record<NumeroRevision, keyof ViviendaRow> = {
  1: 'fecha_inicio',
  2: 'segunda_fecha_inicio',
  3: 'tercera_fecha_inicio',
}
const CAMPO_FECHA_VENCIMIENTO: Record<NumeroRevision, keyof ViviendaRow> = {
  1: 'fecha_vencimiento',
  2: 'segunda_fecha_vencimiento',
  3: 'tercera_fecha_vencimiento',
}

const p = PREFIJO[props.numero]

function resolucionActual(): Resolucion | null {
  return props.vivienda[`${p}_resolucion` as keyof ViviendaRow] as Resolucion | null
}

const revisadoPor = props.vivienda[`${p}_revisado_por` as keyof ViviendaRow] as string | null
const fechaResuelta = (props.vivienda[`${p}_fecha` as keyof ViviendaRow] as string | null)?.slice(0, 10)

const bloqueada = !!resolucionActual()

const campos = reactive<RevisionCampos>({
  resolucion: resolucionActual(),
  fecha: fechaResuelta || new Date().toISOString().slice(0, 10),
  fecha_inicio: (props.vivienda[CAMPO_FECHA_INICIO[props.numero]] as string | null) ?? '',
  fecha_vencimiento: (props.vivienda[CAMPO_FECHA_VENCIMIENTO[props.numero]] as string | null) ?? '',
})

const guardando = ref(false)
const error = ref('')

async function guardar() {
  if (!campos.resolucion) return
  guardando.value = true
  error.value = ''
  try {
    await api.guardarRevision(props.vivienda.id, props.numero, campos)
    emit('actualizado', props.numero, campos.resolucion)
  } catch (err) {
    const mensaje = (err as { message?: string } | null)?.message
    error.value = mensaje || 'No se pudo guardar la revisión.'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <section class="border rounded-lg overflow-hidden">
      <header class="bg-primary text-white px-4 py-2 font-semibold">Datos generales</header>
      <div class="p-4 space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-gray-500">Resolución</label>
            <select
              v-model="campos.resolucion"
              :disabled="bloqueada"
              class="w-full border rounded-lg px-2 py-1.5"
            >
              <option :value="null" disabled>Seleccione…</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Rechazado">Rechazado</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500">Fecha de la resolución</label>
            <input
              v-model="campos.fecha"
              :disabled="bloqueada"
              type="date"
              class="w-full border rounded-lg px-2 py-1.5"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-gray-500">Fecha de inicio</label>
            <input
              v-model="campos.fecha_inicio"
              :disabled="bloqueada"
              type="date"
              class="w-full border rounded-lg px-2 py-1.5"
            />
          </div>
          <div>
            <label class="text-xs text-gray-500">Fecha de vencimiento</label>
            <input
              v-model="campos.fecha_vencimiento"
              :disabled="bloqueada"
              type="date"
              class="w-full border rounded-lg px-2 py-1.5"
            />
          </div>
        </div>

      </div>
    </section>

    <section class="border rounded-lg overflow-hidden">
      <header class="bg-primary text-white px-4 py-2 font-semibold">Check list</header>
      <div class="p-4">
        <ChecklistTab :vivienda-id="vivienda.id" :numero-revision="numero" />
      </div>
    </section>

    <div>
      <p v-if="bloqueada" class="text-xs text-gray-500 mb-2">
        Revisado por {{ revisadoPor }} el {{ fechaResuelta }}
      </p>
      <button
        v-else
        type="button"
        class="bg-primary text-white px-4 py-2 rounded-lg shadow-sm mb-2"
        :disabled="guardando || !campos.resolucion"
        @click="guardar"
      >
        {{ guardando ? 'Guardando…' : `Guardar ${ETIQUETA[numero].toLowerCase()}` }}
      </button>
      <p v-if="error" class="text-xs text-error mb-2">{{ error }}</p>
    </div>
  </div>
</template>
