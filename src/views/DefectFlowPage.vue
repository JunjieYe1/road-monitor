<template>
  <div class="defect-page">
    <header class="defect-header neu-card">
      <button class="back-btn" @click="$router.back()">
        <svg viewBox="0 0 20 20" fill="none" width="14" height="14"><path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        返回
      </button>
      <div class="header-center">
        <span class="deco">◆</span>
        <span class="genshin-title">病害处理流程</span>
        <span class="deco">◆</span>
      </div>
      <div class="header-right">
        <span class="wo-id">工单 #{{ defect.woId }}</span>
        <span class="status-badge" :class="currentStage.key">{{ currentStage.label }}</span>
      </div>
    </header>

    <div
      class="defect-body u-scrollbar-hidden"
      ref="defectBodyRef"
      :style="{ overflowY, overflowX }"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
    >
      <!-- 基本信息卡 -->
      <div class="neu-card info-card">
        <div class="info-left">
          <SeverityBadge :level="defect.severity" />
          <span class="defect-type">{{ defect.type }}</span>
          <span class="defect-addr">📍 {{ defect.address }}</span>
        </div>
        <div class="info-desc">{{ defect.description }}</div>
        <div class="info-right">
          <div class="info-meta">负责单位：{{ defect.unit }}</div>
          <div class="info-meta">发现时间：{{ defect.foundTime }}</div>
          <div class="info-meta">所属区域：{{ defect.district }}</div>
        </div>
      </div>

      <!-- 流程时间轴 -->
      <div class="neu-card flow-card">
        <div class="flow-title">处理流程时间轴</div>
        <div class="stages-row u-scrollbar-hidden">
          <div
            v-for="(stage, i) in stages"
            :key="stage.key"
            class="stage-wrap"
            @click="selStage = i"
          >
            <div class="stage-node" :class="stageNodeClass(i)">
              <div class="stage-circle">
                <span v-if="i < activeStageIdx">✓</span>
                <span v-else-if="i === activeStageIdx" class="pulse-ring"></span>
                <span v-else>{{ i + 1 }}</span>
              </div>
              <div class="stage-label">{{ stage.label }}</div>
              <div class="stage-sub">{{ stageSubLabel(i) }}</div>
            </div>
            <div v-if="i < stages.length - 1" class="stage-line" :class="{ done: i < activeStageIdx }"></div>
          </div>
        </div>

        <!-- 阶段详情 -->
        <transition name="stage-detail" mode="out-in">
          <div :key="selStage" class="stage-detail">
            <template v-if="stages[selStage].data">
              <div class="detail-row">
                <span class="dr-label">操作时间</span>
                <span class="dr-val">{{ stages[selStage].data!.time }}</span>
              </div>
              <div class="detail-row">
                <span class="dr-label">操作人员</span>
                <span class="dr-val">{{ stages[selStage].data!.operator }}</span>
              </div>
              <div class="detail-row">
                <span class="dr-label">操作内容</span>
                <span class="dr-val">{{ stages[selStage].data!.action }}</span>
              </div>
              <div v-if="stages[selStage].data!.note" class="detail-note">
                💬 {{ stages[selStage].data!.note }}
              </div>
            </template>
            <div v-else class="detail-pending">
              <span class="pending-icon">⏳</span>
              <span>此阶段尚未开始，等待前序阶段完成</span>
            </div>
          </div>
        </transition>

        <!-- 阶段操作按钮 -->
        <div v-if="selStage === activeStageIdx && selStage < stages.length - 1" class="stage-actions">
          <button class="advance-btn" @click="advanceStage">
            推进至「{{ stages[selStage + 1]?.label }}」→
          </button>
        </div>
      </div>

      <!-- 后续检查记录 -->
      <div class="neu-card followup-card">
        <div class="fu-header">
          <div class="fu-title">后续检查记录</div>
          <button
            class="fu-add-btn"
            :class="{ disabled: activeStageIdx < stages.length - 1 }"
            :disabled="activeStageIdx < stages.length - 1"
            @click="showFollowupModal = true"
          >
            <span>＋</span> 发起后续检查
          </button>
        </div>

        <div v-if="activeStageIdx < stages.length - 1" class="fu-locked">
          🔒 验收完成后方可发起后续检查
        </div>

        <div v-else-if="followups.length === 0" class="fu-empty">
          暂无后续检查记录，点击右上角发起第一次检查
        </div>

        <div v-else class="fu-list">
          <div v-for="(fu, i) in followups" :key="i" class="fu-item neu-card-sm">
            <div class="fu-num">第 {{ i + 1 }} 次</div>
            <div class="fu-body">
              <div class="fu-date">{{ fu.date }}</div>
              <div class="fu-inspector">检查人：{{ fu.inspector }}</div>
              <div class="fu-result" :class="fu.ok ? 'ok' : 'warn'">
                {{ fu.ok ? '✓ 路面稳定' : '⚠ 发现异常' }}：{{ fu.conclusion }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 发起后续检查弹窗 -->
    <transition name="modal-fade">
      <div v-if="showFollowupModal" class="modal-overlay" @click.self="showFollowupModal = false">
        <div class="modal-box neu-card">
          <div class="modal-title">发起后续检查</div>
          <div class="modal-field">
            <label>检查日期</label>
            <input v-model="newFu.date" type="date" class="neu-inset modal-input" />
          </div>
          <div class="modal-field">
            <label>检查人员</label>
            <input v-model="newFu.inspector" placeholder="输入检查人姓名" class="neu-inset modal-input" />
          </div>
          <div class="modal-field">
            <label>检查结论</label>
            <textarea v-model="newFu.conclusion" placeholder="描述检查结果..." class="neu-inset modal-textarea" rows="3"></textarea>
          </div>
          <div class="modal-field modal-radio-row">
            <label>状态</label>
            <label class="radio-item">
              <input v-model="newFu.ok" type="radio" :value="true" /> 路面稳定
            </label>
            <label class="radio-item">
              <input v-model="newFu.ok" type="radio" :value="false" /> 发现异常
            </label>
          </div>
          <div class="modal-btns">
            <button class="modal-cancel" @click="showFollowupModal = false">取消</button>
            <button class="modal-submit" @click="submitFollowup">提交</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useAdaptiveVerticalScroll } from '../composables/useAdaptiveVerticalScroll'
