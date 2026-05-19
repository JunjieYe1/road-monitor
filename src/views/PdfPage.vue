<template>
  <div class="pdf-page" :class="{ embedded }">
    <header class="pdf-header neu-card">
      <button v-if="!embedded" class="back-btn" @click="goBackToWorkspace">
        <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
          <path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
        返回工作台
      </button>
      <div class="header-title">
        <span class="deco">◆</span>
        <span class="genshin-title pdf-title-black">PDF 检测报告智能提取 · 知识库管理</span>
        <span class="deco">◆</span>
      </div>
      <span class="header-time">{{ currentTime }}</span>
    </header>

    <div class="pdf-body u-scrollbar-hidden" ref="pdfBodyRef" :style="{ overflowY, overflowX }" @mouseenter="onEnter"
      @mouseleave="onLeave">
      <section
        v-if="ragCitation.active"
        class="neu-card pdf-section citation-preview-wrap"
      >
        <div class="citation-preview-head">
          <div class="cph-title">
            <span class="cph-label">引用预览</span>
            <span class="cph-name">{{ ragCitation.active.filename }}</span>
            <span v-if="ragCitation.active.filepage > 0" class="cph-page"
              >第 {{ ragCitation.active.filepage }} 页</span
            >
          </div>
          <div class="cph-actions">
            <button type="button" class="entry-btn" @click="openCitationInNewWindow">
              新窗口打开
            </button>
            <button type="button" class="entry-btn" @click="ragCitation.clear()">
              关闭预览
            </button>
          </div>
        </div>
        <p v-if="citationSnippet" class="citation-chunk-snippet">
          {{ citationSnippet }}
        </p>
        <div class="citation-iframe-wrap">
          <iframe
            :key="citationViewerSrc"
            class="citation-iframe"
            title="引用文档预览"
            :src="citationViewerSrc"
          />
        </div>
        <p class="citation-iframe-hint">
          若上方空白，可能是站点禁止嵌入浏览；请使用「新窗口打开」。
        </p>
      </section>
      <!-- 知识库列表 -->
      <section class="neu-card pdf-section">
        <div class="sec-title-row">
          <div class="sec-title">
            知识库列表
            <span class="kb-pick-hint">（可多选，检索范围将随提问提交）</span>
          </div>
          <div class="entry-actions">
            <button class="entry-btn" type="button" title="功能建设中">
              数据录入
            </button>
            <button class="entry-btn" type="button" title="功能建设中">
              Excel导入
            </button>
            <button class="kb-reload-btn" type="button" :disabled="documentsLoading" @click="loadDocuments(documentPage)">
              {{ documentsLoading ? "加载中..." : "刷新列表" }}
            </button>
          </div>
        </div>
        <div class="kb-toolbar">
          <div class="kb-query-info">
            <span>数据集：{{ documentDatasetId || "default" }}</span>
            <span>共 {{ documentTotal }} 份 PDF 文档</span>
          </div>
        </div>

        <div v-if="documentsError" class="kb-state kb-error">
          <span>{{ documentsError }}</span>
          <button type="button" @click="loadDocuments(documentPage)">刷新</button>
        </div>
        <div v-else-if="documentsLoading && !displayedKbList.length" class="kb-state">
          正在加载知识库文档...
        </div>
        <div v-else-if="!displayedKbList.length" class="kb-state">
          暂无 PDF 文档，可使用下方 PDF 导入入口查看模拟流程。
        </div>

        <div class="kb-list">
          <div
            v-for="kb in displayedKbList"
            :key="kb.id"
            class="kb-card"
            :class="{ active: chatStore.isKbSelected(kb.id), 'kb-card-local': isLocalDocument(kb) }"
          >
            <div class="kb-year" :title="kb.name">{{ kb.name }}</div>
            <div class="kb-meta">
              <span>📄 {{ kb.suffixLabel }} 文档</span>
              <span>🧾 {{ kb.sizeLabel }}</span>
              <span>🔖 ID：{{ shortId(kb.id) }}</span>
              <span class="run-line">状态：<em :class="runClass(kb.run)">{{ runLabel(kb.run) }}</em></span>
            </div>
            <!-- <div class="kb-badge" :class="chatStore.isKbSelected(kb.id) ? 'kb-on' : 'kb-off'">
              {{ chatStore.isKbSelected(kb.id) ? "● 已选入对话" : "○ 未选" }}
            </div> -->
            <div class="kb-btns">
              <!-- <button class="kb-btn activate" type="button" @click="toggleKbPick(kb)">
                {{ chatStore.isKbSelected(kb.id) ? "取消选择" : "选择" }}
              </button> -->
              <button
                class="kb-btn view"
                type="button"
                :disabled="isLocalDocument(kb)"
                :title="isLocalDocument(kb) ? '本地模拟文档暂无真实切片' : '查看文档切片'"
                @click="openChunksDialog(kb)"
              >
                查看切片
              </button>
              <button class="kb-btn del" type="button" disabled title="api.md 未提供删除接口">
                删除
              </button>
            </div>
          </div>
          <div class="kb-card add-kb" @click="showUpload = !showUpload">
            <span class="add-plus">＋</span>
            <span class="add-text">PDF导入</span>
          </div>
        </div>

        <div class="kb-pagination">
          <button class="page-btn" type="button" :disabled="documentsLoading || documentPage <= 1"
            @click="changeDocumentPage(documentPage - 1)">
            上一页
          </button>
          <span class="page-info">第 {{ documentPage }} / {{ documentPageCount }} 页</span>
          <button class="page-btn" type="button" :disabled="documentsLoading || documentPage >= documentPageCount"
            @click="changeDocumentPage(documentPage + 1)">
            下一页
          </button>
        </div>
      </section>

      <!-- 上传区 -->
      <transition name="slide-down">
        <section v-if="showUpload" class="neu-card pdf-section">
          <div class="sec-title">上传新报告</div>

          <!-- 数据归属时间暂时隐藏，后续需要按年份/季度归档时恢复
          <div class="time-row">
            <span class="field-req">数据归属时间范围 *</span>
            <select v-model="selYear" class="neu-inset range-sel">
              <option v-for="y in years" :key="y" :value="y">{{ y }} 年</option>
            </select>
            <select v-model="selQ" class="neu-inset range-sel">
              <option value="full">全年</option>
              <option value="Q1">Q1（1-3月）</option>
              <option value="Q2">Q2（4-6月）</option>
              <option value="Q3">Q3（7-9月）</option>
              <option value="Q4">Q4（10-12月）</option>
            </select>
            <span class="req-hint">* 仅用于本次上传记录展示</span>
          </div>
          -->

          <div class="drop-zone" :class="{ dragover: isDrag }" @dragover.prevent="isDrag = true"
            @dragleave="isDrag = false" @drop.prevent="onDrop" @click="fileEl?.click()">
            <input ref="fileEl" type="file" accept=".pdf" multiple style="display: none" @change="onFile" />
            <div class="dz-icon">📄</div>
            <div class="dz-text">拖拽 PDF 至此，或点击选择</div>
            <div class="dz-sub">支持批量上传 · 仅限 PDF</div>
          </div>

          <div v-if="uploadListRows.length" class="file-list-wrap">
            <div class="file-list-head">
              <span class="file-list-title">已上传文件</span>
              <span class="file-list-count">共 {{ uploadListRows.length }} 个</span>
            </div>
            <ul class="file-list" role="list">
              <li v-for="row in uploadListRows" :key="row.key" class="file-row">
                <div class="file-row-lead" aria-hidden="true">
                  <span class="file-row-icon">PDF</span>
                </div>
                <div class="file-row-main">
                  <span class="fi-name" :title="row.name">{{ row.name }}</span>
                  <span class="fi-size-badge">{{ sizeLabelForRow(row) }}</span>
                </div>
                <button type="button" class="fi-del" title="从列表中移除" aria-label="移除该文件"
                  @click.stop.prevent="removeUploadRow(row)">
                  <span class="fi-del-x" aria-hidden="true">×</span>
                </button>
              </li>
            </ul>
          </div>

          <button class="submit-btn" :disabled="!canStartProcess || !selYear || isProcesing" @click="startProcess">
            {{ isProcesing ? "上传中..." : "开始上传同步" }}
          </button>
        </section>
      </transition>

      <!-- 上传同步进度 -->
      <transition name="slide-down">
        <section v-if="showProgress" class="neu-card pdf-section">
          <div class="sec-title">上传同步进度</div>

          <!-- 四步流程 -->
          <div class="flow-wrap">
            <div v-for="(step, i) in steps" :key="i" class="flow-item">
              <div class="flow-node" :class="nodeClass(i)">
                <div class="flow-circle">
                  <span v-if="i < doneSteps">✓</span>
                  <span v-else-if="i === doneSteps && isProcesing" class="spin-dot"></span>
                  <span v-else>{{ i + 1 }}</span>
                </div>
                <div class="flow-info">
                  <div class="flow-title">{{ step.title }}</div>
                  <div class="flow-desc">{{ step.desc }}</div>
                </div>
              </div>
              <div v-if="i < steps.length - 1" class="flow-arrow" :class="{ lit: i < doneSteps }">
                <svg viewBox="0 0 40 12" width="40" height="12">
                  <path d="M0 6h32M28 2l6 4-6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                    stroke-linejoin="round" fill="none" />
                </svg>
              </div>
            </div>
          </div>

          <div class="prog-row">
            <span class="prog-label">总进度</span>
            <div class="prog-track">
              <div class="prog-fill" :style="{ width: progress + '%' }"></div>
            </div>
            <span class="prog-pct">{{ Math.round(progress) }}%</span>
          </div>

          <transition name="done-pop">
            <div v-if="isDone" class="done-box">
              <span class="done-emoji">✅</span>
              <div class="done-info">
                <div class="done-title">
                  文档已上传至知识库
                </div>
                <div class="done-sub">
                  已同步 <strong>{{ uploadedDocuments.length }}</strong> 份 PDF；解析状态以知识库列表为准。
                </div>
              </div>
              <button class="start-btn" @click="goAsk">返回对话提问 →</button>
            </div>
          </transition>

          <div v-if="uploadError" class="upload-error-box">
            <div class="upload-error-title">上传失败</div>
            <div class="upload-error-text">{{ uploadError }}</div>
            <button class="retry-upload-btn" type="button" :disabled="isProcesing" @click="startProcess">
              重新上传
            </button>
          </div>
        </section>
      </transition>

      <transition name="slide-down">
        <section v-if="showImportedData" class="neu-card pdf-section">
          <div class="sec-title">上传同步结果</div>
          <div class="mock-source">
            来源：{{ importedSourceName || "本次上传文件" }}
          </div>
          <div class="summary-grid">
            <div class="summary-item neu-card-sm">
              <div class="si-label">上传文档数</div>
              <div class="si-value">{{ uploadedDocuments.length }}</div>
            </div>
            <div class="summary-item neu-card-sm">
              <div class="si-label">文档总大小</div>
              <div class="si-value">{{ uploadedSizeLabel }}</div>
            </div>
            <div class="summary-item neu-card-sm">
              <div class="si-label">解析提交</div>
              <div class="si-value">{{ uploadParseStarted ? "已提交" : "未提交" }}</div>
            </div>
            <div class="summary-item neu-card-sm">
              <div class="si-label">数据集</div>
              <div class="si-value si-value-small">{{ uploadDatasetId || documentDatasetId || "默认" }}</div>
            </div>
          </div>
          <div v-if="uploadParseError" class="upload-warn">
            解析提交提示：{{ uploadParseError }}
          </div>
          <div class="sub-block-title">上传文档</div>
          <div class="table-wrap">
            <table class="mock-table">
              <thead>
                <tr>
                  <th>文档名称</th>
                  <th>文档 ID</th>
                  <th>大小</th>
                  <th>后缀</th>
                  <th>解析状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in uploadedDocuments" :key="row.id">
                  <td>{{ row.name }}</td>
                  <td>{{ shortId(row.id) }}</td>
                  <td>{{ row.size == null ? "未知大小" : fmtSize(row.size) }}</td>
                  <td>{{ (row.suffix || "pdf").toUpperCase() }}</td>
                  <td>{{ runLabel(row.run) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </transition>
    </div>

    <transition name="modal-fade">
      <div v-if="showChunksDialog" class="modal-overlay" @click.self="closeChunksDialog">
        <div class="modal-box neu-card chunks-modal" role="dialog" aria-modal="true">
          <div class="modal-head">
            <div>
              <div class="modal-title">文档切片</div>
              <div class="modal-subtitle" :title="activeChunkDocument?.name">
                {{ activeChunkDocument?.name || "未选择文档" }}
              </div>
            </div>
            <button class="modal-close" type="button" aria-label="关闭切片弹窗" @click="closeChunksDialog">×</button>
          </div>

          <div class="chunk-meta-row">
            <span>共 {{ chunkTotal }} 条切片</span>
            <span v-if="chunkDatasetId">数据集：{{ chunkDatasetId }}</span>
          </div>

          <div v-if="chunksError" class="kb-state kb-error">
            <span>{{ chunksError }}</span>
            <button type="button" @click="loadChunks(chunkPage)">刷新</button>
          </div>
          <div v-else-if="chunksLoading && !chunkList.length" class="kb-state">
            正在加载文档切片...
          </div>
          <div v-else-if="!chunkList.length" class="kb-state">
            当前文档暂无切片内容。
          </div>
          <div v-else class="chunk-list u-scrollbar-hidden">
            <article v-for="chunk in chunkList" :key="chunk.id" class="chunk-item neu-card-sm">
              <div class="chunk-title">切片 {{ shortId(chunk.id) }}</div>
              <p>{{ chunk.content || "（空内容）" }}</p>
            </article>
          </div>

          <div class="kb-pagination chunk-pagination">
            <button class="page-btn" type="button" :disabled="chunksLoading || chunkPage <= 1"
              @click="changeChunkPage(chunkPage - 1)">
              上一页
            </button>
            <span class="page-info">第 {{ chunkPage }} / {{ chunkPageCount }} 页</span>
            <button class="page-btn" type="button" :disabled="chunksLoading || chunkPage >= chunkPageCount"
              @click="changeChunkPage(chunkPage + 1)">
              下一页
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useAdaptiveVerticalScroll } from "../composables/useAdaptiveVerticalScroll";
import { useRouter } from "vue-router";
import { useChatStore } from "../stores/chatStore";
import { useCanvasStore } from "../stores/canvasStore";
import {
  useRagCitationStore,
  buildPdfViewerSrc,
} from "../stores/ragCitationStore";
import { useRagflowDocumentStore } from "../stores/ragflowDocumentStore";
import { formatLocaleDateTimeClock } from "../utils/localeFormat";
import {
  apiListRagflowDocumentChunks,
  apiListRagflowDocuments,
  apiUploadRagflowDocuments,
  type RagflowChunk,
  type RagflowDocument,
} from "../api/ragflowDocuments";

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
});
const router = useRouter();
const chatStore = useChatStore();
const canvasStore = useCanvasStore();
const ragCitation = useRagCitationStore();
const ragflowDocumentStore = useRagflowDocumentStore();
const embedded = computed(() => props.embedded);

