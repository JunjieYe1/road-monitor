<template>
  <div class="chart-card neu-card">
    <div class="genshin-subtitle chart-title">{{ title }}</div>
    <div ref="chartEl" class="echarts-box"></div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { useEcharts } from '../../composables/useEcharts'
import { echartsTooltipTheme, echartsTransparentBackground } from '../../composables/echartsDefaults'

interface Item { name: string; value: number }

const props = defineProps<{
  title: string
  data: Item[]
  color?: string
}>()

const { chartEl } = useEcharts((chart) => {
  if (!props.data.length) return
  const maxVal = Math.max(...props.data.map(i => i.value))
  chart.setOption({
    ...echartsTransparentBackground,
    grid: { top: 8, right: 50, bottom: 8, left: 10, containLabel: true },
    tooltip: {
      ...echartsTooltipTheme(),
      trigger: 'axis',
      axisPointer: { type: 'none' },
    },
    xAxis: { show: false, max: maxVal * 1.1 },
    yAxis: {
      type: 'category',
      data: props.data.map(i => i.name).reverse(),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#5A6A7C', fontSize: 11 },
    },
    series: [{
      type: 'bar',
      data: props.data.map(i => i.value).reverse(),
      barMaxWidth: 18,
      label: { show: true, position: 'right', color: '#1A3A52', fontSize: 11, fontWeight: 600 },
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: props.color || '#2D5A7B' },
          { offset: 1, color: '#4A8DB7' },
        ]),
        borderRadius: [0, 8, 8, 0],
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
  margin-bottom: 10px;
}

.echarts-box {
  width: 100%;
  height: 130px;
}
</style>
