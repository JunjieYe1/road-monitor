import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

function resolvePublicBase(
  env: ReturnType<typeof loadEnv>,
): string {
  const manual = env.VITE_BASE_PATH?.trim()
  if (manual) return manual === '/' ? '/' : `${manual.replace(/\/$/, '')}/`
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY) {
    const name = process.env.GITHUB_REPOSITORY.split('/')[1]
    if (name) return `/${name}/`
  }
  return '/'
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_AGENT_PROXY_TARGET || 'http://47.114.93.164:8000'
  return {
    base: resolvePublicBase(env),
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
