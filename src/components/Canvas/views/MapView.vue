<template>
  <div class="map-view">
    <!-- 控制栏 -->
    <div class="map-controls neu-card">
      <div class="control-left">
        <!-- 图层切换 -->
        <div class="layer-tabs">
          <button
            v-for="l in layers"
            :key="l.key"
            class="layer-tab"
            :class="{ active: activeLayer === l.key }"
            @click="activeLayer = l.key"
          >{{ l.label }}</button>
        </div>
        <!-- 类型筛选（仅病害分布层显示）-->
        <transition name="fade-in">
          <div v-if="activeLayer === 'defect'" class="filter-group">
            <button
              v-for="f in filters"
              :key="f.key"
              class="filter-btn"
              :class="{ active: activeFilter === f.key }"
              :style="activeFilter === f.key ? { background: f.color, color: '#fff', borderColor: 'transparent' } : {}"
              @click="activeFilter = activeFilter === f.key ? 'all' : f.key"
            >{{ f.label }}</button>
          </div>
        </transition>
      </div>
      <div class="map-stats">
        <span v-for="item in severityStats" :key="item.key" class="mstat">
          <span class="mstat-dot" :style="{ background: item.color }"></span>
          {{ item.label }} {{ item.count }}
        </span>
      </div>
    </div>

    <!-- 地图容器 -->
    <div class="map-container neu-card">
      <div class="corner-decor tl"></div>
      <div class="corner-decor br"></div>

      <tdt-map
        class="tdt-map-el"
        :center="mapCenter"
        :zoom="mapZoom"
        :loadConfig="loadConfig"
        @init="onMapInit"
        @click="onMapClick"
      >
        <!-- 病害分布标记 -->
        <template v-if="activeLayer === 'defect'">
          <tdt-marker
            v-for="alert in filteredAlerts"
            :key="alert.id"
            :position="[alert.lng, alert.lat]"
            :icon="severityIcon(alert.severity)"
            :draggable="false"
            @click="() => onMarkerClick(alert)"
          />
          <tdt-infowindow v-model:target="infoTarget" :content="infoContent" :offset="[0, -36]" />
        </template>

        <!-- 热力图层（CSS色块模拟） -->
        <template v-if="activeLayer === 'heat'">
          <tdt-marker
            v-for="alert in alertStore.alerts"
            :key="'h-' + alert.id"
            :position="[alert.lng, alert.lat]"
            :icon="heatIcon(alert.severity)"
            :draggable="false"
          />
        </template>

        <!-- 健康度评估标记 -->
        <template v-if="activeLayer === 'health'">
          <tdt-marker
            v-for="road in healthRoads"
            :key="'r-' + road.id"
            :position="[road.lng, road.lat]"
            :icon="healthIcon(road.score)"
            :draggable="false"
            @click="() => onHealthClick(road)"
          />
        </template>
      </tdt-map>

      <!-- 告警详情浮层 -->
      <transition name="popup">
        <div v-if="alertStore.selectedAlert && activeLayer === 'defect'" class="alert-popup">
          <button class="popup-close" @click="closePopup">✕</button>
          <div class="popup-header">
            <SeverityBadge :level="alertStore.selectedAlert.severity" />
            <span class="popup-type">{{ alertStore.selectedAlert.type }}</span>
          </div>
          <div class="popup-addr">📍 {{ alertStore.selectedAlert.address }}</div>
          <div class="popup-desc">{{ alertStore.selectedAlert.description }}</div>
          <div class="popup-footer">
            <span class="popup-district">{{ alertStore.selectedAlert.district }}</span>
            <span class="popup-time">{{ alertStore.selectedAlert.time }}</span>
            <span class="popup-status" :class="alertStore.selectedAlert.status">
              {{ statusLabel(alertStore.selectedAlert.status) }}
            </span>
          </div>
          <div class="popup-actions">
            <button
              class="popup-btn"
              :class="{ active: chatStore.attachedAlert?.id === alertStore.selectedAlert.id }"
              @click="addToChat(alertStore.selectedAlert)"
            >
              <svg viewBox="0 0 20 20" fill="none" width="12" height="12" style="flex-shrink:0">
                <path d="M2 10C2 5.58 5.58 2 10 2s8 3.58 8 8-3.58 8-8 8H2l2.5-2.5A7.95 7.95 0 0 1 2 10Z"
                  stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                <path d="M7 10h6M10 7v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
              {{ chatStore.attachedAlert?.id === alertStore.selectedAlert.id ? '已加入对话' : '加入对话' }}
            </button>
            <button
              class="popup-btn flow-btn"
              @click="goToDefectFlow(alertStore.selectedAlert.id)"
            >
              <svg viewBox="0 0 20 20" fill="none" width="12" height="12" style="flex-shrink:0">
                <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              查看处理流程
            </button>
          </div>
        </div>
      </transition>

      <!-- 健康度详情浮层 -->
      <transition name="popup">
        <div v-if="selectedRoad && activeLayer === 'health'" class="health-popup">
          <button class="popup-close" @click="selectedRoad = null">✕</button>
          <div class="health-popup-name">{{ selectedRoad.name }}</div>
          <div class="health-score-display">
            <span class="health-score-num" :class="healthClass(selectedRoad.score)">{{ selectedRoad.score }}</span>
            <span class="health-score-label">健康信用分</span>
          </div>
          <div class="health-tags">
            <span v-for="t in selectedRoad.tags" :key="t" class="health-tag">{{ t }}</span>
          </div>
        </div>
      </transition>

      <!-- 健康度图例 -->
      <transition name="fade-in">
        <div v-if="activeLayer === 'health'" class="health-legend neu-card">
          <div class="legend-title">道路健康度</div>
          <div v-for="g in healthGrades" :key="g.label" class="legend-item">
            <span class="legend-dot" :style="{ background: g.color }"></span>
            <span>{{ g.label }}</span>
            <span class="legend-range">{{ g.range }}</span>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAlertStore, type AlertPoint } from '../../../stores/alertStore'
