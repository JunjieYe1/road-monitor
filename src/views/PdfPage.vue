<template>
  <div class="pdf-page">
    <header class="pdf-header neu-card">
      <button class="back-btn" @click="$router.push('/workspace')">
        <svg viewBox="0 0 20 20" fill="none" width="14" height="14"><path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        返回工作台
      </button>
      <div class="header-title">
        <span class="deco">◆</span>
        <span class="genshin-title">PDF 检测报告智能提取 · 知识库管理</span>
        <span class="deco">◆</span>
      </div>
      <span class="header-time">{{ currentTime }}</span>
    </header>

    <div
      class="pdf-body u-scrollbar-hidden"
      ref="pdfBodyRef"
      :style="{ overflowY, overflowX }"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
    >
      <!-- 知识库列表 -->
      <section class="neu-card pdf-section">
        <div class="sec-title">知识库列表 <span class="kb-pick-hint">（可多选，检索范围将随提问提交）</span></div>
        <div class="kb-list">
          <div v-for="kb in kbList" :key="kb.id" class="kb-card" :class="{ active: chatStore.isKbSelected(kb.id) }">
            <div class="kb-year">{{ kb.range }}</div>
            <div class="kb-meta">
              <span>📄 {{ kb.reports }} 份报告</span>
              <span>🗂️ {{ kb.records }} 条记录</span>
              <span>💡 {{ kb.knowledge }} 知识点</span>
            </div>
            <div class="kb-badge" :class="chatStore.isKbSelected(kb.id) ? 'kb-on' : 'kb-off'">
              {{ chatStore.isKbSelected(kb.id) ? '● 已选入对话' : '○ 未选' }}
            </div>
            <div class="kb-btns">
              <button class="kb-btn activate" @click="toggleKbPick(kb)">
                {{ chatStore.isKbSelected(kb.id) ? '取消选择' : '选择' }}
              </button>
              <button class="kb-btn del" @click="deleteKb(kb)">删除</button>
            </div>
          </div>
          <div class="kb-card add-kb" @click="showUpload = !showUpload">
            <span class="add-plus">＋</span>
            <span class="add-text">新增知识库</span>
          </div>
        </div>
      </section>

      <!-- 上传区 -->
      <transition name="slide-down">
        <section v-if="showUpload" class="neu-card pdf-section">
          <div class="sec-title">上传新报告</div>

          <div class="time-row">
            <span class="field-req">数据归属时间范围 *</span>
            <select v-model="selYear" class="neu-inset range-sel">
              <option v-for="y in years" :key="y" :value="y">{{ y }} 年</option>
            </select>
            <select v-model="selQ" class="neu-inset range-sel">
              <option value="full">全年</option>
              <option value="Q1">Q1（1-3月）</option>
              <option value="Q2">Q2（4-6月）</option>
              <option value="Q3">Q3（7-9月）</option>
              <option value="Q4">Q4（10-12月）</option>
            </select>
            <span class="req-hint">* 必填，用于知识库分类</span>
          </div>

          <div
            class="drop-zone"
            :class="{ dragover: isDrag }"
            @dragover.prevent="isDrag = true"
            @dragleave="isDrag = false"
            @drop.prevent="onDrop"
            @click="fileEl?.click()"
          >
            <input ref="fileEl" type="file" accept=".pdf" multiple style="display:none" @change="onFile" />
            <div class="dz-icon">📄</div>
            <div class="dz-text">拖拽 PDF 至此，或点击选择</div>
            <div class="dz-sub">支持批量上传 · 仅限 PDF</div>
          </div>

          <div v-if="files.length" class="file-list">
            <div v-for="(f, i) in files" :key="i" class="file-row neu-card-sm">
              <span class="fi-icon">📄</span>
              <span class="fi-name">{{ f.name }}</span>
              <span class="fi-size">{{ fmtSize(f.size) }}</span>
              <button class="fi-del" @click="files.splice(i,1)">✕</button>
            </div>
          </div>

          <button class="submit-btn" :disabled="!files.length || !selYear || isProcesing" @click="startProcess">
            {{ isProcesing ? '处理中...' : '开始解析处理' }}
          </button>
        </section>
      </transition>

      <!-- 处理进度 -->
      <transition name="slide-down">
        <section v-if="showProgress" class="neu-card pdf-section">
          <div class="sec-title">解析处理进度</div>

          <!-- 四步流程 -->
          <div class="flow-wrap">
            <div v-for="(step, i) in steps" :key="i" class="flow-item">
              <div class="flow-node" :class="nodeClass(i)">
                <div class="flow-circle">
                  <span v-if="i < doneSteps">✓</span>
                  <span v-else-if="i === doneSteps && isProcesing" class="spin-dot"></span>
                  <span v-else>{{ i + 1 }}</span>
                </div>
                <div class="flow-info">
                  <div class="flow-title">{{ step.title }}</div>
                  <div class="flow-desc">{{ step.desc }}</div>
                </div>
              </div>
              <div v-if="i < steps.length - 1" class="flow-arrow" :class="{ lit: i < doneSteps }">
                <svg viewBox="0 0 40 12" width="40" height="12">
                  <path d="M0 6h32M28 2l6 4-6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="prog-row">
            <span class="prog-label">总进度</span>
            <div class="prog-track"><div class="prog-fill" :style="{ width: progress + '%' }"></div></div>
            <span class="prog-pct">{{ Math.round(progress) }}%</span>
          </div>

          <transition name="done-pop">
            <div v-if="isDone" class="done-box">
              <span class="done-emoji">✅</span>
              <div class="done-info">
                <div class="done-title">知识库「{{ rangeLabel }}」已准备就绪！</div>
                <div class="done-sub">提取病害记录 <strong>247</strong> 条 · 知识点 <strong>89</strong> 条</div>
              </div>
              <button class="start-btn" @click="goAsk">立即开始提问 →</button>
            </div>
          </transition>
        </section>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useAdaptiveVerticalScroll } from '../composables/useAdaptiveVerticalScroll'
