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
          </div>
        </div>
        <div class="kb-list">
          <div v-for="kb in kbList" :key="kb.id" class="kb-card" :class="{ active: chatStore.isKbSelected(kb.id) }">
            <div class="kb-year">{{ kb.range }}</div>
            <div class="kb-meta">
              <span>📄 {{ kb.reports }} 份报告</span>
              <span>🗂️ {{ kb.records }} 条记录</span>
              <span>💡 {{ kb.knowledge }} 知识点</span>
            </div>
            <div class="kb-badge" :class="chatStore.isKbSelected(kb.id) ? 'kb-on' : 'kb-off'">
              {{ chatStore.isKbSelected(kb.id) ? "● 已选入对话" : "○ 未选" }}
            </div>
            <div class="kb-btns">
              <button class="kb-btn activate" @click="toggleKbPick(kb)">
                {{ chatStore.isKbSelected(kb.id) ? "取消选择" : "选择" }}
              </button>
              <button class="kb-btn del" @click="deleteKb(kb)">删除</button>
            </div>
          </div>
          <div class="kb-card add-kb" @click="showUpload = !showUpload">
            <span class="add-plus">＋</span>
            <span class="add-text">PDF导入</span>
          </div>
        </div>
      </section>

      <!-- 上传区 -->
      <transition name="slide-down">
        <section v-if="showUpload" class="neu-card pdf-section">
          <div class="sec-title">上传新报告</div>

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
            <span class="req-hint">* 必填，用于知识库分类</span>
            <button class="quick-import-btn" type="button" @click="useLastImport">
              使用上次导入（免上传）
            </button>
          </div>

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
            {{ isProcesing ? "处理中..." : "开始解析处理" }}
          </button>
        </section>
      </transition>

      <!-- 处理进度 -->
      <transition name="slide-down">
        <section v-if="showProgress" class="neu-card pdf-section">
          <div class="sec-title">解析处理进度</div>

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
                  知识库「{{ rangeLabel }}」已准备就绪！
                </div>
                <div class="done-sub">
                  提取病害记录 <strong>247</strong> 条 · 知识点
                  <strong>89</strong> 条
                </div>
              </div>
              <button class="start-btn" @click="goAsk">立即开始提问 →</button>
            </div>
          </transition>
        </section>
      </transition>

      <transition name="slide-down">
        <section v-if="showImportedData" class="neu-card pdf-section">
          <div class="sec-title">导入数据模拟结果</div>
          <div class="mock-source">
            来源：{{ importedSourceName || lastImportedPdfName }}
          </div>
          <div class="summary-grid">
            <div class="summary-item neu-card-sm">
              <div class="si-label">导入记录数</div>
              <div class="si-value">{{ importSummary.totalRows }}</div>
            </div>
            <div class="summary-item neu-card-sm">
              <div class="si-label">检测总里程</div>
              <div class="si-value">{{ importSummary.totalLengthKm }} km</div>
            </div>
            <div class="summary-item neu-card-sm">
              <div class="si-label">涉及道路数</div>
              <div class="si-value">{{ importSummary.uniqueRoads }}</div>
            </div>
            <div class="summary-item neu-card-sm">
              <div class="si-label">备注记录数</div>
              <div class="si-value">{{ importSummary.remarkRows }}</div>
            </div>
          </div>
          <div class="sub-block-title">按道路等级分布</div>
          <div class="mini-bars">
            <div v-for="item in importSummary.byLevel" :key="item.label" class="mini-bar-row">
              <span class="mbr-label">{{ item.label }}</span>
              <div class="mbr-track">
                <div class="mbr-fill" :style="{ width: item.pct + '%' }"></div>
              </div>
              <span class="mbr-val">{{ item.count }}</span>
            </div>
          </div>
          <div class="sub-block-title">明细预览（部分）</div>
          <div class="table-wrap">
            <table class="mock-table">
              <thead>
                <tr>
                  <th>道路名称</th>
                  <th>起止点</th>
                  <th>道路等级</th>
                  <th>检测长度(km)</th>
                  <th>检测时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in importedRowsPreview" :key="idx">
                  <td>{{ row.roadName }}</td>
                  <td>{{ row.rangeDesc }}</td>
                  <td>{{ row.roadLevel }}</td>
                  <td>{{ row.lengthKm }}</td>
                  <td>{{ row.detectTime }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </transition>
    </div>
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
import { formatLocaleDateTimeClock } from "../utils/localeFormat";
import defaultPdfImport from "../config/defaultPdfImport.json";

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
});
const router = useRouter();
const chatStore = useChatStore();
const canvasStore = useCanvasStore();
const ragCitation = useRagCitationStore();
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
});
onUnmounted(() => clearInterval(_t));
function tick() {
  currentTime.value = formatLocaleDateTimeClock();
}

