import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_AGENT_PROXY_TARGET || 'http://47.114.93.164:8000'
  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/agent': {
          target,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/agent/, ''),
        },
      },
    },
  }
})
