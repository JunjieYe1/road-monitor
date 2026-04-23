<template>
  <div class="assess-view">
    <ViewToolbar class="assess-toolbar">
      <span class="assess-title">路面风险评估</span>
      <span class="assess-sub">上传现场照片，AI 多模态分析风险值</span>
    </ViewToolbar>

    <div class="assess-body">
      <!-- 上传区 -->
      <div
        class="upload-panel neu-card u-scrollbar-hidden"
        ref="uploadPanelRef"
        :style="{ overflowY: uploadOverflowY, overflowX: uploadOverflowX }"
        @mouseenter="uploadScroll.onEnter"
        @mouseleave="uploadScroll.onLeave"
      >
        <div class="upload-title">📸 上传路面照片</div>
        <div
          class="upload-zone"
          :class="{ 'has-img': previewUrl, dragover: isDragover }"
          @dragover.prevent="isDragover = true"
          @dragleave="isDragover = false"
          @drop.prevent="onDrop"
          @click="triggerUpload"
        >
          <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />
          <div v-if="!previewUrl" class="upload-placeholder">
            <div class="upload-icon">📷</div>
            <div class="upload-hint">拖拽图片至此<br/>或点击选择文件</div>
            <div class="upload-hint-sub">支持 JPG / PNG / WEBP</div>
          </div>
          <img v-else :src="previewUrl" class="preview-img" alt="预览" />
          <div v-if="previewUrl" class="img-overlay">
            <button class="reselect-btn" @click.stop="triggerUpload">重新选择</button>
          </div>
        </div>

        <!-- 位置信息 -->
        <div class="location-row">
          <span class="loc-label">📍 位置信息</span>
          <input class="loc-input neu-inset" v-model="location" placeholder="输入或自动定位..." />
        </div>
        <div class="location-row">
          <span class="loc-label">📝 现场描述</span>
          <textarea class="desc-input neu-inset" v-model="description" placeholder="描述观察到的路面情况..." rows="2"></textarea>
        </div>

        <button class="analyze-btn" :disabled="!previewUrl || isAnalyzing" @click="startAnalysis">
          <span v-if="isAnalyzing" class="btn-loading">
            <span class="spin-sm"></span> 分析中...
          </span>
          <span v-else>🤖 开始 AI 分析</span>
        </button>
      </div>

      <!-- 分析过程 & 结果 -->
      <div
        class="result-panel u-scrollbar-hidden"
        ref="resultPanelRef"
        :style="{ overflowY: resultPanelOverflowY, overflowX: resultPanelOverflowX }"
        @mouseenter="resultPanelScroll.onEnter"
        @mouseleave="resultPanelScroll.onLeave"
      >
        <!-- 分析动效 -->
        <div v-if="isAnalyzing" class="analyzing-card neu-card">
          <div class="scan-wrap">
            <img v-if="previewUrl" :src="previewUrl" class="scan-img" alt="" />
            <div class="scan-line"></div>
            <div class="scan-overlay"></div>
          </div>
          <div class="analyze-steps">
            <div v-for="(s, i) in analyzeSteps" :key="i" class="a-step" :class="{ active: i === currentStep, done: i < currentStep }">
              <span class="a-step-icon">{{ i < currentStep ? '✅' : i === currentStep ? '⏳' : '○' }}</span>
              <span>{{ s }}</span>
            </div>
          </div>
        </div>

        <!-- 分析结果 -->
        <template v-else-if="result">
          <!-- 仪表盘 -->
          <div class="gauge-card neu-card">
            <div class="gauge-title">综合风险值</div>
            <div class="gauge-wrap">
              <svg viewBox="0 0 200 120" class="gauge-svg">
                <defs>
                  <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#5CAD8A"/>
                    <stop offset="50%" stop-color="#E0C050"/>
                    <stop offset="100%" stop-color="#E07070"/>
                  </linearGradient>
                </defs>
                <!-- 背景弧 -->
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#D4D9E2" stroke-width="12" stroke-linecap="round"/>
                <!-- 填充弧 -->
                <path :d="gaugePath" fill="none" stroke="url(#gaugeGrad)" stroke-width="12" stroke-linecap="round"/>
                <!-- 指针 -->
                <line :x1="100" :y1="100" :x2="needleX" :y2="needleY" stroke="#1A3A52" stroke-width="2.5" stroke-linecap="round"/>
                <circle cx="100" cy="100" r="6" fill="#1A3A52"/>
                <!-- 数值 -->
                <text x="100" y="92" text-anchor="middle" font-size="22" font-weight="800" :fill="riskColor">{{ result.score }}</text>
                <text x="100" y="112" text-anchor="middle" font-size="11" fill="#8A9AAC">风险评分</text>
              </svg>
              <div class="gauge-level" :class="riskCls">{{ result.level }}</div>
            </div>
          </div>

          <!-- 详细分析（条目与结论文本多，始终可滚） -->
          <div class="result-detail neu-card u-scrollbar-hidden">
            <div class="rd-section">
              <div class="rd-s-title">识别病害</div>
              <div class="defect-tags">
                <span v-for="d in result.defects" :key="d" class="defect-tag">{{ d }}</span>
              </div>
            </div>
            <div class="rd-section">
              <div class="rd-s-title">维度评分</div>
              <div v-for="dim in result.dims" :key="dim.name" class="dim-row">
                <span class="dim-n">{{ dim.name }}</span>
                <div class="dim-t"><div class="dim-f" :style="{ width: dim.val + '%', background: dimColor(dim.val) }"></div></div>
                <span class="dim-v">{{ dim.val }}</span>
              </div>
            </div>
            <div class="rd-section">
              <div class="rd-s-title">🤖 AI 分析结论</div>
              <div class="ai-conclusion">{{ result.conclusion }}</div>
            </div>
            <div class="rd-section">
              <div class="rd-s-title">处置建议</div>
              <div class="suggest-list">
                <div v-for="s in result.suggestions" :key="s" class="suggest-item">• {{ s }}</div>
              </div>
            </div>
            <button class="create-wo-btn">🔧 一键创建工单</button>
          </div>
        </template>

        <!-- 空态 -->
        <div v-else class="result-empty neu-card">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">上传路面照片后<br/>AI 将自动分析风险</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useAdaptiveVerticalScroll } from '../../../composables/useAdaptiveVerticalScroll'
