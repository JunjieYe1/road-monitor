import { defineStore } from "pinia";
import { ref } from "vue";
import type { RagControlItem } from "../api/chatStream";

/** 当前在左栏/中间预览区展示的 RAG 引用 */
export interface RagCitationActive {
  fileurl: string;
  filepage: number;
  filename: string;
  chunk_content: string;
  /** 来源助手气泡 id，供「定位到对话」 */
  sourceMessageId?: number;
}

function isAllowedHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** 若 `fileurl` 已含 #page= 则不再追加 */
export function buildPdfViewerSrc(fileurl: string, filepage: number): string {
  if (!fileurl.trim()) return "";
  if (/#page=\d+/i.test(fileurl)) return fileurl;
  if (filepage > 0) {
    const sep = fileurl.includes("#") ? "&" : "#";
    return `${fileurl}${sep}page=${filepage}`;
  }
  return fileurl;
}

export const useRagCitationStore = defineStore("ragCitation", () => {
  const active = ref<RagCitationActive | null>(null);

  function openFromRagItem(
    item: RagControlItem,
    sourceMessageId?: number,
  ): boolean {
    const url = String(item.fileurl ?? "").trim();
    if (!url || !isAllowedHttpUrl(url)) return false;
    active.value = {
      fileurl: url,
      filepage: Number.isFinite(item.filepage) ? item.filepage : 0,
      filename: String(item.filename ?? ""),
      chunk_content: String(item.chunk_content ?? ""),
      ...(sourceMessageId != null ? { sourceMessageId } : {}),
    };
    return true;
  }

  function clear() {
    active.value = null;
  }

  return {
    active,
    openFromRagItem,
    clear,
  };
});
