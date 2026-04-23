<template>
  <div class="canvas-wrap">
    <!-- 标签栏 -->
    <div class="canvas-tabs neu-card">
      <div class="tabs-list u-scrollbar-hidden">
        <button
          v-for="tab in canvasStore.tabs"
          :key="tab.id"
          class="tab-item"
          :class="{ active: canvasStore.activeTabId === tab.id }"
          @click="canvasStore.setActiveTab(tab.id)"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-title">{{ tab.title }}</span>
          <span
            v-if="tab.closable"
            class="tab-close"
            @click.stop="canvasStore.closeTab(tab.id)"
          >✕</span>
        </button>
      </div>
      <!-- 智能体模式 + 视图选择面板 -->
      <div class="tab-add-wrap" @click.stop>
        <button
          class="tab-add-btn"
          :class="{ open: showAddMenu }"
          @click="showAddMenu = !showAddMenu"
          title="切换模式 / 打开视图"
        >
          <svg viewBox="0 0 18 18" fill="none" width="14" height="14">
            <circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.4"/>
            <path d="M9 5.5v7M5.5 9h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
        <transition name="menu-pop">
          <div v-if="showAddMenu" class="add-menu neu-card">
            <!-- 智能体模式 -->
            <div class="menu-section-title">智能体模式</div>
            <div class="mode-grid">
              <button
                v-for="m in agentModes"
                :key="m.key"
                class="mode-grid-item"
                :class="{ active: canvasStore.agentMode === m.key }"
                @click="switchMode(m.key)"
              >
                <span class="mgi-icon">{{ m.icon }}</span>
                <span class="mgi-label">{{ m.label }}</span>
              </button>
            </div>
            <div class="menu-divider"></div>
            <!-- 画布视图 -->
            <div class="menu-section-title">打开视图</div>
            <div class="view-grid">
              <button
                v-for="(meta, key) in availableViews"
                :key="key"
                class="view-grid-item"
                :class="{ opened: isOpened(key as CanvasViewType) }"
                @click="openView(key as CanvasViewType)"
              >
                <span class="vgi-icon">{{ meta.icon }}</span>
                <span class="vgi-title">{{ meta.title }}</span>
                <span v-if="isOpened(key as CanvasViewType)" class="vgi-badge">已开</span>
              </button>
            </div>
          </div>
        </transition>
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
import { computed, ref, onMounted } from 'vue'
import { useCanvasStore, type CanvasViewType, type AgentMode } from '../../stores/canvasStore'
import MapView from './views/MapView.vue'
import ReportView from './views/ReportView.vue'
import ComplianceView from './views/ComplianceView.vue'
import WorkOrderView from './views/WorkOrderView.vue'
import PlanView from './views/PlanView.vue'
import RiskView from './views/RiskView.vue'
import AssessView from './views/AssessView.vue'

const canvasStore = useCanvasStore()
const showAddMenu = ref(false)

const VIEW_COMPONENTS: Record<CanvasViewType, any> = {
  map:        MapView,
  report:     ReportView,
  compliance: ComplianceView,
  workorder:  WorkOrderView,
  plan:       PlanView,
  risk:       RiskView,
  assess:     AssessView,
}

const agentModes = [
  { key: 'insight'    as AgentMode, label: '全景洞察', icon: '🌐' },
  { key: 'collect'    as AgentMode, label: '数据采集', icon: '📋' },
  { key: 'operations' as AgentMode, label: '运营管理', icon: '⚙️' },
  { key: 'predict'    as AgentMode, label: '隐患预判', icon: '⚠️' },
]

const activeTab = computed(() => canvasStore.getActiveTab())
const activeViewComponent = computed(() => {
  const tab = activeTab.value
  return tab ? VIEW_COMPONENTS[tab.type] : MapView
})

const availableViews = computed(() => canvasStore.VIEW_META)
const isOpened = (type: CanvasViewType) => canvasStore.tabs.some(t => t.type === type)

function switchMode(key: AgentMode) {
  canvasStore.setAgentMode(key)
  showAddMenu.value = false
}

