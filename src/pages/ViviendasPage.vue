<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  ChevronDown,
  Pencil,
  FileText,
  Trash2,
} from '@lucide/vue'
import * as api from '@/lib/api'
import { exportCompendio, parseDatosCrudosExcel } from '@/lib/excelExport'
import { exportFichaPdf } from '@/lib/fichaPdf'
import ConfirmModal from '@/components/ConfirmModal.vue'
import ViviendaFormModal from '@/components/vivienda/ViviendaFormModal.vue'
import { cn, formatFecha, estadoBadgeClasses } from '@/lib/utils'
import type { Estado } from '@/lib/database.types'

const queryClient = useQueryClient()

const filtrosExpandidos = ref(false)
const filtroDesde = ref('')
const filtroHasta = ref('')
const filtroEstado = ref('')
const filtroNombre = ref('')
const filtroCfia = ref('')
const filtroCanton = ref('')

const filtros = computed(() => ({
  desde: filtroDesde.value || undefined,
  hasta: filtroHasta.value || undefined,
  estado: filtroEstado.value || undefined,
  nombre: filtroNombre.value || undefined,
  codigoCfia: filtroCfia.value || undefined,
  canton: filtroCanton.value || undefined,
}))

function limpiarFiltros() {
  filtroDesde.value = ''
  filtroHasta.value = ''
  filtroEstado.value = ''
  filtroNombre.value = ''
  filtroCfia.value = ''
  filtroCanton.value = ''
}

const { data: viviendas, isFetching, refetch } = useQuery({
  queryKey: computed(() => ['viviendas', filtros.value]),
  queryFn: () => api.listViviendas(filtros.value),
})

const ESTADOS_PENDIENTES: Estado[] = [
  'Pendiente',
  'Rechazado (1era revisión)',
  'Rechazado (2da revisión)',
]

const kpis = computed(() => {
  const items = viviendas.value ?? []
  const pendientes = items.filter((v) => ESTADOS_PENDIENTES.includes(v.estado)).length
  const aprobados = items.filter((v) => v.estado.startsWith('Aprobado')).length
  return {
    total: items.length,
    pendientes,
    aprobados,
  }
})

const estados: Estado[] = [
  'Pendiente',
  'Aprobado (1era revisión)',
  'Rechazado (1era revisión)',
  'Aprobado (2da revisión)',
  'Rechazado (2da revisión)',
  'Aprobado (3era revisión)',
  'Rechazado (3era revisión)',
]

// ---------- Carga masiva ----------
const fileInput = ref<HTMLInputElement>()
const cargando = ref(false)
const resultadoCarga = ref<string>('')

function abrirSelectorArchivo() {
  fileInput.value?.click()
}

