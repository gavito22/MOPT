<script setup lang="ts">
import { ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { Plus, Pencil, Check, X, Trash2 } from '@lucide/vue'
import * as api from '@/lib/api'
import ConfirmModal from '@/components/ConfirmModal.vue'

const queryClient = useQueryClient()

// ---------- Regionales ----------
const { data: regionales } = useQuery({
  queryKey: ['regionales-config'],
  queryFn: () => api.listRegionales(false),
})
const nuevoRegional = ref('')
const editandoRegional = ref<string | null>(null)
const textoEdicionRegional = ref('')
const regionalAEliminar = ref<{ id: string; nombre: string } | null>(null)

async function agregarRegional() {
  if (!nuevoRegional.value.trim()) return
  const orden = (regionales.value?.length ?? 0) + 1
  await api.crearRegional(nuevoRegional.value.trim(), orden)
  nuevoRegional.value = ''
  queryClient.invalidateQueries({ queryKey: ['regionales-config'] })
}

function iniciarEdicionRegional(id: string, nombre: string) {
  editandoRegional.value = id
  textoEdicionRegional.value = nombre
}

async function guardarEdicionRegional(id: string) {
  await api.actualizarRegional(id, { nombre: textoEdicionRegional.value.trim() })
  editandoRegional.value = null
  queryClient.invalidateQueries({ queryKey: ['regionales-config'] })
}

async function confirmarEliminarRegional() {
  if (!regionalAEliminar.value) return
  await api.eliminarRegional(regionalAEliminar.value.id)
  regionalAEliminar.value = null
  queryClient.invalidateQueries({ queryKey: ['regionales-config'] })
}

// ---------- Checklist items ----------
const { data: checklistItems } = useQuery({
  queryKey: ['checklist-items-config'],
  queryFn: () => api.listChecklistItems(false),
})
const nuevoItem = ref('')
const editandoItem = ref<string | null>(null)
const textoEdicionItem = ref('')
const itemAEliminar = ref<{ id: string; nombre: string } | null>(null)

async function agregarItem() {
  if (!nuevoItem.value.trim()) return
  const orden = (checklistItems.value?.length ?? 0) + 1
  await api.crearChecklistItem(nuevoItem.value.trim(), orden)
  nuevoItem.value = ''
  queryClient.invalidateQueries({ queryKey: ['checklist-items-config'] })
}

function iniciarEdicionItem(id: string, nombre: string) {
  editandoItem.value = id
  textoEdicionItem.value = nombre
}

async function guardarEdicionItem(id: string) {
  await api.actualizarChecklistItem(id, { nombre: textoEdicionItem.value.trim() })
  editandoItem.value = null
  queryClient.invalidateQueries({ queryKey: ['checklist-items-config'] })
}

async function confirmarEliminarItem() {
  if (!itemAEliminar.value) return
  await api.eliminarChecklistItem(itemAEliminar.value.id)
  itemAEliminar.value = null
  queryClient.invalidateQueries({ queryKey: ['checklist-items-config'] })
}
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-primary">Configuración</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-surface rounded-lg shadow p-4 space-y-3">
        <h2 class="font-semibold">Regionales</h2>
        <div class="flex gap-2">
          <input
            v-model="nuevoRegional"
            type="text"
            placeholder="Nueva regional…"
            class="flex-1 border rounded-lg px-3 py-1.5 text-sm"
            @keyup.enter="agregarRegional"
          />
          <button class="bg-primary text-white p-2 rounded-lg shadow-sm" @click="agregarRegional">
            <Plus class="size-4" />
          </button>
        </div>
        <ul class="divide-y">
          <li v-for="r in regionales" :key="r.id" class="py-2 flex items-center gap-2">
            <template v-if="editandoRegional === r.id">
              <input v-model="textoEdicionRegional" type="text" class="flex-1 border rounded-lg px-2 py-1 text-sm" />
              <button class="rounded-lg p-1" @click="guardarEdicionRegional(r.id)">
                <Check class="size-4 text-success" />
              </button>
              <button class="rounded-lg p-1" @click="editandoRegional = null">
                <X class="size-4 text-error" />
              </button>
            </template>
            <template v-else>
              <span class="flex-1 text-sm">{{ r.nombre }}</span>
              <button class="rounded-lg p-1" @click="iniciarEdicionRegional(r.id, r.nombre)">
                <Pencil class="size-4" />
              </button>
              <button class="rounded-lg p-1" @click="regionalAEliminar = { id: r.id, nombre: r.nombre }">
                <Trash2 class="size-4 text-error" />
              </button>
            </template>
          </li>
        </ul>
      </div>

      <div class="bg-surface rounded-lg shadow p-4 space-y-3">
        <h2 class="font-semibold">Ítems de checklist</h2>
        <div class="flex gap-2">
          <input
            v-model="nuevoItem"
            type="text"
            placeholder="Nuevo ítem…"
            class="flex-1 border rounded-lg px-3 py-1.5 text-sm"
            @keyup.enter="agregarItem"
          />
          <button class="bg-primary text-white p-2 rounded-lg shadow-sm" @click="agregarItem">
            <Plus class="size-4" />
          </button>
        </div>
        <ul class="divide-y">
          <li v-for="it in checklistItems" :key="it.id" class="py-2 flex items-center gap-2">
            <template v-if="editandoItem === it.id">
              <input v-model="textoEdicionItem" type="text" class="flex-1 border rounded-lg px-2 py-1 text-sm" />
              <button class="rounded-lg p-1" @click="guardarEdicionItem(it.id)">
                <Check class="size-4 text-success" />
              </button>
              <button class="rounded-lg p-1" @click="editandoItem = null">
                <X class="size-4 text-error" />
              </button>
            </template>
            <template v-else>
              <span class="flex-1 text-sm">{{ it.nombre }}</span>
              <button class="rounded-lg p-1" @click="iniciarEdicionItem(it.id, it.nombre)">
                <Pencil class="size-4" />
              </button>
              <button class="rounded-lg p-1" @click="itemAEliminar = { id: it.id, nombre: it.nombre }">
                <Trash2 class="size-4 text-error" />
              </button>
            </template>
          </li>
        </ul>
      </div>
    </div>

    <ConfirmModal
      :open="!!regionalAEliminar"
      titulo="Eliminar regional"
      :mensaje="`¿Eliminar '${regionalAEliminar?.nombre}'? Esta acción no se puede deshacer.`"
      @cancelar="regionalAEliminar = null"
      @confirmar="confirmarEliminarRegional"
    />
    <ConfirmModal
      :open="!!itemAEliminar"
      titulo="Eliminar ítem de checklist"
      :mensaje="`¿Eliminar '${itemAEliminar?.nombre}'? Esta acción no se puede deshacer.`"
      @cancelar="itemAEliminar = null"
      @confirmar="confirmarEliminarItem"
    />
  </div>
</template>
