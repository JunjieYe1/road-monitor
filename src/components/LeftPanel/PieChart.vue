<template>
  <div class="chart-card neu-card">
    <div class="genshin-subtitle chart-title">病害类型分布</div>
    <div ref="chartEl" class="echarts-box"></div>
    <div class="legend-list">
      <div v-for="item in data" :key="item.name" class="legend-row">
        <span class="dot" :style="{ background: item.color }"></span>
        <span class="lname">{{ item.name }}</span>
        <span class="lvalue">{{ item.value }}处</span>
        <span class="lpct">{{ pct(item.value) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEcharts } from '../../composables/useEcharts'
import { echartsTooltipTheme, echartsTransparentBackground } from '../../composables/echartsDefaults'

interface Item { name: string; value: number; color: string }

const props = defineProps<{ data: Item[] }>()

const total = () => props.data.reduce((s, i) => s + i.value, 0)
const pct = (v: number) => total() ? ((v / total()) * 100).toFixed(0) : '0'

const { chartEl } = useEcharts((chart) => {
  chart.setOption({
    ...echartsTransparentBackground,
    tooltip: {
      ...echartsTooltipTheme(),
      trigger: 'item',
      formatter: '{b}: {c}处 ({d}%)',
    },
    series: [{
      type: 'pie',
      radius: ['52%', '78%'],
      center: ['50%', '50%'],
      data: props.data.map(i => ({ name: i.name, value: i.value, itemStyle: { color: i.color } })),
      label: { show: false },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' },
      },
    }],
  })
}, () => props.data)
</script>

<style scoped>
.chart-card {
  padding: 16px;
}

.chart-title {
  font-size: 14px;
  margin-bottom: 12px;
}

.echarts-box {
  width: 100%;
  height: 140px;
}

.legend-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 1px 1px 2px rgba(0,0,0,0.2);
}

.lname { flex: 1; color: #5A6A7C; }

.lvalue {
  color: var(--genshin-blue-dark);
  font-weight: 600;
  min-width: 30px;
  text-align: right;
}

.lpct {
  color: #8A9AAC;
  min-width: 34px;
  text-align: right;
}
</style>
