<template>
  <div class="plan-view">
    <ViewToolbar class="plan-toolbar">
      <span class="plan-title">巡检计划生成</span>
      <div class="plan-type-tabs">
        <button v-for="t in planTypes" :key="t.key" class="pt-btn" :class="{ active: selType === t.key }" @click="selType = t.key">{{ t.label }}</button>
      </div>
      <button class="gen-plan-btn" :disabled="isGen" @click="generatePlan">
        {{ isGen ? '生成中...' : generated ? '重新生成' : '✨ AI 生成计划' }}
      </button>
    </ViewToolbar>

    <div class="plan-body">
      <!-- 摘要栏 -->
      <div
        class="plan-summary neu-card u-scrollbar-hidden"
        ref="planSummaryRef"
        :style="{ overflowY: planSummaryOverflowY, overflowX: planSummaryOverflowX }"
        @mouseenter="planSummaryScroll.onEnter"
        @mouseleave="planSummaryScroll.onLeave"
      >
        <div class="summary-title">计划摘要</div>
        <div v-if="!generated && !isGen" class="summary-empty">
          <span>点击右上角"AI 生成计划"开始</span>
        </div>
        <div v-else-if="isGen" class="summary-loading">
          <div class="loading-dots"><span></span><span></span><span></span></div>
          <span>AI 分析数据生成中...</span>
        </div>
        <div v-else class="summary-content">
          <div class="summary-stat-row">
            <div class="s-stat"><div class="s-num">{{ planData.totalTasks }}</div><div class="s-label">巡检任务</div></div>
            <div class="s-stat"><div class="s-num">{{ planData.totalRoads }}</div><div class="s-label">覆盖路段</div></div>
            <div class="s-stat"><div class="s-num">{{ planData.totalDays }}</div><div class="s-label">计划天数</div></div>
          </div>
          <div class="summary-desc" v-html="summaryText"></div>
          <div class="key-milestones">
            <div class="km-title">关键节点</div>
            <div v-for="m in planData.milestones" :key="m.date" class="km-item">
              <span class="km-dot" :class="m.type"></span>
              <span class="km-date">{{ m.date }}</span>
              <span class="km-text">{{ m.text }}</span>
            </div>
          </div>
          <button class="export-plan-btn">📥 导出计划文档</button>
        </div>
      </div>

      <!-- 月历视图 -->
      <div class="calendar-wrap neu-card">
        <div class="cal-header">
          <button class="cal-nav" @click="prevMonth">‹</button>
          <span class="cal-month">{{ calYear }}年{{ calMonth }}月</span>
          <button class="cal-nav" @click="nextMonth">›</button>
        </div>
        <div class="cal-weekdays">
          <span v-for="d in ['日','一','二','三','四','五','六']" :key="d">{{ d }}</span>
        </div>
        <div class="cal-grid">
          <div
            v-for="(day, i) in calDays"
            :key="i"
            class="cal-cell"
            :class="{ 'other-month': !day.currentMonth, today: day.isToday, 'has-task': day.tasks.length > 0 }"
          >
            <span class="cal-day-num">{{ day.date }}</span>
            <div class="cal-tasks">
              <span v-for="t in day.tasks.slice(0, 2)" :key="t.id" class="cal-task" :class="t.type">{{ t.label }}</span>
              <span v-if="day.tasks.length > 2" class="cal-more">+{{ day.tasks.length - 2 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useAdaptiveVerticalScroll } from '../../../composables/useAdaptiveVerticalScroll'
import ViewToolbar from '../../common/ViewToolbar.vue'

const planTypes = [
  { key: 'annual', label: '年度计划' }, { key: 'monthly', label: '月度计划' },
  { key: 'rectify', label: '整改计划' }, { key: 'recheck', label: '复测计划' },
]
const selType = ref('annual')
const generated = ref(false)
const isGen = ref(false)
const summaryText = ref('')

const planData = ref({ totalTasks: 0, totalRoads: 0, totalDays: 0, milestones: [] as any[] })

const planSummaryRef = ref<HTMLElement | null>(null)
const planSummaryScroll = useAdaptiveVerticalScroll(planSummaryRef)
const planSummaryOverflowY = planSummaryScroll.overflowY
const planSummaryOverflowX = planSummaryScroll.overflowX

watch([generated, isGen, summaryText, planData], async () => {
  await nextTick()
  await planSummaryScroll.remeasure()
}, { deep: true })

// TODO: API - POST /api/plans/generate
async function generatePlan() {
  isGen.value = true
  generated.value = false
  await new Promise(r => setTimeout(r, 1400))
  isGen.value = false
  generated.value = true
  planData.value = {
    totalTasks: 48, totalRoads: 12, totalDays: 90,
    milestones: [
      { date: '2024-04-01', type: 'patrol', text: 'Q2全市主干道启动例行巡检' },
      { date: '2024-04-15', type: 'rectify', text: '解放路坑槽整改截止' },
      { date: '2024-05-10', text: '文一西路专项整治中期评估', type: 'review' },
      { date: '2024-06-30', text: 'Q2巡检计划收尾汇总', type: 'summary' },
    ],
  }
  summaryText.value = '本季度计划覆盖上城区、西湖区、拱墅区等 <strong>12条</strong> 主干道路，重点关注文一西路、解放路等 <strong>3条</strong> 高风险路段，巡检频次 <strong>2次/月</strong>，计划整改任务 <strong>28项</strong>。'
}

// 日历
const now = new Date()
const calYear = ref(now.getFullYear())
const calMonth = ref(now.getMonth() + 1)

function prevMonth() { if (calMonth.value === 1) { calMonth.value = 12; calYear.value-- } else calMonth.value-- }
function nextMonth() { if (calMonth.value === 12) { calMonth.value = 1; calYear.value++ } else calMonth.value++ }

const mockTasks: Record<string, { id: number; label: string; type: string }[]> = {
  '2024-4-1':  [{ id: 1, label: '启动巡检', type: 'patrol' }],
  '2024-4-5':  [{ id: 2, label: '解放路', type: 'patrol' }, { id: 3, label: '延安路', type: 'patrol' }],
  '2024-4-10': [{ id: 4, label: '整改截止', type: 'rectify' }],
  '2024-4-15': [{ id: 5, label: '坑槽整改', type: 'rectify' }, { id: 6, label: '南山路', type: 'patrol' }],
  '2024-4-20': [{ id: 7, label: '复测验收', type: 'review' }],
  '2024-4-25': [{ id: 8, label: '文一路', type: 'patrol' }],
}

const calDays = computed(() => {
  const year = calYear.value, month = calMonth.value
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysInPrev = new Date(year, month - 1, 0).getDate()
  const days = []
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ date: daysInPrev - i, currentMonth: false, isToday: false, tasks: [] })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month}-${d}`
    const isToday = year === now.getFullYear() && month === now.getMonth() + 1 && d === now.getDate()
    days.push({ date: d, currentMonth: true, isToday, tasks: mockTasks[key] || [] })
  }
  const rem = 42 - days.length
  for (let d = 1; d <= rem; d++) {
    days.push({ date: d, currentMonth: false, isToday: false, tasks: [] })
  }
  return days
})
</script>

<style scoped>
.plan-view { display: flex; flex-direction: column; gap: 10px; height: 100%; }
.plan-title { font-family: 'Noto Serif SC', serif; font-size: 15px; font-weight: 700; color: var(--genshin-blue-dark); }
.plan-type-tabs { display: flex; gap: 4px; flex: 1; }
.pt-btn { padding: 4px 12px; border-radius: 8px; border: 1px solid var(--neu-stroke-muted); cursor: pointer; font-size: 11px; font-family: 'Noto Sans SC', sans-serif; background: var(--bg-color); color: #8A9AAC; transition: all 0.2s; box-shadow: var(--neu-extrude-xs); }
.pt-btn.active { background: linear-gradient(135deg, var(--genshin-blue), var(--genshin-blue-light)); color: #fff; border-color: transparent; }
.gen-plan-btn { padding: 6px 14px; border-radius: 10px; border: none; cursor: pointer; font-size: 12px; font-family: 'Noto Sans SC', sans-serif; background: linear-gradient(135deg, var(--genshin-gold-dark), var(--genshin-gold)); color: #fff; box-shadow: var(--neu-glow-gold); transition: all 0.2s; }
.gen-plan-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.plan-body { flex: 1; display: flex; gap: 10px; min-height: 0; }

.plan-summary { width: 280px; flex-shrink: 0; padding: 16px; display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.summary-title { font-size: 13px; font-weight: 600; color: var(--genshin-blue-dark); }
.summary-empty, .summary-loading { font-size: 12px; color: #8A9AAC; text-align: center; padding: 20px 0; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.loading-dots { display: flex; gap: 5px; }
.loading-dots span { width: 7px; height: 7px; border-radius: 50%; background: var(--genshin-blue); animation: dot-bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dot-bounce { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }

.summary-stat-row { display: flex; gap: 8px; }
.s-stat { flex: 1; text-align: center; padding: 8px 6px; background: var(--bg-groove); border-radius: 10px; box-shadow: var(--neu-inset-sm); }
.s-num { font-size: 22px; font-weight: 700; color: var(--genshin-blue); }
.s-label { font-size: 10px; color: #8A9AAC; margin-top: 2px; }
.summary-desc { font-size: 12px; color: #5A6A7C; line-height: 1.7; }
:deep(.summary-desc strong) { color: var(--genshin-blue-dark); font-weight: 600; }
.km-title { font-size: 12px; font-weight: 600; color: var(--genshin-blue-dark); margin-bottom: 8px; }
.km-item { display: flex; align-items: flex-start; gap: 8px; font-size: 11px; margin-bottom: 6px; }
.km-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 3px; flex-shrink: 0; }
.km-dot.patrol { background: #5A8FD0; } .km-dot.rectify { background: #E0A050; } .km-dot.review { background: #5CAD8A; } .km-dot.summary { background: var(--genshin-gold); }
.km-date { color: #8A9AAC; white-space: nowrap; }
.km-text { color: #5A6A7C; line-height: 1.4; }
.export-plan-btn { padding: 7px 14px; border-radius: 10px; border: none; cursor: pointer; font-size: 12px; font-family: 'Noto Sans SC', sans-serif; background: linear-gradient(135deg, #5CAD8A, #7DC4A5); color: #fff; width: 100%; }

/* 日历 */
.calendar-wrap { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.cal-header { display: flex; align-items: center; justify-content: center; gap: 20px; }
.cal-month { font-size: 15px; font-weight: 600; color: var(--genshin-blue-dark); font-family: 'Noto Serif SC', serif; }
.cal-nav { width: 28px; height: 28px; border-radius: 8px; border: none; background: var(--bg-color); cursor: pointer; font-size: 16px; color: var(--genshin-blue); box-shadow: var(--neu-extrude-sm); transition: all 0.2s; }
.cal-nav:hover { box-shadow: var(--neu-extrude-md); }
.cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; color: #8A9AAC; padding: 0 2px; }
.cal-grid { flex: 1; display: grid; grid-template-columns: repeat(7, 1fr); grid-template-rows: repeat(6, 1fr); gap: 4px; }
.cal-cell { border-radius: 8px; padding: 4px; background: var(--bg-color); box-shadow: var(--neu-extrude-sm); display: flex; flex-direction: column; gap: 2px; min-height: 52px; transition: all 0.15s; }
.cal-cell.other-month { opacity: 0.4; }
.cal-cell.today { box-shadow: var(--neu-extrude-sm-deep), 0 0 0 2px rgba(212,168,83,0.4); }
.cal-cell.has-task { background: linear-gradient(135deg, var(--bg-color), rgba(74,141,183,0.05)); }
.cal-day-num { font-size: 11px; font-weight: 600; color: var(--genshin-blue-dark); }
.today .cal-day-num { color: var(--genshin-gold); }
.cal-tasks { display: flex; flex-direction: column; gap: 2px; }
.cal-task { font-size: 9px; padding: 1px 5px; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cal-task.patrol  { background: rgba( 90,143,208,0.15); color: #5A8FD0; }
.cal-task.rectify { background: rgba(224,160, 80,0.15); color: #E0A050; }
.cal-task.review  { background: rgba( 92,173,138,0.15); color: #5CAD8A; }
.cal-more { font-size: 9px; color: #8A9AAC; }
</style>
