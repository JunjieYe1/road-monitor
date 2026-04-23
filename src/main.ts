import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueTianditu from 'vue-tianditu'
import 'vue-tianditu/lib/style.css'
import router from './router'
import App from './App.vue'
import './styles/global.css'
import { setAgentUnauthorizedHandler } from './api/agentClient'
import { useAuthStore } from './stores/authStore'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

setAgentUnauthorizedHandler(() => {
  const auth = useAuthStore()
  auth.clearSession()
  const full = router.currentRoute.value.fullPath
  if (router.currentRoute.value.meta.requiresAuth) {
    router.replace({ name: 'login', query: { redirect: full } })
  }
})

app.use(router)
app.use(VueTianditu, {
  v: '4.0',
  tk: '7db4d1823b7788dc88066899e23df0d5',
})
app.mount('#app')
