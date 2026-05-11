/** 对话侧栏展示的虚拟智能体（与后端路由无关，纯前端人设） */
export type ChatAgentIconKind = "luxiaoxi" | "luxiaogui" | "luxiaoce";

export interface ChatAgent {
  id: string;
  name: string;
  subtitle: string;
  welcome: string;
  placeholderHint: string;
  streamingHint: string;
  iconKind: ChatAgentIconKind;
  /** 快捷指令（右栏按钮） */
  quickQuestions: string[];
}

export const CHAT_AGENTS: ChatAgent[] = [
  {
    id: "luxiaoxi",
    name: "路小析",
    subtitle: "道路健康数据分析专家",
    welcome:
      "您好！我是路小析，道路健康数据分析专家，精通历年检测数据的「算账小能手」，主攻宏观统计与微观溯源。占位欢迎语，后续可替换为正式版本。",
    placeholderHint: "向路小析提问检测数据与统计分析…",
    streamingHint: "路小析正在生成回复，请稍候…",
    iconKind: "luxiaoxi",
    quickQuestions: [
      "近三年全市PCI优良路率走势？",
      "解放路K2—K4段IRI哪年明显变差？",
      "本月坑槽类病害哪个区最多？",
    ],
  },
  {
    id: "luxiaogui",
    name: "路小规",
    subtitle: "监测标准与知识库专家",
    welcome:
      "您好！我是路小规，监测标准与知识库专家。案头堆满国家标准和技术规范的「学霸老法师」，主攻答疑解惑。占位欢迎语，后续可替换为正式版本。",
    placeholderHint: "向路小规提问标准规范与知识库…",
    streamingHint: "路小规正在生成回复，请稍候…",
    iconKind: "luxiaogui",
    quickQuestions: [
      "沥青路面PCI分级阈值分别是多少？",
      "弯沉检测原始记录表要附哪几项？",
      "坑槽应急填补常用哪条规范条款？",
    ],
  },
  {
    id: "luxiaoce",
    name: "路小策",
    subtitle: "养护决策与业务协同专家",
    welcome:
      "您好！我是路小策，养护决策与业务协同专家。懂工程、懂预算、能排忧解难的「总工程师」，主攻出方案与防风险。占位欢迎语，后续可替换为正式版本。",
    placeholderHint: "向路小策提问养护方案与业务协同…",
    streamingHint: "路小策正在生成回复，请稍候…",
    iconKind: "luxiaoce",
    quickQuestions: [
      "5cm铣刨加铺单方造价大概多少？",
      "两方案工期与封路影响怎么取舍？",
      "超期工单建议先催哪家责任单位？",
    ],
  },
];

export const DEFAULT_CHAT_AGENT_ID = CHAT_AGENTS[0]!.id;

export function getChatAgentById(id: string): ChatAgent | undefined {
  return CHAT_AGENTS.find((a) => a.id === id);
}

export function getChatAgentIndex(id: string): number {
  const i = CHAT_AGENTS.findIndex((a) => a.id === id);
  return i >= 0 ? i : 0;
}