import { useChatStore } from '../../../stores/chatStore'
import { SEV_COLORS, statusLabel } from '../../../utils/labels'
import SeverityBadge from '../../common/SeverityBadge.vue'

const router = useRouter()
const alertStore = useAlertStore()
const chatStore = useChatStore()

const loadConfig = { v: '4.0', tk: '7db4d1823b7788dc88066899e23df0d5' }
const mapCenter = ref([120.155, 30.274])
const mapZoom = ref(12)
const mapInstance = ref<any>(null)
const infoTarget = ref<any>(null)
const infoContent = ref('')

/* ── 图层切换 ── */
const layers = [
  { key: 'defect', label: '病害分布' },
  { key: 'heat',   label: '热力图' },
  { key: 'health', label: '健康度评估' },
]
const activeLayer = ref<string>('defect')

/* ── 类型筛选 ── */
const activeFilter = ref<string>('all')
const filters = [
  { key: '裂缝', label: '裂缝', color: '#E07070' },
  { key: '坑槽', label: '坑槽', color: '#E0A050' },
  { key: '沉陷', label: '沉陷', color: '#2D5A7B' },
  { key: '车辙', label: '车辙', color: '#5A8FD0' },
  { key: '其他', label: '其他', color: '#5CAD8A' },
]

const filteredAlerts = computed(() =>
  activeFilter.value === 'all'
    ? alertStore.alerts
    : alertStore.alerts.filter(a => a.type === activeFilter.value)
)

const severityStats = computed(() =>
  (['high', 'medium', 'low'] as const).map(key => ({
    key,
    label: key === 'high' ? '高危' : key === 'medium' ? '中危' : '低危',
    color: SEV_COLORS[key],
    count: alertStore.severitySummary[key],
  }))
)

/* ── 图标生成 ── */
function makeSvgIcon(color: string, opacity = 0.92): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="40" viewBox="0 0 34 40">
    <circle cx="17" cy="17" r="15" fill="${color}" opacity="${opacity}"/>
    <circle cx="17" cy="17" r="10" fill="rgba(255,255,255,0.28)"/>
    <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.5)"/>
    <polygon points="17,38 11,27 23,27" fill="${color}" opacity="${opacity}"/>
  </svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

const ICONS: Record<string, string> = {
  high:   makeSvgIcon(SEV_COLORS.high),
  medium: makeSvgIcon(SEV_COLORS.medium),
  low:    makeSvgIcon(SEV_COLORS.low),
}
const severityIcon = (s: string) => ICONS[s] || ICONS.low

