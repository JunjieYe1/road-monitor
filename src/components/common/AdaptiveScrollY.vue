<script setup lang="ts">
import { ref, computed, useAttrs } from 'vue'
import { useAdaptiveVerticalScroll } from '../../composables/useAdaptiveVerticalScroll'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const root = ref<HTMLElement | null>(null)
const { overflowY, overflowX, onEnter, onLeave } = useAdaptiveVerticalScroll(root)

const mergedStyle = computed(() => {
  const s = attrs.style
  const base =
    typeof s === 'object' && s !== null && !Array.isArray(s)
      ? { ...(s as Record<string, string>) }
      : {}
  return { ...base, overflowY: overflowY.value, overflowX: overflowX.value }
})
</script>

<template>
  <div
    ref="root"
    class="adaptive-scroll-y u-scrollbar-hidden"
    :class="attrs.class"
    :style="mergedStyle"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot />
  </div>
</template>
