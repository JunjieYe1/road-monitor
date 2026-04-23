<template>
  <div class="compliance-view">
    <!-- 工具栏 -->
    <ViewToolbar class="compliance-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">服务单位履约画像</span>
        <div class="year-tabs">
          <button v-for="y in years" :key="y" class="year-btn" :class="{ active: selYear === y }" @click="selYear = y">{{ y }}</button>
        </div>
      </div>
      <div class="toolbar-right">
        <span class="update-time">数据更新：2025-01-15</span>
      </div>
    </ViewToolbar>

    <div class="compliance-body">
      <!-- 排行榜 -->
      <div
        class="ranking-list neu-card u-scrollbar-hidden"
        ref="rankingListRef"
        :style="{ overflowY: rankingOverflowY, overflowX: rankingOverflowX }"
        @mouseenter="rankingScroll.onEnter"
        @mouseleave="rankingScroll.onLeave"
      >
        <div class="section-title">
          <span>综合履约排名</span>
          <div class="rank-legend">
            <span class="rank-dot red"></span><span>红榜（优秀）</span>
            <span class="rank-dot black"></span><span>黑榜（警告）</span>
          </div>
        </div>
        <div class="rank-items">
          <SelectableRankRow
            v-for="(unit, i) in sortedUnits"
            :key="unit.id"
            variant="compliance"
            :selected="selUnit?.id === unit.id"
            :title="unit.name"
            :bar-width-pct="unit.score"
            :bar-fill-style="{ width: unit.score + '%', background: scoreColor(unit.score) }"
            :metric="String(unit.score)"
            :metric-style="{ color: scoreColor(unit.score) }"
            @select="selUnit = unit"
          >
            <template #rank>
              <div class="rank-num" :class="rankNumClass(i)">{{ i + 1 }}</div>
            </template>
            <template #badge>
              <div class="rank-badge" :class="unit.score >= 80 ? 'red-badge' : unit.score < 65 ? 'black-badge' : 'normal-badge'">
                {{ unit.score >= 80 ? '🏆 红榜' : unit.score < 65 ? '⚠️ 黑榜' : '— 普通' }}
              </div>
            </template>
          </SelectableRankRow>
        </div>
      </div>

      <!-- 详情面板 -->
      <div
        class="detail-panel neu-card u-scrollbar-hidden"
        ref="detailPanelRef"
        :style="{ overflowY: detailOverflowY, overflowX: detailOverflowX }"
        @mouseenter="detailScroll.onEnter"
        @mouseleave="detailScroll.onLeave"
      >
        <template v-if="selUnit">
          <div class="detail-header">
            <div class="detail-name">{{ selUnit.name }}</div>
            <div class="detail-score" :style="{ color: scoreColor(selUnit.score) }">{{ selUnit.score }}<span class="detail-score-unit">分</span></div>
          </div>
          <div class="detail-divider"></div>
          <!-- 维度评分 -->
          <div class="dim-list">
            <div v-for="d in selUnit.dims" :key="d.name" class="dim-item">
              <div class="dim-header">
                <span class="dim-name">{{ d.name }}</span>
                <span class="dim-val">{{ d.score }}</span>
              </div>
              <div class="dim-track">
                <div class="dim-fill" :style="{ width: d.score + '%', background: scoreColor(d.score) }"></div>
              </div>
            </div>
          </div>
          <div class="detail-divider"></div>
          <!-- 雷达图 -->
          <div class="radar-wrap">
            <svg viewBox="0 0 180 180" class="radar-svg">
              <polygon :points="radarBg" fill="rgba(163,177,198,0.12)" stroke="rgba(163,177,198,0.3)" stroke-width="1"/>
              <polygon :points="radarBg2" fill="rgba(163,177,198,0.08)" stroke="rgba(163,177,198,0.2)" stroke-width="1"/>
              <polygon :points="radarData" fill="rgba(74,141,183,0.25)" stroke="var(--genshin-blue)" stroke-width="1.5"/>
              <circle v-for="(p, i) in radarPoints" :key="i" :cx="p.x" :cy="p.y" r="3" fill="var(--genshin-blue)"/>
              <text v-for="(l, i) in radarLabels" :key="'l'+i" :x="l.x" :y="l.y" text-anchor="middle" font-size="9" fill="#6B7A8C">{{ l.text }}</text>
            </svg>
          </div>
          <!-- 历史趋势 -->
          <div class="trend-section">
            <div class="trend-title">近三年得分趋势</div>
            <div class="trend-bars">
              <div v-for="t in selUnit.trend" :key="t.year" class="trend-bar-item">
                <div class="trend-bar-wrap">
                  <div class="trend-bar" :style="{ height: t.score * 0.5 + 'px', background: scoreColor(t.score) }"></div>
                </div>
                <span class="trend-year">{{ t.year }}</span>
                <span class="trend-score">{{ t.score }}</span>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="detail-empty">
          <div class="empty-hint">← 点击左侧单位查看详情</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useAdaptiveVerticalScroll } from '../../../composables/useAdaptiveVerticalScroll'
