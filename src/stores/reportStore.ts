import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  apiDeleteReport,
  apiListReports,
  type ReportListItem,
} from "../api/report";

export type ReportType = "annual" | "patrol" | "rectify" | "recheck";

export interface ReportHistoryItem {
  id: string;
  reportId?: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  content: string;
  filename?: string;
  downloadUrl?: string;
  year?: string;
  region?: string;
  fileType?: string;
  fileSize?: number | null;
  status?: string;
  username?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function formatReportTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

function mapReportListItem(row: ReportListItem): ReportHistoryItem {
  return {
    id: row.report_id,
    reportId: row.report_id,
    type: "annual",
    title: row.title || row.filename || "未命名报告",
    generatedAt: formatReportTime(row.created_at ?? row.updated_at),
    content: `生成完成：${row.filename}`,
    filename: row.filename,
    downloadUrl: row.download_url,
    year: row.year,
    region: row.region,
    fileType: row.file_type,
    fileSize: row.file_size,
    status: row.status,
    username: row.username,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const useReportStore = defineStore("report", () => {
  const histories = ref<ReportHistoryItem[]>([]);
  const activeHistoryId = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref("");
  const hasLoaded = ref(false);

  const activeHistory = computed(
    () =>
      histories.value.find((item) => item.id === activeHistoryId.value) ?? null,
  );

  async function loadReports(options?: { force?: boolean }) {
    if (isLoading.value) return;
    if (hasLoaded.value && !options?.force) return;

    isLoading.value = true;
    error.value = "";
    try {
      const rows = await apiListReports();
      histories.value = rows.map(mapReportListItem);
      hasLoaded.value = true;

      if (
        activeHistoryId.value &&
        !histories.value.some((item) => item.id === activeHistoryId.value)
      ) {
        activeHistoryId.value = histories.value[0]?.id ?? null;
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "加载报告历史失败";
    } finally {
      isLoading.value = false;
    }
  }

  function addHistory(input: Omit<ReportHistoryItem, "id">) {
    const id = input.reportId || `report-${Date.now()}`;
    const next = { id, ...input };
    const existingIndex = histories.value.findIndex((item) => item.id === id);
    if (existingIndex >= 0) {
      histories.value.splice(existingIndex, 1, next);
    } else {
      histories.value.unshift(next);
    }
    activeHistoryId.value = id;
  }

  function upsertHistoryFromDone(input: Omit<ReportHistoryItem, "id">) {
    addHistory(input);
  }

  function selectHistory(id: string) {
    activeHistoryId.value = id;
  }

  async function deleteReport(id: string) {
    const item = histories.value.find((row) => row.id === id);
    const reportId = item?.reportId ?? id;
    if (!reportId) return;

    await apiDeleteReport(reportId);
    histories.value = histories.value.filter((row) => row.id !== id);
    if (activeHistoryId.value === id) {
      activeHistoryId.value = histories.value[0]?.id ?? null;
    }
  }

  return {
    histories,
    activeHistoryId,
    activeHistory,
    isLoading,
    error,
    hasLoaded,
    addHistory,
    upsertHistoryFromDone,
    selectHistory,
    loadReports,
    deleteReport,
  };
});
