import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiLogin, agentFetch, agentToken, unwrapLoginPayload } from '../api/agentClient'

export interface AuthUser {
  user_id: string
  username: string
  role: string
  is_superuser?: boolean
  permission_area?: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(agentToken.get())
  const user = ref<AuthUser | null>(null)
  const ready = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  function clearSession() {
    agentToken.clear()
    token.value = null
    user.value = null
  }

  async function restoreSession() {
    if (!agentToken.get()) {
      token.value = null
      user.value = null
      ready.value = true
      return
    }
    token.value = agentToken.get()
    try {
      const raw = await agentFetch('/auth/me')
      const wrap = raw as { code?: number; data?: Record<string, unknown> }
      const d =
        wrap?.code === 200 && wrap.data
          ? wrap.data
          : ({} as Record<string, unknown>)
      if (d.user_id) {
        user.value = {
          user_id: String(d.user_id),
          username: String(d.username ?? ''),
          role: String(d.role ?? 'user'),
          is_superuser: Boolean(d.is_superuser),
          permission_area: (d.permission_area as string | null | undefined) ?? null,
        }
      }
    } catch {
      clearSession()
    } finally {
      ready.value = true
    }
  }

  async function login(username: string, password: string) {
    const raw = await apiLogin(username, password)
    const data = unwrapLoginPayload(raw)
    agentToken.set(data.access_token)
    token.value = data.access_token
    user.value = {
      user_id: data.user_id,
      username: data.username,
      role: data.role,
    }
    await restoreSession()
  }

  async function logout() {
    try {
      await agentFetch('/auth/logout', { method: 'POST', body: '{}' })
    } catch {
      /* 网络失败仍清理本地 */
    }
    clearSession()
  }

  return {
    token,
    user,
    ready,
    isAuthenticated,
    login,
    logout,
    restoreSession,
    clearSession,
  }
})
