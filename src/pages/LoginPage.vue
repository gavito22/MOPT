<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentUser } from '@/lib/useCurrentUser'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const route = useRoute()
const router = useRouter()
const { signIn } = useCurrentUser()

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await signIn(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/viviendas'
    router.push(redirect)
  } catch (e) {
    error.value = 'Correo o contraseña incorrectos.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral">
    <form
      class="w-full max-w-sm bg-surface rounded-lg shadow p-8 space-y-4"
      @submit.prevent="onSubmit"
    >
      <h1 class="text-xl font-bold text-primary text-center">MOPT — Viviendas</h1>

      <div class="space-y-1">
        <label class="text-sm font-medium">Correo</label>
        <input
          v-model="email"
          type="email"
          required
          class="w-full border rounded px-3 py-2"
        />
      </div>
      <div class="space-y-1">
        <label class="text-sm font-medium">Contraseña</label>
        <input
          v-model="password"
          type="password"
          required
          class="w-full border rounded px-3 py-2"
        />
      </div>

      <p v-if="error" class="text-sm text-error">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-primary text-white rounded-lg shadow-sm py-2 font-medium disabled:opacity-60"
      >
        {{ loading ? 'Ingresando…' : 'Ingresar' }}
      </button>
    </form>
  </div>
</template>