const citationViewerSrc = computed(() => {
  const a = ragCitation.active;
  if (!a) return "";
  return buildPdfViewerSrc(a.fileurl, a.filepage);
});

const citationSnippet = computed(() => {
  const t = ragCitation.active?.chunk_content ?? "";
  if (!t) return "";
  return t.length > 220 ? `${t.slice(0, 220)}…` : t;
});

function openCitationInNewWindow() {
  const a = ragCitation.active;
  if (!a) return;
  window.open(
    buildPdfViewerSrc(a.fileurl, a.filepage),
    "_blank",
    "noopener,noreferrer",
  );
}

const pdfBodyRef = ref<HTMLElement | null>(null);
const { overflowY, overflowX, onEnter, onLeave, remeasure, scrollToBottom } =
  useAdaptiveVerticalScroll(pdfBodyRef, {
    persistScrollWhenOverflow: true,
  });

/** 等高亮/过渡结束后再滚动，避免高度未结算 */
const SLIDE_MS = 320;
function scheduleScrollToNewBlock() {
  void nextTick(() => {
    void remeasure();
    window.setTimeout(() => {
      void scrollToBottom("smooth");
    }, SLIDE_MS);
  });
}

const currentTime = ref("");
let _t: ReturnType<typeof setInterval>;
onMounted(() => {
  tick();
  _t = setInterval(tick, 1000);
  void loadDocuments(1);
});
onUnmounted(() => clearInterval(_t));
function tick() {
  currentTime.value = formatLocaleDateTimeClock();
}

