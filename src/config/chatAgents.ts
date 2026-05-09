/** 对话侧栏展示的虚拟智能体（与后端路由无关，纯前端人设） */
export type ChatAgentIconKind =
  | "luxiaoxun"
  | "luxiaozhi"
  | "luxiaoce"
  | "luxiaoban";

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
    id: "luxiaoxun",
    name: "路小巡",
    subtitle: "道路智能监测助手",
    welcome:
      "您好！我是路小巡，城市道路智能监测助手。我可以帮您分析道路病害数据、查询告警详情、生成报告、查看履约画像等。请问有什么需要帮助的？",
    placeholderHint: "向路小巡提问，输入 @ 引用功能视图…",
    streamingHint: "路小巡正在生成回复，请稍候…",
    iconKind: "luxiaoxun",
    quickQuestions: [
      "今日高优先级告警有哪些？",
      "上城区道路情况如何？",
      "生成本周维修建议报告",
    ],
  },
  {
    id: "luxiaozhi",
    name: "路小知",
    subtitle: "知识库与规范问答助手",
    welcome:
      "您好！我是路小知，擅长知识库检索与规范条文解读。可协助您梳理巡检标准、文档要点与入仓数据摘要。需要查什么？",
    placeholderHint: "向路小知提问知识库、规范与文档…",
    streamingHint: "路小知正在生成回复，请稍候…",
    iconKind: "luxiaozhi",
    quickQuestions: [
      "当前知识库包含哪些主题文档？",
      "巡检报告入库规范要点有哪些？",
      "知识库最近一次更新在什么时候？",
    ],
  },
  {
    id: "luxiaoce",
    name: "路小策",
    subtitle: "风险预判与策略建议",
    welcome:
      "您好！我是路小策，专注道路风险预判与维修策略。可帮您解读高风险路段、生成预案思路与报告大纲。从哪条路开始？",
    placeholderHint: "向路小策提问风险分析、预案与策略…",
    streamingHint: "路小策正在生成回复，请稍候…",
    iconKind: "luxiaoce",
    quickQuestions: [
      "未来3个月高风险路段有哪些？",
      "解放路一带塌陷风险如何评估？",
      "生成本片区风险预判摘要",
    ],
  },
  {
    id: "luxiaoban",
    name: "路小办",
    subtitle: "工单与运营管理助手",
    welcome:
      "您好！我是路小办，熟悉工单流转与运维调度。可协助跟进处置进度、计划排期与单位协同相关问题。今天办哪一单？",
    placeholderHint: "向路小办提问工单、排期与运营管理…",
    streamingHint: "路小办正在生成回复，请稍候…",
    iconKind: "luxiaoban",
    quickQuestions: [
      "显示当前待处理工单列表",
      "哪些工单已超期未闭环？",
      "生成下月巡检与处置排期建议",
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
