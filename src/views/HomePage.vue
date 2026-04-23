<template>
  <div class="home-page">
    <!-- 粒子背景 -->
    <canvas ref="canvasEl" class="particle-canvas"></canvas>

    <!-- 主体内容 -->
    <div class="home-content">
      <!-- 标题区 -->
      <div class="home-title-block">
        <div class="title-tag">◆ 城市道路智能监测 ◆</div>
        <h1 class="home-main-title">智能体赋能城市道路<br/>病害监测平台</h1>
        <p class="home-subtitle">AI 驱动全流程管理 · 实时监测 · 智能分析 · 高效处置</p>
      </div>

      <!-- 搜索框 -->
      <div class="search-block">
        <div class="search-wrap" :class="{ focused: isFocused }">
          <svg class="search-icon" viewBox="0 0 20 20" fill="none" width="18" height="18">
            <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6"/>
            <path d="M13.5 13.5L17 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          <input
            ref="inputEl"
            v-model="query"
            class="search-input"
            placeholder="你想了解什么？输入问题或指令..."
            @focus="isFocused = true"
            @blur="isFocused = false"
            @keydown.enter="handleSearch"
          />
          <button class="search-submit" :disabled="!query.trim()" @click="handleSearch">
            <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
              <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <!-- 示例问题 -->
        <div class="example-queries">
          <span
            v-for="ex in examples"
            :key="ex"
            class="example-chip"
            @click="query = ex; handleSearch()"
          >{{ ex }}</span>
        </div>
      </div>

      <!-- 快速功能入口 -->
      <div class="quick-entries">
        <div
          v-for="entry in entries"
          :key="entry.key"
          class="entry-card"
          :class="entry.highlight ? 'highlight' : ''"
          @click="handleEntry(entry)"
        >
          <div class="entry-icon">{{ entry.icon }}</div>
          <div class="entry-info">
            <div class="entry-label">{{ entry.label }}</div>
            <div class="entry-desc">{{ entry.desc }}</div>
          </div>
          <div v-if="entry.badge" class="entry-badge">{{ entry.badge }}</div>
        </div>
      </div>

      <!-- 底部状态 -->
      <div class="home-footer">
        <span class="status-dot-sm breathe"></span>
        <span class="footer-status">实时监测中</span>
        <span class="footer-time">{{ currentTime }}</span>
        <span class="footer-divider">|</span>
        <span class="footer-stat">今日告警 <strong>12</strong> 处</span>
        <span class="footer-divider">|</span>
        <span class="footer-stat">高危 <strong class="danger">5</strong> 处</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCanvasStore, type AgentMode, type CanvasViewType } from '../stores/canvasStore'
const router = useRouter()
const canvasStore = useCanvasStore()

const query = ref('')
const isFocused = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const currentTime = ref('')

const examples = ['今日高危告警路段有哪些？', '生成2024年度巡检报告', '查看服务单位履约画像', '分析南山路风险']

const entries = [
  { key: 'insight',    icon: '🌐', label: '全景洞察', desc: '实时地图 · 数据看板 · AI对话', mode: 'insight' as AgentMode, view: 'map' as CanvasViewType },
  { key: 'report',     icon: '📄', label: '报告生成', desc: '年度/巡检/整改报告一键生成', mode: 'insight' as AgentMode, view: 'report' as CanvasViewType },
  { key: 'compliance', icon: '🏆', label: '履约画像', desc: '服务单位红黑榜量化评估', mode: 'insight' as AgentMode, view: 'compliance' as CanvasViewType },
  { key: 'workorder',  icon: '🔧', label: '病害工单', desc: '全生命周期工单流转管理', mode: 'operations' as AgentMode, view: 'workorder' as CanvasViewType },
  { key: 'plan',       icon: '📅', label: '计划生成', desc: '年度/季度巡检计划智能排期', mode: 'operations' as AgentMode, view: 'plan' as CanvasViewType },
  { key: 'risk',       icon: '⚠️', label: '风险预测', desc: '路段塌陷概率AI预测分析', mode: 'predict' as AgentMode, view: 'risk' as CanvasViewType },
  { key: 'assess',     icon: '🔍', label: '风险评估', desc: '拍照上传多模态实时评估', mode: 'predict' as AgentMode, view: 'assess' as CanvasViewType, badge: 'AI视觉' },
  { key: 'collect',    icon: '📋', label: '数据采集', desc: 'PDF报告解析 · 知识库管理', mode: 'collect' as AgentMode, isExternal: true, highlight: true },
]

function handleSearch() {
  if (!query.value.trim()) return
  // TODO: API - POST /api/home/semantic-route  语义路由决定跳转目标
  const q = query.value.toLowerCase()
  let mode: AgentMode = 'insight'
  let view: CanvasViewType = 'map'
  if (q.includes('报告') || q.includes('生成')) { view = 'report' }
  else if (q.includes('履约') || q.includes('红黑榜')) { view = 'compliance' }
  else if (q.includes('工单')) { mode = 'operations'; view = 'workorder' }
  else if (q.includes('计划')) { mode = 'operations'; view = 'plan' }
  else if (q.includes('风险') || q.includes('预测')) { mode = 'predict'; view = 'risk' }

  canvasStore.setAgentMode(mode)
  if (view !== 'map') canvasStore.pushTab({ type: view })
  router.push({ path: '/workspace', query: { q: query.value } })
}

function handleEntry(entry: typeof entries[0]) {
  if ((entry as any).isExternal) {
    router.push('/pdf')
    return
  }
  canvasStore.setAgentMode(entry.mode)
  if (entry.view && entry.view !== 'map') canvasStore.pushTab({ type: entry.view })
  router.push('/workspace')
}

