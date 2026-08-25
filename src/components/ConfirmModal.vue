<script setup lang="ts">
defineProps<{
  open: boolean
  titulo: string
  mensaje: string
}>()

const emit = defineEmits<{ confirmar: []; cancelar: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="emit('cancelar')"
    >
      <div class="bg-surface rounded-lg shadow-lg p-6 w-full max-w-sm space-y-4">
        <h2 class="font-semibold text-lg">{{ titulo }}</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300">{{ mensaje }}</p>
        <div class="flex justify-end gap-2">
          <button class="px-4 py-2 rounded-lg border shadow-sm" @click="emit('cancelar')">Cancelar</button>
          <button
            class="px-4 py-2 rounded-lg shadow-sm bg-error text-white"
            @click="emit('confirmar')"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
