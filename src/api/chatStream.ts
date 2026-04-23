import { getAgentBaseUrl, agentToken, triggerAgentUnauthorized } from './agentClient'

export type ChatStreamEvent =
  | { kind: 'meta'; id_user: number; id_assistant: number; message_id: string; group_id: number }
  | { kind: 'token'; content: string }
  | { kind: 'deepthought'; content: string }
  | { kind: 'title'; content: string }
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
