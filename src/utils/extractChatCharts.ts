import type { ChatChartPayload, ChatChartType } from './chatChartOptions'

/** 与 renderMarkdown 中 custom-chart 开标签解析一致 */
export function parseChartOpenTag(openTag: string): {
  axisXTitle: string
  axisYTitle: string
  type: ChatChartType
} {
  const xm = openTag.match(/\baxisXTitle\s*=\s*(["'])([\s\S]*?)\1/i)
  const ym = openTag.match(/\baxisYTitle\s*=\s*(["'])([\s\S]*?)\1/i)
  const tm = openTag.match(/\btype\s*=\s*(["'])([\s\S]*?)\1/i)
  const typeRaw = (tm?.[2] ?? '').trim().toLowerCase()
  const type: ChatChartType =
    typeRaw === 'pie' || typeRaw === 'bar' || typeRaw === 'line' ? typeRaw : 'line'
  return {
    axisXTitle: (xm?.[2] ?? '').trim(),
    axisYTitle: (ym?.[2] ?? '').trim(),
    type,
  }
}

/**
 * 解析单个 `<custom-chart …>…</custom-chart>` 块（整段匹配 inner + 开标签至 >）
 */
export function parseOneCustomChartBlock(
  fullOpenThroughGt: string,
  inner: string,
): ChatChartPayload | null {
  const openInner =
    fullOpenThroughGt.indexOf('>') >= 0
      ? fullOpenThroughGt.slice(0, fullOpenThroughGt.indexOf('>') + 1)
      : fullOpenThroughGt
  const { axisXTitle, axisYTitle, type } = parseChartOpenTag(openInner)
  try {
    const data = JSON.parse(inner.trim())
    if (!Array.isArray(data)) return null
    const series = data.map((row: { name?: unknown; value?: unknown }) => ({
      name: String(row?.name ?? ''),
      value: Number(row?.value),
    }))
    return { type, axisXTitle, axisYTitle, series }
  } catch {
    return null
  }
}

/**
 * 从原始正文（可含 custom-index 等）中按出现顺序提取所有可解析的 custom-chart 数据。
 * 与对话渲染分段顺序一致。
 */
export function extractCustomChartsFromText(text: string): ChatChartPayload[] {
  const re = /<custom-chart\b(?:[^>]*)>([\s\S]*?)<\/custom-chart>/gi
  const out: ChatChartPayload[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const fullMatch = m[0]
    const inner = m[1] ?? ''
    const openLen = fullMatch.indexOf('>')
    const openPart = openLen >= 0 ? fullMatch.slice(0, openLen + 1) : '<custom-chart>'
    const payload = parseOneCustomChartBlock(openPart, inner)
    if (payload) out.push(payload)
  }
  return out
}
