/** 病害状态生命周期与工单支撑数据 — 本期不接 API */

export interface LifecycleWoPayload {
  woNo: string;
  title: string;
  submittedAt: string;
  submittedBy: string;
  resultSummary: string;
  category?: "rectification" | "review" | "mock";
  detailRows?: {
    key?: string;
    label: string;
    value: string;
    kind?: "normal" | "location" | "media";
  }[];
}

export interface LifecyclePhasePayload {
  key: string;
  /** 病害在该时间点的新状态，例如「疏松」「严重疏松」 */
  label: string;
  observedAt: string;
  changeReason: string;
  workOrders: LifecycleWoPayload[];
}

export interface LifecycleMockBundle {
  activePhaseIdx: number;
  phases: LifecyclePhasePayload[];
  analytics: { label: string; value: string }[];
  shareParagraphs: string[];
  /** 预制关联影响说明（可多段） */
  correlationBlurb: string[];
}

const b0: LifecycleMockBundle = {
  activePhaseIdx: 3,
  phases: [
    {
      key: "loose-1",
      label: "疏松",
      observedAt: "2024-03-10 09:15",
      changeReason: "首次巡检发现面层轻度疏松，状态由检测工单确认。",
      workOrders: [
        {
          woNo: "WO-2024-0901",
          title: "巡检发现疏松",
          submittedAt: "2024-03-10 09:15",
          submittedBy: "巡检员 王某",
          resultSummary: "GPR 佐证存在疏松征兆，已完成坐标与影像归档",
        },
        {
          woNo: "WO-2024-0902",
          title: "风险复核",
          submittedAt: "2024-03-10 14:30",
          submittedBy: "评估工程师 刘某",
          resultSummary: "复核为轻度疏松，建议安排小修处置",
        },
      ],
    },
    {
      key: "repair-loose",
      label: "已修复",
      observedAt: "2024-03-12 16:40",
      changeReason: "小修工单提交后，疏松病害被记录为已处置状态。",
      workOrders: [
        {
          woNo: "WO-2024-0903",
          title: "养护队伍进场派单",
          submittedAt: "2024-03-11 08:05",
          submittedBy: "调度员 赵某",
          resultSummary: "已指派杭州市政养护一队，机具与封道方案已报备",
        },
        {
          woNo: "WO-2024-0904",
          title: "局部铣刨与灌缝",
          submittedAt: "2024-03-12 16:40",
          submittedBy: "现场负责人 张某",
          resultSummary: "铣刨 12㎡，基层补强完成，待终凝后开放交通",
        },
      ],
    },
    {
      key: "serious-loose",
      label: "严重疏松",
      observedAt: "2024-04-08 10:20",
      changeReason: "复测工单发现病害扩大，状态由「已修复」回退为「严重疏松」。",
      workOrders: [
        {
          woNo: "WO-2024-0905",
          title: "修后复测",
          submittedAt: "2024-04-08 10:20",
          submittedBy: "复测员 赵某",
          resultSummary: "同点位出现二次疏松，范围扩大至 18㎡",
        },
        {
          woNo: "WO-2024-0906",
          title: "结构加固评审",
          submittedAt: "2024-04-08 15:30",
          submittedBy: "专家组",
          resultSummary: "判定需进行基层注浆与面层重铺",
        },
      ],
    },
    {
      key: "loose-2",
      label: "疏松",
      observedAt: "2024-04-15 11:10",
      changeReason: "结构加固后复测，严重疏松降级为轻度疏松，仍需持续观察。",
      workOrders: [
        {
          woNo: "WO-2024-0907",
          title: "基层注浆加固",
          submittedAt: "2024-04-12 18:00",
          submittedBy: "结构组 马某",
          resultSummary: "注浆 6 孔，完成基层加固与面层重铺",
        },
        {
          woNo: "WO-2024-0908",
          title: "加固后复测",
          submittedAt: "2024-04-15 11:10",
          submittedBy: "复测机构 胡某",
          resultSummary: "病害范围收敛，仍存在局部轻度疏松",
        },
      ],
    },
    {
      key: "watch",
      label: "观察中",
      observedAt: "2024-04-20 09:40",
      changeReason: "养护单位提交观察工单，当前状态转入跟踪观察。",
      workOrders: [
        {
          woNo: "WO-2024-0909",
          title: "观察期巡检",
          submittedAt: "2024-04-20 09:40",
          submittedBy: "巡检员 陈某",
          resultSummary: "点位稳定，建议 30 天后再复测",
        },
      ],
    },
  ],
  analytics: [
    { label: "状态变化", value: "5 次" },
    { label: "关联工单", value: "9 单" },
    { label: "当前状态", value: "观察中" },
  ],
  shareParagraphs: [
    "该点位状态链为「疏松 → 已修复 → 严重疏松 → 疏松 → 观察中」。状态变化均由对应工单提交后的检测或处置结果触发。",
    "以上为演示文稿，数据来源为预制 mock，不作为正式决策依据。",
  ],
  correlationBlurb: [
    "周边 300m 内存在同期养护作业点，需注意交通导流协同。",
    "演示文案：可按距离与等级阈值替换为服务端返回。",
  ],
};

