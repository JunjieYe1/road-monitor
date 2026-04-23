/**
 * 严重度 / 处理状态的统一标签、颜色映射。
 * 所有组件和 store 都从这里引入，避免散落的硬编码字符串和颜色值。
 */

export const SEV_LABELS: Record<string, string> = {
  high:   '高危',
  medium: '中危',
  low:    '低危',
}

/** 告警/通用流程状态 + 工单看板状态（done 与 completed 同为「已完成」） */
export const STATUS_LABELS: Record<string, string> = {
  pending:    '待处理',
  processing: '处理中',
  completed:  '已完成',
  review:     '待验收',
  done:       '已完成',
}

/** 严重度对应的主色（用于徽章文字、图标、色点等） */
export const SEV_COLORS: Record<string, string> = {
  high:   '#E07070',
  medium: '#E0A050',
  low:    '#5CAD8A',
}

/** 处理状态对应的主色 */
export const STATUS_COLORS: Record<string, string> = {
  pending:    '#E07070',
  processing: '#E0A050',
  completed:  '#5CAD8A',
  review:     '#5A8FD0',
  done:       '#5CAD8A',
}

/** 严重度排序权重（high=0 最优先） */
export const SEV_ORDER: Record<string, number> = {
  high: 0, medium: 1, low: 2,
}

export const sevLabel    = (s: string) => SEV_LABELS[s]    ?? s
export const statusLabel = (s: string) => STATUS_LABELS[s] ?? s
export const sevColor    = (s: string) => SEV_COLORS[s]    ?? '#8A9AAC'
export const statusColor = (s: string) => STATUS_COLORS[s] ?? '#8A9AAC'