import ViewToolbar from '../../common/ViewToolbar.vue'

const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref('')
const location = ref('杭州市上城区解放路 67号附近')
const description = ref('')
const isDragover = ref(false)
const isAnalyzing = ref(false)
const currentStep = ref(0)
const analyzeSteps = ['图像预处理', '病害识别', '严重度评估', '风险综合计算']

const result = ref<any>(null)

const uploadPanelRef = ref<HTMLElement | null>(null)
const resultPanelRef = ref<HTMLElement | null>(null)
const uploadScroll = useAdaptiveVerticalScroll(uploadPanelRef)
const resultPanelScroll = useAdaptiveVerticalScroll(resultPanelRef)
const uploadOverflowY = uploadScroll.overflowY
const uploadOverflowX = uploadScroll.overflowX
const resultPanelOverflowY = resultPanelScroll.overflowY
const resultPanelOverflowX = resultPanelScroll.overflowX

watch([previewUrl, isAnalyzing, result], async () => {
  await nextTick()
  await uploadScroll.remeasure()
  await resultPanelScroll.remeasure()
}, { deep: true })

function triggerUpload() { fileInput.value?.click() }
function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) loadFile(f)
}
function onDrop(e: DragEvent) {
  isDragover.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f && f.type.startsWith('image/')) loadFile(f)
}
function loadFile(f: File) {
  const reader = new FileReader()
  reader.onload = e => { previewUrl.value = e.target?.result as string }
  reader.readAsDataURL(f)
}