const b1: LifecycleMockBundle = {
  activePhaseIdx: 2,
  phases: [
    {
      key: "cavity",
      label: "空洞",
      observedAt: "2024-02-28 11:22",
      changeReason: "热线转办后现场核查确认空洞。",
      workOrders: [
        {
          woNo: "WO-2024-1001",
          title: "市民热线转办",
          submittedAt: "2024-02-28 11:22",
          submittedBy: "坐席 陈某",
          resultSummary: "坑槽较深，存在安全隐患，转现场核实",
        },
        {
          woNo: "WO-2024-1002",
          title: "工程师到场核查",
          submittedAt: "2024-02-28 15:06",
          submittedBy: "道路工程师 李某",
          resultSummary: "空洞深度约 8cm，需紧急铣刨回填",
        },
      ],
    },
    {
      key: "temporary",
      label: "临时修复",
      observedAt: "2024-03-02 06:10",
      changeReason: "夜间抢修工单提交，状态转为临时修复。",
      workOrders: [
        {
          woNo: "WO-2024-1003",
          title: "夜间抢修",
          submittedAt: "2024-03-02 06:10",
          submittedBy: "夜班班组 郑某",
          resultSummary: "冷补料临时修复完成，白昼安排结构加固工单",
        },
      ],
    },
    {
      key: "loose",
      label: "疏松",
      observedAt: "2024-03-05 18:25",
      changeReason: "结构加固后复测显示空洞消除，但基层仍有疏松。",
      workOrders: [
        {
          woNo: "WO-2024-1004",
          title: "基层注浆加固",
          submittedAt: "2024-03-05 18:25",
          submittedBy: "结构组 马某",
          resultSummary: "注浆已完成，空洞消除但保留疏松观察项",
        },
      ],
    },
    {
      key: "closed",
      label: "已闭环",
      observedAt: "2024-03-08 09:15",
      changeReason: "复检工单通过后进入闭环。",
      workOrders: [
        {
          woNo: "WO-2024-1005",
          title: "闭环复检",
          submittedAt: "2024-03-08 09:15",
          submittedBy: "复测机构",
          resultSummary: "轻度疏松已稳定，可闭环归档",
        },
      ],
    },
  ],
  analytics: [
    { label: "状态变化", value: "4 次" },
    { label: "关联工单", value: "5 单" },
    { label: "当前状态", value: "疏松" },
  ],
  shareParagraphs: [
    "该病害由热线触发，状态链为「空洞 → 临时修复 → 疏松 → 已闭环」。每次状态更新均来自工单提交后的复核或处置结论。",
  ],
  correlationBlurb: [
    "邻近 200m 有另一处中空病害工单，存在一定路基扰动叠加风险（演示推断）。",
  ],
};

