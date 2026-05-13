import {
  agentFetch,
  agentToken,
  getAgentBaseUrl,
  triggerAgentUnauthorized,
  unwrapAgentData,
} from './agentClient'

export interface ReportRequestBody {
  input?: string
  year?: string
  region?: string
  stream_tokens?: boolean
}

export type ReportStreamEvent =
  | { kind: 'token'; content: string }
  | {
      kind: 'done'
      downloadUrl: string
      filename: string
      reportId?: string
      persistError?: string
    }
  | { kind: 'error'; message: string; traceback?: string }

export interface ReportListItem {
  report_id: string
  user_id?: string
  username?: string | null
  title: string
  request_input?: string | null
  year: string
  region: string
  filename: string
  download_url: string
  file_type?: string
  file_size?: number | null
  status?: string
  created_at?: string | null
  updated_at?: string | null
}

function parseSseDataLine(line: string, onEvent: (event: ReportStreamEvent) => void) {
  if (!line.startsWith('data:')) return
  const jsonStr = line.slice(5).trim()
  if (!jsonStr) return

  try {
    const data = JSON.parse(jsonStr) as Record<string, unknown>
    const type = String(data.type ?? '')

    if (type === 'token') {
      onEvent({ kind: 'token', content: String(data.content ?? '') })
      return
    }

    if (type === 'done') {
      onEvent({
        kind: 'done',
        downloadUrl: String(data.download_url ?? ''),
        filename: String(data.filename ?? '报告.pdf'),
        reportId:
          typeof data.report_id === 'string' ? data.report_id : undefined,
        persistError:
          typeof data.persist_error === 'string'
            ? data.persist_error
            : undefined,
      })
      return
    }

    if (type === 'error') {
      onEvent({
        kind: 'error',
        message: String(data.message ?? '报告生成失败'),
        traceback:
          typeof data.traceback === 'string' ? data.traceback : undefined,
      })
    }
  } catch {
    /* 忽略损坏的 SSE 行，避免中断后续流读取 */
  }
}

function consumeBuffer(
  buffer: string,
  onEvent: (event: ReportStreamEvent) => void,
  flush: boolean,
): string {
  const lines = buffer.split(/\r?\n/)
  const rest = flush ? '' : lines.pop() ?? ''
  for (const line of lines) {
    parseSseDataLine(line, onEvent)
  }
  return rest
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text()
  if (!text) return `HTTP ${res.status}`
  try {
    const json = JSON.parse(text) as { detail?: string; message?: string }
    return json.detail ?? json.message ?? text
  } catch {
    return text
  }
}

export async function streamReport(
  body: ReportRequestBody,
  onEvent: (event: ReportStreamEvent) => void,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const base = getAgentBaseUrl()
  const token = agentToken.get()
  if (!token) throw new Error('未登录')

  const res = await fetch(`${base}/report`, {
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
    throw new Error(await readErrorMessage(res))
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('无响应流')

  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    buffer = consumeBuffer(buffer, onEvent, false)
  }

  buffer += decoder.decode()
  if (buffer) consumeBuffer(buffer, onEvent, true)
}

function normalizeReportItem(raw: unknown): ReportListItem | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const reportId = String(row.report_id ?? '')
  if (!reportId) return null

  return {
    report_id: reportId,
    user_id: typeof row.user_id === 'string' ? row.user_id : undefined,
    username:
      typeof row.username === 'string' || row.username === null
        ? row.username
        : undefined,
    title: String(row.title ?? row.filename ?? '未命名报告'),
    request_input:
      typeof row.request_input === 'string' || row.request_input === null
        ? row.request_input
        : undefined,
    year: String(row.year ?? ''),
    region: String(row.region ?? ''),
    filename: String(row.filename ?? '报告.pdf'),
    download_url: String(row.download_url ?? ''),
    file_type: typeof row.file_type === 'string' ? row.file_type : undefined,
    file_size:
      typeof row.file_size === 'number' && Number.isFinite(row.file_size)
        ? row.file_size
        : row.file_size === null
          ? null
          : undefined,
    status: typeof row.status === 'string' ? row.status : undefined,
    created_at:
      typeof row.created_at === 'string' || row.created_at === null
        ? row.created_at
        : undefined,
    updated_at:
      typeof row.updated_at === 'string' || row.updated_at === null
        ? row.updated_at
        : undefined,
  }
}

export async function apiListReports(userId?: string): Promise<ReportListItem[]> {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : ''
  const raw = await agentFetch(`/api/reports${query}`)
  const data = unwrapAgentData(raw) as { reports?: unknown[] }
  return (data.reports ?? [])
    .map((item) => normalizeReportItem(item))
    .filter((item): item is ReportListItem => item !== null)
}

export async function apiDeleteReport(reportId: string): Promise<unknown> {
  const id = encodeURIComponent(reportId)
  return agentFetch(`/api/reports/${id}`, { method: 'DELETE' })
}
