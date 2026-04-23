import MarkdownIt from 'markdown-it'

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

/** 对话区 Markdown：安全 HTML 关闭；GFM、换行；自定义知识库引用块 */
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: true,
})

export function renderChatMarkdown(text: string): string {
  if (!text.trim()) return ''

  const { body: rawBody, refsHtml } = stripAndCollectCustomIndex(text)
  let body = rawBody.replace(/\n{3,}/g, '\n\n').trim()
  body = preprocessMetaFooter(body)
  body = promoteShortSectionTitles(body)
  body = preprocessYearStatsLines(body)
  body = preprocessStandardLines(body)

  const mdHtml = md.render(body)
  return mdHtml + refsHtml
}