function heatIcon(severity: string): string {
  const colors: Record<string, string> = {
    high: 'rgba(224,80,80,0.55)', medium: 'rgba(224,160,80,0.45)', low: 'rgba(92,173,138,0.35)'
  }
  const sizes: Record<string, number> = { high: 48, medium: 36, low: 24 }
  const c = colors[severity] || colors.low
  const s = sizes[severity] || 24
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><circle cx="${s/2}" cy="${s/2}" r="${s/2}" fill="${c}"/></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

const HEALTH_COLORS = { great: '#5CAD8A', good: '#A8C87A', fair: '#E0C050', poor: '#E09050', bad: '#E07070' }
function healthIcon(score: number): string {
  const c = score >= 85 ? HEALTH_COLORS.great : score >= 70 ? HEALTH_COLORS.good : score >= 55 ? HEALTH_COLORS.fair : score >= 40 ? HEALTH_COLORS.poor : HEALTH_COLORS.bad
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="20" viewBox="0 0 36 20">
    <rect x="0" y="5" width="36" height="10" rx="5" fill="${c}" opacity="0.9"/>
    <text x="18" y="14" text-anchor="middle" font-size="9" fill="white" font-family="sans-serif" font-weight="bold">${score}</text>
  </svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

/* ── 健康度假数据 ── */
const healthRoads = ref([
  { id: 1, name: '延安路',   lng: 120.153, lat: 30.287, score: 78, tags: ['裂缝较多', '近期修缮'] },
  { id: 2, name: '解放路',   lng: 120.147, lat: 30.274, score: 52, tags: ['坑槽频发', '地下管网老化'] },
  { id: 3, name: '天目山路', lng: 120.130, lat: 30.295, score: 91, tags: ['状态良好', '定期养护'] },
  { id: 4, name: '文一西路', lng: 120.108, lat: 30.310, score: 44, tags: ['高频塌陷', '重点关注'] },
  { id: 5, name: '滨江大道', lng: 120.175, lat: 30.258, score: 67, tags: ['车辙磨损', '重载影响'] },
  { id: 6, name: '南山路',   lng: 120.163, lat: 30.248, score: 38, tags: ['大面积沉陷', '管道隐患'] },
  { id: 7, name: '丰潭路',   lng: 120.145, lat: 30.320, score: 83, tags: ['整体良好'] },
])

const healthGrades = [
  { label: '优秀', range: '85-100', color: HEALTH_COLORS.great },
  { label: '良好', range: '70-84',  color: HEALTH_COLORS.good },
  { label: '一般', range: '55-69',  color: HEALTH_COLORS.fair },
  { label: '较差', range: '40-54',  color: HEALTH_COLORS.poor },
  { label: '危险', range: '0-39',   color: HEALTH_COLORS.bad },
]

const selectedRoad = ref<typeof healthRoads.value[0] | null>(null)
function healthClass(score: number) {
  return score >= 85 ? 'great' : score >= 70 ? 'good' : score >= 55 ? 'fair' : score >= 40 ? 'poor' : 'bad'
}

function onMapInit(map: any) { mapInstance.value = map }

function onMarkerClick(alert: AlertPoint) {
  alertStore.selectAlert(alert)
  mapCenter.value = [alert.lng, alert.lat]
  infoContent.value = `
    <div style="font-family:'Noto Sans SC',sans-serif;padding:4px 6px;min-width:140px">
      <div style="font-weight:600;color:#1A3A52;font-size:13px">${alert.type} · ${alert.district}</div>
      <div style="font-size:11px;color:#6B7A8C;margin-top:3px">${alert.address}</div>
    </div>
  `
  setTimeout(() => { infoTarget.value = [alert.lng, alert.lat] }, 50)
}

function onHealthClick(road: typeof healthRoads.value[0]) {
  selectedRoad.value = road
  mapCenter.value = [road.lng, road.lat]
}

function onMapClick() { closePopup() }
function closePopup() {
  alertStore.selectAlert(null)
  infoTarget.value = null
}

function addToChat(alert: AlertPoint) { chatStore.attachAlert(alert) }

function goToDefectFlow(id: number) {
  router.push(`/defect/${id}`)
}
</script>

<style scoped>
.map-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

.map-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  flex-shrink: 0;
  gap: 10px;
  flex-wrap: wrap;
}

.control-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* 图层 Tabs */
.layer-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-groove);
  border-radius: 10px;
  padding: 3px;
  box-shadow: var(--neu-inset-shallow);
}

.layer-tab {
  padding: 4px 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 11px;
  font-family: 'Noto Sans SC', sans-serif;
  font-weight: 500;
  color: #8A9AAC;
  background: transparent;
  transition: all 0.2s;
}
.layer-tab.active {
  background: var(--bg-color);
  color: var(--genshin-blue);
  box-shadow: var(--neu-extrude-back);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.filter-btn {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 8px;
  border: 1px solid var(--neu-stroke-muted);
  cursor: pointer;
  background: var(--bg-color);
  color: var(--genshin-blue);
  transition: all 0.2s;
  font-family: 'Noto Sans SC', sans-serif;
  box-shadow: var(--neu-extrude-sm);
}

.map-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}
.mstat { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #5A6A7C; }
.mstat-dot { width: 8px; height: 8px; border-radius: 50%; }

/* 地图容器 */
.map-container {
  flex: 1;
  position: relative;
  border-radius: 20px;
  min-height: 0;
  overflow: hidden;
}
.tdt-map-el { width: 100% !important; height: 100% !important; }
:deep(.tdt-container) { filter: sepia(15%) saturate(0.92) hue-rotate(8deg); }
:deep(.tdt-infowindow-content-wrapper) {
  border-radius: 10px !important;
  box-shadow: 4px 4px 12px rgba(0,0,0,0.2) !important;
  border: 1px solid rgba(212,168,83,0.3) !important;
}
:deep(.tdt-infowindow-tip-container) { filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15)); }

