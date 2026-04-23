<template>
  <div class="report-view">
    <!-- 工具栏 -->
    <ViewToolbar class="report-toolbar">
      <div class="report-types">
        <button
          v-for="t in reportTypes"
          :key="t.key"
          class="type-btn"
          :class="{ active: selectedType === t.key }"
          @click="selectedType = t.key"
        >{{ t.label }}</button>
      </div>
      <div class="toolbar-right">
        <span v-if="generated" class="gen-time">生成于 {{ genTime }}</span>
        <button class="action-btn" :disabled="isGenerating" @click="startGenerate">
          <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
            <path d="M10 2v4M10 14v4M4.22 4.22l2.83 2.83M12.95 12.95l2.83 2.83M2 10h4M14 10h4M4.22 15.78l2.83-2.83M12.95 7.05l2.83-2.83" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          {{ isGenerating ? '生成中...' : generated ? '重新生成' : '生成报告' }}
        </button>
        <button v-if="generated" class="action-btn export-btn">
          <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
            <path d="M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2M10 3v9M7 9l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          导出 PDF
        </button>
      </div>
    </ViewToolbar>

    <!-- 报告区域：正文可能很长，始终可纵向滚动 -->
    <div class="report-body neu-card u-scrollbar-hidden">
      <!-- 空态 -->
      <div v-if="!generated && !isGenerating" class="report-empty">
        <div class="empty-icon">📄</div>
        <div class="empty-title">选择报告类型，点击生成</div>
        <div class="empty-sub">系统将根据数据库数据自动生成结构化报告</div>
        <div class="empty-types">
          <div v-for="t in reportTypes" :key="t.key" class="empty-type-card" @click="selectedType = t.key; startGenerate()">
            <span class="etc-icon">{{ t.icon }}</span>
            <span>{{ t.label }}</span>
          </div>
        </div>
      </div>

      <!-- 生成动效 -->
      <div v-else-if="isGenerating" class="report-generating">
        <div class="gen-spinner">
          <div class="spin-ring"></div>
          <span class="gen-label-text">AI 生成中</span>
        </div>
        <div class="gen-progress-bar">
          <div class="gen-progress-fill" :style="{ width: genProgress + '%' }"></div>
        </div>
        <div class="gen-steps">
          <span v-for="(s, i) in genSteps" :key="i" class="gen-step" :class="{ done: i < currentStep, active: i === currentStep }">
            {{ s }}
          </span>
        </div>
      </div>

      <!-- 报告内容（打字机效果） -->
      <div v-else class="report-document">
        <div class="doc-header">
          <div class="doc-logo">◆</div>
          <div class="doc-title-block">
            <div class="doc-main-title">{{ reportTitle }}</div>
            <div class="doc-sub-title">杭州市城市道路病害监测平台 · 自动生成</div>
          </div>
          <div class="doc-meta">
            <div>生成时间：{{ genTime }}</div>
            <div>数据范围：2024年全年</div>
          </div>
        </div>
        <div class="doc-divider"></div>
        <div class="doc-body" v-html="displayedContent"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ViewToolbar from '../../common/ViewToolbar.vue'

const reportTypes = [
  { key: 'annual',   label: '年度报告',   icon: '📊' },
  { key: 'patrol',   label: '巡检情况',   icon: '🔍' },
  { key: 'rectify',  label: '整改情况',   icon: '🔧' },
  { key: 'recheck',  label: '复测情况',   icon: '✅' },
]
const selectedType = ref('annual')
const generated = ref(false)
const isGenerating = ref(false)
const genProgress = ref(0)
const currentStep = ref(0)
const genTime = ref('')
const displayedContent = ref('')

const genSteps = ['数据检索', '结构分析', '内容生成', '格式排版']

const reportTitle = computed(() => {
  const m: Record<string, string> = {
    annual: '2024年度道路病害监测报告', patrol: '2024年度路面巡检情况报告',
    rectify: '2024年度病害整改情况报告', recheck: '2024年度复测验收情况报告',
  }
  return m[selectedType.value] || '道路病害报告'
})

