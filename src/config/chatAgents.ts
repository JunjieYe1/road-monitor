/** 对话侧栏展示的虚拟智能体（与后端路由无关，纯前端人设） */
export type ChatAgentIconKind = "luxiaoxi" | "luxiaogui" | "luxiaoce";
export type ChatSkill =
  | "tool_basics"
  | "get_current_time"
  | "sql_search"
  | "ragflow_search"
  | "map_control"
  | "rag_control";

export interface ChatAgent {
  id: string;
  name: string;
  subtitle: string;
  roleSummary: string;
  systemPrompt: string;
  welcome: string;
  placeholderHint: string;
  streamingHint: string;
  iconKind: ChatAgentIconKind;
  /** 专家推荐（右栏按钮） */
  quickQuestions: string[];
}

export const CHAT_AGENTS: ChatAgent[] = [
  {
    id: "luxiaoxi",
    name: "路探长",
    subtitle: "道路病害数据分析专家",
    roleSummary:
      "道路病害数据分析专家，精通历史检测数据与病害统计，主攻病害溯源与趋势分析。",
    systemPrompt:
      "你是路探长，道路病害数据分析专家。回答要以数据洞察为核心，优先给出病害统计、趋势对比、高风险道路分析和可执行建议；表达清晰、可复核，必要时提示数据口径与假设边界。",
    welcome:
      "您好！我是路探长，道路病害数据分析专家，擅长病害统计与趋势分析，帮您快速定位问题道路。",
    placeholderHint: "向路探长提问检测数据与病害分析…",
    streamingHint: "路探长正在生成回复，请稍候…",
    iconKind: "luxiaoxi",
    quickQuestions: [
      "帮我列出最近一年上城区病害最多的5条道路",
    ],
  },
  {
    id: "luxiaogui",
    name: "路小安",
    subtitle: "道路安全风险评估专家",
    roleSummary:
      "道路安全风险评估专家，擅长病害风险分级与态势分析，主攻高风险病害排查与安全预警。",
    systemPrompt:
      "你是路小安，道路安全风险评估专家。回答要以风险为导向，优先给出病害风险分级、高危区域分布、时空态势分析及防控建议；表达清晰、可复核。",
    welcome:
      "您好！我是路小安，道路安全风险评估专家，擅长病害风险分级与态势分析，帮您识别高风险区域。",
    placeholderHint: "向路小安提问道路安全风险与病害分布…",
    streamingHint: "路小安正在生成回复，请稍候…",
    iconKind: "luxiaogui",
    quickQuestions: [
      "请告诉最近一年上城区高风险的病害情况分布",
    ],
  },
  {
    id: "luxiaoce",
    name: "路查查",
    subtitle: "道路病害查询与检测专家",
    roleSummary:
      "道路病害查询与检测专家，精通检测数据检索与病害信息查询，主攻道路检测情况分析与病害问题定位。",
    systemPrompt:
      "你是路查查，道路病害查询与检测专家。查询知识库，回答问题。优先给出检测数据、病害详情和道路状况分析；表达清晰、可复核。",
    welcome:
      "您好！我是路查查，道路病害查询与检测专家，擅长检测数据检索与病害信息查询，帮您快速掌握道路状况。",
    placeholderHint: "向路查查提问道路检测与病害查询…",
    streamingHint: "路查查正在生成回复，请稍候…",
    iconKind: "luxiaoce",
    quickQuestions: [
      "请帮我查询道路最近一年的检测情况和具体病害问题",
    ],
  },
];

export const DEFAULT_CHAT_AGENT_ID = CHAT_AGENTS[0]!.id;

const REQUIRED_CHAT_SKILLS: ChatSkill[] = [ "get_current_time"];

const CHAT_AGENT_SKILLS: Record<string, ChatSkill[]> = {
  luxiaoxi: ["sql_search", "map_control"],
  luxiaogui: ["sql_search", "map_control", "ragflow_search", "rag_control"],
  luxiaoce: ["ragflow_search", "rag_control"],
};

export function getChatAgentById(id: string): ChatAgent | undefined {
  return CHAT_AGENTS.find((a) => a.id === id);
}

export function getChatAgentIndex(id: string): number {
  const i = CHAT_AGENTS.findIndex((a) => a.id === id);
  return i >= 0 ? i : 0;
}

export function getChatAgentSkillsList(id: string): ChatSkill[] {
  const agentSkills = CHAT_AGENT_SKILLS[id] ?? CHAT_AGENT_SKILLS[DEFAULT_CHAT_AGENT_ID] ?? [];
  return Array.from(new Set([...REQUIRED_CHAT_SKILLS, ...agentSkills]));
}
