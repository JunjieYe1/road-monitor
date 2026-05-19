<template>
  <div class="report-view">
    <ViewToolbar class="report-toolbar">
      <div class="report-types">
        <button
          v-for="t in reportTypes"
          :key="t.key"
          class="type-btn"
          :class="{ active: selectedType === t.key }"
          :disabled="t.key !== 'annual'"
          :title="t.key === 'annual' ? '生成年度报告' : '当前 /report 接口暂只支持年度报告'"
          @click="selectedType = t.key"
        >
          {{ t.label }}
        </button>
      </div>
      <div class="toolbar-right">
        <span v-if="generated" class="gen-time">生成于 {{ genTime }}</span>
        <label class="filter-field">
          <span class="filter-label">时间</span>
          <select
            v-model="selectedYear"
            class="filter-select"
            :disabled="isGenerating"
            required
          >
            <option v-for="year in yearOptions" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </label>
        <label class="filter-field">
          <span class="filter-label">地区</span>
          <select
            v-model="selectedRegion"
            class="filter-select"
            :disabled="isGenerating"
            required
          >
            <option
              v-for="region in regionOptions"
              :key="region"
              :value="region"
            >
              {{ region }}
            </option>
          </select>
        </label>
        <button
          class="action-btn"
          :disabled="isGenerating || !canGenerate"
          @click="startGenerate"
        >
          <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
            <path
              d="M10 2v4M10 14v4M4.22 4.22l2.83 2.83M12.95 12.95l2.83 2.83M2 10h4M14 10h4M4.22 15.78l2.83-2.83M12.95 7.05l2.83-2.83"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          {{ isGenerating ? "生成中..." : generated ? "重新生成" : "生成报告" }}
        </button>
        <button
          v-if="generated && downloadUrl"
          class="action-btn export-btn"
          @click="openReportPdf"
        >
          <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
            <path
              d="M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2M10 3v9M7 9l3 3 3-3"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          导出 PDF
        </button>
      </div>
    </ViewToolbar>

    <div class="report-body neu-card u-scrollbar-hidden">
      <div v-if="!generated && !isGenerating && !errorMessage" class="report-empty">
        <div class="empty-icon">📄</div>
        <div class="empty-title">生成 {{ selectedYear }} 年{{ selectedRegion }}年度报告</div>
        <div class="empty-types">
          <div
            v-for="t in reportTypes"
            :key="t.key"
            class="empty-type-card"
            :class="{ disabled: t.key !== 'annual' || !canGenerate }"
            @click="handleEmptyTypeClick(t.key)"
          >
            <span class="etc-icon">{{ t.icon }}</span>
            <span>{{ t.label }}</span>
          </div>
        </div>
      </div>

      <div v-else class="report-document">
        <div class="doc-header">
          <div class="doc-logo">◆</div>
          <div class="doc-title-block">
            <div class="doc-main-title">{{ reportTitle }}</div>
            <div class="doc-sub-title">
              {{ selectedYear }} 年 {{ selectedRegion }} 城市道路地下病害检测 · 年度报告
            </div>
          </div>
          <div class="doc-meta">
            <div>生成时间：{{ genTime || "生成中" }}</div>
            <div>数据范围：{{ selectedYear }} 年度检测周期 · {{ selectedRegion }}</div>
          </div>
        </div>
        <div class="doc-divider"></div>

        <section v-if="isGenerating" class="stream-panel">
          <div class="gen-spinner">
            <div class="spin-ring"></div>
            <span class="gen-label-text">AI 生成中</span>
          </div>
          <div class="gen-progress-bar" aria-label="报告生成进度">
            <div class="gen-progress-fill"></div>
          </div>
          <div class="step-list">
            <div
              v-for="(step, idx) in stepLog"
              :key="idx"
              class="step-item"
            >
              <span class="step-dot" aria-hidden="true"></span>
              <span class="step-text">{{ step }}</span>
            </div>
          </div>
        </section>

        <section v-else-if="errorMessage" class="result-panel result-panel-error">
          <div class="result-icon">!</div>
          <div class="result-main">
            <div class="result-title">报告生成失败</div>
            <p class="result-desc">{{ errorMessage }}</p>
            <details v-if="errorTraceback" class="traceback-box">
              <summary>查看异常详情</summary>
              <pre>{{ errorTraceback }}</pre>
            </details>
          </div>
        </section>

        <section v-else class="pdf-preview-panel">
          <div v-if="persistError" class="persist-warning">
            PDF 已生成，但报告元数据保存失败：{{ persistError }}
          </div>
          <div class="pdf-preview-head">
            <div>
              <div class="result-title">报告已生成</div>
              <p class="result-desc">{{ filename || "报告文件已生成" }}</p>
            </div>
            <div class="result-actions">
              <button
                type="button"
                class="action-btn export-btn"
                :disabled="!downloadUrl"
                @click="openReportPdf"
              >
                打开 PDF
              </button>
            </div>
          </div>
          <div v-if="downloadUrl" class="pdf-frame-wrap">
            <iframe
              class="pdf-frame"
              :src="downloadUrl"
              :title="filename || reportTitle"
            ></iframe>
          </div>
          <div v-else class="pdf-empty">
            后端未返回可预览的 PDF 地址
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useReportStore, type ReportType } from "../../../stores/reportStore";
import ViewToolbar from "../../common/ViewToolbar.vue";