// TODO: API - POST /api/risk/assess  (图片 + 位置 → 多模态分析)
async function startAnalysis() {
  isAnalyzing.value = true
  result.value = null
  for (let i = 0; i < analyzeSteps.length; i++) {
    currentStep.value = i
    await new Promise(r => setTimeout(r, 700))
  }
  await new Promise(r => setTimeout(r, 400))
  isAnalyzing.value = false
  result.value = {
    score: 74,
    level: '中危',
    defects: ['纵向裂缝', '路面沉降', '局部坑槽'],
    dims: [
      { name: '裂缝程度', val: 78 },
      { name: '沉降幅度', val: 62 },
      { name: '表面损失', val: 55 },
      { name: '结构稳定', val: 70 },
    ],
    conclusion: '路面存在明显纵向裂缝（约8m），局部轻度沉降（约3cm），右侧路沿存在小型坑槽。综合评估为中危等级，短期内不影响通行，但需在30天内安排专项维修。',
    suggestions: ['优先修补右侧坑槽（建议48小时内）', '裂缝处理：使用灌缝胶封填', '监测沉降趋势，若继续加深需勘察地下管网'],
  }
}

const riskColor = computed(() => {
  if (!result.value) return '#8A9AAC'
  return result.value.score >= 80 ? '#E07070' : result.value.score >= 60 ? '#E0A050' : '#5CAD8A'
})
const riskCls = computed(() => {
  if (!result.value) return ''
  return result.value.score >= 80 ? 'risk-high' : result.value.score >= 60 ? 'risk-med' : 'risk-low'
})
function dimColor(v: number) { return v >= 75 ? '#E07070' : v >= 55 ? '#E0A050' : '#5CAD8A' }

// 仪表盘弧路径
const gaugePath = computed(() => {
  if (!result.value) return ''
  const pct = result.value.score / 100
  const startAngle = Math.PI
  const endAngle = Math.PI + pct * Math.PI
  const x1 = 100 + 80 * Math.cos(startAngle), y1 = 100 + 80 * Math.sin(startAngle)
  const x2 = 100 + 80 * Math.cos(endAngle), y2 = 100 + 80 * Math.sin(endAngle)
  const large = pct > 0.5 ? 1 : 0
  return `M ${x1} ${y1} A 80 80 0 ${large} 1 ${x2} ${y2}`
})
const needleX = computed(() => {
  if (!result.value) return 100
  const angle = Math.PI + (result.value.score / 100) * Math.PI
  return 100 + 65 * Math.cos(angle)
})
const needleY = computed(() => {
  if (!result.value) return 100
  const angle = Math.PI + (result.value.score / 100) * Math.PI
  return 100 + 65 * Math.sin(angle)
})
</script>