interface KbCardDocument extends RagflowDocument {
  isLocal?: boolean;
  suffixLabel: string;
  sizeLabel: string;
}

const DOCUMENT_PAGE_SIZE = 6;
const CHUNK_PAGE_SIZE = 30;
const documentList = ref<RagflowDocument[]>([]);
const documentTotal = ref(0);
const documentPage = ref(1);
const documentDatasetId = ref("");
const documentsLoading = ref(false);
const documentsError = ref("");

const displayedKbList = computed<KbCardDocument[]>(() => [
  ...documentList.value.map((doc) => enrichKbDocument(doc, false)),
]);
const documentPageCount = computed(() =>
  Math.max(1, Math.ceil(documentTotal.value / DOCUMENT_PAGE_SIZE)),
);

function enrichKbDocument(doc: RagflowDocument, isLocal: boolean): KbCardDocument {
  return {
    ...doc,
    isLocal,
    suffixLabel: (doc.suffix || "pdf").toUpperCase(),
    sizeLabel: doc.size == null ? (isLocal ? "本地模拟" : "未知大小") : fmtSize(doc.size),
  };
}

async function loadDocuments(page = 1) {
  documentsLoading.value = true;
  documentsError.value = "";
  try {
    const res = await apiListRagflowDocuments({
      page,
      page_size: DOCUMENT_PAGE_SIZE,
      suffix: "pdf",
      dataset_alias: "default",
    });
    documentList.value = res.docs;
    documentTotal.value = res.total;
    documentDatasetId.value = res.dataset_id;
    documentPage.value = page;
    ragflowDocumentStore.syncFromListResult(res, page);
    await nextTick();
    await remeasure();
  } catch (e) {
    documentsError.value =
      e instanceof Error ? `文档列表加载失败：${e.message}` : "文档列表加载失败";
  } finally {
    documentsLoading.value = false;
  }
}

