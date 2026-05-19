<template>
  <div v-if="!ready" class="lifecycle-loading neu-card">加载病害数据…</div>

  <div v-else-if="notFound" class="lifecycle-missing neu-card">
    <div class="missing-title">未找到该病害</div>
    <p class="missing-desc">请从地图或工单看板重新进入生命周期视图。</p>
    <button
      type="button"
      class="lc-button lc-button-primary"
      @click="goWorkspace"
    >
      返回工作台
    </button>
  </div>

  <div v-else-if="overlayMissing" class="lifecycle-missing neu-card">
    <div class="missing-title">缺少叠加点上下文</div>
    <p class="missing-desc">
      刷新后需从地图上的智能体查询点位重新打开「查看生命周期」。
    </p>
    <button
      type="button"
      class="lc-button lc-button-primary"
      @click="router.back()"
    >
      返回上一页
    </button>
  </div>

  <div
    v-else
    class="lifecycle-root u-scrollbar-hidden"
    ref="rootRef"
    :style="{ overflowY, overflowX }"
    @mouseenter="scrollHooks.onEnter"
    @mouseleave="scrollHooks.onLeave"
  >
    <ViewToolbar class="lifecycle-toolbar">
      <div class="lc-toolbar-row">
        <div class="lc-heading">
          <span class="genshin-subtitle lc-toolbar-heading">病害生命周期</span>
          <span class="lc-toolbar-sep" aria-hidden="true">·</span>
          <span class="lc-toolbar-code"
            >{{ groupTitle }}</span
          >
        </div>
        <div class="lc-toolbar-actions">
          <button
            type="button"
            class="back-btn toolbar-back"
            @click="router.back()"
          >
            <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
              <path
                d="M12 4l-6 6 6 6"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>返回</span>
          </button>
        </div>
      </div>
    </ViewToolbar>

    <div class="lifecycle-stack">
      <div class="neu-card info-card">
        <div class="info-left">
          <SeverityBadge :level="current!.severity" />
          <span class="defect-type">{{ current!.type }}</span>
          <span class="defect-addr">📍 {{ current!.address }}</span>
        </div>
        <div class="info-desc">
          {{ current!.description || "路面病害记录。" }}
        </div>
        <div class="info-right">
          <div class="info-meta">
            <template v-if="groupSource === 'api' && apiGroupNumber">
              病害群组：{{ groupedAlerts.length }} 个点
            </template>
            <template v-else>
              群组范围：{{ current!.district }} · 半径 {{ GROUP_RADIUS_METERS }}m
            </template>
          </div>
          <div class="info-meta">群组病害数：{{ groupedAlerts.length }}</div>
          <div class="info-meta">
            高危病害：{{ groupedAlerts.filter((x) => x.severity === "high").length }}
          </div>
        </div>
      </div>

      <div class="neu-card flow-card">
        <div class="section-title">生命周期时间轴</div>
        <div
          class="stages-row u-scrollbar-hidden"
          :style="{ '--stage-arrow-width': `${stageArrowWidth}px` }"
        >
          <div
            v-for="(node, i) in timelineNodes"
            :key="node.key"
            class="stage-wrap"
            @click="onSelectStage(i)"
          >
            <div class="stage-node" :class="stageNodeClass(i)">
              <div class="stage-circle">
                <span>{{ i + 1 }}</span>
              </div>
              <div class="stage-label">{{ node.title }}</div>
              <div class="stage-sub">
                {{ node.workOrders.length }} 个工单 · {{ node.observedAt }}
              </div>
              <div class="stage-tags">
                <span
                  v-for="tag in node.tags"
                  :key="`${node.key}-${tag}`"
                  class="stage-tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <div v-if="i < timelineNodes.length - 1" class="stage-arrow" />
          </div>
        </div>

        <transition name="stage-detail" mode="out-in">
          <div :key="selectedNode.key" class="stage-detail">
            <div class="detail-grid">
              <div
                v-for="row in stageDetailMainRows"
                :key="row.key"
                class="detail-field"
              >
                <span class="dr-label">{{ row.label }}</span>
                <span
                  class="dr-val"
                  :class="{ 'state-name': row.key === 'stateLabel' }"
                >
                  {{ row.value }}
                </span>
              </div>
            </div>
            <div
              v-for="row in stageDetailLocationRows"
              :key="row.key"
              class="detail-field detail-field-full"
            >
              <span class="dr-label">{{ row.label }}</span>
              <span class="dr-val">{{ row.value }}</span>
            </div>
            <div
              v-if="stageDetailMediaRows.length"
              class="workorder-media-grid"
            >
              <div
                v-for="row in stageDetailMediaRows"
                :key="row.key"
                class="detail-field media-field"
              >
                <span class="dr-label">{{ row.label }}</span>
                <img
                  v-if="hasMediaValue(row.value)"
                  class="media-preview"
                  :src="mediaFileUrl(row.value)"
                  :alt="row.label"
                  loading="lazy"
                  @click="openMediaDialog(row.label, row.value)"
                />
                <div v-else class="media-empty">
                  <span class="media-empty-icon" aria-hidden="true">□</span>
                  <span>暂无图片</span>
                </div>
              </div>
            </div>
            <div class="workorder-group">
              <div class="workorder-group-title">
                关联工单（{{ selectedNode.workOrders.length }}）
              </div>
              <div
                v-for="wo in selectedNode.workOrders"
                :key="wo.woNo + wo.title"
                class="state-wo neu-card-sm"
              >
                <div class="state-wo-head">
                  <span class="state-wo-no">{{ workOrderCategoryLabel(wo.category) }}</span>
                  <span class="state-wo-time">{{ wo.submittedAt }}</span>
                </div>
                <!-- <div class="state-wo-title">{{ wo.title }}</div> -->
                <div class="workorder-field-grid">
                  <div
                    v-for="row in workOrderGridRows(wo)"
                    :key="`${wo.woNo}-${row.key ?? row.label}`"
                    class="detail-field"
                    :class="{ 'detail-field-full': row.layout === 'full' }"
                  >
                    <span class="dr-label">{{ row.label }}</span>
                    <span class="dr-val">{{ row.value }}</span>
                  </div>
                </div>
                <div
                  v-for="row in workOrderRowsByKind(wo, 'location')"
                  :key="`${wo.woNo}-${row.key ?? row.label}`"
                  class="detail-field detail-field-full workorder-location-row"
                >
                  <span class="dr-label">{{ row.label }}</span>
                  <span class="dr-val">{{ row.value }}</span>
                </div>
                <div
                  v-if="workOrderRowsByKind(wo, 'media').length"
                  class="workorder-media-grid"
                >
                  <div
                    v-for="row in workOrderRowsByKind(wo, 'media')"
                    :key="`${wo.woNo}-${row.key ?? row.label}`"
                    class="detail-field media-field"
                  >
                    <span class="dr-label">{{ row.label }}</span>
                    <img
                      v-if="hasMediaValue(row.value)"
                      class="media-preview"
                      :src="mediaFileUrl(row.value)"
                      :alt="row.label"
                      loading="lazy"
                      @click="openMediaDialog(row.label, row.value)"
                    />
                    <div v-else class="media-empty">
                      <span class="media-empty-icon" aria-hidden="true">□</span>
                      <span>暂无图片</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <div class="neu-card analyze-card">
        <div class="analyze-head">
          <div class="analyze-title-block">
            <div class="section-title analyze-title">病害状态智能分析</div>
            <div class="analyze-subtitle">{{ analyzeSubtitle }}</div>
          </div>
          <div class="analytics-row">
            <div
              v-for="a in groupAnalytics"
              :key="a.label"
              class="analytics-pill neu-card-sm"
            >
              <span class="ap-l">{{ a.label }}</span>
              <span class="ap-v">{{ a.value }}</span>
            </div>
          </div>
        </div>

        <div v-if="hasCoords" class="prox-grid">
          <div class="prox-map-panel">
            <DefectContextMiniMap
              class="prox-map"
              :points="distributionPoints"
              :selected-point-id="selectedDistributionId"
              @select-point="onSelectDistributionPoint"
            />
          </div>
          <div class="impact-panel neu-inset">
            <div class="corr-title">关联影响分析</div>
            <p v-for="(line, idx) in impactLines" :key="idx" class="corr-p">
              {{ line }}
            </p>
            <p class="corr-footnote">{{ impactFootnote }}</p>
          </div>
        </div>
        <div v-else class="no-coords">暂无有效坐标，无法计算群组病害分布。</div>
      </div>
    </div>

    <div
      v-if="mediaDialog.open"
      class="media-dialog-mask"
      role="dialog"
      aria-modal="true"
      :aria-label="mediaDialog.title"
      @click.self="closeMediaDialog"
    >
      <div class="media-dialog">
        <div class="media-dialog-head">
          <div class="media-dialog-title">{{ mediaDialog.title }}</div>
          <button
            type="button"
            class="media-dialog-close"
            aria-label="关闭图片预览"
            @click="closeMediaDialog"
          >
            ×
          </button>
        </div>
        <div class="media-dialog-body">
          <img
            class="media-dialog-image"
            :src="mediaDialog.src"
            :alt="mediaDialog.title"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAdaptiveVerticalScroll } from "../../composables/useAdaptiveVerticalScroll";