const b2: LifecycleMockBundle = {
  activePhaseIdx: 4,
  phases: [
    {
      key: "d1",
      label: "裂缝",
      observedAt: "2024-03-01 08:40",
      changeReason: "春季巡检工单确认裂缝初始状态。",
      workOrders: [
        {
          woNo: "WO-2024-1101",
          title: "春季巡检",
          submittedAt: "2024-03-01 08:40",
          submittedBy: "巡检员 何某",
          resultSummary: "裂缝发育较快，GPS 归档",
        },
      ],
    },
    {
      key: "d2",
      label: "严重裂缝",
      observedAt: "2024-03-02 09:00",
      changeReason: "复核发现裂缝长度增加，状态升级。",
      workOrders: [
        {
          woNo: "WO-2024-1102",
          title: "派单至区养护",
          submittedAt: "2024-03-02 09:00",
          submittedBy: "调度 孙某",
          resultSummary: "已派西湖区责任单位",
        },
        {
          woNo: "WO-2024-1103",
          title: "加密检测",
          submittedAt: "2024-03-03 10:20",
          submittedBy: "检测员 汪某",
          resultSummary: "裂缝长度与宽度均超阈值，建议立即处置",
        },
      ],
    },
    {
      key: "d3",
      label: "已修复",
      observedAt: "2024-03-04 17:22",
      changeReason: "灌缝处置工单完成后，状态转为已修复。",
      workOrders: [
        {
          woNo: "WO-2024-1104",
          title: "灌缝与标线恢复",
          submittedAt: "2024-03-04 17:22",
          submittedBy: "施工员 郭某",
          resultSummary: "灌缝长度 180m，完成标线恢复",
        },
      ],
    },
    {
      key: "d4",
      label: "轻微裂缝",
      observedAt: "2024-03-06 14:08",
      changeReason: "第三方复测仍发现细微裂缝，状态从已修复回退为轻微裂缝。",
      workOrders: [
        {
          woNo: "WO-2024-1105",
          title: "第三方复测",
          submittedAt: "2024-03-06 14:08",
          submittedBy: "复测机构 胡某",
          resultSummary: "指标基本满足规范，但仍存在细微裂缝观察项",
        },
      ],
    },
    {
      key: "d5",
      label: "已闭环",
      observedAt: "2024-03-07 10:55",
      changeReason: "观察期复检通过后归档闭环。",
      workOrders: [
        {
          woNo: "WO-2024-1106",
          title: "资料归档",
          submittedAt: "2024-03-07 10:55",
          submittedBy: "资料员 钱某",
          resultSummary: "影像与材料已电子化归档",
        },
      ],
    },
  ],
  analytics: [
    { label: "状态", value: "已闭环" },
    { label: "关联工单", value: "6 单" },
    { label: "历时", value: "6 天" },
  ],
  shareParagraphs: [
    "本案例展示裂缝从发现、升级、修复、复测回退到最终闭环的状态变化链条。",
  ],
  correlationBlurb: [
    "周边病害密度较低，对当前点位无显著空间集聚（演示）。",
  ],
};

const b3: LifecycleMockBundle = {
  activePhaseIdx: 1,
  phases: [
    {
      key: "x1",
      label: "疏松",
      observedAt: "2024-03-18 07:50",
      changeReason: "车载检测报警后确认局部疏松。",
      workOrders: [
        {
          woNo: "WO-2024-1201",
          title: "车载检测报警",
          submittedAt: "2024-03-18 07:50",
          submittedBy: "检测车系统",
          resultSummary: "IRI 异常峰值，自动建单",
        },
      ],
    },
    {
      key: "x2",
      label: "严重疏松",
      observedAt: "2024-03-18 15:10",
      changeReason: "人工复核显示疏松范围扩大，状态升级为严重疏松。",
      workOrders: [
        {
          woNo: "WO-2024-1202",
          title: "人工复核",
          submittedAt: "2024-03-18 15:10",
          submittedBy: "工程师 周某",
          resultSummary: "确认为严重疏松，待派单",
        },
      ],
    },
    {
      key: "x3",
      label: "待复测",
      observedAt: "—",
      changeReason: "等待后续处置工单与复测工单提交后更新状态。",
      workOrders: [
        {
          woNo: "（待派单）",
          title: "铣刨修复",
          submittedAt: "—",
          submittedBy: "—",
          resultSummary: "等待下一工单提交后更新",
        },
      ],
    },
  ],
  analytics: [
    { label: "当前状态", value: "严重疏松" },
    { label: "已关联工单", value: "2 单" },
  ],
  shareParagraphs: [
    "当前状态链为「疏松 → 严重疏松 → 待复测」。后续只有处置/复测工单提交后才更新病害状态。",
  ],
  correlationBlurb: [
    "同路段 150m 内有中危点，建议合并养护窗口降低封道次数（演示）。",
  ],
};