function changeDocumentPage(page: number) {
  const nextPage = Math.min(Math.max(1, page), documentPageCount.value);
  if (nextPage === documentPage.value || documentsLoading.value) return;
  void loadDocuments(nextPage);
}

function toggleKbPick(kb: RagflowDocument) {
  chatStore.toggleKb({ id: String(kb.id), label: kb.name });
}

function isLocalDocument(kb: KbCardDocument) {
  return kb.isLocal === true;
}

function shortId(id: string | number) {
  const raw = String(id);
  return raw.length > 10 ? `${raw.slice(0, 6)}...${raw.slice(-4)}` : raw;
}

function runLabel(run?: string) {
  const value = String(run || "").toUpperCase();
  if (value === "DONE") return "已解析";
  if (value === "RUNNING") return "解析中";
  if (value === "UNSTART") return "未解析";
  if (!value) return "未知";
  return value;
}

function runClass(run?: string) {
  const value = String(run || "").toUpperCase();
  if (value === "DONE") return "run-done";
  if (value === "RUNNING") return "run-running";
  if (value === "UNSTART") return "run-unstart";
  return "run-unknown";
}

const showChunksDialog = ref(false);
const activeChunkDocument = ref<RagflowDocument | null>(null);
const chunkList = ref<RagflowChunk[]>([]);
const chunkTotal = ref(0);
const chunkPage = ref(1);
const chunkDatasetId = ref("");
const chunksLoading = ref(false);
const chunksError = ref("");
const chunkPageCount = computed(() => Math.max(1, Math.ceil(chunkTotal.value / CHUNK_PAGE_SIZE)));

