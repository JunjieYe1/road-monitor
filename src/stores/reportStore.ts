import { defineStore } from "pinia";
import { computed, ref } from "vue";

export type ReportType = "annual" | "patrol" | "rectify" | "recheck";

export interface ReportHistoryItem {
  id: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  content: string;
}

export const useReportStore = defineStore("report", () => {
  const histories = ref<ReportHistoryItem[]>([]);
  const activeHistoryId = ref<string | null>(null);

  const activeHistory = computed(
    () =>
      histories.value.find((item) => item.id === activeHistoryId.value) ?? null,
  );

  function addHistory(input: Omit<ReportHistoryItem, "id">) {
    const id = `report-${Date.now()}`;
    histories.value.unshift({ id, ...input });
    activeHistoryId.value = id;
  }

  function selectHistory(id: string) {
    activeHistoryId.value = id;
  }

  return {
    histories,
    activeHistoryId,
    activeHistory,
    addHistory,
    selectHistory,
  };
});