import ViewToolbar from "../common/ViewToolbar.vue";
import SeverityBadge from "../common/SeverityBadge.vue";
import DefectContextMiniMap from "./DefectContextMiniMap.vue";
import { useAlertStore, type AlertPoint } from "../../stores/alertStore";
import { useChatStore } from "../../stores/chatStore";
import { useMapOverlayStore } from "../../stores/mapOverlayStore";
import {
  getLifecycleMockForAlertId,
  getLifecycleMockForOverlay,
  type LifecycleWoPayload,
  type LifecycleMockBundle,
} from "../../defect/lifecycleMocks";
import { buildLifecycleBundleFromSolve } from "../../defect/solveToLifecycle";
import { querySelectGroup, querySolve } from "../../api/queryDisease";
import { mapDetectionRowToAlert } from "../../utils/mapDetectionRowToAlert";
import type { DetectionRowRaw } from "../../utils/mapDetectionRowToAlert";
import { haversineMeters } from "../../utils/geoDistance";

const SYNTHETIC_OVERLAY_ALERT_ID = -1;
const GROUP_RADIUS_METERS = 350;
const OVERLAY_DUPLICATE_DISTANCE_METERS = 8;

function parseRouteAlertId(raw: unknown): number | null {
  const id = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(id) || id === SYNTHETIC_OVERLAY_ALERT_ID) {
    return null;
  }
  return id;
}

