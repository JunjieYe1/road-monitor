<template>
  <div class="risk-view">
    <ViewToolbar class="risk-toolbar">
      <span class="risk-title">路段风险预测</span>
      <div class="risk-time-tabs">
        <button v-for="t in timeTabs" :key="t.key" class="rt-btn" :class="{ active: selTime === t.key }" @click="selTime = t.key">{{ t.label }}</button>
      </div>
      <button class="analyze-btn" @click="runAnalysis">🤖 AI 分析预测</button>
    </ViewToolbar>

    <div class="risk-body">
      <!-- 路段风险列表 -->
      <div
        class="risk-list-panel neu-card u-scrollbar-hidden"
        ref="riskListRef"
        :style="{ overflowY: riskListOverflowY, overflowX: riskListOverflowX }"
        @mouseenter="riskListScroll.onEnter"
        @mouseleave="riskListScroll.onLeave"
      >
        <div class="risk-list-title">路段风险排名</div>
        <div class="risk-items">
          <SelectableRankRow
            v-for="(road, i) in riskRoads"
            :key="road.id"
            variant="risk"
            :selected="selRoad?.id === road.id"
            :title="road.name"
            :bar-width-pct="road.prob"
            :bar-fill-style="riskBarFillStyle(road)"
            :metric="road.prob + '%'"
            :metric-class="riskClass(road.level)"
            @select="selRoad = road"
          >
            <template #rank>
              <div class="ri-rank" :class="riskClass(road.level)">{{ i + 1 }}</div>
            </template>
            <template #badge>
              <div class="ri-badge" :class="riskClass(road.level)">{{ road.level }}</div>
            </template>
          </SelectableRankRow>
        </div>
      </div>

      <!-- 详情 & 预测摘要 -->
      <div class="risk-detail-panel">
        <!-- 选中路段详情 -->
        <div class="risk-detail-card neu-card">
          <template v-if="selRoad">
            <div class="rd-header">
              <div class="rd-name">{{ selRoad.name }}</div>
              <div class="rd-badge" :class="riskClass(selRoad.level)">{{ selRoad.level }}风险</div>
            </div>
            <div class="rd-prob-display">
              <span class="rd-prob-num" :class="riskClass(selRoad.level)">{{ selRoad.prob }}%</span>
              <span class="rd-prob-label">未来{{ selTime === '1m' ? '1个月' : selTime === '3m' ? '3个月' : '6个月' }}塌陷概率</span>
            </div>
            <div class="rd-factors">
              <div class="rf-title">风险因素</div>
              <div v-for="f in selRoad.factors" :key="f.name" class="rf-item">
                <span class="rf-name">{{ f.name }}</span>
                <div class="rf-bar-track">
                  <div class="rf-bar-fill" :style="{ width: f.weight + '%', background: f.color }"></div>
                </div>
                <span class="rf-val">{{ f.weight }}%</span>
              </div>
            </div>
            <div class="rd-suggestion">
              <div class="sug-title">🤖 AI 建议</div>
              <div class="sug-text">{{ selRoad.suggestion }}</div>
            </div>
          </template>
          <div v-else class="rd-empty">← 点击左侧路段查看详情</div>
        </div>

        <!-- AI 预测摘要（流式） -->
        <div class="ai-summary-card neu-card u-scrollbar-hidden">
          <div class="ai-sum-header">
            <span class="ai-sum-title">🤖 AI 预测摘要</span>
            <span v-if="isAnalyzing" class="ai-analyzing">分析中...</span>
          </div>
          <div class="ai-sum-body">
            <div v-if="!aiSummary && !isAnalyzing" class="ai-sum-empty">点击上方"AI 分析预测"生成智能预测报告</div>
            <div v-else class="ai-sum-text" v-html="aiSummaryDisplay"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useAdaptiveVerticalScroll } from '../../../composables/useAdaptiveVerticalScroll'
import ViewToolbar from '../../common/ViewToolbar.vue'
import SelectableRankRow from '../../common/SelectableRankRow.vue'

const timeTabs = [{ key: '1m', label: '未来1个月' }, { key: '3m', label: '未来3个月' }, { key: '6m', label: '未来6个月' }]
const selTime = ref('3m')
const isAnalyzing = ref(false)
const aiSummary = ref('')
const aiSummaryDisplay = ref('')

