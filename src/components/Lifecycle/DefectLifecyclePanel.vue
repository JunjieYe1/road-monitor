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
            >#{{ current!.id }} · {{ current!.type }}</span
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
      <!-- 信息摘要 -->
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
          <div class="info-meta">所属区域：{{ current!.district }}</div>
          <div class="info-meta">上报时间：{{ current!.time }}</div>
          <div class="info-meta">
            坐标：{{ current!.lat.toFixed(5) }}, {{ current!.lng.toFixed(5) }}
          </div>
        </div>
      </div>

      <!-- 病害状态生命周期 -->
      <div class="neu-card flow-card">
        <div class="section-title">生命周期追踪</div>
        <div class="stages-row u-scrollbar-hidden">
          <div
            v-for="(ph, i) in bundle.phases"
            :key="ph.key"
            class="stage-wrap"
            @click="selStage = i"
          >
            <div class="stage-node" :class="stageNodeClass(i)">
              <div class="stage-circle">
                <span v-if="i < activeVisualIdx">✓</span>
                <span
                  v-else-if="i === activeVisualIdx"
                  class="pulse-ring"
                ></span>
                <span v-else>{{ i + 1 }}</span>
              </div>
              <div class="stage-label">{{ ph.label }}</div>
              <div class="stage-sub">
                {{ ph.workOrders.length }} 个工单 · {{ ph.observedAt }}
              </div>
            </div>
            <div
              v-if="i < bundle.phases.length - 1"
              class="stage-line"
              :class="{ done: i < activeVisualIdx }"
            />
          </div>
        </div>

        <transition name="stage-detail" mode="out-in">
          <div :key="selStage" class="stage-detail">
            <div class="detail-row">
              <span class="dr-label">病害状态</span>
              <span class="dr-val state-name">{{ selectedPhase.label }}</span>
            </div>
            <div class="detail-row">
              <span class="dr-label">状态时间</span>
              <span class="dr-val">{{ selectedPhase.observedAt }}</span>
            </div>
            <div class="detail-row">
              <span class="dr-label">变化来源</span>
              <span class="dr-val">{{ selectedPhase.changeReason }}</span>
            </div>
            <div class="workorder-group">
              <div class="workorder-group-title">
                支撑该状态的工单（{{ selectedPhase.workOrders.length }}）
              </div>
              <div
                v-for="wo in selectedPhase.workOrders"
                :key="wo.woNo + wo.title"
                class="state-wo neu-card-sm"
              >
                <div class="state-wo-head">
                  <span class="state-wo-no">{{ wo.woNo }}</span>
                  <span class="state-wo-time">{{ wo.submittedAt }}</span>
                </div>
                <div class="state-wo-title">{{ wo.title }}</div>
                <div class="state-wo-meta">提交人：{{ wo.submittedBy }}</div>
                <div class="state-wo-summary">{{ wo.resultSummary }}</div>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- 状态分析 + 邻近 -->
      <div class="neu-card analyze-card">
        <div class="analyze-head">
          <div class="analyze-title-block">
            <div class="section-title analyze-title">
              病害状态与邻近病害智能分析
            </div>
            <div class="analyze-subtitle">
              结合当前状态链、周边病害距离与等级，给出空间关联判断
            </div>
          </div>
          <div class="analytics-row">
            <div
              v-for="a in bundle.analytics"
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
            <div class="panel-mini-title">空间上下文小地图</div>
            <DefectContextMiniMap
              class="prox-map"
              :current="mapCurrent"
              :neighbors="neighborPoints"
              :selected-neighbor-id="selectedNeighborId"
            />
          </div>
          <div class="neighbor-panel">
            <div class="panel-mini-title">
              最近邻近病害（{{ neighborRows.length }}）
            </div>
            <div class="neighbor-list">
              <div
                v-for="row in neighborRows"
                :key="row.alert.id"
                class="neighbor-row neu-card-sm"
                :class="{ active: selectedNeighborId === row.alert.id }"
                @click="selectedNeighborId = row.alert.id"
              >
                <SeverityBadge :level="row.alert.severity" size="sm" />
                <div class="nr-body">
                  <div class="nr-line">
                    <span>{{ row.alert.type }}</span>
                    <span class="nr-dist">{{ formatDist(row.distanceM) }}</span>
                  </div>
                  <div class="nr-addr">{{ row.alert.address }}</div>
                </div>
                <button
                  type="button"
                class="lc-button lc-button-ghost nr-link"
                  @click.stop="goNeighborLifecycle(row.alert.id)"
                >
                  查看生命周期
                </button>
              </div>
              <div v-if="neighborRows.length === 0" class="neighbor-empty">
                暂无其它告警点可比对（或数据未加载）。
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-coords">暂无有效坐标，无法计算邻近病害。</div>

        <div class="correlation-block neu-inset">
          <div class="corr-title">关联影响（演示规则 + 预制文案）</div>
          <p v-for="(line, idx) in correlationLines" :key="idx" class="corr-p">
            {{ line }}
          </p>
          <p class="corr-footnote">演示数据，不作为决策依据。</p>
        </div>
      </div>

      <!-- 分享评估 -->
      <div class="neu-card share-card">
        <div class="share-head">
          <div>
            <div class="section-title share-title">分享评估</div>
            <div class="share-subtitle">
              面向汇报、转办和复盘的简版说明，当前由演示数据生成
            </div>
          </div>
          <button
            type="button"
            class="lc-button lc-button-primary"
            @click="copyShareText"
          >
            复制摘要
          </button>
        </div>

        <div class="share-layout">
          <div class="share-body neu-inset">
            <div class="share-doc-title">病害生命周期评估摘要</div>
            <p
              v-for="(p, i) in bundle.shareParagraphs"
              :key="i"
              class="share-p"
            >
              {{ p }}
            </p>
          </div>

          <div class="share-side">
            <div class="share-side-title">摘要要点</div>
            <div
              v-for="a in bundle.analytics"
              :key="`share-${a.label}`"
              class="share-side-row"
            >
              <span>{{ a.label }}</span>
              <strong>{{ a.value }}</strong>
            </div>
            <div class="share-side-note">
              可复制到对话、工单备注或汇报材料中继续编辑。
            </div>
          </div>
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
  buildCorrelationSummaryLines,
} from "../../defect/lifecycleMocks";
import { haversineMeters } from "../../utils/geoDistance";

