import { createRouter, createWebHistory } from 'vue-router'
import { useCurrentUser, authReady } from '@/lib/useCurrentUser'
import Layout from '@/components/Layout.vue'
import LoginPage from '@/pages/LoginPage.vue'
import ViviendasPage from '@/pages/ViviendasPage.vue'
import ConfiguracionPage from '@/pages/ConfiguracionPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage, meta: { public: true } },
    {
      path: '/',
      component: Layout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/viviendas' },
        { path: 'viviendas', name: 'viviendas', component: ViviendasPage },
        { path: 'configuracion', name: 'configuracion', component: ConfiguracionPage },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  await authReady
  const { session } = useCurrentUser()
  if (!session.value) return { name: 'login', query: { redirect: to.fullPath } }
  return true
})

export default router