// TODO: API - GET /api/risk/predict
const riskRoads = ref([
  { id: 1, name: '南山路（雷峰塔路口段）', level: '高', prob: 78, factors: [
    { name: '地质沉降', weight: 85, color: '#E07070' }, { name: '管网老化', weight: 72, color: '#E0A050' },
    { name: '交通负荷', weight: 45, color: '#5A8FD0' }, { name: '历史病害', weight: 90, color: '#E07070' }],
    suggestion: '建议立即开展专项地质勘察，同时协调地下管网主管部门排查渗漏隐患，在梅雨季前完成加固处理。' },
  { id: 2, name: '文一西路（紫金港路段）', level: '高', prob: 71, factors: [
    { name: '地质沉降', weight: 78, color: '#E07070' }, { name: '管网老化', weight: 55, color: '#E0A050' },
    { name: '交通负荷', weight: 82, color: '#E07070' }, { name: '历史病害', weight: 68, color: '#E0A050' }],
    suggestion: '该路段为主要干道，交通负荷持续偏高，建议在夜间实施路基加固，并提前安排交通疏导预案。' },
  { id: 3, name: '解放路（中段）', level: '中', prob: 52, factors: [
    { name: '地质沉降', weight: 45, color: '#5A8FD0' }, { name: '管网老化', weight: 68, color: '#E0A050' },
    { name: '交通负荷', weight: 55, color: '#E0A050' }, { name: '历史病害', weight: 48, color: '#5A8FD0' }],
    suggestion: '建议在下季度例行巡检中重点关注，增加巡检频次至每月3次。' },
  { id: 4, name: '滨江大道（中段）', level: '中', prob: 43, factors: [
    { name: '地质沉降', weight: 30, color: '#5CAD8A' }, { name: '管网老化', weight: 42, color: '#5A8FD0' },
    { name: '交通负荷', weight: 75, color: '#E07070' }, { name: '历史病害', weight: 35, color: '#5CAD8A' }],
    suggestion: '重载车辆影响较大，建议协调物流管理部门错峰通行，减少极端载重对路基的冲击。' },
  { id: 5, name: '丰潭路（中段）', level: '低', prob: 22, factors: [
    { name: '地质沉降', weight: 20, color: '#5CAD8A' }, { name: '管网老化', weight: 28, color: '#5CAD8A' },
    { name: '交通负荷', weight: 35, color: '#5CAD8A' }, { name: '历史病害', weight: 18, color: '#5CAD8A' }],
    suggestion: '当前风险较低，按常规周期安排巡检即可，注意雨季后及时检查排水状况。' },
])

const selRoad = ref(riskRoads.value[0])

const riskListRef = ref<HTMLElement | null>(null)
const riskListScroll = useAdaptiveVerticalScroll(riskListRef)
const riskListOverflowY = riskListScroll.overflowY
const riskListOverflowX = riskListScroll.overflowX

watch(selRoad, async () => {
  await nextTick()
  await riskListScroll.remeasure()
})

function riskClass(level: string) { return level === '高' ? 'risk-high' : level === '中' ? 'risk-med' : 'risk-low' }

function riskBarFillStyle(road: (typeof riskRoads.value)[0]) {
  const cls = riskClass(road.level)
  const bg = cls === 'risk-high' ? 'linear-gradient(90deg, #E07070, #EAA0A0)' : cls === 'risk-med' ? 'linear-gradient(90deg, #E0A050, #F0C070)' : 'linear-gradient(90deg, #5CAD8A, #7DC4A5)'
  return { width: road.prob + '%', background: bg }
}

const MOCK_SUMMARY = `根据历史病害数据、地质条件及交通负荷综合分析，未来3个月内城区主干道路塌陷风险概况如下：\n\n**高风险路段（2条）：**\n1. **南山路雷峰塔路口段** — 地下管网老化叠加地质沉降，综合风险指数 78，建议立即介入\n2. **文一西路紫金港路段** — 重载交通持续冲击，风险指数 71，建议提前部署应急预案\n\n**预防建议：**\n梅雨季节（5-6月）是病害高发期，建议在4月底前完成所有高危路段的预防性处置，同时加强中风险路段的监测频次。`

