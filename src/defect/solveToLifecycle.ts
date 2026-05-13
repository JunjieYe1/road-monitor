import type {
  LifecycleMockBundle,
  LifecyclePhasePayload,
  LifecycleWoPayload,
} from "./lifecycleMocks";

function s(v: unknown): string {
  if (v == null) return "—";
  const t = String(v).trim();
  return t || "—";
}

function wo(p: Partial<LifecycleWoPayload> & Pick<LifecycleWoPayload, "woNo" | "title">): LifecycleWoPayload {
  return {
    woNo: p.woNo,
    title: p.title,
    submittedAt: p.submittedAt ?? "—",
    submittedBy: p.submittedBy ?? "—",
    resultSummary: p.resultSummary ?? "—",
  };
}

/** 由 /query/solve 结果合成与 mock 同构的 `LifecycleMockBundle`（单病害多阶段） */
export function buildLifecycleBundleFromSolve(params: {
  year: string;
  number: string;
  diseaseType: string;
  detectTime: string;
  needsRectification: boolean;
  reviewTotal: number;
  rectificationTotal: number;
  reviewRecords: Record<string, unknown>[];
  rectificationRecords: Record<string, unknown>[];
}): LifecycleMockBundle {
  const phases: LifecyclePhasePayload[] = [];

  phases.push({
    key: "detect",
    label: params.diseaseType || "检测",
    observedAt: params.detectTime,
    changeReason: "检测病害信息汇总表入库记录。",
    workOrders: [
      wo({
        woNo: `DET-${params.number}`,
        title: "检测入库",
        submittedAt: params.detectTime,
        submittedBy: "—",
        resultSummary: `编号 ${params.number}（${params.year}）`,
      }),
    ],
  });

  let idx = 0;
  for (const r of params.reviewRecords) {
    idx += 1;
    const situation = s(r["复测情况"]);
    const t = s(r["复测时间"]);
    phases.push({
      key: `review-${idx}`,
      label: "复测",
      observedAt: t,
      changeReason: "复测病害信息汇总表记录。",
      workOrders: [
        wo({
          woNo: `RC-${params.number}-${idx}`,
          title: "复测",
          submittedAt: t,
          submittedBy: s(r["复测人员"]),
          resultSummary: situation,
        }),
      ],
    });
  }

  let ridx = 0;
  for (const r of params.rectificationRecords) {
    ridx += 1;
    const way = s(r["整改方式"]);
    const loc = s(r["具体位置"]);
    const dt = s(r["整改日期"]);
    phases.push({
      key: `rect-${ridx}`,
      label: way !== "—" ? way : "整改",
      observedAt: dt,
      changeReason: "病害整改信息汇总表记录。",
      workOrders: [
        wo({
          woNo: `ZG-${params.number}-${ridx}`,
          title: "整改",
          submittedAt: dt,
          submittedBy: s(r["属地街道"]),
          resultSummary:
            loc !== "—" ? `${way} · ${loc}` : way,
        }),
      ],
    });
  }

  const activePhaseIdx = Math.max(0, phases.length - 1);

  const analytics: { label: string; value: string }[] = [
    { label: "复测记录", value: `${params.reviewTotal} 条` },
    { label: "整改记录", value: `${params.rectificationTotal} 条` },
    {
      label: "需整改",
      value: params.needsRectification ? "是" : "否",
    },
  ];

  const shareParagraphs = [
    `编号 ${params.number}（${params.year}）：检测 → ${params.reviewTotal} 条复测 → ${params.rectificationTotal} 条整改记录（数据来源：query/solve）。`,
  ];

  const correlationBlurb = [
    params.needsRectification
      ? "命中整改表记录，建议按工单闭环跟踪处置进度。"
      : "未命中整改表或已完成闭环，请以复测与现场记录为准。",
  ];

  return {
    activePhaseIdx,
    phases,
    analytics,
    shareParagraphs,
    correlationBlurb,
  };
}
