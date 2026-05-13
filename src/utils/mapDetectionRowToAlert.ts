import type { AlertPoint } from "../types/alertPoint";
import { diseaseLevelToSeverity } from "./severity";

/** 检测病害信息汇总表行（中文表头，与 query(3).md 一致） */
export type DetectionRowRaw = Record<string, unknown>;

export const QUERY_ALERT_ID_BASE = 10_000_000;
const QUERY_ALERT_ID_RANGE = 90_000_000;

function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function stableAlertIdFromYearNumber(year: string, number: string): number {
  const key = `${year}\t${number}`;
  return QUERY_ALERT_ID_BASE + (hash32(key) % QUERY_ALERT_ID_RANGE);
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function coerceType(rawType: unknown): string {
  const t = str(rawType).replace(/\r?\n/g, " ").replace(/\s+/g, " ");
  return (t || "未分类").slice(0, 128);
}

/** 检测表行 → `AlertPoint`；坐标非法返回 null */
export function mapDetectionRowToAlert(row: DetectionRowRaw): AlertPoint | null {
  const lat = Number(row["纬度"]);
  const lng = Number(row["经度"]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const year = str(row["年份"]);
  const number = str(row["编号"]);
  if (!year || !number) return null;

  const id = stableAlertIdFromYearNumber(year, number);
  const type = coerceType(row["病害类型"]);
  const levelStr = str(row["风险等级"]);
  const severity = diseaseLevelToSeverity(levelStr || "I");

  const districtRaw = str(row["区域"]);
  const district = districtRaw || "未知区域";

  const road = str(row["道路名称"]);
  const place = str(row["具体位置"]);
  let address = "";
  if (road && place) address = `${road} · ${place}`;
  else address = road || place || "—";

  const timeRaw = str(row["检测日期"]);
  const time = timeRaw || "—";

  const descParts = [`${type}｜编号 ${number}（${year}）`];
  const suggest = str(row["处置建议"]);
  if (suggest) descParts.push(suggest.slice(0, 200));

  const groupNumber = str(row["对应病害群组编号"]);
  const out: AlertPoint = {
    id,
    lat,
    lng,
    type,
    severity,
    district,
    address,
    time,
    status: "pending",
    description: descParts.join(" "),
    defectYear: year,
    defectNumber: number,
  };
  if (groupNumber) out.groupNumber = groupNumber;
  return out;
}
