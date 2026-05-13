import type { QuerySelectBody } from "../types/querySelect";
import { commaEnvToStringArray } from "../utils/queryNormalize";

/**
 * 演示/静态数据：复测病害导出的地图点位（见 public/data/recheck-alerts.json）。
 * - VITE_USE_RECHECK_ALERTS 为 false 时仅使用 alertStore 内联 mock，不发起 fetch。
 * - VITE_RECHECK_ALERTS_JSON 可覆盖默认 URL（默认 /data/recheck-alerts.json）。
 */
export function getRecheckAlertsJsonPath(): string {
  const raw = import.meta.env.VITE_RECHECK_ALERTS_JSON as string | undefined;
  if (raw && raw.trim()) return raw.trim();
  return "/data/recheck-alerts.json";
}

export function shouldLoadRecheckAlerts(): boolean {
  return import.meta.env.VITE_USE_RECHECK_ALERTS !== "false";
}

/** 为 true 时优先 `POST /query/select` 加载地图点位（需登录 Bearer）；失败则回退 JSON 或内联 mock */
export function shouldUseQuerySelectAlerts(): boolean {
  return import.meta.env.VITE_USE_QUERY_SELECT_ALERTS === "true";
}

/** 从环境变量组装 select 请求体；键可省略表示不按该维度筛选 */
export function buildQuerySelectBody(): QuerySelectBody {
  return {
    years: commaEnvToStringArray(
      import.meta.env.VITE_QUERY_SELECT_YEARS as string | undefined,
    ),
    regions: commaEnvToStringArray(
      import.meta.env.VITE_QUERY_SELECT_REGIONS as string | undefined,
    ),
    road_names: commaEnvToStringArray(
      import.meta.env.VITE_QUERY_SELECT_ROAD_NAMES as string | undefined,
    ),
    disease_types: commaEnvToStringArray(
      import.meta.env.VITE_QUERY_SELECT_DISEASE_TYPES as string | undefined,
    ),
  };
}
