import MarkdownIt from 'markdown-it'
import type { ChatChartPayload } from './chatChartOptions'
import { parseOneCustomChartBlock } from './extractChatCharts'

/** 对话内图表与左栏序号联动（仅 assistant + 传入时生效） */
export interface ChartCaptionContext {
  messageId: number
  resolveGlobalIndex: (ordinalInMessage: number) => number | null
}

export interface RenderChatMarkdownOptions {
  chartCaptionContext?: ChartCaptionContext
}

/** 知识库引用条目（模型输出的 <custom-index> JSON） */
interface FilePiece {
  indexPath?: string
  indexContent?: string
  indexName?: string
}

interface CustomIndexDoc {
  fileName?: string
  filePiece?: FilePiece[]
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 仅允许 http(s) 外链，其它返回 # */
function safeHref(url: string): string {
  const t = url.trim()
  if (!/^https?:\/\//i.test(t)) return '#'
  return t.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

/** 每条引用一行：summary 单行，展开后在下方显示链接与摘录 */
const CHEV_SVG =
  '<svg class="chat-ref-chev" viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'

function renderCustomIndexHtml(jsonStr: string): string {
  let data: unknown
  try {
    data = JSON.parse(jsonStr.trim())
  } catch {
    return '<div class="chat-ref-block chat-ref-block--error"><span class="chat-ref-heading">引用来源</span><p class="chat-ref-fail">无法解析引用数据</p></div>'
  }
  if (!Array.isArray(data) || data.length === 0) return ''

  const blocks: string[] = []
  blocks.push('<div class="chat-ref-block">')
  blocks.push('<div class="chat-ref-heading">📎 引用来源</div>')
  blocks.push('<div class="chat-ref-rows">')

  for (const raw of data as CustomIndexDoc[]) {
    const fileNamePlain = raw?.fileName?.trim() || '未命名文档'
    const fileName = escapeHtml(fileNamePlain)
    const pieces = Array.isArray(raw?.filePiece) ? raw.filePiece : []

    const pushItem = (pc: FilePiece | null) => {
      const labelPlain = pc?.indexName?.trim() || '片段'
      const label = escapeHtml(labelPlain)
      const href = safeHref(pc?.indexPath || '#')
      const rawContent = (pc?.indexContent || '').trim()
      const snippet = escapeHtml(rawContent)
      const tip = escapeHtml(
        pc ? `${fileNamePlain} · ${labelPlain}` : fileNamePlain,
      )

      blocks.push('<details class="chat-ref-item">')
      blocks.push(
        `<summary class="chat-ref-item-sum" title="${tip}">` +
          '<span class="chat-ref-sum-text">' +
          `<span class="chat-ref-sum-name">${fileName}</span>` +
          (pc
            ? `<span class="chat-ref-sum-sep">·</span><span class="chat-ref-sum-page">${label}</span>`
            : '') +
          '</span>' +
          `<span class="chat-ref-sum-btn" title="展开详情">${CHEV_SVG}</span>` +
          '</summary>',
      )
      blocks.push('<div class="chat-ref-item-body">')
      if (pc && href !== '#') {
        blocks.push(
          `<a class="chat-ref-link" href="${href}" target="_blank" rel="noopener noreferrer">打开 PDF 定位</a>`,
        )
      }
      if (rawContent) {
        blocks.push(`<div class="chat-ref-snippet u-scrollbar-hidden">${snippet}</div>`)
      } else if (!pc || href === '#') {
        blocks.push('<p class="chat-ref-empty">暂无定位链接或摘录</p>')
      }
      blocks.push('</div></details>')
    }

    if (pieces.length === 0) {
      pushItem(null)
    } else {
      for (const pc of pieces) {
        pushItem(pc)
      }
    }
  }

  blocks.push('</div></div>')
  return blocks.join('')
}

/**
 * 独立短行 + 下一行以中文开头 → 视为小节标题（模型常输出纯文本标题无 #）
 * 避免：以标点结尾、年份行、纯数字开头等
 */
function promoteShortSectionTitles(s: string): string {
  return s.replace(/^([^\n#《\-\d\s][^\n]{1,28})\n(?=[\u4e00-\u9fff])/gm, (full, title: string) => {
    const t = title.trim()
    if (/[。；：，、]$/.test(t)) return full
    if (/^\d{4}年/.test(t)) return full
    if (t.length < 3 || t.length > 24) return full
    if (!/^[\u4e00-\u9fff\s\d\-\—·]+$/.test(t)) return full
    return `### ${t}\n`
  })
}

/** 连续「YYYY年：…」行转为 Markdown 列表 */
function preprocessYearStatsLines(s: string): string {
  const lines = s.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^\d{4}年[：:]/.test(line.trim())) {
      while (i < lines.length && /^\d{4}年[：:]/.test(lines[i].trim())) {
        out.push(`- ${lines[i].trim()}`)
        i++
      }
      continue
    }
    out.push(line)
    i++
  }
  return out.join('\n')
}

/** 连续规范标准行（《…》或 1.《…）转为列表 */
function preprocessStandardLines(s: string): string {
  const lines = s.split('\n')
  const out: string[] = []
  let i = 0
  const isStdLine = (t: string) => /^(\d+[\.．、]\s*)?《/.test(t.trim())

  while (i < lines.length) {
    const line = lines[i]
    if (isStdLine(line)) {
      while (i < lines.length && isStdLine(lines[i])) {
        const t = lines[i].trim().replace(/^\d+[\.．、]\s*/, '')
        out.push(`- ${t}`)
        i++
      }
      continue
    }
    out.push(line)
    i++
  }
  return out.join('\n')
}

/** 「数据更新截止时间」单独强调为引用块 */
function preprocessMetaFooter(s: string): string {
  return s.replace(
    /^数据更新截止时间[：:]\s*(.+)$/m,
    (_, rest: string) => `\n\n> **数据更新截止时间：** ${rest.trim()}\n\n`,
  )
}

function stripAndCollectCustomIndex(text: string): { body: string; refsHtml: string } {
  const refChunks: string[] = []
  const re = /<custom-index>\s*([\s\S]*?)\s*<\/custom-index>/gi
  const body = text.replace(re, (_m, inner: string) => {
    const html = renderCustomIndexHtml(inner)
    if (html) refChunks.push(html)
    return '\n\n'
  })
  return { body, refsHtml: refChunks.join('') }
}

function renderCustomPictureHtml(inner: string): string {
  let obj: { src?: string; alt?: string; width?: number }
  try {
    obj = JSON.parse(inner.trim()) as { src?: string; alt?: string; width?: number }
  } catch {
    return '<div class="chat-embed-block chat-embed-block--error">无法解析图片数据</div>'
  }
  const src = typeof obj.src === 'string' ? obj.src.trim() : ''
  const href = safeHref(src)
  if (href === '#') {
    return '<div class="chat-embed-block chat-embed-block--error">图片链接无效或仅支持 http(s)</div>'
  }
  const alt = escapeHtml((obj.alt || '图片').trim())
  const w =
    typeof obj.width === 'number' && obj.width > 0 && obj.width < 1600
      ? Math.round(obj.width)
      : undefined
  const style = w ? ` style="max-width:min(100%,${w}px);height:auto;border-radius:10px"` : ' style="max-width:100%;height:auto;border-radius:10px"'
  return `<div class="chat-picture-wrap"><img class="chat-picture-img" src="${href}" alt="${alt}"${style} loading="lazy" decoding="async" referrerpolicy="no-referrer" /></div>`
}

function renderCustomChartPlaceholder(
  fullOpenTag: string,
  inner: string,
  opts?: {
    ordinalInMessage: number
    chartCaptionContext?: ChartCaptionContext
  },
): string {
  const closeIdx = fullOpenTag.indexOf('>')
  const openThrough =
    closeIdx >= 0 ? fullOpenTag.slice(0, closeIdx + 1) : fullOpenTag
  const payload = parseOneCustomChartBlock(openThrough, inner)
  if (!payload) {
    return '<div class="chat-embed-block chat-embed-block--error">无法解析图表数据</div>'
  }
  const encoded = encodeURIComponent(JSON.stringify(payload as ChatChartPayload))

  let captionHtml = ''
  const ctx = opts?.chartCaptionContext
  if (ctx) {
    const g = ctx.resolveGlobalIndex(opts?.ordinalInMessage ?? 0)
    if (g !== null) {
      captionHtml = `<div class="chat-chart-caption chat-chart-caption--linked">图表已同步至左侧「对话图表」第 ${g} 个</div>`
    } else {
      captionHtml =
        `<div class="chat-chart-caption chat-chart-caption--muted">滚动对话至视窗可见后可同步至左侧栏</div>`
    }
  }

  return `${captionHtml}<div class="chat-chart-host" data-chart-opt="${encoded}" role="img" aria-label="数据图表"></div>`
}

/** 解析模型输出的类 JS 字面量：`title: '…' , description: "…"` */
function matchLooseQuotedField(block: string, key: string): string {
  const re = new RegExp(`${key}\\s*:\\s*(["'])((?:\\\\.|(?!\\1).)*)\\1`, 's')
  const m = block.match(re)
  return m ? m[2].replace(/\\(.)/g, '$1') : ''
}

function extractTopLevelBraceObjects(s: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = -1
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '{') {
      if (depth === 0) start = i
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0 && start >= 0) {
        parts.push(s.slice(start, i + 1))
        start = -1
      }
    }
  }
  return parts
}