function openView(type: CanvasViewType) {
  canvasStore.pushTab({ type })
  showAddMenu.value = false
}

onMounted(() => {
  document.addEventListener('click', () => { showAddMenu.value = false })
})
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
  color: #8A9AAC;
  font-size: 12px;
  font-family: 'Noto Sans SC', sans-serif;
  white-space: nowrap;
  transition: all 0.2s;
  box-shadow: var(--neu-extrude-sm);
}

.tab-item:hover {
  color: var(--genshin-blue);
  box-shadow: var(--neu-extrude-md);
}

.tab-item.active {
  background: linear-gradient(135deg, var(--genshin-blue), var(--genshin-blue-light));
  color: #fff;
  border-color: transparent;
  box-shadow: var(--neu-glow-blue-deep);
}

.tab-icon { font-size: 13px; }
.tab-title { font-size: 12px; font-weight: 500; }

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
  transition: opacity 0.15s, background 0.15s;
}
.tab-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
}

/* ── 添加 / 模式切换按钮 ── */
.tab-add-wrap { position: relative; flex-shrink: 0; }

.tab-add-btn {
  width: 30px; height: 30px; border-radius: 9px;
  border: 1px solid var(--neu-stroke-heavy);
  background: var(--bg-color); color: #6A7A8C;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  box-shadow: var(--neu-extrude-sm);
}
.tab-add-btn:hover,
.tab-add-btn.open {
  color: var(--genshin-blue);
  border-color: var(--genshin-blue);
  box-shadow: 0 0 0 3px rgba(74,141,183,0.12), var(--neu-extrude-sm);
}

/* 弹出面板 */
.add-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 200;
  padding: 14px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-section-title {
  font-size: 10px; font-weight: 700; letter-spacing: 1px;
  color: #8A9AAC; text-transform: uppercase; padding: 0 2px;
}
.menu-divider {
  height: 1px; background: var(--neu-stroke-faint); margin: 2px 0;
}

/* 模式 2×2 网格 */
.mode-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 5px;
}
.mode-grid-item {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 10px; border-radius: 10px; border: 1px solid transparent;
  cursor: pointer; background: var(--bg-color);
  font-size: 12px; font-family: 'Noto Sans SC', sans-serif; color: #5A6A7C;
  box-shadow: var(--neu-extrude-sm);
  transition: all 0.18s;
}
.mode-grid-item:hover { color: var(--genshin-blue); border-color: rgba(74,141,183,0.25); }
.mode-grid-item.active {
  background: linear-gradient(135deg, var(--genshin-blue), var(--genshin-blue-light));
  color: #fff; border-color: transparent;
  box-shadow: var(--neu-glow-blue-strong);
}
.mgi-icon { font-size: 14px; flex-shrink: 0; }
.mgi-label { font-size: 11px; font-weight: 500; }

/* 视图列表 */
.view-grid {
  display: flex; flex-direction: column; gap: 2px;
}
.view-grid-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border-radius: 8px; border: none;
  background: none; cursor: pointer;
  font-size: 12px; font-family: 'Noto Sans SC', sans-serif;
  color: var(--genshin-blue-dark); transition: background 0.15s; width: 100%;
}
.view-grid-item:hover { background: rgba(74,141,183,0.08); }
.view-grid-item.opened { color: #8A9AAC; }
.vgi-icon { font-size: 14px; flex-shrink: 0; }
.vgi-title { flex: 1; text-align: left; }
.vgi-badge { font-size: 9px; padding: 1px 5px; border-radius: 5px; background: rgba(74,141,183,0.1); color: var(--genshin-blue); }

.menu-pop-enter-active,
.menu-pop-leave-active { transition: all 0.2s cubic-bezier(0.4,0,0.2,1); }
.menu-pop-enter-from,
.menu-pop-leave-to { opacity: 0; transform: translateY(-8px) scale(0.96); }

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
.canvas-fade-leave-active { transition: all 0.2s ease; }
.canvas-fade-enter-from,
.canvas-fade-leave-to { opacity: 0; transform: translateY(4px); }
</style>