async function openChunksDialog(kb: RagflowDocument) {
  activeChunkDocument.value = kb;
  showChunksDialog.value = true;
  chunkList.value = [];
  chunkTotal.value = 0;
  chunkPage.value = 1;
  chunkDatasetId.value = "";
  chunksError.value = "";
  await loadChunks(1);
}

function closeChunksDialog() {
  showChunksDialog.value = false;
}

async function loadChunks(page = 1) {
  if (!activeChunkDocument.value) return;
  chunksLoading.value = true;
  chunksError.value = "";
  try {
    const res = await apiListRagflowDocumentChunks(activeChunkDocument.value.id, {
      page,
      page_size: CHUNK_PAGE_SIZE,
      dataset_alias: "default",
    });
    chunkList.value = res.chunks;
    chunkTotal.value = res.total;
    chunkDatasetId.value = res.dataset_id;
    chunkPage.value = page;
  } catch (e) {
    chunksError.value =
      e instanceof Error ? `文档切片加载失败：${e.message}` : "文档切片加载失败";
  } finally {
    chunksLoading.value = false;
  }
}

function changeChunkPage(page: number) {
  const nextPage = Math.min(Math.max(1, page), chunkPageCount.value);
  if (nextPage === chunkPage.value || chunksLoading.value) return;
  void loadChunks(nextPage);
}

const showUpload = ref(false);
const selYear = ref("2024");
const selQ = ref("full");
const years = ["2025", "2024", "2023", "2022", "2021"];
const isDrag = ref(false);
const fileEl = ref<HTMLInputElement | null>(null);
const files = ref<File[]>([]);
const importedSourceName = ref("");

type UploadListRow = {
  key: string;
  name: string;
  sizeBytes: number;
  fileIndex: number;
};

const uploadListRows = computed((): UploadListRow[] => {
  return files.value.map((file, index) => ({
    key: fileRowKey(file, index),
    name: file.name,
    sizeBytes: file.size,
    fileIndex: index,
  }));
});
const showImportedData = ref(false);
const uploadedDocuments = ref<RagflowDocument[]>([]);
const uploadDatasetId = ref("");
const uploadParseStarted = ref(false);
const uploadParseError = ref("");
const uploadError = ref("");
const uploadedSizeLabel = computed(() => {
  const total = uploadedDocuments.value.reduce((sum, doc) => sum + (doc.size ?? 0), 0);
  return total > 0 ? fmtSize(total) : "未知大小";
});

const canStartProcess = computed(
  () => files.value.length > 0,
);

function onFile(e: Event) {
  const f = Array.from((e.target as HTMLInputElement).files || []);
  files.value.push(
    ...f.filter((x) => x.type === "application/pdf" || x.name.endsWith(".pdf")),
  );
  if (files.value.length) {
    importedSourceName.value = files.value.map((fx) => fx.name).join("，");
    uploadError.value = "";
  }
}
function onDrop(e: DragEvent) {
  isDrag.value = false;
  const f = Array.from(e.dataTransfer?.files || []);
  files.value.push(...f.filter((x) => x.name.endsWith(".pdf")));
  if (files.value.length) {
    importedSourceName.value = files.value.map((fx) => fx.name).join("，");
    uploadError.value = "";
  }
}
function fmtSize(b: number) {
  return b > 1048576
    ? (b / 1048576).toFixed(1) + " MB"
    : (b / 1024).toFixed(0) + " KB";
}
function fileRowKey(f: File, i: number) {
  return `${f.name}-${f.size}-${f.lastModified}-${i}`;
}
function removeFile(index: number) {
  files.value.splice(index, 1);
  if (!files.value.length && fileEl.value) fileEl.value.value = "";
}

function sizeLabelForRow(row: UploadListRow): string {
  return fmtSize(row.sizeBytes);
}

function removeUploadRow(row: UploadListRow) {
  removeFile(row.fileIndex);
  importedSourceName.value = files.value.map((fx) => fx.name).join("，");
}

const steps = [
  { title: "文件校验", desc: "确认文件格式与上传清单" },
  { title: "上传到 RAGFlow", desc: "同步 PDF 到知识库数据集" },
  { title: "同步文档列表", desc: "刷新知识库文档状态" },
  { title: "上传完成", desc: "文档进入知识库列表" },
];
const showProgress = ref(false);
const isProcesing = ref(false);
const doneSteps = ref(0);
const progress = ref(0);
const isDone = ref(false);

function nodeClass(i: number) {
  return i < doneSteps.value
    ? "done"
    : i === doneSteps.value && isProcesing.value
      ? "active"
      : "";
}