function isValidCoord(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

const route = useRoute();
const router = useRouter();
const alertStore = useAlertStore();
const chatStore = useChatStore();
const mapOverlayStore = useMapOverlayStore();

const rootRef = ref<HTMLElement | null>(null);
const {
  overflowY,
  overflowX,
  onEnter,
  onLeave,
} = useAdaptiveVerticalScroll(rootRef, {
  persistScrollWhenOverflow: true,
});

const scrollHooks = { onEnter, onLeave };

const ready = ref(false);
const selStage = ref(0);
const selectedDistributionId = ref<number | null>(null);

const isOverlayMode = computed(() => route.query.overlay === "1");

const overlaySnap = computed(() => mapOverlayStore.focusedOverlayForLifecycle);

const STATUS_LABEL_MAP: Record<AlertPoint["status"], string> = {
  pending: "待处理",
  processing: "处理中",
  completed: "已修复",
};

function statusText(status: AlertPoint["status"]) {
  return STATUS_LABEL_MAP[status];
}

function timeWeight(raw: string): number {
  const ms = Date.parse(raw);
  if (Number.isFinite(ms)) return ms;
  const num = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(num) ? num : 0;
}

const current = computed<AlertPoint | null>(() => {
  if (isOverlayMode.value && overlaySnap.value) {
    const o = overlaySnap.value;
    return {
      id: SYNTHETIC_OVERLAY_ALERT_ID,
      lat: o.lat,
      lng: o.lng,
      type: o.disease_name || "叠加病害点",
      severity: o.severity,
      district: o.disease_category || "—",
      address: `${o.disease_category} · ${o.disease_level}`,
      time: new Date().toLocaleString("zh-CN", { hour12: false }),
      status: "pending",
      description: "来源：智能体地图叠加查询结果（演示）",
    };
  }
  const id = parseRouteAlertId(route.params.id);
  if (id === null) return null;
  return alertStore.baseAlerts.find((a) => a.id === id) ?? null;
});

const apiGroupedAlerts = ref<AlertPoint[] | null>(null);
const apiGroupNumber = ref("");
const apiSolveBundle = ref<LifecycleMockBundle | null>(null);
const apiSelectGroupRowsByAlertId = ref<Record<number, DetectionRowRaw>>({});
const apiSolveWorkOrdersByAlertId = ref<Record<number, LifecycleWoPayload[]>>({});
const mediaDialog = ref({
  open: false,
  title: "",
  src: "",
});

const FILE_SERVER_BASE_URL = normalizeUrlPrefix(
  (import.meta.env.VITE_FILE_SERVER_BASE_URL as string | undefined) ??
    "http://47.114.93.164:8082/",
);

function normalizeUrlPrefix(raw: string) {
  const text = raw.trim();
  if (!text) return "";
  return text.endsWith("/") ? text : `${text}/`;
}

function hasMediaValue(value: string) {
  return value.trim() !== "" && value.trim() !== "—";
}

function mediaFileUrl(value: string) {
  const path = value.trim().replace(/^\/+/, "");
  return `${FILE_SERVER_BASE_URL}${path}`;
}

function openMediaDialog(title: string, value: string) {
  if (!hasMediaValue(value)) return;
  mediaDialog.value = {
    open: true,
    title,
    src: mediaFileUrl(value),
  };
}

function closeMediaDialog() {
  mediaDialog.value = {
    open: false,
    title: "",
    src: "",
  };
}

function onMediaDialogKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && mediaDialog.value.open) {
    closeMediaDialog();
  }
}

async function refreshQueryLifecycleData() {
  apiGroupedAlerts.value = null;
  apiGroupNumber.value = "";
  apiSolveBundle.value = null;
  apiSelectGroupRowsByAlertId.value = {};
  apiSolveWorkOrdersByAlertId.value = {};
  const c = current.value;
  if (!c || isOverlayMode.value || c.id === SYNTHETIC_OVERLAY_ALERT_ID) return;
  const y = c.defectYear?.trim();
  const n = c.defectNumber?.trim();
  if (!y || !n) return;
  try {
    const g = await querySelectGroup({ year: y, number: n });
    apiGroupNumber.value = g.group_number;
    const rawRows: DetectionRowRaw[] = [];
    if (g.source_item) rawRows.push(g.source_item);
    for (const it of g.items) rawRows.push(it);
    const rowsByAlertId: Record<number, DetectionRowRaw> = {};
    const mapped = rawRows
      .map((row) => {
        const alert = mapDetectionRowToAlert(row);
        if (alert) rowsByAlertId[alert.id] = row;
        return alert;
      })
      .filter((x): x is AlertPoint => x !== null);
    const ids = new Set(mapped.map((a) => a.id));
    if (!ids.has(c.id)) mapped.unshift({ ...c });
    apiSelectGroupRowsByAlertId.value = rowsByAlertId;
    apiGroupedAlerts.value = [...mapped].sort(
      (a, b) => timeWeight(a.time) - timeWeight(b.time) || a.id - b.id,
    );
  } catch {
    apiGroupedAlerts.value = null;
  }
  try {
    const sol = await querySolve({ year: y, number: n });
    apiSolveBundle.value = buildLifecycleBundleFromSolve({
      year: sol.year,
      number: sol.number,
      diseaseType: c.type,
      detectTime: c.time,
      needsRectification: sol.needs_rectification,
      reviewTotal: sol.review_total,
      rectificationTotal: sol.rectification_total,
      reviewRecords: sol.review_records,
      rectificationRecords: sol.rectification_records,
    });
    apiSolveWorkOrdersByAlertId.value = {
      ...apiSolveWorkOrdersByAlertId.value,
      [c.id]: buildSolveWorkOrders(sol, n),
    };
  } catch {
    apiSolveBundle.value = null;
  }
}

const notFound = computed(() => {
  if (!ready.value) return false;
  if (isOverlayMode.value) return false;
  return current.value === null;
});

const overlayMissing = computed(
  () => ready.value && isOverlayMode.value && !overlaySnap.value,
);

const hasCoords = computed(() => {
  const c = current.value;
  if (!c) return false;
  return isValidCoord(c.lat, c.lng);
});

const groupedAlerts = computed<AlertPoint[]>(() => {
  const c = current.value;
  if (!c || !hasCoords.value) return c ? [c] : [];
  const api = apiGroupedAlerts.value;
  if (api && api.length > 0) {
    const hasCurrent = api.some((a) => a.id === c.id);
    if (hasCurrent) return api;
  }
  const inGroup = alertStore.baseAlerts
    .filter((a) => a.district === c.district)
    .filter((a) => isValidCoord(a.lat, a.lng))
    .filter((a) => {
      const dist = haversineMeters(c.lat, c.lng, a.lat, a.lng);
      if (c.id === SYNTHETIC_OVERLAY_ALERT_ID) {
        return dist > OVERLAY_DUPLICATE_DISTANCE_METERS && dist <= GROUP_RADIUS_METERS;
      }
      return dist <= GROUP_RADIUS_METERS;
    });
  const ids = new Set(inGroup.map((a) => a.id));
  if (!ids.has(c.id)) inGroup.push(c);
  return [...inGroup].sort(
    (a, b) => timeWeight(a.time) - timeWeight(b.time) || a.id - b.id,
  );
});

const groupSource = computed<"api" | "proximity">(() => {
  const c = current.value;
  if (!c) return "proximity";
  const api = apiGroupedAlerts.value;
  if (api && api.length > 0 && api.some((a) => a.id === c.id)) return "api";
  return "proximity";
});