<style scoped>
.assess-view { display: flex; flex-direction: column; gap: 10px; height: 100%; }
.assess-title { font-family: 'Noto Serif SC', serif; font-size: 15px; font-weight: 700; color: var(--genshin-blue-dark); }
.assess-sub { font-size: 12px; color: #8A9AAC; }
.assess-body { flex: 1; display: flex; gap: 10px; min-height: 0; }

.upload-panel { width: 280px; flex-shrink: 0; padding: 16px; display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.upload-title { font-size: 13px; font-weight: 600; color: var(--genshin-blue-dark); }
.upload-zone { position: relative; border: 2px dashed rgba(163,177,198,0.5); border-radius: 14px; min-height: 160px; cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; transition: all 0.2s; background: var(--bg-groove); }
.upload-zone.dragover, .upload-zone:hover { border-color: var(--genshin-blue); background: rgba(74,141,183,0.05); }
.upload-zone.has-img { border-style: solid; border-color: rgba(74,141,183,0.3); }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; }
.upload-icon { font-size: 32px; }
.upload-hint { font-size: 12px; color: #8A9AAC; text-align: center; line-height: 1.6; }
.upload-hint-sub { font-size: 10px; color: #B0BAC8; }
.preview-img { width: 100%; height: 100%; object-fit: cover; }
.img-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: flex-end; justify-content: center; padding-bottom: 12px; opacity: 0; transition: opacity 0.2s; }
.upload-zone:hover .img-overlay { opacity: 1; }
.reselect-btn { padding: 4px 12px; border-radius: 8px; border: none; background: rgba(255,255,255,0.9); font-size: 12px; cursor: pointer; color: #1A3A52; }

.location-row { display: flex; flex-direction: column; gap: 5px; }
.loc-label { font-size: 11px; color: #8A9AAC; }
.loc-input, .desc-input { padding: 6px 10px; border-radius: 8px; border: none; font-size: 12px; font-family: 'Noto Sans SC', sans-serif; color: var(--genshin-blue-dark); resize: none; outline: none; }
.analyze-btn { padding: 10px; border-radius: 12px; border: none; cursor: pointer; font-size: 13px; font-family: 'Noto Sans SC', sans-serif; background: linear-gradient(135deg, var(--genshin-blue), var(--genshin-blue-light)); color: #fff; box-shadow: var(--neu-glow-analyze); transition: all 0.2s; }
.analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-loading { display: flex; align-items: center; justify-content: center; gap: 8px; }
.spin-sm { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.result-panel { flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 0; }

.analyzing-card { padding: 20px; display: flex; flex-direction: column; gap: 16px; align-items: center; }
.scan-wrap { position: relative; width: 200px; height: 150px; border-radius: 10px; overflow: hidden; }
.scan-img { width: 100%; height: 100%; object-fit: cover; }
.scan-line { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--genshin-blue), transparent); animation: scan-move 1.5s linear infinite; }
@keyframes scan-move { 0% { top: 0; } 100% { top: 100%; } }
.scan-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, rgba(74,141,183,0.15) 100%); }
.analyze-steps { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.a-step { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #B0BAC8; transition: all 0.3s; }
.a-step.active { color: var(--genshin-blue); font-weight: 600; }
.a-step.done { color: #5CAD8A; }
.a-step-icon { font-size: 14px; }

.gauge-card { padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
.gauge-title { font-size: 13px; font-weight: 600; color: var(--genshin-blue-dark); }
.gauge-wrap { display: flex; flex-direction: column; align-items: center; }
.gauge-svg { width: 180px; height: 110px; }
.gauge-level { font-size: 13px; font-weight: 700; margin-top: -4px; }
.gauge-level.risk-high { color: #E07070; } .gauge-level.risk-med { color: #E0A050; } .gauge-level.risk-low { color: #5CAD8A; }

.result-detail { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow-y: auto; overflow-x: hidden; }
.rd-section {}
.rd-s-title { font-size: 12px; font-weight: 600; color: var(--genshin-blue-dark); margin-bottom: 8px; }
.defect-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.defect-tag { font-size: 11px; padding: 3px 10px; border-radius: 8px; background: rgba(224,112,112,0.1); color: #E07070; border: 1px solid rgba(224,112,112,0.25); }
.dim-row { display: flex; align-items: center; gap: 8px; font-size: 11px; margin-bottom: 5px; }
.dim-n { min-width: 60px; color: #5A6A7C; }
.dim-t { flex: 1; height: 6px; background: var(--bg-groove); border-radius: 3px; overflow: hidden; }
.dim-f { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
.dim-v { min-width: 24px; text-align: right; color: #8A9AAC; font-size: 10px; }
.ai-conclusion { font-size: 12px; color: #5A6A7C; line-height: 1.7; padding: 10px; background: rgba(74,141,183,0.06); border-radius: 8px; border-left: 3px solid var(--genshin-blue); }
.suggest-list { display: flex; flex-direction: column; gap: 5px; }
.suggest-item { font-size: 12px; color: #5A6A7C; line-height: 1.5; }
.create-wo-btn { padding: 9px; border-radius: 10px; border: none; cursor: pointer; font-size: 12px; font-family: 'Noto Sans SC', sans-serif; background: linear-gradient(135deg, #E07070, #EAA0A0); color: #fff; width: 100%; box-shadow: var(--neu-glow-danger); }

.result-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.empty-icon { font-size: 40px; }
.empty-text { font-size: 13px; color: #8A9AAC; text-align: center; line-height: 1.8; }
</style>