async function startProcess() {
  if (!canStartProcess.value) return;
  showProgress.value = true;
  isProcesing.value = true;
  isDone.value = false;
  showImportedData.value = false;
  uploadError.value = "";
  uploadParseError.value = "";
  uploadedDocuments.value = [];
  doneSteps.value = 0;
  progress.value = 0;

  try {
    doneSteps.value = 0;
    await animProg(0, 24, 400);
    doneSteps.value = 1;
    await animProg(24, 45, 300);

    const uploadFiles = [...files.value];
    const res = await apiUploadRagflowDocuments(uploadFiles, { parse: false });
    uploadedDocuments.value = res.uploaded;
    uploadDatasetId.value = res.dataset_id;
    uploadParseStarted.value = res.parse_started;
    uploadParseError.value = formatUploadDetail(res.parse_error);
    if (!importedSourceName.value) {
      importedSourceName.value = uploadFiles.map((fx) => fx.name).join("，");
    }

    doneSteps.value = 2;
    await animProg(45, 72, 420);
    await loadDocuments(1);

    doneSteps.value = 3;
    await animProg(72, 98, 420);
    doneSteps.value = steps.length;
    await animProg(98, 100, 180);

    files.value = [];
    if (fileEl.value) fileEl.value.value = "";
    isDone.value = true;
    showImportedData.value = true;
  } catch (e) {
    uploadError.value = e instanceof Error ? e.message : "上传请求失败";
    progress.value = Math.max(progress.value, 45);
  } finally {
    isProcesing.value = false;
  }
}

function animProg(from: number, to: number, dur: number) {
  return new Promise<void>((resolve) => {
    const t0 = performance.now();
    function step(now: number) {
      const p = Math.min((now - t0) / dur, 1);
      progress.value = from + (to - from) * p;
      p < 1 ? requestAnimationFrame(step) : resolve();
    }
    requestAnimationFrame(step);
  });
}

function formatUploadDetail(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function goAsk() {
  for (const doc of uploadedDocuments.value) {
    chatStore.addKb({ id: doc.id, label: doc.name });
  }
  router.push("/workspace");
}

watch(
  [
    documentList,
    showUpload,
    showProgress,
    files,
    isDone,
    isProcesing,
    doneSteps,
    uploadError,
  ],
  async () => {
    await nextTick();
    await remeasure();
  },
  { deep: true },
);

watch(showUpload, (v) => {
  if (v) scheduleScrollToNewBlock();
});
watch(showProgress, (v) => {
  if (v) scheduleScrollToNewBlock();
});
watch(showImportedData, (v) => {
  if (v) scheduleScrollToNewBlock();
});
watch(
  () => uploadListRows.value.length,
  (len, prev) => {
    if (len > (prev ?? 0)) scheduleScrollToNewBlock();
  },
);

watch(
  () => ragCitation.active,
  async () => {
    await nextTick();
    await remeasure();
  },
);
</script>

<style scoped>
@import "./styles/pdf-header-kb.css";

.pdf-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--bg-page);
  padding: 12px;
  gap: 12px;
  overflow: hidden;
}

.pdf-page.embedded {
  width: 100%;
  height: 100%;
  padding: 0;
  background: transparent;
}

.citation-preview-wrap {
  margin-bottom: 10px;
  flex-shrink: 0;
}
.citation-preview-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.cph-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.cph-label {
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  box-shadow: var(--neu-extrude-sm);
  transition: all 0.2s;
}

.kb-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.kb-query-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #5a6a7c;
}

.kb-reload-btn,
.page-btn,
.kb-state button {
  border: 1px solid var(--neu-stroke-muted);
  padding: 5px 12px;
  border-radius: 9px;
  cursor: pointer;
  background: var(--bg-color);
  color: var(--genshin-blue);
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  box-shadow: var(--neu-extrude-sm);
  transition: all 0.2s;
}

.kb-reload-btn:disabled,
.page-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.kb-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 68px;
  margin-bottom: 12px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(74, 141, 183, 0.06);
  color: #5a6a7c;
  font-size: 13px;
  text-align: center;
}

.kb-error {
  background: rgba(224, 112, 112, 0.08);
  color: #c45c5c;
}

/* 知识库卡片 */
.kb-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.kb-card {
  padding: 16px 20px;
  border-radius: 16px;
  background: var(--bg-color);
  box-shadow: var(--neu-extrude-lg);
  transition: all 0.2s;
  width: 220px;
  min-height: 174px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kb-card:hover {
  transform: translateY(-2px);
}

.kb-card.active {
  box-shadow:
    var(--neu-extrude-lg),
    0 0 0 2px rgba(212, 168, 83, 0.45);
}

.kb-card-local {
  border-color: rgba(92, 173, 138, 0.32);
}

.kb-year {
  font-family: "Noto Serif SC", serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
  line-height: 1.35;
  min-height: 42px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.cph-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-all;
}
.cph-page {
  font-size: 11px;
  color: #8a9aac;
  min-height: 68px;
}

.run-line em {
  font-style: normal;
  font-weight: 700;
}

.run-done {
  color: #5cad8a;
}

.run-running {
  color: #e0a050;
}

.run-unstart,
.run-unknown {
  color: #8a9aac;
}
.cph-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex-wrap: wrap;
}
.citation-chunk-snippet {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-muted);
  max-height: 4.5em;
  overflow: auto;
}
.citation-iframe-wrap {
  width: 100%;
  height: min(62vh, 720px);
  min-height: 420px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(74, 141, 183, 0.2);
  background: var(--bg-groove);
}
.citation-iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}