import ViewToolbar from '../../common/ViewToolbar.vue'
import SelectableRankRow from '../../common/SelectableRankRow.vue'

const years = ['2024', '2023', '2022']
const selYear = ref('2024')

// TODO: API - GET /api/compliance/ranking
const units = ref([
  { id: 1, name: '杭州市政养护有限公司', score: 92, dims: [
    { name: '检测质量', score: 94 }, { name: '整改及时', score: 91 },
    { name: '复测准确', score: 88 }, { name: '文档规范', score: 95 }, { name: '响应速度', score: 90 }],
    trend: [{ year: '2022', score: 85 }, { year: '2023', score: 89 }, { year: '2024', score: 92 }] },
  { id: 2, name: '西湖区道路工程公司', score: 84, dims: [
    { name: '检测质量', score: 82 }, { name: '整改及时', score: 88 },
    { name: '复测准确', score: 80 }, { name: '文档规范', score: 85 }, { name: '响应速度', score: 84 }],
    trend: [{ year: '2022', score: 79 }, { year: '2023', score: 81 }, { year: '2024', score: 84 }] },
  { id: 3, name: '滨江区城市管理服务', score: 78, dims: [
    { name: '检测质量', score: 76 }, { name: '整改及时', score: 80 },
    { name: '复测准确', score: 75 }, { name: '文档规范', score: 82 }, { name: '响应速度', score: 77 }],
    trend: [{ year: '2022', score: 74 }, { year: '2023', score: 76 }, { year: '2024', score: 78 }] },
  { id: 4, name: '拱墅区路面维护有限公司', score: 71, dims: [
    { name: '检测质量', score: 70 }, { name: '整改及时', score: 74 },
    { name: '复测准确', score: 68 }, { name: '文档规范', score: 73 }, { name: '响应速度', score: 70 }],
    trend: [{ year: '2022', score: 68 }, { year: '2023', score: 70 }, { year: '2024', score: 71 }] },
  { id: 5, name: '上城区建设工程总公司', score: 63, dims: [
    { name: '检测质量', score: 60 }, { name: '整改及时', score: 65 },
    { name: '复测准确', score: 62 }, { name: '文档规范', score: 66 }, { name: '响应速度', score: 63 }],
    trend: [{ year: '2022', score: 66 }, { year: '2023', score: 65 }, { year: '2024', score: 63 }] },
  { id: 6, name: '江干区路桥工程有限公司', score: 58, dims: [
    { name: '检测质量', score: 56 }, { name: '整改及时', score: 60 },
    { name: '复测准确', score: 55 }, { name: '文档规范', score: 62 }, { name: '响应速度', score: 57 }],
    trend: [{ year: '2022', score: 63 }, { year: '2023', score: 61 }, { year: '2024', score: 58 }] },
  { id: 7, name: '钱江新城道路服务公司', score: 54, dims: [
    { name: '检测质量', score: 52 }, { name: '整改及时', score: 56 },
    { name: '复测准确', score: 50 }, { name: '文档规范', score: 58 }, { name: '响应速度', score: 54 }],
    trend: [{ year: '2022', score: 60 }, { year: '2023', score: 57 }, { year: '2024', score: 54 }] },
])

const sortedUnits = computed(() => [...units.value].sort((a, b) => b.score - a.score))
const selUnit = ref<typeof units.value[0] | null>(units.value[0])

const rankingListRef = ref<HTMLElement | null>(null)
const detailPanelRef = ref<HTMLElement | null>(null)
const rankingScroll = useAdaptiveVerticalScroll(rankingListRef)
const detailScroll = useAdaptiveVerticalScroll(detailPanelRef)
const rankingOverflowY = rankingScroll.overflowY
const rankingOverflowX = rankingScroll.overflowX
const detailOverflowY = detailScroll.overflowY
const detailOverflowX = detailScroll.overflowX

watch(selUnit, async () => {
  await nextTick()
  await detailScroll.remeasure()
})
watch(sortedUnits, async () => {
  await nextTick()
  await rankingScroll.remeasure()
})

function rankNumClass(i: number) {
  return i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''
}
function scoreColor(s: number) {
  return s >= 80 ? '#5CAD8A' : s >= 65 ? '#E0C050' : '#E07070'
}