import { useRouter } from 'vue-router'
import { useChatStore } from '../stores/chatStore'

const router = useRouter()
const chatStore = useChatStore()

const pdfBodyRef = ref<HTMLElement | null>(null)
const { overflowY, overflowX, onEnter, onLeave, remeasure } = useAdaptiveVerticalScroll(pdfBodyRef)

const currentTime = ref('')
let _t: ReturnType<typeof setInterval>
onMounted(() => { tick(); _t = setInterval(tick, 1000) })
onUnmounted(() => clearInterval(_t))
function tick() {
  currentTime.value = new Date().toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' })
}

// TODO: API - GET /api/kb/list
const kbList = ref([
  { id: 1, range: '2024年度', reports: 47, records: 247, knowledge: 89 },
  { id: 2, range: '2023年度', reports: 38, records: 198, knowledge: 72 },
  { id: 3, range: '2022年度', reports: 29, records: 156, knowledge: 58 },
])
function toggleKbPick(kb: (typeof kbList.value)[0]) {
  chatStore.toggleKb({ id: String(kb.id), label: kb.range })
}
function deleteKb(kb: (typeof kbList.value)[0]) {
  chatStore.removeKb(String(kb.id))
  kbList.value = kbList.value.filter(k => k.id !== kb.id)
}

const showUpload = ref(false)
const selYear = ref('2024')
const selQ    = ref('full')
const years   = ['2025','2024','2023','2022','2021']
const isDrag  = ref(false)
const fileEl  = ref<HTMLInputElement | null>(null)
const files   = ref<File[]>([])

function onFile(e: Event) {
  const f = Array.from((e.target as HTMLInputElement).files || [])
  files.value.push(...f.filter(x => x.type === 'application/pdf' || x.name.endsWith('.pdf')))
}
function onDrop(e: DragEvent) {
  isDrag.value = false
  const f = Array.from(e.dataTransfer?.files || [])
  files.value.push(...f.filter(x => x.name.endsWith('.pdf')))
}
function fmtSize(b: number) { return b > 1048576 ? (b/1048576).toFixed(1)+' MB' : (b/1024).toFixed(0)+' KB' }

const steps = [
  { title: '上传解析',    desc: '文件格式验证与内容解析' },
  { title: '病害卡片提取', desc: '识别病害信息结构化存储' },
  { title: '知识库抽取',  desc: '提取检测原理与技术方法' },
  { title: '结构化入库',  desc: '数据写入数据库与知识库' },
]
const showProgress = ref(false)
const isProcesing  = ref(false)
const doneSteps    = ref(0)
const progress     = ref(0)
const isDone       = ref(false)
const rangeLabel   = computed(() => `${selYear.value}年${selQ.value === 'full' ? '全年' : selQ.value}`)

function nodeClass(i: number) {
  return i < doneSteps.value ? 'done' : i === doneSteps.value && isProcesing.value ? 'active' : ''
}

// TODO: API - POST /api/pdf/upload  { files, timeRange }
async function startProcess() {
  showProgress.value = true
  isProcesing.value  = true
  isDone.value       = false
  doneSteps.value    = 0
  progress.value     = 0

  for (let i = 0; i < steps.length; i++) {
    doneSteps.value = i
    await animProg(i * 25, (i + 1) * 25 - 2, 900)
    await delay(200)
  }
  doneSteps.value = steps.length
  await animProg(98, 100, 200)
  isProcesing.value = false
  isDone.value      = true

  const range = rangeLabel.value
  if (!kbList.value.find(k => k.range.startsWith(selYear.value))) {
    kbList.value.unshift({
      id: Date.now(),
      range: range + (selQ.value === 'full' ? '度' : ''),
      reports: files.value.length,
      records: 247,
      knowledge: 89,
    })
  }
}