// TODO: API - GET /api/kb/list
const kbList = ref([
  { id: 1, range: "2025年度", reports: 47, records: 247, knowledge: 89 },
  { id: 2, range: "2024年度", reports: 38, records: 198, knowledge: 72 },
  { id: 3, range: "2023年度", reports: 29, records: 156, knowledge: 58 },
]);
function toggleKbPick(kb: (typeof kbList.value)[0]) {
  chatStore.toggleKb({ id: String(kb.id), label: kb.range });
}
function deleteKb(kb: (typeof kbList.value)[0]) {
  chatStore.removeKb(String(kb.id));
  kbList.value = kbList.value.filter((k) => k.id !== kb.id);
}

const showUpload = ref(false);
const selYear = ref("2024");
const selQ = ref("full");
const years = ["2025", "2024", "2023", "2022", "2021"];
const isDrag = ref(false);
const fileEl = ref<HTMLInputElement | null>(null);
const files = ref<File[]>([]);
const lastImportedPdfName = defaultPdfImport.lastImportedDisplayName;
const useLastImported = ref(false);
/** 免上传时使用 public 内建 PDF，HEAD 取到的字节数（用于与实际上传一致展示大小） */
const quickImportSizeBytes = ref<number | null>(null);
const importedSourceName = ref("");

type UploadListRow =
  | {
    mode: "file";
    key: string;
    name: string;
    sizeBytes: number;
    fileIndex: number;
  }
  | {
    mode: "quick";
    key: string;
    name: string;
    sizeBytes: number | null;
  };

const uploadListRows = computed((): UploadListRow[] => {
  if (files.value.length > 0) {
    return files.value.map((file, index) => ({
      mode: "file",
      key: fileRowKey(file, index),
      name: file.name,
      sizeBytes: file.size,
      fileIndex: index,
    }));
  }
  if (useLastImported.value) {
    return [
      {
        mode: "quick",
        key: "quick-default",
        name: lastImportedPdfName,
        sizeBytes: quickImportSizeBytes.value,
      },
    ];
  }
  return [];
});
const showImportedData = ref(false);

const importSummary = {
  totalRows: 421,
  totalLengthKm: 307.538,
  uniqueRoads: 233,
  remarkRows: 234,
  byLevel: [
    { label: "支路", count: 212, pct: 50.4 },
    { label: "主干路", count: 146, pct: 34.7 },
    { label: "次干路", count: 60, pct: 14.3 },
    { label: "城市快速路", count: 2, pct: 0.5 },
    { label: "城市快速路辅道", count: 1, pct: 0.2 },
  ],
};

const importedRowsPreview = [
  {
    roadName: "钱江路",
    rangeDesc: "三新路 - 塘工局路",
    roadLevel: "主干路",
    lengthKm: 1.689,
    detectTime: "2025年6月24日 - 2025年7月31日",
  },
  {
    roadName: "运河东路",
    rangeDesc: "艮山西路 - 钱江路",
    roadLevel: "主干路",
    lengthKm: 1.983,
    detectTime: "2025年6月24日 - 2025年7月31日",
  },
  {
    roadName: "环站东路",
    rangeDesc: "天城路 - 环站南路",
    roadLevel: "主干路",
    lengthKm: 1.29,
    detectTime: "2025年6月24日 - 2025年7月31日",
  },
  {
    roadName: "临丁路",
    rangeDesc: "洋家港桥 - 学堂港桥以西",
    roadLevel: "主干路",
    lengthKm: 4.702,
    detectTime: "2025年6月24日 - 2025年7月31日",
  },
  {
    roadName: "庆春东路",
    rangeDesc: "之江路 - 凯旋路",
    roadLevel: "主干路",
    lengthKm: 3.457,
    detectTime: "2025年6月24日 - 2025年7月31日",
  },
  {
    roadName: "丁城路",
    rangeDesc: "大农港路 - 同协路",
    roadLevel: "次干路",
    lengthKm: 3.135,
    detectTime: "2025年6月24日 - 2025年7月31日",
  },
  {
    roadName: "三里亭小区",
    rangeDesc: "石桥路南端西侧机场路北侧",
    roadLevel: "支路",
    lengthKm: 2.266,
    detectTime: "2025年6月24日 - 2025年7月31日",
  },
  {
    roadName: "艮山西路",
    rangeDesc: "彭埠铁路桥 - 凯旋路",
    roadLevel: "城市快速路",
    lengthKm: 2.96,
    detectTime: "2025年7-8月",
  },
];

const canStartProcess = computed(
  () => files.value.length > 0 || useLastImported.value,
);

