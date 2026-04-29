/**
 * 严重度 / 处理状态的统一标签、颜色映射。
 * 所有组件和 store 都从这里引入，避免散落的硬编码字符串和颜色值。
 */

export const SEV_LABELS: Record<string, string> = {
  high: "高危",
  medium: "中危",
  low: "低危",
};

/** 告警/通用流程状态 + 工单看板状态（done 与 completed 同为「已完成」） */
export const STATUS_LABELS: Record<string, string> = {
  pending: "待处理",
  processing: "处理中",
  completed: "已完成",
  review: "待复测",
  done: "已完成",
};

/** 严重度对应的主色（用于徽章文字、图标、色点等） */
export const SEV_COLORS: Record<string, string> = {
  high: "#E07070",
  medium: "#E0A050",
  low: "#5CAD8A",
};

/** 处理状态对应的主色 */
export const STATUS_COLORS: Record<string, string> = {
  pending: "#E07070",
  processing: "#E0A050",
  completed: "#5CAD8A",
  review: "#5A8FD0",
  done: "#5CAD8A",
};

/** 严重度排序权重（high=0 最优先） */
export const SEV_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** 常见病害类型的固定色相（可被 defectCategoryColor 命中覆盖） */
const KNOWN_DEFECT_CATEGORY_HEX: Record<string, string> = {
  裂缝: "#E07070",
  坑槽: "#E0A050",
  沉陷: "#2D5A7B",
  车辙: "#5A8FD0",
  脱空: "#C45C5C",
  空洞: "#D48A40",
  一般疏松: "#2D5A7B",
  严重疏松: "#C97B4A",
  富水: "#3A8AB0",
  其他: "#5CAD8A",
  未分类: "#8A9AAC",
};

/**
 * 为任意病害分类名生成稳定配色（饼图、地图筛选、图例共用）。
 * 优先使用已知表，否则对字符串做确定性哈希取 HSL。
 */
export function defectCategoryColor(name: string): string {
  const k = name.trim();
  if (!k) return KNOWN_DEFECT_CATEGORY_HEX["未分类"];
  const hit = KNOWN_DEFECT_CATEGORY_HEX[k];
  if (hit) return hit;
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) {
    h = Math.imul(h ^ k.charCodeAt(i), 16777619);
  }
  const hue = (h >>> 0) % 360;
  return `hsl(${hue} 52% 44%)`;
}

export const sevLabel = (s: string) => SEV_LABELS[s] ?? s;
export const statusLabel = (s: string) => STATUS_LABELS[s] ?? s;
export const sevColor = (s: string) => SEV_COLORS[s] ?? "#8A9AAC";
export const statusColor = (s: string) => STATUS_COLORS[s] ?? "#8A9AAC";

/** 0–100 分档配色（履约画像、排名条等）：高≥80 / 中≥65 / 低 */
export function scoreTierColor(score: number): string {
  return score >= 80 ? "#5CAD8A" : score >= 65 ? "#E0C050" : "#E07070";
}
