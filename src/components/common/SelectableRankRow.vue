<template>
  <div
    class="selectable-rank-row neu-card-sm"
    :class="{ selected, [`row-${variant}`]: true }"
    @click="$emit('select')"
  >
    <div class="srr-rank-wrap">
      <slot name="rank">
        <div class="srr-rank" :class="rankClass">{{ rankText }}</div>
      </slot>
    </div>
    <div class="srr-main">
      <div class="srr-title">{{ title }}</div>
      <div class="srr-bar-line">
        <div class="srr-track">
          <div
            class="srr-fill"
            :class="barFillClass"
            :style="barFillStyle"
          />
        </div>
        <span class="srr-metric" :class="metricClass" :style="metricStyle">{{ metric }}</span>
      </div>
    </div>
    <div v-if="$slots.badge" class="srr-trail">
      <slot name="badge" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 列表序号等，无 slot 时展示 */
    rankText?: string | number
    rankClass?: string
    title: string
    /** 0–100，条形宽度 */
    barWidthPct: number
    barFillClass?: string
    barFillStyle?: Record<string, string>
    metric: string
    metricClass?: string
    metricStyle?: Record<string, string>
    selected?: boolean
    /** 换肤：compliance | risk，仅影响选中描边色 */
    variant?: 'compliance' | 'risk'
  }>(),
  { selected: false, variant: 'compliance' },
)
defineEmits<{ select: [] }>()
</script>

<style scoped>
.selectable-rank-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.selectable-rank-row.row-compliance.selected {
  box-shadow: 4px 4px 10px var(--shadow-dark), -4px -4px 10px var(--shadow-light), 0 0 0 2px rgba(74, 141, 183, 0.3) !important;
}
.selectable-rank-row.row-risk.selected {
  box-shadow: 4px 4px 10px var(--shadow-dark), -4px -4px 10px var(--shadow-light), 0 0 0 2px rgba(224, 112, 112, 0.3) !important;
}
.srr-rank-wrap { flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.srr-rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}
.srr-main { flex: 1; min-width: 0; }
.srr-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--genshin-blue-dark);
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.selectable-rank-row.row-compliance .srr-title { font-size: 13px; }
.srr-bar-line { display: flex; align-items: center; gap: 8px; }
.srr-track {
  flex: 1;
  height: 6px;
  background: var(--bg-groove);
  border-radius: 3px;
  overflow: hidden;
  box-shadow: inset 1px 1px 3px var(--shadow-dark);
}
.selectable-rank-row.row-compliance .srr-track { height: 7px; border-radius: 4px; }
.srr-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
  box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.3) inset;
}
.srr-metric {
  font-size: 12px;
  font-weight: 700;
  min-width: 30px;
  text-align: right;
}
.selectable-rank-row.row-compliance .srr-metric { font-size: 13px; min-width: 28px; }
.srr-trail { flex-shrink: 0; }
</style>
