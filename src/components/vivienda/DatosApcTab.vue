<script setup lang="ts">
import { ref, watch } from 'vue'
import * as api from '@/lib/api'
import type { ViviendaRow, DatosApcCampos } from '@/lib/database.types'

const props = defineProps<{ vivienda: ViviendaRow | null }>()
const emit = defineEmits<{ creada: [ViviendaRow]; actualizada: [ViviendaRow] }>()

function camposIniciales(): DatosApcCampos {
  const v = props.vivienda
  return {
    codigo_cfia: v?.codigo_cfia ?? '',
    codigo_apc: v?.codigo_apc ?? '',
    nombre_proyecto: v?.nombre_proyecto ?? '',
    dias_decreto: v?.dias_decreto ?? null,
    fecha_inicio: v?.fecha_inicio ?? '',
    fecha_vencimiento: v?.fecha_vencimiento ?? '',
    propietario: v?.propietario ?? '',
    coordenadas_raw: v?.coordenadas_raw ?? '',
    catastro: v?.catastro ?? '',
  }
}

const campos = ref<DatosApcCampos>(camposIniciales())
const guardando = ref(false)

// La vivienda llega de forma asíncrona (useQuery): cuando cambia (primera carga
// resuelta, u otro proyecto), hay que releer los campos, no solo al montar.
watch(
  () => props.vivienda,
  () => {
    campos.value = camposIniciales()
  },
)
const mensaje = ref('')

async function guardar() {
  guardando.value = true
  mensaje.value = ''
  try {
    const datos: DatosApcCampos = {
      ...campos.value,
      fecha_inicio: campos.value.fecha_inicio || null,
      fecha_vencimiento: campos.value.fecha_vencimiento || null,
    }
    if (props.vivienda) {
      const actualizada = await api.actualizarVivienda(props.vivienda.id, datos)
      emit('actualizada', actualizada)
      mensaje.value = 'Datos del APC actualizados.'
    } else {
      const nueva = await api.crearVivienda(datos)
      emit('creada', nueva)
    }
  } catch (err) {
    mensaje.value = (err as { message?: string } | null)?.message || 'No se pudo guardar.'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="guardar">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="text-xs text-gray-500">Código CFIA</label>
        <input v-model="campos.codigo_cfia" type="text" class="w-full border rounded-lg px-2 py-1.5" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Código APC</label>
        <input v-model="campos.codigo_apc" type="text" class="w-full border rounded-lg px-2 py-1.5" />
      </div>
      <div class="sm:col-span-2">
        <label class="text-xs text-gray-500">Nombre del proyecto</label>
        <input v-model="campos.nombre_proyecto" type="text" class="w-full border rounded-lg px-2 py-1.5" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Días decreto</label>
        <input v-model.number="campos.dias_decreto" type="number" class="w-full border rounded-lg px-2 py-1.5" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Propietario</label>
        <input v-model="campos.propietario" type="text" class="w-full border rounded-lg px-2 py-1.5" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Coordenadas</label>
        <input v-model="campos.coordenadas_raw" type="text" class="w-full border rounded-lg px-2 py-1.5" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Catastro</label>
        <input v-model="campos.catastro" type="text" class="w-full border rounded-lg px-2 py-1.5" />
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button type="submit" class="bg-primary text-white px-4 py-2 rounded-lg shadow-sm" :disabled="guardando">
        {{ guardando ? 'Guardando…' : vivienda ? 'Guardar cambios' : 'Crear vivienda y continuar' }}
      </button>
      <p class="text-sm text-gray-500">{{ mensaje }}</p>
    </div>
  </form>
</template>