// TODO: API - POST /api/report/generate
const MOCK_REPORTS: Record<string, string> = {
  annual: `<h2>一、总体概述</h2>
<p>2024年全年，杭州市共完成主干道路病害巡检 <strong>286次</strong>，累计发现各类病害 <strong>347处</strong>，整改完成率达 <strong>82.3%</strong>，较上年提升 6.7 个百分点。</p>
<h2>二、病害类型分布</h2>
<p>裂缝类病害占比最高（38.6%），其次为坑槽（26.2%）、沉陷（18.4%）、车辙（12.1%）及其他（4.7%）。主干道裂缝病害集中于上城区延安路、解放路等老旧路段。</p>
<h2>三、重点路段分析</h2>
<p>列为重点关注路段共 <strong>9条</strong>，其中南山路、文一西路健康信用分低于 50 分，需在下一年度优先纳入大修计划。</p>
<h2>四、整改情况</h2>
<p>年度整改任务 <strong>286项</strong>，完成 <strong>235项</strong>，在建 <strong>31项</strong>，待处理 <strong>20项</strong>。平均整改响应时间为 <strong>2.8天</strong>，较去年缩短 0.5天。</p>
<h2>五、建议与展望</h2>
<p>建议在 2025年度重点开展文一西路、南山路的专项大修，同时加强梅雨季节前的预防性养护工作。计划引入无人机巡检设备，提升巡检效率约 40%。</p>`,
  patrol: `<h2>一、巡检概况</h2>
<p>2024年全年完成常规巡检 <strong>286次</strong>，覆盖城区主干道 <strong>47条</strong>，累计巡检里程 <strong>1,247公里</strong>。</p>
<h2>二、发现问题汇总</h2>
<p>本期共发现路面问题 <strong>347处</strong>，其中高危 <strong>68处</strong>、中危 <strong>143处</strong>、低危 <strong>136处</strong>。</p>
<h2>三、季度分布</h2>
<p>Q1发现 72处，Q2（梅雨季）发现 112处，Q3发现 89处，Q4发现 74处。梅雨季病害发生频率显著上升。</p>`,
  rectify: `<h2>一、整改执行情况</h2>
<p>本年度共下发整改工单 <strong>286张</strong>，完成整改 <strong>235张</strong>，完成率 <strong>82.2%</strong>。</p>
<h2>二、服务单位表现</h2>
<p>杭州市政养护有限公司完成率最高（94.3%），某路面工程公司完成率最低（61.2%），已列入履约预警名单。</p>`,
  recheck: `<h2>一、复测概况</h2>
<p>本年度对完工整改项目进行复测验收 <strong>235次</strong>，一次验收通过率 <strong>78.3%</strong>，二次验收通过率 <strong>96.2%</strong>。</p>
<h2>二、不合格情况</h2>
<p>初次验收不合格 <strong>51处</strong>，主要原因：修复材料不达标（23处）、修复深度不足（18处）、表面平整度超标（10处）。</p>`,
}

async function startGenerate() {
  isGenerating.value = true
  generated.value = false
  genProgress.value = 0
  currentStep.value = 0
  displayedContent.value = ''

  for (let i = 0; i < genSteps.length; i++) {
    currentStep.value = i
    await animate(genProgress, i * 25, (i + 1) * 25, 400)
    await new Promise(r => setTimeout(r, 200))
  }
  await animate(genProgress, 100, 100, 0)
  await new Promise(r => setTimeout(r, 300))

  isGenerating.value = false
  generated.value = true
  genTime.value = new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

  const content = MOCK_REPORTS[selectedType.value] || MOCK_REPORTS.annual
  await typewriter(content)
}

