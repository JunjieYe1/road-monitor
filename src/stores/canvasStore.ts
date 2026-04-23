import { defineStore } from 'pinia'
import { ref } from 'vue'

export type CanvasViewType = 'map' | 'report' | 'compliance' | 'workorder' | 'plan' | 'risk' | 'assess'
export type AgentMode = 'insight' | 'collect' | 'operations' | 'predict'

export interface CanvasTab {
  id: string
  type: CanvasViewType
  title: string
  icon: string
  closable: boolean
  props?: Record<string, any>
}

const VIEW_META: Record<CanvasViewType, { title: string; icon: string }> = {
  map:        { title: '智能地图',   icon: '🗺️' },
  report:     { title: '报告生成',   icon: '📄' },
  compliance: { title: '履约画像',   icon: '🏆' },
  workorder:  { title: '病害工单',   icon: '🔧' },
  plan:       { title: '计划生成',   icon: '📅' },
  risk:       { title: '风险预测',   icon: '⚠️' },
  assess:     { title: '风险评估',   icon: '🔍' },
}

export const useCanvasStore = defineStore('canvas', () => {
  const tabs = ref<CanvasTab[]>([
    { id: 'map', type: 'map', title: '智能地图', icon: '🗺️', closable: false },
  ])
  const activeTabId = ref<string>('map')
  const agentMode = ref<AgentMode>('insight')

  const agentModeDefaults: Record<AgentMode, CanvasViewType> = {
    insight:    'map',
    collect:    'map',
    operations: 'workorder',
    predict:    'risk',
  }

  function setAgentMode(mode: AgentMode) {
    agentMode.value = mode
    const defaultView = agentModeDefaults[mode]
    const existing = tabs.value.find(t => t.type === defaultView)
    if (existing) {
      activeTabId.value = existing.id
    } else {
      pushTab({ type: defaultView })
    }
  }

  function pushTab(opts: { type: CanvasViewType; title?: string; props?: Record<string, any> }) {
    const meta = VIEW_META[opts.type]
    const existing = tabs.value.find(t => t.type === opts.type)
    if (existing) {
      activeTabId.value = existing.id
      return
    }
    const id = opts.type + '-' + Date.now()
    tabs.value.push({
      id,
      type: opts.type,
      title: opts.title ?? meta.title,
      icon: meta.icon,
      closable: true,
      props: opts.props,
    })
    activeTabId.value = id
  }

  function closeTab(id: string) {
    const idx = tabs.value.findIndex(t => t.id === id)
    if (idx === -1 || !tabs.value[idx].closable) return
    tabs.value.splice(idx, 1)
    if (activeTabId.value === id) {
      activeTabId.value = tabs.value[Math.max(0, idx - 1)]?.id ?? 'map'
    }
  }

  function setActiveTab(id: string) {
    activeTabId.value = id
  }

  function getActiveTab(): CanvasTab | undefined {
    return tabs.value.find(t => t.id === activeTabId.value)
  }

  return {
    tabs, activeTabId, agentMode,
    setAgentMode, pushTab, closeTab, setActiveTab, getActiveTab,
    VIEW_META,
  }
})
