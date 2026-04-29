import type { AgentMode, CanvasViewType } from '../stores/canvasStore'

/** 模型在末尾通过 `<ui-context>` 携带的 UI 跳转提示（流式结束后剥离） */
export interface UiContextHint {
  agentMode?: AgentMode
  canvasTab?: CanvasViewType
}

const UI_CTX_RE = /<ui-context\b[^>]*>([\s\S]*?)<\/ui-context>/gi

const AGENT_MODES = new Set<AgentMode>([
  'insight',
  'collect',
  'operations',
  'predict',
])

const CANVAS_TABS = new Set<CanvasViewType>([
  'map',
  'report',
  'compliance',
  'workorder',
  'plan',
  'risk',
  'assess',
])

function parseHintJson(inner: string): UiContextHint | null {
  let raw: unknown
  try {
    raw = JSON.parse(inner.trim())
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const out: UiContextHint = {}
  if (typeof o.agentMode === 'string' && AGENT_MODES.has(o.agentMode as AgentMode)) {
    out.agentMode = o.agentMode as AgentMode
  }
  if (typeof o.canvasTab === 'string' && CANVAS_TABS.has(o.canvasTab as CanvasViewType)) {
    out.canvasTab = o.canvasTab as CanvasViewType
  }
  return Object.keys(out).length ? out : null
}

/**
 * 从助手正文中剥离 `<ui-context>{...}</ui-context>`，并解析为 UI 提示（若有多个块，取最后一次解析成功的结果）。
 */
export function stripUiContextTag(text: string): {
  stripped: string
  hint: UiContextHint | null
} {
  let hint: UiContextHint | null = null
  const stripped = text.replace(UI_CTX_RE, (_full, inner: string) => {
    const h = parseHintJson(inner)
    if (h) hint = h
    return ''
  })
  const normalized = stripped.replace(/\n{3,}/g, '\n\n').trim()
  return { stripped: normalized, hint }
}