/* 粒子背景 */
let animId = 0
function initParticles() {
  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = []
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 0.5, a: Math.random() * 0.5 + 0.1,
    })
  }

  function draw() {
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy
      if (p.x < 0) p.x = canvas!.width; if (p.x > canvas!.width) p.x = 0
      if (p.y < 0) p.y = canvas!.height; if (p.y > canvas!.height) p.y = 0
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(74,141,183,${p.a})`
      ctx.fill()
    })
    // 连线
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 100) {
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(74,141,183,${0.08 * (1 - dist / 100)})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }
    animId = requestAnimationFrame(draw)
  }
  draw()
}

function updateTime() {
  currentTime.value = new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
let timer: ReturnType<typeof setInterval>
onMounted(() => {
  initParticles()
  updateTime()
  timer = setInterval(updateTime, 1000)
  setTimeout(() => inputEl.value?.focus(), 400)
})
onUnmounted(() => {
  cancelAnimationFrame(animId)
  clearInterval(timer)
})
</script>

<style scoped>
.home-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-page);
  overflow: hidden;
}

.particle-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.home-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 36px;
  max-width: 820px;
  width: 100%;
  padding: 0 24px;
}

/* 标题 */
.home-title-block { text-align: center; display: flex; flex-direction: column; gap: 12px; }
.title-tag { font-size: 12px; letter-spacing: 4px; color: var(--genshin-gold); font-weight: 500; opacity: 0.8; }
.home-main-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 36px; font-weight: 700; line-height: 1.3;
  color: var(--genshin-blue-dark); letter-spacing: 3px;
  text-shadow: 2px 4px 12px rgba(163,177,198,0.6);
}
.home-subtitle { font-size: 14px; color: #8A9AAC; letter-spacing: 2px; }

/* 搜索框 */
.search-block { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.search-wrap {
  width: 100%;
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px;
  border-radius: 18px;
  background: var(--bg-color);
  border: 2px solid transparent;
  box-shadow: var(--neu-extrude-xl);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.search-wrap.focused {
  border-color: rgba(74,141,183,0.4);
  box-shadow: var(--neu-extrude-xxl), 0 0 0 4px rgba(74,141,183,0.08);
}
.search-icon { color: #8A9AAC; flex-shrink: 0; transition: color 0.2s; }
.search-wrap.focused .search-icon { color: var(--genshin-blue); }
.search-input {
  flex: 1; border: none; background: none; outline: none;
  font-size: 16px; font-family: 'Noto Sans SC', sans-serif;
  color: var(--genshin-blue-dark);
}
.search-input::placeholder { color: #B0BAC8; }
.search-submit {
  width: 36px; height: 36px; border-radius: 12px; border: none; cursor: pointer; flex-shrink: 0;
  background: linear-gradient(135deg, var(--genshin-blue), var(--genshin-blue-light));
  color: #fff; display: flex; align-items: center; justify-content: center;
  box-shadow: var(--neu-glow-blue-strong); transition: all 0.2s;
}
.search-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.search-submit:not(:disabled):hover { box-shadow: var(--neu-glow-blue-hover-strong); transform: translateY(-1px); }

.example-queries { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.example-chip {
  padding: 5px 14px; border-radius: 20px; font-size: 12px;
  background: var(--bg-color); color: #8A9AAC; cursor: pointer;
  box-shadow: var(--neu-extrude-chip);
  transition: all 0.2s; white-space: nowrap;
}
.example-chip:hover { color: var(--genshin-blue); box-shadow: var(--neu-extrude-lg); }

/* 功能入口 */
.quick-entries {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  width: 100%;
}

.entry-card {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 14px;
  border-radius: 16px;
  cursor: pointer;
  background: var(--bg-color);
  box-shadow: var(--neu-extrude-lg);
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}
.entry-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(74,141,183,0.06), transparent);
  opacity: 0; transition: opacity 0.2s;
}
.entry-card:hover { transform: translateY(-2px); box-shadow: var(--neu-extrude-xl); }
.entry-card:hover::before { opacity: 1; }
.entry-card.highlight { border: 1px solid rgba(212,168,83,0.3); background: linear-gradient(135deg, var(--bg-color), rgba(212,168,83,0.04)); }
.entry-icon { font-size: 22px; flex-shrink: 0; }
.entry-info { flex: 1; min-width: 0; }
.entry-label { font-size: 13px; font-weight: 600; color: var(--genshin-blue-dark); margin-bottom: 2px; }
.entry-desc { font-size: 10px; color: #8A9AAC; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.entry-badge { font-size: 9px; padding: 2px 6px; border-radius: 6px; background: rgba(212,168,83,0.15); color: var(--genshin-gold-dark); font-weight: 600; white-space: nowrap; flex-shrink: 0; }

/* 底部状态 */
.home-footer {
  display: flex; align-items: center; gap: 10px;
  font-size: 12px; color: #8A9AAC;
}
.status-dot-sm { width: 6px; height: 6px; border-radius: 50%; background: var(--success); display: inline-block; box-shadow: 0 0 4px var(--success); }
.footer-status { color: var(--success); font-weight: 500; }
.footer-time { color: var(--genshin-blue); font-variant-numeric: tabular-nums; }
.footer-divider { opacity: 0.3; }
.footer-stat strong { color: var(--genshin-blue-dark); }
.footer-stat strong.danger { color: #E07070; }

@media (max-width: 720px) {
  .quick-entries { grid-template-columns: repeat(2, 1fr); }
  .home-main-title { font-size: 26px; }
}
</style>
