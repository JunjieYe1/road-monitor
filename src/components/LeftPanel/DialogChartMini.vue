<script setup lang="ts">
import { computed } from 'vue'
import type { ChatChartPayload } from '../../utils/chatChartOptions'
import { buildChatChartEchartsOption } from '../../utils/chatChartOptions'
import { useEcharts } from '../../composables/useEcharts'
import { echartsTransparentBackground } from '../../composables/echartsDefaults'

const props = defineProps<{
  payload: ChatChartPayload
  globalIndex: number
}>()

const optionSrc = computed(() => props.payload)

const { chartEl } = useEcharts((chart) => {
  chart.setOption({
    ...echartsTransparentBackground,
    ...buildChatChartEchartsOption(optionSrc.value),
  })
}, () => props.payload)
</script>

<template>
  <div class="dialog-chart-mini neu-card-sm">
    <div class="dcm-badge">{{ globalIndex }}</div>
    <div ref="chartEl" class="dcm-chart" />
  </div>
</template>

<style scoped>
.dialog-chart-mini {
  position: relative;
  padding: 8px 10px 10px;
  overflow: hidden;
}

.dcm-badge {
  position: absolute;
  left: 8px;
  top: 6px;
  z-index: 1;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    145deg,
    rgba(74, 141, 183, 0.95),
    rgba(45, 90, 123, 0.92)
  );
  color: #fff;
  box-shadow: 0 2px 8px rgba(45, 90, 123, 0.35);
}

.dcm-chart {
  width: 100%;
  height: 148px;
  margin-top: 18px;
}
</style>
