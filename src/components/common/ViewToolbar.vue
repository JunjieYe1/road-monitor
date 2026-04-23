<template>
  <div class="view-toolbar neu-card">
    <slot />
  </div>
</template>

<style scoped>
.view-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding: 8px 14px;
  gap: 10px;
}
</style>
