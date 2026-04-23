<template>
  <div class="status-bars">
    <div v-for="bar in items" :key="bar.key" class="sbar-item">
      <div class="sbar-header">
        <span class="sbar-dot" :style="{ background: bar.color }"></span>
        <span class="sbar-label">{{ bar.label }}</span>
        <span class="sbar-count">{{ bar.count }}</span>
      </div>
      <div class="neu-inset sbar-track">
        <div
          class="sbar-fill"
          :class="fillByKey ? bar.key : undefined"
          :style="!fillByKey ? fillStyle(bar) : { width: barWidthPct(bar) + '%' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface StatusBarItem {
  key: string
  label: string
  color: string
  count: number
}

const props = withDefaults(
  defineProps<{
    items: StatusBarItem[]
    /** 用于计算条宽：count / total × 100% */
    total: number
    /**
     * true：用 `.sbar-fill.<key>` 的渐变（如 pending/processing/completed）；
     * false：用条目的 color 作纯色条（工单总览等）。
     */
    fillByKey?: boolean
  }>(),
  { fillByKey: true },
)

function barWidthPct(bar: StatusBarItem) {
  if (!props.total) return 0
  return Math.round((bar.count / props.total) * 100)
}

function fillStyle(bar: StatusBarItem) {
  return {
    width: `${barWidthPct(bar)}%`,
    background: bar.color,
  }
}
</script>

<style scoped>
.status-bars { display: flex; flex-direction: column; gap: 10px; }
.sbar-item { display: flex; flex-direction: column; gap: 5px; }
.sbar-header { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #5A6A7C; }
.sbar-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.sbar-label { flex: 1; }
.sbar-count { font-weight: 600; color: var(--genshin-blue-dark); }
.sbar-track { height: 9px; overflow: hidden; background: linear-gradient(var(--neu-angle), var(--bg-page), var(--neu-groove-to)); }
.sbar-fill { height: 100%; border-radius: 5px; transition: width 0.8s ease; box-shadow: 0 -1px 0 rgba(255,255,255,0.35) inset; }
.sbar-fill.pending { background: linear-gradient(90deg, #E07070, #EAA0A0); }
.sbar-fill.processing { background: linear-gradient(90deg, #D99040, #F0B870); }
.sbar-fill.completed { background: linear-gradient(90deg, #4A9D7A, #7DC4A5); }
</style>