function renderCustomFilecardHtml(inner: string): string {
  const block = inner.trim()
  let name = ''
  let byte = 0
  let path = ''
  const n1 = block.match(/name\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/)
  const p1 = block.match(/path\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/)
  if (n1) name = n1[2]
  if (p1) path = p1[2]
  const b1 = block.match(/\bbyte\s*:\s*(\d+)/)
  if (b1) byte = parseInt(b1[1], 10) || 0
  if (!name && !path) {
    try {
      const j = JSON.parse(block.replace(/'/g, '"')) as {
        name?: string
        byte?: number
        path?: string
      }
      if (j.name) name = String(j.name)
      if (j.path) path = String(j.path)
      if (typeof j.byte === 'number') byte = j.byte
    } catch {
      /* ignore */
    }
  }
  const href = safeHref(path)
  const nameEsc = escapeHtml(name || '文件')
  const sizeStr =
    byte > 0
      ? byte < 1024
        ? `${byte} B`
        : byte < 1048576
          ? `${(byte / 1024).toFixed(1)} KB`
          : `${(byte / 1048576).toFixed(2)} MB`
      : ''
  const sizeHtml = sizeStr
    ? `<span class="chat-filecard-meta">${escapeHtml(sizeStr)}</span>`
    : ''
  const link =
    href !== '#'
      ? `<a class="chat-filecard-link" href="${href}" target="_blank" rel="noopener noreferrer">打开文件</a>`
      : '<span class="chat-filecard-mute">链接无效</span>'
  return `<div class="chat-filecard"><span class="chat-filecard-icon" aria-hidden="true">📄</span><div class="chat-filecard-main"><div class="chat-filecard-row"><span class="chat-filecard-name">${nameEsc}</span>${sizeHtml}</div><div class="chat-filecard-actions">${link}</div></div></div>`
}

function renderCustomChainHtml(inner: string): string {
  const blocks = extractTopLevelBraceObjects(inner)
  const rows: { title: string; description: string }[] = []
  for (const b of blocks) {
    const t = matchLooseQuotedField(b, 'title')
    const d = matchLooseQuotedField(b, 'description')
    rows.push({ title: t || '', description: d || '' })
  }
  if (rows.length === 0) {
    const lines = inner.split('\n').map((l) => l.trim()).filter(Boolean)
    for (const line of lines) {
      if (line.startsWith('{')) {
        const t = matchLooseQuotedField(line, 'title')
        const d = matchLooseQuotedField(line, 'description')
        if (t || d) rows.push({ title: t, description: d })
      }
    }
  }
  if (rows.length === 0) {
    return '<div class="chat-embed-block chat-embed-block--error">无法解析流程步骤</div>'
  }
  const items = rows
    .map((r, i) => {
      const isLast = i === rows.length - 1
      const title = escapeHtml(r.title || '步骤')
      const descRaw = (r.description || '').trim()
      const desc = escapeHtml(descRaw)
      const descIsUrl = /^https?:\/\//i.test(descRaw)
      const descHtml = descIsUrl
        ? `<a class="chat-chain-desc-link" href="${safeHref(descRaw)}" target="_blank" rel="noopener noreferrer">${desc}</a>`
        : `<span class="chat-chain-desc">${desc}</span>`
      return `<div class="chat-chain-item${isLast ? ' chat-chain-item--last' : ''}"><span class="chat-chain-dot"></span><div class="chat-chain-body"><div class="chat-chain-title">${title}</div>${descRaw ? `<div class="chat-chain-row">${descHtml}</div>` : ''}</div></div>`
    })
    .join('')
  return `<div class="chat-chain">${items}</div>`
}

function renderEmbedBlock(
  tag: string,
  fullMatch: string,
  inner: string,
  embedOpts?: RenderChatMarkdownOptions & { chartOrdinalInMessage?: number },
): string {
  switch (tag) {
    case 'custom-picture':
      return renderCustomPictureHtml(inner)
    case 'custom-chart': {
      const open = fullMatch.slice(0, fullMatch.indexOf('>') + 1)
      return renderCustomChartPlaceholder(open, inner, {
        ordinalInMessage: embedOpts?.chartOrdinalInMessage ?? 0,
        chartCaptionContext: embedOpts?.chartCaptionContext,
      })
    }
    case 'custom-filecard':
      return renderCustomFilecardHtml(inner)
    case 'custom-chain':
      return renderCustomChainHtml(inner)
    default:
      return ''
  }
}

/**
 * 将正文按 <custom-*> 块切分，避免 md html:false 转义内嵌 HTML
 */
function splitBodyByCustomEmbeds(
  s: string,
  opts?: RenderChatMarkdownOptions,
): { mdChunks: string[]; htmlChunks: string[] } {
  const re =
    /<((?:custom-(?:picture|chart|filecard|chain)))(\s[^>]*)?>([\s\S]*?)<\/\1>/gi
  const mdChunks: string[] = []
  const htmlChunks: string[] = []
  let last = 0
  let m: RegExpExecArray | null
  let chartOrdinalInMessage = 0
  while ((m = re.exec(s)) !== null) {
    mdChunks.push(s.slice(last, m.index))
    const tag = m[1]
    const inner = m[3] ?? ''
    if (tag === 'custom-chart') {
      htmlChunks.push(
        renderEmbedBlock(tag, m[0], inner, {
          ...opts,
          chartOrdinalInMessage: chartOrdinalInMessage++,
        }),
      )
    } else {
      htmlChunks.push(renderEmbedBlock(tag, m[0], inner))
    }
    last = m.index + m[0].length
  }
  mdChunks.push(s.slice(last))
  return { mdChunks, htmlChunks }
}

function applyMdPreprocess(body: string): string {
  let out = body.replace(/\n{3,}/g, '\n\n').trim()
  out = preprocessMetaFooter(out)
  out = promoteShortSectionTitles(out)
  out = preprocessYearStatsLines(out)
  out = preprocessStandardLines(out)
  return out
}

/** 对话区 Markdown：安全 HTML 关闭；GFM、换行；自定义知识库引用块 */
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: true,
})

export function renderChatMarkdown(
  text: string,
  options?: RenderChatMarkdownOptions,
): string {
  if (!text.trim()) return ''

  const { body: rawBody, refsHtml } = stripAndCollectCustomIndex(text)
  const { mdChunks, htmlChunks } = splitBodyByCustomEmbeds(rawBody, options)

  let mdHtml = ''
  for (let i = 0; i < mdChunks.length; i++) {
    const piece = applyMdPreprocess(mdChunks[i])
    mdHtml += md.render(piece || '\n')
    if (i < htmlChunks.length) mdHtml += htmlChunks[i]
  }

  return mdHtml + refsHtml
}
