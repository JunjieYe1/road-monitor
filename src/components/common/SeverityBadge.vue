<template>
  <span class="sev-badge" :class="[level, size]">{{ SEV_LABELS[level] ?? level }}</span>
</template>

<script setup lang="ts">
import { SEV_LABELS } from '../../utils/labels'

withDefaults(defineProps<{
  level: string
  /** md（默认）用于弹窗/详情；sm 用于列表行内徽章 */
  size?: 'sm' | 'md'
}>(), {
  size: 'md',
})
</script>

<style scoped>
.sev-badge {
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: 0.5px;
  display: inline-block;
  line-height: 1;
}

.sev-badge.md { font-size: 11px; padding: 2px 8px; border-radius: 8px; }
.sev-badge.sm { font-size: 10px; padding: 2px 6px; border-radius: 6px; }

.sev-badge.high   { background: rgba(224, 112, 112, 0.15); color: #E07070; }
.sev-badge.medium { background: rgba(224, 160,  80, 0.15); color: #E0A050; }
.sev-badge.low    { background: rgba( 92, 173, 138, 0.15); color: #5CAD8A; }
</style>
