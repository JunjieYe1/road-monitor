<template>
  <div class="compliance-view">
    <!-- 工具栏 -->
    <ViewToolbar class="compliance-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">服务单位履约画像</span>
        <div class="year-tabs">
          <button
            v-for="y in years"
            :key="y"
            class="year-btn"
            :class="{ active: selYear === y }"
            @click="selYear = y"
          >
            {{ y }}
          </button>
        </div>
      </div>
      <div class="toolbar-right">
        <span class="update-time">数据更新：2025-01-15</span>
      </div>
    </ViewToolbar>

    <div class="compliance-body">
      <!-- 详情面板 -->
      <div
        class="detail-panel neu-card u-scrollbar-hidden"
        ref="detailPanelRef"
        :style="{ overflowY: detailOverflowY, overflowX: detailOverflowX }"
        @mouseenter="detailScroll.onEnter"
        @mouseleave="detailScroll.onLeave"
      >
        <template v-if="selectedUnit">
          <div class="detail-header">
            <div class="detail-name">{{ selectedUnit.name }}</div>
            <div
              class="detail-score"
              :style="{ color: scoreTierColor(selectedUnit.score) }"
            >
              {{ selectedUnit.score }}<span class="detail-score-unit">分</span>
            </div>
          </div>
          <div class="detail-divider"></div>
          <!-- 维度评分 -->
          <div class="dim-list">
            <div v-for="d in selectedUnit.dims" :key="d.name" class="dim-item">
              <div class="dim-header">
                <span class="dim-name">{{ d.name }}</span>
                <span class="dim-val">{{ d.score }}</span>
              </div>
              <div class="dim-track">
                <div
                  class="dim-fill"
                  :style="{
                    width: d.score + '%',
                    background: scoreTierColor(d.score),
                  }"
                ></div>
              </div>
            </div>
          </div>
          <div class="detail-divider"></div>
          <!-- 雷达图 -->
          <div class="radar-wrap">
            <svg viewBox="0 0 180 180" class="radar-svg">
              <polygon
                :points="radarBg"
                fill="rgba(163,177,198,0.12)"
                stroke="rgba(163,177,198,0.3)"
                stroke-width="1"
              />
              <polygon
                :points="radarBg2"
                fill="rgba(163,177,198,0.08)"
                stroke="rgba(163,177,198,0.2)"
                stroke-width="1"
              />
              <polygon
                :points="radarData"
                fill="rgba(74,141,183,0.25)"
                stroke="var(--genshin-blue)"
                stroke-width="1.5"
              />
              <circle
                v-for="(p, i) in radarPoints"
                :key="i"
                :cx="p.x"
                :cy="p.y"
                r="3"
                fill="var(--genshin-blue)"
              />
              <text
                v-for="(l, i) in radarLabels"
                :key="'l' + i"
                :x="l.x"
                :y="l.y"
                text-anchor="middle"
                font-size="9"
                fill="#6B7A8C"
              >
                {{ l.text }}
              </text>
            </svg>
          </div>
          <!-- 历史趋势 -->
          <div class="trend-section">
            <div class="trend-title">近三年得分趋势</div>
            <div class="trend-bars">
              <div
                v-for="t in selectedUnit.trend"
                :key="t.year"
                class="trend-bar-item"
              >
                <div class="trend-bar-wrap">
                  <div
                    class="trend-bar"
                    :style="{
                      height: t.score * 0.5 + 'px',
                      background: scoreTierColor(t.score),
                    }"
                  ></div>
                </div>
                <span class="trend-year">{{ t.year }}</span>
                <span class="trend-score">{{ t.score }}</span>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="detail-empty">
          <div class="empty-hint">← 点击左侧单位查看详情</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useAdaptiveVerticalScroll } from "../../../composables/useAdaptiveVerticalScroll";
import ViewToolbar from "../../common/ViewToolbar.vue";
import { useComplianceStore } from "../../../stores/complianceStore";
import { scoreTierColor } from "../../../utils/labels";