const groupTitle = computed(() => {
  const c = current.value;
  if (!c) return "病害生命周期";
  if (groupSource.value === "api" && apiGroupNumber.value) {
    return `${groupedAlerts.value.length}个病害`;
  }
  return `${c.district} 群组 · ${groupedAlerts.value.length}个病害`;
});

interface TimelineNode {
  key: string;
  title: string;
  observedAt: string;
  stateLabel: string;
  changeReason: string;
  tags: string[];
  workOrders: LifecycleWoPayload[];
  alert: AlertPoint;
}

type DetailRowKind = "normal" | "location" | "media";
type DetailField = {
  key: string;
  label: string;
  value: string;
  kind?: DetailRowKind;
  layout?: "full";
};
type WorkOrderField = {
  key: string;
  label: string;
  kind?: DetailRowKind;
};

const RECTIFICATION_WORK_ORDER_FIELDS = [
  { key: "roadName", label: "道路名称" },
  { key: "localStreet", label: "属地街道" },
  { key: "diseaseType", label: "病害类型" },
  { key: "rectificationMethod", label: "整改方式" },
  { key: "rectificationDate", label: "整改日期" },
  { key: "location", label: "具体位置", kind: "location" },
  { key: "beforeRectificationPhoto", label: "整改前照片", kind: "media" },
  { key: "duringRectificationPhoto", label: "整改中照片", kind: "media" },
  { key: "afterRectificationPhoto", label: "整改后照片", kind: "media" },
] as const;

const REVIEW_WORK_ORDER_FIELDS = [
  { key: "riskLevel", label: "风险等级" },
  { key: "reviewOrder", label: "复测次序" },
  { key: "reviewSituation", label: "复测情况" },
  { key: "reviewer", label: "复测人员" },
  { key: "reviewTime", label: "复测时间" },
  { key: "locationDescription", label: "位置描述", kind: "location" },
  { key: "radarImage", label: "雷达图像", kind: "media" },
  { key: "reviewImage", label: "复测图像", kind: "media" },
  { key: "electronicMap", label: "电子地图", kind: "media" },
  { key: "sitePhoto", label: "现场照片", kind: "media" },
] as const;

function workOrderRows(
  row: Record<string, unknown>,
  fields: readonly WorkOrderField[],
) {
  return fields.map((f) => ({
    key: f.key,
    label: f.label,
    value: detailValue(row[f.key]),
    kind: "kind" in f ? f.kind : "normal",
  }));
}

function rowsByKind(rows: readonly { kind?: DetailRowKind }[] | undefined, kind: DetailRowKind) {
  return (rows ?? []).filter((row) => (row.kind ?? "normal") === kind);
}

function workOrderRowsByKind(
  wo: LifecycleWoPayload,
  kind: DetailRowKind,
) {
  return rowsByKind(wo.detailRows, kind);
}

function workOrderMetaRows(wo: LifecycleWoPayload): DetailField[] {
  const rows: DetailField[] = [];
  if (wo.category) {
    rows.push({
      key: "category",
      label: "工单类别",
      value: workOrderCategoryLabel(wo.category),
    });
  }
  rows.push(
    {
      key: "submittedBy",
      label: "提交人",
      value: wo.submittedBy,
    },
    {
      key: "resultSummary",
      label: "处理摘要",
      value: wo.resultSummary,
    },
  );
  return rows;
}

function workOrderGridRows(wo: LifecycleWoPayload): DetailField[] {
  const normalRows = workOrderRowsByKind(wo, "normal") as DetailField[];
  const metaRows = workOrderMetaRows(wo);
  if (wo.category !== "rectification") {
    return [...metaRows, ...normalRows];
  }

  const rowsByKey = new Map(normalRows.map((row) => [row.key, row]));
  const pick = (key: string) => rowsByKey.get(key);
  const orderedRows = [
    metaRows.find((row) => row.key === "category"),
    metaRows.find((row) => row.key === "submittedBy"),
    pick("rectificationDate"),
    pick("roadName"),
    pick("localStreet"),
    pick("diseaseType"),
    pick("rectificationMethod"),
    metaRows.find((row) => row.key === "resultSummary"),
  ].filter((row): row is DetailField => !!row);

  return orderedRows;
}

function workOrderCategoryLabel(category: LifecycleWoPayload["category"]) {
  if (category === "rectification") return "整改工单";
  if (category === "review") return "复测工单";
  return "模拟工单";
}

function buildRectificationWorkOrder(
  row: Record<string, unknown>,
  number: string,
  index: number,
): LifecycleWoPayload {
  const method = detailValue(row.rectificationMethod);
  const location = detailValue(row.location);
  return {
    woNo: `ZG-${number}-${index}`,
    title: "整改工单",
    submittedAt: detailValue(row.rectificationDate),
    submittedBy: detailValue(row.localStreet),
    resultSummary: location !== "—" ? `${method} · ${location}` : method,
    category: "rectification",
    detailRows: workOrderRows(row, RECTIFICATION_WORK_ORDER_FIELDS),
  };
}

function buildReviewWorkOrder(
  row: Record<string, unknown>,
  number: string,
  index: number,
): LifecycleWoPayload {
  return {
    woNo: `FC-${number}-${index}`,
    title: "复测工单",
    submittedAt: detailValue(row.reviewTime),
    submittedBy: detailValue(row.reviewer),
    resultSummary: detailValue(row.reviewSituation),
    category: "review",
    detailRows: workOrderRows(row, REVIEW_WORK_ORDER_FIELDS),
  };
}

function buildSolveWorkOrders(
  sol: {
    number: string;
    rectification_records: Record<string, unknown>[];
    review_records: Record<string, unknown>[];
  },
  fallbackNumber: string,
): LifecycleWoPayload[] {
  const number = sol.number || fallbackNumber;
  return [
    ...sol.rectification_records.map((row, i) =>
      buildRectificationWorkOrder(row, number, i + 1),
    ),
    ...sol.review_records.map((row, i) =>
      buildReviewWorkOrder(row, number, i + 1),
    ),
  ];
}

