import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { AlertPoint } from "../types/alertPoint";
export type { AlertPoint } from "../types/alertPoint";
import type {
  MapControlDiseaseProportion,
  MapControlPayload,
} from "../api/chatStream";
import { defectCategoryColor } from "../utils/labels";
import { formatLocaleTimeHm } from "../utils/localeFormat";
import { diseaseLevelToSeverity } from "../utils/severity";
import {
  getRecheckAlertsJsonPath,
  shouldLoadRecheckAlerts,
  shouldUseQuerySelectAlerts,
  buildQuerySelectBody,
} from "../config/demoData";
import { querySelect } from "../api/queryDisease";
import { mapDetectionRowToAlert } from "../utils/mapDetectionRowToAlert";

/** 病害分类名与业务数据「病害类型」字段一致，不限于固定枚举 */

interface SeveritySummary {
  high: number;
  medium: number;
  low: number;
}

export interface MapControlDebugSnapshot {
  eventSeq: number;
  phase: "applied" | "restored";
  receivedCount: number;
  itemsLength: number;
  computedSeverity: SeveritySummary;
  sampleLevels: string[];
  timestamp: string;
  /** 后端 `map_control.disease_proportion`，供调试或图表使用 */
  diseaseProportion?: MapControlDiseaseProportion[];
}

const SEV = new Set<AlertPoint["severity"]>(["high", "medium", "low"]);
const ST = new Set<AlertPoint["status"]>([
  "pending",
  "processing",
  "completed",
]);

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function coerceDiseaseType(rawType: unknown, description: unknown): string {
  let t =
    typeof rawType === "string"
      ? rawType.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim()
      : "";
  if (t) return t.slice(0, 128);
  if (typeof description === "string") {
    const head = description.split("｜")[0]?.trim() ?? "";
    if (head) return head.slice(0, 128);
  }
  return "未分类";
}

function parseAlertPointArray(data: unknown): AlertPoint[] {
  if (!Array.isArray(data)) return [];
  const out: AlertPoint[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    const description = item.description;
    const rowType = coerceDiseaseType(item.type, description);
    const id = item.id;
    const lat = item.lat;
    const lng = item.lng;
    const severity = item.severity;
    const district = item.district;
    const address = item.address;
    const time = item.time;
    const status = item.status;
    if (typeof id !== "number" || !Number.isFinite(id)) continue;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (
      typeof severity !== "string" ||
      !SEV.has(severity as AlertPoint["severity"])
    )
      continue;
    if (typeof district !== "string" || typeof address !== "string")
      continue;
    if (typeof time !== "string" || typeof status !== "string") continue;
    if (!ST.has(status as AlertPoint["status"])) continue;
    const row: AlertPoint = {
      id,
      lat,
      lng,
      type: rowType,
      severity: severity as AlertPoint["severity"],
      district,
      address,
      time,
      status: status as AlertPoint["status"],
    };
    if (typeof description === "string" && description.length > 0)
      row.description = description;
    const dy = item.defectYear ?? item.defect_year;
    const dn = item.defectNumber ?? item.defect_number;
    const gn = item.groupNumber ?? item.group_number;
    if (typeof dy === "string" && dy.trim()) row.defectYear = dy.trim();
    if (typeof dn === "string" && dn.trim()) row.defectNumber = dn.trim();
    if (typeof gn === "string" && gn.trim()) row.groupNumber = gn.trim();
    out.push(row);
  }
  return out;
}

function cloneAlerts(rows: AlertPoint[]): AlertPoint[] {
  return rows.map((row) => ({ ...row }));
}