const complianceStore = useComplianceStore();
const years = computed(() => complianceStore.years);
const selYear = computed({
  get: () => complianceStore.selYear,
  set: (value) => {
    complianceStore.selYear = value;
  },
});
const selectedUnit = computed(() => complianceStore.selectedUnit);

const detailPanelRef = ref<HTMLElement | null>(null);
const detailScroll = useAdaptiveVerticalScroll(detailPanelRef);
const detailOverflowY = detailScroll.overflowY;
const detailOverflowX = detailScroll.overflowX;

watch(selectedUnit, async () => {
  await nextTick();
  await detailScroll.remeasure();
});

// 雷达图
const cx = 90,
  cy = 90,
  r = 60;
const radarLabels = computed(() => {
  if (!selectedUnit.value) return [];
  return selectedUnit.value.dims.map((d, i) => {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const lx = cx + (r + 18) * Math.cos(angle);
    const ly = cy + (r + 18) * Math.sin(angle);
    return { x: Math.round(lx), y: Math.round(ly), text: d.name.slice(0, 4) };
  });
});
function toPoints(vals: number[], scale = 1): string {
  return vals
    .map((v, i) => {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const rr = r * scale * (v / 100);
      return `${cx + rr * Math.cos(angle)},${cy + rr * Math.sin(angle)}`;
    })
    .join(" ");
}
const radarBg = computed(() => toPoints([100, 100, 100, 100, 100]));
const radarBg2 = computed(() => toPoints([100, 100, 100, 100, 100], 0.6));
const radarData = computed(() => {
  if (!selectedUnit.value) return "";
  return toPoints(selectedUnit.value.dims.map((d) => d.score));
});
const radarPoints = computed(() => {
  if (!selectedUnit.value) return [];
  return selectedUnit.value.dims.map((d, i) => {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const rr = r * (d.score / 100);
    return { x: cx + rr * Math.cos(angle), y: cy + rr * Math.sin(angle) };
  });
});
</script>

<style scoped>
.compliance-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
.compliance-toolbar {
  gap: 12px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.toolbar-title {
  font-family: "Noto Serif SC", serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
}
.year-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-groove);
  border-radius: 8px;
  padding: 3px;
  box-shadow: var(--neu-inset-sm);
}
.year-btn {
  padding: 3px 10px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  color: #8a9aac;
  background: transparent;
  transition: all 0.2s;
}
.year-btn.active {
  background: var(--bg-color);
  color: var(--genshin-blue);
  box-shadow: var(--neu-extrude-sm);
}
.toolbar-right {
  margin-left: auto;
  font-size: 11px;
  color: #8a9aac;
}

.compliance-body {
  flex: 1;
  display: flex;
  gap: 10px;
  min-height: 0;
}

.detail-panel {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.detail-name {
  font-family: "Noto Serif SC", serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--genshin-blue-dark);
  line-height: 1.4;
}
.detail-score {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
}
.detail-score-unit {
  font-size: 14px;
  font-weight: 400;
  margin-left: 2px;
}
.detail-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(212, 168, 83, 0.3),
    transparent
  );
}

.dim-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dim-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 4px;
}
.dim-name {
  color: #5a6a7c;
}
.dim-val {
  font-weight: 600;
  color: var(--genshin-blue-dark);
}
.dim-track {
  height: 6px;
  background: var(--bg-groove);
  border-radius: 3px;
  overflow: hidden;
  box-shadow: var(--neu-inset-track);
}
.dim-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

.radar-wrap {
  display: flex;
  justify-content: center;
}
.radar-svg {
  width: 160px;
  height: 160px;
}

.trend-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
  margin-bottom: 10px;
}
.trend-bars {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: flex-end;
  height: 70px;
}
.trend-bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.trend-bar-wrap {
  flex: 1;
  display: flex;
  align-items: flex-end;
  height: 50px;
}
.trend-bar {
  width: 28px;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.5s ease;
}
.trend-year {
  font-size: 10px;
  color: #8a9aac;
}
.trend-score {
  font-size: 11px;
  font-weight: 600;
  color: var(--genshin-blue-dark);
}

.detail-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-hint {
  font-size: 13px;
  color: #8a9aac;
}
</style>