async function loadSolveWorkOrdersForAlert(alert: AlertPoint) {
  if (alert.id === SYNTHETIC_OVERLAY_ALERT_ID) return;
  if (alert.id in apiSolveWorkOrdersByAlertId.value) return;
  const year = alert.defectYear?.trim();
  const number = alert.defectNumber?.trim();
  if (!year || !number) return;
  try {
    const sol = await querySolve({ year, number });
    apiSolveWorkOrdersByAlertId.value = {
      ...apiSolveWorkOrdersByAlertId.value,
      [alert.id]: buildSolveWorkOrders(sol, number),
    };
  } catch {
    /* solve 工单加载失败时保留原阶段工单 */
  }
}

function lifecycleStateForAlert(alert: AlertPoint) {
  if (alert.id === SYNTHETIC_OVERLAY_ALERT_ID) {
    return getLifecycleMockForOverlay();
  }
  const cur = current.value;
  if (cur && alert.id === cur.id && apiSolveBundle.value) {
    return apiSolveBundle.value;
  }
  return getLifecycleMockForAlertId(alert.id);
}

function nodeTags(alert: AlertPoint, stateLabel: string, isCurrent: boolean) {
  const tags = [statusText(alert.status)];
  if (stateLabel.includes("修复") || alert.status === "completed") {
    tags.push("含修复状态");
  }
  if (isCurrent) tags.push("当前点");
  return tags;
}

const timelineNodes = computed<TimelineNode[]>(() => {
  const c = current.value;
  if (!c) return [];
  return groupedAlerts.value.map((alert) => {
    const pack = lifecycleStateForAlert(alert);
    const activeIdx = Math.min(pack.activePhaseIdx, pack.phases.length - 1);
    const phase = pack.phases[activeIdx] ?? pack.phases[0];
    const stateLabel = phase?.label ?? statusText(alert.status);
    const hasApiWorkOrders = alert.id in apiSolveWorkOrdersByAlertId.value;
    const apiWorkOrders = apiSolveWorkOrdersByAlertId.value[alert.id];
    return {
      key: `${alert.id}-${phase?.key ?? "phase"}`,
      title: alert.type,
      observedAt: alert.time || phase?.observedAt || "未知",
      stateLabel,
      changeReason: phase?.changeReason ?? "由巡检发现后进入群组生命周期跟踪。",
      tags: nodeTags(alert, stateLabel, alert.id === c.id),
      workOrders: hasApiWorkOrders ? apiWorkOrders ?? [] : phase?.workOrders ?? [],
      alert,
    };
  });
});

const activeVisualIdx = computed(() => {
  if (timelineNodes.value.length === 0) return 0;
  return Math.min(selStage.value, timelineNodes.value.length - 1);
});

const stageArrowWidth = computed(() => {
  const count = timelineNodes.value.length;
  if (count <= 3) return 74;
  if (count <= 5) return 58;
  return 44;
});

function stageNodeClass(i: number) {
  if (i < activeVisualIdx.value) return "done";
  if (i === activeVisualIdx.value) return "active";
  return "pending";
}

const selectedNode = computed<TimelineNode>(() => {
  return timelineNodes.value[selStage.value] ?? timelineNodes.value[0]!;
});

watch(
  () => selectedNode.value?.alert.id,
  async () => {
    const node = selectedNode.value;
    if (!node) return;
    await loadSolveWorkOrdersForAlert(node.alert);
  },
  { flush: "post" },
);

const SELECTGROUP_DETAIL_FIELDS = [
  { key: "company", label: "公司" },
  { key: "roadName", label: "道路名称" },
  { key: "diseaseType", label: "病害类型" },
  { key: "riskLevel", label: "风险等级" },
  { key: "detectDate", label: "检测日期" },
  { key: "planeSize", label: "平面尺寸" },
  { key: "diseaseBottomDepth", label: "病害体底深" },
  { key: "diseaseTopDepth", label: "病害体顶深" },
  { key: "location", label: "具体位置", kind: "location" },
  { key: "radarImage", label: "雷达图像", kind: "media" },
  { key: "electronicMap", label: "电子地图", kind: "media" },
  { key: "sitePhoto", label: "现场照片", kind: "media" },
  { key: "verificationPhoto", label: "验证照片", kind: "media" },
  { key: "nearbyUndergroundPipelineMap", label: "隐患周边地下管网图", kind: "media" },
] as const;

function detailValue(v: unknown) {
  if (v == null) return "—";
  const text = String(v).trim();
  return text || "—";
}

const selectedQueryDetailRows = computed<DetailField[]>(() => {
  const node = selectedNode.value;
  if (!node) return [];
  const row = apiSelectGroupRowsByAlertId.value[node.alert.id];
  if (!row) return [];
  return SELECTGROUP_DETAIL_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    value: detailValue(row[f.key]),
    kind: "kind" in f ? f.kind : "normal",
  }));
});

const stageDetailBaseRows = computed<DetailField[]>(() => {
  const node = selectedNode.value;
  if (!node) return [];
  return [
    { key: "stateLabel", label: "病害状态", value: node.stateLabel },
    { key: "alertType", label: "病害类型", value: node.alert.type },
    { key: "observedAt", label: "发现时间", value: node.observedAt },
    { key: "changeReason", label: "变化来源", value: node.changeReason },
  ];
});

const stageDetailRows = computed<DetailField[]>(() => [
  ...stageDetailBaseRows.value,
  ...selectedQueryDetailRows.value,
]);

const stageDetailMainRows = computed(() =>
  rowsByKind(stageDetailRows.value, "normal"),
);

const stageDetailLocationRows = computed(() =>
  rowsByKind(stageDetailRows.value, "location"),
);

const stageDetailMediaRows = computed(() =>
  rowsByKind(stageDetailRows.value, "media"),
);

const distributionPoints = computed(() =>
  groupedAlerts.value.map((a) => ({
    id: a.id,
    lat: a.lat,
    lng: a.lng,
    severity: a.severity,
    type: a.type,
    district: a.district,
    address: a.address,
    statusText: statusText(a.status),
  })),
);