function extractYearFromTime(timeText: string): number | null {
  const m = timeText.match(/(20\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  return Number.isFinite(y) ? y : null;
}

const FALLBACK_ALERTS: AlertPoint[] = [
  {
    id: 1,
    lat: 30.287,
    lng: 120.153,
    type: "裂缝",
    severity: "high",
    district: "上城区",
    address: "延安路与庆春路交叉口",
    time: "08:32",
    status: "pending",
    description: "路面纵向裂缝，长约12m，宽3cm，位于主车道",
  },
  {
    id: 2,
    lat: 30.274,
    lng: 120.147,
    type: "坑槽",
    severity: "high",
    district: "上城区",
    address: "解放路67号附近",
    time: "09:15",
    status: "processing",
    description: "深度约9cm坑槽，面积0.6㎡，危及行车安全",
  },
  {
    id: 3,
    lat: 30.258,
    lng: 120.175,
    type: "沉陷",
    severity: "medium",
    district: "滨江区",
    address: "滨江大道中段",
    time: "10:02",
    status: "pending",
    description: "路面局部沉陷，深度约4cm，范围约3㎡",
  },
  {
    id: 4,
    lat: 30.295,
    lng: 120.13,
    type: "车辙",
    severity: "medium",
    district: "西湖区",
    address: "天目山路西段",
    time: "10:45",
    status: "completed",
    description: "双向车辙，深度约2.5cm，路段长40m",
  },
  {
    id: 5,
    lat: 30.265,
    lng: 120.19,
    type: "裂缝",
    severity: "low",
    district: "滨江区",
    address: "网商路与江陵路交叉口",
    time: "11:20",
    status: "pending",
    description: "路面横向裂缝，轻微，不影响行车",
  },
  {
    id: 6,
    lat: 30.31,
    lng: 120.108,
    type: "坑槽",
    severity: "high",
    district: "西湖区",
    address: "文一西路与紫金港路",
    time: "12:05",
    status: "pending",
    description: "多处连片坑槽，影响行车安全",
  },
  {
    id: 7,
    lat: 30.301,
    lng: 120.16,
    type: "裂缝",
    severity: "medium",
    district: "拱墅区",
    address: "湖墅南路北段",
    time: "13:10",
    status: "processing",
    description: "网状裂缝，面积约2.5㎡，需尽快处理",
  },
  {
    id: 8,
    lat: 30.278,
    lng: 120.205,
    type: "其他",
    severity: "low",
    district: "江干区",
    address: "九和路近艮山东路",
    time: "14:00",
    status: "completed",
    description: "路面标线磨损严重，影响行车指引",
  },
  {
    id: 9,
    lat: 30.248,
    lng: 120.163,
    type: "沉陷",
    severity: "high",
    district: "上城区",
    address: "南山路近雷峰塔路口",
    time: "14:35",
    status: "pending",
    description: "大面积沉陷约6㎡，下方管道存在隐患",
  },
  {
    id: 10,
    lat: 30.32,
    lng: 120.145,
    type: "裂缝",
    severity: "medium",
    district: "拱墅区",
    address: "丰潭路中段",
    time: "15:20",
    status: "processing",
    description: "纵横裂缝交织，雨水渗入路基",
  },
  {
    id: 11,
    lat: 30.24,
    lng: 120.14,
    type: "坑槽",
    severity: "low",
    district: "上城区",
    address: "玉皇山路近八卦路",
    time: "15:55",
    status: "completed",
    description: "小型坑槽已临时修复，待验收",
  },
  {
    id: 12,
    lat: 30.27,
    lng: 120.22,
    type: "车辙",
    severity: "medium",
    district: "江干区",
    address: "秋涛路物流通道",
    time: "16:30",
    status: "pending",
    description: "重载车辙，深约3cm，路段长60m",
  },
];

export const useAlertStore = defineStore("alert", () => {
  const alerts = ref<AlertPoint[]>([...FALLBACK_ALERTS]);
  const baseAlerts = ref<AlertPoint[]>(cloneAlerts(FALLBACK_ALERTS));
  const alertsLoadedFrom = ref<"fallback" | "recheck" | "query">("fallback");
  const hasLoadedBaseAlerts = ref(false);
  const selectedAlert = ref<AlertPoint | null>(null);
  const selectedYear = ref<number>(2025);
  const selectedDistrict = ref<string>("上城区");

  const mapControlCount = ref<number | null>(null);
  const mapControlSeveritySummary = ref<SeveritySummary | null>(null);
  const mapControlDebug = ref<MapControlDebugSnapshot | null>(null);
  const mapControlSnapshot = ref<AlertPoint[] | null>(null);
  let mapControlSeed = 1;

  const filteredAlerts = computed<AlertPoint[]>(() => {
    if (mapControlSnapshot.value) return alerts.value;
    const year = selectedYear.value;
    const district = selectedDistrict.value;
    return alerts.value.filter((a) => {
      const parsedYear = extractYearFromTime(a.time);
      const yearMatched = parsedYear === null ? true : parsedYear === year;
      const districtMatched = district === "全部" ? true : a.district === district;
      return yearMatched && districtMatched;
    });
  });

  const districtOptions = computed<string[]>(() => {
    const uniq = new Set(alerts.value.map((a) => a.district).filter(Boolean));
    const ordered = [...uniq].sort((a, b) => a.localeCompare(b, "zh-CN"));
    const withAll = ["全部", ...ordered.filter((d) => d !== "上城区")];
    return ["上城区", ...withAll.filter((d) => d !== "上城区")];
  });

  const totalCount = computed(() =>
    mapControlCount.value ?? filteredAlerts.value.length,
  );

  function setMapControlCount(count: number | null) {
    mapControlCount.value = count;
  }

  function applyMapControlPayload(payload: MapControlPayload, eventSeq = 0) {
    if (!mapControlSnapshot.value) {
      mapControlSnapshot.value = cloneAlerts(alerts.value);
    }
    const now = formatLocaleTimeHm();
    alerts.value = payload.items.map((item) => ({
      id: mapControlSeed++,
      lat: item.latitude,
      lng: item.longitude,
      type: item.disease_category || "未分类",
      severity: diseaseLevelToSeverity(item.disease_level),
      district: "智能体查询",
      address: `${item.longitude.toFixed(6)}, ${item.latitude.toFixed(6)}`,
      time: now,
      status: "pending",
      description: item.disease_name || item.disease_category || "智能体返回病害点位",
    }));
    const severityCounter: SeveritySummary = { high: 0, medium: 0, low: 0 };
    for (const row of alerts.value) {
      severityCounter[row.severity] += 1;
    }
    mapControlSeveritySummary.value = severityCounter;
    mapControlCount.value = payload.count;
    mapControlDebug.value = {
      eventSeq,
      phase: "applied",
      receivedCount: payload.count,
      itemsLength: payload.items.length,
      computedSeverity: { ...severityCounter },
      sampleLevels: payload.items.slice(0, 3).map((item) => item.disease_level),
      timestamp: new Date().toISOString(),
      ...(payload.disease_proportion?.length
        ? { diseaseProportion: [...payload.disease_proportion] }
        : {}),
    };
    selectedAlert.value = null;
  }

  function restoreAlertsAfterMapControl() {
    if (!mapControlSnapshot.value) return;
    const prevCount = mapControlCount.value ?? 0;
    const prevSeverity = mapControlSeveritySummary.value ?? {
      high: 0,
      medium: 0,
      low: 0,
    };
    alerts.value = cloneAlerts(mapControlSnapshot.value);
    mapControlSnapshot.value = null;
    mapControlCount.value = null;
    mapControlSeveritySummary.value = null;
    mapControlDebug.value = {
      eventSeq: mapControlDebug.value?.eventSeq ?? 0,
      phase: "restored",
      receivedCount: prevCount,
      itemsLength: 0,
      computedSeverity: { ...prevSeverity },
      sampleLevels: [],
      timestamp: new Date().toISOString(),
      diseaseProportion: undefined,
    };
    selectedAlert.value = null;
  }

  const typeDistribution = computed(() => {
    const map: Record<string, number> = {};
    filteredAlerts.value.forEach((a) => {
      map[a.type] = (map[a.type] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
      .map(([name, value]) => ({
        name,
        value,
        color: defectCategoryColor(name),
      }));
  });

  const statusSummary = computed(() => ({
    pending: filteredAlerts.value.filter((a) => a.status === "pending").length,
    processing: filteredAlerts.value.filter((a) => a.status === "processing").length,
    completed: filteredAlerts.value.filter((a) => a.status === "completed").length,
  }));

  const severitySummary = computed<SeveritySummary>(() => {
    if (mapControlSnapshot.value && mapControlSeveritySummary.value) {
      return mapControlSeveritySummary.value;
    }
    return {
      high: filteredAlerts.value.filter((a) => a.severity === "high").length,
      medium: filteredAlerts.value.filter((a) => a.severity === "medium").length,
      low: filteredAlerts.value.filter((a) => a.severity === "low").length,
    };
  });

  function selectAlert(alert: AlertPoint | null) {
    selectedAlert.value = alert;
  }

  async function loadRecheckAlerts(): Promise<void> {
    if (shouldUseQuerySelectAlerts()) {
      try {
        const { items } = await querySelect(buildQuerySelectBody());
        const parsed = items
          .map((row) => mapDetectionRowToAlert(row))
          .filter((x): x is AlertPoint => x !== null);
        if (parsed.length > 0) {
          baseAlerts.value = cloneAlerts(parsed);
          alerts.value = cloneAlerts(parsed);
          alertsLoadedFrom.value = "query";
          hasLoadedBaseAlerts.value = true;
          return;
        }
      } catch {
        /* 回退 JSON 或内联 */
      }
    }

    if (!shouldLoadRecheckAlerts()) {
      baseAlerts.value = cloneAlerts(FALLBACK_ALERTS);
      alerts.value = cloneAlerts(FALLBACK_ALERTS);
      hasLoadedBaseAlerts.value = true;
      return;
    }
    const url = getRecheckAlertsJsonPath();
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: unknown = await res.json();
      const parsed = parseAlertPointArray(json);
      if (parsed.length === 0) throw new Error("empty or invalid payload");
      baseAlerts.value = cloneAlerts(parsed);
      alerts.value = cloneAlerts(parsed);
      alertsLoadedFrom.value = "recheck";
    } catch {
      baseAlerts.value = cloneAlerts(FALLBACK_ALERTS);
      alerts.value = cloneAlerts(FALLBACK_ALERTS);
      alertsLoadedFrom.value = "fallback";
    } finally {
      hasLoadedBaseAlerts.value = true;
    }
  }

  return {
    alerts,
    baseAlerts,
    filteredAlerts,
    alertsLoadedFrom,
    hasLoadedBaseAlerts,
    selectedAlert,
    selectedYear,
    selectedDistrict,
    districtOptions,
    totalCount,
    typeDistribution,
    statusSummary,
    severitySummary,
    selectAlert,
    loadRecheckAlerts,
    mapControlCount,
    mapControlSeveritySummary,
    mapControlDebug,
    setMapControlCount,
    applyMapControlPayload,
    restoreAlertsAfterMapControl,
  };
});
