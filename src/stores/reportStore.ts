import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  apiDeleteReport,
  apiListReports,
  streamReport,
  type ReportListItem,
  type ReportStreamEvent,
} from "../api/report";
import { formatLocaleMdHm } from "../utils/localeFormat";

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

export interface GenerateOptions {
  year: string;
  region: string;
  reportType: ReportType;
  reportTitle: string;
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

  // 报告生成状态（跨 tab 持久）
  const isGenerating = ref(false);
  const stepLog = ref<string[]>([]);
  const generated = ref(false);
  const genTime = ref("");
  const filename = ref("");
  const downloadUrl = ref("");
  const errorMessage = ref("");
  const errorTraceback = ref("");
  const persistError = ref("");
  const isAddingHistory = ref(false);
  const controller = ref<AbortController | null>(null);

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

  // ── 报告生成（跨 tab 持久） ──

  function abortCurrentRequest() {
    controller.value?.abort();
    controller.value = null;
  }

  function resetGenerateState() {
    isGenerating.value = false;
    stepLog.value = [];
    generated.value = false;
    genTime.value = "";
    filename.value = "";
    downloadUrl.value = "";
    errorMessage.value = "";
    errorTraceback.value = "";
    persistError.value = "";
  }

  function normalizeProgressText(content: string): string {
    const trimmed = content.trim();
    if (!trimmed) return "后端正在处理报告任务";
    const title = trimmed.match(/title\s*:\s*(['"])(.*?)\1/s)?.[2]?.trim();
    const description = trimmed
      .match(/description\s*:\s*(['"])(.*?)\1/s)?.[2]
      ?.trim();
    if (title && description) return `${title} ${description}`;
    if (title) return title;
    return trimmed;
  }

  function updateCurrentToken(content: string) {
    const text = normalizeProgressText(content);
    if (stepLog.value[stepLog.value.length - 1] !== text) {
      stepLog.value.push(text);
    }
  }

  async function startGenerate(options: GenerateOptions) {
    abortCurrentRequest();
    resetGenerateState();
    isGenerating.value = true;
    stepLog.value = ["已提交生成任务，等待后端返回进度..."];

    const nextController = new AbortController();
    controller.value = nextController;

    function handleReportEvent(event: ReportStreamEvent) {
      if (event.kind === "token") {
        updateCurrentToken(event.content);
        return;
      }
      if (event.kind === "done") {
        isAddingHistory.value = true;
        filename.value = event.filename;
        downloadUrl.value = event.downloadUrl;
        persistError.value = event.persistError ?? "";
        genTime.value = formatLocaleMdHm();
        generated.value = true;
        isGenerating.value = false;

        upsertHistoryFromDone({
          reportId: event.reportId,
          type: options.reportType,
          title: options.reportTitle,
          generatedAt: genTime.value,
          content: `生成完成：${event.filename}`,
          filename: event.filename,
          downloadUrl: event.downloadUrl,
          year: options.year,
          region: options.region,
        });
        loadReports({ force: true }).finally(() => {
          isAddingHistory.value = false;
        });
        return;
      }
      errorMessage.value = event.message;
      errorTraceback.value = event.traceback ?? "";
      generated.value = false;
      isGenerating.value = false;
    }

    try {
      await streamReport(
        { year: options.year, region: options.region, stream_tokens: true },
        handleReportEvent,
        { signal: nextController.signal },
      );
    } catch (error) {
      if (nextController.signal.aborted) return;
      const message = error instanceof Error ? error.message : "报告生成失败";
      errorMessage.value = message;
      errorTraceback.value = "";
      generated.value = false;
      isGenerating.value = false;
    } finally {
      if (controller.value === nextController) controller.value = null;
      if (!downloadUrl.value && !errorMessage.value) isGenerating.value = false;
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
    isGenerating,
    stepLog,
    generated,
    genTime,
    filename,
    downloadUrl,
    errorMessage,
    errorTraceback,
    persistError,
    isAddingHistory,
    abortCurrentRequest,
    resetGenerateState,
    startGenerate,
  };
});