const nearestDistanceM = computed(() => {
  const c = current.value;
  if (!c || !hasCoords.value) return null;
  const distances = groupedAlerts.value
    .filter((a) => a.id !== c.id)
    .map((a) => haversineMeters(c.lat, c.lng, a.lat, a.lng));
  if (distances.length === 0) return null;
  return Math.min(...distances);
});

const analyzeSubtitle = computed(() =>
  groupSource.value === "api"
    ? "群组以检测表对应关系为准；结合各节点状态与坐标分布做综合判断"
    : "基于同区域+邻近距离分组，对生命周期节点和群组风险进行综合判断",
);

const groupAnalytics = computed(() => {
  const rows = groupedAlerts.value;
  const highCount = rows.filter((x) => x.severity === "high").length;
  const repairedCount = rows.filter((x) => x.status === "completed").length;
  return [
    { label: "群组病害", value: `${rows.length} 个` },
    { label: "高危病害", value: `${highCount} 个` },
    { label: "已修复", value: `${repairedCount} 个` },
    { label: "当前节点状态", value: selectedNode.value?.stateLabel ?? "—" },
  ];
});

const impactFootnote = computed(() =>
  groupSource.value === "api"
    ? "群组关系来自检测表对应关系；下方邻域句为距离规则补充。"
    : "基于演示规则生成，用于页面交互验证。",
);

const impactLines = computed(() => {
  const rows = groupedAlerts.value;
  const c = current.value;
  if (!c) return [];
  const lines: string[] = [];
  if (groupSource.value === "api" && apiGroupNumber.value) {
    lines.push(
      `当前群组与检测表对应关系一致，共 ${rows.length} 个病害对象。`,
    );
  } else {
    lines.push(
      `当前以“${c.district} + ${GROUP_RADIUS_METERS}m”形成临时群组，共识别 ${rows.length} 个病害对象。`,
    );
  }
  if (nearestDistanceM.value != null) {
    lines.push(
      `最近病害点距当前点约 ${Math.round(nearestDistanceM.value)}m，建议同窗口安排复测与养护。`,
    );
  }
  const processingCount = rows.filter((x) => x.status === "processing").length;
  if (processingCount > 0) {
    lines.push(`群组内有 ${processingCount} 个病害处于处理中，需关注工单并发与资源冲突。`);
  }
  const highCount = rows.filter((x) => x.severity === "high").length;
  if (highCount >= 2) {
    lines.push("高危病害数量较高，建议优先进行片区化处置和交通组织联动。");
  } else {
    lines.push("当前群组风险总体可控，建议保持周期巡检并跟踪状态变化。");
  }
  return lines;
});

async function onSelectDistributionPoint(id: number) {
  selectedDistributionId.value = id;
  const idx = timelineNodes.value.findIndex((node) => node.alert.id === id);
  if (idx < 0) return;
  selStage.value = idx;
  await loadSolveWorkOrdersForAlert(timelineNodes.value[idx]!.alert);
}

/** 时间轴节点点击：与右侧小地图选中点联动 */
async function onSelectStage(i: number) {
  selStage.value = i;
  const node = timelineNodes.value[i];
  if (!node) return;
  selectedDistributionId.value = node.alert.id;
  await loadSolveWorkOrdersForAlert(node.alert);
}

watch(
  timelineNodes,
  (nodes) => {
    if (nodes.length === 0) return;
    selStage.value = nodes.length - 1;
    const currentId = current.value?.id ?? nodes[nodes.length - 1]!.alert.id;
    selectedDistributionId.value = currentId;
  },
  { immediate: true },
);

watch(
  current,
  (c) => {
    if (c) chatStore.pinDefectForLifecycle(c);
    else chatStore.clearLifecyclePin();
  },
  { immediate: true },
);

watch(
  () => ({
    r: ready.value,
    id: current.value?.id,
    y: current.value?.defectYear,
    n: current.value?.defectNumber,
    ov: isOverlayMode.value,
  }),
  async () => {
    if (!ready.value) return;
    await refreshQueryLifecycleData();
  },
  { flush: "post" },
);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onMediaDialogKeydown);
  chatStore.clearLifecyclePin();
  if (isOverlayMode.value) {
    mapOverlayStore.setFocusedOverlayForLifecycle(null);
  }
});

onMounted(async () => {
  window.addEventListener("keydown", onMediaDialogKeydown);
  if (!alertStore.hasLoadedBaseAlerts || alertStore.alerts.length === 0) {
    await alertStore.loadRecheckAlerts();
  }
  ready.value = true;
  await nextTick();
});

function goWorkspace() {
  router.push({ name: "workspace" });
}
</script>

<style scoped>
.lifecycle-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  gap: 12px;
  padding: 2px 0 8px;
}

.lifecycle-toolbar :deep(.view-toolbar) {
  flex-wrap: nowrap;
  width: 100%;
}

