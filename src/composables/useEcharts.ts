import { ref, onMounted, onUnmounted, watch, type WatchSource } from 'vue'
import * as echarts from 'echarts'

/**
 * ECharts 公共初始化 composable。
 * 封装了：echarts.init（SVG 渲染）、ResizeObserver、watch 数据变化、组件卸载时 dispose。
 *
 * @param renderFn   接收 chart 实例，调用 setOption 的函数
 * @param watchSource  Vue watch 的数据源，数据变化时自动重绘
 */
export function useEcharts(
  renderFn: (chart: echarts.ECharts) => void,
  watchSource: WatchSource,
) {
  const chartEl = ref<HTMLElement | null>(null)
  let chart: echarts.ECharts | null = null

  function render() {
    if (!chart) return
    renderFn(chart)
  }

  const ro = new ResizeObserver(() => chart?.resize())

  onMounted(() => {
    if (!chartEl.value) return
    chart = echarts.init(chartEl.value, undefined, { renderer: 'svg' })
    render()
    ro.observe(chartEl.value)
  })

  onUnmounted(() => {
    ro.disconnect()
    chart?.dispose()
  })

  watch(watchSource, render, { deep: true })

  return { chartEl }
}