function animate(target: { value: number }, from: number, to: number, duration: number): Promise<void> {
  return new Promise(resolve => {
    target.value = from
    if (duration === 0) { target.value = to; resolve(); return }
    const start = performance.now()
    function step(now: number) {
      const p = Math.min((now - start) / duration, 1)
      target.value = from + (to - from) * p
      if (p < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
}

async function typewriter(html: string) {
  displayedContent.value = ''
  const chars = html.split('')
  for (let i = 0; i < chars.length; i++) {
    displayedContent.value += chars[i]
    if (i % 8 === 0) await new Promise(r => setTimeout(r, 10))
  }
}
</script>

<style scoped>
.report-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

.report-types { display: flex; gap: 5px; flex-wrap: wrap; flex: 1; }
.type-btn {
  padding: 5px 12px; border-radius: 10px; border: 1px solid var(--neu-stroke-muted);
  cursor: pointer; background: var(--bg-color); color: #8A9AAC; font-size: 12px;
  font-family: 'Noto Sans SC', sans-serif; transition: all 0.2s;
  box-shadow: var(--neu-extrude-sm);
}
.type-btn.active { background: linear-gradient(135deg, var(--genshin-blue), var(--genshin-blue-light)); color: #fff; border-color: transparent; box-shadow: var(--neu-glow-blue-strong); }

.toolbar-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.gen-time { font-size: 11px; color: #8A9AAC; }

.action-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 10px; border: none; cursor: pointer;
  background: linear-gradient(135deg, var(--genshin-blue), var(--genshin-blue-light));
  color: #fff; font-size: 12px; font-family: 'Noto Sans SC', sans-serif;
  box-shadow: var(--neu-glow-blue-strong); transition: all 0.2s;
}
.action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.action-btn:hover:not(:disabled) { box-shadow: var(--neu-glow-blue-hover-strong); transform: translateY(-1px); }
.export-btn { background: linear-gradient(135deg, #5CAD8A, #7DC4A5); box-shadow: var(--neu-glow-success-strong); }

.report-body { flex: 1; padding: 20px; min-height: 0; overflow-y: auto; overflow-x: hidden; }

/* 空态 */
.report-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; }
.empty-icon { font-size: 48px; }
.empty-title { font-size: 16px; font-weight: 600; color: var(--genshin-blue-dark); }
.empty-sub { font-size: 13px; color: #8A9AAC; }
.empty-types { display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap; justify-content: center; }
.empty-type-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 16px 20px; border-radius: 14px; cursor: pointer;
  background: var(--bg-color); font-size: 12px; color: var(--genshin-blue-dark);
  box-shadow: var(--neu-extrude-lg);
  transition: all 0.2s; min-width: 80px;
}
.empty-type-card:hover { transform: translateY(-2px); box-shadow: var(--neu-extrude-lg-up); }
.etc-icon { font-size: 24px; }

/* 生成动效 */
.report-generating { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 20px; }
.gen-spinner { position: relative; display: flex; align-items: center; justify-content: center; width: 80px; height: 80px; }
.spin-ring {
  position: absolute; width: 80px; height: 80px; border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: var(--genshin-blue);
  border-right-color: var(--genshin-gold);
  animation: spin 1.2s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.gen-label-text { font-size: 13px; color: var(--genshin-blue); font-weight: 500; }
.gen-progress-bar { width: 240px; height: 6px; background: var(--bg-groove); border-radius: 3px; overflow: hidden; box-shadow: var(--neu-inset-track); }
.gen-progress-fill { height: 100%; background: linear-gradient(90deg, var(--genshin-blue), var(--genshin-gold)); border-radius: 3px; transition: width 0.4s ease; }
.gen-steps { display: flex; gap: 20px; }
.gen-step { font-size: 11px; color: #B0BAC8; transition: all 0.3s; }
.gen-step.active { color: var(--genshin-blue); font-weight: 600; }
.gen-step.done { color: #5CAD8A; }

/* 报告文档 */
.report-document { max-width: 760px; margin: 0 auto; }
.doc-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; }
.doc-logo { font-size: 28px; color: var(--genshin-gold); }
.doc-title-block { flex: 1; }
.doc-main-title { font-family: 'Noto Serif SC', serif; font-size: 20px; font-weight: 700; color: var(--genshin-blue-dark); }
.doc-sub-title { font-size: 12px; color: #8A9AAC; margin-top: 4px; }
.doc-meta { font-size: 11px; color: #8A9AAC; text-align: right; line-height: 1.8; }
.doc-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(212,168,83,0.4), transparent); margin-bottom: 20px; }
.doc-body { font-size: 13px; color: #3A4A5C; line-height: 1.8; }
:deep(.doc-body h2) { font-family: 'Noto Serif SC', serif; font-size: 15px; font-weight: 700; color: var(--genshin-blue-dark); margin: 20px 0 10px; border-left: 3px solid var(--genshin-gold); padding-left: 10px; }
:deep(.doc-body p) { margin-bottom: 12px; }
:deep(.doc-body strong) { color: var(--genshin-blue-dark); font-weight: 600; }
</style>