/* 弹窗 */
.alert-popup, .health-popup {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(232,237,242,0.97);
  border-radius: 16px;
  padding: 14px 16px;
  min-width: 280px;
  max-width: 360px;
  box-shadow: var(--neu-extrude-lg-up), 0 0 0 1px rgba(212,168,83,0.25);
}

.popup-close {
  position: absolute; top: 10px; right: 12px;
  background: none; border: none; cursor: pointer; color: #8A9AAC; font-size: 13px; padding: 2px 5px; border-radius: 50%;
}
.popup-close:hover { color: var(--genshin-blue-dark); }

.popup-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.popup-type { font-family: 'Noto Serif SC', serif; font-size: 16px; font-weight: 600; color: var(--genshin-blue-dark); }
.popup-addr { font-size: 13px; color: #5A6A7C; margin-bottom: 6px; }
.popup-desc { font-size: 12px; color: #6B7A8C; line-height: 1.5; margin-bottom: 10px; padding: 8px 10px; background: rgba(163,177,198,0.12); border-radius: 8px; }
.popup-footer { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 10px; }
.popup-district { color: #8A9AAC; flex: 1; }
.popup-time { color: #8A9AAC; }
.popup-status { padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; }
.popup-status.pending    { background: rgba(224,112,112,0.12); color: #E07070; }
.popup-status.processing { background: rgba(224,160, 80,0.12); color: #E0A050; }
.popup-status.completed  { background: rgba( 92,173,138,0.12); color: #5CAD8A; }

.popup-actions { display: flex; gap: 8px; }
.popup-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 7px 10px; border-radius: 10px; border: 1px solid rgba(74,141,183,0.35);
  cursor: pointer; background: var(--bg-color); color: var(--genshin-blue);
  font-size: 11px; font-family: 'Noto Sans SC', sans-serif; font-weight: 500;
  box-shadow: var(--neu-extrude-back);
  transition: all 0.2s;
}
.popup-btn:hover { background: linear-gradient(135deg, var(--genshin-blue), var(--genshin-blue-light)); color: #fff; border-color: transparent; }
.popup-btn.active { background: linear-gradient(135deg, var(--genshin-gold-dark), var(--genshin-gold)); color: #fff; border-color: transparent; }
.popup-btn.flow-btn:hover { background: linear-gradient(135deg, #5CAD8A, #7DC4A5); color: #fff; border-color: transparent; }

/* 健康度弹窗 */
.health-popup-name { font-size: 16px; font-weight: 700; color: var(--genshin-blue-dark); margin-bottom: 8px; font-family: 'Noto Serif SC', serif; }
.health-score-display { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
.health-score-num { font-size: 36px; font-weight: 800; font-variant-numeric: tabular-nums; }
.health-score-num.great { color: #5CAD8A; }
.health-score-num.good  { color: #A8C87A; }
.health-score-num.fair  { color: #E0C050; }
.health-score-num.poor  { color: #E09050; }
.health-score-num.bad   { color: #E07070; }
.health-score-label { font-size: 13px; color: #8A9AAC; }
.health-tags { display: flex; gap: 5px; flex-wrap: wrap; }
.health-tag { font-size: 11px; padding: 2px 8px; border-radius: 8px; background: rgba(74,141,183,0.1); color: var(--genshin-blue); }

/* 健康度图例 */
.health-legend {
  position: absolute; top: 16px; right: 16px; z-index: 100;
  padding: 12px 14px; border-radius: 12px; min-width: 140px;
}
.legend-title { font-size: 12px; font-weight: 600; color: var(--genshin-blue-dark); margin-bottom: 8px; }
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #5A6A7C; margin-bottom: 5px; }
.legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.legend-range { margin-left: auto; color: #8A9AAC; }

.popup-enter-active, .popup-leave-active { transition: all 0.25s ease; }
.popup-enter-from, .popup-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }
.fade-in-enter-active, .fade-in-leave-active { transition: all 0.2s ease; }
.fade-in-enter-from, .fade-in-leave-to { opacity: 0; }
</style>
