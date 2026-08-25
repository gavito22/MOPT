import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import 'leaflet/dist/leaflet.css'
import './style.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).use(VueQueryPlugin).mount('#app')
