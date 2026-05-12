import { getAgentBaseUrl, agentToken, triggerAgentUnauthorized } from './agentClient'

/** SSE `map_control` 中单条病害点位（与后端字段对齐） */
export interface MapControlItem {
  disease_name: string
  disease_category: string
  disease_level: string
  longitude: number
  latitude: number
}

/** `map_control` 中按病害类别的聚合（与后端字段对齐） */
export interface MapControlDiseaseProportion {
  disease_category: string
  proportion: number
  disease_count: number
}

export interface MapControlPayload {
  count: number
  items: MapControlItem[]
  disease_proportion?: MapControlDiseaseProportion[]
}

/** SSE `rag_control` 单条知识库引用 */
export interface RagControlItem {
  filename: string
  chunk_content: string
  filepage: number
  fileurl: string
}

function parseDiseaseProportion(raw: unknown): MapControlDiseaseProportion[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const out: MapControlDiseaseProportion[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const cat = String(r.disease_category ?? '')
    const prop = Number(r.proportion)
    const cnt = Number(r.disease_count)
    if (!cat || !Number.isFinite(prop) || !Number.isFinite(cnt)) continue
    out.push({ disease_category: cat, proportion: prop, disease_count: cnt })
  }
  return out.length ? out : undefined
}

function parseMapControlPayload(raw: unknown): MapControlPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const itemsRaw = o.items
  if (!Array.isArray(itemsRaw)) return null
  const items: MapControlItem[] = []
  for (const row of itemsRaw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const lng = Number(r.longitude)
    const lat = Number(r.latitude)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
    items.push({
      disease_name: String(r.disease_name ?? ''),
      disease_category: String(r.disease_category ?? ''),
      disease_level: String(r.disease_level ?? ''),
      longitude: lng,
      latitude: lat,
    })
  }
  const count =
    typeof o.count === 'number' && Number.isFinite(o.count) ? o.count : items.length
  const disease_proportion = parseDiseaseProportion(o.disease_proportion)
  return { count, items, ...(disease_proportion ? { disease_proportion } : {}) }
}

function parseRagControlData(raw: unknown): RagControlItem[] {
  if (!Array.isArray(raw)) return []
  const out: RagControlItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const filepage = Number(r.filepage)
    out.push({
      filename: String(r.filename ?? ''),
      chunk_content: String(r.chunk_content ?? ''),
      filepage: Number.isFinite(filepage) ? filepage : 0,
      fileurl: String(r.fileurl ?? ''),
    })
  }
  return out
}

export type ChatStreamEvent =
  | { kind: 'meta'; id_user: number; id_assistant: number; message_id: string; group_id: number }
  | { kind: 'token'; content: string }
  | { kind: 'deepthought'; content: string }
  | { kind: 'title'; content: string }
  | { kind: 'map_control'; data: MapControlPayload }
  | { kind: 'rag_control'; data: RagControlItem[] }
  | { kind: 'done'; message_id?: string; group_id?: number }
  | { kind: 'error'; message: string; traceback?: string; message_id?: string; group_id?: number }

function parseSseDataLine(line: string, onEvent: (e: ChatStreamEvent) => void) {
  if (!line.startsWith('data:')) return
  const jsonStr = line.slice(5).trim()
  if (!jsonStr) return
  try {
    const data = JSON.parse(jsonStr) as Record<string, unknown>
    const hasType = 'type' in data && data.type !== undefined && data.type !== null
    if (!hasType && 'message_id' in data && 'group_id' in data) {
      onEvent({
        kind: 'meta',
        id_user: Number(data.id_user),
        id_assistant: Number(data.id_assistant),
        message_id: String(data.message_id),
        group_id: Number(data.group_id),
      })
      return
    }
    const t = data.type as string
    if (t === 'token') onEvent({ kind: 'token', content: String(data.content ?? '') })
    else if (t === 'deepthought') onEvent({ kind: 'deepthought', content: String(data.content ?? '') })
    else if (t === 'title') onEvent({ kind: 'title', content: String(data.content ?? '') })
    else if (t === 'done')
      onEvent({ kind: 'done', message_id: data.message_id as string | undefined, group_id: data.group_id as number | undefined })
    else if (t === 'error')
      onEvent({
        kind: 'error',
        message: String(data.message ?? '错误'),
        traceback: data.traceback as string | undefined,
        message_id: data.message_id as string | undefined,
        group_id: data.group_id as number | undefined,
      })
    else if (t === 'map_control') {
      const parsed = parseMapControlPayload(data.data)
      if (parsed) onEvent({ kind: 'map_control', data: parsed })
    } else if (t === 'rag_control') {
      const items = parseRagControlData(data.data)
      if (items.length) onEvent({ kind: 'rag_control', data: items })
    }
  } catch {
    /* 忽略损坏行 */
  }
}

function consumeBuffer(buf: string, onEvent: (e: ChatStreamEvent) => void, flush: boolean): string {
  const lines = buf.split(/\r?\n/)
  const rest = flush ? '' : lines.pop() ?? ''
  for (const line of lines) {
    parseSseDataLine(line, onEvent)
  }
  return rest
}

export async function streamChatTokens(
  body: Record<string, unknown>,
  onEvent: (e: ChatStreamEvent) => void,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const base = getAgentBaseUrl()
  const token = agentToken.get()
  if (!token) throw new Error('未登录')

  const res = await fetch(`${base}/chat_stream_tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: options?.signal,
  })

  if (res.status === 401) {
    triggerAgentUnauthorized()
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const t = await res.text()
    let msg = t
    try {
      const j = JSON.parse(t) as { detail?: string }
      msg = j.detail ?? t
    } catch {
      /* */
    }
    throw new Error(msg || `HTTP ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('无响应流')

  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    buf = consumeBuffer(buf, onEvent, false)
  }
  buf += dec.decode()
  if (buf) consumeBuffer(buf, onEvent, true)
}