// 雷达图
const cx = 90, cy = 90, r = 60
const radarLabels = computed(() => {
  if (!selUnit.value) return []
  return selUnit.value.dims.map((d, i) => {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
    const lx = cx + (r + 18) * Math.cos(angle)
    const ly = cy + (r + 18) * Math.sin(angle)
    return { x: Math.round(lx), y: Math.round(ly), text: d.name.slice(0, 4) }
  })
})
function toPoints(vals: number[], scale = 1): string {
  return vals.map((v, i) => {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
    const rr = r * scale * (v / 100)
    return `${cx + rr * Math.cos(angle)},${cy + rr * Math.sin(angle)}`
  }).join(' ')
}
const radarBg = computed(() => toPoints([100, 100, 100, 100, 100]))
const radarBg2 = computed(() => toPoints([100, 100, 100, 100, 100], 0.6))
const radarData = computed(() => {
  if (!selUnit.value) return ''
  return toPoints(selUnit.value.dims.map(d => d.score))
})
const radarPoints = computed(() => {
  if (!selUnit.value) return []
  return selUnit.value.dims.map((d, i) => {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
    const rr = r * (d.score / 100)
    return { x: cx + rr * Math.cos(angle), y: cy + rr * Math.sin(angle) }
  })
})
</script>

<style scoped>
.compliance-view { display: flex; flex-direction: column; gap: 10px; height: 100%; }
.compliance-toolbar { gap: 12px; }
.toolbar-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.toolbar-title { font-family: 'Noto Serif SC', serif; font-size: 15px; font-weight: 700; color: var(--genshin-blue-dark); }
.year-tabs { display: flex; gap: 4px; background: var(--bg-groove); border-radius: 8px; padding: 3px; box-shadow: var(--neu-inset-sm); }
.year-btn { padding: 3px 10px; border-radius: 6px; border: none; cursor: pointer; font-size: 12px; font-family: 'Noto Sans SC', sans-serif; color: #8A9AAC; background: transparent; transition: all 0.2s; }
.year-btn.active { background: var(--bg-color); color: var(--genshin-blue); box-shadow: var(--neu-extrude-sm); }
.toolbar-right { margin-left: auto; font-size: 11px; color: #8A9AAC; }

.compliance-body { flex: 1; display: flex; gap: 10px; min-height: 0; }

.ranking-list { width: 55%; padding: 16px; }
.section-title { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 600; color: var(--genshin-blue-dark); margin-bottom: 12px; }
.rank-legend { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #8A9AAC; }
.rank-dot { width: 8px; height: 8px; border-radius: 2px; }
.rank-dot.red { background: #5CAD8A; }
.rank-dot.black { background: #E07070; }

.rank-items { display: flex; flex-direction: column; gap: 8px; }
.rank-num { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; background: var(--bg-groove); color: #8A9AAC; }
.rank-num.gold { background: linear-gradient(135deg, #D4A853, #F0D78C); color: #fff; }
.rank-num.silver { background: linear-gradient(135deg, #A8B8C8, #C8D8E8); color: #fff; }
.rank-num.bronze { background: linear-gradient(135deg, #C08858, #D8A878); color: #fff; }
.rank-badge { font-size: 11px; padding: 2px 8px; border-radius: 8px; white-space: nowrap; }
.red-badge { background: rgba(92,173,138,0.12); color: #5CAD8A; }
.black-badge { background: rgba(224,112,112,0.12); color: #E07070; }
.normal-badge { background: rgba(163,177,198,0.15); color: #8A9AAC; }

.detail-panel { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.detail-header { display: flex; align-items: flex-start; justify-content: space-between; }
.detail-name { font-family: 'Noto Serif SC', serif; font-size: 15px; font-weight: 700; color: var(--genshin-blue-dark); line-height: 1.4; }
.detail-score { font-size: 36px; font-weight: 800; line-height: 1; }
.detail-score-unit { font-size: 14px; font-weight: 400; margin-left: 2px; }
.detail-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(212,168,83,0.3), transparent); }

.dim-list { display: flex; flex-direction: column; gap: 8px; }
.dim-item {}
.dim-header { display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
.dim-name { color: #5A6A7C; }
.dim-val { font-weight: 600; color: var(--genshin-blue-dark); }
.dim-track { height: 6px; background: var(--bg-groove); border-radius: 3px; overflow: hidden; box-shadow: var(--neu-inset-track); }
.dim-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }

.radar-wrap { display: flex; justify-content: center; }
.radar-svg { width: 160px; height: 160px; }

.trend-section {}
.trend-title { font-size: 12px; font-weight: 600; color: var(--genshin-blue-dark); margin-bottom: 10px; }
.trend-bars { display: flex; gap: 16px; justify-content: center; align-items: flex-end; height: 70px; }
.trend-bar-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.trend-bar-wrap { flex: 1; display: flex; align-items: flex-end; height: 50px; }
.trend-bar { width: 28px; border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.5s ease; }
.trend-year { font-size: 10px; color: #8A9AAC; }
.trend-score { font-size: 11px; font-weight: 600; color: var(--genshin-blue-dark); }

.detail-empty { flex: 1; display: flex; align-items: center; justify-content: center; }
.empty-hint { font-size: 13px; color: #8A9AAC; }
</style>