const reportStore = useReportStore();
const {
  isGenerating, stepLog, generated, genTime, filename, downloadUrl,
  errorMessage, errorTraceback, persistError,
} = storeToRefs(reportStore);

const yearOptions = ["2023", "2024", "2025"] as const;
const regionOptions = ["上城区"] as const;

const reportTypes = [
  { key: "annual", label: "年度报告", icon: "📊" },
  { key: "patrol", label: "巡检情况", icon: "🔍" },
  { key: "rectify", label: "整改情况", icon: "🔧" },
  { key: "recheck", label: "复测情况", icon: "✅" },
] as const;

const selectedType = ref<ReportType>("annual");
const selectedYear = ref<(typeof yearOptions)[number]>("2024");
const selectedRegion = ref<(typeof regionOptions)[number]>("上城区");

const REPORT_TITLES: Record<Exclude<ReportType, "annual">, string> = {
  patrol: "2024年度路面巡检情况报告",
  rectify: "2024年度病害整改情况报告",
  recheck: "2024年度复测验收情况报告",
};

const reportTitle = computed(
  () => {
    const type = selectedType.value;
    return type === "annual"
      ? `${selectedYear.value}年${selectedRegion.value}道路病害年度报告`
      : REPORT_TITLES[type];
  },
);
const canGenerate = computed(
  () => Boolean(selectedYear.value) && Boolean(selectedRegion.value),
);

async function startGenerate() {
  if (!canGenerate.value) {
    reportStore.errorMessage = "请选择报告时间和地区";
    return;
  }
  await reportStore.startGenerate({
    year: selectedYear.value,
    region: selectedRegion.value,
    reportType: selectedType.value,
    reportTitle: reportTitle.value,
  });
}

function openReportPdf() {
  if (!downloadUrl.value) return;
  window.open(downloadUrl.value, "_blank", "noopener,noreferrer");
}

function handleEmptyTypeClick(type: ReportType) {
  if (type !== "annual" || !canGenerate.value) return;
  selectedType.value = type;
  startGenerate();
}

watch(
  () => reportStore.activeHistory,
  (history) => {
    if (reportStore.isAddingHistory) return;
    if (!history) return;
    selectedType.value = history.type;
    if (history.year && yearOptions.includes(history.year as (typeof yearOptions)[number])) {
      selectedYear.value = history.year as (typeof yearOptions)[number];
    }
    if (
      history.region &&
      regionOptions.includes(history.region as (typeof regionOptions)[number])
    ) {
      selectedRegion.value = history.region as (typeof regionOptions)[number];
    }
  },
);

onMounted(() => {
  reportStore.loadReports();
});
</script>

<style scoped>
.report-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

.report-types {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  flex: 1;
}
.type-btn {
  padding: 5px 12px;
  border-radius: 10px;
  border: 1px solid var(--neu-stroke-muted);
  cursor: pointer;
  background: var(--bg-color);
  color: #8a9aac;
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  transition: all 0.2s;
  box-shadow: var(--neu-extrude-sm);
}
.type-btn:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}
.type-btn.active {
  background: linear-gradient(
    135deg,
    var(--genshin-blue),
    var(--genshin-blue-light)
  );
  color: #fff;
  border-color: transparent;
  box-shadow: var(--neu-glow-blue-strong);
  opacity: 1;
}

.toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.gen-time {
  font-size: 11px;
  color: #8a9aac;
}
.filter-field {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #6a7a8c;
  font-family: "Noto Sans SC", sans-serif;
}
.filter-label {
  white-space: nowrap;
}
.filter-select {
  height: 28px;
  min-width: 82px;
  padding: 0 26px 0 10px;
  border-radius: 9px;
  border: 1px solid var(--neu-stroke-muted);
  background: var(--bg-color);
  color: var(--genshin-blue-dark);
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  cursor: pointer;
  box-shadow: var(--neu-extrude-sm);
  outline: none;
}
.filter-select:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.filter-select:focus {
  border-color: var(--genshin-blue);
  box-shadow:
    0 0 0 3px rgba(74, 141, 183, 0.12),
    var(--neu-extrude-sm);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  background: linear-gradient(
    135deg,
    var(--genshin-blue),
    var(--genshin-blue-light)
  );
  color: #fff;
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  box-shadow: var(--neu-glow-blue-strong);
  transition: all 0.2s;
}
.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.action-btn:hover:not(:disabled) {
  box-shadow: var(--neu-glow-blue-hover-strong);
  transform: translateY(-1px);
}
.export-btn {
  background: linear-gradient(135deg, #5cad8a, #7dc4a5);
  box-shadow: var(--neu-glow-success-strong);
}

.report-body {
  flex: 1;
  padding: 20px;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.report-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
}
.empty-icon {
  font-size: 48px;
}
.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
}
.empty-sub {
  font-size: 13px;
  color: #8a9aac;
}
.empty-types {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.empty-type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 20px;
  border-radius: 14px;
  cursor: pointer;
  background: var(--bg-color);
  font-size: 12px;
  color: var(--genshin-blue-dark);
  box-shadow: var(--neu-extrude-lg);
  transition: all 0.2s;
  min-width: 80px;
}
.empty-type-card.disabled {
  cursor: not-allowed;
  color: #a5b0bd;
  opacity: 0.6;
}
.empty-type-card:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: var(--neu-extrude-lg-up);
}
.etc-icon {
  font-size: 24px;
}