.lc-toolbar-row {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lc-heading {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: baseline;
  justify-content: center;
  text-align: center;
  gap: 8px;
  min-width: 0;
  max-width: min(480px, calc(100% - 100px));
  padding: 0 8px;
}

.lc-toolbar-actions {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 与 global .genshin-subtitle 一致的字色与衬线体，居中条去掉左侧金边 */
.lc-toolbar-heading {
  flex-shrink: 0;
  border-left: none;
  padding-left: 0;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
}

.lc-toolbar-sep {
  flex-shrink: 0;
  font-family: var(--font-ui);
  font-size: 15px;
  font-weight: 600;
  color: var(--genshin-gold-dark);
  line-height: 1;
  opacity: 0.85;
  user-select: none;
}

/* 副标题：病害编号与类型 */
.lc-toolbar-code {
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--font-ui);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.3;
  color: #8a9aac;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lifecycle-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lifecycle-loading,
.lifecycle-missing {
  padding: 24px;
  text-align: center;
}
.missing-title {
  font-weight: 700;
  color: var(--genshin-blue-dark);
  margin-bottom: 8px;
}
.missing-desc {
  font-size: 13px;
  color: #6b7a8c;
  margin-bottom: 14px;
}
.toolbar-back {
  margin-left: 0;
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid var(--neu-stroke-faint);
  background: var(--bg-color);
  cursor: pointer;
  color: #2c3e50;
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  font-weight: 500;
  box-shadow: var(--neu-extrude-back);
  transition: all 0.2s;
  flex-shrink: 0;
}
.back-btn:hover {
  color: var(--genshin-blue);
  box-shadow: var(--neu-extrude-md);
}

.info-card {
  padding: 18px 24px;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
  position: relative;
}
.info-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.defect-type {
  font-family: "Noto Serif SC", serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
}
.defect-addr {
  font-size: 13px;
  color: #5a6a7c;
}
.info-desc {
  flex: 1;
  min-width: 200px;
  font-size: 13px;
  color: #6b7a8c;
  line-height: 1.6;
  padding: 10px 14px;
  background: rgba(163, 177, 198, 0.1);
  border-radius: 10px;
}
.info-right {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.info-meta {
  font-size: 12px;
  color: #8a9aac;
}

.flow-card,
.analyze-card,
.share-card {
  padding: 20px 24px;
  position: relative;
}
.section-title {
  font-family: "Noto Serif SC", serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
  margin-bottom: 16px;
  border-left: 3px solid var(--genshin-gold);
  padding-left: 10px;
}
.stages-row {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  overflow-x: auto;
  gap: 0;
  padding-bottom: 8px;
}
.stage-wrap {
  display: flex;
  align-items: center;
}
.stage-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s;
  min-width: 100px;
}
.stage-node:hover {
  background: rgba(74, 141, 183, 0.05);
}
.stage-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--neu-stroke-muted-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #b0bac8;
  background: var(--bg-color);
  box-shadow: var(--neu-extrude-md);
  transition: all 0.35s;
  position: relative;
  overflow: hidden;
}
.stage-node.done .stage-circle {
  border-color: #5cad8a;
  color: #5cad8a;
  box-shadow:
    0 0 12px rgba(92, 173, 138, 0.3),
    var(--neu-extrude-md);
}
.stage-node.active .stage-circle {
  border-color: var(--genshin-blue);
  box-shadow:
    0 0 14px rgba(74, 141, 183, 0.4),
    var(--neu-extrude-md);
}
.pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--genshin-blue);
  animation: pulse-border 1.8s ease-out infinite;
}
@keyframes pulse-border {
  0% {
    transform: scale(0.9);
    opacity: 1;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}
.stage-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
}
.stage-sub {
  font-size: 10px;
  color: #8a9aac;
  white-space: nowrap;
  max-width: 112px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stage-node.done .stage-sub {
  color: #5cad8a;
}
.stage-node.active .stage-sub {
  color: var(--genshin-blue);
}
.stage-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}
.stage-tag {
  font-size: 10px;
  color: #5a6a7c;
  border: 1px solid var(--neu-stroke-muted);
  border-radius: 999px;
  padding: 1px 7px;
  background: rgba(255, 255, 255, 0.6);
}
.stage-arrow {
  position: relative;
  width: var(--stage-arrow-width, 44px);
  height: 44px;
  flex-shrink: 0;
  margin: 0 2px;
}
.stage-arrow::before {
  content: "";
  position: absolute;
  left: 0;
  right: 10px;
  top: 50%;
  height: 2px;
  transform: translateY(-50%);
  background: linear-gradient(90deg, #9fb2c7 0%, #6d8aa9 100%);
  border-radius: 999px;
}
.stage-arrow::after {
  content: "";
  position: absolute;
  right: 1px;
  top: 50%;
  width: 8px;
  height: 8px;
  transform: translateY(-50%) rotate(45deg);
  border-top: 2px solid #6d8aa9;
  border-right: 2px solid #6d8aa9;
  border-radius: 1px;
}

.stage-detail {
  margin-top: 16px;
  padding: 14px 18px;
  background: rgba(163, 177, 198, 0.08);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 80px;
}
.detail-grid,
.workorder-field-grid,
.workorder-media-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
}
.detail-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 9px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.38);
  border: 1px solid rgba(163, 177, 198, 0.18);
  font-size: 13px;
}
.detail-field-full,
.workorder-location-row {
  grid-column: 1 / -1;
}
.dr-label {
  color: #8a9aac;
  font-size: 12px;
  line-height: 1.3;
}
.dr-val {
  color: var(--genshin-blue-dark);
  font-weight: 500;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.state-name {
  font-size: 15px;
  font-weight: 800;
}
.workorder-group {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.workorder-group-title {
  font-size: 12px;
  color: #8a9aac;
  font-weight: 600;
}
.state-wo {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.state-wo-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.state-wo-no {
  color: var(--genshin-blue);
  font-weight: 700;
  font-size: 12px;
}
.state-wo-time,
.state-wo-meta {
  color: #8a9aac;
  font-size: 11px;
}
.state-wo-title {
  color: var(--genshin-blue-dark);
  font-weight: 700;
  font-size: 13px;
}
.workorder-media-grid {
  padding-top: 2px;
}
.media-field {
  background: rgba(74, 141, 183, 0.06);
  border-color: rgba(74, 141, 183, 0.14);
}
.media-preview {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(74, 141, 183, 0.16);
  background: rgba(255, 255, 255, 0.55);
  display: block;
  cursor: zoom-in;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}
.media-preview:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(74, 141, 183, 0.18);
}
.media-empty {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 8px;
  border: 1px dashed rgba(138, 154, 172, 0.42);
  background: rgba(255, 255, 255, 0.36);
  color: #8a9aac;
  font-size: 12px;
  line-height: 1.2;
}
.media-empty-icon {
  width: 24px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(138, 154, 172, 0.58);
  border-radius: 4px;
  color: transparent;
  position: relative;
}
.media-empty-icon::before,
.media-empty-icon::after {
  content: "";
  position: absolute;
  background: rgba(138, 154, 172, 0.72);
}
.media-empty-icon::before {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  top: 4px;
  right: 5px;
}
.media-empty-icon::after {
  width: 12px;
  height: 7px;
  left: 5px;
  bottom: 3px;
  clip-path: polygon(0 100%, 42% 42%, 62% 68%, 78% 50%, 100% 100%);
}
.media-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background: rgba(20, 31, 44, 0.58);
  backdrop-filter: blur(3px);
}
.media-dialog {
  width: min(960px, 100%);
  max-height: min(86vh, 760px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: var(--bg-color);
  box-shadow:
    0 24px 70px rgba(20, 31, 44, 0.32),
    var(--neu-extrude-md);
}
.media-dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--neu-stroke-faint);
}
.media-dialog-title {
  min-width: 0;
  color: var(--genshin-blue-dark);
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.media-dialog-close {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: 1px solid var(--neu-stroke-faint);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.65);
  color: #6b7a8c;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}
.media-dialog-close:hover {
  color: var(--genshin-blue);
  box-shadow: var(--neu-extrude-sm);
}
.media-dialog-body {
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  background: rgba(163, 177, 198, 0.08);
}
.media-dialog-image {
  max-width: 100%;
  max-height: calc(86vh - 92px);
  object-fit: contain;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.65);
  display: block;
}
@media (max-width: 1100px) {
  .detail-grid,
  .workorder-field-grid,
  .workorder-media-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .detail-grid,
  .workorder-field-grid,
  .workorder-media-grid {
    grid-template-columns: 1fr;
  }
}
.stage-detail-enter-active,
.stage-detail-leave-active {
  transition: all 0.2s ease;
}
.stage-detail-enter-from,
.stage-detail-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.analyze-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding-right: 52px;
  margin-bottom: 16px;
}
.analyze-title-block {
  min-width: 260px;
}
.analyze-title {
  margin-bottom: 5px;
}
.analyze-subtitle {
  color: #8a9aac;
  font-size: 12px;
  line-height: 1.5;
}
.analytics-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}
.analytics-pill {
  padding: 9px 13px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 100px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.5), rgba(163, 177, 198, 0.1)),
    var(--bg-color);
}
.ap-l {
  font-size: 11px;
  color: #8a9aac;
}
.ap-v {
  font-size: 13px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
}

