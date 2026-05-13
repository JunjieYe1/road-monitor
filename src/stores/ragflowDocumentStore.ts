import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  apiListRagflowDocuments,
  type RagflowDocument,
  type RagflowDocumentListResult,
} from "../api/ragflowDocuments";

const DOCUMENT_PAGE_SIZE = 6;

export const useRagflowDocumentStore = defineStore("ragflowDocument", () => {
  const docs = ref<RagflowDocument[]>([]);
  const total = ref(0);
  const datasetId = ref("");
  const loading = ref(false);
  const error = ref("");
  const page = ref(1);
  const hasLoaded = ref(false);

  const recentDocuments = computed(() => docs.value.slice(0, 3));

  function syncFromListResult(res: RagflowDocumentListResult, nextPage = 1) {
    docs.value = res.docs;
    total.value = res.total;
    datasetId.value = res.dataset_id;
    page.value = nextPage;
    error.value = "";
    hasLoaded.value = true;
  }

  async function loadDocuments(nextPage = 1) {
    if (loading.value) return;
    loading.value = true;
    error.value = "";
    try {
      const res = await apiListRagflowDocuments({
        page: nextPage,
        page_size: DOCUMENT_PAGE_SIZE,
        suffix: "pdf",
        dataset_alias: "default",
      });
      syncFromListResult(res, nextPage);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "知识库文档加载失败";
    } finally {
      loading.value = false;
    }
  }

  return {
    docs,
    total,
    datasetId,
    loading,
    error,
    page,
    hasLoaded,
    recentDocuments,
    loadDocuments,
    syncFromListResult,
  };
});
