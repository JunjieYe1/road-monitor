<template>
  <div
    ref="panelRoot"
    class="left-panel-wrap u-scrollbar-hidden"
    :style="{ overflowY, overflowX }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <transition name="panel-switch" mode="out-in">
      <!-- 全景洞察 -->
      <div v-if="mode === 'insight'" key="insight" class="panel-content">
        <StatCard label="今日告警总数" :value="alertStore.totalCount" unit="处" :sub="severityItems" />
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">处理状态概览</div>
          <StatusBarList :items="statusBars" :total="total" fill-by-key />
        </div>
        <PieChart :data="alertStore.typeDistribution" />
        <BarChart title="区域分布 TOP5" :data="alertStore.districtTop5" />
        <div class="neu-card alert-list-card">
          <div class="genshin-subtitle sec-title">最新告警</div>
          <div class="alert-list">
            <div
              v-for="alert in recentAlerts"
              :key="alert.id"
              class="alert-item neu-card-sm"
              :class="alert.severity"
              @click="alertStore.selectAlert(alert)"
            >
              <SeverityBadge :level="alert.severity" size="sm" />
              <div class="alert-info">
                <div class="alert-type">{{ alert.type }} · {{ alert.district }}</div>
                <div class="alert-addr">{{ alert.address }}</div>
              </div>
              <span class="alert-time">{{ alert.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据采集 -->
      <div v-else-if="mode === 'collect'" key="collect" class="panel-content">
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
            <div v-for="t in uploadTasks" :key="t.id" class="task-item neu-card-sm">
              <span class="task-icon">📄</span>
              <div class="task-info">
                <div class="task-name">{{ t.name }}</div>
                <div class="task-time">{{ t.time }}</div>
              </div>
              <span class="task-status" :class="t.status">{{ taskLabel(t.status) }}</span>
            </div>
          </div>
        </div>
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">知识库统计</div>
          <div class="kb-mini-stats">
            <div class="kbms-item"><span class="kbms-num">247</span><span class="kbms-label">病害记录</span></div>
            <div class="kbms-item"><span class="kbms-num">89</span><span class="kbms-label">知识点</span></div>
            <div class="kbms-item"><span class="kbms-num">3</span><span class="kbms-label">知识库</span></div>
          </div>
        </div>
      </div>

      <!-- 运营管理 -->
      <div v-else-if="mode === 'operations'" key="operations" class="panel-content">
        <StatCard label="活跃工单" :value="23" unit="张" />
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">工单总览</div>
          <StatusBarList :items="woBars" :total="woTotal" :fill-by-key="false" />
        </div>
        <div class="neu-card status-card">
          <div class="genshin-subtitle sec-title">本月计划执行</div>
          <div class="plan-ring-wrap">
            <svg viewBox="0 0 100 100" width="80" height="80" class="plan-ring">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-groove)" stroke-width="10"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--genshin-blue)" stroke-width="10"
                stroke-dasharray="251.2" :stroke-dashoffset="251.2 * (1 - 0.68)"
                stroke-linecap="round" transform="rotate(-90 50 50)"/>
              <text x="50" y="54" text-anchor="middle" font-size="16" font-weight="800" fill="var(--genshin-blue-dark)">68%</text>
            </svg>
            <div class="plan-labels">
              <div class="pl-item"><span class="pl-dot" style="background:#5CAD8A"></span>已完成 34</div>
              <div class="pl-item"><span class="pl-dot" style="background:#E0A050"></span>进行中 16</div>
              <div class="pl-item"><span class="pl-dot" style="background:#B0BAC8"></span>待开始 50</div>
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
                    <div class="risk-bar-fill" :class="r.cls" :style="{ width: r.prob + '%' }"></div>
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
import { ref, computed, watch, nextTick } from 'vue'
import { useAdaptiveVerticalScroll } from '../../composables/useAdaptiveVerticalScroll'
import { useAlertStore } from '../../stores/alertStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { SEV_LABELS, SEV_COLORS, SEV_ORDER, STATUS_LABELS, STATUS_COLORS } from '../../utils/labels'
import StatCard from './StatCard.vue'
import PieChart from './PieChart.vue'
import BarChart from './BarChart.vue'
import SeverityBadge from '../common/SeverityBadge.vue'
import StatusBarList from '../common/StatusBarList.vue'

const alertStore  = useAlertStore()
const canvasStore = useCanvasStore()
const mode = computed(() => canvasStore.agentMode)

const total = computed(() => alertStore.totalCount)

const severityItems = computed(() =>
  (['high','medium','low'] as const).map(l => ({ label: SEV_LABELS[l], value: alertStore.severitySummary[l], color: SEV_COLORS[l] }))
)
const statusBars = computed(() =>
  (['pending','processing','completed'] as const).map(k => ({ key: k, label: STATUS_LABELS[k], color: STATUS_COLORS[k], count: alertStore.statusSummary[k] }))
)
const recentAlerts = computed(() =>
  [...alertStore.alerts].sort((a,b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]).slice(0,6)
)

/* 数据采集模式 */
const collectStats = [
  { label: '提取成功率', val: '94.3%', color: '#5CAD8A' },
  { label: '处理中任务', val: '2', color: '#E0A050' },
  { label: '失败任务',   val: '1', color: '#E07070' },
]
const uploadTasks = [
  { id:1, name:'2024年Q1巡检报告.pdf', time:'03-15 10:22', status:'done' },
  { id:2, name:'西湖区道路检测报告.pdf', time:'03-16 14:05', status:'done' },
  { id:3, name:'滨江区专项检测.pdf', time:'03-18 09:30', status:'processing' },
]
function taskLabel(s: string) { return s === 'done' ? '完成' : s === 'processing' ? '处理中' : '失败' }

/* 运营管理模式 */
const woBars = [
  { key:'pending',    label:'待处理', color:'#E07070', count: 4 },
  { key:'processing', label:'处理中', color:'#E0A050', count:10 },
  { key:'review',     label:'待验收', color:'#5A8FD0', count: 5 },
  { key:'done',       label:'已完成', color:'#5CAD8A', count: 4 },
]
const woTotal = computed(() => woBars.reduce((s, b) => s + b.count, 0))

/* 隐患预判模式 */
const riskRoads = [
  { rank:1, name:'南山路（雷峰塔段）', prob:78, cls:'risk-high' },
  { rank:2, name:'文一西路（紫金港段）', prob:71, cls:'risk-high' },
  { rank:3, name:'解放路（中段）', prob:52, cls:'risk-med' },
  { rank:4, name:'滨江大道（中段）', prob:43, cls:'risk-med' },
  { rank:5, name:'丰潭路（中段）', prob:22, cls:'risk-low' },
]
const riskDistData = computed(() => [
  { name:'上城区', value:85 }, { name:'西湖区', value:72 },
  { name:'滨江区', value:48 }, { name:'拱墅区', value:35 }, { name:'江干区', value:28 },
])

const panelRoot = ref<HTMLElement | null>(null)
const { overflowY, overflowX, onEnter, onLeave, remeasure } = useAdaptiveVerticalScroll(panelRoot)

watch(mode, async () => {
  await nextTick()
  await remeasure()
})
watch(recentAlerts, async () => {
  await nextTick()
  await remeasure()
}, { deep: true })
</script>

<style scoped>
.left-panel-wrap { display:flex; flex-direction:column; height:100%; padding:0; }
.panel-content { display:flex; flex-direction:column; gap:10px; }

.panel-switch-enter-active,.panel-switch-leave-active { transition:all 0.25s ease; }
.panel-switch-enter-from,.panel-switch-leave-to { opacity:0; transform:translateX(-8px); }

.status-card { padding:16px; }
.sec-title { font-size:14px; margin-bottom:12px; }
.alert-list-card { padding:16px; flex-shrink:0; }
.alert-list { display:flex; flex-direction:column; gap:7px; }
.alert-item { display:flex; align-items:center; gap:8px; padding:8px 10px; cursor:pointer; transition:transform 0.15s ease,box-shadow 0.15s ease; }
.alert-item:hover { transform:translateX(2px); box-shadow:6px 6px 12px var(--shadow-dark),-6px -6px 12px var(--shadow-light)!important; }
.alert-info { flex:1; min-width:0; }
.alert-type { font-size:12px; font-weight:600; color:var(--genshin-blue-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.alert-addr { font-size:11px; color:#8A9AAC; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.alert-time { font-size:11px; color:#8A9AAC; flex-shrink:0; }

/* 数据采集 */
.collect-stats { display:flex; flex-direction:column; gap:8px; }
.cs-item { display:flex; align-items:center; gap:8px; font-size:12px; }
.cs-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.cs-label { flex:1; color:#5A6A7C; }
.cs-val { font-weight:700; color:var(--genshin-blue-dark); }
.task-list { display:flex; flex-direction:column; gap:6px; }
.task-item { display:flex; align-items:center; gap:8px; padding:8px 10px; }
.task-icon { font-size:14px; }
.task-info { flex:1; min-width:0; }
.task-name { font-size:11px; font-weight:500; color:var(--genshin-blue-dark); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.task-time { font-size:10px; color:#8A9AAC; }
.task-status { font-size:10px; padding:2px 7px; border-radius:6px; font-weight:600; white-space:nowrap; }
.task-status.done { background:rgba(92,173,138,0.1); color:#5CAD8A; }
.task-status.processing { background:rgba(224,160,80,0.1); color:#E0A050; }
.kb-mini-stats { display:flex; gap:8px; }
.kbms-item { flex:1; text-align:center; padding:8px 4px; background:var(--bg-groove); border-radius:10px; box-shadow:inset 2px 2px 4px var(--shadow-dark),inset -2px -2px 4px var(--shadow-light); }
.kbms-num { display:block; font-size:20px; font-weight:700; color:var(--genshin-blue); }
.kbms-label { font-size:10px; color:#8A9AAC; }

/* 运营管理 */
.plan-ring-wrap { display:flex; align-items:center; gap:16px; }
.plan-ring { flex-shrink:0; }
.plan-labels { display:flex; flex-direction:column; gap:6px; }
.pl-item { display:flex; align-items:center; gap:6px; font-size:11px; color:#5A6A7C; }
.pl-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

/* 隐患预判 */
.risk-list { display:flex; flex-direction:column; gap:8px; }
.risk-mini-item { display:flex; align-items:center; gap:8px; }
.risk-rank { width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; flex-shrink:0; }
.risk-rank.risk-high { background:#E07070; } .risk-rank.risk-med { background:#E0A050; } .risk-rank.risk-low { background:#5CAD8A; }
.risk-info { flex:1; min-width:0; }
.risk-name { font-size:11px; font-weight:500; color:var(--genshin-blue-dark); margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.risk-bar-row { display:flex; align-items:center; gap:6px; }
.risk-bar-track { flex:1; height:5px; background:var(--bg-groove); border-radius:3px; overflow:hidden; }
.risk-bar-fill { height:100%; border-radius:3px; }
.risk-bar-fill.risk-high { background:linear-gradient(90deg,#E07070,#EAA0A0); }
.risk-bar-fill.risk-med  { background:linear-gradient(90deg,#E0A050,#F0C070); }
.risk-bar-fill.risk-low  { background:linear-gradient(90deg,#5CAD8A,#7DC4A5); }
.risk-prob { font-size:10px; font-weight:700; min-width:28px; text-align:right; }
.risk-prob.risk-high { color:#E07070; } .risk-prob.risk-med { color:#E0A050; } .risk-prob.risk-low { color:#5CAD8A; }
</style>