function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }
function animProg(from: number, to: number, dur: number) {
  return new Promise<void>(resolve => {
    const t0 = performance.now()
    function step(now: number) {
      const p = Math.min((now - t0) / dur, 1)
      progress.value = from + (to - from) * p
      p < 1 ? requestAnimationFrame(step) : resolve()
    }
    requestAnimationFrame(step)
  })
}

function goAsk() {
  chatStore.addKb({ id: `upload-${Date.now()}`, label: rangeLabel.value })
  router.push('/workspace')
}

watch(
  [kbList, showUpload, showProgress, files, isDone, isProcesing, doneSteps],
  async () => {
    await nextTick()
    await remeasure()
  },
  { deep: true }
)
</script>

<style scoped>
.pdf-page { display:flex; flex-direction:column; height:100vh; width:100vw; background:var(--bg-page); padding:12px; gap:12px; overflow:hidden; }

.pdf-header { display:flex; align-items:center; padding:10px 20px; gap:16px; flex-shrink:0; }
.back-btn { display:flex; align-items:center; gap:6px; padding:6px 14px; border-radius:10px; border:1px solid var(--neu-stroke-muted); cursor:pointer; background:var(--bg-color); color:var(--genshin-blue); font-size:12px; font-family:'Noto Sans SC',sans-serif; box-shadow:var(--neu-extrude-sm); transition:all 0.2s; }
.header-title { flex:1; text-align:center; font-size:16px; letter-spacing:3px; color:#1a1a2e; display:flex; align-items:center; justify-content:center; gap:10px; }
.deco { color:var(--genshin-gold); font-size:12px; opacity:0.8; }
.header-time { font-size:12px; color:var(--genshin-blue); font-variant-numeric:tabular-nums; flex-shrink:0; }

.pdf-body { flex:1; min-height:0; display:flex; flex-direction:column; gap:14px; padding:2px; }

.pdf-section { padding:20px 24px; }
.sec-title { font-family:'Noto Serif SC',serif; font-size:16px; font-weight:700; color:var(--genshin-blue-dark); margin-bottom:16px; border-left:3px solid var(--genshin-gold); padding-left:10px; }
.kb-pick-hint { font-size:11px; font-weight:500; color:#8A9AAC; margin-left:6px; }

/* 知识库卡片 */
.kb-list { display:flex; gap:12px; flex-wrap:wrap; }
.kb-card { padding:16px 20px; border-radius:16px; background:var(--bg-color); box-shadow:var(--neu-extrude-lg); transition:all 0.2s; min-width:160px; display:flex; flex-direction:column; gap:8px; }
.kb-card:hover { transform:translateY(-2px); }
.kb-card.active { box-shadow:var(--neu-extrude-lg),0 0 0 2px rgba(212,168,83,0.45); }
.kb-year { font-family:'Noto Serif SC',serif; font-size:16px; font-weight:700; color:var(--genshin-blue-dark); }
.kb-meta { display:flex; flex-direction:column; gap:3px; font-size:11px; color:#8A9AAC; }
.kb-badge { font-size:11px; font-weight:500; }
.kb-on { color:#5CAD8A; } .kb-off { color:#B0BAC8; }
.kb-btns { display:flex; gap:6px; }
.kb-btn { padding:3px 10px; border-radius:8px; border:none; cursor:pointer; font-size:11px; font-family:'Noto Sans SC',sans-serif; transition:all 0.2s; }
.kb-btn.activate { background:rgba(74,141,183,0.1); color:var(--genshin-blue); }
.kb-btn.del { background:rgba(224,112,112,0.1); color:#E07070; }
.add-kb { border:2px dashed var(--neu-stroke-muted-strong); background:transparent!important; align-items:center; justify-content:center; min-height:120px; box-shadow:none!important; cursor:pointer; }
.add-kb:hover { border-color:var(--genshin-blue); }
.add-plus { font-size:24px; color:#B0BAC8; } .add-text { font-size:12px; color:#B0BAC8; }

/* 上传区 */
.time-row { display:flex; align-items:center; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
.field-req { font-size:13px; font-weight:600; color:var(--genshin-blue-dark); }
.range-sel { padding:6px 10px; border-radius:8px; border:none; font-size:12px; font-family:'Noto Sans SC',sans-serif; color:var(--genshin-blue-dark); cursor:pointer; outline:none; }
.req-hint { font-size:11px; color:#E07070; }
.drop-zone { border:2px dashed var(--neu-stroke-heavy); border-radius:16px; padding:36px; text-align:center; cursor:pointer; transition:all 0.2s; background:var(--bg-groove); display:flex; flex-direction:column; align-items:center; gap:8px; }
.drop-zone.dragover,.drop-zone:hover { border-color:var(--genshin-blue); background:rgba(74,141,183,0.04); }
.dz-icon { font-size:36px; } .dz-text { font-size:14px; font-weight:500; color:var(--genshin-blue-dark); } .dz-sub { font-size:12px; color:#8A9AAC; }
.file-list { display:flex; flex-direction:column; gap:6px; margin-top:10px; }
.file-row { display:flex; align-items:center; gap:10px; padding:8px 12px; }
.fi-icon { font-size:16px; } .fi-name { flex:1; font-size:13px; color:var(--genshin-blue-dark); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .fi-size { font-size:11px; color:#8A9AAC; } .fi-del { background:none; border:none; cursor:pointer; color:#B0BAC8; font-size:12px; }
.submit-btn { margin-top:14px; padding:11px 32px; border-radius:12px; border:none; cursor:pointer; font-size:14px; font-family:'Noto Sans SC',sans-serif; background:linear-gradient(135deg,var(--genshin-blue),var(--genshin-blue-light)); color:#fff; box-shadow:var(--neu-glow-blue-lift); transition:all 0.2s; }
.submit-btn:disabled { opacity:0.5; cursor:not-allowed; }

/* 流程图 */
.flow-wrap { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:0; margin-bottom:24px; }
.flow-item { display:flex; align-items:center; }
.flow-node { display:flex; flex-direction:column; align-items:center; gap:10px; padding:16px 14px; border-radius:14px; min-width:120px; transition:all 0.3s; }
.flow-node.active { background:rgba(74,141,183,0.07); box-shadow:var(--neu-extrude-lg); }
.flow-node.done { background:rgba(92,173,138,0.05); }
.flow-circle { width:42px; height:42px; border-radius:50%; border:2px solid var(--neu-stroke-muted-strong); display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:700; color:#B0BAC8; background:var(--bg-color); box-shadow:var(--neu-extrude-md); transition:all 0.35s; }
.flow-node.done .flow-circle { border-color:#5CAD8A; color:#5CAD8A; box-shadow:0 0 10px rgba(92,173,138,0.3), var(--neu-extrude-md); }
.flow-node.active .flow-circle { border-color:var(--genshin-blue); box-shadow:0 0 12px rgba(74,141,183,0.35), var(--neu-extrude-md); }
.spin-dot { width:16px; height:16px; border-radius:50%; border:2px solid rgba(74,141,183,0.3); border-top-color:var(--genshin-blue); animation:spin 0.8s linear infinite; display:inline-block; }
@keyframes spin { to { transform:rotate(360deg); } }
.flow-info { text-align:center; } .flow-title { font-size:12px; font-weight:600; color:var(--genshin-blue-dark); margin-bottom:3px; } .flow-desc { font-size:10px; color:#8A9AAC; line-height:1.4; }
.flow-arrow { color:#B0BAC8; padding:0 4px; transition:color 0.3s; } .flow-arrow.lit { color:#5CAD8A; }

.prog-row { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
.prog-label { font-size:12px; color:#8A9AAC; white-space:nowrap; }
.prog-track { flex:1; height:8px; background:var(--bg-groove); border-radius:4px; overflow:hidden; box-shadow:var(--neu-inset-track-lg); }
.prog-fill { height:100%; background:linear-gradient(90deg,var(--genshin-blue),var(--genshin-gold)); border-radius:4px; transition:width 0.3s ease; }
.prog-pct { font-size:12px; font-weight:600; color:var(--genshin-blue); white-space:nowrap; min-width:32px; }

.done-box { display:flex; align-items:center; gap:16px; padding:16px 20px; border-radius:14px; background:rgba(92,173,138,0.06); border:1px solid rgba(92,173,138,0.25); flex-wrap:wrap; }
.done-emoji { font-size:28px; }
.done-info { flex:1; } .done-title { font-size:15px; font-weight:700; color:var(--genshin-blue-dark); margin-bottom:4px; } .done-sub { font-size:12px; color:#8A9AAC; } .done-sub strong { color:var(--genshin-blue-dark); font-weight:700; }
.start-btn { padding:10px 22px; border-radius:12px; border:none; cursor:pointer; font-size:13px; font-family:'Noto Sans SC',sans-serif; background:linear-gradient(135deg,#5CAD8A,#7DC4A5); color:#fff; box-shadow:var(--neu-glow-success-hover); white-space:nowrap; }

.slide-down-enter-active,.slide-down-leave-active { transition:all 0.3s cubic-bezier(0.4,0,0.2,1); }
.slide-down-enter-from,.slide-down-leave-to { opacity:0; transform:translateY(-10px); }
.done-pop-enter-active { animation:pop 0.45s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes pop { from { transform:scale(0.88); opacity:0; } to { transform:scale(1); opacity:1; } }
</style>