import { useRoute } from 'vue-router'
import { useAlertStore } from '../stores/alertStore'
import SeverityBadge from '../components/common/SeverityBadge.vue'

const route = useRoute()
const alertStore = useAlertStore()
const id = Number(route.params.id)

const defectBodyRef = ref<HTMLElement | null>(null)
const { overflowY, overflowX, onEnter, onLeave, remeasure } = useAdaptiveVerticalScroll(defectBodyRef)

// TODO: API - GET /api/defect/:id
const alert = alertStore.alerts.find(a => a.id === id) || alertStore.alerts[0]
const defect = ref({
  woId:        `2024-${String(id).padStart(4, '0')}`,
  type:        alert.type,
  severity:    alert.severity,
  address:     alert.address,
  district:    alert.district,
  description: alert.description || '路面出现病害，需要处理。',
  unit:        '杭州市政养护有限公司',
  foundTime:   `2024-03-${String(id + 10).padStart(2,'0')} 09:23`,
})

const stages = ref([
  { key: 'found',    label: '发现',    data: { time: defect.value.foundTime, operator: '巡检员 王某', action: '日常巡检发现路面病害，GPS定位上报', note: '现场照片已上传，坐标已记录' } },
  { key: 'pending',  label: '待处理',  data: { time: `2024-03-${String(id + 10).padStart(2,'0')} 11:00`, operator: '调度员 李某', action: `已派单至${defect.value.unit}`, note: '要求 5 个工作日内完成处理' } },
  { key: 'process',  label: '处理中',  data: alert.status === 'pending' ? null : { time: `2024-03-${String(id + 11).padStart(2,'0')} 08:30`, operator: '张工长', action: '已到场勘查，材料调配中，预计明日完工', note: null } },
  { key: 'done',     label: '处理完成', data: alert.status === 'completed' ? { time: `2024-03-${String(id + 12).padStart(2,'0')} 16:00`, operator: '张工长', action: '路面修复完成，已拍照存档', note: '修复材料：SBS改性沥青' } : null },
  { key: 'accepted', label: '验收完成', data: alert.status === 'completed' ? { time: `2024-03-${String(id + 14).padStart(2,'0')} 10:00`, operator: '验收员 赵某', action: '现场验收合格，工单归档', note: '平整度检测达标' } : null },
])

