<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, Home, Settings, Sun, Moon, LogOut } from '@lucide/vue'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { useDarkMode } from '@/lib/useDarkMode'
import { cn } from '@/lib/utils'

const sidebarOpen = ref(true)
const route = useRoute()
const router = useRouter()
const { session, signOut } = useCurrentUser()
const { isDark, toggle } = useDarkMode()

const userEmail = computed(() => session.value?.user.email ?? '')

async function logout() {
  await signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-neutral">
    <aside
      :class="
        cn(
          'flex flex-col bg-primary text-white transition-all duration-300 shrink-0',
          sidebarOpen ? 'w-64' : 'w-14',
        )
      "
    >
      <div class="flex items-center gap-3 px-4 h-16 border-b border-white/10">
        <button
          class="p-1 rounded-lg hover:bg-white/10"
          @click="sidebarOpen = !sidebarOpen"
          aria-label="Alternar menú"
        >
          <Menu class="size-5" />
        </button>
        <span v-if="sidebarOpen" class="font-bold text-lg truncate">MOPT</span>
      </div>

      <nav class="flex-1 py-4 space-y-1 px-2">
        <RouterLink
          to="/viviendas"
          :class="
            cn(
              'flex items-center gap-3 rounded px-3 py-2 hover:bg-white/10',
              route.path.startsWith('/viviendas') && 'bg-white/15',
            )
          "
        >
          <Home class="size-5 shrink-0" />
          <span v-if="sidebarOpen">Viviendas</span>
        </RouterLink>
        <RouterLink
          to="/configuracion"
          :class="
            cn(
              'flex items-center gap-3 rounded px-3 py-2 hover:bg-white/10',
              route.path.startsWith('/configuracion') && 'bg-white/15',
            )
          "
        >
          <Settings class="size-5 shrink-0" />
          <span v-if="sidebarOpen">Configuración</span>
        </RouterLink>
      </nav>

      <div class="border-t border-white/10 p-2 space-y-1">
        <button
          class="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/10"
          @click="toggle"
        >
          <component :is="isDark ? Sun : Moon" class="size-5 shrink-0" />
          <span v-if="sidebarOpen">{{ isDark ? 'Claro' : 'Oscuro' }}</span>
        </button>
        <button
          class="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/10"
          @click="logout"
        >
          <LogOut class="size-5 shrink-0" />
          <span v-if="sidebarOpen" class="truncate">{{ userEmail || 'Cerrar sesión' }}</span>
        </button>
      </div>
    </aside>

    <main class="flex-1 overflow-y-auto">
      <RouterView />
    </main>
  </div>
</template>