.kb-btn.view {
  background: rgba(212, 168, 83, 0.12);
  color: var(--genshin-gold-dark);
}

.kb-btn.del {
  background: rgba(224, 112, 112, 0.1);
  color: #e07070;
}

.kb-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.add-kb {
  border: 2px dashed var(--neu-stroke-muted-strong);
  background: transparent !important;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  box-shadow: none !important;
  cursor: pointer;
}

.add-kb:hover {
  border-color: var(--genshin-blue);
}

.add-plus {
  font-size: 24px;
  color: #b0bac8;
}

.add-text {
  font-size: 12px;
  color: #b0bac8;
}

.kb-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
  font-size: 12px;
  color: #5a6a7c;
}

.page-info {
  min-width: 90px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* 上传区 */
.time-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.field-req {
  font-size: 13px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
}

.range-sel {
  padding: 6px 10px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-family: var(--font-ui);
  color: var(--genshin-blue-dark);
  cursor: pointer;
  outline: none;
}

.req-hint {
  font-size: 11px;
  color: #e07070;
}

.drop-zone {
  border: 2px dashed var(--neu-stroke-heavy);
  border-radius: 16px;
  padding: 36px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-groove);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.drop-zone.dragover,
.drop-zone:hover {
  border-color: var(--genshin-blue);
  background: rgba(74, 141, 183, 0.04);
}

.dz-icon {
  font-size: 36px;
}

.dz-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--genshin-blue-dark);
}

.dz-sub {
  font-size: 12px;
  color: var(--text-muted);
}

.file-list-wrap {
  margin-top: 14px;
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(145deg,
      rgba(74, 141, 183, 0.07),
      rgba(163, 177, 198, 0.06));
  border: 1px solid rgba(74, 141, 183, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.file-list-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(74, 141, 183, 0.15);
}

.file-list-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
  letter-spacing: 0.02em;
}

.file-list-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--genshin-blue);
  white-space: nowrap;
}

.file-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-row {
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--bg-color, #f0f4f8);
  box-shadow: var(--neu-extrude-md, 3px 3px 8px rgba(163, 177, 198, 0.45));
  border: 1px solid rgba(255, 255, 255, 0.7);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.file-row:hover {
  box-shadow: 0 4px 14px rgba(74, 141, 183, 0.18);
}

.file-row-lead {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.file-row-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  padding: 0 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #fff;
  background: linear-gradient(135deg,
      var(--genshin-blue, #4a8db7),
      var(--genshin-blue-light, #6ba8c9));
  box-shadow: 0 2px 8px rgba(74, 141, 183, 0.35);
}

.file-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
}

.fi-name {
  width: 100%;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--genshin-blue-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fi-size-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
  color: var(--genshin-blue-dark);
  background: rgba(74, 141, 183, 0.14);
  border: 1px solid rgba(74, 141, 183, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.fi-del {
  flex-shrink: 0;
  align-self: center;
  width: 36px;
  height: 36px;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-muted);
  background: rgba(163, 177, 198, 0.2);
  transition:
    color 0.15s,
    background 0.15s,
    transform 0.12s;
}

.fi-del:hover {
  color: #c45c5c;
  background: rgba(196, 92, 92, 0.12);
}

.fi-del:active {
  transform: scale(0.94);
}

.fi-del-x {
  font-size: 22px;
  font-weight: 400;
  line-height: 1;
  margin-top: -2px;
}

.submit-btn {
  margin-top: 14px;
  padding: 11px 32px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-family: var(--font-ui);
  background: linear-gradient(135deg,
      var(--genshin-blue),
      var(--genshin-blue-light));
  color: #fff;
  box-shadow: var(--neu-glow-blue-lift);
  transition: all 0.2s;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 流程图 */
.flow-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0;
  margin-bottom: 24px;
}

.flow-item {
  display: flex;
  align-items: center;
}

.flow-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 14px;
  border-radius: 14px;
  min-width: 120px;
  transition: all 0.3s;
}

.flow-node.active {
  background: rgba(74, 141, 183, 0.07);
  box-shadow: var(--neu-extrude-lg);
}

.flow-node.done {
  background: rgba(92, 173, 138, 0.05);
}

.flow-circle {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 2px solid var(--neu-stroke-muted-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-faint);
  background: var(--bg-color);
  box-shadow: var(--neu-extrude-md);
  transition: all 0.35s;
}

.flow-node.done .flow-circle {
  border-color: #5cad8a;
  color: #5cad8a;
  box-shadow:
    0 0 10px rgba(92, 173, 138, 0.3),
    var(--neu-extrude-md);
}

.flow-node.active .flow-circle {
  border-color: var(--genshin-blue);
  box-shadow:
    0 0 12px rgba(74, 141, 183, 0.35),
    var(--neu-extrude-md);
}

.spin-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(74, 141, 183, 0.3);
  border-top-color: var(--genshin-blue);
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.flow-info {
  text-align: center;
}

.flow-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
  margin-bottom: 3px;
}

.flow-desc {
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.4;
}

.flow-arrow {
  color: var(--text-faint);
  padding: 0 4px;
  transition: color 0.3s;
}

.flow-arrow.lit {
  color: #5cad8a;
}

.prog-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.prog-label {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.prog-track {
  flex: 1;
  height: 8px;
  background: var(--bg-groove);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: var(--neu-inset-track-lg);
}

.prog-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--genshin-blue), var(--genshin-gold));
  border-radius: 4px;
  transition: width 0.3s ease;
}