const activeStageIdx = computed(() => {
  if (alert.status === 'completed') return 4
  if (alert.status === 'processing') return 2
  return 1
})

const currentStage = computed(() => stages.value[activeStageIdx.value] || stages.value[1])

const selStage = ref(activeStageIdx.value)

function stageNodeClass(i: number) {
  if (i < activeStageIdx.value) return 'done'
  if (i === activeStageIdx.value) return 'active'
  return 'pending'
}
function stageSubLabel(i: number) {
  if (i < activeStageIdx.value) return '✅ 已完成'
  if (i === activeStageIdx.value) return '🔄 进行中'
  return '⏳ 待操作'
}

// TODO: API - POST /api/defect/:id/status
function advanceStage() {
  if (activeStageIdx.value < stages.value.length - 1) {
    stages.value[activeStageIdx.value + 1].data = {
      time: new Date().toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }),
      operator: '当前用户',
      action: `已推进至${stages.value[activeStageIdx.value + 1].label}阶段`,
      note: null,
    }
    alert.status = activeStageIdx.value + 1 >= 4 ? 'completed' : 'processing'
    selStage.value = activeStageIdx.value
  }
}

// 后续检查
const followups = ref<{ date: string; inspector: string; conclusion: string; ok: boolean }[]>(
  alert.status === 'completed' ? [
    { date: '2024-06-10', inspector: '王某', conclusion: '路面状态良好，无新增病害', ok: true },
    { date: '2024-09-15', inspector: '李某', conclusion: '未见异常，养护工作到位',   ok: true },
  ] : []
)
const showFollowupModal = ref(false)
const newFu = ref({ date: '', inspector: '', conclusion: '', ok: true })

// TODO: API - POST /api/defect/:id/followup
function submitFollowup() {
  if (!newFu.value.date || !newFu.value.inspector || !newFu.value.conclusion) return
  followups.value.push({ ...newFu.value })
  newFu.value = { date: '', inspector: '', conclusion: '', ok: true }
  showFollowupModal.value = false
}

watch(
  [stages, followups, selStage],
  async () => {
    await nextTick()
    await remeasure()
  },
  { deep: true }
)
</script>

<style scoped>
.defect-page { display:flex; flex-direction:column; height:100vh; width:100vw; background:var(--bg-page); padding:12px; gap:12px; overflow:hidden; }

