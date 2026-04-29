import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useChatStore } from './chatStore'
import type { ChatChartPayload } from '../utils/chatChartOptions'
import { extractCustomChartsFromText } from '../utils/extractChatCharts'

export interface ViewportChartEntry {
  /** 视窗内扁平序号，从 1 开始 */
  globalIndex: number
  messageId: number
  ordinalInMessage: number
  payload: ChatChartPayload
}

const CHART_SECTION_EXPANDED_KEY = 'chat-dialog-charts-expanded'

export const useUiStore = defineStore('ui', () => {
  const assistantVisibility = ref<Map<number, boolean>>(new Map())
  const chartSectionExpanded = ref(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(CHART_SECTION_EXPANDED_KEY) === '1'
      : false,
  )

  function setAssistantVisible(messageId: number, visible: boolean) {
    const next = new Map(assistantVisibility.value)
    next.set(messageId, visible)
    assistantVisibility.value = next
  }

  /** 批量由 IntersectionObserver 回调更新多条，减少 Map 抖动 */
  function patchAssistantVisibility(
    updates: { messageId: number; visible: boolean }[],
  ) {
    if (updates.length === 0) return
    const next = new Map(assistantVisibility.value)
    for (const { messageId, visible } of updates) {
      next.set(messageId, visible)
    }
    assistantVisibility.value = next
  }

  function clearAssistantVisibilityForMessages(removedIds: number[]) {
    if (removedIds.length === 0) return
    const next = new Map(assistantVisibility.value)
    for (const id of removedIds) next.delete(id)
    assistantVisibility.value = next
  }

  const viewportChartList = computed((): ViewportChartEntry[] => {
    const chat = useChatStore()
    const list: ViewportChartEntry[] = []
    let gi = 1
    for (const m of chat.messages) {
      if (m.role !== 'assistant') continue
      if (!assistantVisibility.value.get(m.id)) continue
      const content = m.content || ''
      const payloads = extractCustomChartsFromText(content)
      payloads.forEach((payload, ordinalInMessage) => {
        list.push({
          globalIndex: gi++,
          messageId: m.id,
          ordinalInMessage,
          payload,
        })
      })
    }
    return list
  })

  function globalIndexFor(
    messageId: number,
    ordinalInMessage: number,
  ): number | null {
    const row = viewportChartList.value.find(
      (x) =>
        x.messageId === messageId && x.ordinalInMessage === ordinalInMessage,
    )
    return row ? row.globalIndex : null
  }

  function setChartSectionExpanded(on: boolean) {
    chartSectionExpanded.value = on
    try {
      localStorage.setItem(CHART_SECTION_EXPANDED_KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  function toggleChartSectionExpanded() {
    setChartSectionExpanded(!chartSectionExpanded.value)
  }

  /** 点击左栏某项时滚动对话到对应气泡 */
  const scrollToMessageId = ref<number | null>(null)

  function requestScrollToMessage(messageId: number) {
    scrollToMessageId.value = messageId
  }

  function clearScrollRequest() {
    scrollToMessageId.value = null
  }

  return {
    assistantVisibility,
    chartSectionExpanded,
    viewportChartList,
    globalIndexFor,
    setAssistantVisible,
    patchAssistantVisibility,
    clearAssistantVisibilityForMessages,
    setChartSectionExpanded,
    toggleChartSectionExpanded,
    scrollToMessageId,
    requestScrollToMessage,
    clearScrollRequest,
  }
})
