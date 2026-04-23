<template>
  <div class="stat-card neu-card">
    <div class="top-line"></div>
    <div class="stat-label">{{ label }}</div>
    <div class="stat-value">{{ value }}</div>
    <div class="stat-unit">{{ unit }}</div>
    <div v-if="sub" class="stat-sub">
      <span v-for="item in sub" :key="item.label" class="sub-item" :style="{ color: item.color }">
        <span class="sub-dot" :style="{ background: item.color }"></span>
        {{ item.label }}: {{ item.value }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SubItem {
  label: string
  value: number | string
  color: string
}

defineProps<{
  label: string
  value: number | string
  unit?: string
  sub?: SubItem[]
}>()
</script>

<style scoped>
.stat-card {
  min-height: 220px;
  padding: 18px 20px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.top-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--genshin-gold-dark), var(--genshin-gold), var(--genshin-gold-light));
}

.stat-label {
  font-size: 13px;
  color: #6B7A8C;
  margin-bottom: 6px;
  font-weight: 500;
  letter-spacing: 1px;
}

.stat-value {
  font-family: 'Noto Serif SC', serif;
  font-size: 64px;
  font-weight: 700;
  background: linear-gradient(180deg, var(--genshin-gold), var(--genshin-gold-dark));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.stat-unit {
  font-size: 14px;
  color: #8A9AAC;
  margin-top: 4px;
}

.stat-sub {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(163, 177, 198, 0.25);
}

.sub-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}

.sub-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
