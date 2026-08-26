<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import * as api from '@/lib/api'
import AdjuntosUploader from './AdjuntosUploader.vue'
import type {
  ViviendaRow,
  Resolucion,
  NumeroRevision,
  RevisionCampos,
  DatosAdicionalesCampos,
} from '@/lib/database.types'

const props = defineProps<{ vivienda: ViviendaRow }>()
const emit = defineEmits<{ actualizado: []; cerrar: [] }>()

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

function resolucionDe(numero: NumeroRevision): Resolucion | null {
  const p = PREFIJO[numero]
  return props.vivienda[`${p}_resolucion` as keyof ViviendaRow] as Resolucion | null
}

function revisadoPorDe(numero: NumeroRevision) {
  const p = PREFIJO[numero]
  return props.vivienda[`${p}_revisado_por` as keyof ViviendaRow] as string | null
}

function fechaDe(numero: NumeroRevision) {
  const p = PREFIJO[numero]
  return (props.vivienda[`${p}_fecha` as keyof ViviendaRow] as string | null)?.slice(0, 10)
}

function habilitada(numero: NumeroRevision) {
  if (numero === 1) return true
  return resolucionDe((numero - 1) as NumeroRevision) === 'Rechazado'
}

function bloqueada(numero: NumeroRevision) {
  return !!resolucionDe(numero)
}

function camposIniciales(numero: NumeroRevision): RevisionCampos {
  const p = PREFIJO[numero]
  const v = props.vivienda
  const fechaExistente = (v[`${p}_fecha` as keyof ViviendaRow] as string | null)?.slice(0, 10)
  return {
    resolucion: (v[`${p}_resolucion` as keyof ViviendaRow] as Resolucion | null) ?? null,
    fecha: fechaExistente || new Date().toISOString().slice(0, 10),
    fecha_inicio: (v[CAMPO_FECHA_INICIO[numero]] as string | null) ?? '',
    fecha_vencimiento: (v[CAMPO_FECHA_VENCIMIENTO[numero]] as string | null) ?? '',
  }
}

const formularios = reactive<Record<NumeroRevision, RevisionCampos>>({
  1: camposIniciales(1),
  2: camposIniciales(2),
  3: camposIniciales(3),
})
const guardando = reactive<Record<NumeroRevision, boolean>>({ 1: false, 2: false, 3: false })
const errores = reactive<Record<NumeroRevision, string>>({ 1: '', 2: '', 3: '' })

const numeros = computed<NumeroRevision[]>(() => [1, 2, 3])

async function guardar(numero: NumeroRevision) {
  const campos = formularios[numero]
  if (!campos.resolucion) return
  guardando[numero] = true
  errores[numero] = ''
  try {
    await api.guardarRevision(props.vivienda.id, numero, campos)
    emit('actualizado')
    if (campos.resolucion === 'Rechazado') {
      emit('cerrar')
    }
  } catch (err) {
    const mensaje = (err as { message?: string } | null)?.message
    errores[numero] = mensaje || 'No se pudo guardar la revisión.'
  } finally {
    guardando[numero] = false
  }
}

// ---------- Datos adicionales (comunes a la vivienda, no por revisión) ----------
const datosAdicionales = reactive<DatosAdicionalesCampos>({
  permiso_ejecucion_funcionamiento: props.vivienda.permiso_ejecucion_funcionamiento ?? '',
  fecha_permiso_ejecucion_funcionamiento: props.vivienda.fecha_permiso_ejecucion_funcionamiento ?? '',
  observaciones: props.vivienda.observaciones ?? '',
})
const guardandoAdicionales = ref(false)
const errorAdicionales = ref('')
const mensajeAdicionales = ref('')