const SYNTHETIC_OVERLAY_ALERT_ID = -1;

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
const selectedNeighborId = ref<number | null>(null);

const isOverlayMode = computed(() => route.query.overlay === "1");

const overlaySnap = computed(() => mapOverlayStore.focusedOverlayForLifecycle);

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
  const raw = route.params.id;
  const id = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(id) || id === SYNTHETIC_OVERLAY_ALERT_ID) return null;
  return alertStore.alerts.find((a) => a.id === id) ?? null;
});

const notFound = computed(() => {
  if (!ready.value) return false;
  if (isOverlayMode.value) return false;
  return current.value === null;
});

const overlayMissing = computed(
  () => ready.value && isOverlayMode.value && !overlaySnap.value,
);

const bundle = computed(() => {
  if (isOverlayMode.value) return getLifecycleMockForOverlay();
  const id = current.value?.id ?? 1;
  return getLifecycleMockForAlertId(id);
});

const selectedPhase = computed(() => bundle.value.phases[selStage.value]!);

/** 视觉上「进行到哪一 stage」——用于节点勾号，不用于交互推进 */
const activeVisualIdx = computed(() =>
  Math.min(bundle.value.activePhaseIdx, bundle.value.phases.length - 1),
);

function stageNodeClass(i: number) {
  if (i < activeVisualIdx.value) return "done";
  if (i === activeVisualIdx.value) return "active";
  return "pending";
}

const hasCoords = computed(() => {
  const c = current.value;
  if (!c) return false;
  return Number.isFinite(c.lat) && Number.isFinite(c.lng);
});

const neighborRows = computed(() => {
  const c = current.value;
  if (!c || !hasCoords.value) return [];
  const rows = alertStore.alerts
    .filter((a) => {
      if (a.id === c.id) return false;
      if (c.id === SYNTHETIC_OVERLAY_ALERT_ID) {
        return haversineMeters(c.lat, c.lng, a.lat, a.lng) > 8;
      }
      return true;
    })
    .map((a) => ({
      alert: a,
      distanceM: haversineMeters(c.lat, c.lng, a.lat, a.lng),
    }))
    .sort((x, y) => x.distanceM - y.distanceM)
    .slice(0, 5);
  return rows;
});

const neighborPoints = computed(() =>
  neighborRows.value.map((r) => r.alert),
);

const mapCurrent = computed(() => {
  const c = current.value!;
  return {
    id: c.id,
    lat: c.lat,
    lng: c.lng,
    severity: c.severity,
  };
});

const correlationLines = computed(() => {
  const c = current.value;
  const nearest = neighborRows.value[0]?.distanceM ?? null;
  const hasHigh = neighborRows.value.some((r) => r.alert.severity === "high");
  const sameDist = c
    ? neighborRows.value.filter((r) => r.alert.district === c.district)
        .length
    : 0;
  return buildCorrelationSummaryLines({
    nearestMeters: nearest,
    neighborCountShown: neighborRows.value.length,
    hasHighNeighbor: hasHigh,
    sameDistrictCount: sameDist,
    mockParagraphs: [...bundle.value.correlationBlurb],
  });
});

watch(
  () => bundle.value,
  (b) => {
    selStage.value = Math.min(b.activePhaseIdx, b.phases.length - 1);
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

onBeforeUnmount(() => {
  chatStore.clearLifecyclePin();
  if (route.query.overlay === "1") {
    mapOverlayStore.setFocusedOverlayForLifecycle(null);
  }
});

onMounted(async () => {
  if (!alertStore.hasLoadedBaseAlerts || alertStore.alerts.length === 0) {
    await alertStore.loadRecheckAlerts();
  }
  ready.value = true;
  await nextTick();
});

function formatDist(m: number) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function goWorkspace() {
  router.push({ name: "workspace" });
}

function goNeighborLifecycle(id: number) {
  router.push({
    name: "workspace-defect",
    params: { id: String(id) },
    query: {},
  });
}

async function copyShareText() {
  const text = [
    ...bundle.value.shareParagraphs,
    "",
    ...correlationLines.value,
  ].join("\n");
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
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
.stage-line {
  flex: 1;
  min-width: 40px;
  height: 2px;
  background: var(--neu-stroke-muted-strong);
  transition: background 0.4s;
  margin-top: -30px;
}
.stage-line.done {
  background: linear-gradient(90deg, #5cad8a, #7dc4a5);
}

.stage-detail {
  margin-top: 16px;
  padding: 14px 18px;
  background: rgba(163, 177, 198, 0.08);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 80px;
}
.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 13px;
}
.dr-label {
  color: #8a9aac;
  min-width: 64px;
  flex-shrink: 0;
  font-size: 12px;
}
.dr-val {
  color: var(--genshin-blue-dark);
  font-weight: 500;
  flex: 1;
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
}
.state-wo-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 5px;
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
  margin-bottom: 4px;
}
.state-wo-summary {
  color: #5a6a7c;
  font-size: 12px;
  line-height: 1.5;
  margin-top: 4px;
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