function onFile(e: Event) {
  const f = Array.from((e.target as HTMLInputElement).files || []);
  files.value.push(
    ...f.filter((x) => x.type === "application/pdf" || x.name.endsWith(".pdf")),
  );
  if (files.value.length) {
    useLastImported.value = false;
    quickImportSizeBytes.value = null;
    importedSourceName.value = files.value.map((fx) => fx.name).join("，");
  }
}
function onDrop(e: DragEvent) {
  isDrag.value = false;
  const f = Array.from(e.dataTransfer?.files || []);
  files.value.push(...f.filter((x) => x.name.endsWith(".pdf")));
  if (files.value.length) {
    useLastImported.value = false;
    quickImportSizeBytes.value = null;
    importedSourceName.value = files.value.map((fx) => fx.name).join("，");
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
  if (row.mode === "file") return fmtSize(row.sizeBytes);
  if (row.sizeBytes != null) return fmtSize(row.sizeBytes);
  return "—";
}

function removeUploadRow(row: UploadListRow) {
  if (row.mode === "quick") {
    useLastImported.value = false;
    quickImportSizeBytes.value = null;
    importedSourceName.value = "";
    return;
  }
  removeFile(row.fileIndex);
}

async function probeQuickPdfSize() {
  quickImportSizeBytes.value = null;
  const path = defaultPdfImport.lastImportedPublicPath;
  if (!path) return;
  try {
    const r = await fetch(path, { method: "HEAD" });
    const len = r.headers.get("Content-Length");
    if (len) quickImportSizeBytes.value = Number.parseInt(len, 10);
  } catch {
    quickImportSizeBytes.value = null;
  }
}

async function useLastImport() {
  showUpload.value = true;
  useLastImported.value = true;
  files.value = [];
  importedSourceName.value = lastImportedPdfName;
  await probeQuickPdfSize();
}

const steps = [
  { title: "上传解析", desc: "文件格式验证与内容解析" },
  { title: "病害卡片提取", desc: "识别病害信息结构化存储" },
  { title: "知识库抽取", desc: "提取检测原理与技术方法" },
  { title: "结构化入库", desc: "数据写入数据库与知识库" },
];
const showProgress = ref(false);
const isProcesing = ref(false);
const doneSteps = ref(0);
const progress = ref(0);
const isDone = ref(false);
const rangeLabel = computed(
  () => `${selYear.value}年${selQ.value === "full" ? "全年" : selQ.value}`,
);

function nodeClass(i: number) {
  return i < doneSteps.value
    ? "done"
    : i === doneSteps.value && isProcesing.value
      ? "active"
      : "";
}

// TODO: API - POST /api/pdf/upload  { files, timeRange }
async function startProcess() {
  if (!canStartProcess.value) return;
  showProgress.value = true;
  isProcesing.value = true;
  isDone.value = false;
  showImportedData.value = false;
  doneSteps.value = 0;
  progress.value = 0;

  for (let i = 0; i < steps.length; i++) {
    doneSteps.value = i;
    await animProg(i * 25, (i + 1) * 25 - 2, 900);
    await delay(200);
  }
  doneSteps.value = steps.length;
  await animProg(98, 100, 200);
  isProcesing.value = false;
  isDone.value = true;
  showImportedData.value = true;
  if (!importedSourceName.value) {
    importedSourceName.value = useLastImported.value
      ? lastImportedPdfName
      : files.value.map((fx) => fx.name).join("，") || lastImportedPdfName;
  }

  const range = rangeLabel.value;
  if (!kbList.value.find((k) => k.range.startsWith(selYear.value))) {
    kbList.value.unshift({
      id: Date.now(),
      range: range + (selQ.value === "full" ? "度" : ""),
      reports: files.value.length || (useLastImported.value ? 1 : 0),
      records: 247,
      knowledge: 89,
    });
  }
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
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

function goAsk() {
  chatStore.addKb({ id: `upload-${Date.now()}`, label: rangeLabel.value });
  const mapTab = canvasStore.tabs.find((t) => t.type === "map");
  if (mapTab) canvasStore.setActiveTab(mapTab.id);
  else canvasStore.pushTab({ type: "map" });
  router.push("/workspace");
}

function goBackToWorkspace() {
  canvasStore.setAgentMode("insight");
  router.push("/workspace");
}

watch(
  [
    kbList,
    showUpload,
    showProgress,
    files,
    useLastImported,
    isDone,
    isProcesing,
    doneSteps,
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
  font-weight: 700;
  color: var(--genshin-blue);
}
.cph-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-all;
}
.cph-page {
  font-size: 11px;
  color: var(--text-muted);
}
.cph-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(74, 141, 183, 0.2);
  background: var(--bg-groove);
  min-height: 280px;
}
.citation-iframe {
  display: block;
  width: 100%;
  height: min(52vh, 420px);
  min-height: 260px;
  border: none;
}
.citation-iframe-hint {
  margin: 6px 0 0;
  font-size: 10px;
  color: var(--text-muted);
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

.quick-import-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px dashed rgba(74, 141, 183, 0.45);
  background: rgba(74, 141, 183, 0.08);
  color: var(--genshin-blue);
  font-size: 12px;
  font-family: var(--font-ui);
  cursor: pointer;
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
</style>