async function guardarAdicionales() {
  guardandoAdicionales.value = true
  errorAdicionales.value = ''
  mensajeAdicionales.value = ''
  try {
    await api.guardarDatosAdicionales(props.vivienda.id, datosAdicionales)
    emit('actualizado')
    mensajeAdicionales.value = 'Guardado.'
  } catch (err) {
    const mensaje = (err as { message?: string } | null)?.message
    errorAdicionales.value = mensaje || 'No se pudo guardar.'
  } finally {
    guardandoAdicionales.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <section
      v-for="numero in numeros"
      :key="numero"
      class="border rounded-lg overflow-hidden"
      :class="!habilitada(numero) && 'opacity-50 pointer-events-none'"
    >
      <header class="bg-primary text-white px-4 py-2 font-semibold">{{ ETIQUETA[numero] }}</header>
      <div class="p-4 space-y-3">
        <p v-if="!habilitada(numero)" class="text-sm text-gray-500">
          Se habilita solo si la revisión anterior fue rechazada.
        </p>
        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-gray-500">Resolución</label>
              <select
                v-model="formularios[numero].resolucion"
                :disabled="bloqueada(numero)"
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
                v-model="formularios[numero].fecha"
                :disabled="bloqueada(numero)"
                type="date"
                class="w-full border rounded-lg px-2 py-1.5"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-gray-500">Fecha de inicio</label>
              <input
                v-model="formularios[numero].fecha_inicio"
                :disabled="bloqueada(numero)"
                type="date"
                class="w-full border rounded-lg px-2 py-1.5"
              />
            </div>
            <div>
              <label class="text-xs text-gray-500">Fecha de vencimiento</label>
              <input
                v-model="formularios[numero].fecha_vencimiento"
                :disabled="bloqueada(numero)"
                type="date"
                class="w-full border rounded-lg px-2 py-1.5"
              />
            </div>
          </div>

          <div>
            <p v-if="bloqueada(numero)" class="text-xs text-gray-500 mb-2">
              Revisado por {{ revisadoPorDe(numero) }} el {{ fechaDe(numero) }}
            </p>
            <button
              v-else
              type="button"
              class="bg-primary text-white px-4 py-2 rounded-lg shadow-sm mb-2"
              :disabled="guardando[numero] || !formularios[numero].resolucion"
              @click="guardar(numero)"
            >
              {{ guardando[numero] ? 'Guardando…' : `Guardar ${ETIQUETA[numero].toLowerCase()}` }}
            </button>
            <p v-if="errores[numero]" class="text-xs text-error mb-2">{{ errores[numero] }}</p>
          </div>
        </template>
      </div>
    </section>

    <section class="border rounded-lg overflow-hidden">
      <header class="bg-primary text-white px-4 py-2 font-semibold">Información adicional</header>
      <div class="p-4 space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-gray-500">Permiso de ejecución y funcionamiento</label>
            <input
              v-model="datosAdicionales.permiso_ejecucion_funcionamiento"
              type="text"
              class="w-full border rounded-lg px-2 py-1.5"
            />
          </div>
          <div>
            <label class="text-xs text-gray-500">Fecha permiso de ejecución y funcionamiento</label>
            <input
              v-model="datosAdicionales.fecha_permiso_ejecucion_funcionamiento"
              type="date"
              class="w-full border rounded-lg px-2 py-1.5"
            />
          </div>
        </div>

        <div>
          <label class="text-xs text-gray-500">Observaciones</label>
          <textarea
            v-model="datosAdicionales.observaciones"
            rows="3"
            class="w-full border rounded-lg px-2 py-1.5"
          />
        </div>

        <AdjuntosUploader :vivienda-id="vivienda.id" />

        <div>
          <button
            type="button"
            class="bg-primary text-white px-4 py-2 rounded-lg shadow-sm mb-2"
            :disabled="guardandoAdicionales"
            @click="guardarAdicionales"
          >
            {{ guardandoAdicionales ? 'Guardando…' : 'Guardar' }}
          </button>
          <p v-if="mensajeAdicionales" class="text-xs text-gray-500 mb-2">{{ mensajeAdicionales }}</p>
          <p v-if="errorAdicionales" class="text-xs text-error mb-2">{{ errorAdicionales }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