async function runAnalysis() {
  isAnalyzing.value = true
  aiSummaryDisplay.value = ''
  aiSummary.value = ''
  await new Promise(r => setTimeout(r, 1200))
  isAnalyzing.value = false
  aiSummary.value = MOCK_SUMMARY
  await typewriter(MOCK_SUMMARY.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'))
}

async function typewriter(html: string) {
  aiSummaryDisplay.value = ''
  const chars = html.split('')
  for (let i = 0; i < chars.length; i++) {
    aiSummaryDisplay.value += chars[i]
    if (i % 5 === 0) await new Promise(r => setTimeout(r, 12))
  }
}
</script>

<style scoped>
.risk-view { display: flex; flex-direction: column; gap: 10px; height: 100%; }
.risk-time-tabs { display: flex; gap: 4px; flex: 1; }
.risk-title { font-family: 'Noto Serif SC', serif; font-size: 15px; font-weight: 700; color: var(--genshin-blue-dark); }
.rt-btn { padding: 4px 12px; border-radius: 8px; border: 1px solid var(--neu-stroke-muted); cursor: pointer; font-size: 11px; font-family: 'Noto Sans SC', sans-serif; background: var(--bg-color); color: #8A9AAC; transition: all 0.2s; box-shadow: var(--neu-extrude-xs); }
.rt-btn.active { background: linear-gradient(135deg, #E07070, #EAA0A0); color: #fff; border-color: transparent; }
.analyze-btn { padding: 6px 14px; border-radius: 10px; border: none; cursor: pointer; font-size: 12px; font-family: 'Noto Sans SC', sans-serif; background: linear-gradient(135deg, var(--genshin-blue), var(--genshin-blue-light)); color: #fff; box-shadow: var(--neu-glow-blue-soft); }

.risk-body { flex: 1; display: flex; gap: 10px; min-height: 0; }
.risk-list-panel { width: 280px; flex-shrink: 0; padding: 14px; }
.risk-list-title { font-size: 13px; font-weight: 600; color: var(--genshin-blue-dark); margin-bottom: 12px; }
.risk-items { display: flex; flex-direction: column; gap: 8px; }
.ri-rank { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; }
.ri-rank.risk-high { background: linear-gradient(135deg, #E07070, #EAA0A0); }
.ri-rank.risk-med  { background: linear-gradient(135deg, #E0A050, #F0C070); }
.ri-rank.risk-low  { background: linear-gradient(135deg, #5CAD8A, #7DC4A5); }
:deep(.srr-metric.risk-high) { color: #E07070; }
:deep(.srr-metric.risk-med) { color: #E0A050; }
:deep(.srr-metric.risk-low) { color: #5CAD8A; }
.ri-badge { font-size: 10px; padding: 2px 7px; border-radius: 8px; font-weight: 600; white-space: nowrap; }
.ri-badge.risk-high { background: rgba(224,112,112,0.12); color: #E07070; }
.ri-badge.risk-med  { background: rgba(224,160, 80,0.12); color: #E0A050; }
.ri-badge.risk-low  { background: rgba( 92,173,138,0.12); color: #5CAD8A; }

.risk-detail-panel { flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.risk-detail-card { flex: 0 0 auto; padding: 16px; }
.rd-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.rd-name { font-size: 14px; font-weight: 700; color: var(--genshin-blue-dark); }
.rd-badge { padding: 3px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
.rd-badge.risk-high { background: rgba(224,112,112,0.12); color: #E07070; }
.rd-badge.risk-med  { background: rgba(224,160, 80,0.12); color: #E0A050; }
.rd-badge.risk-low  { background: rgba( 92,173,138,0.12); color: #5CAD8A; }
.rd-prob-display { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.rd-prob-num { font-size: 32px; font-weight: 800; }
.rd-prob-num.risk-high { color: #E07070; } .rd-prob-num.risk-med { color: #E0A050; } .rd-prob-num.risk-low { color: #5CAD8A; }
.rd-prob-label { font-size: 12px; color: #8A9AAC; }
.rf-title { font-size: 12px; font-weight: 600; color: var(--genshin-blue-dark); margin-bottom: 8px; }
.rf-item { display: flex; align-items: center; gap: 8px; font-size: 11px; margin-bottom: 5px; }
.rf-name { min-width: 72px; color: #5A6A7C; }
.rf-bar-track { flex: 1; height: 6px; background: var(--bg-groove); border-radius: 3px; overflow: hidden; }
.rf-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
.rf-val { min-width: 30px; text-align: right; color: #8A9AAC; font-size: 10px; }
.rd-suggestion { padding: 10px; background: rgba(74,141,183,0.06); border-radius: 10px; border-left: 3px solid var(--genshin-blue); }
.sug-title { font-size: 11px; font-weight: 600; color: var(--genshin-blue); margin-bottom: 5px; }
.sug-text { font-size: 12px; color: #5A6A7C; line-height: 1.6; }
.rd-empty { font-size: 13px; color: #8A9AAC; padding: 20px 0; text-align: center; }

.ai-summary-card { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 10px; min-height: 0; overflow-y: auto; overflow-x: hidden; }
.ai-sum-header { display: flex; align-items: center; gap: 8px; }
.ai-sum-title { font-size: 13px; font-weight: 600; color: var(--genshin-blue-dark); }
.ai-analyzing { font-size: 11px; color: var(--genshin-blue); animation: pulse-text 1.2s infinite; }
@keyframes pulse-text { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
.ai-sum-body { flex: 1; }
.ai-sum-empty { font-size: 12px; color: #8A9AAC; text-align: center; padding: 20px 0; }
.ai-sum-text { font-size: 12px; color: #3A4A5C; line-height: 1.8; }
:deep(.ai-sum-text strong) { color: var(--genshin-blue-dark); font-weight: 600; }
:deep(.ai-sum-text br) { display: block; margin-bottom: 4px; }
</style>