async function onArchivoSeleccionado(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  cargando.value = true
  resultadoCarga.value = ''
  try {
    const filas = await parseDatosCrudosExcel(file)
    const resultado = await api.cargarDatosCrudosMasivo(filas)
    resultadoCarga.value = `${resultado.nuevos} nuevos, ${resultado.actualizados} actualizados, ${resultado.viviendasCreadas} viviendas creadas.`
    queryClient.invalidateQueries({ queryKey: ['viviendas'] })
  } catch {
    resultadoCarga.value = 'Error al procesar el archivo.'
  } finally {
    cargando.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

// ---------- Exportar compendio ----------
async function onExportarExcel() {
  await exportCompendio(viviendas.value ?? [])
}

async function onExportarFicha(viviendaId: string) {
  const vivienda = await api.getVivienda(viviendaId)
  const [checklist1, checklist2, checklist3] = await Promise.all([
    api.listViviendaChecklist(viviendaId, 1),
    api.listViviendaChecklist(viviendaId, 2),
    api.listViviendaChecklist(viviendaId, 3),
  ])
  await exportFichaPdf(vivienda, { 1: checklist1, 2: checklist2, 3: checklist3 })
}

// ---------- Eliminar ----------
const viviendaAEliminar = ref<string | null>(null)
async function confirmarEliminar() {
  if (!viviendaAEliminar.value) return
  await api.eliminarVivienda(viviendaAEliminar.value)
  viviendaAEliminar.value = null
  queryClient.invalidateQueries({ queryKey: ['viviendas'] })
}

// ---------- Modal nueva/editar vivienda ----------
const modalAbierto = ref(false)
const viviendaIdModal = ref<string | null>(null)

function abrirNuevaVivienda() {
  viviendaIdModal.value = null
  modalAbierto.value = true
}

function abrirEditarVivienda(id: string) {
  viviendaIdModal.value = id
  modalAbierto.value = true
}

function onGuardadoModal() {
  queryClient.invalidateQueries({ queryKey: ['viviendas'] })
}
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-primary">Viviendas Unifamiliares</h1>
        <p class="text-sm text-gray-500">Revisión de accesos vehiculares para vivienda unifamiliar</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button
          class="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow-sm"
          @click="abrirNuevaVivienda"
        >
          <Plus class="size-4" /> Nueva vivienda
        </button>
        <button
          class="flex items-center gap-2 border px-4 py-2 rounded-lg shadow-sm"
          :disabled="isFetching"
          @click="refetch()"
        >
          <RefreshCw class="size-4" :class="isFetching && 'animate-spin'" /> Actualizar
        </button>
        <button
          class="flex items-center gap-2 border px-4 py-2 rounded-lg shadow-sm"
          :disabled="cargando"
          @click="abrirSelectorArchivo"
        >
          <Upload class="size-4" /> Carga masiva
        </button>
        <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="onArchivoSeleccionado" />
        <button
          class="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm"
          @click="onExportarExcel"
        >
          <FileSpreadsheet class="size-4" /> Excel
        </button>
      </div>
    </div>

    <p v-if="resultadoCarga" class="text-sm text-primary">{{ resultadoCarga }}</p>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-surface rounded-lg shadow p-4">
        <p class="text-3xl font-bold">{{ kpis.total }}</p>
        <p class="text-sm text-gray-500">Total proyectos</p>
      </div>
      <div class="bg-surface rounded-lg shadow p-4">
        <p class="text-3xl font-bold text-secondary">{{ kpis.pendientes }}</p>
        <p class="text-sm text-gray-500">Pendientes</p>
      </div>
      <div class="bg-surface rounded-lg shadow p-4">
        <p class="text-3xl font-bold text-success">{{ kpis.aprobados }}</p>
        <p class="text-sm text-gray-500">Aprobados</p>
      </div>
    </div>

    <div class="bg-surface rounded-lg shadow">
      <button
        class="w-full flex items-center justify-between px-4 py-3 font-semibold rounded-lg"
        @click="filtrosExpandidos = !filtrosExpandidos"
      >
        FILTROS
        <ChevronDown class="size-4 transition-transform" :class="filtrosExpandidos && 'rotate-180'" />
      </button>
      <div v-show="filtrosExpandidos" class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 pt-0">
        <div>
          <label class="text-xs text-gray-500">Desde</label>
          <input v-model="filtroDesde" type="date" class="w-full border rounded px-2 py-1.5" />
        </div>
        <div>
          <label class="text-xs text-gray-500">Hasta</label>
          <input v-model="filtroHasta" type="date" class="w-full border rounded px-2 py-1.5" />
        </div>
        <div>
          <label class="text-xs text-gray-500">Estado</label>
          <select v-model="filtroEstado" class="w-full border rounded px-2 py-1.5">
            <option value="">Todos</option>
            <option v-for="e in estados" :key="e" :value="e">{{ e }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500">Nombre del proyecto</label>
          <input v-model="filtroNombre" type="text" class="w-full border rounded px-2 py-1.5" />
        </div>
        <div>
          <label class="text-xs text-gray-500">Código CFIA</label>
          <input v-model="filtroCfia" type="text" class="w-full border rounded px-2 py-1.5" />
        </div>
        <div>
          <label class="text-xs text-gray-500">Cantón</label>
          <input v-model="filtroCanton" type="text" class="w-full border rounded px-2 py-1.5" />
        </div>
        <button class="text-sm text-primary underline col-span-full text-left" @click="limpiarFiltros">
          Limpiar filtros
        </button>
      </div>
    </div>

    <div class="bg-surface rounded-lg shadow overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left border-b text-gray-500">
            <th class="p-3">Código</th>
            <th class="p-3">Nombre</th>
            <th class="p-3">Fecha</th>
            <th class="p-3">Tipo de ingreso</th>
            <th class="p-3">Estado</th>
            <th class="p-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in viviendas" :key="v.id" class="border-b last:border-0 hover:bg-neutral">
            <td class="p-3">{{ v.codigo_cfia }}</td>
            <td class="p-3">{{ v.nombre_proyecto }}</td>
            <td class="p-3">{{ formatFecha(v.created_at) }}</td>
            <td class="p-3">{{ v.tipo_ingreso }}</td>
            <td class="p-3">
              <span :class="cn('inline-block rounded-full px-2.5 py-1 text-xs font-medium', estadoBadgeClasses(v.estado))">
                {{ v.estado }}
              </span>
            </td>
            <td class="p-3">
              <div class="flex justify-end gap-2">
                <button
                  class="p-1.5 rounded-lg shadow-sm hover:bg-gray-100"
                  title="Editar"
                  @click="abrirEditarVivienda(v.id)"
                >
                  <Pencil class="size-4" />
                </button>
                <button
                  class="p-1.5 rounded-lg shadow-sm hover:bg-gray-100"
                  title="Exportar ficha"
                  @click="onExportarFicha(v.id)"
                >
                  <FileText class="size-4" />
                </button>
                <button
                  class="p-1.5 rounded-lg shadow-sm hover:bg-gray-100 text-error"
                  title="Eliminar"
                  @click="viviendaAEliminar = v.id"
                >
                  <Trash2 class="size-4" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!viviendas?.length">
            <td colspan="6" class="p-6 text-center text-gray-400">Sin proyectos registrados</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmModal
      :open="!!viviendaAEliminar"
      titulo="Eliminar vivienda"
      mensaje="Esta acción no se puede deshacer. ¿Desea eliminar el proyecto?"
      @cancelar="viviendaAEliminar = null"
      @confirmar="confirmarEliminar"
    />

    <ViviendaFormModal
      :open="modalAbierto"
      :vivienda-id="viviendaIdModal"
      @close="modalAbierto = false"
      @guardado="onGuardadoModal"
    />
  </div>
</template>
