/** Agent 后端 HTTP 封装：Bearer、401 回调、多种 JSON 包裹解析 */

const TOKEN_KEY = 'road_monitor_agent_token'

/** 与 `vite.config.ts` 中默认代理目标一致，供 GitHub Pages 等无构建变量时可访问公网 API */
const DEFAULT_PUBLIC_AGENT_BASE = 'http://47.114.93.164:8000'

export function getAgentBaseUrl(): string {
  const raw = (import.meta.env.VITE_AGENT_BASE_URL as string | undefined) ?? ''
  let v = String(raw).replace(/\/$/, '')
  if (import.meta.env.PROD && (!v || v === '/agent')) {
    v = DEFAULT_PUBLIC_AGENT_BASE.replace(/\/$/, '')
  }
  return v
}

export const agentToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

let onUnauthorized: (() => void) | null = null
export function setAgentUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

export function triggerAgentUnauthorized() {
  agentToken.clear()
  onUnauthorized?.()
}

function authHeaderInit(): HeadersInit {
  const t = agentToken.get()
  if (!t) return {}
  return { Authorization: `Bearer ${t}` }
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function handleResponse(res: Response): Promise<unknown> {
  const data = await parseBody(res)
  if (res.status === 401) {
    agentToken.clear()
    onUnauthorized?.()
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const d = data as { detail?: string; message?: string } | string | null
    const detail =
      typeof d === 'object' && d && 'detail' in d
        ? (d as { detail?: string }).detail
        : typeof d === 'object' && d && 'message' in d
          ? (d as { message?: string }).message
          : typeof d === 'string'
            ? d
            : res.statusText
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return data
}

/** 统一 unwrap `code/data` 包裹 */
export function unwrapAgentData(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && 'code' in raw && (raw as { code: number }).code === 200 && 'data' in raw) {
    const d = (raw as { data: unknown }).data
    return d && typeof d === 'object' ? (d as Record<string, unknown>) : {}
  }
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
}

export async function agentFetch(path: string, init?: RequestInit): Promise<unknown> {
  const base = getAgentBaseUrl()
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(init?.headers)
  const ah = authHeaderInit() as Record<string, string>
  if (ah.Authorization) headers.set('Authorization', ah.Authorization)
  if (init?.body != null && !headers.has('Content-Type') && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(url, { ...init, headers })
  return handleResponse(res)
}

export function unwrapLoginPayload(raw: unknown): {
  access_token: string
  user_id: string
  username: string
  role: string
} {
  const d = unwrapAgentData(raw) as { access_token?: string; user_id?: string; username?: string; role?: string }
  if (!d.access_token) throw new Error('登录响应无效')
  return {
    access_token: d.access_token,
    user_id: d.user_id ?? '',
    username: d.username ?? '',
    role: d.role ?? 'user',
  }
}

export async function apiLogin(username: string, password: string): Promise<unknown> {
  const base = getAgentBaseUrl()
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await parseBody(res)
  if (res.status === 401 || res.status === 403) {
    const msg =
      typeof data === 'object' && data && 'detail' in data
        ? String((data as { detail: string }).detail)
        : '登录失败'
    throw new Error(msg)
  }
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data && 'detail' in data
        ? String((data as { detail: string }).detail)
        : '登录失败'
    throw new Error(msg)
  }
  return data
}

export interface ConversationListItem {
  key: string
  label: string
  group?: string
  createdAt?: string
  updatedAt?: string
}

export async function apiListConversations(): Promise<ConversationListItem[]> {
  const raw = await agentFetch('/api/conversations')
  const d = unwrapAgentData(raw) as { conversations?: ConversationListItem[] }
  return d.conversations ?? []
}

export async function apiGetMessages(conversationKey: string): Promise<unknown[]> {
  const enc = encodeURIComponent(conversationKey)
  const raw = await agentFetch(`/api/conversations/${enc}/messages`)
  const d = unwrapAgentData(raw) as { messages?: unknown[] }
  return d.messages ?? []
}

export async function apiDeleteConversation(conversationKey: string): Promise<unknown> {
  const enc = encodeURIComponent(conversationKey)
  return agentFetch(`/api/conversations/${enc}`, { method: 'DELETE' })
}

export async function apiMessageLike(body: Record<string, unknown>): Promise<unknown> {
  return agentFetch('/api/messages/like', { method: 'PUT', body: JSON.stringify(body) })
}

export async function apiMessageDislike(body: Record<string, unknown>): Promise<unknown> {
  return agentFetch('/api/messages/dislike', { method: 'PUT', body: JSON.stringify(body) })
}