const b4: LifecycleMockBundle = {
  activePhaseIdx: 2,
  phases: [
    {
      key: "y1",
      label: "坑槽",
      observedAt: "2024-03-08 06:05",
      changeReason: "Drone 航拍筛查确认坑槽簇集。",
      workOrders: [
        {
          woNo: "WO-2024-1301",
          title: "Drone 航拍筛查",
          submittedAt: "2024-03-08 06:05",
          submittedBy: "飞手 朱某",
          resultSummary: "影像识别坑槽簇集",
        },
      ],
    },
    {
      key: "y2",
      label: "严重坑槽",
      observedAt: "2024-03-09 13:42",
      changeReason: "维修方案评审补充现场勘验，确认病害等级上升。",
      workOrders: [
        {
          woNo: "WO-2024-1302",
          title: "维修方案评审",
          submittedAt: "2024-03-09 13:42",
          submittedBy: "设计室 郭某",
          resultSummary: "采用局部面层重铺方案",
        },
        {
          woNo: "WO-2024-1303",
          title: "封道方案报备",
          submittedAt: "2024-03-10 09:30",
          submittedBy: "交安组",
          resultSummary: "严重坑槽需夜间封闭半幅施工",
        },
      ],
    },
    {
      key: "y3",
      label: "已修复",
      observedAt: "2024-03-13 17:58",
      changeReason: "面层重铺工单提交后，坑槽状态转为已修复。",
      workOrders: [
        {
          woNo: "WO-2024-1304",
          title: "面层重铺",
          submittedAt: "2024-03-13 17:58",
          submittedBy: "施工队 宋某",
          resultSummary: "摊铺压实完成，标线待恢复工单",
        },
      ],
    },
    {
      key: "y4",
      label: "观察中",
      observedAt: "—",
      changeReason: "等待标线恢复与复测工单提交后进入下一状态。",
      workOrders: [
        {
          woNo: "WO-2024-1305（拟）",
          title: "标线恢复",
          submittedAt: "—",
          submittedBy: "—",
          resultSummary: "计划中",
        },
      ],
    },
  ],
  analytics: [
    { label: " BIM 关联", value: "无（演示）" },
    { label: "当前状态", value: "已修复" },
  ],
  shareParagraphs: [
    "状态链为「坑槽 → 严重坑槽 → 已修复 → 观察中」，每次变化均由检测、方案、施工或复测工单支撑。",
  ],
  correlationBlurb: ["演示数据。"],
};

const VARIANTS = [b0, b1, b2, b3, b4];

/** 根据病害 id 选一套预制时间轴（与看板工单号 WO-2024-xxxx 可对齐观感） */
export function getLifecycleMockForAlertId(alertId: number): LifecycleMockBundle {
  const i = Math.abs(alertId) % VARIANTS.length;
  return VARIANTS[i]!;
}

export function getLifecycleMockForOverlay(): LifecycleMockBundle {
  return {
    ...b3,
    analytics: [
      { label: "来源", value: "智能体查询叠加" },
      { label: "说明", value: "演示/mock" },
    ],
    correlationBlurb: [
      "该点为地图叠加巡检结果生成，工单链与邻域分析均为演示填充。刷新页面后需从地图重新进入以恢复上下文。",
    ],
  };
}

/** 邻近关联：极简本地规则拼装（非模型） */
export function buildCorrelationSummaryLines(params: {
  nearestMeters: number | null;
  neighborCountShown: number;
  hasHighNeighbor: boolean;
  sameDistrictCount: number;
  mockParagraphs: string[];
}): string[] {
  const lines: string[] = [...params.mockParagraphs];
  if (params.nearestMeters != null && params.nearestMeters < 250 && params.hasHighNeighbor) {
    lines.unshift(
      "近距离存在较高风险邻近点：建议统筹安排交通组织与工序衔接（演示规则文案）。",
    );
  }
  if (params.sameDistrictCount >= 2 && params.neighborCountShown >= 2) {
    lines.unshift(
      "同一片区内检出多点病害，可考虑合并巡检或养护窗口（演示规则文案）。",
    );
  }
  if (
    params.neighborCountShown === 0 &&
    lines.every((x) => !x.includes("周边病害密度较低"))
  ) {
    lines.push("当前告警库范围内未检出其它邻近病害点（或坐标不可用）。");
  }
  return lines.slice(0, 5);
}
