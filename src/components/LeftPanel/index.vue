<template>
  <div
    ref="panelRoot"
    class="left-panel-wrap u-scrollbar-hidden"
    :style="{ overflowY, overflowX }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <!-- 通用顶部：当前对话视窗内的 custom-chart（与气泡序号联动） -->
    <section
      v-if="viewportChartList.length > 0"
      class="dialog-charts-strip"
      aria-label="对话图表摘录"
    >
      <div class="dialog-charts-panel chat-dialog-charts-panel--emphasis">
        <button
          type="button"
          class="dialog-charts-head"
          @click="uiStore.toggleChartSectionExpanded()"
        >
          <span class="dch-title">对话图表</span>
          <span class="dch-badge">{{ viewportChartList.length }}</span>
          <span class="dch-hint">{{
            chartSectionExpanded ? "收起" : "展开"
          }}</span>
          <span class="dch-chev" aria-hidden="true">{{
            chartSectionExpanded ? "▲" : "▼"
          }}</span>
        </button>
        <div v-show="chartSectionExpanded" class="dialog-charts-body">
          <div class="dialog-charts-scroll u-scrollbar-hidden">
            <div
              v-for="row in viewportChartList"
              :key="`${row.messageId}-${row.ordinalInMessage}`"
              class="dialog-chart-slot"
              role="button"
              tabindex="0"
              @click="uiStore.requestScrollToMessage(row.messageId)"
              @keydown.enter.prevent="
                uiStore.requestScrollToMessage(row.messageId)
              "
            >
              <DialogChartMini
                :payload="row.payload"
                :global-index="row.globalIndex"
              />
              <div class="dcs-hint">点击跳转对话</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <transition name="panel-switch" mode="out-in">
      <!-- 报告生成专属左栏 -->
      <div v-if="panelKey === 'report'" key="report" class="panel-content">
        <StatCard
          label="报告历史记录"
          :value="reportStore.histories.length"
          unit="份"
        />
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">最近生成</div>
          <div v-if="reportStore.histories.length" class="report-history-list">
            <div
              v-for="item in reportStore.histories"
              :key="item.id"
              class="report-history-item neu-card-sm"
              :class="{ active: reportStore.activeHistoryId === item.id }"
              @click="reportStore.selectHistory(item.id)"
            >
              <div class="rhi-title">{{ item.title }}</div>
              <div class="rhi-meta">
                {{ reportTypeLabel(item.type) }} · {{ item.generatedAt }}
              </div>
            </div>
          </div>
          <div v-else class="panel-empty">暂无历史记录，生成后自动沉淀</div>
        </div>
      </div>

      <!-- 履约画像专属左栏 -->
      <div
        v-else-if="panelKey === 'compliance'"
        key="compliance"
        class="panel-content"
      >
        <StatCard
          label="履约平均分"
          :value="complianceStore.averageScore"
          unit="分"
          :sub="complianceSummaryItems"
        />
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">服务单位排名</div>
          <div class="rank-list">
            <SelectableRankRow
              v-for="(unit, index) in complianceStore.sortedUnits"
              :key="unit.id"
              variant="compliance"
              :selected="complianceStore.selectedUnitId === unit.id"
              :title="unit.name"
              :bar-width-pct="unit.score"
              :bar-fill-style="{
                width: unit.score + '%',
                background: scoreTierColor(unit.score),
              }"
              :metric="String(unit.score)"
              :metric-style="{ color: scoreTierColor(unit.score) }"
              @select="complianceStore.selectUnit(unit.id)"
            >
              <template #rank>
                <div class="rank-num" :class="rankNumClass(index)">
                  {{ index + 1 }}
                </div>
              </template>
            </SelectableRankRow>
          </div>
        </div>
      </div>

      <!-- 病害工单专属左栏 -->
      <div
        v-else-if="panelKey === 'workorder'"
        key="workorder"
        class="panel-content"
      >
        <StatCard label="活跃工单" :value="woTotal" unit="张" />
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">工单状态分布</div>
          <StatusBarList
            :items="woBars"
            :total="woTotal"
            :fill-by-key="false"
          />
        </div>
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">近期工单</div>
          <div class="task-list">
            <div
              v-for="w in recentWorkorders"
              :key="w.id"
              class="task-item neu-card-sm"
            >
              <span class="task-icon">{{ w.icon }}</span>
              <div class="task-info">
                <div class="task-name">{{ w.title }}</div>
                <div class="task-time">{{ w.time }}</div>
              </div>
              <span class="task-status" :class="w.status">{{
                taskLabel(w.status)
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 全景洞察 -->
      <div v-else-if="mode === 'insight'" key="insight" class="panel-content">
        <StatCard
          label="告警总数"
          :value="alertStore.totalCount"
          unit="处"
          :sub="severityItems"
        />
      
        <PieChart :data="alertStore.typeDistribution" />
        <div class="neu-card alert-list-card">
          <div class="genshin-subtitle sec-title">最新告警</div>
          <div class="alert-list">
            <div
              v-for="alert in recentAlerts"
              :key="alert.id"
              class="alert-item neu-card-sm"
              :class="alert.severity"
              @click="onRecentAlertClick(alert)"
            >
              <SeverityBadge :level="alert.severity" size="sm" />
              <div class="alert-info">
                <div class="alert-type">
                  {{ alert.type }} · {{ alert.district }}
                </div>
                <div class="alert-addr">{{ alert.address }}</div>
              </div>
              <span class="alert-time">{{ alert.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据采集 -->
      <div v-else-if="mode === 'collect'" key="collect" class="panel-content">
        <div v-if="ragCitation.active" class="neu-card status-card rag-cite-card">
          <div class="genshin-subtitle sec-title">当前引用</div>
          <div class="rag-cite-name">{{ ragCitation.active.filename }}</div>
          <div v-if="ragCitation.active.filepage > 0" class="rag-cite-meta">
            第 {{ ragCitation.active.filepage }} 页
          </div>
          <p v-if="ragCitationSnippet" class="rag-cite-chunk">{{ ragCitationSnippet }}</p>
          <div class="rag-cite-actions">
            <button
              v-if="ragCitation.active.sourceMessageId != null"
              type="button"
              class="rag-cite-btn"
              @click="onScrollToCitationMessage"
            >
              定位对话
            </button>
            <button type="button" class="rag-cite-btn ghost" @click="ragCitation.clear()">
              清除
            </button>
          </div>
        </div>
        <StatCard label="累计上传报告" :value="47" unit="份" />
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">采集状态</div>
          <div class="collect-stats">
            <div v-for="s in collectStats" :key="s.label" class="cs-item">
              <span class="cs-dot" :style="{ background: s.color }"></span>
              <span class="cs-label">{{ s.label }}</span>
              <span class="cs-val">{{ s.val }}</span>
            </div>
          </div>
        </div>
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">近期上传任务</div>
          <div class="task-list">
            <div
              v-for="t in uploadTasks"
              :key="t.id"
              class="task-item neu-card-sm"
            >
              <span class="task-icon">📄</span>
              <div class="task-info">
                <div class="task-name">{{ t.name }}</div>
                <div class="task-time">{{ t.time }}</div>
              </div>
              <span class="task-status" :class="t.status">{{
                taskLabel(t.status)
              }}</span>
            </div>
          </div>
        </div>
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">知识库统计</div>
          <div class="kb-mini-stats">
            <div class="kbms-item">
              <span class="kbms-num">247</span
              ><span class="kbms-label">病害记录</span>
            </div>
            <div class="kbms-item">
              <span class="kbms-num">89</span
              ><span class="kbms-label">知识点</span>
            </div>
            <div class="kbms-item">
              <span class="kbms-num">3</span
              ><span class="kbms-label">知识库</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 运营管理 -->
      <div
        v-else-if="mode === 'operations'"
        key="operations"
        class="panel-content"
      >
        <StatCard label="活跃工单" :value="23" unit="张" />
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">工单总览</div>
          <StatusBarList
            :items="woBars"
            :total="woTotal"
            :fill-by-key="false"
          />
        </div>
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">本月计划执行</div>
          <div class="plan-ring-wrap">
            <svg viewBox="0 0 100 100" width="80" height="80" class="plan-ring">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="var(--bg-groove)"
                stroke-width="10"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="var(--genshin-blue)"
                stroke-width="10"
                stroke-dasharray="251.2"
                :stroke-dashoffset="251.2 * (1 - 0.68)"
                stroke-linecap="round"
                transform="rotate(-90 50 50)"
              />
              <text
                x="50"
                y="54"
                text-anchor="middle"
                font-size="16"
                font-weight="800"
                fill="var(--genshin-blue-dark)"
              >
                68%
              </text>
            </svg>
            <div class="plan-labels">
              <div class="pl-item">
                <span class="pl-dot" style="background: #5cad8a"></span>已完成
                34
              </div>
              <div class="pl-item">
                <span class="pl-dot" style="background: #e0a050"></span>进行中
                16
              </div>
              <div class="pl-item">
                <span class="pl-dot" style="background: var(--text-faint)"></span>待开始
                50
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 隐患预判 -->
      <div v-else-if="mode === 'predict'" key="predict" class="panel-content">
        <StatCard label="高风险路段" :value="2" unit="条" />
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">高风险路段 TOP5</div>
          <div class="risk-list">
            <div v-for="r in riskRoads" :key="r.name" class="risk-mini-item">
              <span class="risk-rank" :class="r.cls">{{ r.rank }}</span>
              <div class="risk-info">
                <div class="risk-name">{{ r.name }}</div>
                <div class="risk-bar-row">
                  <div class="risk-bar-track">
                    <div
                      class="risk-bar-fill"
                      :class="r.cls"
                      :style="{ width: r.prob + '%' }"
                    ></div>
                  </div>
                  <span class="risk-prob" :class="r.cls">{{ r.prob }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <BarChart title="各区域风险指数" :data="riskDistData" />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { storeToRefs } from "pinia";
import { useAdaptiveVerticalScroll } from "../../composables/useAdaptiveVerticalScroll";
import { useAlertStore, type AlertPoint } from "../../stores/alertStore";
import { useChatStore } from "../../stores/chatStore";
import { useUiStore } from "../../stores/uiStore";
import { useCanvasStore, type CanvasViewType } from "../../stores/canvasStore";
import { useReportStore, type ReportType } from "../../stores/reportStore";
import { useComplianceStore } from "../../stores/complianceStore";
import { useRagCitationStore } from "../../stores/ragCitationStore";
import {
  SEV_LABELS,
  SEV_COLORS,
  SEV_ORDER,
  STATUS_COLORS,
  scoreTierColor,
} from "../../utils/labels";
import StatCard from "./StatCard.vue";
import PieChart from "./PieChart.vue";
import BarChart from "./BarChart.vue";
import DialogChartMini from "./DialogChartMini.vue";
import SeverityBadge from "../common/SeverityBadge.vue";
import StatusBarList from "../common/StatusBarList.vue";
import SelectableRankRow from "../common/SelectableRankRow.vue";

const alertStore = useAlertStore();
const chatStore = useChatStore();
const uiStore = useUiStore();
const { chartSectionExpanded, viewportChartList } = storeToRefs(uiStore);
const canvasStore = useCanvasStore();
const reportStore = useReportStore();
const complianceStore = useComplianceStore();
const ragCitation = useRagCitationStore();

function onRecentAlertClick(alert: AlertPoint) {
  alertStore.selectAlert(alert);
  chatStore.attachAlert(alert);
}

const mode = computed(() => canvasStore.agentMode);
const activeViewType = computed<CanvasViewType | null>(
  () => canvasStore.getActiveTab()?.type ?? null,
);
const panelKey = computed(() => {
  if (activeViewType.value === "report") return "report";
  if (activeViewType.value === "compliance") return "compliance";
  if (activeViewType.value === "workorder") return "workorder";
  return mode.value;
});

const ragCitationSnippet = computed(() => {
  const t = ragCitation.active?.chunk_content ?? "";
  if (!t) return "";
  return t.length > 160 ? `${t.slice(0, 160)}…` : t;
});

function onScrollToCitationMessage() {
  const id = ragCitation.active?.sourceMessageId;
  if (id == null) return;
  uiStore.requestScrollToMessage(id);
}

const total = computed(() => alertStore.totalCount);

const severityItems = computed(() =>
  (["high", "medium", "low"] as const).map((l) => ({
    label: SEV_LABELS[l],
    value: alertStore.severitySummary[l],
    color: SEV_COLORS[l],
  })),
);
const recentAlerts = computed(() =>
  [...alertStore.filteredAlerts]
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])
    .slice(0, 6),
);

/* 数据采集模式 */
const collectStats = [
  { label: "提取成功率", val: "94.3%", color: SEV_COLORS.low },
  { label: "处理中任务", val: "2", color: SEV_COLORS.medium },
  { label: "失败任务", val: "1", color: SEV_COLORS.high },
];
const uploadTasks = [
  { id: 1, name: "2024年Q1巡检报告.pdf", time: "03-15 10:22", status: "done" },
  {
    id: 2,
    name: "西湖区道路检测报告.pdf",
    time: "03-16 14:05",
    status: "done",
  },
  {
    id: 3,
    name: "滨江区专项检测.pdf",
    time: "03-18 09:30",
    status: "processing",
  },
];
function taskLabel(s: string) {
  if (s === "done") return "完成";
  if (s === "processing") return "处理中";
  if (s === "review") return "待复测";
  return "失败";
}

/* 运营管理模式 */
const woBars = [
  { key: "pending", label: "待处理", color: STATUS_COLORS.pending, count: 4 },
  { key: "processing", label: "处理中", color: STATUS_COLORS.processing, count: 10 },
  { key: "review", label: "待复测", color: STATUS_COLORS.review, count: 5 },
  { key: "done", label: "已完成", color: STATUS_COLORS.done, count: 4 },
];
const woTotal = computed(() => woBars.reduce((s, b) => s + b.count, 0));
const recentWorkorders = [
  {
    id: 1,
    icon: "🔴",
    title: "延安路与庆春路交叉口 · 严重疏松",
    time: "03-15 10:22",
    status: "pending",
  },
  {
    id: 2,
    icon: "🔧",
    title: "解放路67号附近 · 空洞",
    time: "03-16 14:05",
    status: "processing",
  },
  {
    id: 3,
    icon: "🔍",
    title: "秋涛路物流通道 · 一般疏松",
    time: "03-18 09:30",
    status: "review",
  },
];

/* 隐患预判模式 */
const riskRoads = [
  { rank: 1, name: "南山路（雷峰塔段）", prob: 78, cls: "risk-high" },
  { rank: 2, name: "文一西路（紫金港段）", prob: 71, cls: "risk-high" },
  { rank: 3, name: "解放路（中段）", prob: 52, cls: "risk-med" },
  { rank: 4, name: "滨江大道（中段）", prob: 43, cls: "risk-med" },
  { rank: 5, name: "丰潭路（中段）", prob: 22, cls: "risk-low" },
];
const riskDistData = computed(() => [
  { name: "上城区", value: 85 },
  { name: "西湖区", value: 72 },
  { name: "滨江区", value: 48 },
  { name: "拱墅区", value: 35 },
  { name: "江干区", value: 28 },
]);

const complianceSummaryItems = computed(() => [
  { label: "红榜", value: complianceStore.redCount, color: SEV_COLORS.low },
  { label: "黑榜", value: complianceStore.blackCount, color: SEV_COLORS.high },
]);
function rankNumClass(i: number) {
  return i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  annual: "年度报告",
  patrol: "巡检情况",
  rectify: "整改情况",
  recheck: "复测情况",
};
function reportTypeLabel(type: ReportType) {
  return REPORT_TYPE_LABELS[type] ?? "报告";
}

const panelRoot = ref<HTMLElement | null>(null);
const { overflowY, overflowX, onEnter, onLeave, remeasure } =
  useAdaptiveVerticalScroll(panelRoot);

watch(panelKey, async () => {
  await nextTick();
  await remeasure();
});
watch(
  recentAlerts,
  async () => {
    await nextTick();
    await remeasure();
  },
  { deep: true },
);
</script>

<style scoped>
.left-panel-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
}
.panel-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-switch-enter-active,
.panel-switch-leave-active {
  transition: all 0.25s ease;
}
.panel-switch-enter-from,
.panel-switch-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

.status-card {
  padding: 16px;
}
.sec-title {
  font-size: 14px;
  margin-bottom: 12px;
}
.panel-empty {
  font-size: 12px;
  color: var(--text-muted);
}
.map-debug-card {
  font-size: 11px;
  color: #4a5d70;
}
.map-debug-line {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono",
    monospace;
  line-height: 1.5;
}

/* 报告侧栏 */
.report-history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.report-history-item {
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.report-history-item.active {
  box-shadow:
    4px 4px 10px var(--shadow-dark),
    -4px -4px 10px var(--shadow-light),
    0 0 0 2px rgba(74, 141, 183, 0.28) !important;
}
.rhi-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rhi-meta {
  margin-top: 4px;
  font-size: 10px;
  color: var(--text-muted);
}

/* 履约侧栏 */
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rank-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--bg-groove);
}
.rank-num.gold {
  background: linear-gradient(135deg, #d4a853, #f0d78c);
  color: #fff;
}
.rank-num.silver {
  background: linear-gradient(135deg, #a8b8c8, #c8d8e8);
  color: #fff;
}
.rank-num.bronze {
  background: linear-gradient(135deg, #c08858, #d8a878);
  color: #fff;
}

.alert-list-card {
  padding: 16px;
  flex-shrink: 0;
}
.alert-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.alert-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}
.alert-item:hover {
  transform: translateX(2px);
  box-shadow:
    6px 6px 12px var(--shadow-dark),
    -6px -6px 12px var(--shadow-light) !important;
}
.alert-info {
  flex: 1;
  min-width: 0;
}
.alert-type {
  font-size: 12px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.alert-addr {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.alert-time {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* 数据采集 */
.rag-cite-card {
  margin-bottom: 10px;
}
.rag-cite-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 4px;
  word-break: break-word;
}
.rag-cite-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}
.rag-cite-chunk {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-muted);
  max-height: 5em;
  overflow: auto;
}
.rag-cite-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.rag-cite-btn {
  font-size: 11px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid rgba(74, 141, 183, 0.35);
  background: rgba(74, 141, 183, 0.1);
  color: var(--genshin-blue);
  cursor: pointer;
  font-family: var(--font-ui);
}
.rag-cite-btn.ghost {
  background: transparent;
  border-color: var(--neu-stroke-muted);
  color: var(--text-muted);
}

.collect-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cs-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.cs-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.cs-label {
  flex: 1;
  color: var(--text-secondary);
}
.cs-val {
  font-weight: 700;
  color: var(--genshin-blue-dark);
}
.task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}
.task-icon {
  font-size: 14px;
}
.task-info {
  flex: 1;
  min-width: 0;
}
.task-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--genshin-blue-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-time {
  font-size: 10px;
  color: var(--text-muted);
}
.task-status {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 6px;
  font-weight: 600;
  white-space: nowrap;
}
.task-status.done {
  background: rgba(92, 173, 138, 0.1);
  color: #5cad8a;
}
.task-status.processing {
  background: rgba(224, 160, 80, 0.1);
  color: #e0a050;
}
.kb-mini-stats {
  display: flex;
  gap: 8px;
}
.kbms-item {
  flex: 1;
  text-align: center;
  padding: 8px 4px;
  background: var(--bg-groove);
  border-radius: 10px;
  box-shadow:
    inset 2px 2px 4px var(--shadow-dark),
    inset -2px -2px 4px var(--shadow-light);
}
.kbms-num {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: var(--genshin-blue);
}
.kbms-label {
  font-size: 10px;
  color: var(--text-muted);
}

/* 运营管理 */
.plan-ring-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
}
.plan-ring {
  flex-shrink: 0;
}
.plan-labels {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pl-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}
.pl-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 隐患预判 */
.risk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.risk-mini-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.risk-rank {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.risk-rank.risk-high {
  background: #e07070;
}
.risk-rank.risk-med {
  background: #e0a050;
}
.risk-rank.risk-low {
  background: #5cad8a;
}
.risk-info {
  flex: 1;
  min-width: 0;
}
.risk-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--genshin-blue-dark);
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.risk-bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.risk-bar-track {
  flex: 1;
  height: 5px;
  background: var(--bg-groove);
  border-radius: 3px;
  overflow: hidden;
}
.risk-bar-fill {
  height: 100%;
  border-radius: 3px;
}
.risk-bar-fill.risk-high {
  background: linear-gradient(90deg, #e07070, #eaa0a0);
}
.risk-bar-fill.risk-med {
  background: linear-gradient(90deg, #e0a050, #f0c070);
}
.risk-bar-fill.risk-low {
  background: linear-gradient(90deg, #5cad8a, #7dc4a5);
}
.risk-prob {
  font-size: 10px;
  font-weight: 700;
  min-width: 28px;
  text-align: right;
}
.risk-prob.risk-high {
  color: #e07070;
}
.risk-prob.risk-med {
  color: #e0a050;
}
.risk-prob.risk-low {
  color: #5cad8a;
}

/* ── 通用顶部：对话图表（视窗同源） ── */
.dialog-charts-strip {
  flex-shrink: 0;
  padding: 0 10px;
  margin-bottom: 8px;
}
.chat-dialog-charts-panel--emphasis {
  border-radius: 14px;
  border: 2px solid rgba(74, 141, 183, 0.55);
  box-shadow:
    0 0 0 1px rgba(212, 168, 83, 0.22),
    8px 8px 20px rgba(45, 90, 123, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
  background: linear-gradient(
    155deg,
    rgba(240, 248, 252, 0.96),
    rgba(218, 232, 242, 0.88)
  );
  overflow: hidden;
}
.dialog-charts-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin: 0;
  border: none;
  cursor: pointer;
  font-family: inherit;
  background: linear-gradient(
    90deg,
    rgba(45, 90, 123, 0.12),
    transparent 72%
  );
  border-bottom: 1px solid rgba(74, 141, 183, 0.28);
  text-align: left;
}
.dch-title {
  font-family: "Noto Serif SC", serif;
  font-weight: 800;
  font-size: 13px;
  color: var(--genshin-blue-dark);
  letter-spacing: 0.06em;
}
.dch-badge {
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  background: rgba(212, 84, 84, 0.95);
  color: #fff;
  box-shadow: 0 2px 8px rgba(160, 60, 60, 0.35);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dch-hint {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: #5a6d80;
}
.dch-chev {
  font-size: 10px;
  color: var(--genshin-blue);
}
.dialog-charts-body {
  max-height: min(52vh, 440px);
  overflow: hidden;
}
.dialog-charts-scroll {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 10px 12px;
  max-height: min(52vh, 440px);
  overflow-y: auto;
}
.dialog-chart-slot {
  cursor: pointer;
  border-radius: 12px;
  outline: none;
}
.dialog-chart-slot:focus-visible {
  box-shadow: 0 0 0 2px rgba(212, 168, 83, 0.75);
}
.dcs-hint {
  margin-top: 6px;
  font-size: 10px;
  font-weight: 600;
  color: #6a7d90;
  text-align: center;
}
</style>