.prox-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(260px, 1.15fr);
  gap: 14px;
  margin-bottom: 14px;
}
.prox-map-panel,
.neighbor-panel {
  min-width: 0;
}
.impact-panel {
  padding: 12px 14px;
  border-radius: 12px;
  height: 300px;
}
.panel-mini-title {
  margin-bottom: 8px;
  color: var(--genshin-blue-dark);
  font-size: 13px;
  font-weight: 700;
}
@media (max-width: 1100px) {
  .analyze-head {
    flex-direction: column;
    padding-right: 42px;
  }
  .analytics-row {
    justify-content: flex-start;
  }
  .prox-grid {
    grid-template-columns: 1fr;
  }
}
.neighbor-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 360px;
  overflow-y: auto;
  padding: 12px 12px;
}
.neighbor-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.neighbor-row.active {
  box-shadow: var(--neu-extrude-md);
}
.nr-body {
  flex: 1;
  min-width: 0;
}
.nr-line {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
}
.nr-dist {
  font-size: 11px;
  color: var(--genshin-blue);
}
.nr-addr {
  font-size: 11px;
  color: #6b7a8c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nr-link {
  flex-shrink: 0;
  font-size: 11px;
  padding: 4px 8px;
}
.neighbor-empty {
  font-size: 12px;
  color: #b0bac8;
  padding: 8px;
}
.no-coords {
  font-size: 12px;
  color: #b0bac8;
  margin-bottom: 10px;
}

.correlation-block,
.share-body {
  padding: 12px 14px;
  border-radius: 12px;
}
.corr-title,
.share-doc-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
  margin-bottom: 8px;
}
.corr-p,
.share-p {
  font-size: 12px;
  line-height: 1.55;
  color: #5a6a7c;
  margin: 0 0 6px;
}
.corr-footnote {
  font-size: 10px;
  color: #b0bac8;
  margin: 8px 0 0;
}

.share-card {
  overflow: hidden;
}
.share-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  padding-right: 5px;
}
.share-title {
  margin-bottom: 4px;
}
.share-subtitle {
  font-size: 12px;
  color: #8a9aac;
  line-height: 1.5;
}
.share-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(220px, 0.75fr);
  gap: 14px;
  align-items: stretch;
}
.share-p:last-child {
  margin-bottom: 0;
}
.lc-button {
  flex-shrink: 0;
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}
.lc-button-ghost {
  padding: 6px 12px;
  border: 1px solid var(--neu-stroke-muted);
  background: var(--bg-color);
  box-shadow: var(--neu-extrude-sm);
  color: var(--genshin-blue);
}
.lc-button-primary {
  padding: 8px 16px;
  border: none;
  color: #fff;
  background: linear-gradient(
    135deg,
    var(--genshin-blue),
    var(--genshin-blue-light)
  );
  box-shadow: var(--neu-glow-blue);
}
.lc-button:hover {
  transform: translateY(-1px);
  box-shadow: var(--neu-extrude-md);
}
.lc-button-primary:hover {
  box-shadow: var(--neu-glow-blue-hover);
}
.share-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(163, 177, 198, 0.08);
  border: 1px solid var(--neu-stroke-faint);
}
.share-side-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
  margin-bottom: 2px;
}
.share-side-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--neu-stroke-muted);
  font-size: 12px;
  color: #6b7a8c;
}
.share-side-row strong {
  color: var(--genshin-blue);
  font-size: 13px;
  white-space: nowrap;
}
.share-side-note {
  margin-top: auto;
  padding-top: 8px;
  color: #9aa7b6;
  font-size: 11px;
  line-height: 1.5;
}
@media (max-width: 1100px) {
  .share-head {
    flex-direction: column;
    padding-right: 42px;
  }
  .share-layout {
    grid-template-columns: 1fr;
  }
}
</style>