.prog-pct {
  font-size: 12px;
  font-weight: 600;
  color: var(--genshin-blue);
  white-space: nowrap;
  min-width: 32px;
}

.done-box {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 14px;
  background: rgba(92, 173, 138, 0.06);
  border: 1px solid rgba(92, 173, 138, 0.25);
  flex-wrap: wrap;
}

.done-emoji {
  font-size: 28px;
}

.done-info {
  flex: 1;
}

.done-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
  margin-bottom: 4px;
}

.done-sub {
  font-size: 12px;
  color: var(--text-muted);
}

.done-sub strong {
  color: var(--genshin-blue-dark);
  font-weight: 700;
}

.upload-error-box {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(224, 112, 112, 0.08);
  border: 1px solid rgba(224, 112, 112, 0.25);
}

.upload-error-title {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #c45c5c;
}

.upload-error-text {
  margin-bottom: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #8f4c4c;
  word-break: break-word;
}

.retry-upload-btn {
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  background: rgba(224, 112, 112, 0.12);
  color: #c45c5c;
}

.start-btn {
  padding: 11px 26px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-ui);
  letter-spacing: 0.03em;
  background: linear-gradient(135deg,
      var(--genshin-blue),
      var(--genshin-blue-light));
  color: #fff;
  box-shadow: var(--neu-glow-blue-lift);
  white-space: nowrap;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    filter 0.15s ease;
}

.start-btn:hover {
  box-shadow: var(--neu-glow-blue-hover-strong);
  filter: brightness(1.04);
  transform: translateY(-1px);
}

.start-btn:active {
  transform: translateY(0);
  filter: brightness(0.98);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.done-pop-enter-active {
  animation: pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pop {
  from {
    transform: scale(0.88);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* 导入数据展示 */
.mock-source {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.summary-item {
  padding: 12px;
}

.si-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.si-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
}

.si-value-small {
  font-size: 13px;
  line-height: 1.35;
  word-break: break-all;
}

.upload-warn {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(224, 160, 80, 0.1);
  border: 1px solid rgba(224, 160, 80, 0.24);
  color: #9a6a25;
  font-size: 12px;
  line-height: 1.55;
  word-break: break-word;
}

.sub-block-title {
  margin: 6px 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
}

.mini-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.mini-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mbr-label {
  width: 88px;
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.mbr-track {
  flex: 1;
  height: 8px;
  border-radius: 5px;
  overflow: hidden;
  background: var(--bg-groove);
  box-shadow: var(--neu-inset-track-sm);
}

.mbr-fill {
  height: 100%;
  background: linear-gradient(90deg,
      var(--genshin-blue),
      var(--genshin-blue-light));
}

.mbr-val {
  width: 40px;
  text-align: right;
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.table-wrap {
  overflow-x: auto;
}

.mock-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
  min-width: 780px;
}

.mock-table th,
.mock-table td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--neu-stroke-faint);
  text-align: left;
}

.mock-table th {
  background: rgba(74, 141, 183, 0.08);
  color: var(--genshin-blue-dark);
  font-weight: 600;
}

.mock-table tbody tr:hover td {
  background: rgba(74, 141, 183, 0.03);
}

/* 切片弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-box {
  padding: 22px 24px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chunks-modal {
  width: min(860px, calc(100vw - 40px));
  max-height: min(760px, calc(100vh - 40px));
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.modal-title {
  font-family: "Noto Serif SC", serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
}

.modal-subtitle {
  max-width: 680px;
  margin-top: 4px;
  font-size: 12px;
  color: #8a9aac;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: #8a9aac;
  background: rgba(163, 177, 198, 0.18);
  font-size: 22px;
  line-height: 1;
}

.modal-close:hover {
  color: var(--genshin-blue-dark);
}

.chunk-meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #5a6a7c;
}

.chunk-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 2px 4px 2px 2px;
  min-height: 140px;
  max-height: 500px;
}

.chunk-item {
  padding: 12px 14px;
}

.chunk-title {
  margin-bottom: 7px;
  font-size: 12px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
}

.chunk-item p {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.65;
  font-size: 12px;
  color: #5a6a7c;
}

.chunk-pagination {
  margin-top: 0;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
