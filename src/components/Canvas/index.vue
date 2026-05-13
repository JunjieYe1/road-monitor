<template>
  <div class="canvas-wrap">
    <!-- 标签栏 -->
    <div class="canvas-tabs neu-card">
      <div class="tabs-list u-scrollbar-hidden">
        <button
          v-for="tab in canvasStore.tabs"
          :key="tab.id"
          type="button"
          class="tab-item"
          :class="{
            active: canvasStore.activeTabId === tab.id,
            'tab-item-locked': isTabLocked(tab),
          }"
          :aria-disabled="isTabLocked(tab)"
          :title="tab.title"
          @click="onTabClick(tab)"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-title">{{ tab.title }}</span>
          <span
            v-if="tab.closable"
            class="tab-close"
            @click.stop="canvasStore.closeTab(tab.id)"
            >✕</span
          >
        </button>
      </div>
    </div>

    <!-- 视图内容区 -->
    <div class="canvas-body">
      <transition name="canvas-fade" mode="out-in">
        <component
          :is="activeViewComponent"
          :key="canvasStore.activeTabId"
          v-bind="activeTab?.props || {}"
          class="canvas-view"
        />
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  useCanvasStore,
  isCanvasTabSwitchDisabled,
  type CanvasViewType,
  type CanvasTab,
} from "../../stores/canvasStore";
import MapView from "./views/MapView.vue";
import PdfPage from "../../views/PdfPage.vue";
import ReportView from "./views/ReportView.vue";
import ComplianceView from "./views/ComplianceView.vue";
import WorkOrderView from "./views/WorkOrderView.vue";
import PlanView from "./views/PlanView.vue";
import RiskView from "./views/RiskView.vue";
import AssessView from "./views/AssessView.vue";

const canvasStore = useCanvasStore();

function isTabLocked(tab: CanvasTab) {
  return isCanvasTabSwitchDisabled(tab.type);
}

function onTabClick(tab: CanvasTab) {
  if (isTabLocked(tab)) return;
  canvasStore.setActiveTab(tab.id);
}

const VIEW_COMPONENTS: Record<CanvasViewType, any> = {
  map: MapView,
  collect: PdfPage,
  report: ReportView,
  compliance: ComplianceView,
  workorder: WorkOrderView,
  plan: PlanView,
  risk: RiskView,
  assess: AssessView,
};

const activeTab = computed(() => canvasStore.getActiveTab());
const activeViewComponent = computed(() => {
  const tab = activeTab.value;
  return tab ? VIEW_COMPONENTS[tab.type] : MapView;
});
</script>

<style scoped>
.canvas-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

/* ── 标签栏 ── */
.canvas-tabs {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  flex-shrink: 0;
  gap: 6px;
  min-height: 44px;
}

.tabs-list {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  overflow-x: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  background: var(--bg-color);
  color: #8a9aac;
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  white-space: nowrap;
  transition: all 0.2s;
  box-shadow: var(--neu-extrude-sm);
}

.tab-item:hover {
  color: var(--genshin-blue);
  box-shadow: var(--neu-extrude-md);
}

.tab-item.active {
  background: linear-gradient(
    135deg,
    var(--genshin-blue),
    var(--genshin-blue-light)
  );
  color: #fff;
  border-color: transparent;
  box-shadow: var(--neu-glow-blue-deep);
}

.tab-item.tab-item-locked {
  cursor: not-allowed;
  opacity: 0.55;
  box-shadow: var(--neu-extrude-sm);
}

.tab-item.tab-item-locked:hover {
  color: #8a9aac;
  box-shadow: var(--neu-extrude-sm);
}

.tab-item.tab-item-locked.active {
  opacity: 1;
  cursor: default;
}

.tab-icon {
  font-size: 13px;
}
.tab-title {
  font-size: 12px;
  font-weight: 500;
}

.tab-close {
  margin-left: 2px;
  font-size: 10px;
  opacity: 0.7;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition:
    opacity 0.15s,
    background 0.15s;
}
.tab-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
}

/* ── 视图内容区 ── */
.canvas-body {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: visible;
}

.canvas-view {
  position: absolute;
  inset: 0;
  overflow: visible;
}

.canvas-fade-enter-active,
.canvas-fade-leave-active {
  transition: all 0.2s ease;
}
.canvas-fade-enter-from,
.canvas-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
