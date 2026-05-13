import { defineStore } from "pinia";
import { ref } from "vue";

export type CanvasViewType =
  | "map"
  | "collect"
  | "report"
  | "compliance"
  | "workorder"
  | "plan"
  | "risk"
  | "assess";
export type AgentMode = "insight" | "collect" | "operations" | "predict";

export interface CanvasTab {
  id: string;
  type: CanvasViewType;
  title: string;
  icon: string;
  closable: boolean;
  props?: Record<string, any>;
}

const VIEW_META: Record<CanvasViewType, { title: string; icon: string }> = {
  map: { title: "全景洞察", icon: "🗺️" },
  collect: { title: "数据入仓", icon: "📋" },
  report: { title: "报告生成", icon: "📄" },
  compliance: { title: "履约画像", icon: "🏆" },
  workorder: { title: "病害工单", icon: "🔧" },
  plan: { title: "计划生成", icon: "📅" },
  risk: { title: "风险预测", icon: "⚠️" },
  assess: { title: "风险评估", icon: "🔍" },
};

/** 暂不可新开页签（仍可切换到已打开的同名页签） */
export function isViewOpenDisabled(type: CanvasViewType): boolean {
  return type === "plan" || type === "assess";
}

/** 画布顶部标签栏禁止切换（灰显）：履约画像、病害工单、风险预测 */
export function isCanvasTabSwitchDisabled(type: CanvasViewType): boolean {
  return type === "compliance" || type === "workorder" || type === "risk";
}

export const useCanvasStore = defineStore("canvas", () => {
  /** 下一次 activeTabId 变化时跳过 Workspace 内「切页清空对话」逻辑（如打开 RAG 引用切到数据入仓） */
  const skipChatResetOnNextTabChange = ref(false);

  const tabs = ref<CanvasTab[]>([
    { id: "map", type: "map", title: "全景洞察", icon: "🗺️", closable: false },
    {
      id: "collect",
      type: "collect",
      title: "数据入仓",
      icon: "📋",
      closable: false,
      props: { embedded: true },
    },
    {
      id: "report",
      type: "report",
      title: "报告生成",
      icon: "📄",
      closable: false,
    },
    {
      id: "compliance",
      type: "compliance",
      title: "履约画像",
      icon: "🏆",
      closable: false,
    },
    {
      id: "workorder",
      type: "workorder",
      title: "病害工单",
      icon: "🔧",
      closable: false,
    },
    { id: "risk", type: "risk", title: "风险预测", icon: "⚠️", closable: false },
  ]);
  const activeTabId = ref<string>("map");
  const agentMode = ref<AgentMode>("insight");

  const agentModeDefaults: Record<AgentMode, CanvasViewType> = {
    insight: "map",
    collect: "collect",
    operations: "workorder",
    predict: "risk",
  };

  const viewModeMap: Record<CanvasViewType, AgentMode> = {
    map: "insight",
    collect: "collect",
    report: "insight",
    compliance: "insight",
    workorder: "operations",
    plan: "operations",
    risk: "predict",
    assess: "predict",
  };

  function setAgentMode(mode: AgentMode) {
    agentMode.value = mode;
    const defaultView = agentModeDefaults[mode];
    const existing = tabs.value.find((t) => t.type === defaultView);
    if (existing) {
      activeTabId.value = existing.id;
    } else {
      pushTab({ type: defaultView });
    }
  }

  function pushTab(opts: {
    type: CanvasViewType;
    title?: string;
    props?: Record<string, any>;
  }) {
    const meta = VIEW_META[opts.type];
    const existing = tabs.value.find((t) => t.type === opts.type);
    if (existing) {
      if (opts.props && Object.keys(opts.props).length) {
        existing.props = { ...existing.props, ...opts.props };
      }
      setActiveTab(existing.id);
      return;
    }
    if (isViewOpenDisabled(opts.type)) return;
    const id = opts.type + "-" + Date.now();
    tabs.value.push({
      id,
      type: opts.type,
      title: opts.title ?? meta.title,
      icon: meta.icon,
      closable: true,
      props: opts.props ?? (opts.type === "collect" ? { embedded: true } : undefined),
    });
    setActiveTab(id);
  }

  function closeTab(id: string) {
    const idx = tabs.value.findIndex((t) => t.id === id);
    if (idx === -1 || !tabs.value[idx].closable) return;
    tabs.value.splice(idx, 1);
    if (activeTabId.value === id) {
      activeTabId.value = tabs.value[Math.max(0, idx - 1)]?.id ?? "map";
    }
  }

  function setActiveTab(id: string) {
    activeTabId.value = id;
    const tab = tabs.value.find((t) => t.id === id);
    if (!tab) return;
    agentMode.value = viewModeMap[tab.type];
  }

  function getActiveTab(): CanvasTab | undefined {
    return tabs.value.find((t) => t.id === activeTabId.value);
  }

  function mergeTabProps(tabId: string, partial: Record<string, unknown>) {
    const t = tabs.value.find((x) => x.id === tabId);
    if (!t) return;
    t.props = { ...t.props, ...partial };
  }

  function requestSkipChatResetOnNextTabChange() {
    skipChatResetOnNextTabChange.value = true;
  }

  function consumeSkipChatResetOnNextTabChange(): boolean {
    if (!skipChatResetOnNextTabChange.value) return false;
    skipChatResetOnNextTabChange.value = false;
    return true;
  }

  /** 切到「数据入仓」且不触发工作台清空对话 */
  function focusCollectTabForCitation() {
    requestSkipChatResetOnNextTabChange();
    const tab = tabs.value.find((t) => t.type === "collect");
    if (tab) setActiveTab(tab.id);
  }

  return {
    tabs,
    activeTabId,
    agentMode,
    setAgentMode,
    pushTab,
    closeTab,
    setActiveTab,
    getActiveTab,
    mergeTabProps,
    requestSkipChatResetOnNextTabChange,
    consumeSkipChatResetOnNextTabChange,
    focusCollectTabForCitation,
    VIEW_META,
  };
});