.report-document {
  max-width: 820px;
  margin: 0 auto;
}
.doc-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
}
.doc-logo {
  font-size: 28px;
  color: var(--genshin-gold);
}
.doc-title-block {
  flex: 1;
  min-width: 0;
}
.doc-main-title {
  font-family: "Noto Serif SC", serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
}
.doc-sub-title {
  font-size: 12px;
  color: #8a9aac;
  margin-top: 4px;
}
.doc-meta {
  font-size: 11px;
  color: #8a9aac;
  text-align: right;
  line-height: 1.8;
  flex-shrink: 0;
}
.doc-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(212, 168, 83, 0.4),
    transparent
  );
  margin-bottom: 20px;
}

.stream-panel,
.result-panel,
.pdf-preview-panel {
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid var(--neu-stroke-muted);
  border-radius: 8px;
  padding: 18px;
  box-shadow: var(--neu-extrude-sm);
}
.stream-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.gen-spinner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
}
.spin-ring {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: var(--genshin-blue);
  border-right-color: var(--genshin-gold);
  animation: spin 1.2s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.gen-label-text {
  font-size: 13px;
  color: var(--genshin-blue);
  font-weight: 500;
}
.gen-progress-bar {
  position: relative;
  width: min(360px, 100%);
  height: 6px;
  background: var(--bg-groove);
  border-radius: 3px;
  overflow: hidden;
  box-shadow: var(--neu-inset-track);
}
.gen-progress-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 42%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--genshin-blue), var(--genshin-gold));
  animation: streamProgress 1.35s ease-in-out infinite;
}
@keyframes streamProgress {
  0% {
    left: -42%;
  }
  100% {
    left: 100%;
  }
}
.step-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 480px;
  text-align: left;
}
.step-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(74, 141, 183, 0.05);
  border: 1px solid rgba(74, 141, 183, 0.12);
}
.step-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--genshin-blue);
  flex-shrink: 0;
  margin-top: 6px;
}
.step-text {
  color: #3a4a5c;
  font-size: 12.5px;
  line-height: 1.55;
  word-break: break-word;
  flex: 1;
  min-width: 0;
}
.pdf-preview-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
}
.persist-warning {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(224, 160, 80, 0.12);
  color: #9a6830;
  font-size: 12px;
  line-height: 1.5;
}
.pdf-preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.pdf-frame-wrap {
  width: 100%;
  min-height: 640px;
  height: calc(100vh - 260px);
  max-height: 900px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--neu-stroke-muted);
  background: #fff;
  box-shadow: var(--neu-extrude-sm);
}
.pdf-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}
.pdf-empty {
  padding: 20px;
  border-radius: 8px;
  background: rgba(74, 90, 110, 0.06);
  color: #3a4a5c;
  font-size: 12px;
}

.result-panel {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.result-panel-error {
  border-color: rgba(198, 79, 79, 0.32);
  background: rgba(198, 79, 79, 0.06);
}
.result-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(92, 173, 138, 0.14);
  color: #4b9676;
  font-size: 12px;
  font-weight: 800;
  box-shadow: var(--neu-extrude-sm);
}
.result-panel-error .result-icon {
  background: rgba(198, 79, 79, 0.12);
  color: #b54444;
  font-size: 18px;
}
.result-main {
  min-width: 0;
  flex: 1;
}
.result-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
  margin-bottom: 6px;
}
.result-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: #3a4a5c;
  line-height: 1.7;
  word-break: break-word;
}
.result-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.result-link {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 12px;
  color: var(--genshin-blue);
  text-decoration: none;
}
.result-link:hover {
  text-decoration: underline;
}
.traceback-box {
  font-size: 12px;
  color: #6a4b4b;
}
.traceback-box summary {
  cursor: pointer;
  margin-bottom: 8px;
}
.traceback-box pre {
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.58);
}
@media (max-width: 760px) {
  .doc-header,
  .result-panel,
  .pdf-preview-head {
    flex-direction: column;
  }
  .doc-meta {
    text-align: left;
  }
  .toolbar-right {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .pdf-frame-wrap {
    min-height: 480px;
    height: 68vh;
  }
}
</style>
