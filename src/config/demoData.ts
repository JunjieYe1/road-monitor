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