.defect-header { display:flex; align-items:center; padding:10px 20px; gap:16px; flex-shrink:0; }
.back-btn { display:flex; align-items:center; gap:6px; padding:6px 14px; border-radius:10px; border:1px solid var(--neu-stroke-muted); cursor:pointer; background:var(--bg-color); color:var(--genshin-blue); font-size:12px; font-family:'Noto Sans SC',sans-serif; box-shadow:var(--neu-extrude-sm); }
.header-center { flex:1; text-align:center; font-size:16px; letter-spacing:3px; color:#1a1a2e; display:flex; align-items:center; justify-content:center; gap:10px; }
.deco { color:var(--genshin-gold); font-size:12px; opacity:0.8; }
.header-right { display:flex; align-items:center; gap:10px; flex-shrink:0; }
.wo-id { font-size:12px; color:#8A9AAC; }
.status-badge { padding:4px 12px; border-radius:10px; font-size:12px; font-weight:600; }
.status-badge.found,.status-badge.pending { background:rgba(224,112,112,0.1); color:#E07070; }
.status-badge.process { background:rgba(224,160,80,0.1); color:#E0A050; }
.status-badge.done,.status-badge.accepted { background:rgba(92,173,138,0.1); color:#5CAD8A; }

.defect-body { flex:1; min-height:0; display:flex; flex-direction:column; gap:14px; padding:2px; }

/* 信息卡 */
.info-card { padding:18px 24px; display:flex; align-items:flex-start; gap:20px; flex-wrap:wrap; }
.info-left { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.defect-type { font-family:'Noto Serif SC',serif; font-size:18px; font-weight:700; color:var(--genshin-blue-dark); }
.defect-addr { font-size:13px; color:#5A6A7C; }
.info-desc { flex:1; min-width:200px; font-size:13px; color:#6B7A8C; line-height:1.6; padding:10px 14px; background:rgba(163,177,198,0.1); border-radius:10px; }
.info-right { display:flex; flex-direction:column; gap:5px; }
.info-meta { font-size:12px; color:#8A9AAC; }

/* 流程卡 */
.flow-card { padding:20px 24px; }
.flow-title { font-family:'Noto Serif SC',serif; font-size:16px; font-weight:700; color:var(--genshin-blue-dark); margin-bottom:20px; border-left:3px solid var(--genshin-gold); padding-left:10px; }
.stages-row { display:flex; align-items:flex-start; justify-content:center; overflow-x:auto; gap:0; padding-bottom:8px; }
.stage-wrap { display:flex; align-items:center; }
.stage-node { display:flex; flex-direction:column; align-items:center; gap:8px; padding:12px 16px; border-radius:12px; cursor:pointer; transition:all 0.25s; min-width:100px; }
.stage-node:hover { background:rgba(74,141,183,0.05); }
.stage-circle { width:44px; height:44px; border-radius:50%; border:2px solid var(--neu-stroke-muted-strong); display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:700; color:#B0BAC8; background:var(--bg-color); box-shadow:var(--neu-extrude-md); transition:all 0.35s; position:relative; overflow:hidden; }
.stage-node.done .stage-circle { border-color:#5CAD8A; color:#5CAD8A; box-shadow:0 0 12px rgba(92,173,138,0.3), var(--neu-extrude-md); }
.stage-node.active .stage-circle { border-color:var(--genshin-blue); box-shadow:0 0 14px rgba(74,141,183,0.4), var(--neu-extrude-md); }
.pulse-ring { position:absolute; inset:0; border-radius:50%; border:2px solid var(--genshin-blue); animation:pulse-border 1.8s ease-out infinite; }
@keyframes pulse-border { 0%{transform:scale(0.9);opacity:1} 100%{transform:scale(1.3);opacity:0} }
.stage-label { font-size:13px; font-weight:600; color:var(--genshin-blue-dark); }
.stage-sub { font-size:10px; color:#8A9AAC; white-space:nowrap; }
.stage-node.done .stage-sub { color:#5CAD8A; }
.stage-node.active .stage-sub { color:var(--genshin-blue); }
.stage-line { flex:1; min-width:40px; height:2px; background:var(--neu-stroke-muted-strong); transition:background 0.4s; margin-top:-30px; }
.stage-line.done { background:linear-gradient(90deg,#5CAD8A,#7DC4A5); }

.stage-detail { margin-top:16px; padding:14px 18px; background:rgba(163,177,198,0.08); border-radius:12px; display:flex; flex-direction:column; gap:8px; min-height:80px; }
.detail-row { display:flex; align-items:flex-start; gap:12px; font-size:13px; }
.dr-label { color:#8A9AAC; min-width:64px; flex-shrink:0; font-size:12px; }
.dr-val { color:var(--genshin-blue-dark); font-weight:500; flex:1; }
.detail-note { font-size:12px; color:#6B7A8C; padding:8px 12px; background:rgba(212,168,83,0.08); border-radius:8px; border-left:3px solid var(--genshin-gold); }
.detail-pending { display:flex; align-items:center; gap:10px; font-size:13px; color:#B0BAC8; padding:8px 0; }
.pending-icon { font-size:20px; }

.stage-actions { margin-top:12px; }
.advance-btn { padding:9px 22px; border-radius:10px; border:none; cursor:pointer; font-size:13px; font-family:'Noto Sans SC',sans-serif; background:linear-gradient(135deg,var(--genshin-blue),var(--genshin-blue-light)); color:#fff; box-shadow:var(--neu-glow-blue); transition:all 0.2s; }
.advance-btn:hover { transform:translateY(-1px); box-shadow:var(--neu-glow-blue-hover); }

/* 后续检查 */
.followup-card { padding:20px 24px; }
.fu-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.fu-title { font-family:'Noto Serif SC',serif; font-size:16px; font-weight:700; color:var(--genshin-blue-dark); border-left:3px solid var(--genshin-gold); padding-left:10px; }
.fu-add-btn { display:flex; align-items:center; gap:5px; padding:7px 16px; border-radius:10px; border:none; cursor:pointer; font-size:12px; font-family:'Noto Sans SC',sans-serif; background:linear-gradient(135deg,#5CAD8A,#7DC4A5); color:#fff; box-shadow:var(--neu-glow-success-soft); transition:all 0.2s; }
.fu-add-btn.disabled { background:var(--bg-groove); color:#B0BAC8; box-shadow:none; cursor:not-allowed; }
.fu-locked,.fu-empty { font-size:13px; color:#B0BAC8; padding:12px 0; text-align:center; }
.fu-list { display:flex; flex-direction:column; gap:8px; }
.fu-item { display:flex; align-items:flex-start; gap:14px; padding:12px 14px; }
.fu-num { font-size:11px; font-weight:700; color:var(--genshin-blue); background:rgba(74,141,183,0.1); padding:3px 8px; border-radius:8px; white-space:nowrap; flex-shrink:0; }
.fu-body { flex:1; display:flex; flex-direction:column; gap:4px; }
.fu-date { font-size:12px; color:#8A9AAC; }
.fu-inspector { font-size:12px; color:#5A6A7C; }
.fu-result { font-size:12px; line-height:1.5; }
.fu-result.ok { color:#5CAD8A; } .fu-result.warn { color:#E0A050; }

/* 弹窗 */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.3); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:1000; }
.modal-box { padding:24px 28px; border-radius:20px; min-width:380px; max-width:480px; display:flex; flex-direction:column; gap:14px; }
.modal-title { font-family:'Noto Serif SC',serif; font-size:18px; font-weight:700; color:var(--genshin-blue-dark); }
.modal-field { display:flex; flex-direction:column; gap:5px; }
.modal-field label { font-size:12px; color:#8A9AAC; }
.modal-input,.modal-textarea { padding:8px 12px; border-radius:10px; border:none; font-size:13px; font-family:'Noto Sans SC',sans-serif; color:var(--genshin-blue-dark); outline:none; resize:none; }
.modal-radio-row { flex-direction:row; align-items:center; gap:16px; }
.radio-item { display:flex; align-items:center; gap:5px; font-size:13px; color:#5A6A7C; cursor:pointer; }
.modal-btns { display:flex; gap:10px; justify-content:flex-end; margin-top:4px; }
.modal-cancel { padding:8px 20px; border-radius:10px; border:1px solid var(--neu-stroke-muted-strong); background:var(--bg-color); color:#8A9AAC; cursor:pointer; font-size:13px; font-family:'Noto Sans SC',sans-serif; box-shadow:var(--neu-extrude-sm); }
.modal-submit { padding:8px 20px; border-radius:10px; border:none; cursor:pointer; font-size:13px; font-family:'Noto Sans SC',sans-serif; background:linear-gradient(135deg,var(--genshin-blue),var(--genshin-blue-light)); color:#fff; box-shadow:var(--neu-glow-blue); }

.stage-detail-enter-active,.stage-detail-leave-active { transition:all 0.2s ease; }
.stage-detail-enter-from,.stage-detail-leave-to { opacity:0; transform:translateY(4px); }
.modal-fade-enter-active,.modal-fade-leave-active { transition:opacity 0.2s; }
.modal-fade-enter-from,.modal-fade-leave-to { opacity:0; }
</style>
